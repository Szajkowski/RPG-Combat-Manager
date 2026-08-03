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

// --- ACTION PIPELINE CORE ENGINE ---

// Initializes the action queue and starts processing the first step
function startActionPipeline(abilityUser, actions, ability, initialRollData = null, originEvent = null) {
    actionPipelineQueue = JSON.parse(JSON.stringify(actions));
    
    const startX = originEvent ? originEvent.clientX : window.innerWidth / 2;
    const startY = originEvent ? originEvent.clientY : window.innerHeight / 2;
    
    if (originEvent) {
        lastMouseX = startX;
        lastMouseY = startY;
    }

    currentPipelineContext = { abilityUser, ability, startX, startY };
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
        currentPipelineContext = null;
        return; 
    }

    const currentAction = actionPipelineQueue[0];
    currentActionTargets = []; // Reset targets list for the new action block
    currentAction.stepId = 'step-' + Date.now() + '-' + Math.random().toString(36).slice(2, 7); 

    const targetType = currentAction.target;

    // Handle auto-executing actions that require no manual cursor input
    if (['self', 'team_enemy', 'team_ally', 'target_all', 'all'].includes(targetType)) {
        const startTime = Date.now();
        await executeAutoAction(currentAction, targetType);
        
        // Guarantee at least a 400ms spacing between independent automated sequence steps preventing overlaps
        const elapsed = Date.now() - startTime;
        if (elapsed < 400) {
            await delay(400 - elapsed);
        }
        
        actionPipelineQueue.shift(); // Move to the next action
        processNextPipelineAction(); 
    } else {
        // Handle actions requiring manual targeting (single, multi). 
        // Origin coordinates (startX/Y) strictly anchor to the initial button click.
        startTargetingMode(currentPipelineContext.abilityUser, currentAction.type, currentAction, currentPipelineContext.startX, currentPipelineContext.startY, true);
    }
}

// Resolves pipeline actions aimed at self or entire teams simultaneously
async function executeAutoAction(action, targetType) {
    const { abilityUser } = currentPipelineContext;

    let targets = [];
    if (targetType === 'self') targets = [abilityUser];
    else if (targetType === 'team_enemy') targets = activeCombatants.filter(c => c.team !== abilityUser.team && !c.isDead);
    else if (targetType === 'team_ally') targets = activeCombatants.filter(c => c.team === abilityUser.team && !c.isDead);
    else if (targetType === 'all' || targetType === 'target_all') targets = activeCombatants.filter(c => !c.isDead);

    // Parallel execution explicitly maintained to trigger unified broadcasting animations.
    // The opposed roll caching resolves synchronously within processActionExecution before the first await block is hit.
    await Promise.all(targets.map(target => processActionExecution(abilityUser, target, action, true)));

    // Send a single batch update to sync all modified combatants at once
    if (targets.length > 0) {
        const updatedCombatants = targets.map(t => activeCombatants.find(c => c.id === t.id)).filter(Boolean);
        if (typeof syncUpdateCombatantsBatch === 'function') {
            syncUpdateCombatantsBatch(updatedCombatants);
        }
    }
}

// --- TARGETING UI AND ENGINE ---

// Universal targeting engine entry point
function startTargetingMode(attacker, actionType, payload, startX, startY, isPipeline = false) {
    if (!payload.stepId) payload.stepId = 'step-' + Date.now() + '-' + Math.random().toString(36).slice(2, 7);
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

    // Immediately evaluate the target under the cursor on pipeline stage changes to avoid requiring mouse movement
    if (isPipeline) {
        const elementUnderCursor = document.elementFromPoint(lastMouseX, lastMouseY);
        const tokenUnderCursor = elementUnderCursor ? elementUnderCursor.closest('.character-token:not(.dead)') : null;
        if (tokenUnderCursor) {
            handleTargetingHoverEnter(null, tokenUnderCursor.dataset.id);
        }
    }
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
            actionName = action.damageType === 'mag' ? (t('action_dmg_mag')) : (action.damageType === 'pierce' ? (t('action_dmg_pierce')) : (t('action_dmg_phys')));
        } else if (action.type === 'heal') {
            actionName = action.healType === 'threshold' ? (t('action_heal_threshold')) : (t('action_heal'));
        } else if (action.type === 'armor') {
            actionName = action.armorType === 'mag' ? (t('action_armor_mag')) : (t('action_armor_phys'));
        } else if (action.type === 'condition') {
            actionName = t('action_condition');
        }

        let targetsText = '';
        if (action.target === 'multi') {
            const maxTargets = action.possibleTargets || 1;
            const currentCount = currentActionTargets.length;
            targetsText = `${t('selected_targets')}: ${currentCount}/${maxTargets}`;
        }

        // Distinctly styled HTML block for clear readability and strict logical separation
        cancelHint.innerHTML = `
            <div style="margin-bottom: 4px;">
                <span style="color: #6272a4; font-weight: bold;">${t('action') || 'Akcja'}:</span> 
                <span style="color: #f8f8f2;">${actionName}</span>
            </div>
            ${targetsText ? `<div style="font-size: 0.8rem; color: #8be9fd; margin-bottom: 4px;">${targetsText}</div>` : ''}
            <div style="font-size: 0.75rem; color: #6272a4; border-top: 1px solid #44475a; padding-top: 4px; margin-top: 4px;">
                ${t('targeting_skip_hint')}
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

    const chance = calculateActionSuccessChance(targetingData.attacker, target, targetingData.payload);
    if (chance !== 100 || targetingData.payload.type === 'damage') {
        tooltipText.textContent = `${t('success_chance')} ${chance}%`;
    } else {
        tooltipText.textContent = target.uniqueName;
    }
}

function handleTargetingHoverLeave(e) {
    const tooltipText = document.querySelector('#targeting-tooltip .chance-text');
    if (tooltipText) tooltipText.textContent = ''; 
}

// Core execution router for user-initiated clicks during targeting
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

    // Step 2: Route through unified resolution logic enforcing Hit/Resist mathematical constraints
    await processActionExecution(attacker, target, payload, false); // Single clicks still send individual syncs

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

// Master Handler evaluating Hit and Defensive Mechanics (forceRoll, forceRollVS)
// Packages the dice pool and dispatches to specific execution modules
// Added skipSync flag to prevent spamming server on multi-target grouped actions
async function processActionExecution(attacker, target, payload, skipSync = false) {
    let evalRes = evaluateActionSuccessAndResistance(attacker, target, payload, consumeInitialRoll);
    let evalData = { hasForcedRolls: evalRes.hasForcedRolls, targetPassedChecks: evalRes.targetPassedChecks };
    
    if (payload.type === 'damage') {
        // Damage handler natively appends Death's Door checks inside the same visual package block
        const hitSuccess = await resolveDamageAction(attacker, target, payload, evalRes, skipSync);
        if (hitSuccess && payload.conditions) {
            processAndSendConditions(attacker.uniqueName, target.uniqueName, payload, payload.name || "Effect", "target", evalData);
        }
        return hitSuccess;
    } else {
        // Broadcast combined generic rolls beforehand since non-damage elements do not handle Death's Door math
        if (evalRes.rolls.attackerSingleRolls.length > 0 || evalRes.rolls.opposedRolls.length > 0 || evalRes.rolls.defenderSingleRolls.length > 0) {
            syncAddRollEvent(buildRollEvent(attacker, target, evalRes.rolls, payload, skipSync));
        }
        
        if (evalRes.success) {
            if (payload.type === 'heal') await resolveHealAction(target, payload.healType, payload.value, payload.repeat, attacker, skipSync, payload.stepId);
            else if (payload.type === 'armor') await resolveArmorAction(target, payload.armorType, payload.value, String(payload.value).includes('%'), payload.repeat, attacker, skipSync, payload.stepId);
            
            // Attach explicitly linked target conditions
            if (payload.conditions) {
                processAndSendConditions(attacker.uniqueName, target.uniqueName, payload, payload.name || "Effect", "target", evalData);
            }
            return true;
        } else {
            // Execution resisted, broadcast negative visual feedback and exit
            if (typeof syncPlayActionSequence === 'function') {
                syncPlayActionSequence({ targetId: target.id, actionType: payload.type, subType: evalRes.subType || 'dodge', repeats: 1, stepId: payload.stepId, isAuto: skipSync });
            }
            await delay(400);
            return false;
        }
    }
}