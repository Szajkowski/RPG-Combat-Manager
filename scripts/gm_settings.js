// Generic helper to reload a script dynamically
async function reloadScript(scriptId, srcPath) {
    const oldScript = document.querySelector(`#${scriptId}`);
    if (oldScript) oldScript.remove();
    
    return new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.id = scriptId;
        // Adding a timestamp prevents the browser from loading a cached version of the file
        script.src = `${srcPath}?t=${new Date().getTime()}`;
        script.onload = resolve;
        script.onerror = () => reject(new Error(`Error loading ${srcPath}`));
        document.body.appendChild(script);
    });
}

// Reloads all data scripts sequentially and applies changes to all active combatants on the board
async function reloadServerData() {
    try {
        // Order is strict: abilities must be loaded first so character templates reference the new ability objects
        await reloadScript('abilities-data', 'data/abilities.js');
        await reloadScript('players-data', 'data/players.js');
        await reloadScript('mobs-data', 'data/mobs.js');
        await reloadScript('npcs-data', 'data/npcs.js');
        await reloadScript('bosses-data', 'data/bosses.js');
        
        const modifiedCombatants = [];
        
        for (let combatant of activeCombatants) {
            // We can only refresh characters that originate from a data file
            if (!combatant.baseName) continue;
            
            let freshData = null;
            if (combatant.type === 'player') freshData = players[combatant.baseName];
            else if (combatant.type === 'mob') freshData = mobs[combatant.baseName];
            else if (combatant.type === 'npc') freshData = npcs[combatant.baseName];
            else if (combatant.type === 'boss') freshData = bosses[combatant.baseName];

            if (!freshData) continue;

            // Apply equipment math to get the final stats based on fresh data
            const finalStats = applyGearBonuses(freshData);
            if (finalStats.hp === undefined) finalStats.hp = 10;
            if (finalStats.maxHp === undefined) finalStats.maxHp = 10;

            const currentHp = combatant.stats.hp;
            
            combatant.stats = finalStats;
            combatant.baselineStats = JSON.parse(JSON.stringify(finalStats));
            combatant.stats.hp = Math.min(currentHp, finalStats.maxHp);
            
            combatant.equipment = freshData.equipment ? JSON.parse(JSON.stringify(freshData.equipment)) : [];
            combatant.abilities = freshData.abilities ? JSON.parse(JSON.stringify(freshData.abilities)) : [];

            // Maintain cooldown states for abilities that already existed, initialize new ones
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

            modifiedCombatants.push(combatant);
        }
        
        // Broadcast updates dynamically using the batch update function
        if (modifiedCombatants.length > 0) {
            if (typeof syncUpdateCombatantsBatch === 'function') {
                syncUpdateCombatantsBatch(modifiedCombatants);
            }
        }
        
        if (typeof showToast === 'function') {
            showToast(t('data_scripts_reloaded'));
        }
    } catch (error) {
        console.error("Error reloading server data:", error);
        if (typeof showAlertDialog === 'function') {
            showAlertDialog(t('data_scripts_reload_error'));
        }
    }
}