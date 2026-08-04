// --- MATH & CHANCE CALCULATION ENGINES ---

// Helper explicitly evaluating whether an armor action is globally beneficial 
// (Throws an explicit error preventing silent failures if logic implies mixed stats without manual isBeneficial flag)
function getArmorActionBeneficialState(payload, attacker) {
    if (payload.isBeneficial !== undefined) return payload.isBeneficial;
    
    let hasPositive = false;
    let hasNegative = false;

    // Iterate over keys to cover standard 'value' and possible future extensions like 'valueFlat', 'valuePerc'
    Object.keys(payload).forEach(key => {
        if (key.toLowerCase().includes('value') || key.toLowerCase().includes('armor')) {
            const valStr = String(payload[key]).replace(/%/g, '');
            if (valStr && valStr !== 'undefined' && valStr !== 'null') {
                let val = getFormulaValue(valStr, attacker);
                if (val > 0) hasPositive = true;
                if (val < 0) hasNegative = true;
            }
        }
    });

    if (hasPositive && hasNegative) {
        alert("Błąd krytyczny logiki: Akcja Armor aplikuje mieszane statystyki (+ i -). Wymagana jest flaga isBeneficial!");
        throw new Error("Akcja Armor aplikuje mieszane statystyki (+ i -). Wymagana jest flaga isBeneficial!");
    }
    if (!hasPositive && !hasNegative) {
        alert("Błąd krytyczny logiki: Akcja Armor wychodzi na zerowe wartości bazowe. Wymagana flaga isBeneficial!");
        throw new Error("Akcja Armor nie zmieniła statystyk na plus ani minus (0). Wymagana flaga isBeneficial!");
    }

    return hasPositive;
}

// Dynamically calculates compound success probability combining Base Hit + Defenses/Checks (forceRoll & forceRollVS)
function calculateActionSuccessChance(attacker, target, payload) {
    if (payload.isGmAction) return 100; // Directly skip logical bounds for GM actions

    // 1. Base Success Probability (Only relevant for Damage Types)
    let baseSuccessChance = 1.0;
    if (payload.type === 'damage') {
        if (attacker.id === target.id || target.isStunned) baseSuccessChance = 1.0;
        else baseSuccessChance = calculateOpposedChance(attacker, target, 'accuracy', 'agility') / 100;
    }

    // 2. Check Mechanics Probability
    let targetPassChance = 1.0;
    let hasForceRoll = false;
    let hasForceRollVS = false;

    if (payload.forceRoll || payload.forceRollVS) {
        let pPassForce = 0.0;
        if (payload.forceRoll) {
            if (!payload.forceRollDifficulty) {
                alert("Critical Error: Action requires 'forceRoll' but 'forceRollDifficulty' is missing!");
                throw new Error("Missing 'forceRollDifficulty' for the defined 'forceRoll'.");
            }
            hasForceRoll = true;
            const stat = payload.forceRoll.trim(); 
            pPassForce = calculateStaticChance(target, stat, parseInt(payload.forceRollDifficulty)) / 100;
        }

        let pPassVS = 0.0;
        if (payload.forceRollVS) {
            hasForceRollVS = true;
            const parts = payload.forceRollVS.split(' vs '); 
            const attStat = parts[0].trim();
            const defStat = parts[1].trim();
            // Opposed Chance returns probability Attacker wins. Target passes if target wins (1.0 - AttWin)
            const pAttWin = calculateOpposedChance(attacker, target, attStat, defStat) / 100;
            pPassVS = 1.0 - pAttWin;
        }

        // Must succeed ALL requested checks to successfully pass the requirements
        if (hasForceRoll && hasForceRollVS) targetPassChance = pPassForce * pPassVS;
        else if (hasForceRoll) targetPassChance = pPassForce;
        else if (hasForceRollVS) targetPassChance = pPassVS;
    }

    // 3. Calculate Final Success Chance
    let finalSuccessChance = 1.0;
    if (hasForceRoll || hasForceRollVS) {
        if (payload.type === 'damage' || payload.type === 'condition') {
            // For damage/condition, the action fires solely based on base chance. Forced rolls only dictate specific riders.
            finalSuccessChance = baseSuccessChance;
        } else {
            let isBeneficial = false;
            if (payload.type === 'heal') {
                isBeneficial = true;
            } else if (payload.type === 'armor') {
                isBeneficial = getArmorActionBeneficialState(payload, attacker);
            }
            
            if (isBeneficial) {
                // Beneficial actions require target to PASS the checks to receive the effect
                finalSuccessChance = targetPassChance;
            } else {
                // Offensive actions require target to FAIL the checks to receive the negative effect
                finalSuccessChance = baseSuccessChance * (1.0 - targetPassChance);
            }
        }
    } else {
        // No extra checks, just base success chance (which is inherently 1.0 for non-damage)
        finalSuccessChance = baseSuccessChance;
    }

    return Math.round(finalSuccessChance * 100);
}

// Evaluates mathematical percentage of Attacker strictly beating or tying Defender
function calculateOpposedChance(attacker, defender, attStatName, defStatName) {
    const attStat = parseInt(attacker.stats[attStatName]) || 0;
    const attMod = parseInt(attacker.stats[`${attStatName}Mod`]) || 0;
    const defStat = parseInt(defender.stats[defStatName]) || 0;
    const defMod = parseInt(defender.stats[`${defStatName}Mod`]) || 0;

    if (attStat <= 0) return 0;
    if (defStat <= 0) return 100;

    let wins = 0;
    let total = attStat * defStat;

    for (let a = 1; a <= attStat; a++) {
        let aRes = Math.max(1, a + attMod);
        for (let d = 1; d <= defStat; d++) {
            let dRes = Math.max(1, d + defMod);
            // Tie breaks go to the initiator
            if (aRes >= dRes) wins++;
        }
    }
    return Math.round((wins / total) * 100);
}

// Evaluates mathematical percentage of an entity rolling over a static threshold
function calculateStaticChance(defender, statName, difficulty) {
    const statBase = parseInt(defender.stats[statName]) || 0;
    const statMod = parseInt(defender.stats[`${statName}Mod`]) || 0;

    if (statBase <= 0) return 0;

    let wins = 0;
    for (let d = 1; d <= statBase; d++) {
        let res = Math.max(1, d + statMod);
        if (res >= difficulty) wins++;
    }
    return Math.round((wins / statBase) * 100);
}

// Universal dice engine bundling Base Attacks and Defense/Requirement checks
function evaluateActionSuccessAndResistance(attacker, target, payload, consumeRollFn) {
    let attackerSingleRolls = [];
    let opposedRolls = [];
    let defenderSingleRolls = [];
    
    if (!payload.cachedAttackerRolls) payload.cachedAttackerRolls = {};

    // Safely insert the main ability roll at the beginning of the FIRST executed action's log block
    let initRoll = consumeRollFn ? consumeRollFn() : null;
    if (initRoll) attackerSingleRolls.push(initRoll);

    // GM Action explicitly overrides and skips the Hit vs Dodge Phase and Forced Rolls entirely
    if (payload.isGmAction) {
        return { 
            success: true, 
            hasForcedRolls: false,
            targetPassedChecks: false,
            rolls: { attackerSingleRolls, opposedRolls, defenderSingleRolls }, 
            subType: payload.damageType || null 
        };
    }

    let isBaseSuccess = true;

    // Phase 1: Base Trajectory (Damage Only)
    if (payload.type === 'damage') {
        if (attacker.id === target.id || target.isStunned) {
            isBaseSuccess = true;
        } else {
            const opposed = performOpposedRoll(attacker, target, 'accuracy', 'agility', payload.cachedAttackerRolls['accuracy'], true);
            if (payload.cachedAttackerRolls['accuracy'] === undefined) {
                payload.cachedAttackerRolls['accuracy'] = opposed.actualAttRoll;
            }
            isBaseSuccess = opposed.isSuccess;
            opposedRolls.push({ attRoll: opposed.attRoll, defRoll: opposed.defRoll });
        }
    }

    // A complete dodge negates any further calculations
    if (!isBaseSuccess) return { success: false, hasForcedRolls: false, targetPassedChecks: false, rolls: { attackerSingleRolls, opposedRolls, defenderSingleRolls }, subType: 'dodge' };

    // Phase 2: Defense / Requirement Mechanics Checking
    let passedForceRoll = false;
    let passedForceRollVS = false;
    let hasForceRoll = false;
    let hasForceRollVS = false;

    if (payload.forceRoll) {
        if (!payload.forceRollDifficulty) {
            alert("Critical Error: Action requires 'forceRoll' but 'forceRollDifficulty' is missing!");
            throw new Error("Missing 'forceRollDifficulty' for the defined 'forceRoll'.");
        }
        hasForceRoll = true;
        const stat = payload.forceRoll.trim(); 
        const diff = parseInt(payload.forceRollDifficulty);

        const statBase = parseInt(target.stats[stat]) || 0;
        const statMod = parseInt(target.stats[`${stat}Mod`]) || 0;
        let rollRes = 0;
        if (statBase > 0) rollRes = Math.max(1, Math.floor(Math.random() * statBase) + 1 + statMod);
        
        passedForceRoll = rollRes >= diff;
        defenderSingleRolls.push({ stat: stat, result: statBase > 0 ? rollRes : "X", color: passedForceRoll ? '#50fa7b' : '#ff5555' });
    }

    if (payload.forceRollVS) {
        hasForceRollVS = true;
        const parts = payload.forceRollVS.split(' vs '); 
        const attStat = parts[0].trim();
        const defStat = parts[1].trim();

        const opposed = performOpposedRoll(attacker, target, attStat, defStat, payload.cachedAttackerRolls[attStat]);
        if (payload.cachedAttackerRolls[attStat] === undefined) {
            payload.cachedAttackerRolls[attStat] = opposed.actualAttRoll;
        }
        opposedRolls.push({ attRoll: opposed.attRoll, defRoll: opposed.defRoll });
        
        // Attacker win (isSuccess) implies Target lost. Target passes if !isSuccess.
        passedForceRollVS = !opposed.isSuccess; 
    }

    let targetPassedChecks = true;
    if (hasForceRoll && hasForceRollVS) targetPassedChecks = passedForceRoll && passedForceRollVS; // Must beat both checks
    else if (hasForceRoll) targetPassedChecks = passedForceRoll;
    else if (hasForceRollVS) targetPassedChecks = passedForceRollVS;

    let actionSuccess = true;
    let subTypeFinal = null;

    if (hasForceRoll || hasForceRollVS) {
        if (payload.type === 'damage') {
            actionSuccess = isBaseSuccess; 
        } else if (payload.type === 'heal') {
            actionSuccess = targetPassedChecks;
            if (!actionSuccess) subTypeFinal = 'miss'; // e.g., failed to catch the heal
        } else if (payload.type === 'armor') {
            let isArmorBeneficial = getArmorActionBeneficialState(payload, attacker);
            actionSuccess = (isArmorBeneficial === targetPassedChecks);
            if (!actionSuccess) subTypeFinal = isArmorBeneficial ? 'miss' : 'resist';
        } else if (payload.type === 'condition') {
            actionSuccess = isBaseSuccess; 
        }
    } else {
        actionSuccess = isBaseSuccess;
    }

    return { 
        success: actionSuccess, 
        hasForcedRolls: hasForceRoll || hasForceRollVS,
        targetPassedChecks: targetPassedChecks,
        rolls: { attackerSingleRolls, opposedRolls, defenderSingleRolls }, 
        subType: subTypeFinal 
    };
}

// RESOLVING BASIC ACTIONS (Damage, Heal, Armor)

// Specific logic block evaluating attack payload execution post-roll processing
async function resolveDamageAction(attacker, target, payload, evalRes, skipSync = false) {
    const { value: damageStr, type, isPercMode } = payload;
    const repeats = payload.repeat || 1;
    let finalDamageType = payload.damageType; 

    if (evalRes.success) {
        let stepValues = [];
        let deadSteps = [];
        let actualRepeats = 0;
        let tempHp = target.stats.hp;
        let subTypeFinal = 'no_dmg';
        let targetKilled = false;

        for (let i = 0; i < repeats; i++) {
            // Original damage computation & mitigation
            let damage = 0;
            let effectiveDamageStr = String(damageStr);
            
            if (isPercMode || effectiveDamageStr.endsWith('%')) { 
                const percent = parseInt(effectiveDamageStr.replace('%', ''));
                damage = Math.ceil((target.stats.maxHp * percent) / 100); 
            } else {
                damage = getFormulaValue(effectiveDamageStr, attacker);
            }

            let damageAfterArmor = damage;

            if (finalDamageType === 'phys' || finalDamageType === 'mag') {
                const armorFlat = parseInt(finalDamageType === 'phys' ? target.stats.physArmor : target.stats.magArmor) || 0;
                const armorPercent = parseInt(finalDamageType === 'phys' ? target.stats.physArmorMod : target.stats.magArmorMod) || 0;

                damageAfterArmor = Math.ceil(damageAfterArmor - armorFlat);
                damageAfterArmor *= (100 - armorPercent) / 100;
            }

            damageAfterArmor = Math.max(Math.round(damageAfterArmor), 0);
            if (damageAfterArmor > 0) subTypeFinal = finalDamageType;

            if (damage > 0) {
                // Check Death's Door BEFORE subtracting HP if already at or below 0
                if (target.hasDeathsDoor && tempHp <= 0 && damageAfterArmor > 0) {
                    const ddResult = rollDeathsDoor(target);
                    // Add Death's Door roll directly to the defender's standalone pillar to broadcast uniformly with Hit checks
                    evalRes.rolls.defenderSingleRolls.push(ddResult.roll);

                    if (!ddResult.survived) {
                        tempHp = 0; 
                        targetKilled = true;
                    }
                } 
                
                // If character didn't die from a failed DD roll above, subtract HP normally
                if (!targetKilled) {
                    tempHp = Math.round(tempHp - damageAfterArmor); 

                    if (!target.hasDeathsDoor && tempHp <= 0 && damageAfterArmor > 0) {
                        tempHp = 0; 
                        targetKilled = true;
                    }
                }
            }
            
            stepValues.push(tempHp);
            deadSteps.push(targetKilled);
            actualRepeats++;
            
            if (targetKilled) break; // Break out of repeat loop immediately upon actual death
        }
        
        // Broadcast the full action dynamically mapping the Three Pillars layout BEFORE visual HP drop
        if (evalRes.rolls.attackerSingleRolls.length > 0 || evalRes.rolls.opposedRolls.length > 0 || evalRes.rolls.defenderSingleRolls.length > 0) {
            syncAddRollEvent(buildRollEvent(attacker, target, evalRes.rolls, payload, skipSync));
        }

        // Push the entire sequence calculation to all clients simultaneously to drive UI identically
        if (typeof syncPlayActionSequence === 'function') {
            syncPlayActionSequence({ targetId: target.id, actionType: 'damage', subType: subTypeFinal, repeats: actualRepeats, stepValues: stepValues, deadSteps: deadSteps, stepId: payload.stepId, isAuto: skipSync });
        }

        // Wait exactly long enough for the broadcast sequence to finish visually before unlocking the pipeline
        await delay((actualRepeats * 300) + 100);

        // Ensure state is perfectly finalized locally to prevent edge-case de-syncs if network lagged
        if (stepValues.length > 0) {
            // FIX: Pull fresh reference to prevent overwriting updates that occurred during the delay
            const freshTarget = activeCombatants.find(c => c.id === target.id);
            if (freshTarget) {
                freshTarget.stats.hp = stepValues[stepValues.length - 1];
                if (targetKilled) {
                    freshTarget.isDead = true;
                    freshTarget.isStunned = false;
                }
                if (!skipSync) syncUpdateCombatant(freshTarget); 
            }
        }
    } else {
        // Broadcast Dodge/Resist event safely
        if (evalRes.rolls.attackerSingleRolls.length > 0 || evalRes.rolls.opposedRolls.length > 0 || evalRes.rolls.defenderSingleRolls.length > 0) {
            syncAddRollEvent(buildRollEvent(attacker, target, evalRes.rolls, payload, skipSync));
        }

        if (typeof syncPlayActionSequence === 'function') {
            syncPlayActionSequence({ targetId: target.id, actionType: 'damage', subType: evalRes.subType || 'dodge', repeats: 1, stepId: payload.stepId, isAuto: skipSync });
        }
        await delay(400); 
    }
    
    return evalRes.success;
}

// Core function preparing heal steps and compiling payload for remote network playback
// Utilizes attacker context if provided, otherwise falls back to the target combatant's stats
async function resolveHealAction(combatant, type, healValueStr, repeats = 1, attacker = null, skipSync = false, stepId = null) {
    // Absolute prohibition of healing dead characters until a specific resurrect mechanic is added
    if (combatant.isDead) return;

    let stepValues = [];
    let tempHp = combatant.stats.hp;
    let evalContext = attacker || combatant;

    for (let i = 0; i < repeats; i++) {
        let healAmount = 0;
        let effectiveHealStr = String(healValueStr);
        let isPerc = effectiveHealStr.endsWith('%'); 
        
        if (isPerc) {
            const percent = parseInt(effectiveHealStr.replace('%', ''));
            healAmount = Math.ceil((combatant.stats.maxHp * percent) / 100);
        } else {
            healAmount = getFormulaValue(effectiveHealStr, evalContext);
        }

        if (type === 'threshold') {
            if (isPerc) { 
                const percent = parseInt(effectiveHealStr.replace('%', ''));
                const thresholdHp = Math.floor((combatant.stats.maxHp * percent) / 100);
                if (tempHp < thresholdHp) tempHp = thresholdHp;
                else break; 
            } else {
                const thresholdHp = healAmount;
                if (tempHp < thresholdHp) tempHp = thresholdHp;
                else break; 
            }
        } else {
            tempHp += healAmount;
        }

        // Do not exceed maximum HP
        if (tempHp > combatant.stats.maxHp) tempHp = combatant.stats.maxHp;
        stepValues.push(tempHp);
    }

    if (stepValues.length > 0 && typeof syncPlayActionSequence === 'function') {
        syncPlayActionSequence({ targetId: combatant.id, actionType: 'heal', subType: type, repeats: stepValues.length, stepValues: stepValues, stepId: stepId, isAuto: skipSync });
        await delay((stepValues.length * 300) + 100);
    }

    // Ensure state is perfectly finalized locally
    if (stepValues.length > 0) {
        // FIX: Pull fresh reference
        const freshCombatant = activeCombatants.find(c => c.id === combatant.id);
        if (freshCombatant) {
            freshCombatant.stats.hp = stepValues[stepValues.length - 1];
            if (!skipSync) syncUpdateCombatant(freshCombatant); 
        }
    }
}

// Prepares armor modifications steps and delegates network playback execution
// Utilizes attacker context if provided, otherwise falls back to the target combatant's stats
async function resolveArmorAction(combatant, type, parsedValue, isPercentage, repeats = 1, attacker = null, skipSync = false, stepId = null) {
    let cleanValStr = String(parsedValue);
    let stepValues = [];
    let evalContext = attacker || combatant;
    
    let initialEval = isPercentage ? parseInt(cleanValStr.replace('%', '')) : getFormulaValue(cleanValStr, evalContext);
    let isAdding = initialEval > 0;
    
    let tempFlat = parseInt(type === 'phys' ? combatant.stats.physArmor : combatant.stats.magArmor) || 0;
    let tempPercent = parseInt(type === 'phys' ? combatant.stats.physArmorMod : combatant.stats.magArmorMod) || 0;

    for (let i = 0; i < repeats; i++) {
        let finalValue = isPercentage ? parseInt(cleanValStr.replace('%', '')) : getFormulaValue(cleanValStr, evalContext);

        // Apply changes linearly for flat, and exponentially/multiplicatively for percentage states
        if (isPercentage) { 
            let damageMult = 1 - (tempPercent / 100);
            
            // Apply dynamic shift matching the compound logic from calculateAdditionalStatsBonuses
            const factor = finalValue > 0 ? (1 - finalValue / 100) : (1 + Math.abs(finalValue) / 100);
            damageMult *= factor;

            let finalPercent = Math.round((1 - damageMult) * 100);
            // Apply an upper boundary cap of 100% to percentage armor mitigation values
            if (finalPercent > 100) finalPercent = 100;

            tempPercent = finalPercent;
            stepValues.push(`${tempPercent}%`);
        } else {
            // Handle flat value (remains fully linear and unconstrained)
            tempFlat += finalValue;
            stepValues.push(tempFlat);
        }
    }

    if (typeof syncPlayActionSequence === 'function') {
        syncPlayActionSequence({ targetId: combatant.id, actionType: 'armor', subType: type, repeats: repeats, isAdding: isAdding, stepValues: stepValues, stepId: stepId, isAuto: skipSync });
        await delay((repeats * 300) + 100);
    }
    
    // Ensure state is perfectly finalized locally
    if (stepValues.length > 0) {
        // FIX: Pull fresh reference
        const freshCombatant = activeCombatants.find(c => c.id === combatant.id);
        if (freshCombatant) {
            const finalVal = stepValues[stepValues.length - 1];
            if (type === 'phys') {
                if (isPercentage) freshCombatant.stats.physArmorMod = finalVal;
                else freshCombatant.stats.physArmor = finalVal;
            } else {
                if (isPercentage) freshCombatant.stats.magArmorMod = finalVal;
                else freshCombatant.stats.magArmor = finalVal;
            }
            if (!skipSync) syncUpdateCombatant(freshCombatant); 
        }
    }
}