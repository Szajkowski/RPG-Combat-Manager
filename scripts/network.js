const urlParams = new URLSearchParams(window.location.search);
let clientName = urlParams.get('player');

if (clientName) clientName = decodeURI(clientName).replace(/"/g, "");
else clientName = "GM";

// Variable to track pending promises
const pendingPromises = {};

function connectSocket() {
    // Dynamically assign WebSocket URL based on the current host (IP/domain + port)
    const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const socket = new WebSocket(`${wsProtocol}//${window.location.host}`);

    socket.onopen = () => {
        socket.send(JSON.stringify({
            type: "registerConnection",
            clientName: clientName
        }));
    };

    socket.onerror = (error) => {
        // UX element left in Polish
        alert("Błąd połączenia (zapewne serwer nie jest włączony)");
    };

    socket.onmessage = async (event) => {
        const data = JSON.parse(event.data);
        
        switch (data.type) {
            // On load, if the player is already on the server, get their data
            case 'RESPONSEplayerFound': {
                console.log(`Loaded ${data.playerName} from server.`);
                addCharacter("player", data.team, data.playerStats, data.playerName);
                break;
            }
            
            // On load, if the player is not on the server, fetch from players.js
            case 'RESPONSEplayerNotFound': {
                console.log(`Loaded ${data.playerName} from players.js.`);
                addCharacter("player", data.team, players[data.playerName], data.playerName);
                break;
            }
            
            // Upon a change by any client, players update everywhere simultaneously
            case 'BROADCASTupdatePlayer': {
                updatePlayer(data.playerName, data.playerStats);
                break;
            }

            // After reloading a page that was disconnected, characters need to be updated
            case 'RESPONSEupdateSpecificPlayersStats': {
                const playersToUpdate = data.playersToUpdate;

                document.querySelectorAll('.character[data-type="player"]').forEach(playerDiv => {
                    const playerName = playerDiv.querySelector('input[type="text"]').value.trim();

                    if (playersToUpdate[playerName])
                        updatePlayer(playerName, playersToUpdate[playerName]);
                    else
                        console.warn(`No data found for character: ${playerName}`);
                });
                break;
            }
    
            // Give the client abilitiesStates needed to execute the next code
            case 'RESPONSEgetServerAbilitiesStates': {
                const resolve = pendingPromises[data.requestId];
                if (resolve) {
                    delete pendingPromises[data.requestId];
                    resolve(data.serverAbilitiesStates);
                }
                break;
            }
            
            // Resolve await after abilitiesStates are updated
            case 'RESPONSEupdateServerAbilitiesStates': {
                const resolve = pendingPromises[data.requestId];
                if (resolve) {
                    delete pendingPromises[data.requestId];
                    resolve();
                }
                break;
            }
    
            // Broadcast active panel update to everyone, so a player with an open panel can see their CD decreasing
            case 'BROADCASTupdateActivePanel': {
                updateActivePanel();
                break;
            }
    
            case 'RESPONSEgetConditions': {
                const resolve = pendingPromises[data.requestId];
                if (resolve) {
                    delete pendingPromises[data.requestId];
                    resolve(data.activeConditions);
                }
                break;
            }
    
            case 'RESPONSEupdateConditions': {
                const resolve = pendingPromises[data.requestId];
                if (resolve) {
                    delete pendingPromises[data.requestId];
                    resolve();
                }
                break;
            }
    
            // If the GM has the conditions sidebar open, update it
            case "BROADCASTaddCondition": {
                const sidebar = document.getElementById('Sidebar');
                if (!sidebar) break;
                await markConditionTargets(); // Mark targets when adding a new condition
    
                const sidebarConditions = sidebar.querySelector('.sidebar-conditions');
                if (sidebarConditions.style.display !== 'flex') break;
    
                const activeConditions = data.activeConditions;
    
                sidebarConditions.innerHTML = `<h3>Stany</h3>`; // UX left in Polish
                activeConditions.forEach(condition => {
                    addConditionToSidebar(condition);
                });
                markExpiredConditions(activeConditions);
                break;
            }
    
            case "BROADCASTupdateCurrentCombatRound": {
                currentCombatRound = data.currentCombatRound;
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

function addPlayerCharacter(name, team) {
    socket.send(JSON.stringify({
        type: 'REQUESTgetPlayer',
        playerName: name,
        team: team
    }));
}

function sendPlayerStats(characterDiv) {
    if (characterDiv.dataset.type !== 'player') return;

    let playerStats = {
        name: characterDiv.querySelector('input[type="text"]').value.trim(),
        hp: parseInt(characterDiv.querySelector('.current-hp').value) ?? '',
        maxHp: parseInt(characterDiv.querySelector('.max-hp').value) ?? '',

        vitality: characterDiv.querySelector('.stat-value.vitality').value ?? '',
        intuition: characterDiv.querySelector('.stat-value.intuition').value ?? '',
        strength: characterDiv.querySelector('.stat-value.strength').value ?? '',
        agility: characterDiv.querySelector('.stat-value.agility').value ?? '',
        accuracy: characterDiv.querySelector('.stat-value.accuracy').value ?? '',
        reflex: characterDiv.querySelector('.stat-value.reflex').value ?? '',
        resilience: characterDiv.querySelector('.stat-value.resilience').value ?? '',
        physArmor: characterDiv.querySelector('.stat-value.physArmor').value ?? '',
        magArmor: characterDiv.querySelector('.stat-value.magArmor').value ?? '',

        vitalityMod: characterDiv.querySelector('.mod-value.vitality').value ?? '',
        intuitionMod: characterDiv.querySelector('.mod-value.intuition').value ?? '',
        strengthMod: characterDiv.querySelector('.mod-value.strength').value ?? '',
        agilityMod: characterDiv.querySelector('.mod-value.agility').value ?? '',
        accuracyMod: characterDiv.querySelector('.mod-value.accuracy').value ?? '',
        reflexMod: characterDiv.querySelector('.mod-value.reflex').value ?? '',
        resilienceMod: characterDiv.querySelector('.mod-value.resilience').value ?? '',
        physArmorMod: characterDiv.querySelector('.mod-value.physArmor').value ?? '',
        magArmorMod: characterDiv.querySelector('.mod-value.magArmor').value ?? '',

        damage: characterDiv.querySelector('.damage').value ?? '',

        hasDeathsDoor: characterDiv.dataset.hasDeathsDoor,
        isDead: characterDiv.dataset.isDead ?? "false",
        isStunned: characterDiv.querySelector('.stun-button').classList.contains('stunned'),
    };

    if (characterDiv.querySelector('.attunement'))
    {
        playerStats["attunement"] = characterDiv.querySelector('.stat-value.attunement').value;
        playerStats["perception"] = characterDiv.querySelector('.stat-value.perception').value;

        playerStats["attunementMod"] = characterDiv.querySelector('.mod-value.attunement').value;
        playerStats["perceptionMod"] = characterDiv.querySelector('.mod-value.perception').value;
    }

    const playerName = playerStats.name;

    const playerData = {
        type: 'REQUESTupdatePlayer',
        playerName,
        playerStats
    };
    socket.send(JSON.stringify(playerData));
}

function updatePlayer(playerName, playerStats) {
    // Find the character element by name
    const characterDiv = Array.from(document.querySelectorAll('.character'))
        .find(div => div.querySelector('input[type="text"]').value.trim() === playerName);

    if (!characterDiv) {
        return;
    }

    // Update character fields
    characterDiv.querySelector('.current-hp').value = playerStats.hp ?? '';
    characterDiv.querySelector('.max-hp').value = playerStats.maxHp ?? '';

    characterDiv.querySelector('.stat-value.vitality').value = playerStats.vitality ?? '';
    characterDiv.querySelector('.stat-value.intuition').value = playerStats.intuition ?? '';
    characterDiv.querySelector('.stat-value.strength').value = playerStats.strength ?? '';
    characterDiv.querySelector('.stat-value.agility').value = playerStats.agility ?? '';
    characterDiv.querySelector('.stat-value.accuracy').value = playerStats.accuracy ?? '';
    characterDiv.querySelector('.stat-value.reflex').value = playerStats.reflex ?? '';
    characterDiv.querySelector('.stat-value.resilience').value = playerStats.resilience ?? '';
    characterDiv.querySelector('.stat-value.physArmor').value = playerStats.physArmor ?? '';
    characterDiv.querySelector('.stat-value.magArmor').value = playerStats.magArmor ?? '';

    characterDiv.querySelector('.mod-value.vitality').value = playerStats.vitalityMod ?? '';
    characterDiv.querySelector('.mod-value.intuition').value = playerStats.intuitionMod ?? '';
    characterDiv.querySelector('.mod-value.strength').value = playerStats.strengthMod ?? '';
    characterDiv.querySelector('.mod-value.agility').value = playerStats.agilityMod ?? '';
    characterDiv.querySelector('.mod-value.accuracy').value = playerStats.accuracyMod ?? '';
    characterDiv.querySelector('.mod-value.reflex').value = playerStats.reflexMod ?? '';
    characterDiv.querySelector('.mod-value.resilience').value = playerStats.resilienceMod ?? '';
    characterDiv.querySelector('.mod-value.physArmor').value = playerStats.physArmorMod ?? '';
    characterDiv.querySelector('.mod-value.magArmor').value = playerStats.magArmorMod ?? '';

    characterDiv.querySelector('.damage').value = playerStats.damage ?? '';

    if (playerStats.attunement)
    {
        characterDiv.querySelector('.stat-value.attunement').value = playerStats.attunement ?? '';
        characterDiv.querySelector('.stat-value.perception').value = playerStats.perception ?? '';

        characterDiv.querySelector('.mod-value.attunement').value = playerStats.attunementMod ?? '';
        characterDiv.querySelector('.mod-value.perception').value = playerStats.perceptionMod ?? '';
    }

    if (playerStats.isDead === "true")
        characterDiv.dataset.isDead = "true";
    else
        characterDiv.dataset.isDead = "false";

    const stunButton = characterDiv.querySelector('.stun-button');
    const abilitiesButton = characterDiv.querySelector('.abilities-button');

    if (playerStats.isStunned) {
        stunButton.classList.add('stunned');
        if (abilitiesButton) {
            hideActivePanel();
            abilitiesButton.disabled = true;
        }
    } else if (abilitiesButton) {
        stunButton.classList.remove('stunned');
        abilitiesButton.disabled = false;
    } else {
        stunButton.classList.remove('stunned');
    }

    // Update HP bar
    updateHpBar(characterDiv.querySelector('.current-hp'));

    console.log(`Updated player: ${playerName}`);
}

function updateSpecificPlayersStats(playerNames) {
    socket.send(JSON.stringify({
        type: "REQUESTupdateSpecificPlayersStats",
        playerNames
    }));
}

function addInputSync(characterDiv) {
    let inputs = characterDiv.querySelectorAll('.stat-value');
    inputs.forEach(input => {
        input.addEventListener('input', () => sendPlayerStats(characterDiv));
    });
    inputs = characterDiv.querySelectorAll('.mod-value');
    inputs.forEach(input => {
        input.addEventListener('input', () => sendPlayerStats(characterDiv));
    });
}

function updateServerAbilitiesStates(abilitiesStates) {
    return new Promise((resolve, reject) => {
        const requestId = Date.now();
        pendingPromises[requestId] = resolve;

        socket.send(JSON.stringify({
            type: "REQUESTupdateServerAbilitiesStates",
            requestId,
            localAbilitiesStates: abilitiesStates
        }));

        // Timeout in case of no response
        setTimeout(() => {
            if (pendingPromises[requestId]) {
                delete pendingPromises[requestId];
                reject(new Error("Server did not respond in time."));
            }
        }, 5000); // 5 seconds timeout
    });
}

function loadServerAbilitiesStates() {
    return new Promise((resolve, reject) => {
        const requestId = Date.now();
        pendingPromises[requestId] = resolve;

        // Send request to the server
        socket.send(JSON.stringify({
            type: "REQUESTgetServerAbilitiesStates",
            requestId
        }));

        // Timeout in case of no response
        setTimeout(() => {
            if (pendingPromises[requestId]) {
                delete pendingPromises[requestId];
                reject(new Error("Server did not respond in time."));
            }
        }, 5000); // 5 seconds timeout
    });
}

async function updateActivePanel() {
    if (!activePanel || !activePanel.classList.contains('abilities-panel')) return;

    const abilitiesStates = await loadServerAbilitiesStates();

    const allCooldownButtons = activePanel.querySelectorAll('.cooldown-button');
    allCooldownButtons.forEach(button => {
        const characterDiv = activePanel.closest('.character');
        const characterName = characterDiv.querySelector('input[type="text"]').value;
        const abilityName = button.closest('.ability-item').querySelector('.ability-name').textContent;
        const abilityState = abilitiesStates[characterName][abilityName];

        if (abilityState.currentCooldown === 0) {
            button.disabled = false; 
            button.classList.remove('unavailable');
            button.classList.add('available');
            button.textContent = 'Dostępne';
        } else if (abilityState.currentCooldown !== 'Niedostępne') {
            button.classList.add('unavailable');
            button.textContent = abilityState.currentCooldown;
        }
    });
}

async function requestUpdateActivePanel() {
    socket.send(JSON.stringify({
        type: "REQUESTupdateActivePanel"
    }));
}

function loadServerActiveConditions() {
    return new Promise((resolve, reject) => {
        const requestId = Date.now();
        pendingPromises[requestId] = resolve;

        // Send request to the server
        socket.send(JSON.stringify({
            type: "REQUESTgetConditions",
            requestId
        }));

        // Timeout in case of no response
        setTimeout(() => {
            if (pendingPromises[requestId]) {
                delete pendingPromises[requestId];
                reject(new Error("Server did not respond in time."));
            }
        }, 5000); // 5 seconds timeout
    });
}

function sendCondition(target, description, duration, characterDiv) {
    // Parsing the condition description should be done by the sending client, just in case
    let descriptionParsed = parseDescription(description, characterDiv);

    const condition = {
        id: `condition-${Date.now()}-${Math.random().toString(16).slice(2)}`,
        target,
        description: descriptionParsed,
        duration
    };

    socket.send(JSON.stringify({
        type: "REQUESTaddCondition",
        condition
    }));
}

async function updateServerConditions(activeConditions = []) {
    return new Promise((resolve, reject) => {
        const requestId = Date.now();
        pendingPromises[requestId] = resolve;

        socket.send(JSON.stringify({
            type: "REQUESTupdateConditions",
            requestId,
            activeConditions
        }));

        // Timeout in case of no response
        setTimeout(() => {
            if (pendingPromises[requestId]) {
                delete pendingPromises[requestId];
                reject(new Error("Server did not respond in time."));
            }
        }, 5000); // 5 seconds timeout
    });
}

async function requestUpdateCurrentCombatRound() {
    socket.send(JSON.stringify({
        type: "REQUESTupdateCurrentCombatRound",
        currentCombatRound
    }));
}

// Ping every 30 seconds
setInterval(() => {
    if (socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({ type: 'PING' }));
    }
}, 30000);