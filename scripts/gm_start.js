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

    // Hide text via CSS class mapping
    resultSpan.className = 'gm-dice-hidden';

    // Force restart the CSS animation if it was already running
    shieldDiv.classList.remove('gm-dice-tumbling');
    void shieldDiv.offsetWidth; // Trigger DOM reflow
    shieldDiv.classList.add('gm-dice-tumbling');
    
    // Wait for the tumble animation to finish before revealing the latest result
    gmDiceTimeout = setTimeout(() => {
        shieldDiv.classList.remove('gm-dice-tumbling');
        resultSpan.textContent = roll;
        
        // Highlight crit success (max) and crit fail (1) mapping the string directly
        resultSpan.className = roll === max ? 'gm-dice-crit' : (roll === 1 ? 'gm-dice-fail' : 'gm-dice-neutral');
        
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
                <path id="targeting-path" fill="none" stroke="var(--theme-target)" stroke-width="4" stroke-dasharray="10, 10" />
            </svg>
            <div id="targeting-tooltip">
                <div class="chance-text"></div>
                <div class="cancel-hint" data-i18n="targeting_cancel_hint"></div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', svgHTML);
    }
    
    // Inject the new DOM-based Crosshair
    if (!document.getElementById('targeting-crosshair')) {
        const crosshair = document.createElement('div');
        crosshair.id = 'targeting-crosshair';
        document.body.appendChild(crosshair);
    }
}

// Dynamically populate subtype selection depending on main action type using the new pill structure
function updateGmActionSubtypes() {
    const typePill = document.querySelector('#gm-action-type .pill.active');
    const subtypeContainer = document.getElementById('gm-action-subtype');
    
    if (!typePill || !subtypeContainer) return;

    subtypeContainer.innerHTML = '';
    const type = typePill.dataset.value;

    if (type === 'damage') {
        subtypeContainer.innerHTML = `
            <button class="pill active dmg-theme" data-value="phys">${t('dmg_type_phys')}</button>
            <button class="pill dmg-theme" data-value="mag">${t('dmg_type_mag')}</button>
            <button class="pill dmg-theme" data-value="pierce">${t('dmg_type_pierce')}</button>
        `;
    } else if (type === 'heal') {
        subtypeContainer.innerHTML = `
            <button class="pill active heal-theme" data-value="normal">${t('heal_type_normal')}</button>
            <button class="pill heal-theme" data-value="threshold">${t('heal_type_threshold')}</button>
        `;
    } else if (type === 'armor') {
        subtypeContainer.innerHTML = `
            <button class="pill active armor-theme" data-value="phys">${t('armor_type_phys')}</button>
            <button class="pill armor-theme" data-value="mag">${t('armor_type_mag')}</button>
        `;
    }
}

// Executes a GM Action bridging it securely to the native Action Pipeline without limits
async function executeGmAction(event) {
    const valInput = document.getElementById('gm-action-value');
    if (!valInput || !valInput.value) return;
    
    const parsedVal = parseFloat(valInput.value);
    if (isNaN(parsedVal) || parsedVal === 0) return;

    // Retrieve active properties directly from currently selected pills
    const type = document.querySelector('#gm-action-type .pill.active')?.dataset.value;
    const subtype = document.querySelector('#gm-action-subtype .pill.active')?.dataset.value;
    const mode = document.querySelector('#gm-action-mode .pill.active')?.dataset.value;
    const targetMode = document.querySelector('#gm-action-target .pill.active')?.dataset.value;

    if (!type || !subtype || !mode || !targetMode) return;

    // GM Action constraint: Prevent healing or damaging with explicitly negative values
    if (type === 'damage' || type === 'heal') {
        if (parsedVal < 0) {
            showAlertDialog(t('error_gm_negative_val'));
            return;
        }
    }

    const isPercentage = mode === 'perc';
    let finalValue = isPercentage ? `${valInput.value}%` : parsedVal;

    // Craft raw payload mapping straight to pipeline syntax expectations
    let payload = {
        type: type,
        target: targetMode === 'targeted' ? 'multi' : targetMode,
        possibleTargets: 9999, // JSON.stringify kills Infinity, using 9999 prevents reverting to 1
        isGmAction: true
    };

    if (type === 'damage') {
        payload.damageType = subtype;
        if (isPercentage) payload.valuePerc = finalValue;
        else payload.value = finalValue;
    } else if (type === 'heal') {
        payload.healType = subtype;
        if (isPercentage) payload.valuePerc = finalValue;
        else payload.value = finalValue;
    } else if (type === 'armor') {
        // Funnel to distinct properties strictly matching armor specifications
        if (subtype === 'phys') {
            if (isPercentage) payload.physArmorValuePerc = finalValue;
            else payload.physArmorValue = finalValue;
        } else if (subtype === 'mag') {
            if (isPercentage) payload.magArmorValuePerc = finalValue;
            else payload.magArmorValue = finalValue;
        }
    }

    // Attempt to acquire server lock before proceeding with GM targeted actions
    const lockGranted = await syncInitiateAction(null, null, false);
    if (!lockGranted) {
        showToast(t('server_busy'));
        return;
    }

    // Dummy identity wrapper for pipeline logs representing the Game Master purely
    const gmAttacker = {
        id: 'GM-Entity',
        uniqueName: t('game_master'),
        team: 'gm',
        stats: {}
    };

    if (typeof startActionPipeline === 'function') {
        // Lock the widget open so it doesn't disappear when moving the mouse to target
        const widget = document.querySelector('.gm-action-widget');
        if (widget) widget.classList.add('locked-open');
        
        startActionPipeline(gmAttacker, [payload], { name: 'GM Action' }, null, event, false);
    } else {
        syncReleaseActionLock(); // Failsafe
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
    updateGmActionSubtypes(); // Initialize subtypes payload mapping explicitly

    // GM Menu toggler logic
    document.addEventListener('click', (e) => {
        const gmWidget = document.querySelector('.gm-action-widget');
        const trigger = e.target.closest('.gm-action-trigger');
        
        if (trigger) {
            gmWidget.classList.toggle('open');
        } else if (gmWidget && !e.target.closest('.gm-action-widget')) {
            gmWidget.classList.remove('open');
        }
    });

    // Interactive Pill Selection Logic
    document.addEventListener('click', (e) => {
        if (e.target.matches('.pill')) {
            const group = e.target.closest('.pill-group');
            if (group) {
                // Remove active class from all pills in the group
                group.querySelectorAll('.pill').forEach(p => p.classList.remove('active'));
                // Activate the clicked pill
                e.target.classList.add('active');

                // Trigger subtype UI update if the main action type was the one that changed
                if (group.id === 'gm-action-type') {
                    updateGmActionSubtypes();
                }
            }
        }
    });

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

    // Automatically translate tooltips for icon buttons and standard UI elements
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

    // --- INPUT VALIDATION AND CUT-PASTE MECHANICS FOR GM WIDGET ---
    document.addEventListener('keydown', (e) => {
        if (e.target.matches('#gm-action-value')) {
            // Allow control keys and system shortcuts
            if (e.ctrlKey || e.metaKey || e.altKey) return;
            // Allow multi-character layout keys (Backspace, Delete, Arrows, etc.)
            if (e.key.length > 1) return;
            
            // Allow minus
            if (e.key === '-') {
                if (e.target.value !== '' || e.target.validity.badInput) {
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

        if (e.target.matches('#gm-action-value')) {
            if (val && /^-?\d+$/.test(val.trim())) {
                if (typeof pasteValueToInput === 'function') {
                    pasteValueToInput(e.target);
                }
            } else {
                // Empty the input only if no numeric value to paste
                if (e.target.value !== '') {
                    e.target.value = '';
                    e.target.dispatchEvent(new Event('change', { bubbles: true }));
                }
            }
        } else if (e.target.matches('.effect-target')) {
            if (val && !/^-?\d+$/.test(val.trim())) {
                if (typeof pasteValueToInput === 'function') {
                    pasteValueToInput(e.target);
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