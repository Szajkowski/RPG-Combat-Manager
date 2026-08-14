// Get the name from the path itself (removing the initial slash) instead of URLSearchParams
let rawPath = window.location.pathname.substring(1); 
let clientName = "";

if (rawPath && !rawPath.includes("index.html") && !rawPath.includes("player.html")) {
    clientName = decodeURIComponent(rawPath).replace(/"/g, "");
} else {
    clientName = "GM";
}

// --- GLOBAL STATE MOVED TO NETWORK FOR ALL CLIENTS ---
let activeCombatants = []; // Holds all active characters data and their current stats
let activeConditions = []; // Holds all active conditions
let rollsHistory = []; // Tracks historical roll events
let selectedCharacterId = null; // Tracks currently selected character token on the arena
let myClientId = null; // Stored personal client ID assigned by the server

// Variable to track pending promises
const pendingPromises = {};

function connectSocket() {
    const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const socket = new WebSocket(`${wsProtocol}//${window.location.host}`);

    socket.onopen = () => {
        socket.send(JSON.stringify({
            type: "registerConnection",
            clientName: clientName
        }));
    };

    socket.onerror = (error) => {
        if (typeof showAlertDialog === 'function') {
            showAlertDialog(t('connection_error'));
        } else {
            console.error('Connection error', error);
        }
    };

    socket.onmessage = async (event) => {
        const data = JSON.parse(event.data);
        
        switch (data.type) {
            // Receive the unique client ID from the server
            case 'RESPONSEregisterConnection': {
                myClientId = data.clientId;
                socket.send(JSON.stringify({ type: "REQUESTgetFullState" }));
                break;
            }

            // Replaces the entire local state with the server's state upon initial connection
            case 'RESPONSEgetFullState': {
                activeCombatants = data.activeCombatants;
                activeConditions = data.activeConditions; // Sync conditions
                rollsHistory = data.rollsHistory || []; // Sync rolls
                
                if (typeof renderToken === 'function') {
                    activeCombatants.forEach(c => renderToken(c));
                }

                // Render dynamic HUDs
                if (typeof renderInitiativeTracker === 'function') renderInitiativeTracker();
                if (typeof renderConditions === 'function') renderConditions();
                if (typeof renderRollsFeed === 'function') renderRollsFeed(rollsHistory);

                // Initialize empty states properly
                if (typeof checkArenaEmptyStates === 'function') checkArenaEmptyStates();
                if (!selectedCharacterId && typeof checkCharMainPanelEmptyState === 'function') checkCharMainPanelEmptyState();

                // Load initial characters from config.ini ONLY if the server responded with an empty list
                if (activeCombatants.length === 0 && clientName === "GM" && typeof loadInitialConfigCharacters === 'function') {
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
                if (!activeCombatants.find(c => c.id === data.combatant.id)) {
                    activeCombatants.push(data.combatant);
                }
                if (typeof renderToken === 'function') renderToken(data.combatant);
                if (typeof renderInitiativeTracker === 'function') renderInitiativeTracker();
                break;
            }

            case 'BROADCASTupdateCombatant': {
                const index = activeCombatants.findIndex(c => c.id === data.combatant.id);
                if (index !== -1) {
                    // Play associated system sound if the payload contains it
                    if (data.systemSound) {
                        if (typeof playSoundEffect === 'function') {
                            playSoundEffect(`sound/${data.systemSound}.mp3`, 0.5);
                        }
                    }

                    activeCombatants[index] = data.combatant;
                    refreshCombatantDisplay(activeCombatants[index]);
                    if (typeof renderInitiativeTracker === 'function') renderInitiativeTracker();
                }
                break;
            }

            case 'BROADCASTupdateCombatantsBatch': {
                // Update local instances in a batch
                if (Array.isArray(data.combatants)) {
                    data.combatants.forEach(updatedC => {
                        const index = activeCombatants.findIndex(c => c.id === updatedC.id);
                        if (index !== -1) {
                            activeCombatants[index] = updatedC;
                        }
                    });
                    
                    // Call the bulk UI refresh function
                    if (typeof refreshDisplay === 'function') refreshDisplay(data.combatants);
                    if (typeof renderInitiativeTracker === 'function') renderInitiativeTracker();
                }
                break;
            }

            case 'BROADCASTremoveCombatant': {
                const indexToRemove = activeCombatants.findIndex(c => c.id === data.id);
                if (indexToRemove !== -1) {
                    activeCombatants.splice(indexToRemove, 1);
                }
                
                const token = document.querySelector(`.character-token[data-id="${data.id}"]`);
                if (token) token.remove();
                
                // Reset selection if the deleted character was the one currently viewed
                if (selectedCharacterId === data.id) {
                    selectedCharacterId = null;
                }

                // Trigger reactive checks for empty states across the layout
                if (typeof checkCharMainPanelEmptyState === 'function') checkCharMainPanelEmptyState();
                if (typeof renderInitiativeTracker === 'function') renderInitiativeTracker();
                if (typeof checkArenaEmptyStates === 'function') checkArenaEmptyStates();
                break;
            }

            case "BROADCASTaddCondition": {
                activeConditions = data.activeConditions;
                if (typeof renderConditions === 'function') renderConditions();
                if (typeof renderInitiativeTracker === 'function') renderInitiativeTracker();
                break;
            }

            case "BROADCASTupdateConditions": {
                activeConditions = data.activeConditions;
                if (typeof renderConditions === 'function') renderConditions();
                if (typeof renderInitiativeTracker === 'function') renderInitiativeTracker();
                break;
            }

            case 'BROADCASTaddRollEvent': {
                rollsHistory.push(data.rollEvent);
                if (rollsHistory.length > 50) rollsHistory.shift();
                if (typeof appendRollEvent === 'function') appendRollEvent(data.rollEvent, true);
                break;
            }

            case 'BROADCASTplayActionSequence': {
                if (typeof playActionSequence === 'function') {
                    playActionSequence(data.payload);
                }
                break;
            }
                
            default:
                console.log('Unknown message type:', data);
        }
    };

    return socket;
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
    const { targetId, actionType, subType, repeats, isAdding, stepValues, deadSteps, ddSteps, stepId, isAuto, hasPhysFlat, hasPhysPerc, hasMagFlat, hasMagPerc, isMixedSound, isStunned } = payload;
    const target = activeCombatants.find(c => c.id === targetId);
    if (!target) return;

    // Define sequenceDelay inline to allow awaiting independent blocks smoothly
    const sequenceDelay = ms => new Promise(res => setTimeout(res, ms));

    for (let i = 0; i < repeats; i++) {
        // Apply deterministic stat updates chunk by chunk
        if (stepValues && stepValues[i] !== undefined) {
            if (actionType === 'damage' || actionType === 'heal') {
                target.stats.hp = stepValues[i];
                // IMPORTANT: Only set isDead if explicitly flagged by the math logic in deadSteps, preserving Death's Door checks
                if (actionType === 'damage' && deadSteps && deadSteps[i]) {
                    target.isDead = true;
                }
            } else if (actionType === 'armor') {
                const sv = stepValues[i];
                if (sv.physFlat !== undefined) target.stats.physArmor = sv.physFlat;
                if (sv.physPerc !== undefined) target.stats.physArmorMod = `${sv.physPerc}%`;
                if (sv.magFlat !== undefined) target.stats.magArmor = sv.magFlat;
                if (sv.magPerc !== undefined) target.stats.magArmorMod = `${sv.magPerc}%`;
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
        if ((actionType === 'armor' || actionType === 'heal' || actionType === 'condition') && (subType === 'miss' || subType === 'resist')) {
            shouldPlayMainSound = false;
        }

        if (shouldPlayMainSound) {
            const soundSubType = (hasPhysFlat || hasPhysPerc) ? 'phys' : 'mag';
            const activeKeyIdentifier = isMixedSound ? 'mixed' : (actionType === 'damage' ? subType : soundSubType);
            const mainSoundKey = stepId ? `${stepId}-${actionType}-${activeKeyIdentifier}-${i}` : null;
            
            let soundPath = '';
            let volume = 0.5;

            if (actionType === 'damage') {
                if (subType === 'dodge') soundPath = 'sound/dodge.mp3';
                else if (subType === 'no_dmg') soundPath = 'sound/no_dmg_hit.mp3';
                else soundPath = `sound/${subType}_hit.mp3`;
            } else if (actionType === 'heal') {
                soundPath = `sound/heal_${subType}.mp3`;
            } else if (actionType === 'armor') {
                if (isMixedSound) {
                    soundPath = 'sound/mixed_armor.mp3';
                } else {
                    soundPath = isAdding ? `sound/${soundSubType}_armor_up.mp3` : `sound/${soundSubType}_armor_down.mp3`;
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

    const hpPercentage = (combatant.stats.hp / combatant.stats.maxHp) * 100;
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
}

// Helper function to update the Right Panel if the combatant is currently selected
function updateRightPanelDisplay(combatant) {
    if (selectedCharacterId !== combatant.id) return;

    const hpPercentage = (combatant.stats.hp / combatant.stats.maxHp) * 100;
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
    safeUpdateInput('.current-hp-input', combatant.stats.hp);
    safeUpdateInput('.max-hp-input', combatant.stats.maxHp);

    // Core Stats
    const allStats = ['vitality', 'intuition', 'strength', 'agility', 'attunement', 'perception', 'accuracy', 'reflex', 'resilience'];
    allStats.forEach(stat => {
        safeUpdateInput(`.stat-val-input[data-stat="${stat}"]`, combatant.stats[stat] || '');
        safeUpdateInput(`.stat-mod-input[data-stat="${stat}Mod"]`, combatant.stats[`${stat}Mod`] || '');
    });

    // Armor & Damage
    safeUpdateInput('.base-damage-input', combatant.stats.damage || 0);
    safeUpdateInput('.base-phys-armor', combatant.stats.physArmor || 0);
    safeUpdateInput('.base-phys-armor-mod', combatant.stats.physArmorMod || '');
    safeUpdateInput('.base-mag-armor', combatant.stats.magArmor || 0);
    safeUpdateInput('.base-mag-armor-mod', combatant.stats.magArmorMod || '');

    // Completely re-render Extra Panel to recalculate formulas and success rates in real-time
    if (typeof renderExtraPanel === 'function') renderExtraPanel(combatant.id);

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

    // Update conditions globally once per batch update
    if (typeof renderConditions === 'function') renderConditions();
}

// Fallback legacy UI Updater routing single updates specifically through batch rendering engine constraints
function refreshCombatantDisplay(combatant) {
    refreshDisplay([combatant]); 
}

function updateServerConditions(newConditions) {
    if (socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({
            type: "REQUESTupdateConditions",
            activeConditions: newConditions
        }));
    }
}

// Ping every 30 seconds
setInterval(() => {
    if (socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({ type: 'PING' }));
    }
}, 30000);