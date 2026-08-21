// Get the name from the path itself (removing the initial slash) instead of URLSearchParams
let rawPath = window.location.pathname.substring(1); 
let clientName = "";

if (rawPath && !rawPath.includes("index.html") && !rawPath.includes("player.html")) {
    clientName = decodeURIComponent(rawPath).replace(/"/g, "");
} else {
    clientName = "GM";
}

// --- GLOBAL STATE MOVED TO NETWORK FOR ALL CLIENTS ---
let activeCharacters = []; // Holds all active characters data and their current stats
let activeEffects = []; // Holds all active effects
let rollsHistory = []; // Tracks historical roll events
let selectedCharacterId = null; // Tracks currently selected character token on the arena
let myClientId = null; // Stored personal client ID assigned by the server

// Variable to track pending promises
const pendingPromises = {};
let isDisconnected = false; // Tracks connection state for the UI
let currentServerInstanceId = null; // Tracks current server run ID

// Heartbeat and connection management variables
let heartbeatInterval = null;
let heartbeatTimeout = null;
let reconnectTimeout = null;

function connectSocket() {
    const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const newSocket = new WebSocket(`${wsProtocol}//${window.location.host}`);

    // Force connection timeout to prevent 30s OS-level hangs on dead servers
    const connectionTimeout = setTimeout(() => {
        if (newSocket.readyState === WebSocket.CONNECTING) {
            console.warn("Connection attempt timed out. Forcing close.");
            try { newSocket.close(); } catch(e) {}
        }
    }, 1500);

    // Centralized disconnect handler that executes immediately, regardless of OS TCP timeouts
    function handleDisconnect() {
        // CRITICAL FIX: Ignore disconnect events from old, zombie sockets
        // If the global 'socket' variable points to a newer socket, do not ruin its state.
        if (typeof socket !== 'undefined' && socket !== newSocket) {
            return;
        }

        clearInterval(heartbeatInterval);
        clearTimeout(heartbeatTimeout);

        if (!isDisconnected) {
            isDisconnected = true;
            showDisconnectModal();
        }

        // Prevent multiple concurrent reconnect loops
        if (!reconnectTimeout) {
            reconnectTimeout = setTimeout(() => {
                reconnectTimeout = null;
                // Only try to reconnect if we aren't already connected or connecting
                if (typeof socket !== 'undefined' && socket.readyState !== WebSocket.OPEN && socket.readyState !== WebSocket.CONNECTING) {
                    socket = connectSocket();
                }
            }, 3000);
        }
    }

    newSocket.onopen = () => {
        clearTimeout(connectionTimeout);

        // Handle UI recovery on reconnect
        if (isDisconnected) {
            isDisconnected = false;
            hideDisconnectModal();
            showNotification(t('connection_restored'), { duration: 3000, position: 'top', theme: 'var(--theme-positive)' });
            
            // Silently fetch fresh data files so dropdowns and new spawns use the latest stats
            reloadAllScripts();
        }

        // Initialize Heartbeat Engine
        clearInterval(heartbeatInterval);
        heartbeatInterval = setInterval(() => {
            if (newSocket.readyState === WebSocket.OPEN) {
                newSocket.send(JSON.stringify({ type: 'PING' }));
                
                // If the server doesn't respond with PONG within 3 seconds, connection is dead
                heartbeatTimeout = setTimeout(() => {
                    console.warn("Heartbeat timeout. Forcing UI disconnect.");
                    handleDisconnect();
                    
                    // Attempt to free resources, but don't wait for the close event
                    if (newSocket.readyState !== WebSocket.CLOSED) {
                        newSocket.close(); 
                    }
                }, 3000);
            }
        }, 5000); // Check every 5 seconds

        newSocket.send(JSON.stringify({
            type: "registerConnection",
            clientName: clientName
        }));
    };

    newSocket.onerror = (error) => {
        console.warn('WebSocket connection encountered an error.');
    };

    newSocket.onclose = () => {
        // Handles the case where the socket closes gracefully or abruptly before the heartbeat catches it
        handleDisconnect();
    };

    newSocket.onmessage = async (event) => {
        // Ignore ghost messages from old sockets just to be absolutely safe
        if (typeof socket !== 'undefined' && socket !== newSocket) return;

        const data = JSON.parse(event.data);
        
        switch (data.type) {
            case 'PONG': {
                // Clear the death-timeout because the server responded
                clearTimeout(heartbeatTimeout);
                break;
            }

            // Receive the unique client ID and the full server state upon initial connection
            case 'RESPONSEregisterConnection': {
                if (currentServerInstanceId && currentServerInstanceId !== data.serverInstanceId) {
                    showServerRestartModal();
                    return; 
                }
                
                currentServerInstanceId = data.serverInstanceId;
                myClientId = data.clientId;
                
                activeCharacters = data.activeCharacters || [];
                // Force derived state pipeline to evaluate purely local structures immediately after loading 
                activeCharacters.forEach(c => recalculateCurrentStats(c));
                
                activeEffects = data.activeEffects || []; 
                rollsHistory = data.rollsHistory || []; 
                
                // Empty the arena HTML elements before rendering tokens
                const heroTeam = document.getElementById('heroTeam');
                const enemyTeam = document.getElementById('enemyTeam');
                if (heroTeam) heroTeam.innerHTML = '';
                if (enemyTeam) enemyTeam.innerHTML = '';

                activeCharacters.forEach(c => renderToken(c));

                // Render dynamic HUDs
                renderInitiativeTracker();
                renderEffects();
                renderRollsFeed(rollsHistory);

                // Initialize empty states properly
                checkArenaEmptyStates();
                if (!selectedCharacterId) checkCharMainPanelEmptyState();

                // Load initial characters from config.ini ONLY if the server responded with an empty list
                if (activeCharacters.length === 0 && clientName === "GM") {
                    loadInitialConfigCharacters();
                }
                break;
            }

            // Lock responses
            case 'RESPONSEactionGranted': {
                const resolve = pendingPromises[data.requestId];
                if (resolve) {
                    resolve(true);
                    delete pendingPromises[data.requestId];
                }
                break;
            }
            case 'RESPONSEactionDenied': {
                const resolve = pendingPromises[data.requestId];
                if (resolve) {
                    resolve(false);
                    delete pendingPromises[data.requestId];
                }
                break;
            }

            case 'BROADCASTaddCombatant': {
                if (!activeCharacters.find(c => c.id === data.combatant.id)) {
                    // Make sure stats are accurately resolved before inserting into local game instance
                    recalculateCurrentStats(data.combatant);
                    activeCharacters.push(data.combatant);
                }
                renderToken(data.combatant);
                renderInitiativeTracker();
                break;
            }

            case 'BROADCASTupdateCombatant': {
                const index = activeCharacters.findIndex(c => c.id === data.combatant.id);
                if (index !== -1) {
                    // Play associated system sound if the payload contains it
                    if (data.systemSound) {
                        playSoundEffect(`sound/${data.systemSound}.mp3`, 0.5);   
                    }

                    activeCharacters[index] = data.combatant;
                    
                    // Implement strict derived-state recalculations on any modification
                    recalculateCurrentStats(activeCharacters[index]); 
                    
                    refreshCombatantDisplay(activeCharacters[index]);
                    renderInitiativeTracker();
                }
                break;
            }

            case 'BROADCASTupdateCombatantsBatch': {
                // Update local instances in a batch
                if (Array.isArray(data.combatants)) {
                    data.combatants.forEach(updatedC => {
                        const index = activeCharacters.findIndex(c => c.id === updatedC.id);
                        if (index !== -1) {
                            activeCharacters[index] = updatedC;
                            // Explicit recalculation hook securing derived architecture
                            recalculateCurrentStats(activeCharacters[index]); 
                        }
                    });
                    
                    // Call the bulk UI refresh function
                    refreshDisplay(data.combatants);
                    renderInitiativeTracker();
                }
                break;
            }

            case 'BROADCASTremoveCombatant': {
                const indexToRemove = activeCharacters.findIndex(c => c.id === data.id);
                if (indexToRemove !== -1) {
                    activeCharacters.splice(indexToRemove, 1);
                }
                
                const token = document.querySelector(`.character-token[data-id="${data.id}"]`);
                if (token) token.remove();
                
                // Reset selection if the deleted character was the one currently viewed
                if (selectedCharacterId === data.id) {
                    selectedCharacterId = null;
                }

                // Trigger reactive checks for empty states across the layout
                checkCharMainPanelEmptyState();
                renderInitiativeTracker();
                checkArenaEmptyStates();
                break;
            }

            case "BROADCASTaddEffect": 
            case "BROADCASTupdateEffects": {
                activeEffects = data.activeEffects;
                // Recalculate stats dynamically for everyone
                activeCharacters.forEach(c => recalculateCurrentStats(c));
                refreshDisplay(activeCharacters);
                
                renderEffects();
                renderInitiativeTracker();
                break;
            }

            case 'BROADCASTaddRollEvent': {
                rollsHistory.push(data.rollEvent);
                if (rollsHistory.length > 50) rollsHistory.shift();
                appendRollEvent(data.rollEvent, true);
                break;
            }

            case 'BROADCASTplayActionSequence': {
                playActionSequence(data.payload);
                break;
            }
                
            default:
                console.log('Unknown message type:', data);
        }
    };

    return newSocket;
}

let socket = connectSocket();

function waitForSocket(callback) {
    if (socket.readyState === WebSocket.OPEN) {
        callback();
    } else {
        socket.addEventListener('open', callback, { once: true });
    }
}

// --- UNIFIED SERVER SYNC FUNCTIONS ---

// Bundled request to acquire the pipeline lock and distribute initial state changes to other clients seamlessly
function syncInitiateAction(combatant, rollEvent, autoRelease = false) {
    return new Promise(resolve => {
        if (socket.readyState !== WebSocket.OPEN) {
            resolve(false);
            return;
        }

        const reqId = 'req-' + Date.now() + '-' + Math.random().toString(36).substr(2, 5);
        pendingPromises[reqId] = resolve;

        socket.send(JSON.stringify({
            type: 'REQUESTinitiateAction',
            requestId: reqId,
            combatant: combatant,
            rollEvent: rollEvent,
            autoRelease: autoRelease
        }));

        // Failsafe timeout to resolve promise if server crashes silently
        setTimeout(() => {
            if (pendingPromises[reqId]) {
                resolve(false);
                delete pendingPromises[reqId];
            }
        }, 8000);
    });
}

// Manually requests the server to release the pipeline lock once the action is completely done
function syncReleaseActionLock() {
    if (socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({ type: 'REQUESTreleaseActionLock' }));
    }
}

// Sends a completely new combatant to the server
function syncAddCombatant(combatant) {
    if (socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({
            type: 'REQUESTaddCombatant',
            combatant: combatant
        }));
    }
}

// Updates an existing combatant's state on the server
// Can optionally attach a systemSound to broadcast alongside the update (e.g. revive, stun)
function syncUpdateCombatant(combatant, systemSound = null) {
    if (socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({
            type: 'REQUESTupdateCombatant',
            combatant: combatant,
            systemSound: systemSound
        }));
    }
}

// Updates multiple existing combatants dynamically avoiding multiple API calls
function syncUpdateCombatantsBatch(combatantsArray) {
    if (socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({
            type: 'REQUESTupdateCombatantsBatch',
            combatants: combatantsArray
        }));
    }
}

// Instructs the server to completely remove a combatant
function syncRemoveCombatant(id) {
    if (socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({
            type: 'REQUESTremoveCombatant',
            id: id
        }));
    }
}

// Instructs the server to add a new roll to global history feed
function syncAddRollEvent(rollEvent) {
    if (socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({
            type: 'REQUESTaddRollEvent',
            rollEvent: rollEvent
        }));
    }
}

// Instructs the server to broadcast an action sequence (sounds/animations) to all clients for synchronized execution
function syncPlayActionSequence(payload) {
    if (socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({
            type: 'REQUESTplayActionSequence',
            payload: payload
        }));
    }
}

// Uniformly executes a visual/audio action sequence received from the server.
// Synchronizes iterative HP/Armor logic to ensure all clients see exactly the same multi-hit flow.
async function playActionSequence(payload) {
    const { targetId, actionType, subType, repeats, isAdding, stepValues, deadSteps, ddSteps, stepId, isAuto, hasPhysFlat, hasMagFlat, isMixedSound, isStunned } = payload;
    const target = activeCharacters.find(c => c.id === targetId);
    if (!target) return;

    // Define sequenceDelay inline to allow awaiting independent blocks smoothly
    const sequenceDelay = ms => new Promise(res => setTimeout(res, ms));

    for (let i = 0; i < repeats; i++) {
        // Apply deterministic stat updates chunk by chunk
        if (stepValues && stepValues[i] !== undefined) {
            if (actionType === 'damage' || actionType === 'heal') {
                // Backwards compatilibility check for heal plain number arrays
                target.currentStats.hp = stepValues[i].hp !== undefined ? stepValues[i].hp : stepValues[i]; 
                if (stepValues[i].physArmor !== undefined) target.currentStats.physArmor = stepValues[i].physArmor;
                if (stepValues[i].magArmor !== undefined) target.currentStats.magArmor = stepValues[i].magArmor;
                
                // IMPORTANT: Only set isDead if explicitly flagged by the math logic in deadSteps, preserving Death's Door checks
                if (actionType === 'damage' && deadSteps && deadSteps[i]) {
                    target.isDead = true;
                }
            } else if (actionType === 'armor') {
                const sv = stepValues[i];
                if (sv.physArmor !== undefined) target.currentStats.physArmor = sv.physArmor;
                if (sv.magArmor !== undefined) target.currentStats.magArmor = sv.magArmor;
            }
            refreshCombatantDisplay(target);
        }

        // Visual hit reaction via token CSS
        const token = document.querySelector(`.character-token[data-id="${target.id}"]`);
        if (token) {
            token.classList.remove('hit-animation');
            void token.offsetWidth; // trigger reflow to restart CSS animation
            token.classList.add('hit-animation');
        }

        // Prevent playing main buff/debuff sounds if the target resisted the action entirely
        let shouldPlayMainSound = true;
        if ((actionType === 'armor' || actionType === 'heal' || actionType === 'effect') && (subType === 'miss' || subType === 'resist')) {
            shouldPlayMainSound = false;
        }

        if (shouldPlayMainSound) {
            const soundSubType = hasPhysFlat ? 'phys' : 'mag';
            const activeKeyIdentifier = isMixedSound ? 'mixed' : (actionType === 'damage' ? subType : soundSubType);
            const mainSoundKey = stepId ? `${stepId}-${actionType}-${activeKeyIdentifier}-${i}` : null;
            
            let soundPath = '';
            let volume = 0.5;

            // Strict naming convention resolution mapping directly to the new structured sound files
            if (actionType === 'damage') {
                if (subType === 'dodge') soundPath = 'sound/dodge.mp3';
                else if (subType === 'no_dmg') soundPath = 'sound/no_dmg_hit.mp3';
                else if (subType.endsWith('_block')) soundPath = `sound/damage_${subType}.mp3`; // damage_phys_block.mp3, damage_mag_block.mp3
                else soundPath = `sound/damage_${subType}_hit.mp3`; // damage_phys_hit.mp3, damage_mag_hit.mp3, damage_pierce_hit.mp3
            } else if (actionType === 'heal') {
                soundPath = `sound/heal_${subType}.mp3`;
            } else if (actionType === 'armor') {
                if (isMixedSound) {
                    soundPath = 'sound/armor_mixed.mp3';
                } else {
                    soundPath = isAdding ? `sound/armor_${soundSubType}_up.mp3` : `sound/armor_${soundSubType}_down.mp3`; // armor_phys_up.mp3, armor_mag_down.mp3, etc.
                }
            }

            if (soundPath) {
                playDeduplicatedSound(soundPath, mainSoundKey, isAuto, volume);
            }
        }

        // Global Stun sound check
        if (isStunned) {
            const stunKey = stepId ? `stun-${stepId}-${i}` : null;
            playDeduplicatedSound('sound/stun.mp3', stunKey, isAuto, 0.5);
        }

        // Global Death's Door sound check per active step
        if (ddSteps && ddSteps[i]) {
            const ddKey = stepId ? `dd-${stepId}-${i}` : null;
            playDeduplicatedSound('sound/deaths_door.mp3', ddKey, isAuto, 0.5);
        }

        if (i < repeats - 1) await sequenceDelay(300);
    }
}

// Helper function to update a single token's visual state on the arena
function updateTokenDisplay(combatant) {
    const token = document.querySelector(`.character-token[data-id="${combatant.id}"]`);
    if (!token) return;

    const hpPercentage = (combatant.currentStats.hp / combatant.currentStats.maxHp) * 100;
    const hpClass = getHpClass(hpPercentage, combatant.isDead);
    
    const tokenFill = token.querySelector('.token-hp-fill');
    if (tokenFill) {
        tokenFill.style.width = `${Math.max(0, Math.min(100, hpPercentage))}%`;
        tokenFill.className = `token-hp-fill ${hpClass}`;
    }

    const nameEl = token.querySelector('.token-name');
    if (nameEl) nameEl.textContent = combatant.uniqueName || t('unknown_character');

    // Stun Icon dynamic state update
    const stunIcon = token.querySelector('.token-stun-icon');
    if (stunIcon) {
        if (combatant.isStunned) stunIcon.classList.add('visible');
        else stunIcon.classList.remove('visible');
    }

    if (combatant.isDead) token.classList.add('dead');
    else token.classList.remove('dead');

    // Update Shield Status & Animations
    const updateShield = (type, newVal) => {
        const shield = token.querySelector(`.token-armor-shield.${type}`);
        if (!shield) return;
        const valSpan = shield.querySelector('.shield-val');
        const oldVal = parseInt(shield.dataset.val) || 0;
        
        // Handle visibility using shield-hidden to maintain flexbox spacing
        // Hide shield if value is 0 OR character is dead
        if (newVal > 0 && !combatant.isDead) shield.classList.remove('shield-hidden');
        else shield.classList.add('shield-hidden');

        // Apply changes and animations only if value actually changed
        if (newVal !== oldVal) {
            shield.dataset.val = newVal;
            valSpan.textContent = newVal;
            
            // Adjust scaling using token-specific classes
            valSpan.classList.remove('shield-text-sm', 'shield-text-xs');
            if (newVal > 999) valSpan.classList.add('shield-text-xs');
            else if (newVal > 99) valSpan.classList.add('shield-text-sm');

            // Trigger animation
            valSpan.classList.remove('armor-flash-green', 'armor-flash-red');
            void valSpan.offsetWidth; // Force DOM reflow to restart CSS animation
            if (newVal > oldVal) valSpan.classList.add('armor-flash-green');
            else valSpan.classList.add('armor-flash-red');
        }
    };

    updateShield('phys', combatant.currentStats.physArmor || 0);
    updateShield('mag', combatant.currentStats.magArmor || 0);
}

// Helper function to update the Right Panel if the combatant is currently selected
function updateRightPanelDisplay(combatant) {
    if (selectedCharacterId !== combatant.id) return;

    const hpPercentage = (combatant.currentStats.hp / combatant.currentStats.maxHp) * 100;
    const hpClass = getHpClass(hpPercentage, combatant.isDead);
    
    // HP Visuals
    const sheetVisual = document.querySelector('.char-hp-visual');
    if (sheetVisual) {
        if (combatant.isDead) sheetVisual.classList.add('dead');
        else sheetVisual.classList.remove('dead');
    }

    const sheetFill = document.querySelector('.char-hp-visual-fill');
    if (sheetFill) {
        sheetFill.style.width = `${Math.max(0, Math.min(100, hpPercentage))}%`;
        sheetFill.className = `char-hp-visual-fill ${hpClass}`;
    }

    // Input update helper
    const safeUpdateInput = (selector, value) => {
        const input = document.querySelector(selector);
        if (input) input.value = value;
    };

    safeUpdateInput('.char-name-input', combatant.uniqueName);
    safeUpdateInput('.current-hp-input', combatant.currentStats.hp);
    safeUpdateInput('.max-hp-input', combatant.currentStats.maxHp);
    safeUpdateInput('.base-damage-input', combatant.currentStats.damage || 0);

    // Core Stats
    const allStats = ['vitality', 'intuition', 'strength', 'agility', 'attunement', 'perception', 'accuracy', 'reflex', 'resilience'];
    allStats.forEach(stat => {
        safeUpdateInput(`.stat-val-input[data-stat="${stat}"]`, combatant.currentStats[stat] || '');
        safeUpdateInput(`.stat-mod-input[data-stat="${stat}Mod"]`, combatant.currentStats[`${stat}Mod`] || '');
    });

    // Update Shield Status & Animations for Character Sheet inputs
    const updateSheetShield = (selector, newVal) => {
        const input = document.querySelector(selector);
        if (!input) return;
        const oldVal = parseInt(input.dataset.val) || 0;
        
        if (input.value != newVal) {
            input.value = newVal;
        }

        if (newVal !== oldVal) {
            input.dataset.val = newVal;
            
            // Adjust scaling using sheet-specific classes
            input.classList.remove('sheet-text-sm', 'sheet-text-xs');
            if (newVal > 999) input.classList.add('sheet-text-xs');
            else if (newVal > 99) input.classList.add('sheet-text-sm');

            // Trigger animation
            input.classList.remove('armor-flash-green', 'armor-flash-red');
            void input.offsetWidth; // Force DOM reflow to restart CSS animation
            if (newVal > oldVal) input.classList.add('armor-flash-green');
            else input.classList.add('armor-flash-red');
        }
    };

    updateSheetShield('.base-phys-armor', combatant.currentStats.physArmor || 0);
    updateSheetShield('.base-mag-armor', combatant.currentStats.magArmor || 0);

    // Completely re-render Extra Panel to recalculate formulas and success rates in real-time
    renderExtraPanel(combatant.id);

    // Dynamic rebuild of the functional column (ensures Resurrect button appears instantly)
    const charFunctional = document.getElementById('panel-char-functional');
    if (charFunctional) {
        charFunctional.innerHTML = generateFunctionalColumn(combatant);
    }
}

// Master UI Updater for bulk elements dynamically skipping independent DOM updates to boost performance
function refreshDisplay(combatantsArray) {
    combatantsArray.forEach(combatant => {
        updateTokenDisplay(combatant);
        updateRightPanelDisplay(combatant);
    });

    // Update effects globally once per batch update
    renderEffects();
}

// Fallback legacy UI Updater routing single updates specifically through batch rendering engine constraints
function refreshCombatantDisplay(combatant) {
    refreshDisplay([combatant]); 
}

function updateServerEffects(newEffects) {
    if (socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({
            type: "REQUESTupdateEffects",
            activeEffects: newEffects
        }));
    }
}