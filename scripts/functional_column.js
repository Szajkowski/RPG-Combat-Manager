// Generates the HTML for the functional column (buttons: delete, stun, resurrect, reload, save)
function generateFunctionalColumn(combatant) {
    return `
        <button class="func-btn delete" title="${t('remove_character')}" onclick="removeCharacterById('${combatant.id}', event)">
            <div class="icon-mask" style="-webkit-mask-image: url('images/icon-delete.svg'); mask-image: url('images/icon-delete.svg');"></div>
        </button>
        <button class="func-btn stun ${combatant.isStunned ? 'active' : ''}" title="${t('toggle_stun')}" onclick="toggleStun()">
            <div class="icon-mask" style="-webkit-mask-image: url('images/icon-stun.svg'); mask-image: url('images/icon-stun.svg');"></div>
        </button>
        ${combatant.isDead ? `<button class="func-btn resurrect" title="${t('resurrect_character')}" onclick="resurrectCharacter()">
            <div class="icon-mask" style="-webkit-mask-image: url('images/icon-resurrect-ankh.svg'); mask-image: url('images/icon-revive.svg');"></div>
        </button>` : ''}
        ${combatant.baseName !== '' ? `<button class="func-btn reload" title="${t('reload_character')}" onclick="reloadCharacterData()">
            <div class="icon-mask" style="-webkit-mask-image: url('images/icon-reload.svg'); mask-image: url('images/icon-reload.svg');"></div>
        </button>` : ''}
        ${combatant.baseName !== '' ? `<button class="func-btn save-stats" title="${t('save_character_stats')}" onclick="saveCharacterStats('${combatant.id}')">
            <div class="icon-mask" style="-webkit-mask-image: url('images/icon-save.svg'); mask-image: url('images/icon-save.svg');"></div>
        </button>` : ''}
    `;
}

// Parametric character removal function to handle direct removal requests from anywhere
async function removeCharacterById(id, event) {
    if (event) event.stopPropagation(); // Stop event propagation to prevent unintended slot selection toggle
    if (!id) return;

    const combatant = activeCharacters.find(c => c.id === id);
    if (!combatant) return;

    // 1. Remove effects tied to this character (Server sync)
    // Directly use the globally synced activeEffects array to prevent Promise/undefined errors!
    if (typeof activeEffects !== 'undefined' && Array.isArray(activeEffects)) {
        const filteredEffects = activeEffects.filter(effect => effect.target !== combatant.uniqueName);
        
        // Only trigger network update if something was actually deleted
        if (filteredEffects.length !== activeEffects.length) {
            updateServerEffects(filteredEffects);
        }
    }

    // 2. Request removal from server. Server will broadcast removal and clients will automatically delete token and clear panel.
    syncRemoveCombatant(id);
}

// Toggles stun state via the functional column button
function toggleStun() {
    if (!selectedCharacterId) return;
    
    const combatant = activeCharacters.find(c => c.id === selectedCharacterId);
    if (!combatant || combatant.isDead) return;
    
    combatant.isStunned = !combatant.isStunned;
    
    // Broadcast change to server, attaching the stun sound conditionally
    syncUpdateCombatant(combatant, combatant.isStunned ? 'stun' : null);
}

// Resurrects the currently selected character to full HP and clears their dead state
function resurrectCharacter() {
    if (!selectedCharacterId) return;

    const combatant = activeCharacters.find(c => c.id === selectedCharacterId);
    if (!combatant || !combatant.isDead) return;

    combatant.isDead = false;
    combatant.currentStats.hp = combatant.currentStats.maxHp || 10;
    
    // Send update to server to globally broadcast the resurrection alongside the audio effect
    syncUpdateCombatant(combatant, 'revive');
}

// Reloads the corresponding data file and recalculates the currently selected character's stats
async function reloadCharacterData() {
    if (!selectedCharacterId) return;
    
    const combatant = activeCharacters.find(c => c.id === selectedCharacterId);
    // We can only reload named characters that originate from a file
    if (!combatant || combatant.baseName === '') return;

    try {
        let freshData = null;
        
        // Dynamically reload the correct script and fetch fresh data based on character type
        if (combatant.type === 'player') {
            await reloadScript('players-data', 'data/players.js');
            freshData = players[combatant.baseName];
        } else if (combatant.type === 'mob') {
            await reloadScript('mobs-data', 'data/mobs.js');
            freshData = mobs[combatant.baseName];
        } else if (combatant.type === 'npc') {
            await reloadScript('npcs-data', 'data/npcs.js');
            freshData = npcs[combatant.baseName];
        } else if (combatant.type === 'boss') {
            await reloadScript('bosses-data', 'data/bosses.js');
            freshData = bosses[combatant.baseName];
        }

        if (!freshData) return;

        // Apply fallback base HP if missing
        if (freshData.hp === undefined) freshData.hp = 10;
        if (freshData.maxHp === undefined) freshData.maxHp = 10;

        const currentHp = combatant.currentStats.hp;
        const wasDead = combatant.isDead;
        const turnsTaken = combatant.turnsTakenThisRound || 0; 
        
        // Clean reset of baseline states to the content directly from the server file
        combatant.initialStats = JSON.parse(JSON.stringify(freshData));
        combatant.baselineStats = JSON.parse(JSON.stringify(freshData)); 
        
        combatant.isDead = wasDead;
        combatant.turnsTakenThisRound = turnsTaken;
        
        combatant.equipment = freshData.equipment ? JSON.parse(JSON.stringify(freshData.equipment)) : [];
        combatant.abilities = freshData.abilities ? JSON.parse(JSON.stringify(freshData.abilities)) : [];

        // Recalculate pipeline from scratch with updated baseline and items
        recalculateCurrentStats(combatant);
        // Protect current health state
        combatant.currentStats.hp = Math.min(currentHp, combatant.currentStats.maxHp);

        // Check if any new abilities were added and assign them default memory states
        combatant.abilities.forEach(ability => {
            if (!combatant.abilitiesStates[ability.name]) {
                const isSingleUse = ability.cooldown === "[cooldown_once]";
                const maxCooldown = isSingleUse ? Infinity : (!ability.cooldown && ability.cooldown !== 0 ? 0 : parseInt(ability.cooldown) + 1);
                combatant.abilitiesStates[ability.name] = {
                    currentCooldown: 0,
                    maxCooldown: maxCooldown,
                    singleUse: isSingleUse
                };
            }
        });
        
        syncUpdateCombatant(combatant);
        showNotification(t('reload_success'), { theme: 'var(--theme-positive)' });
        
    } catch (error) {
        console.error("Error while reloading character data:", error);
        showNotification(t('reload_error'), { theme: 'var(--theme-negative)' });
    }
}

// Compares current modified stats to initial baseline stats and applies delta modifications to backend files via API request
function saveCharacterStats(id) {
    const combatant = activeCharacters.find(c => c.id === id);
    if (!combatant || !combatant.baseName) return;

    let targetDict = null;
    if (combatant.type === 'player') targetDict = players;
    else if (combatant.type === 'mob') targetDict = mobs;
    else if (combatant.type === 'npc') targetDict = npcs;
    else if (combatant.type === 'boss') targetDict = bosses;

    if (!targetDict || !targetDict[combatant.baseName]) return;

    const baseChar = targetDict[combatant.baseName];
    
    // Expanded array to track core stats, modifiers, and percentage values (Removed passive armor percentages)
    const statsToTrack = [
        'vitality', 'intuition', 'strength', 'agility', 'attunement', 
        'perception', 'accuracy', 'reflex', 'resilience', 'damage',
        'maxHp', 'physArmor', 'magArmor',
        'vitalityMod', 'intuitionMod', 'strengthMod', 'agilityMod', 'attunementMod',
        'perceptionMod', 'accuracyMod', 'reflexMod', 'resilienceMod'
    ];
    
    // Core primary attributes list that must never evaluate to 0 or be removed
    const coreAttributes = ['vitality', 'intuition', 'strength', 'agility', 'attunement', 'perception', 'accuracy', 'reflex', 'resilience', 'damage'];
    
    let changeLogs = [];
    let stateDeltas = {};

    statsToTrack.forEach(stat => {
        // Fallback to 0 if the stat is missing or undefined in initial state, with explicit NaN validation
        let initialVal = combatant.initialStats[stat] !== undefined ? parseInt(combatant.initialStats[stat]) : 0;
        if (isNaN(initialVal)) initialVal = 0;

        // Fallback to 0 if the stat was missing or undefined in baseline state, with explicit NaN validation
        let baselineVal = combatant.baselineStats[stat] !== undefined ? parseInt(combatant.baselineStats[stat]) : 0;
        if (isNaN(baselineVal)) baselineVal = 0;
        
        // Enforce a minimum threshold value of 1 for core main stats to prevent them from dropping to 0
        if (coreAttributes.includes(stat)) {
            if (baselineVal <= 0) baselineVal = 1;
            if (initialVal <= 0) initialVal = 1;
        }
        
        if (baselineVal !== initialVal) {
            const diff = baselineVal - initialVal;
            const prefix = diff > 0 ? '+' : '';
            
            // Dynamic translation parsing for suffixes like Mod and Perc
            let localizedStatName = '';
            if (stat.endsWith('Mod')) {
                const baseStat = stat.replace('Mod', '');
                localizedStatName = `${t(baseStat) || baseStat} ${t('mod') || 'Mod'}`;
            } else if (stat.endsWith('Perc')) {
                const baseStat = stat.replace('Perc', '');
                localizedStatName = `${t(baseStat) || baseStat} ${t('perc') || '%'}`;
            } else {
                localizedStatName = t(stat) || stat;
            }
            
            // Format delta log linearly treating missing values as zero, preserving custom file removal mechanics behind the scenes
            changeLogs.push(` - ${localizedStatName}: ${initialVal} -> ${baselineVal} (${prefix}${diff})`);
            stateDeltas[stat] = diff;
        }
    });

    // Automatically sync HP if it matches MaxHP in initial
    if (stateDeltas['maxHp']) {
        let initialHp = combatant.initialStats['hp'] !== undefined ? parseInt(combatant.initialStats['hp']) : 0;
        if (isNaN(initialHp)) initialHp = 0;

        let initialMaxHp = combatant.initialStats['maxHp'] !== undefined ? parseInt(combatant.initialStats['maxHp']) : 0;
        if (isNaN(initialMaxHp)) initialMaxHp = 0;
        
        // Failsafe for full health values - if the file considered HP to be full, auto sync saves the logic
        if (initialHp === initialMaxHp) {
            stateDeltas['hp'] = stateDeltas['maxHp'];
            const currentHpVal = initialHp + stateDeltas['hp'];
            const prefix = stateDeltas['hp'] > 0 ? '+' : '';
            changeLogs.push(` - ${t('health') || 'hp'}: ${initialHp} -> ${currentHpVal} (${prefix}${stateDeltas['hp']}) [Auto-Sync]`);
        }
    }

    if (changeLogs.length === 0) {
        showNotification(t('no_changes_detected'));
        return;
    }

    const promptBody = `${t('confirm_save_stats_alert')}<br><br>${changeLogs.join('<br>')}`;
    
    showConfirmDialog(promptBody, () => {
        // Send an async POST request to the backend server to permanently write changes to the source files
        fetch('/api/save-character-stats', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                type: combatant.type,
                baseName: combatant.baseName,
                deltas: stateDeltas
            })
        })
        .then(response => {
            if (!response.ok) {
                throw new Error('Failed to save data on the server filesystem');
            }
            return response.json();
        })
        .then(data => {
            // Apply directional adjustments to structural records stored inside live variables only if server save succeeds
            Object.keys(stateDeltas).forEach(stat => {
                const baseVal = baseChar[stat] !== undefined ? parseInt(baseChar[stat]) : 0;
                let finalVal = baseVal + stateDeltas[stat];
                
                if (coreAttributes.includes(stat)) {
                    // Force the value to stay at 1 if it hits or falls below 0
                    if (finalVal <= 0) finalVal = 1;
                    baseChar[stat] = finalVal;
                } else {
                    if (finalVal === 0) {
                        // Clean up the object property if the modified stat drops or returns to zero default state
                        delete baseChar[stat];
                    } else {
                        baseChar[stat] = finalVal;
                    }
                }
            });

            // Update current HP in memory if it was auto-synced
            if (stateDeltas['hp']) {
                combatant.currentStats.hp += stateDeltas['hp'];
            }

            // Sync successfully written server config back into our local initial memory marker
            combatant.initialStats = JSON.parse(JSON.stringify(combatant.baselineStats));
            
            const box = document.querySelector('.char-name-input');
            if (box && selectedCharacterId === combatant.id) {
                renderCharMainPanel(combatant.id);
            }
            
            // Sync the updated baseline to the server so subsequent page reloads fetch the correct state
            syncUpdateCombatant(combatant);
            
            showAlertDialog(t('save_success'));
        })
        .catch(error => {
            console.error("Error saving character stats to file via API:", error);
            showAlertDialog(t('save_error'));
        });
    });
}