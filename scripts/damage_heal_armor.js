let targetingData = null; // Stores information about the ongoing targeted action
const tokenControllers = new Map(); // References for strict click listener cleanup

// Stores the last known cursor coordinates updated specifically via specific events
// Eliminates the need for a global, background-running mousemove listener
let lastMouseX = window.innerWidth / 2;
let lastMouseY = window.innerHeight / 2;

// --- NEW GLOBAL PIPELINE STATE VARIABLES ---
let actionPipelineQueue = [];
let currentPipelineContext = null;
let currentActionTargets = []; // Stores IDs of targets clicked in the current action step to prevent multi-target duplicates
let initialPipelineRoll = null; // Holds the ability initiation roll to be attached to the first log

// Helper for asynchronous pauses between repeated actions. Used to block pipeline progression during WS sequences.
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

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

    if (event) {
        lastMouseX = event.clientX;
        lastMouseY = event.clientY;
    }

    const isPercMode = damageInput.closest('.complex-control').querySelector('.complex-toggle').classList.contains('perc-mode');
    
    startTargetingMode(combatant, 'damage', { value: damageStr, dmgType: type, type: 'damage', isPercMode: isPercMode, target: 'single' }, lastMouseX, lastMouseY);
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

    if (event) {
        lastMouseX = event.clientX;
        lastMouseY = event.clientY;
    }

    const isPercMode = healInput.closest('.complex-control').querySelector('.complex-toggle').classList.contains('perc-mode');
    const finalHealStr = (!healValueStr.endsWith('%') && isPercMode) ? `${healValueStr}%` : healValueStr;

    if (type === 'group') {
        const team = combatant.team;
        activeCombatants.filter(c => c.team === team).forEach(member => {
            healOneCharacter(member, type, finalHealStr, 1);
        });
        healInput.value = ''; 
    } else {
        startTargetingMode(combatant, 'heal', { value: finalHealStr, healType: type, type: 'heal', target: 'single' }, lastMouseX, lastMouseY);
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

    if (event) {
        lastMouseX = event.clientX;
        lastMouseY = event.clientY;
    }

    const isPercMode = armorInput.closest('.complex-control').querySelector('.complex-toggle').classList.contains('perc-mode');
    const isPercentage = valueStr.endsWith('%') || isPercMode;
    const parsedValue = parseInt(valueStr);
    if (isNaN(parsedValue)) return;
    
    startTargetingMode(combatant, 'armor', { value: parsedValue, armorType: type, type: 'armor', isPercentage: isPercentage, target: 'single' }, lastMouseX, lastMouseY);
}

// --- ACTION PIPELINE CORE ENGINE ---

// Initializes the action queue and starts processing the first step
function startActionPipeline(caster, actions, ability, initialRollData = null, originEvent = null) {
    actionPipelineQueue = JSON.parse(JSON.stringify(actions));
    
    const startX = originEvent ? originEvent.clientX : window.innerWidth / 2;
    const startY = originEvent ? originEvent.clientY : window.innerHeight / 2;
    
    if (originEvent) {
        lastMouseX = startX;
        lastMouseY = startY;
    }

    currentPipelineContext = { caster, ability, startX, startY };
    initialPipelineRoll = initialRollData;
    
    processNextPipelineAction();
}

// Consumes the initial roll exactly once so it doesn't duplicate in subsequent actions
function consumeInitialRoll() {
    if (initialPipelineRoll) {
        const roll = initialPipelineRoll;
        initialPipelineRoll = null;
        return roll;
    }
    return null;
}

// Reads the next action from the queue and handles auto-targets or initiates manual targeting UI
async function processNextPipelineAction() {
    if (actionPipelineQueue.length === 0) {
        // Entire Action Pipeline finished. Clear visual dimming states immediately.
        clearTargetingState();
        
        // Sync the caster strictly at the end to broadcast finalized HP and Cooldown.
        if (currentPipelineContext && currentPipelineContext.caster) {
            syncUpdateCombatant(currentPipelineContext.caster);
        }
        currentPipelineContext = null;
        return; 
    }

    const currentAction = actionPipelineQueue[0];
    currentActionTargets = []; // Reset targets list for the new action block

    const targetType = currentAction.target;

    // Handle auto-executing actions that require no manual cursor input
    if (['self', 'team_enemy', 'team_ally', 'target_all', 'all'].includes(targetType)) {
        await executeAutoAction(currentAction, targetType);
        actionPipelineQueue.shift(); // Move to the next action
        processNextPipelineAction(); 
    } else {
        // Handle actions requiring manual targeting (single, multi). 
        // Origin coordinates (startX/Y) strictly anchor to the initial button click, ensuring the golden arrow points from the source visually.
        startTargetingMode(currentPipelineContext.caster, currentAction.type, currentAction, currentPipelineContext.startX, currentPipelineContext.startY, true);
    }
}

// Resolves pipeline actions aimed at self or entire teams instantly
async function executeAutoAction(action, targetType) {
    const { caster } = currentPipelineContext;

    // Fast-track conditions applying directly to an entire group without looping individually
    if (action.type === 'condition') {
        let rollObj = consumeInitialRoll();
        if (rollObj) {
            syncAddRollEvent({
                id: 'roll-' + Date.now() + '-' + Math.random().toString(36).substr(2, 5),
                isTargeted: false, 
                combatantId: caster.id,
                combatantName: caster.uniqueName,
                combatantTeam: caster.team,
                rolls: [rollObj]
            });
        }
        processAndSendConditions(caster.uniqueName, targetType, action, action.name || "Effect", "self");
        return; // Break out, no target mapping required for group-level conditions
    }

    // Normal multi-resolution logic for HP/Armor tweaks
    let targets = [];
    if (targetType === 'self') targets = [caster];
    else if (targetType === 'team_enemy') targets = activeCombatants.filter(c => c.team !== caster.team && !c.isDead);
    else if (targetType === 'team_ally') targets = activeCombatants.filter(c => c.team === caster.team && !c.isDead);
    else if (targetType === 'all' || targetType === 'target_all') targets = activeCombatants.filter(c => !c.isDead);

    await Promise.all(targets.map(async (target) => {
        let rollObj = consumeInitialRoll();
        if (rollObj && (action.type === 'heal' || action.type === 'armor')) {
            syncAddRollEvent({
                id: 'roll-' + Date.now() + '-' + Math.random().toString(36).substr(2, 5),
                isTargeted: true,
                attackerName: caster.uniqueName,
                attackerTeam: caster.team,
                defenderName: target.uniqueName,
                defenderTeam: target.team,
                attackerSingleRolls: [rollObj],
                opposedRolls: [],
                defenderSingleRolls: []
            });
        }

        let hitSuccess = true;

        if (action.type === 'damage') hitSuccess = await resolveDamageAction(caster, target, action);
        else if (action.type === 'heal') await healOneCharacter(target, action.healType || 'normal', action.value, action.repeat, caster);
        else if (action.type === 'armor') await applyArmorChange(target, action.armorType || 'phys', action.value, String(action.value).includes('%'), action.repeat, caster);
        
        // Attach conditions inherently bound to this auto-action ONLY if the resolution succeeded (hits)
        if (hitSuccess && action.conditions) {
            processAndSendConditions(caster.uniqueName, target.uniqueName, action, action.name || "Effect", "target");
        }
    }));
}

// --- TARGETING UI AND ENGINE ---

// Universal targeting engine entry point
function startTargetingMode(attacker, actionType, payload, startX, startY, isPipeline = false) {
    targetingData = { attacker, actionType, payload, startX, startY, isPipeline };
    
    document.body.classList.add('targeting-mode');
    
    const overlay = document.getElementById('targeting-overlay');
    const svg = document.getElementById('targeting-svg');
    const tooltip = document.getElementById('targeting-tooltip');
    
    if (overlay) overlay.style.display = 'block';
    if (svg) svg.style.display = 'block';
    if (tooltip) {
        tooltip.style.display = 'flex';
        // Immediately pin to cursor utilizing last known location, ensuring instant visual feedback
        tooltip.style.left = (lastMouseX + 15) + 'px';
        tooltip.style.top = (lastMouseY + 15) + 'px';
        updateTargetingTooltip(); // Render the dynamic pipeline tooltip texts
    }
    
    // Instantly draw the curved path from source to current cursor location to avoid zero-movement delays
    const path = document.getElementById('targeting-path');
    if (path) {
        const cpX = startX + (lastMouseX - startX) / 2;
        const cpY = Math.min(startY, lastMouseY) - 60;
        path.setAttribute('d', `M ${startX} ${startY} Q ${cpX} ${cpY} ${lastMouseX} ${lastMouseY}`);
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
}

function updateTargetingTooltip() {
    const tooltipText = document.querySelector('#targeting-tooltip .chance-text');
    const cancelHint = document.querySelector('#targeting-tooltip .cancel-hint');
    if (!tooltipText || !cancelHint) return;

    tooltipText.innerHTML = ''; // Clear hover target specifics

    if (targetingData && targetingData.isPipeline) {
        const action = targetingData.payload;
        let actionName = action.type;
        
        if (action.type === 'damage') {
            actionName = action.dmgType === 'mag' ? (t('action_dmg_mag') || 'Zadanie obrażeń magicznych') : (action.dmgType === 'pierce' ? (t('action_dmg_pierce') || 'Zadanie obrażeń przebijających') : (t('action_dmg_phys') || 'Zadanie obrażeń fizycznych'));
        } else if (action.type === 'heal') {
            actionName = action.healType === 'threshold' ? (t('action_heal_threshold') || 'Leczenie do progu') : (t('action_heal') || 'Leczenie');
        } else if (action.type === 'armor') {
            actionName = action.armorType === 'mag' ? (t('action_armor_mag') || 'Dodanie pancerza magicznego') : (t('action_armor_phys') || 'Dodanie pancerza fizycznego');
        } else if (action.type === 'condition') {
            actionName = t('action_condition') || 'Nałożenie stanu';
        }

        let targetsText = '';
        if (action.target === 'multi') {
            const maxTargets = action.possibleTargets || 1;
            const currentCount = currentActionTargets.length;
            targetsText = `${t('selected_targets') || 'Wybrane cele'}: ${currentCount}/${maxTargets}`;
        }

        // Distinctly styled HTML block for clear readability
        cancelHint.innerHTML = `
            <div style="margin-bottom: 4px;">
                <span style="color: #6272a4; font-weight: bold;">${t('action') || 'Akcja'}:</span> 
                <span style="color: #f8f8f2;">${actionName}</span>
            </div>
            ${targetsText ? `<div style="font-size: 0.8rem; color: #8be9fd; margin-bottom: 4px;">${targetsText}</div>` : ''}
            <div style="font-size: 0.75rem; color: #6272a4; border-top: 1px solid #44475a; padding-top: 4px; margin-top: 4px;">
                ${t('targeting_skip_hint') || 'PPM aby pominąć'}
            </div>
        `;
    } else {
        cancelHint.textContent = t('targeting_cancel_hint'); // Regular cancellation hint
    }
}

// Cleanly removes all DOM manipulations and restores original layout
function clearTargetingState() {
    document.body.classList.remove('targeting-mode');
    
    // Reset visually dimmed targets
    document.querySelectorAll('.character-token').forEach(t => {
        t.style.opacity = '';
        t.style.pointerEvents = '';
    });
    
    const overlay = document.getElementById('targeting-overlay');
    const svg = document.getElementById('targeting-svg');
    const tooltip = document.getElementById('targeting-tooltip');
    
    if (overlay) overlay.style.display = 'none';
    if (svg) svg.style.display = 'none';
    if (tooltip) tooltip.style.display = 'none';
    
    document.removeEventListener('mousemove', handleTargetingMove);
    document.removeEventListener('contextmenu', cancelTargetingMode);
    document.removeEventListener('keydown', handleTargetingKeys);
    
    tokenControllers.forEach((listeners, token) => {
        token.removeEventListener('mouseenter', listeners.enter);
        token.removeEventListener('mouseleave', listeners.leave);
        token.removeEventListener('click', listeners.click, { capture: true });
    });
    tokenControllers.clear();
    targetingData = null;
}

// Suspends targeting listeners and hides cursor elements, but keeps the overlay background active to prevent flickering between actions
function suspendTargetingState() {
    // Reset visually dimmed targets so next steps start with a clean board
    document.querySelectorAll('.character-token').forEach(t => {
        t.style.opacity = '';
        t.style.pointerEvents = '';
    });

    const svg = document.getElementById('targeting-svg');
    const tooltip = document.getElementById('targeting-tooltip');
    
    if (svg) svg.style.display = 'none';
    if (tooltip) tooltip.style.display = 'none';
    
    document.removeEventListener('mousemove', handleTargetingMove);
    document.removeEventListener('contextmenu', cancelTargetingMode);
    document.removeEventListener('keydown', handleTargetingKeys);
    
    tokenControllers.forEach((listeners, token) => {
        token.removeEventListener('mouseenter', listeners.enter);
        token.removeEventListener('mouseleave', listeners.leave);
        token.removeEventListener('click', listeners.click, { capture: true });
    });
    tokenControllers.clear();
}

function cancelTargetingMode(e) {
    if (e) {
        e.preventDefault(); 
        e.stopPropagation();
    }
    
    const wasPipeline = targetingData && targetingData.isPipeline;
    clearTargetingState();

    if (wasPipeline) {
        // Discard the initial roll if we skipped the first action entirely
        consumeInitialRoll();
        
        // Advance pipeline to the next action
        actionPipelineQueue.shift();
        processNextPipelineAction();
    }
}

function handleTargetingKeys(e) {
    if (e.key === 'Escape') cancelTargetingMode(e);
}

function handleTargetingMove(e) {
    if (!targetingData) return;
    
    const { startX, startY } = targetingData;
    
    lastMouseX = e.clientX;
    lastMouseY = e.clientY;
    
    // Calculate arrow path (curved upwards) using the locked origin coordinates
    const path = document.getElementById('targeting-path');
    if (path) {
        const cpX = startX + (lastMouseX - startX) / 2;
        const cpY = Math.min(startY, lastMouseY) - 60; // Slight upward curve
        path.setAttribute('d', `M ${startX} ${startY} Q ${cpX} ${cpY} ${lastMouseX} ${lastMouseY}`);
    }

    // Position tooltip closely tracking the cursor
    const tooltip = document.getElementById('targeting-tooltip');
    if (tooltip) {
        tooltip.style.left = (lastMouseX + 15) + 'px';
        tooltip.style.top = (lastMouseY + 15) + 'px';
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
    if (tooltipText) tooltipText.textContent = ''; 
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
async function executeTargetedAction(targetId) {
    const target = activeCombatants.find(c => c.id === targetId);
    if (!target || target.isDead) {
        if (!targetingData.isPipeline) cancelTargetingMode();
        return;
    }

    const { attacker, actionType, payload, isPipeline } = targetingData;
    let isSingle = isPipeline && payload.target === 'single';
    let isLastMulti = false;

    if (isPipeline && payload.target === 'multi') {
        // Strictly prevent clicking the exact same target multiple times within a single 'multi' action block
        if (currentActionTargets.includes(targetId)) return;
        currentActionTargets.push(targetId);
        
        // Visually dim the selected target so the user knows they can't click it again for this multi-step
        const token = document.querySelector(`.character-token[data-id="${targetId}"]`);
        if (token) {
            token.style.opacity = '0.4';
            token.style.pointerEvents = 'none';
        }
        
        isLastMulti = currentActionTargets.length >= (payload.possibleTargets || 1);
    }

    // Step 1: Manage UI State immediately (suspend interaction if processing pipeline, or close entirely if done)
    if (isSingle || isLastMulti) {
        suspendTargetingState(); 
    } else if (!isPipeline) {
        clearTargetingState(); // Prevent further clicks on generic legacy buttons
    } else if (isPipeline && payload.target === 'multi') {
        updateTargetingTooltip(); // Visually update target counts immediately without suspending
    }

    // Step 2: Asynchronous Execution (blocking progression while sequence broadcasts map the visual feedback)
    if (actionType === 'damage') {
        const hitSuccess = await resolveDamageAction(attacker, target, payload);
        if (hitSuccess && payload.conditions) {
            processAndSendConditions(attacker.uniqueName, target.uniqueName, payload, payload.name || "Effect", "target");
        }
    } else if (actionType === 'heal') {
        // Ensure initial pipeline roll is appended properly if the very first action is a heal
        let rollObj = consumeInitialRoll();
        if (rollObj) {
            syncAddRollEvent({
                id: 'roll-' + Date.now() + '-' + Math.random().toString(36).substr(2, 5),
                isTargeted: true, attackerName: attacker.uniqueName, attackerTeam: attacker.team, defenderName: target.uniqueName, defenderTeam: target.team,
                attackerSingleRolls: [rollObj], opposedRolls: [], defenderSingleRolls: []
            });
        }
        await healOneCharacter(target, payload.healType || 'normal', payload.value, payload.repeat, attacker);
        if (payload.conditions) processAndSendConditions(attacker.uniqueName, target.uniqueName, payload, payload.name || "Effect", "target");
    } else if (actionType === 'armor') {
        let rollObj = consumeInitialRoll();
        if (rollObj) {
            syncAddRollEvent({
                id: 'roll-' + Date.now() + '-' + Math.random().toString(36).substr(2, 5),
                isTargeted: true, attackerName: attacker.uniqueName, attackerTeam: attacker.team, defenderName: target.uniqueName, defenderTeam: target.team,
                attackerSingleRolls: [rollObj], opposedRolls: [], defenderSingleRolls: []
            });
        }
        await applyArmorChange(target, payload.armorType || 'phys', payload.value, String(payload.value).includes('%'), payload.repeat, attacker);
        if (payload.conditions) processAndSendConditions(attacker.uniqueName, target.uniqueName, payload, payload.name || "Effect", "target");
    }

    // Step 3: Pipeline progression management
    if (isSingle || isLastMulti) {
        actionPipelineQueue.shift();
        processNextPipelineAction();
    } else if (!isPipeline) {
        // Legacy input clearing for generic non-pipeline UI buttons
        const damageInput = document.querySelector('.damage-input');
        if (damageInput) damageInput.value = '';
        const healInput = document.querySelector('.heal-input');
        if (healInput) healInput.value = '';
        const armorInput = document.querySelector('.armor-input');
        if (armorInput) armorInput.value = '';
    }
}

// Specific logic block evaluating attack rolls and compiling payload for remote network playback
async function resolveDamageAction(attacker, target, payload) {
    const { value: damageStr, type, isPercMode } = payload;
    let isHit = false;
    const repeats = payload.repeat || 1;

    // The Three Pillars structure for narrative flow
    let attackerSingleRolls = [];
    let opposedRolls = [];
    let defenderSingleRolls = [];

    // Safely insert the main ability roll at the beginning of the FIRST executed attack action
    let initRoll = consumeInitialRoll();
    if (initRoll) {
        attackerSingleRolls.push(initRoll);
    }

    // Completely bypasses rolls if the outcome is statistically guaranteed
    const hitChance = calculateHitChance(attacker, target);

    if (attacker.id === target.id || hitChance === 100) {
        isHit = true;
    } else if (hitChance === 0) {
        isHit = false;
    } else {
        const opposed = performOpposedRoll(attacker, target, 'accuracy', 'agility');
        isHit = opposed.isSuccess;
        opposedRolls.push({ attRoll: opposed.attRoll, defRoll: opposed.defRoll });
    }

    let finalDmgType = payload.dmgType || 'phys'; // Fixed fallback explicitly referencing dmgType from JSONs over generic UI

    if (isHit) {
        let stepValues = [];
        let deadSteps = [];
        let actualRepeats = 0;
        let tempHp = target.stats.hp;
        let subTypeFinal = 'no_dmg';
        let targetKilled = false;

        for (let i = 0; i < repeats; i++) {
            // ORIGINAL DAMAGE COMPUTATION & MITIGATION
            let damage = 0;
            let effectiveDamageStr = String(damageStr);
            
            // Only resolve percentage if strictly passed from old UI button or explicitly suffixed
            if (isPercMode || effectiveDamageStr.endsWith('%')) { 
                const percent = parseInt(effectiveDamageStr.replace('%', ''));
                damage = Math.ceil((target.stats.maxHp * percent) / 100); 
            } else {
                damage = getFormulaValue(effectiveDamageStr, attacker);
            }

            let damageAfterArmor = damage;

            if (finalDmgType === 'phys' || finalDmgType === 'mag') {
                const armorFlat = parseInt(finalDmgType === 'phys' ? target.stats.physArmor : target.stats.magArmor) || 0;
                const armorPercent = parseInt(finalDmgType === 'phys' ? target.stats.physArmorMod : target.stats.magArmorMod) || 0;

                damageAfterArmor = Math.ceil(damageAfterArmor - armorFlat);
                damageAfterArmor *= (100 - armorPercent) / 100;
            }

            damageAfterArmor = Math.max(Math.round(damageAfterArmor), 0);
            
            if (damageAfterArmor > 0) subTypeFinal = finalDmgType;

            if (damage > 0) {
                // Check Death's Door BEFORE subtracting HP if already at or below 0
                if (target.hasDeathsDoor && tempHp <= 0 && damageAfterArmor > 0) {
                    const ddResult = rollDeathsDoor(target);
                    // Add Death's Door roll directly to the defender's standalone pillar
                    defenderSingleRolls.push(ddResult.roll);

                    if (!ddResult.survived) {
                        tempHp = 0; // Strictly clamp to 0 if the character actually dies
                        targetKilled = true;
                    }
                } 
                
                // If character didn't die from a failed DD roll above, subtract HP normally
                if (!targetKilled) {
                    tempHp = Math.round(tempHp - damageAfterArmor); // HP can freely go negative

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

        // Push the entire sequence calculation to all clients simultaneously to drive UI identically
        if (typeof syncPlayActionSequence === 'function') {
            syncPlayActionSequence({ targetId: target.id, actionType: 'damage', subType: subTypeFinal, repeats: actualRepeats, stepValues: stepValues, deadSteps: deadSteps });
        }
        
        // Wait exactly long enough for the broadcast sequence to finish visually before unlocking the pipeline
        await delay((actualRepeats * 300) + 100);
        
        // Ensure state is perfectly finalized locally to prevent edge-case de-syncs if network lagged
        if (stepValues.length > 0) {
            target.stats.hp = stepValues[stepValues.length - 1];
            if (targetKilled) target.isDead = true;
        }
        syncUpdateCombatant(target); 
    } else {
        // Broadcast Dodge event
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

        if (typeof syncPlayActionSequence === 'function') {
            syncPlayActionSequence({ targetId: target.id, actionType: 'damage', subType: 'dodge', repeats: 1 });
        }
        await delay(400); // Allow minimal time for dodge audio to play
    }
    
    return isHit;
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
        roll: { stat: "deaths_door", result: rollResult, color: survived ? '#50fa7b' : '#ff5555' }
    };
}

// Core function preparing heal steps and compiling payload for remote network playback
// Utilizes attacker context if provided, otherwise falls back to the target combatant's stats
async function healOneCharacter(combatant, type, healValueStr, repeats = 1, attacker = null) {
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
        syncPlayActionSequence({ targetId: combatant.id, actionType: 'heal', subType: type, repeats: stepValues.length, stepValues: stepValues });
        await delay((stepValues.length * 300) + 100);
    }

    // Ensure state is perfectly finalized locally
    if (stepValues.length > 0) {
        combatant.stats.hp = stepValues[stepValues.length - 1];
    }
    syncUpdateCombatant(combatant); 
}

// Prepares armor modifications steps and delegates network playback execution
// Utilizes attacker context if provided, otherwise falls back to the target combatant's stats
async function applyArmorChange(combatant, type, parsedValue, isPercentage, repeats = 1, attacker = null) {
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
        syncPlayActionSequence({ targetId: combatant.id, actionType: 'armor', subType: type, repeats: repeats, isAdding: isAdding, stepValues: stepValues });
        await delay((repeats * 300) + 100);
    }
    
    // Ensure state is perfectly finalized locally
    if (stepValues.length > 0) {
        const finalVal = stepValues[stepValues.length - 1];
        if (type === 'phys') {
            if (isPercentage) combatant.stats.physArmorMod = finalVal;
            else combatant.stats.physArmor = finalVal;
        } else {
            if (isPercentage) combatant.stats.magArmorMod = finalVal;
            else combatant.stats.magArmor = finalVal;
        }
    }

    syncUpdateCombatant(combatant); 
}