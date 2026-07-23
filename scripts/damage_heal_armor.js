// Toggles the specific input group between Flat and Percentage mode visually
function toggleMode(btn) {
    const isPerc = btn.classList.toggle('perc-mode');
    
    if (isPerc) {
        btn.dataset.i18n = "value_perc";
        btn.textContent = t('value_perc');
    } else {
        btn.dataset.i18n = "value_flat";
        btn.textContent = t('value_flat');
    }
}

// Core function applying damage to the currently selected character
function applyDamage(type) {
    if (!selectedCharacterId) return;

    const combatant = activeCombatants.find(c => c.id === selectedCharacterId);
    const damageInput = document.querySelector('.damage-input');

    // Ignore damage requests if the character is already dead, but clear the input field first
    if (!combatant || combatant.isDead) {
        if (damageInput) damageInput.value = '';
        return;
    }

    const damageStr = damageInput.value.trim();
    if (!damageStr) return;

    // Reject negative or zero damage directly to prevent healing via damage
    if (parseInt(damageStr) <= 0) {
        damageInput.value = '';
        return;
    }

    const isPercMode = damageInput.closest('.complex-control').querySelector('.complex-toggle').classList.contains('perc-mode');
    let damage = 0;

    if (damageStr.endsWith('%') || isPercMode) { 
        // calculate HP damage value based on target's max HP
        const percent = parseInt(damageStr);
        // round up percentage HP
        damage = Math.ceil((combatant.stats.maxHp * percent) / 100); 
    } else {
        damage = parseInt(damageStr) || 0;
    }

    let damageAfterArmor = damage;

    if (type === 'phys' || type === 'mag') {
        const armorFlat = parseInt(type === 'phys' ? combatant.stats.physArmor : combatant.stats.magArmor) || 0;
        const armorPercent = parseInt(type === 'phys' ? combatant.stats.physArmorMod : combatant.stats.magArmorMod) || 0;

        damageAfterArmor = Math.ceil(damageAfterArmor - armorFlat); // substracting flat value first, then calculating percent after. Otherwise flat armor would be way too op
        damageAfterArmor *= (100 - armorPercent) / 100;
    }

    damageAfterArmor = Math.max(damageAfterArmor, 0);

    playSoundEffect(damageAfterArmor > 0 ? `sound/${type}_hit.mp3` : 'sound/no_dmg_hit.mp3');

    if (damage <= 0) return;

    // Check Death's Door before subtracting HP
    if (combatant.hasDeathsDoor && combatant.stats.hp <= 0 && damageAfterArmor > 0) {
        const survived = handleDeathsDoor(combatant);
        if (!survived) {
            combatant.stats.hp = 0; // Set HP to 0 after death
            damageInput.value = ''; // Clear field after dealing damage
            
            combatant.isDead = true;
            syncUpdateCombatant(combatant); // Single network update broadcasts to all clients
            return; // Interrupt function, character died
        }
    }

    combatant.stats.hp -= damageAfterArmor;

    // if the character doesn't have Death's Door, they die immediately
    if (!combatant.hasDeathsDoor && combatant.stats.hp <= 0 && damageAfterArmor > 0) {
        combatant.stats.hp = 0; // Set HP to 0 after death
        damageInput.value = ''; // Clear field after dealing damage
        
        combatant.isDead = true;
        syncUpdateCombatant(combatant); // Single network update broadcasts to all clients
        return;
    }

    damageInput.value = ''; // Clear field after dealing damage
    syncUpdateCombatant(combatant); // Single network update broadcasts to all clients
}

// Rolls Death's Door chance for the combatant
function handleDeathsDoor(combatant) {
    const resilience = parseInt(combatant.stats.resilience) || 0;
    const baseSurvivalChance = 15; // Base survival chance
    // cannot have more than 75% death resistance
    const survivalThreshold = Math.max(100 - (baseSurvivalChance + resilience), 25); 

    playSoundEffect('sound/diceroll.mp3');

    // Roll 1-100
    const rollResult = Math.floor(Math.random() * 100) + 1;

    // Save roll result directly to the combatant memory, which will be synced globally!
    combatant.lastRoll = {
        stat: "deaths_door",
        result: rollResult,
        color: rollResult >= survivalThreshold ? '#50fa7b' : '#ff5555'
    };

    if (rollResult < survivalThreshold) {
        return false; // Character died
    }

    return true; // Character survived
}

// Routes healing to single, threshold, or group logic
function healDamage(type) {
    if (!selectedCharacterId && type !== 'group') return;

    const healInput = document.querySelector('.heal-input');
    
    // Check if caster is already dead during combat, clear input and prevent action
    const combatant = activeCombatants.find(c => c.id === selectedCharacterId);
    if (!combatant || combatant.isDead) {
        if (healInput) healInput.value = '';
        return;
    }

    const healValueStr = healInput.value.trim();
    if (!healValueStr) return;

    // Reject negative or zero heals directly to prevent dealing damage via healing
    if (parseInt(healValueStr) <= 0) {
        healInput.value = '';
        return;
    }

    const isPercMode = healInput.closest('.complex-control').querySelector('.complex-toggle').classList.contains('perc-mode');
    const finalHealStr = (!healValueStr.endsWith('%') && isPercMode) ? `${healValueStr}%` : healValueStr;

    if (type === 'group') {
        const referenceCombatant = activeCombatants.find(c => c.id === selectedCharacterId);
        if (!referenceCombatant) return;

        // Check if the character is a hero (we rely on the JS object team parameter)
        const team = referenceCombatant.team;
        activeCombatants.filter(c => c.team === team).forEach(member => {
            // Internal safety check prevents dead members from healing during combat
            healOneCharacter(member, type, finalHealStr);
        });
    } else {
        const combatant = activeCombatants.find(c => c.id === selectedCharacterId);
        if (combatant) healOneCharacter(combatant, type, finalHealStr);
    }

    playSoundEffect(`sound/heal_${type}.mp3`);
    healInput.value = ''; // Clear field after healing
}

// Core function restoring HP to a single memory object
function healOneCharacter(combatant, type, healValueStr) {
    // Absolute prohibition of healing dead characters until a specific resurrect mechanic is added
    if (combatant.isDead) return;

    let healAmount = 0;
    
    if (healValueStr.endsWith('%')) {
        // calculate HP heal value based on target's max HP
        const percent = parseInt(healValueStr);
        healAmount = Math.ceil((combatant.stats.maxHp * percent) / 100);
    } else {
        healAmount = parseInt(healValueStr) || 0;
    }

    let currentHp = combatant.stats.hp;

    if (type === 'threshold') {
        if (healValueStr.endsWith('%')) { 
            // healing up to a specific percentage of HP
            const thresholdHp = Math.floor((combatant.stats.maxHp * parseInt(healValueStr)) / 100);
            if (currentHp < thresholdHp) {
                currentHp = thresholdHp;
            } else {
                return; // Does not heal if HP is already higher or equal
            }
        } else {
            // healing up to a specific HP value
            const thresholdHp = parseInt(healValueStr);
            if (currentHp < thresholdHp) {
                currentHp = thresholdHp;
            } else {
                return; // Does not heal if HP is already higher or equal
            }
        }
    } else {
        currentHp += healAmount;
    }

    // Do not exceed maximum HP
    if (currentHp > combatant.stats.maxHp) currentHp = combatant.stats.maxHp;

    combatant.stats.hp = currentHp;
    syncUpdateCombatant(combatant); // Single network update broadcasts to all clients
}

// Applies flat or percentage modifiers to Physical or Magical armor in real-time
function changeArmor(type) {
    if (!selectedCharacterId) return;

    const combatant = activeCombatants.find(c => c.id === selectedCharacterId);
    const armorInput = document.querySelector('.armor-input');

    if (!combatant || combatant.isDead) {
        if (armorInput) armorInput.value = '';
        return;
    }

    const valueStr = armorInput.value.trim();
    if (!valueStr) return;

    const isPercMode = armorInput.closest('.complex-control').querySelector('.complex-toggle').classList.contains('perc-mode');
    const isPercentage = valueStr.endsWith('%') || isPercMode;
    
    const parsedValue = parseInt(valueStr);
    if (isNaN(parsedValue)) return;
    
    const isAdding = parsedValue > 0;

    // Apply changes linearly for flat, and exponentially/multiplicatively for percentage states
    if (isPercentage) { 
        // Handle percentage value using the exact damage multiplier logic from applyGearBonuses
        let currentPercent = parseInt(type === 'phys' ? combatant.stats.physArmorMod : combatant.stats.magArmorMod) || 0;
        
        // Convert the current UI percentage string back into a structural damage multiplier
        let damageMult = 1 - (currentPercent / 100);

        // Apply dynamic shift matching the compound logic from calculateAdditionalStatsBonuses
        const factor = parsedValue > 0 ? (1 - parsedValue / 100) : (1 + Math.abs(parsedValue) / 100);
        damageMult *= factor;

        // Translate the newly compiled damage multiplier back into an aggregate final armor percentage
        let finalPercent = Math.round((1 - damageMult) * 100);

        // Apply an upper boundary boundary cap of 100% to percentage armor mitigation values
        if (finalPercent > 100) finalPercent = 100;

        if (type === 'phys') combatant.stats.physArmorMod = finalPercent ? `${finalPercent}%` : '';
        else combatant.stats.magArmorMod = finalPercent ? `${finalPercent}%` : '';

    } else {
        // Handle flat value (remains fully linear and unconstrained)
        let currentFlat = parseInt(type === 'phys' ? combatant.stats.physArmor : combatant.stats.magArmor) || 0;
        
        currentFlat += parsedValue;

        if (type === 'phys') combatant.stats.physArmor = currentFlat;
        else combatant.stats.magArmor = currentFlat;
    }

    playSoundEffect(isAdding ? `sound/${type}_armor_up.mp3` : `sound/${type}_armor_down.mp3`, 0.5);

    armorInput.value = ''; // Clear field after armor change
    syncUpdateCombatant(combatant); // Single network update broadcasts to all clients
}