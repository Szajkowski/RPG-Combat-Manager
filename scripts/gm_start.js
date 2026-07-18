let currentMusic = null;
let currentMusicName = null; // Tracks the name of the active track
let mp3Files = [];

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

loadMusicFiles();

// Helper function to parse INI format for config.ini
function parseINI(data) {
    const result = {};
    let currentSection = null;
    
    data.split(/\r?\n/).forEach(line => {
        line = line.trim();
        // Skip empty lines and comments
        if (!line || line.startsWith(';') || line.startsWith('#')) return; 
        
        // Handle sections like [InitialHeroes]
        if (line.startsWith('[') && line.endsWith(']')) {
            currentSection = line.substring(1, line.length - 1);
            result[currentSection] = {};
        } 
        // Handle key=value pairs
        else if (line.includes('=')) {
            const parts = line.split('=');
            const key = parts.shift().trim();
            const value = parts.join('=').trim(); 
            
            if (currentSection) {
                result[currentSection][key] = value;
            } else {
                result[key] = value;
            }
        }
    });
    return result;
}

// Global function triggered by network.js when the server state is confirmed to be 100% empty
function loadInitialConfigCharacters() {
    fetch('/config.ini')
    .then(response => response.text())
    .then(text => {
        const config = parseINI(text);
        
        // Load heroes safely from configuration file
        if (config.InitialHeroes) {
            for (const [name, type] of Object.entries(config.InitialHeroes)) {
                addSpecificCharacter(type, name, 'hero');
            }
        }
        
        // Load enemies safely from configuration file
        if (config.InitialEnemies) {
            for (const [name, type] of Object.entries(config.InitialEnemies)) {
                addSpecificCharacter(type, name, 'enemy');
            }
        }
    })
    .catch(error => console.error("Error loading config.ini:", error));
}

document.addEventListener('DOMContentLoaded', () => {
    // Setup UI Toggle buttons
    const gmToggleBtn = document.getElementById('gm-mute-btn');
    if (gmToggleBtn) {
        gmToggleBtn.textContent = window.isAudioMuted ? "🔇" : "🔊";
    }

    const gmLangBtn = document.getElementById('gm-lang-btn');
    if (gmLangBtn) gmLangBtn.textContent = window.currentLanguage === 'PL' ? '🇵🇱' : '🇬🇧';

    // Automated Translation System based on data-i18n attributes
    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        
        if (el.tagName === 'INPUT' && el.hasAttribute('placeholder')) {
            el.setAttribute('placeholder', t(key));
        } else if (el.tagName === 'OPTION') {
            el.textContent = t(key);
        } else {
            el.textContent = t(key);
        }
    });

    // Helper function to setup dropdowns AND their change event listeners
    const setupDropdown = (selectId, dataObject, type, team) => {
        const selectElement = document.getElementById(selectId);
        if (!selectElement) return;

        // Populate options
        for (const key in dataObject) {
            if (dataObject[key].hidden) continue; 
            const option = document.createElement('option');
            option.value = key;
            option.textContent = key;
            selectElement.appendChild(option);
        }

        // Handle instant addition upon selection
        selectElement.addEventListener('change', (event) => {
            const selectedName = event.target.value;
            if (selectedName && dataObject[selectedName]) {
                addSpecificCharacter(type, selectedName, team);
                selectElement.selectedIndex = 0; // Reset after adding
            }
        });
    };

    // Setup all 8 dropdowns on the arena
    setupDropdown('hero-mob-select', mobs, 'mob', 'hero');
    setupDropdown('enemy-mob-select', mobs, 'mob', 'enemy');

    setupDropdown('hero-boss-select', bosses, 'boss', 'hero');
    setupDropdown('enemy-boss-select', bosses, 'boss', 'enemy');

    setupDropdown('hero-npc-select', npcs, 'npc', 'hero');
    setupDropdown('enemy-npc-select', npcs, 'npc', 'enemy');

    setupDropdown('hero-player-select', players, 'player', 'hero');
    setupDropdown('enemy-player-select', players, 'player', 'enemy');

    // Failsafe for disconnects
    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible' && socket.readyState !== WebSocket.OPEN) {
            console.log("Returned to the page, reconnecting...");
            socket = connectSocket();

            // We will update this sync logic later once activeCombatants is fully implemented
            waitForSocket(() => {
                const playerNames = Array.from(document.querySelectorAll('.character-token[data-type="player"]'))
                .map(token => token.dataset.name);
                if (playerNames.length > 0) updateSpecificPlayersStats(playerNames);
            });
        }
    });

    // Keyboard shortcuts
    document.addEventListener('keydown', function(event) {
        const isInputFocused = document.activeElement.tagName.toLowerCase() === 'input' || document.activeElement.tagName.toLowerCase() === 'textarea';
    
        if (!isInputFocused) {
            switch (event.key.toUpperCase()) {
                case 'N': newRound(); break;
                case 'Z': endCombat(); break;
                case 'S': toggleMusic(); break;
                case 'T': nextTurn(); break;
                default: break;
            }
        }
    });
});