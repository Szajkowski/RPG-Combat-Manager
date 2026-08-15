let targetingData = null; // Stores information about the ongoing targeted action
const tokenControllers = new Map(); // References for strict click listener cleanup

// --- NEW GLOBAL PIPELINE STATE VARIABLES ---
let actionPipelineQueue = [];
let currentPipelineContext = null;
let currentActionTargets = []; // Stores IDs of targets clicked in the current action step to prevent multi-target duplicates
let initialPipelineRoll = null; // Holds the ability initiation roll block mapped array to be attached to the first log
let isProcessingTargetClick = false; // Prevents rapidly clicking identical targets, guaranteeing state logic blocks sequentially

// Helper for asynchronous pauses between repeated actions. Used to block pipeline progression during WS sequences.
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

// Inject the UI necessary for the Targeting System dynamically
function injectTargetingUI() {
    if (!document.getElementById('targeting-overlay')) {
        const overlay = document.createElement('div');
        overlay.id = 'targeting-overlay';
        document.body.appendChild(overlay); 
    }

    if (!document.getElementById('targeting-svg')) {
        const svgHTML = `
            <svg id="targeting-svg">
                <path id="targeting-path" fill="none" stroke="var(--theme-target)" stroke-width="4" stroke-dasharray="10, 10" />
            </svg>
            <div id="targeting-tooltip">
                <div class="chance-text"></div>
                <div class="cancel-hint" data-i18n="targeting_cancel_hint"></div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', svgHTML);
    }
    
    // Inject the new DOM-based Crosshair
    if (!document.getElementById('targeting-crosshair')) {
        const crosshair = document.createElement('div');
        crosshair.id = 'targeting-crosshair';
        
        // Injecting SVG directly into DOM so it can access CSS variables
        crosshair.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 36 36" width="100%" height="100%" class="dynamic-crosshair">
                <!-- Darker, thicker outline underneath -->
                <circle cx="18" cy="18" r="14" fill="none" stroke="var(--crosshair-dark, #8c7e11)" stroke-width="5" opacity="0.85"/>
                <line x1="18" y1="2" x2="18" y2="11" stroke="var(--crosshair-dark, #8c7e11)" stroke-width="5" stroke-linecap="round"/>
                <line x1="18" y1="25" x2="18" y2="34" stroke="var(--crosshair-dark, #8c7e11)" stroke-width="5" stroke-linecap="round"/>
                <line x1="2" y1="18" x2="11" y2="18" stroke="var(--crosshair-dark, #8c7e11)" stroke-width="5" stroke-linecap="round"/>
                <line x1="25" y1="18" x2="34" y2="18" stroke="var(--crosshair-dark, #8c7e11)" stroke-width="5" stroke-linecap="round"/>
                <circle cx="18" cy="18" r="2.5" fill="var(--crosshair-dark, #8c7e11)"/>

                <!-- Light, main crosshair -->
                <circle cx="18" cy="18" r="14" fill="none" stroke="var(--crosshair-light, #f1fa8c)" stroke-width="2"/>
                <line x1="18" y1="3" x2="18" y2="10" stroke="var(--crosshair-light, #f1fa8c)" stroke-width="2" stroke-linecap="round"/>
                <line x1="18" y1="26" x2="18" y2="33" stroke="var(--crosshair-light, #f1fa8c)" stroke-width="2" stroke-linecap="round"/>
                <line x1="3" y1="18" x2="10" y2="18" stroke="var(--crosshair-light, #f1fa8c)" stroke-width="2" stroke-linecap="round"/>
                <line x1="26" y1="18" x2="33" y2="18" stroke="var(--crosshair-light, #f1fa8c)" stroke-width="2" stroke-linecap="round"/>
                <circle cx="18" cy="18" r="1" fill="var(--crosshair-light, #f1fa8c)"/>
            </svg>
        `;
        
        document.body.appendChild(crosshair);
    }
}

// --- ACTION PIPELINE CORE ENGINE ---

// Initializes the action queue, maps compound roll values globally, and starts processing the first step dynamically
function startActionPipeline(abilityUser, actions, ability, initialRollData = null, originEvent = null, alreadyBroadcasted = false) {
    actionPipelineQueue = JSON.parse(JSON.stringify(actions));
    
    // Capture origin coordinates reliably to anchor the targeting line arrow
    const startX = originEvent ? originEvent.clientX : window.innerWidth / 2;
    const startY = originEvent ? originEvent.clientY : window.innerHeight / 2;

    // Capture the mathematical aggregate of the initial roll (if it exists) to dynamically substitute variables in downstream action formulas safely
    let rollTotal = 0;
    if (initialRollData && Array.isArray(initialRollData)) {
        rollTotal = initialRollData.reduce((sum, r) => sum + r.result, 0);
    } else if (initialRollData && initialRollData.result !== undefined) {
        rollTotal = initialRollData.result;
    }

    currentPipelineContext = { 
        abilityUser, 
        ability, 
        startX,
        startY,
        rollTotal,
        difficulty: ability ? (parseInt(ability.difficulty) || null) : null
    };
    
    initialPipelineRoll = alreadyBroadcasted ? null : initialRollData;
    
    processNextPipelineAction();
}

// Consumes the initial roll structure exactly once so it doesn't duplicate visually or mathematically in subsequent independent actions
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
        // Release the server lock immediately since the final action finished routing perfectly
        if (typeof syncReleaseActionLock === 'function') syncReleaseActionLock();
        return; 
    }

    const currentAction = actionPipelineQueue[0];
    
    // Validate the payload structurally before attempting to process logic
    let rollData = currentPipelineContext ? { total: currentPipelineContext.rollTotal, diff: currentPipelineContext.difficulty } : null;
    const validationError = validateActionPayload(currentAction, currentPipelineContext.abilityUser, rollData);
    
    if (validationError) {
        console.error("Action validation failed:", validationError);
        
        // Wait for the user to confirm the error dialog before skipping the action
        await showAlertDialog(validationError); 
        
        // Discard the initial roll if we skipped the first action entirely to prevent attaching it to later unrelated actions
        consumeInitialRoll(); 
        
        // Skip the broken action and continue with the pipeline
        actionPipelineQueue.shift(); 
        return processNextPipelineAction(); 
    }

    currentActionTargets = []; // Reset targets list for the new action block
    currentAction.stepId = 'step-' + Date.now() + '-' + Math.random().toString(36).slice(2, 7); 

    const targetType = currentAction.target;

    // Handle auto-executing actions that require no manual cursor input
    if (['self', 'team_enemy', 'team_ally', 'target_all', 'all', 'heroes', 'enemies'].includes(targetType)) {
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
        startTargetingMode(currentPipelineContext.abilityUser, currentAction.type, currentAction, true);
    }
}

// Resolves pipeline actions aimed at self or entire teams simultaneously
async function executeAutoAction(action, targetType) {
    const { abilityUser } = currentPipelineContext;

    let targets = [];
    if (targetType === 'self') targets = [abilityUser];
    else if (targetType === 'team_enemy') targets = activeCombatants.filter(c => c.team !== abilityUser.team && !c.isDead);
    else if (targetType === 'team_ally') targets = activeCombatants.filter(c => c.team === abilityUser.team && !c.isDead);
    else if (targetType === 'heroes') targets = activeCombatants.filter(c => c.team === 'hero' && !c.isDead);
    else if (targetType === 'enemies') targets = activeCombatants.filter(c => c.team === 'enemy' && !c.isDead);
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
function startTargetingMode(attacker, actionType, payload, isPipeline = false) {
    if (!payload.stepId) payload.stepId = 'step-' + Date.now() + '-' + Math.random().toString(36).slice(2, 7);
    
    // Anchor coordinates fixed from pipeline context, or fallback to mouse if missing
    const startX = currentPipelineContext ? currentPipelineContext.startX : window.currentMouseX;
    const startY = currentPipelineContext ? currentPipelineContext.startY : window.currentMouseY;
    targetingData = { attacker, actionType, payload, startX, startY, isPipeline };
    
    document.body.classList.add('targeting-mode');
    
    const overlay = document.getElementById('targeting-overlay');
    const svg = document.getElementById('targeting-svg');
    const tooltip = document.getElementById('targeting-tooltip');
    const crosshair = document.getElementById('targeting-crosshair');
    
    if (overlay) overlay.style.display = 'block';
    if (svg) svg.style.display = 'block';
    if (crosshair) {
        crosshair.style.display = 'flex';
        crosshair.style.left = window.currentMouseX + 'px';
        crosshair.style.top = window.currentMouseY + 'px';
    }
    if (tooltip) {
        tooltip.style.display = 'flex';
        // Immediately pin to cursor utilizing last known location, ensuring instant visual feedback
        tooltip.style.left = (window.currentMouseX + 15) + 'px';
        tooltip.style.top = (window.currentMouseY + 15) + 'px';
        updateTargetingTooltip(); // Render the dynamic pipeline tooltip texts
    }
    
    // Instantly draw the curved path from source to current cursor location to avoid zero-movement delays
    const path = document.getElementById('targeting-path');
    if (path) {
        const cpX = startX + (window.currentMouseX - startX) / 2;
        const cpY = Math.min(startY, window.currentMouseY) - 60;
        path.setAttribute('d', `M ${startX} ${startY} Q ${cpX} ${cpY} ${window.currentMouseX} ${window.currentMouseY}`);
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
        const elementUnderCursor = document.elementFromPoint(window.currentMouseX, window.currentMouseY);
        const tokenUnderCursor = elementUnderCursor ? elementUnderCursor.closest('.character-token:not(.dead)') : null;
        if (tokenUnderCursor) {
            handleTargetingHoverEnter(null, tokenUnderCursor.dataset.id);
        }
    }
}

function updateTargetingTooltip(hoveredTarget = null) {
    const tooltipText = document.querySelector('#targeting-tooltip .chance-text');
    const cancelHint = document.querySelector('#targeting-tooltip .cancel-hint');
    if (!tooltipText || !cancelHint) return;

    tooltipText.innerHTML = ''; // Clear hover target specifics

    if (targetingData && targetingData.isPipeline) {
        const action = targetingData.payload;
        const attacker = targetingData.attacker;
        // Retrieve active pipeline logic variables containing roll data to evaluate formulas securely
        const rollData = currentPipelineContext ? { total: currentPipelineContext.rollTotal, diff: currentPipelineContext.difficulty } : null;
        
        let actionName = buildActionTooltipText(action, attacker, hoveredTarget, rollData);

        let targetsText = '';
        if (action.target === 'multi') {
            const maxTargets = action.possibleTargets || 1;
            const currentCount = currentActionTargets.length;
            if (maxTargets === 9999) {
                targetsText = `${t('selected_targets')}: ${currentCount}`;
            } else {
                targetsText = `${t('selected_targets')}: ${currentCount}/${maxTargets}`;
            }
        }

        // Distinctly styled HTML block for clear readability and strict logical separation
        cancelHint.innerHTML = `
            <div class="tooltip-action-row">
                <span class="tooltip-action-label">${t('action')}:</span> 
                <span class="tooltip-action-value">${actionName}</span>
            </div>
            ${targetsText ? `<div class="tooltip-target-count">${targetsText}</div>` : ''}
            <div class="tooltip-skip-hint">
                ${t('targeting_skip_hint')}
            </div>
        `;
    } else {
        cancelHint.textContent = t('targeting_cancel_hint'); // Regular cancellation hint
    }
}

// Helper function to build dynamic action description strings mapping numerical values directly to the tooltip
function buildActionTooltipText(action, attacker, target, rollData) {
    let text = '';
    
    if (action.type === 'damage') {
        if (target) {
            // Render exact final calculated damage when hovering specifically over an entity
            const dmgResult = calculateActualDamage(attacker, target, action, rollData);
            text = t('action_dmg_' + action.damageType).replace('{val}', `<strong>${dmgResult.finalDamage}</strong>`);
        } else {
            // Fallback rendering base estimations when not actively hovering any target
            if (action.valuePerc !== undefined) {
                text = t('action_dmg_' + action.damageType + '_perc').replace('{val}', `<strong>${action.valuePerc}</strong>`);
            } else if (action.value !== undefined) {
                let val = typeof getFormulaValue === 'function' ? getFormulaValue(action.value, attacker, rollData) : action.value;
                text = t('action_dmg_' + action.damageType).replace('{val}', `<strong>${val}</strong>`);
            } else {
                text = t('action_dmg_' + action.damageType).replace('{val}', `<strong>0</strong>`); // Fallback
            }
        }
    } else if (action.type === 'heal') {
        if (action.healType === 'threshold') {
            if (action.valuePerc !== undefined) {
                text = t('action_heal_thresh_perc').replace('{val}', `<strong>${action.valuePerc}</strong>`);
            } else if (action.value !== undefined) {
                let val = typeof getFormulaValue === 'function' ? getFormulaValue(action.value, attacker, rollData) : action.value;
                text = t('action_heal_thresh_flat').replace('{val}', `<strong>${val}</strong>`);
            }
        } else {
            if (action.valuePerc !== undefined) {
                text = t('action_heal_perc').replace('{val}', `<strong>${action.valuePerc}</strong>`);
            } else if (action.value !== undefined) {
                let val = typeof getFormulaValue === 'function' ? getFormulaValue(action.value, attacker, rollData) : action.value;
                text = t('action_heal_flat').replace('{val}', `<strong>${val}</strong>`);
            }
        }
    } else if (action.type === 'armor') {
        let parts = [];
        // Check all possible armor value properties mapped to translations
        const checkArmor = (key, isPerc, typeName) => {
            if (action[key] !== undefined && action[key] !== null && action[key] !== '') {
                let valStr = String(action[key]).replace(/%/g, '');
                let val = typeof getFormulaValue === 'function' ? getFormulaValue(valStr, attacker, rollData) : parseInt(valStr) || 0;
                let verb = val >= 0 ? t('action_armor_add') : t('action_armor_sub');
                let absVal = Math.abs(val);
                let symbol = isPerc ? '%' : '';
                parts.push(`${verb} <strong>${absVal}${symbol}</strong> ${typeName}`);
            }
        };
        
        checkArmor('physArmorValue', false, t('desc_phys_armor'));
        checkArmor('physArmorValuePerc', true, t('desc_phys_armor'));
        checkArmor('magArmorValue', false, t('desc_mag_armor'));
        checkArmor('magArmorValuePerc', true, t('desc_mag_armor'));
        
        if (parts.length > 0) text = parts.join(', ');
        else text = t('action_armor_phys').replace('{val}', '...'); // Fallback empty
    } else if (action.type === 'effect') {
        text = t('action_effect');
    }

    // Append repeat count logically to the tooltip if it exceeds standard bounds
    if (text && action.repeat && action.repeat > 1) {
        text += ` <strong>x${action.repeat}</strong>`;
    }

    return text;
}

// Cleanly removes all DOM manipulations and restores original layout
function clearTargetingState() {
    document.body.classList.remove('targeting-mode');
    
    // Unlock GM action dropdown if it was used
    const gmWidget = document.querySelector('.gm-action-widget');
    if (gmWidget) gmWidget.classList.remove('locked-open');
    
    // Reset visually dimmed targets
    document.querySelectorAll('.character-token').forEach(t => {
        t.classList.remove('token-dimmed');
    });
    
    const overlay = document.getElementById('targeting-overlay');
    const svg = document.getElementById('targeting-svg');
    const tooltip = document.getElementById('targeting-tooltip');
    const crosshair = document.getElementById('targeting-crosshair');
    
    if (overlay) overlay.style.display = 'none';
    if (svg) svg.style.display = 'none';
    if (tooltip) tooltip.style.display = 'none';
    if (crosshair) crosshair.style.display = 'none';
    
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
        t.classList.remove('token-dimmed');
    });

    const svg = document.getElementById('targeting-svg');
    const tooltip = document.getElementById('targeting-tooltip');
    const crosshair = document.getElementById('targeting-crosshair');
    
    if (svg) svg.style.display = 'none';
    if (tooltip) tooltip.style.display = 'none';
    if (crosshair) crosshair.style.display = 'none';
    
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
    
    // Calculate arrow path (curved upwards) using the locked origin coordinates
    const path = document.getElementById('targeting-path');
    if (path) {
        const cpX = startX + (window.currentMouseX - startX) / 2;
        const cpY = Math.min(startY, window.currentMouseY) - 60; // Slight upward curve
        path.setAttribute('d', `M ${startX} ${startY} Q ${cpX} ${cpY} ${window.currentMouseX} ${window.currentMouseY}`);
    }

    // Position tooltip closely tracking the cursor
    const tooltip = document.getElementById('targeting-tooltip');
    if (tooltip) {
        tooltip.style.left = (window.currentMouseX + 15) + 'px';
        tooltip.style.top = (window.currentMouseY + 15) + 'px';
    }
    
    // Smoothly update the custom DOM crosshair position
    const crosshair = document.getElementById('targeting-crosshair');
    if (crosshair) {
        crosshair.style.left = window.currentMouseX + 'px';
        crosshair.style.top = window.currentMouseY + 'px';
    }
}

function handleTargetingHoverEnter(e, targetId) {
    if (!targetingData) return;
    const target = activeCombatants.find(c => c.id === targetId);
    if (!target) return;
    
    // Refresh tooltip dynamically swapping base values to the specific target calculation
    updateTargetingTooltip(target);

    const tooltipText = document.querySelector('#targeting-tooltip .chance-text');
    if (!tooltipText) return;

    const chances = calculateActionSuccessChance(targetingData.attacker, target, targetingData.payload);
    let text = '';
    
    // Explicit condition checks utilizing the strict object keys to render the exact UI requirement
    if (chances.hit !== undefined) {
        text += `${t('hit_chance')} ${chances.hit}%<br>`;
    }
    if (chances.success !== undefined) {
        text += `${t('success_chance')} ${chances.success}%<br>`;
    }
    if (chances.effect !== undefined) {
        let focus = getEffectSuccessFocus(targetingData.payload);
        let count = 0;
        if (targetingData.payload.effects) {
            count = targetingData.payload.effects.filter(e => e.effectIsBeneficial === focus).length;
        }
        
        let textKey = focus ? 
            (count > 1 ? 'effect_chance_pos_many' : 'effect_chance_pos_one') : 
            (count > 1 ? 'effect_chance_neg_many' : 'effect_chance_neg_one');
        
        text += `${t(textKey)} ${chances.effect}%<br>`;
    }
    if (chances.stun !== undefined) {
        text += `${t('stun_chance')} ${chances.stun}%<br>`;
    }

    // Explicitly avoids rendering raw string replacements if no chance applies to the targeted interaction
    text = text.replace(/<br>$/, ''); 
    tooltipText.innerHTML = text;
}

function handleTargetingHoverLeave(e) {
    // Revert tooltip formatting to generic non-targeted estimations
    updateTargetingTooltip(null);
    const tooltipText = document.querySelector('#targeting-tooltip .chance-text');
    if (tooltipText) tooltipText.textContent = ''; 
}

// Core execution router for user-initiated clicks during targeting
async function executeTargetedAction(targetId) {
    // REQUIRED: Prevents async state overlap when spam-clicking tokens
    if (isProcessingTargetClick) return;

    const target = activeCombatants.find(c => c.id === targetId);
    if (!target || target.isDead) {
        if (!targetingData.isPipeline) cancelTargetingMode();
        return;
    }

    const { attacker, actionType, payload, isPipeline } = targetingData;
    let isSingle = isPipeline && payload.target === 'single';
    let isLastMulti = false;

    if (isPipeline && payload.target === 'multi') {
        if (payload.isGmAction) {
            // GM actions ignore dimming, allow duplicate targets, and allow infinite clicks until manual cancel
            currentActionTargets.push(targetId);
            isLastMulti = false; 
        } else {
            // Strictly prevent clicking the exact same target multiple times within a single 'multi' action block
            if (currentActionTargets.includes(targetId)) return;
            currentActionTargets.push(targetId);
            
            // Visually dim the selected target so the user knows they can't click it again for this multi-step
            const token = document.querySelector(`.character-token[data-id="${targetId}"]`);
            if (token) {
                token.classList.add('token-dimmed');
            }
            
            isLastMulti = currentActionTargets.length >= (payload.possibleTargets || 1);
        }
    }

    isProcessingTargetClick = true;

    try {
        // Step 1: Manage UI State immediately (suspend interaction if processing pipeline, or close entirely if done)
        if (isSingle || isLastMulti) {
            suspendTargetingState(); 
        } else if (!isPipeline) {
            clearTargetingState(); // Prevent further clicks on generic legacy buttons
        } else if (isPipeline && payload.target === 'multi') {
            handleTargetingHoverEnter(null, targetId); // Update targeting tooltip with specific target data and count
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
    } finally {
        // Always unlock clicks regardless of whether execution succeeded or errored out
        isProcessingTargetClick = false;
    }
}

// Master Handler evaluating Hit and Defensive Mechanics (forceRoll, forceRollVS)
// Packages the dice pool and dispatches to specific execution modules
// Added skipSync flag to prevent spamming server on multi-target grouped actions
async function processActionExecution(attacker, target, payload, skipSync = false) {
    let evalRes = evaluateActionSuccessAndResistance(attacker, target, payload, consumeInitialRoll);
    let evalData = { hasForcedRolls: evalRes.hasForcedRolls, targetPassedChecks: evalRes.targetPassedChecks };
    
    // Evaluate stun for non-damage actions independently.
    // Stun applies if there are no forced rolls, or if the target fails at least one forced roll.
    // This must be checked outside the main success block because a hostile action "succeeds" when the target fails the roll,
    // but a beneficial action "fails" when the target fails the roll. In both cases, failing the roll triggers the stun.
    let shouldStunNonDamage = payload.type !== 'damage' && hasActiveProperty(payload, 'prop_stuns') && (!evalRes.hasForcedRolls || !evalRes.targetPassedChecks);

    if (shouldStunNonDamage) {
        const freshTarget = activeCombatants.find(c => c.id === target.id);
        if (freshTarget && !freshTarget.isDead) {
            freshTarget.isStunned = true;
            if (!skipSync) syncUpdateCombatant(freshTarget);
        }
    }

    if (payload.type === 'damage') {
        // Damage handler natively appends Death's Door checks inside the same visual package block
        const hitSuccess = await resolveDamageAction(attacker, target, payload, evalRes, skipSync);
        if (hitSuccess && payload.effects) {
            processAndSendEffects(attacker.uniqueName, target.uniqueName, payload, payload.name || "Effect", "target", evalData);
        }
        return hitSuccess;
    } else {
        // Broadcast combined generic rolls beforehand since non-damage elements do not handle Death's Door math
        if (evalRes.rolls.attackerSingleRolls.length > 0 || evalRes.rolls.opposedRolls.length > 0 || evalRes.rolls.defenderSingleRolls.length > 0) {
            syncAddRollEvent(buildRollEvent(attacker, target, evalRes.rolls, payload, skipSync));
        }
        
        if (evalRes.success) {
            if (payload.type === 'heal') await resolveHealAction(target, payload, attacker, skipSync, shouldStunNonDamage);
            else if (payload.type === 'armor') await resolveArmorAction(target, payload, attacker, skipSync, shouldStunNonDamage);
            else if (payload.type === 'effect') {
                // If it's a pure effect action that triggered a stun, broadcast the sequence purely for the sound and visuals
                if (shouldStunNonDamage && typeof syncPlayActionSequence === 'function') {
                    syncPlayActionSequence({ targetId: target.id, actionType: payload.type, subType: 'success', repeats: 1, stepId: payload.stepId, isAuto: skipSync, isStunned: true });
                    await delay(400);
                }
            }
            
            // Attach explicitly linked target effects
            if (payload.effects) {
                processAndSendEffects(attacker.uniqueName, target.uniqueName, payload, payload.name || "Effect", "target", evalData);
            }

            return true;
        } else {
            // Execution resisted, broadcast negative visual feedback and exit
            if (typeof syncPlayActionSequence === 'function') {
                syncPlayActionSequence({ targetId: target.id, actionType: payload.type, subType: evalRes.subType || 'resist', repeats: 1, stepId: payload.stepId, isAuto: skipSync, isStunned: shouldStunNonDamage });
            }
            await delay(400);
            return false;
        }
    }
}