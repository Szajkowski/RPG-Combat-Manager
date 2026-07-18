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
                
                if (typeof renderToken === 'function') {
                    activeCombatants.forEach(c => renderToken(c));
                }

                // Render dynamic HUDs
                if (typeof renderInitiativeTracker === 'function') renderInitiativeTracker();
                if (typeof renderConditions === 'function') renderConditions();

                // CRITICAL CHORE: Load initial characters from config.ini ONLY if the server responded with an empty list
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
                    
                    if (typeof refreshCombatantDisplay === 'function') {
                        refreshCombatantDisplay(activeCombatants[index], data.senderId);
                    }
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
                
                if (selectedCharacterId === data.id) {
                    selectedCharacterId = null;
                    const charSheet = document.getElementById('panel-char-sheet');
                    if (charSheet) charSheet.innerHTML = '';
                    const charFunctional = document.getElementById('panel-char-functional');
                    if (charFunctional) charFunctional.innerHTML = '';
                    const extraPanel = document.getElementById('panel-extra');
                    if (extraPanel) extraPanel.innerHTML = '';
                }

                if (typeof renderInitiativeTracker === 'function') renderInitiativeTracker();
                break;
            }

            case "BROADCASTaddCondition": {
                activeConditions = data.activeConditions;
                if (typeof renderConditions === 'function') renderConditions();
                break;
            }

            case "BROADCASTupdateConditions": {
                activeConditions = data.activeConditions;
                if (typeof renderConditions === 'function') renderConditions();
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

// Master UI Updater: Updates Token, Right Panel, and Extra Panel in real-time
// Differentiates between the sender client and external network clients for text field focus updates
function refreshCombatantDisplay(combatant, senderId = null) {
    const isSender = senderId !== null && senderId === myClientId;

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

        // Precise update helper based on whether the local client initiated the request or not
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
            safeUpdateInput(`.stat-val-input[data-stat="${stat}"]`, combatant.stats[stat] || 0);
            safeUpdateInput(`.stat-mod-input[data-stat="${stat}Mod"]`, combatant.stats[`${stat}Mod`] || '');
        });

        // Armor & Damage
        safeUpdateInput('.base-damage-input', combatant.stats.damage || 0);
        safeUpdateInput('.base-phys-armor', combatant.stats.physArmor || 0);
        safeUpdateInput('.base-phys-armor-mod', combatant.stats.physArmorMod || '');
        safeUpdateInput('.base-mag-armor', combatant.stats.magArmor || 0);
        safeUpdateInput('.base-mag-armor-mod', combatant.stats.magArmorMod || '');

        // Last Roll (Safe to overwrite since they are standard layout elements)
        const lastRollDisplay = document.getElementById('last-roll-display');
        const lastRollLabel = document.querySelector('.dice-result-label');
        if (lastRollDisplay && lastRollLabel && combatant.lastRoll) {
            lastRollLabel.textContent = combatant.lastRoll.stat ? `${t('last_roll')} (${t(combatant.lastRoll.stat)})` : t('last_roll');
            lastRollDisplay.textContent = combatant.lastRoll.result || '-';
            lastRollDisplay.style.color = combatant.lastRoll.color || 'white';
        }

        // Stun toggle button
        const stunBtn = document.querySelector('.func-btn.stun');
        if (stunBtn) {
            if (combatant.isStunned) stunBtn.classList.add('active');
            else stunBtn.classList.remove('active');
        }

        // 3. Completely re-render Extra Panel to recalculate formulas and success rates in real-time
        renderExtraPanel(combatant.id);
    }
}

// --- CONDITION PROMISES (Kept for compatibility) ---
function loadServerActiveConditions() {
    return new Promise((resolve, reject) => {
        const requestId = Date.now();
        pendingPromises[requestId] = resolve;

        socket.send(JSON.stringify({
            type: "REQUESTgetConditions",
            requestId
        }));

        setTimeout(() => {
            if (pendingPromises[requestId]) {
                delete pendingPromises[requestId];
                reject(new Error("Server did not respond in time."));
            }
        }, 5000); // 5 seconds timeout
    });
}

function sendCondition(target, name, description, duration) {
    let descriptionParsed = typeof parseDescription === 'function' ? parseDescription(description, activeCombatants.find(c => c.uniqueName === target)) : description;
    
    const condition = {
        id: `condition-${Date.now()}-${Math.random().toString(16).slice(2)}`,
        name: name,
        target: target,
        description: descriptionParsed,
        duration: duration
    };

    socket.send(JSON.stringify({
        type: "REQUESTaddCondition",
        condition
    }));
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