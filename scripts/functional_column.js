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

    const combatant = activeCombatants.find(c => c.id === id);
    if (!combatant) return;

    // 1. Remove effects tied to this character (Server sync)
    // Directly use the globally synced activeEffects array to prevent Promise/undefined errors!
    if (typeof activeEffects !== 'undefined' && Array.isArray(activeEffects)) {
        const filteredEffects = activeEffects.filter(effect => effect.target !== combatant.uniqueName);
        
        // Only trigger network update if something was actually deleted
        if (filteredEffects.length !== activeEffects.length && typeof updateServerEffects === 'function') {
            updateServerEffects(filteredEffects);
        }
    }

    // 2. Request removal from server. Server will broadcast removal and clients will automatically delete token and clear panel.
    if (typeof syncRemoveCombatant === 'function') {
        syncRemoveCombatant(id);
    }
}

// Toggles stun state via the functional column button
function toggleStun() {
    if (!selectedCharacterId) return;
    
    const combatant = activeCombatants.find(c => c.id === selectedCharacterId);
    if (!combatant || combatant.isDead) return;
    
    combatant.isStunned = !combatant.isStunned;
    
    // Broadcast change to server, attaching the stun sound conditionally
    syncUpdateCombatant(combatant, combatant.isStunned ? 'stun' : null);
}

// Resurrects the currently selected character to full HP and clears their dead state
function resurrectCharacter() {
    if (!selectedCharacterId) return;

    const combatant = activeCombatants.find(c => c.id === selectedCharacterId);
    if (!combatant || !combatant.isDead) return;

    combatant.isDead = false;
    combatant.stats.hp = combatant.stats.maxHp || 10;
    
    // Send update to server to globally broadcast the resurrection alongside the audio effect
    if (typeof syncUpdateCombatant === 'function') {
        syncUpdateCombatant(combatant, 'revive');
    }
}

// Reloads the corresponding data file and recalculates the currently selected character's stats
async function reloadCharacterData() {
    if (!selectedCharacterId) return;
    
    const combatant = activeCombatants.find(c => c.id === selectedCharacterId);
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

        // Apply equipment math to get the final stats
        const finalStats = applyGearBonuses(freshData);

        // Keep default HP fallback
        if (finalStats.hp === undefined) finalStats.hp = 10;
        if (finalStats.maxHp === undefined) finalStats.maxHp = 10;

        // Preserve current health to prevent unwanted full heals, but clamp to new max HP
        const currentHp = combatant.stats.hp;
        const wasDead = combatant.isDead;
        const turnsTaken = combatant.turnsTakenThisRound || 0; // Migrated state variable
        
        // Update memory core stats
        combatant.stats = finalStats;
        combatant.baselineStats = JSON.parse(JSON.stringify(finalStats)); // Reset baseline stats upon character reloads
        combatant.stats.hp = Math.min(currentHp, finalStats.maxHp);
        combatant.isDead = wasDead;
        combatant.turnsTakenThisRound = turnsTaken;
        
        // Deep copy fresh equipment and abilities
        combatant.equipment = freshData.equipment ? JSON.parse(JSON.stringify(freshData.equipment)) : [];
        combatant.abilities = freshData.abilities ? JSON.parse(JSON.stringify(freshData.abilities)) : [];

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
        
    } catch (error) {
        console.error("Error while reloading character data:", error);
    }
}

// Compares current modified stats to initial baseline stats and applies delta modifications to backend files via API request
function saveCharacterStats(id) {
    const combatant = activeCombatants.find(c => c.id === id);
    if (!combatant || !combatant.baseName) return;

    let targetDict = null;
    if (combatant.type === 'player') targetDict = players;
    else if (combatant.type === 'mob') targetDict = mobs;
    else if (combatant.type === 'npc') targetDict = npcs;
    else if (combatant.type === 'boss') targetDict = bosses;

    if (!targetDict || !targetDict[combatant.baseName]) return;

    const baseChar = targetDict[combatant.baseName];
    
    // Expanded array to track core stats, modifiers, and percentage values
    const statsToTrack = [
        'vitality', 'intuition', 'strength', 'agility', 'attunement', 
        'perception', 'accuracy', 'reflex', 'resilience', 'maxHp', 
        'damage', 'physArmor', 'magArmor',
        'vitalityMod', 'intuitionMod', 'strengthMod', 'agilityMod', 'attunementMod',
        'perceptionMod', 'accuracyMod', 'reflexMod', 'resilienceMod',
        'physArmorPerc', 'magArmorPerc'
    ];
    
    // Core primary attributes list that must never evaluate to 0 or be removed
    const coreAttributes = ['vitality', 'intuition', 'strength', 'agility', 'attunement', 'perception', 'accuracy', 'reflex', 'resilience'];
    
    let changeLogs = [];
    let stateDeltas = {};

    statsToTrack.forEach(stat => {
        // Fallback to 0 if the stat is missing or undefined in current state, with explicit NaN validation
        let currentVal = combatant.stats[stat] !== undefined ? parseInt(combatant.stats[stat]) : 0;
        if (isNaN(currentVal)) currentVal = 0;

        // Fallback to 0 if the stat was missing or undefined in baseline state, with explicit NaN validation
        let baselineVal = combatant.baselineStats[stat] !== undefined ? parseInt(combatant.baselineStats[stat]) : 0;
        if (isNaN(baselineVal)) baselineVal = 0;
        
        // Enforce a minimum threshold value of 1 for core main stats to prevent them from dropping to 0
        if (coreAttributes.includes(stat)) {
            if (currentVal <= 0) currentVal = 1;
            if (baselineVal <= 0) baselineVal = 1;
        }
        
        if (currentVal !== baselineVal) {
            const diff = currentVal - baselineVal;
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
            changeLogs.push(` - ${localizedStatName}: ${baselineVal} -> ${currentVal} (${prefix}${diff})`);
            stateDeltas[stat] = diff;
        }
    });

    // Automatically sync HP if it matches MaxHP in baseline
    if (stateDeltas['maxHp']) {
        let baselineHp = combatant.baselineStats['hp'] !== undefined ? parseInt(combatant.baselineStats['hp']) : 0;
        if (isNaN(baselineHp)) baselineHp = 0;

        let baselineMaxHp = combatant.baselineStats['maxHp'] !== undefined ? parseInt(combatant.baselineStats['maxHp']) : 0;
        if (isNaN(baselineMaxHp)) baselineMaxHp = 0;
        
        if (baselineHp === baselineMaxHp) {
            stateDeltas['hp'] = stateDeltas['maxHp'];
            const currentHpVal = baselineHp + stateDeltas['hp'];
            const prefix = stateDeltas['hp'] > 0 ? '+' : '';
            changeLogs.push(` - ${t('health') || 'hp'}: ${baselineHp} -> ${currentHpVal} (${prefix}${stateDeltas['hp']}) [Auto-Sync]`);
        }
    }

    if (changeLogs.length === 0) {
        showAlertDialog(t('no_changes_detected'));
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
                combatant.stats.hp += stateDeltas['hp'];
            }

            // Set the new shifted configuration as our baseline configuration parameters
            combatant.baselineStats = JSON.parse(JSON.stringify(combatant.stats));
            box = document.querySelector('.char-name-input');
            if (box && selectedCharacterId === combatant.id) {
                renderCharMainPanel(combatant.id);
            }
            
            showAlertDialog(t('save_success'));
        })
        .catch(error => {
            console.error("Error saving character stats to file via API:", error);
            showAlertDialog(t('save_error'));
        });
    });
}