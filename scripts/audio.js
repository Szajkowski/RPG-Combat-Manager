window.isAudioMuted = localStorage.getItem('CombatManager-Muted') === 'true';
let currentMusic = null;
let currentMusicName = null; // Tracks the name of the active track
let mp3Files = [];

function playSoundEffect(src, volume = 0.5) {
    if (window.isAudioMuted) return null;
    
    const audio = new Audio(src);
    audio.volume = volume;
    
    let playPromise = audio.play();
    if (playPromise !== undefined) {
        playPromise.catch(error => {
            if (error.name === 'NotAllowedError') {
                showAudioPermissionModal();
            } else {
                console.warn("Audio playback failed:", error);
            }
        });
    }
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
        if (window.isAudioMuted) {
            muteIcon.classList.remove('mask-sound-on');
            muteIcon.classList.add('mask-sound-off');
        } else {
            muteIcon.classList.remove('mask-sound-off');
            muteIcon.classList.add('mask-sound-on');
        }
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
        
        // Use SVG mask classes for Play icon instead of text characters
        musicItem.innerHTML = `
            <span>${trackName}</span> 
            <button onclick="playMusic('${file}', this)">
                <div class="icon-mask mask-play"></div>
            </button>
        `;
        
        musicListContainer.appendChild(musicItem);
    });

    // Restore UI state if a track is already globally active 
    // (e.g., loaded during connection before the UI was ready)
    if (currentMusicName) {
        const state = (currentMusic && !currentMusic.paused) ? 'playing' : 'paused';
        updateMusicUI(currentMusicName, state);
    }
}

// Handles clicking a track's play/pause button
function playMusic(filePath, buttonElement) {
    const trackName = filePath.replace('.mp3', '');
    let action = 'play';

    // Check if the clicked track is currently active to toggle its state instead of replaying
    if (currentMusicName === trackName && currentMusic) {
        action = currentMusic.paused ? 'resume' : 'pause';
    }

    if (typeof socket !== 'undefined' && socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({ type: 'REQUESTplayMusic', action: action, filePath: filePath }));
    }
}

// Executed when a play payload is verified
function executePlayMusic(filePath, startPaused = false) {
    const trackName = filePath.replace('.mp3', '');

    // If the track is already loaded
    if (currentMusicName === trackName) {
        if (startPaused) {
            currentMusic.pause();
            updateMusicUI(trackName, 'paused');
        } else {
            let playPromise = currentMusic.play();
            if (playPromise !== undefined) {
                playPromise.catch(e => {
                    if (e.name === 'NotAllowedError') showAudioPermissionModal();
                });
            }
            updateMusicUI(trackName, 'playing');
        }
        return;
    }

    if (currentMusic) {
        currentMusic.pause();
        currentMusic.currentTime = 0; 
    }

    // Load and play the new track
    currentMusicName = trackName;
    currentMusic = new Audio(`music/${filePath}`);
    currentMusic.volume = 0.4;
    
    if (window.isAudioMuted) {
        currentMusic.muted = true;
    }

    currentMusic.onended = () => {
        let playPromise = currentMusic.play();
        if (playPromise !== undefined) {
            playPromise.catch(e => console.warn(e));
        }
    };

    if (startPaused) {
        updateMusicUI(trackName, 'paused');
    } else {
        let playPromise = currentMusic.play();
        if (playPromise !== undefined) {
            playPromise.catch(error => {
                if (error.name === 'NotAllowedError') {
                    showAudioPermissionModal();
                } else {
                    console.warn("Audio playback failed:", error);
                }
            });
        }
        updateMusicUI(trackName, 'playing');
    }
}

// Toggles playback state of the currently active track
function toggleMusic() {
    if (!currentMusic) return;

    const action = currentMusic.paused ? 'resume' : 'pause';
    if (typeof socket !== 'undefined' && socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({ type: 'REQUESTplayMusic', action: action }));
    } else {
        executeToggleMusic(action);
    }
}

// Executed when a toggle payload is verified
function executeToggleMusic(action) {
    if (!currentMusic) return;

    if (action === 'resume') {
        let playPromise = currentMusic.play();
        if (playPromise !== undefined) {
            playPromise.catch(error => {
                if (error.name === 'NotAllowedError') {
                    showAudioPermissionModal();
                } else {
                    console.warn("Audio playback failed:", error);
                }
            });
        }
        updateMusicUI(currentMusicName, 'playing');
    } else if (action === 'pause') {
        currentMusic.pause();
        updateMusicUI(currentMusicName, 'paused');
    }
}

function updateMusicUI(trackName, state) {
    // Reset all buttons to standard play state
    document.querySelectorAll('.music-item').forEach(item => {
        item.classList.remove('playing', 'paused');
        const btn = item.querySelector('button .icon-mask');
        if(btn) {
            btn.classList.remove('mask-pause');
            btn.classList.add('mask-play');
        }
    });

    const activeItem = document.querySelector(`.music-item[data-track="${trackName}"]`);
    if (activeItem) {
        activeItem.classList.add(state);
        const btnMask = activeItem.querySelector('button .icon-mask');
        if (btnMask) {
            btnMask.classList.remove('mask-play', 'mask-pause');
            btnMask.classList.add(state === 'playing' ? 'mask-pause' : 'mask-play');
        }
    }
}

let audioPermissionModalShown = false;

function showAudioPermissionModal() {
    if (audioPermissionModalShown) return;
    audioPermissionModalShown = true;
    
    let overlay = document.getElementById('global-modal-overlay');
    if (!overlay) {
        overlay = document.createElement('div');
        overlay.id = 'global-modal-overlay';
        overlay.className = 'custom-modal-overlay';
        getAppContainer().appendChild(overlay);
    }
    
    const box = document.createElement('div');
    box.className = 'custom-modal-box';
    
    const text = document.createElement('div');
    text.className = 'custom-modal-text';
    text.innerHTML = t('audio_permission_request');
    
    const btnContainer = document.createElement('div');
    btnContainer.className = 'custom-modal-actions';
    
    const btn = document.createElement('button');
    btn.className = 'custom-modal-btn confirm';
    btn.textContent = t('btn_ok');
    
    btn.onclick = () => {
        box.remove();
        if (overlay.childNodes.length === 0) overlay.remove();
        else updateModalStack();
        
        audioPermissionModalShown = false;
        
        // Retry playing music if it was supposed to be playing
        if (currentMusic && currentMusic.paused) {
            executeToggleMusic('resume');
        }
    };
    
    btnContainer.appendChild(btn);
    box.appendChild(text);
    box.appendChild(btnContainer);
    overlay.appendChild(box);

    updateModalStack();
}