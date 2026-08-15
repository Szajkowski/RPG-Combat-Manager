window.isAudioMuted = localStorage.getItem('CombatManager-Muted') === 'true';
let currentMusic = null;
let currentMusicName = null; // Tracks the name of the active track
let mp3Files = [];

function playSoundEffect(src, volume = 0.5) {
    if (window.isAudioMuted) return null;
    
    const audio = new Audio(src);
    audio.volume = volume;
    audio.play().catch(e => console.warn("Audio playback failed:", e));
    return audio;
}

// Helper function to prevent multiple diceroll sounds in a single action
function playDiceSoundDeduplicated(event) {
    let shouldPlayDiceSound = true;
    
    // Deduplicate sound ONLY for auto-actions (e.g., group targets) to play once per group
    // Manual actions (like multi-target clicks) will play sound for every individual target clicked
    if (event.isAuto && event.groupId) {
        const diceSoundKey = `dice-${event.groupId}`;
        if (!window.playedStepSounds) window.playedStepSounds = new Set();
        
        if (window.playedStepSounds.has(diceSoundKey)) {
            shouldPlayDiceSound = false; // A character from this group already triggered the diceroll sound
        } else {
            window.playedStepSounds.add(diceSoundKey);
            setTimeout(() => window.playedStepSounds.delete(diceSoundKey), 5000);
        }
    }
    
    if (shouldPlayDiceSound) {
        playSoundEffect('sound/diceroll.mp3');
    }
}

// Helper to reliably deduplicate concurrent global sounds utilizing the action group ID
function playDeduplicatedSound(soundPath, dedupeKey, isAuto, volume = 0.5) {
    let shouldPlay = true;
    if (isAuto && dedupeKey) {
        if (!window.playedStepSounds) window.playedStepSounds = new Set();
        if (window.playedStepSounds.has(dedupeKey)) {
            shouldPlay = false;
        } else {
            window.playedStepSounds.add(dedupeKey);
            setTimeout(() => window.playedStepSounds.delete(dedupeKey), 5000);
        }
    }
    if (shouldPlay) {
        playSoundEffect(soundPath, volume);
    }
}

// Toggles global audio mute state
function toggleGlobalMute() {
    window.isAudioMuted = !window.isAudioMuted;
    localStorage.setItem('CombatManager-Muted', window.isAudioMuted);
    
    const muteIcon = document.getElementById('mute-icon');
    if (muteIcon) {
        const iconPath = window.isAudioMuted ? "url('images/icon-sound-off.svg')" : "url('images/icon-sound-on.svg')";
        muteIcon.style.webkitMaskImage = iconPath;
        muteIcon.style.maskImage = iconPath;
    }

    if (typeof currentMusic !== 'undefined' && currentMusic) {
        currentMusic.muted = window.isAudioMuted;
    }
}

// Fetch list of music files from the server and render them
async function loadMusicFiles() {
    try {
        const response = await fetch('/api/music-files'); 
        mp3Files = await response.json(); 
        mp3Files = mp3Files.sort();
        
        renderMusicList(); // Render immediately after loading
    } catch (error) {
        console.error('Error loading music files:', error);
    }
}

// Builds the permanent music list in the left panel
function renderMusicList() {
    const musicListContainer = document.querySelector('.music-list');
    if (!musicListContainer) return;
    
    musicListContainer.innerHTML = ''; // Clear dummy HTML
    
    // Render placeholder if the list is empty
    if (!mp3Files || mp3Files.length === 0) {
        musicListContainer.innerHTML = `<div class="empty-list-placeholder" data-i18n="placeholder_no_music">${t('placeholder_no_music')}</div>`;
        return;
    }
    
    mp3Files.forEach(file => {
        const trackName = file.replace('.mp3', '');
        
        const musicItem = document.createElement('div');
        musicItem.className = 'music-item';
        musicItem.dataset.track = trackName;
        
        // Injected SVG mask for Play icon instead of text characters
        musicItem.innerHTML = `
            <span>${trackName}</span> 
            <button onclick="playMusic('${file}', this)">
                <div class="icon-mask" style="-webkit-mask-image: url('images/icon-play.svg'); mask-image: url('images/icon-play.svg');"></div>
            </button>
        `;
        
        musicListContainer.appendChild(musicItem);
    });
}

// Handles clicking a track's play/pause button
function playMusic(filePath, buttonElement) {
    const trackName = filePath.replace('.mp3', '');

    if (currentMusicName === trackName) {
        toggleMusic();
        return;
    }

    if (currentMusic) {
        currentMusic.pause();
        currentMusic.currentTime = 0; 
        
        // Reset all buttons to standard play state
        document.querySelectorAll('.music-item').forEach(item => {
            item.classList.remove('playing', 'paused');
            const btn = item.querySelector('button');
            if(btn) btn.innerHTML = `<div class="icon-mask" style="-webkit-mask-image: url('images/icon-play.svg'); mask-image: url('images/icon-play.svg');"></div>`;
        });
    }

    // Load and play the new track
    currentMusicName = trackName;
    currentMusic = new Audio(`music/${filePath}`);
    currentMusic.volume = 0.4;
    
    if (window.isAudioMuted) {
        currentMusic.muted = true;
    }
    
    currentMusic.play();
    currentMusic.onended = () => currentMusic.play(); 

    // Apply active styles and set icon to Pause
    const activeItem = buttonElement.closest('.music-item');
    if (activeItem) {
        activeItem.classList.remove('paused');
        activeItem.classList.add('playing');
        buttonElement.innerHTML = `<div class="icon-mask" style="-webkit-mask-image: url('images/icon-pause.svg'); mask-image: url('images/icon-pause.svg');"></div>`;
    }
}

// Toggles playback state of the currently active track
function toggleMusic() {
    if (!currentMusic) return;

    const activeItem = document.querySelector(`.music-item[data-track="${currentMusicName}"]`);
    const buttonElement = activeItem ? activeItem.querySelector('button') : null;

    if (currentMusic.paused) {
        currentMusic.play();
        if (buttonElement) buttonElement.innerHTML = `<div class="icon-mask" style="-webkit-mask-image: url('images/icon-pause.svg'); mask-image: url('images/icon-pause.svg');"></div>`;
        if (activeItem) {
            activeItem.classList.remove('paused');
            activeItem.classList.add('playing');
        }
    } else {
        currentMusic.pause();
        if (buttonElement) buttonElement.innerHTML = `<div class="icon-mask" style="-webkit-mask-image: url('images/icon-play.svg'); mask-image: url('images/icon-play.svg');"></div>`;
        if (activeItem) {
            activeItem.classList.remove('playing');
            activeItem.classList.add('paused');
        }
    }
}