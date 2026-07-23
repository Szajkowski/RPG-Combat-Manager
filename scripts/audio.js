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

// Toggles global audio mute state
function toggleGlobalMute() {
    window.isAudioMuted = !window.isAudioMuted;
    localStorage.setItem('CombatManager-Muted', window.isAudioMuted);
    
    const muteBtn = document.getElementById('mute-btn');
    muteBtn.textContent = window.isAudioMuted ? '🔇' : '🔊';

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
        musicListContainer.innerHTML = `<div style="padding: 10px; color: #6272a4; text-align: center; font-size: 0.8rem;" data-i18n="placeholder_no_music">${t('placeholder_no_music')}</div>`;
        return;
    }
    
    mp3Files.forEach(file => {
        const trackName = file.replace('.mp3', '');
        
        const musicItem = document.createElement('div');
        musicItem.className = 'music-item';
        musicItem.dataset.track = trackName;
        
        musicItem.innerHTML = `
            <span>${trackName}</span> 
            <button onclick="playMusic('${file}', this)">▶</button>
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
            if(btn) btn.textContent = '▶';
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

    // Apply active styles
    const activeItem = buttonElement.closest('.music-item');
    if (activeItem) {
        activeItem.classList.remove('paused');
        activeItem.classList.add('playing');
        buttonElement.textContent = '⏸';
    }
}

// Toggles playback state of the currently active track
function toggleMusic() {
    if (!currentMusic) return;

    const activeItem = document.querySelector(`.music-item[data-track="${currentMusicName}"]`);
    const buttonElement = activeItem ? activeItem.querySelector('button') : null;

    if (currentMusic.paused) {
        currentMusic.play();
        if (buttonElement) buttonElement.textContent = '⏸';
        if (activeItem) {
            activeItem.classList.remove('paused');
            activeItem.classList.add('playing');
        }
    } else {
        currentMusic.pause();
        if (buttonElement) buttonElement.textContent = '▶';
        if (activeItem) {
            activeItem.classList.remove('playing');
            activeItem.classList.add('paused');
        }
    }
}