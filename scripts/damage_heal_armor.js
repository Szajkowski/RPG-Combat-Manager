let targetingData = null; // Stores information about the ongoing targeted action
const tokenControllers = new Map(); // References for strict click listener cleanup

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

// Initiates targeting mode instead of dealing damage directly
function applyDamage(type, event) {
    if (!selectedCharacterId) return;

    const combatant = activeCombatants.find(c => c.id === selectedCharacterId);
    const damageInput = document.querySelector('.damage-input');

    if (!combatant || combatant.isDead) {
        if (damageInput) damageInput.value = '';
        return;
    }

    const damageStr = damageInput.value.trim();
    if (!damageStr || parseInt(damageStr) <= 0) {
        damageInput.value = '';
        return; 
    }

    const isPercMode = damageInput.closest('.complex-control').querySelector('.complex-toggle').classList.contains('perc-mode');

    // Use event coords for the arrow origin if provided, otherwise fallback to center
    const startX = event ? event.clientX : window.innerWidth / 2;
    const startY = event ? event.clientY : window.innerHeight / 2;

    startTargetingMode(combatant, 'damage', { value: damageStr, type: type, isPercMode: isPercMode }, startX, startY);
}

// Initiates targeting mode for healing (or executes group heal immediately)
function healDamage(type, event) {
    if (!selectedCharacterId && type !== 'group') return;

    const healInput = document.querySelector('.heal-input');
    
    const combatant = activeCombatants.find(c => c.id === selectedCharacterId);
    if (!combatant || combatant.isDead) {
        if (healInput) healInput.value = '';
        return;
    }

    const healValueStr = healInput.value.trim();
    if (!healValueStr || parseInt(healValueStr) <= 0) {
        if (healInput) healInput.value = '';
        return;
    }

    const isPercMode = healInput.closest('.complex-control').querySelector('.complex-toggle').classList.contains('perc-mode');
    const finalHealStr = (!healValueStr.endsWith('%') && isPercMode) ? `${healValueStr}%` : healValueStr;

    if (type === 'group') {
        const team = combatant.team;
        activeCombatants.filter(c => c.team === team).forEach(member => {
            healOneCharacter(member, type, finalHealStr);
        });
        playSoundEffect(`sound/heal_${type}.mp3`);
        healInput.value = ''; 
    } else {
        const startX = event ? event.clientX : window.innerWidth / 2;
        const startY = event ? event.clientY : window.innerHeight / 2;
        startTargetingMode(combatant, 'heal', { value: finalHealStr, type: type }, startX, startY);
    }
}

// Initiates targeting mode for adding/removing armor
function changeArmor(type, event) {
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
    
    const startX = event ? event.clientX : window.innerWidth / 2;
    const startY = event ? event.clientY : window.innerHeight / 2;

    startTargetingMode(combatant, 'armor', { value: parsedValue, type: type, isPercentage: isPercentage }, startX, startY);
}

// Universal targeting engine entry point
function startTargetingMode(attacker, actionType, payload, startX, startY) {
    targetingData = { attacker, actionType, payload, startX, startY };
    
    document.body.classList.add('targeting-mode');
    
    const overlay = document.getElementById('targeting-overlay');
    const svg = document.getElementById('targeting-svg');
    const tooltip = document.getElementById('targeting-tooltip');
    
    if (overlay) overlay.style.display = 'block';
    if (svg) svg.style.display = 'block';
    if (tooltip) {
        tooltip.style.display = 'flex';
        // Clear any previous text residue from the last target
        const tooltipText = tooltip.querySelector('.chance-text');
        if (tooltipText) tooltipText.textContent = '';
    }
    
    document.addEventListener('mousemove', handleTargetingMove);
    document.addEventListener('contextmenu', cancelTargetingMode);
    document.addEventListener('keydown', handleTargetingKeys);
    
    // Attach listeners to all alive tokens
    document.querySelectorAll('.character-token:not(.dead)').forEach(token => {
        const id = token.dataset.id;
        
        const enter = (e) => handleTargetingHoverEnter(e, id);
        const leave = (e) => handleTargetingHoverLeave(e);
        const click = (e) => {
            e.preventDefault();
            e.stopPropagation(); // Block default token selection
            executeTargetedAction(id);
        };
        
        token.addEventListener('mouseenter', enter);
        token.addEventListener('mouseleave', leave);
        token.addEventListener('click', click, { capture: true });
        
        tokenControllers.set(token, { enter, leave, click });
    });

    // Reset initial path and tooltip off-screen until mouse moves
    const path = document.getElementById('targeting-path');
    if (path) path.setAttribute('d', '');
    if (tooltip) tooltip.style.left = '-999px';
}

function cancelTargetingMode(e) {
    if (e) {
        e.preventDefault(); 
        e.stopPropagation();
    }
    
    document.body.classList.remove('targeting-mode');
    
    const overlay = document.getElementById('targeting-overlay');
    const svg = document.getElementById('targeting-svg');
    const tooltip = document.getElementById('targeting-tooltip');
    
    if (overlay) overlay.style.display = 'none';
    if (svg) svg.style.display = 'none';
    if (tooltip) tooltip.style.display = 'none';
    
    document.removeEventListener('mousemove', handleTargetingMove);
    document.removeEventListener('contextmenu', cancelTargetingMode);
    document.removeEventListener('keydown', handleTargetingKeys);
    
    // Safely clear event listeners from tokens
    tokenControllers.forEach((listeners, token) => {
        token.removeEventListener('mouseenter', listeners.enter);
        token.removeEventListener('mouseleave', listeners.leave);
        token.removeEventListener('click', listeners.click, { capture: true });
    });
    tokenControllers.clear();

    targetingData = null;
}

function handleTargetingKeys(e) {
    if (e.key === 'Escape') cancelTargetingMode(e);
}

function handleTargetingMove(e) {
    if (!targetingData) return;
    
    const { startX, startY } = targetingData;
    const mouseX = e.clientX;
    const mouseY = e.clientY;
    
    // Calculate arrow path (curved upwards)
    const path = document.getElementById('targeting-path');
    if (path) {
        const cpX = startX + (mouseX - startX) / 2;
        const cpY = Math.min(startY, mouseY) - 60; // Slight upward curve
        path.setAttribute('d', `M ${startX} ${startY} Q ${cpX} ${cpY} ${mouseX} ${mouseY}`);
    }

    // Position tooltip near cursor
    const tooltip = document.getElementById('targeting-tooltip');
    if (tooltip) {
        tooltip.style.left = (mouseX + 15) + 'px';
        tooltip.style.top = (mouseY + 15) + 'px';
    }
}

function handleTargetingHoverEnter(e, targetId) {
    if (!targetingData) return;
    const target = activeCombatants.find(c => c.id === targetId);
    if (!target) return;
    
    const tooltipText = document.querySelector('#targeting-tooltip .chance-text');
    if (!tooltipText) return;

    if (targetingData.actionType === 'damage' || targetingData.actionType === 'skill') {
        const chance = calculateHitChance(targetingData.attacker, target);
        tooltipText.textContent = `${t('hit_chance')} ${chance}%`;
    } else {
        // No chance needed for non-offensive actions
        tooltipText.textContent = target.uniqueName;
    }
}

function handleTargetingHoverLeave(e) {
    const tooltipText = document.querySelector('#targeting-tooltip .chance-text');
    if (tooltipText) {
        tooltipText.textContent = ''; // Clears text, leaving only cancel hint
    }
}

// Full matrix calculation of actual hit probability
function calculateHitChance(attacker, defender) {
    // Hitting oneself is a guaranteed hit
    if (attacker.id === defender.id) return 100;
    // Stunned target guarantees hit
    if (defender.isStunned) return 100;

    const accStat = parseInt(attacker.stats.accuracy) || 0;
    const accMod = parseInt(attacker.stats.accuracyMod) || 0;
    const agiStat = parseInt(defender.stats.agility) || 0;
    const agiMod = parseInt(defender.stats.agilityMod) || 0;

    // No accuracy guarantees permanent miss
    if (accStat <= 0) return 0;
    // No agility prevents dodge, guaranteeing 100%
    if (agiStat <= 0) return 100;

    let wins = 0;
    let total = accStat * agiStat;

    for (let a = 1; a <= accStat; a++) {
        let aRes = Math.max(1, a + accMod);
        for (let d = 1; d <= agiStat; d++) {
            let dRes = Math.max(1, d + agiMod);
            // Ties are resolved in attacker's favor
            if (aRes >= dRes) wins++;
        }
    }
    return Math.round((wins / total) * 100);
}

// Generic function for opposed stat rolls. Readily available for future skills.
function performOpposedRoll(attacker, defender, attStatName, defStatName) {
    const attBase = parseInt(attacker.stats[attStatName]) || 0;
    const defBase = parseInt(defender.stats[defStatName]) || 0;

    let attRes = 0, defRes = 0;

    if (attBase > 0) {
        const attMod = parseInt(attacker.stats[`${attStatName}Mod`]) || 0;
        attRes = Math.max(1, Math.floor(Math.random() * attBase) + 1 + attMod);
    }
    if (defBase > 0) {
        const defMod = parseInt(defender.stats[`${defStatName}Mod`]) || 0;
        defRes = Math.max(1, Math.floor(Math.random() * defBase) + 1 + defMod);
    }

    // Tie goes to the attacker
    const isSuccess = attRes >= defRes;

    return {
        isSuccess: isSuccess,
        attRoll: { stat: attStatName, result: attBase > 0 ? attRes : "X", color: isSuccess ? '#50fa7b' : '#ff5555' },
        defRoll: { stat: defStatName, result: defBase > 0 ? defRes : "X", color: isSuccess ? '#ff5555' : '#50fa7b' }
    };
}

// Generic execution router for any targeted action
function executeTargetedAction(targetId) {
    const target = activeCombatants.find(c => c.id === targetId);
    if (!target || target.isDead) return cancelTargetingMode();

    const { attacker, actionType, payload } = targetingData;

    if (actionType === 'damage') {
        resolveDamageAction(attacker, target, payload);
    } else if (actionType === 'heal') {
        healOneCharacter(target, payload.type, payload.value);
        playSoundEffect(`sound/heal_${payload.type}.mp3`);
        const healInput = document.querySelector('.heal-input');
        if (healInput) healInput.value = '';
    } else if (actionType === 'armor') {
        applyArmorChange(target, payload.type, payload.value, payload.isPercentage);
        const armorInput = document.querySelector('.armor-input');
        if (armorInput) armorInput.value = '';
    } else if (actionType === 'skill') {
        // Placeholder for future skill resolutions
    }

    cancelTargetingMode();
}

// Specific logic block evaluating attack rolls and applying damage
function resolveDamageAction(attacker, target, payload) {
    const { value: damageStr, type, isPercMode } = payload;
    let isHit = false;

    // The Three Pillars structure for narrative flow
    let attackerSingleRolls = [];
    let opposedRolls = [];
    let defenderSingleRolls = [];

    const hitChance = calculateHitChance(attacker, target);

    // Completely bypasses rolls if the outcome is statistically guaranteed
    if (hitChance === 100) {
        isHit = true;
    } else if (hitChance === 0) {
        isHit = false;
    } else {
        const opposed = performOpposedRoll(attacker, target, 'accuracy', 'agility');
        isHit = opposed.isSuccess;
        opposedRolls.push({ attRoll: opposed.attRoll, defRoll: opposed.defRoll });
    }

    if (isHit) {
        // ==========================================
        // ORIGINAL DAMAGE COMPUTATION & MITIGATION
        // ==========================================
        let damage = 0;

        if (damageStr.endsWith('%') || isPercMode) { 
            const percent = parseInt(damageStr);
            damage = Math.ceil((target.stats.maxHp * percent) / 100); 
        } else {
            damage = parseInt(damageStr) || 0;
        }

        let damageAfterArmor = damage;

        if (type === 'phys' || type === 'mag') {
            const armorFlat = parseInt(type === 'phys' ? target.stats.physArmor : target.stats.magArmor) || 0;
            const armorPercent = parseInt(type === 'phys' ? target.stats.physArmorMod : target.stats.magArmorMod) || 0;

            damageAfterArmor = Math.ceil(damageAfterArmor - armorFlat);
            damageAfterArmor *= (100 - armorPercent) / 100;
        }

        damageAfterArmor = Math.max(Math.round(damageAfterArmor), 0);

        playSoundEffect(damageAfterArmor > 0 ? `sound/${type}_hit.mp3` : 'sound/no_dmg_hit.mp3');

        if (damage > 0) {
            // Check Death's Door before subtracting HP
            if (target.hasDeathsDoor && target.stats.hp <= 0 && damageAfterArmor > 0) {
                const ddResult = rollDeathsDoor(target);
                // Add Death's Door roll directly to the defender's standalone pillar
                defenderSingleRolls.push(ddResult.roll);

                if (!ddResult.survived) {
                    target.stats.hp = 0; 
                    target.isDead = true;
                    target.isStunned = false; // Dead characters lose stun
                }
                syncUpdateCombatant(target); 
            } else {
                target.stats.hp = Math.round(target.stats.hp - damageAfterArmor);

                if (!target.hasDeathsDoor && target.stats.hp <= 0 && damageAfterArmor > 0) {
                    target.stats.hp = 0; 
                    target.isDead = true;
                    target.isStunned = false; // Dead characters lose stun
                }
                syncUpdateCombatant(target); 
            }
        }
    } else {
        playSoundEffect('sound/dodge.mp3'); 
    }

    // Broadcast the full action dynamically mapping the Three Pillars layout
    // Only broadcast if there was at least one roll (ignores pure math outcomes without any dice involved)
    if (attackerSingleRolls.length > 0 || opposedRolls.length > 0 || defenderSingleRolls.length > 0) {
        const rollEvent = {
            id: 'roll-' + Date.now() + '-' + Math.random().toString(36).substr(2, 5),
            isTargeted: true, 
            attackerName: attacker.uniqueName,
            attackerTeam: attacker.team,
            defenderName: target.uniqueName,
            defenderTeam: target.team,
            attackerSingleRolls: attackerSingleRolls,
            opposedRolls: opposedRolls,
            defenderSingleRolls: defenderSingleRolls
        };
        syncAddRollEvent(rollEvent);
    }

    const damageInput = document.querySelector('.damage-input');
    if (damageInput) damageInput.value = '';
}

// Rolls Death's Door chance for the combatant and returns the result object. DOES NOT broadcast to server independently!
function rollDeathsDoor(combatant) {
    const resilience = parseInt(combatant.stats.resilience) || 0;
    const baseSurvivalChance = 15; // Base survival chance
    // cannot have more than 75% death resistance
    const survivalThreshold = Math.max(100 - (baseSurvivalChance + resilience), 25); 

    // Roll 1-100
    const rollResult = Math.floor(Math.random() * 100) + 1;
    const survived = rollResult >= survivalThreshold;

    return {
        survived: survived,
        roll: {
            stat: "deaths_door",
            result: rollResult,
            color: survived ? '#50fa7b' : '#ff5555'
        }
    };
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

// Performs mathematical calculations and updates network state for targeted armor modifications
function applyArmorChange(combatant, type, parsedValue, isPercentage) {
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

        // Apply an upper boundary cap of 100% to percentage armor mitigation values
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
    syncUpdateCombatant(combatant); // Single network update broadcasts to all clients
}