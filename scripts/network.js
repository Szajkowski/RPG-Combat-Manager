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
        alert(t('connection_error'));
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
                    activeCombatants[index] = data.combatant;
                    refreshCombatantDisplay(activeCombatants[index]);
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
function syncUpdateCombatant(combatant) {
    if (socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({
            type: 'REQUESTupdateCombatant',
            combatant: combatant
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
    const { targetId, actionType, subType, repeats, isAdding, stepValues, deadSteps } = payload;
    const target = activeCombatants.find(c => c.id === targetId);
    if (!target) return;

    // We can't import delay directly if it's trapped in a separate scope, so we define a safe inline awaiter
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
                if (subType === 'phys') {
                    if (typeof stepValues[i] === 'string' && stepValues[i].includes('%')) target.stats.physArmorMod = stepValues[i];
                    else target.stats.physArmor = stepValues[i];
                } else {
                    if (typeof stepValues[i] === 'string' && stepValues[i].includes('%')) target.stats.magArmorMod = stepValues[i];
                    else target.stats.magArmor = stepValues[i];
                }
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

        // Play exact context-aware sound mimicking the sender's resolution
        if (actionType === 'damage') {
            if (subType === 'dodge') playSoundEffect('sound/dodge.mp3');
            else if (subType === 'no_dmg') playSoundEffect('sound/no_dmg_hit.mp3');
            else playSoundEffect(`sound/${subType}_hit.mp3`);
        } else if (actionType === 'heal') {
            playSoundEffect(`sound/heal_${subType}.mp3`);
        } else if (actionType === 'armor') {
            playSoundEffect(isAdding ? `sound/${subType}_armor_up.mp3` : `sound/${subType}_armor_down.mp3`, 0.5);
        }

        if (i < repeats - 1) await sequenceDelay(300);
    }
}

// Master UI Updater: Updates Token, Right Panel, and Extra Panel in real-time
function refreshCombatantDisplay(combatant) {
    // 1. Update Token on the Arena
    const token = document.querySelector(`.character-token[data-id="${combatant.id}"]`);
    if (token) {
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

    // 2. Update Right Panel if this character is currently selected
    if (selectedCharacterId === combatant.id) {
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

        // A little update helper
        const safeUpdateInput = (selector, value) => {
            const input = document.querySelector(selector);
            if (!input) return;
            else input.value = value;
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

        // 3. Completely re-render Extra Panel to recalculate formulas and success rates in real-time
        renderExtraPanel(combatant.id);

        // 4. Dynamic rebuild of the functional column (ensures Resurrect button appears instantly)
        const charFunctional = document.getElementById('panel-char-functional');
        if (charFunctional) {
            charFunctional.innerHTML = generateFunctionalColumn(combatant);
        }
    }
    // 5. Update conditions
    renderConditions();
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