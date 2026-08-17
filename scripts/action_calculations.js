// --- MATH & CHANCE CALCULATION ENGINES ---

// Helper to calculate the exact mathematical probability distribution of multiple combined dice
function getDiceDistribution(combatant, statString) {
    const stats = parseRollStats(statString);
    let dp = { 0: 1 }; // Map of sum -> combinations
    let totalCombos = 1;

    for (let stat of stats) {
        const base = parseInt(combatant.stats[stat]) || 0;
        if (base <= 0) return null; // If any stat is missing, the roll is invalid
        const mod = parseInt(combatant.stats[`${stat}Mod`]) || 0;
        totalCombos *= base;

        let nextDp = {};
        for (let s in dp) {
            const currentSum = parseInt(s);
            const combos = dp[s];

            for (let roll = 1; roll <= base; roll++) {
                // Minimum value of 1 applied strictly per die
                const finalDieResult = Math.max(1, roll + mod);
                const newSum = currentSum + finalDieResult;
                nextDp[newSum] = (nextDp[newSum] || 0) + combos;
            }
        }
        dp = nextDp;
    }
    return { dp, totalCombos };
}

// Evaluates mathematical percentage of Attacker strictly beating or tying Defender (calculating exact mathematical permutations)
function calculateOpposedChance(attacker, defender, attStatString, defStatString) {
    const attDist = getDiceDistribution(attacker, attStatString);
    if (!attDist) return 0; // Attacker auto fails if missing stat
    const defDist = getDiceDistribution(defender, defStatString);
    if (!defDist) return 100; // Defender auto fails (attacker wins) if missing stat

    let wins = 0;
    for (let aSum in attDist.dp) {
        const aVal = parseInt(aSum);
        const aCombos = attDist.dp[aSum];
        for (let dSum in defDist.dp) {
            const dVal = parseInt(dSum);
            const dCombos = defDist.dp[dSum];
            
            if (aVal >= dVal) { // Tie goes to attacker
                wins += (aCombos * dCombos);
            }
        }
    }
    const totalPossible = attDist.totalCombos * defDist.totalCombos;
    return Math.floor((wins / totalPossible) * 100);
}

// Evaluates mathematical percentage of an entity rolling over a static threshold
function calculateStaticChance(target, statString, difficulty) {
    const dist = getDiceDistribution(target, statString);
    if (!dist) return 0;

    let wins = 0;
    for (let sum in dist.dp) {
        if (parseInt(sum) >= difficulty) {
            wins += dist.dp[sum];
        }
    }
    return Math.floor((wins / dist.totalCombos) * 100);
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
        let hasDynamicFormula = false;

        const checkVal = (valRaw) => {
            if (valRaw !== undefined && valRaw !== null && valRaw !== '') {
                hasAny = true;
                const valStr = String(valRaw);
                
                // If the formula explicitly relies on runtime dice rolls, the static evaluation is unpredictable
                if (/roll|over/i.test(valStr)) {
                    hasDynamicFormula = true;
                }
                
                let val = getFormulaValue(valStr.replace(/%/g, ''), attacker, rollData);
                if (val > 0) hasPositive = true;
                if (val < 0) hasNegative = true;
            }
        };

        checkVal(payload.physArmorValue);
        checkVal(payload.physArmorValuePerc);
        checkVal(payload.magArmorValue);
        checkVal(payload.magArmorValuePerc);

        if (!hasAny) return t('error_armor_missing_vals');
        
        // isActionBeneficial flag is only required if the logic depends on passing forced rolls
        if (payload.isActionBeneficial === undefined && actionHasForcedRolls) {
            if (hasDynamicFormula) return t('error_armor_dynamic_stats');
            if (hasPositive && hasNegative) return t('error_armor_mixed_stats');
            if (!hasPositive && !hasNegative) return t('error_armor_zero_stats');
        }
    }

    // Validate Effect actions having no effects
    if (payload.type === 'effect' && (!payload.effects || payload.effects.length === 0)) {
        return t('error_effect_empty');
    }

    // Validate effect arrays (for any action type that has them)
    if (payload.effects && payload.effects.length > 0) {
        let hasPositive = false;
        let hasNegative = false;

        for (const eff of payload.effects) {
            // Forced rolls require effects to explicitly declare if they are beneficial
            if (actionHasForcedRolls && eff.effectIsBeneficial === undefined) {
                let fallbackName = eff.effectName || eff.name || t('effect');
                return t('error_effect_missing_flag').replace('{name}', fallbackName);
            }
            if (eff.effectIsBeneficial === true) hasPositive = true;
            if (eff.effectIsBeneficial === false) hasNegative = true;
        }

        // Require the new clarifying flag if there are forced rolls AND mixed effects, but ONLY for actions requiring manual targeting (where tooltip chances are shown)
        const requiresTargeting = ['single', 'multi'].includes(payload.target);
        if (requiresTargeting && actionHasForcedRolls && hasPositive && hasNegative && payload.isEffectSuccessBeneficial === undefined) {
            return t('error_effect_mixed');
        }
    }

    return null; // Null means no errors found
}

// Helper explicitly evaluating whether an armor action is globally beneficial 
// Mathematical evaluation relies on payload validity guaranteed by validateActionPayload
function getArmorActionBeneficialState(payload, attacker) {
    if (payload.isActionBeneficial !== undefined) return payload.isActionBeneficial;

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

// Determines which chance to show on the tooltip when calculating effect outcomes
// No need to check if they are all strictly positive or negative since if they are, that situation is already handled in validateActionPayload
function getEffectSuccessFocus(payload) {
    if (payload.isEffectSuccessBeneficial !== undefined) return payload.isEffectSuccessBeneficial;

    let hasPositive = false;
    if (payload.effects) {
        payload.effects.forEach(eff => {
            if (eff.effectIsBeneficial === true) hasPositive = true;
        });
    }

    return hasPositive;
}

// Helper to check if a specific property is present on the parent ability
// Respects the ignoresAbilityProperties flag to allow specific actions to bypass ability traits
function hasActiveProperty(payload, propName) {
    if (payload && payload.ignoresAbilityProperties) return false;
    
    if (typeof currentPipelineContext !== 'undefined' && currentPipelineContext && currentPipelineContext.ability) {
        if (currentPipelineContext.ability.properties && currentPipelineContext.ability.properties.includes(propName)) {
            return true;
        }
    }
    return false;
}

// Dynamically calculates compound success probability combining Base Hit + Defenses/Checks (forceRoll & forceRollVS)
// Returns tailored objects mapped strictly to the action type to render exact UI tooltip chances
function calculateActionSuccessChance(attacker, target, payload) {
    if (payload.isGmAction) return {}; // Directly skip logical bounds for GM actions, GM actions shouldn't display tooltip stats anyway

    // 1. Base Success Probability (Only relevant for Damage Types)
    let baseSuccessChance = 1.0;
    if (payload.type === 'damage') {
        if (attacker.id === target.id || target.isStunned || hasActiveProperty(payload, 'prop_undodgeable')) {
            baseSuccessChance = 1.0;
        } else {
            baseSuccessChance = calculateOpposedChance(attacker, target, 'accuracy', 'agility') / 100;
        }
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
    const causesStun = hasActiveProperty(payload, 'prop_stuns');

    if (payload.type === 'damage') {
        result.hit = Math.round(baseSuccessChance * 100);
        
        if (payload.effects && payload.effects.length > 0) {
            let effChance = baseSuccessChance; // Effects on damage require the attack to hit first
            if (hasForceRoll || hasForceRollVS) {
                let focusBeneficial = getEffectSuccessFocus(payload);
                effChance = focusBeneficial ? (baseSuccessChance * targetPassChance) : (baseSuccessChance * (1.0 - targetPassChance));
            }
            result.effect = Math.round(effChance * 100);
        }
        
        if (causesStun) {
            let stunChance = baseSuccessChance * ((hasForceRoll || hasForceRollVS) ? (1.0 - targetPassChance) : 1.0);
            result.stun = Math.round(stunChance * 100);
        }
    } else if (payload.type === 'heal') {
        if (payload.effects && payload.effects.length > 0) {
            let effChance = 1.0;
            if (hasForceRoll || hasForceRollVS) {
                let focusBeneficial = getEffectSuccessFocus(payload);
                effChance = focusBeneficial ? targetPassChance : (1.0 - targetPassChance);
            }
            result.effect = Math.round(effChance * 100);
        }
        
        if (causesStun) {
            let stunChance = (hasForceRoll || hasForceRollVS) ? (1.0 - targetPassChance) : 1.0;
            result.stun = Math.round(stunChance * 100);
        }
    } else if (payload.type === 'armor') {
        let successChance = 1.0;
        if (hasForceRoll || hasForceRollVS) {
            let isBeneficial = getArmorActionBeneficialState(payload, attacker);
            successChance = isBeneficial ? targetPassChance : (1.0 - targetPassChance);
        }
        result.success = Math.round(successChance * 100);
        
        if (payload.effects && payload.effects.length > 0) {
            let effChance = 1.0;
            if (hasForceRoll || hasForceRollVS) {
                let focusBeneficial = getEffectSuccessFocus(payload);
                effChance = focusBeneficial ? targetPassChance : (1.0 - targetPassChance);
            }
            result.effect = Math.round(effChance * 100);
        }
        
        if (causesStun) {
            let stunChance = (hasForceRoll || hasForceRollVS) ? (1.0 - targetPassChance) : 1.0;
            result.stun = Math.round(stunChance * 100);
        }
    } else if (payload.type === 'effect') {
        let effChance = 1.0; // effect action base is 100% unless forced rolls apply
        if (hasForceRoll || hasForceRollVS) {
            let focusBeneficial = getEffectSuccessFocus(payload);
            effChance = focusBeneficial ? targetPassChance : (1.0 - targetPassChance);
        }
        result.effect = Math.round(effChance * 100);
        
        if (causesStun) {
            let stunChance = (hasForceRoll || hasForceRollVS) ? (1.0 - targetPassChance) : 1.0;
            result.stun = Math.round(stunChance * 100);
        }
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
        if (attacker.id === target.id || target.isStunned || hasActiveProperty(payload, 'prop_undodgeable')) {
            isBaseSuccess = true;
        } else {
            const opposed = performOpposedRoll(attacker, target, 'accuracy', 'agility', payload.cachedAttackerRolls['accuracy'], true);
            if (payload.cachedAttackerRolls['accuracy'] === undefined) {
                payload.cachedAttackerRolls['accuracy'] = { actualAttRoll: opposed.actualAttRoll, breakdown: opposed.attBreakdown };
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
        const statString = payload.forceRoll.trim(); 
        const diff = parseInt(payload.forceRollDifficulty);

        const stats = parseRollStats(statString);
        let rollRes = 0;
        let hasBase = false;
        let forceBreakdown = [];
        
        for (let stat of stats) {
            const statBase = parseInt(target.stats[stat]) || 0;
            if (statBase > 0) {
                hasBase = true;
                const statMod = parseInt(target.stats[`${stat}Mod`]) || 0;
                const roll = Math.floor(Math.random() * statBase) + 1;
                const total = Math.max(1, roll + statMod);
                rollRes += total;
                forceBreakdown.push({ stat: stat, roll: roll, mod: statMod, total: total });
            }
        }
        
        passedForceRoll = rollRes >= diff;
        defenderSingleRolls.push({ 
            stat: statString, 
            result: hasBase ? rollRes : "X", 
            color: passedForceRoll ? 'text-positive' : 'text-negative', 
            breakdown: forceBreakdown,
            difficulty: diff
        });
    }

    if (payload.forceRollVS) {
        hasForceRollVS = true;
        const parts = payload.forceRollVS.split(' vs '); 
        const attStatString = parts[0].trim();
        const defStatString = parts[1].trim();

        const opposed = performOpposedRoll(attacker, target, attStatString, defStatString, payload.cachedAttackerRolls[attStatString]);
        if (payload.cachedAttackerRolls[attStatString] === undefined) {
            payload.cachedAttackerRolls[attStatString] = { actualAttRoll: opposed.actualAttRoll, breakdown: opposed.attBreakdown };
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
        // Damage, heal, and effect main action execution depends purely on base hit (100% for non-damage).
        // The forced rolls will be handled by processAndSendEffects for individual states.
        if (payload.type === 'damage' || payload.type === 'heal' || payload.type === 'effect') {
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

// Universal damage calculation helper evaluating base action damage versus target defenses
function calculateActualDamage(attacker, target, payload, rollData) {
    let baseDamage = 0;
    if (payload.valuePerc !== undefined) {
        const percent = parseInt(payload.valuePerc);
        const maxHp = target.stats.maxHp || 1;
        baseDamage = Math.ceil((maxHp * percent) / 100);
    } else if (payload.value !== undefined) {
        baseDamage = getFormulaValue(payload.value, attacker, rollData);
    }

    let finalDamage = baseDamage;
    let finalDamageType = payload.damageType;

    if (finalDamageType === 'phys' || finalDamageType === 'mag') {
        const armorFlat = parseInt(finalDamageType === 'phys' ? target.stats.physArmor : target.stats.magArmor) || 0;
        const armorPercentStr = finalDamageType === 'phys' ? target.stats.physArmorMod : target.stats.magArmorMod;
        const armorPercent = parseInt(armorPercentStr) || 0;

        finalDamage = Math.ceil(finalDamage - armorFlat);
        finalDamage *= (100 - armorPercent) / 100;
    }

    finalDamage = Math.max(Math.round(finalDamage), 0);
    return { baseDamage, finalDamage, finalDamageType };
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
        let ddSteps = [];
        let actualRepeats = 0;
        let tempHp = target.stats.hp;
        let subTypeFinal = 'no_dmg';
        let targetKilled = false;

        let isLethal = hasActiveProperty(payload, 'prop_lethal');
        let causesStun = hasActiveProperty(payload, 'prop_stuns');
        let shouldStun = causesStun && (!evalRes.hasForcedRolls || !evalRes.targetPassedChecks);

        // Lethal attacks bypass Death's Door protections entirely
        const targetHasDD = target.hasDeathsDoor && !isLethal;

        for (let i = 0; i < repeats; i++) {
            // Original damage computation & mitigation routed through dedicated helper
            const dmgResult = calculateActualDamage(attacker, target, payload, rollData);
            let damage = dmgResult.baseDamage;
            let damageAfterArmor = dmgResult.finalDamage;
            let survivedThisStep = false;
            
            if (damageAfterArmor > 0) subTypeFinal = finalDamageType;

            if (damage > 0) {
                // Check Death's Door BEFORE subtracting HP if already at or below 0
                if (targetHasDD && tempHp <= 0 && damageAfterArmor > 0) {
                    const ddResult = rollDeathsDoor(target);
                    // Add Death's Door roll directly to the defender's standalone pillar to broadcast uniformly with Hit checks
                    evalRes.rolls.defenderSingleRolls.push(ddResult.roll);

                    if (!ddResult.survived) {
                        tempHp = 0; 
                        targetKilled = true;
                    } else {
                        survivedThisStep = true;
                    }
                } 
                
                // If character didn't die from a failed DD roll above, subtract HP normally
                if (!targetKilled) {
                    tempHp = Math.round(tempHp - damageAfterArmor); 

                    if (!targetHasDD && tempHp <= 0 && damageAfterArmor > 0) {
                        tempHp = 0; 
                        targetKilled = true;
                    }
                }
            }
            
            stepValues.push(tempHp);
            deadSteps.push(targetKilled);
            ddSteps.push(survivedThisStep);
            actualRepeats++;
            
            if (targetKilled) break; // Break out of repeat loop immediately upon actual death
        }
        
        // Broadcast the full action dynamically mapping the Three Pillars layout BEFORE visual HP drop
        if (evalRes.rolls.attackerSingleRolls.length > 0 || evalRes.rolls.opposedRolls.length > 0 || evalRes.rolls.defenderSingleRolls.length > 0) {
            syncAddRollEvent(buildRollEvent(attacker, target, evalRes.rolls, payload, skipSync));
        }

        // Push the entire sequence calculation to all clients simultaneously to drive UI identically
        executeSafely(() => syncPlayActionSequence({ targetId: target.id, actionType: 'damage', subType: subTypeFinal, repeats: actualRepeats, stepValues: stepValues, deadSteps: deadSteps, ddSteps: ddSteps, stepId: payload.stepId, isAuto: skipSync, isStunned: shouldStun }));

        // Wait exactly long enough for the broadcast sequence to finish visually before unlocking the pipeline
        await delay((actualRepeats * 300) + 100);

        // Ensure state is perfectly finalized locally to prevent edge-case de-syncs if network lagged
        if (stepValues.length > 0) {
            // Pull fresh reference to prevent overwriting updates that occurred during the delay
            const freshTarget = activeCharacters.find(c => c.id === target.id);
            if (freshTarget) {
                freshTarget.stats.hp = stepValues[stepValues.length - 1];
                if (targetKilled) {
                    freshTarget.isDead = true;
                    freshTarget.isStunned = false;
                    // Clean up effects targeting this dead character
                    executeSafely(() => removeEffectsForTarget(freshTarget.uniqueName));
                } else if (shouldStun) {
                    freshTarget.isStunned = true;
                }
                if (!skipSync) executeSafely(() => syncUpdateCombatant(freshTarget)); 
            }
        }
    } else {
        // Broadcast Dodge/Resist event safely
        if (evalRes.rolls.attackerSingleRolls.length > 0 || evalRes.rolls.opposedRolls.length > 0 || evalRes.rolls.defenderSingleRolls.length > 0) {
            syncAddRollEvent(buildRollEvent(attacker, target, evalRes.rolls, payload, skipSync));
        }

        syncPlayActionSequence({ targetId: target.id, actionType: 'damage', subType: evalRes.subType || 'dodge', repeats: 1, stepId: payload.stepId, isAuto: skipSync });
        await delay(400); 
    }
    
    return evalRes.success;
}

// Core function preparing heal steps and compiling payload for remote network playback
async function resolveHealAction(combatant, payload, attacker = null, skipSync = false, isStunned = false) {
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

    if (stepValues.length > 0) {
        syncPlayActionSequence({ targetId: combatant.id, actionType: 'heal', subType: type, repeats: stepValues.length, stepValues: stepValues, stepId: stepId, isAuto: skipSync, isStunned: isStunned });
        await delay((stepValues.length * 300) + 100);
    }

    // Ensure state is perfectly finalized locally
    if (stepValues.length > 0) {
        // Pull fresh reference
        const freshCombatant = activeCharacters.find(c => c.id === combatant.id);
        if (freshCombatant) {
            freshCombatant.stats.hp = stepValues[stepValues.length - 1];
            if (!skipSync) syncUpdateCombatant(freshCombatant); 
        }
    }
}

// Prepares armor modifications steps and delegates network playback execution sequentially bridging multiple target properties 
async function resolveArmorAction(combatant, payload, attacker = null, skipSync = false, isStunned = false) {
    let evalContext = attacker || combatant;
    let freshCombatant = activeCharacters.find(c => c.id === combatant.id);
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
        isMixedSound,
        isStunned: isStunned
    });
    await delay((repeats * 300) + 100);

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