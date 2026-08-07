// --- MATH & CHANCE CALCULATION ENGINES ---

// Evaluates mathematical percentage of Attacker strictly beating or tying Defender
function calculateOpposedChance(attacker, defender, attStatName, defStatName) {
    const attBase = parseInt(attacker.stats[attStatName]) || 0;
    const defBase = parseInt(defender.stats[defStatName]) || 0;
    
    if (attBase <= 0) return 0;
    if (defBase <= 0) return 100;

    const attMod = parseInt(attacker.stats[`${attStatName}Mod`]) || 0;
    const defMod = parseInt(defender.stats[`${defStatName}Mod`]) || 0;
    
    let wins = 0;
    let total = attBase * defBase;
    
    for (let a = 1; a <= attBase; a++) {
        let attRes = Math.max(1, a + attMod);
        for (let d = 1; d <= defBase; d++) {
            let defRes = Math.max(1, d + defMod);
            // Tie goes to the attacker
            if (attRes >= defRes) wins++;
        }
    }
    
    return Math.floor((wins / total) * 100);
}

// Evaluates mathematical percentage of an entity rolling over a static threshold
function calculateStaticChance(target, statName, difficulty) {
    const base = parseInt(target.stats[statName]) || 0;
    if (base <= 0) return 0;
    const mod = parseInt(target.stats[`${statName}Mod`]) || 0;
    
    let wins = 0;
    for (let i = 1; i <= base; i++) {
        let res = Math.max(1, i + mod);
        if (res >= difficulty) wins++;
    }
    return Math.floor((wins / base) * 100);
}

// Unified validation function checking for all critical logic errors in an action payload before execution
function validateActionPayload(payload, attacker, rollData) {
    // Check for missing difficulty on forced rolls
    if (payload.forceRoll && !payload.forceRollDifficulty) {
        return t('error_force_roll_missing');
    }

    const actionHasForcedRolls = !!(payload.forceRoll || payload.forceRollVS);

    // Validate Armor actions
    if (payload.type === 'armor') {
        let hasPositive = false;
        let hasNegative = false;
        let hasAny = false;

        const checkVal = (valStr) => {
            if (valStr !== undefined && valStr !== null && valStr !== '') {
                hasAny = true;
                let val = getFormulaValue(String(valStr).replace(/%/g, ''), attacker, rollData);
                if (val > 0) hasPositive = true;
                if (val < 0) hasNegative = true;
            }
        };

        checkVal(payload.physArmorValue);
        checkVal(payload.physArmorValuePerc);
        checkVal(payload.magArmorValue);
        checkVal(payload.magArmorValuePerc);

        if (!hasAny) return t('error_armor_missing_vals');
        
        if (payload.isBeneficial === undefined) {
            if (hasPositive && hasNegative) return t('error_armor_mixed_stats');
            if (!hasPositive && !hasNegative) return t('error_armor_zero_stats');
        }
    }

    // Validate Condition actions having no conditions
    if (payload.type === 'condition' && (!payload.conditions || payload.conditions.length === 0)) {
        return t('error_condition_empty');
    }

    // Validate condition arrays (for any action type that has them)
    if (payload.conditions && payload.conditions.length > 0) {
        let hasPositive = false;
        let hasNegative = false;

        for (const cond of payload.conditions) {
            // Forced rolls require conditions to explicitly declare if they are beneficial
            if (actionHasForcedRolls && cond.isBeneficial === undefined) {
                let fallbackName = cond.conditionName || 'Condition';
                return t('error_condition_missing_flag').replace('{name}', fallbackName);
            }
            if (cond.isBeneficial === true) hasPositive = true;
            if (cond.isBeneficial === false) hasNegative = true;
        }

        if (payload.isBeneficial === undefined) {
            if (hasPositive && hasNegative) return t('error_condition_mixed');
        }
    }

    return null; // Null means no errors found
}

// Helper explicitly evaluating whether an armor action is globally beneficial 
// Mathematical evaluation relies on payload validity guaranteed by validateActionPayload
function getArmorActionBeneficialState(payload, attacker) {
    if (payload.isBeneficial !== undefined) return payload.isBeneficial;

    // Fetch pipeline context to calculate dynamic roll-based formula values accurately
    let rollData = typeof currentPipelineContext !== 'undefined' && currentPipelineContext 
        ? { total: currentPipelineContext.rollTotal, diff: currentPipelineContext.difficulty } : null;

    let hasPositive = false;
    const checkVal = (valStr) => {
        if (valStr !== undefined && valStr !== null && valStr !== '') {
            let val = getFormulaValue(String(valStr).replace(/%/g, ''), attacker, rollData);
            if (val > 0) hasPositive = true;
        }
    };

    checkVal(payload.physArmorValue);
    checkVal(payload.physArmorValuePerc);
    checkVal(payload.magArmorValue);
    checkVal(payload.magArmorValuePerc);

    return hasPositive;
}

// Helper explicitly evaluating whether a condition action is globally beneficial 
// Mathematical evaluation relies on payload validity guaranteed by validateActionPayload
function getConditionsBeneficialState(payload) {
    if (payload.isBeneficial !== undefined) return payload.isBeneficial;

    // If there are no forced rolls to dictate outcome, the flag is not necessary
    if (!payload.forceRoll && !payload.forceRollVS) {
        return true; 
    }

    let hasPositive = false;
    if (payload.conditions) {
        payload.conditions.forEach(cond => {
            if (cond.isBeneficial === true) hasPositive = true;
        });
    }

    return hasPositive;
}

// Dynamically calculates compound success probability combining Base Hit + Defenses/Checks (forceRoll & forceRollVS)
// Returns tailored objects mapped strictly to the action type to render exact UI tooltip chances
function calculateActionSuccessChance(attacker, target, payload) {
    if (payload.isGmAction) return {}; // Directly skip logical bounds for GM actions, GM actions shouldn't display tooltip stats anyway

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

    // 3. Calculate Final Success Chances strictly separated by action type properties
    let result = {};

    if (payload.type === 'damage') {
        result.hit = Math.round(baseSuccessChance * 100);
        if (payload.conditions && payload.conditions.length > 0) {
            let condChance = baseSuccessChance;
            if (hasForceRoll || hasForceRollVS) {
                let isBeneficial = getConditionsBeneficialState(payload);
                condChance = isBeneficial ? targetPassChance : baseSuccessChance * (1.0 - targetPassChance);
            }
            result.condition = Math.round(condChance * 100);
        }
    } else if (payload.type === 'heal') {
        // Heal does not have hit/success chances shown, strictly condition apply chances
        if (payload.conditions && payload.conditions.length > 0) {
            let condChance = 1.0;
            if (hasForceRoll || hasForceRollVS) {
                let isBeneficial = getConditionsBeneficialState(payload);
                condChance = isBeneficial ? targetPassChance : (1.0 - targetPassChance);
            }
            result.condition = Math.round(condChance * 100);
        }
    } else if (payload.type === 'armor') {
        let successChance = 1.0;
        if (hasForceRoll || hasForceRollVS) {
            let isBeneficial = getArmorActionBeneficialState(payload, attacker);
            successChance = isBeneficial ? targetPassChance : (1.0 - targetPassChance);
        }
        result.success = Math.round(successChance * 100);
    } else if (payload.type === 'condition') {
        let successChance = baseSuccessChance;
        if (hasForceRoll || hasForceRollVS) {
            let isBeneficial = getConditionsBeneficialState(payload);
            successChance = isBeneficial ? targetPassChance : baseSuccessChance * (1.0 - targetPassChance);
        }
        result.success = Math.round(successChance * 100);
    }

    return result;
}

// Universal dice engine bundling Base Attacks and Defense/Requirement checks
function evaluateActionSuccessAndResistance(attacker, target, payload, consumeRollFn) {
    let attackerSingleRolls = [];
    let opposedRolls = [];
    let defenderSingleRolls = [];
    
    if (!payload.cachedAttackerRolls) payload.cachedAttackerRolls = {};

    // Safely insert the main ability roll(s) at the beginning of the FIRST executed action's log block
    let initRoll = consumeRollFn ? consumeRollFn() : null;
    if (initRoll) {
        // Handle array of rolls natively if it was a multi-stat ability roll
        if (Array.isArray(initRoll)) attackerSingleRolls.push(...initRoll);
        else attackerSingleRolls.push(initRoll);
    }

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
        // Damage, heal, and condition main action execution depends purely on base hit (100% for non-damage).
        // The forced rolls will be handled by processAndSendConditions for individual states.
        if (payload.type === 'damage' || payload.type === 'heal' || payload.type === 'condition') {
            actionSuccess = isBaseSuccess; 
        } else if (payload.type === 'armor') {
            let isArmorBeneficial = getArmorActionBeneficialState(payload, attacker);
            actionSuccess = (isArmorBeneficial === targetPassedChecks);
            if (!actionSuccess) subTypeFinal = isArmorBeneficial ? 'miss' : 'resist';
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
    const repeats = payload.repeat || 1;
    let finalDamageType = payload.damageType; 

    // Retrieve active pipeline logic variables containing roll data to evaluate formulas securely
    let rollData = typeof currentPipelineContext !== 'undefined' && currentPipelineContext 
        ? { total: currentPipelineContext.rollTotal, diff: currentPipelineContext.difficulty } : null;

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
            
            if (payload.valuePerc !== undefined) { 
                const percent = parseInt(payload.valuePerc); 
                damage = Math.ceil((target.stats.maxHp * percent) / 100); 
            } else if (payload.value !== undefined) {
                // Injects rollData into equation evaluation
                damage = getFormulaValue(payload.value, attacker, rollData);
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
                    // Clean up conditions targeting this dead character
                    if (typeof removeConditionsForTarget === 'function') {
                        removeConditionsForTarget(freshTarget.uniqueName);
                    }
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
async function resolveHealAction(combatant, payload, attacker = null, skipSync = false) {
    // Absolute prohibition of healing dead characters until a specific resurrect mechanic is added
    if (combatant.isDead) return;

    let rollData = typeof currentPipelineContext !== 'undefined' && currentPipelineContext 
        ? { total: currentPipelineContext.rollTotal, diff: currentPipelineContext.difficulty } : null;

    const type = payload.healType || 'normal';
    let stepValues = [];
    let tempHp = combatant.stats.hp;
    let evalContext = attacker || combatant;
    let repeats = payload.repeat || 1;
    let stepId = payload.stepId;

    for (let i = 0; i < repeats; i++) {
        let healAmount = 0;
        
        if (payload.valuePerc !== undefined) {
            const percent = parseInt(payload.valuePerc);
            healAmount = Math.ceil((combatant.stats.maxHp * percent) / 100);
        } else if (payload.value !== undefined) {
            healAmount = getFormulaValue(payload.value, evalContext, rollData);
        }

        if (type === 'threshold') {
            if (payload.valuePerc !== undefined) { 
                const percent = parseInt(payload.valuePerc);
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

// Prepares armor modifications steps and delegates network playback execution sequentially bridging multiple target properties 
async function resolveArmorAction(combatant, payload, attacker = null, skipSync = false) {
    let evalContext = attacker || combatant;
    let freshCombatant = activeCombatants.find(c => c.id === combatant.id);
    if (!freshCombatant) return;

    let rollData = typeof currentPipelineContext !== 'undefined' && currentPipelineContext 
        ? { total: currentPipelineContext.rollTotal, diff: currentPipelineContext.difficulty } : null;

    let isAdding = getArmorActionBeneficialState(payload, evalContext);
    let repeats = payload.repeat || 1;
    let stepValues = []; 
    
    // Dynamic map to process flat and percentage changes without code duplication
    const armorConfigs = [
        { payloadKey: 'physArmorValue', stepKey: 'physFlat', stat: 'physArmor', isPerc: false, isPhys: true },
        { payloadKey: 'physArmorValuePerc', stepKey: 'physPerc', stat: 'physArmorMod', isPerc: true, isPhys: true },
        { payloadKey: 'magArmorValue', stepKey: 'magFlat', stat: 'magArmor', isPerc: false, isPhys: false },
        { payloadKey: 'magArmorValuePerc', stepKey: 'magPerc', stat: 'magArmorMod', isPerc: true, isPhys: false }
    ];

    // Filter down to only the properties that were actually passed in the payload
    const activeConfigs = armorConfigs.filter(cfg => 
        payload[cfg.payloadKey] !== undefined && payload[cfg.payloadKey] !== null && payload[cfg.payloadKey] !== ''
    );

    if (activeConfigs.length === 0) return;

    // Extract current base values once
    let currentVals = {
        physArmor: parseInt(freshCombatant.stats.physArmor) || 0,
        physArmorMod: parseInt(freshCombatant.stats.physArmorMod) || 0,
        magArmor: parseInt(freshCombatant.stats.magArmor) || 0,
        magArmorMod: parseInt(freshCombatant.stats.magArmorMod) || 0
    };

    // Determine if we need the mixed sound (evaluating across all active configs)
    let hasPhys = activeConfigs.some(cfg => cfg.isPhys);
    let hasMag = activeConfigs.some(cfg => !cfg.isPhys);
    let hasPositive = false;
    let hasNegative = false;

    activeConfigs.forEach(cfg => {
        let val = getFormulaValue(String(payload[cfg.payloadKey]).replace(/%/g, ''), evalContext, rollData);
        if (val > 0) hasPositive = true;
        if (val < 0) hasNegative = true;
    });

    let isMixedSound = (hasPhys && hasMag) || (hasPositive && hasNegative);

    // Run the primary compound math loop for any active repeats
    for (let i = 0; i < repeats; i++) {
        let stepState = {};
        
        activeConfigs.forEach(cfg => {
            let formulaVal = getFormulaValue(String(payload[cfg.payloadKey]).replace(/%/g, ''), evalContext, rollData);
            
            if (cfg.isPerc) {
                let damageMult = 1 - (currentVals[cfg.stat] / 100);
                const factor = formulaVal > 0 ? (1 - formulaVal / 100) : (1 + Math.abs(formulaVal) / 100);
                damageMult *= factor;
                currentVals[cfg.stat] = Math.min(Math.round((1 - damageMult) * 100), 100);
            } else {
                currentVals[cfg.stat] += formulaVal;
            }
            
            // Map the calculated value directly to the key expected by the visual sequencer
            stepState[cfg.stepKey] = currentVals[cfg.stat];
        });
        
        stepValues.push(stepState);
    }

    if (typeof syncPlayActionSequence === 'function') {
        syncPlayActionSequence({ 
            targetId: freshCombatant.id, 
            actionType: 'armor', 
            repeats: repeats, 
            isAdding: isAdding, 
            stepValues: stepValues, 
            stepId: payload.stepId, 
            isAuto: skipSync,
            hasPhysFlat: payload.physArmorValue !== undefined,
            hasPhysPerc: payload.physArmorValuePerc !== undefined,
            hasMagFlat: payload.magArmorValue !== undefined,
            hasMagPerc: payload.magArmorValuePerc !== undefined,
            isMixedSound 
        });
        await delay((repeats * 300) + 100);
    }

    // Finalize state locally mapping back from the last step state
    if (stepValues.length > 0) {
        let finalVal = stepValues[stepValues.length - 1];
        
        if (finalVal.physFlat !== undefined) freshCombatant.stats.physArmor = finalVal.physFlat;
        if (finalVal.physPerc !== undefined) freshCombatant.stats.physArmorMod = `${finalVal.physPerc}%`;
        if (finalVal.magFlat !== undefined) freshCombatant.stats.magArmor = finalVal.magFlat;
        if (finalVal.magPerc !== undefined) freshCombatant.stats.magArmorMod = `${finalVal.magPerc}%`;
        
        if (!skipSync) syncUpdateCombatant(freshCombatant);
    }
}