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

let gmDiceTimeout = null; // Tracks the active timeout to prevent result overlapping

// Rolls a local, GM-only custom dice that doesn't broadcast to players
function rollGmDice() {
    const input = document.getElementById('gm-dice-input');
    const resultSpan = document.getElementById('gm-dice-result');
    const shieldDiv = document.querySelector('.dice-result-shield');
    
    let max = parseInt(input.value);
    // Fallback to basic d20 if input is invalid or negative
    if (isNaN(max) || max < 2) {
        max = 20; 
        input.value = max;
    }
    
    const roll = Math.floor(Math.random() * max) + 1;
    
    playSoundEffect('sound/diceroll.mp3');

    // Clear previous timeout if the user is spamming the button
    if (gmDiceTimeout) {
        clearTimeout(gmDiceTimeout);
    }

    // Hide text
    resultSpan.style.color = 'transparent';

    // Force restart the CSS animation if it was already running
    shieldDiv.classList.remove('gm-dice-tumbling');
    void shieldDiv.offsetWidth; // Trigger DOM reflow
    shieldDiv.classList.add('gm-dice-tumbling');
    
    // Wait for the tumble animation to finish before revealing the latest result
    gmDiceTimeout = setTimeout(() => {
        shieldDiv.classList.remove('gm-dice-tumbling');
        resultSpan.textContent = roll;
        
        // Highlight crit success (max) and crit fail (1)
        resultSpan.style.color = roll === max ? '#50fa7b' : (roll === 1 ? '#ff5555' : '#f8f8f2');
        
        gmDiceTimeout = null;
    }, 600);
}

// Injects the UI necessary for the Targeting System dynamically
function injectTargetingUI() {
    if (!document.getElementById('targeting-overlay')) {
        const overlay = document.createElement('div');
        overlay.id = 'targeting-overlay';
        document.body.appendChild(overlay); 
    }

    if (!document.getElementById('targeting-svg')) {
        const svgHTML = `
            <svg id="targeting-svg">
                <path id="targeting-path" fill="none" stroke="#f1fa8c" stroke-width="4" stroke-dasharray="10, 10" />
            </svg>
            <div id="targeting-tooltip">
                <div class="chance-text"></div>
                <div class="cancel-hint" data-i18n="targeting_cancel_hint"></div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', svgHTML);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    // Setup UI Toggle buttons
    const gmToggleBtn = document.getElementById('mute-btn');
    if (gmToggleBtn) {
        gmToggleBtn.textContent = window.isAudioMuted ? "🔇" : "🔊";
    }

    const gmLangBtn = document.getElementById('lang-btn');
    if (gmLangBtn) gmLangBtn.textContent = window.currentLanguage === 'PL' ? '🇵🇱' : '🇬🇧';

    injectTargetingUI();

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

    // Automatically translate tooltips for icon buttons
    document.querySelectorAll('[data-i18n-title]').forEach(el => {
        const key = el.getAttribute('data-i18n-title');
        el.setAttribute('title', t(key));
    });

    // Enable horizontal scrolling with mouse wheel for the initiative tracker
    const tracker = document.querySelector('.initiative-tracker');
    if (tracker) {
        tracker.addEventListener('wheel', (evt) => {
            // Prevent vertical page scroll if interacting with the horizontal tracker
            if (evt.deltaY !== 0) {
                evt.preventDefault();
                tracker.scrollLeft += evt.deltaY;
            }
        }, { passive: false });
    }

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

    // --- INPUT VALIDATION AND CUT-PASTE MECHANICS FOR DMG/HEAL/ARMOR ---
    document.addEventListener('keydown', (e) => {
        if (e.target.matches('.damage-input, .heal-input, .armor-input')) {
            // Allow control keys and system shortcuts
            if (e.ctrlKey || e.metaKey || e.altKey) return;
            // Allow multi-character layout keys (Backspace, Delete, Arrows, etc.)
            if (e.key.length > 1) return;
            
            // HTML5 type="number" inputs return null/throw errors for selectionStart in most browsers!
            // Check if it's armor-input and if it doesn't already have a minus.
            if (e.key === '-') {
                // Prevent if it's not armor-input, OR if it already has valid numbers, OR if it has invalid state (e.g. existing minus)
                if (!e.target.matches('.armor-input') || e.target.value !== '' || e.target.validity.badInput) {
                    e.preventDefault();
                }
                return;
            }
            
            // Strictly block any character that is not a numeric digit
            if (!/^[0-9]$/.test(e.key)) {
                e.preventDefault();
            }
        }
    });

    document.addEventListener('click', (e) => {
        // Prevent accidental paste behavior if targeting mode is active
        if (document.body.classList.contains('targeting-mode')) return;

        const val = window.lastCopiedRPGValue;
        if (!val) return;

        // Paste value to dmg/heal/armor inputs (only numbers and a minus)
        if (e.target.matches('.damage-input, .heal-input, .armor-input')) {
            if (/^-?\d+$/.test(val.trim())) {
                if (typeof pasteValueToInput === 'function') {
                    pasteValueToInput(e.target, e);
                }
            }
        } 
        // Cut-Paste for condition targets (accepts anything except purely numerical strings)
        else if (e.target.matches('.condition-target')) {
            if (!/^-?\d+$/.test(val.trim())) {
                if (typeof pasteValueToInput === 'function') {
                    pasteValueToInput(e.target, e);
                }
            }
        }
    });

    // Keyboard shortcuts
    document.addEventListener('keydown', function(event) {
        // Suppress default shortcuts during active targeting mode
        if (document.body.classList.contains('targeting-mode')) return;
        
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