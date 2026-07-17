// Helper function to return dynamic HP class based on percentage
function getHpClass(hpPercentage, isDead) {
    if (isDead) return 'hp-fill-dead'; 
    if (hpPercentage <= 25) return 'hp-fill-low'; 
    if (hpPercentage <= 50) return 'hp-fill-medium'; 
    return 'hp-fill-high'; 
}

// Updates both the Character Sheet UI and the Token UI visually
function updateHpBarUI(combatant) {
    const hpPercentage = (combatant.stats.hp / combatant.stats.maxHp) * 100;
    const hpClass = getHpClass(hpPercentage, combatant.isDead);

    // 1. Update Token on the Arena
    const token = document.querySelector(`.character-token[data-id="${combatant.id}"]`);
    if (token) {
        const tokenFill = token.querySelector('.token-hp-fill');
        if (tokenFill) {
            tokenFill.style.width = `${Math.max(0, Math.min(100, hpPercentage))}%`;
            // Remove previous color classes and apply new
            tokenFill.className = `token-hp-fill ${hpClass}`;
        }

        if (combatant.isDead) token.classList.add('dead');
        else token.classList.remove('dead');
    }

    // 2. Update Right Panel if this character is currently selected
    if (selectedCharacterId === combatant.id) {
        const sheetFill = document.querySelector('.char-hp-visual-fill');
        const sheetVisual = document.querySelector('.char-hp-visual');
        
        if (sheetVisual) {
            if (combatant.isDead) sheetVisual.classList.add('dead');
            else sheetVisual.classList.remove('dead');
        }

        if (sheetFill) {
            sheetFill.style.width = `${Math.max(0, Math.min(100, hpPercentage))}%`;
            sheetFill.className = `char-hp-visual-fill ${hpClass}`;
        }

        const currentHpInput = document.querySelector('.current-hp-input');
        if (currentHpInput) currentHpInput.value = combatant.stats.hp;
    }

    // Refresh abilities panel (grey out the button if the character is dead)
    updateActivePanel();
}

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
    const damageStr = damageInput.value.trim();
    if (!damageStr) return;

    // Ignore damage requests if the character is already dead, but clear the input field first
    if (!combatant || combatant.isDead) {
        if (damageInput) damageInput.value = '';
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

    if (damage <= 0) return;

    let damageAfterArmor = damage;

    if (type === 'phys' || type === 'mag') {
        const armorFlat = parseInt(type === 'phys' ? combatant.stats.physArmor : combatant.stats.magArmor) || 0;
        const armorPercent = parseInt(type === 'phys' ? combatant.stats.physArmorMod : combatant.stats.magArmorMod) || 0;

        damageAfterArmor *= (100 - armorPercent) / 100;
        damageAfterArmor = Math.ceil(damageAfterArmor - armorFlat);
    }

    damageAfterArmor = Math.max(damageAfterArmor, 0);

    playSoundEffect(damageAfterArmor > 0 ? `sound/${type}_hit.mp3` : 'sound/no_dmg_hit.mp3');

    // Safe boolean check for DD mechanic mapping directly from JS states
    const hasDD = combatant.hasDeathsDoor === true || combatant.hasDeathsDoor === "true";

    // Check Death's Door before subtracting HP
    if (hasDD && combatant.stats.hp <= 0 && damageAfterArmor > 0) {
        const survived = handleDeathsDoor(combatant);
        if (!survived) {
            combatant.stats.hp = 0; // Set HP to 0 after death
            damageInput.value = ''; // Clear field after dealing damage
            
            combatant.isDead = true;
            // running updateHpBar for players 2 times (here and in sendPlayerStats) seems a bit silly, but I can't remove it from this function. Because it must also run for non-player characters
            updateHpBarUI(combatant); 

            // if (combatant.type === "player" && typeof sendPlayerStats === 'function') sendPlayerStats(combatant);
            return; // Interrupt function, character died
        }
    }

    combatant.stats.hp -= damageAfterArmor;

    // if the character doesn't have Death's Door, they die immediately
    if (!hasDD && combatant.stats.hp <= 0 && damageAfterArmor > 0) {
        combatant.stats.hp = 0; // Set HP to 0 after death
        damageInput.value = ''; // Clear field after dealing damage
        
        combatant.isDead = true;
        updateHpBarUI(combatant); 
        
        // if (combatant.type === "player" && typeof sendPlayerStats === 'function') sendPlayerStats(combatant);
        return;
    }

    damageInput.value = ''; // Clear field after dealing damage
    updateHpBarUI(combatant); // Update health bar

    // if (combatant.type === "player" && typeof sendPlayerStats === 'function') sendPlayerStats(combatant);
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

    // Display roll result
    if (selectedCharacterId === combatant.id) {
        const lastRollDisplay = document.getElementById('last-roll-display');
        const lastRollLabel = document.querySelector('.dice-result-label');
        
        if (lastRollDisplay && lastRollLabel) {
            lastRollLabel.textContent = t("deaths_door");
            lastRollDisplay.textContent = rollResult;
            lastRollDisplay.style.color = rollResult >= survivalThreshold ? '#50fa7b' : '#ff5555';
        }
    }

    if (rollResult < survivalThreshold) {
        // Character dies, health bar turns black
        return false; // Character died
    }

    return true; // Character survived
}

// Routes healing to single, threshold, or group logic
function healDamage(type) {
    if (!selectedCharacterId && type !== 'group') return;

    const healInput = document.querySelector('.heal-input');
    const healValueStr = healInput.value.trim();
    if (!healValueStr) return;

    // Check if single target is already dead during combat, clear input and prevent action
    const selectedCombatant = activeCombatants.find(c => c.id === selectedCharacterId);
    if (!selectedCombatant || selectedCombatant.isDead) {
        healInput.value = '';
        return;
    }

    const isPercMode = healInput.closest('.complex-control').querySelector('.complex-toggle').classList.contains('perc-mode');
    const finalHealStr = (!healValueStr.endsWith('%') && isPercMode) ? `${healValueStr}%` : healValueStr;

    if (type === 'group') {
        // Check if the character is a hero (we rely on the JS object team parameter)
        const team = selectedCombatant.team;
        activeCombatants.filter(c => c.team === team).forEach(member => {
            healOneCharacter(member, type, finalHealStr);
        });
    } else {
        healOneCharacter(selectedCombatant, type, finalHealStr);
    }

    playSoundEffect(`sound/heal_${type}.mp3`);
    healInput.value = ''; // Clear field after healing
}

// Core function restoring HP to a single memory object
function healOneCharacter(combatant, type, healValueStr) {
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

    // rising from the dead is only possible after combat
    if (combatant.isDead && typeof currentCombatRound !== 'undefined' && currentCombatRound !== 0) return; 

    combatant.stats.hp = currentHp;
    combatant.isDead = false;

    updateHpBarUI(combatant); // Update health bar

    // if (combatant.type === "player" && typeof sendPlayerStats === 'function') sendPlayerStats(combatant);
}

// Applies flat or percentage modifiers to Physical or Magical armor in real-time
function changeArmor(type) {
    if (!selectedCharacterId) return;

    const armorInput = document.querySelector('.armor-input');
    const valueStr = armorInput.value.trim();
    if (!valueStr) return;

    const combatant = activeCombatants.find(c => c.id === selectedCharacterId);
    if (!combatant || combatant.isDead) {
        armorInput.value = '';
        return;
    }

    const isPercMode = armorInput.closest('.complex-control').querySelector('.complex-toggle').classList.contains('perc-mode');
    const isPercentage = valueStr.endsWith('%') || isPercMode;
    
    const parsedValue = parseInt(valueStr);
    if (isNaN(parsedValue)) return;
    
    const isAdding = parsedValue > 0;
    const absValue = Math.abs(parsedValue);

    if (isPercentage) { 
        // Handle percentage value
        let currentPercent = parseInt(type === 'phys' ? combatant.stats.physArmorMod : combatant.stats.magArmorMod) || 0;
        
        if (isAdding) {
            currentPercent = currentPercent + Math.floor((100 - currentPercent) * (absValue / 100));
        } else {
            currentPercent = currentPercent - absValue;
        }

        if (type === 'phys') combatant.stats.physArmorMod = currentPercent ? `${currentPercent}%` : '';
        else combatant.stats.magArmorMod = currentPercent ? `${currentPercent}%` : '';

    } else { 
        // Handle flat value
        let currentFlat = parseInt(type === 'phys' ? combatant.stats.physArmor : combatant.stats.magArmor) || 0;
        
        currentFlat = isAdding ? currentFlat + absValue : Math.max(currentFlat - absValue, 0);

        if (type === 'phys') combatant.stats.physArmor = currentFlat;
        else combatant.stats.magArmor = currentFlat;
    }

    playSoundEffect(isAdding ? `sound/${type}_armor_up.mp3` : `sound/${type}_armor_down.mp3`, 0.5);

    armorInput.value = ''; // Clear field after armor change

    if (selectedCharacterId === combatant.id) {
        if (type === 'phys') {
            document.querySelector('.base-phys-armor').value = combatant.stats.physArmor;
            document.querySelector('.base-phys-armor-mod').value = combatant.stats.physArmorMod;
        } else {
            document.querySelector('.base-mag-armor').value = combatant.stats.magArmor;
            document.querySelector('.base-mag-armor-mod').value = combatant.stats.magArmorMod;
        }
    }

    // if (combatant.type === "player" && typeof sendPlayerStats === 'function') sendPlayerStats(combatant);
}