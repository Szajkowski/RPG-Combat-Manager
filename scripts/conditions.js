// Universal function to decrement conditions based on a provided logical condition
function decrementConditions(shouldDecrement) {
    if (!activeConditions || activeConditions.length === 0) return;
    
    let changed = false;
    activeConditions.forEach(cond => {
        // Execute decrement only if the callback condition evaluates to true
        if (shouldDecrement(cond)) {
            if (cond.duration !== undefined && cond.duration !== null && cond.duration !== "-") {
                let durStr = String(cond.duration).trim();
                let type = durStr.slice(-1); // Check for 't' or 'r'
                let num = parseInt(durStr);  // Safely extract the numeric value
                
                if (!isNaN(num) && num > 0) {
                    // Append the type suffix back if it had one (fallback to empty for legacy integers)
                    let suffix = (type === 't' || type === 'r') ? type : ''; 
                    cond.duration = (num - 1) + suffix;
                    changed = true;
                }
            }
        }
    });

    if (changed) cleanUpExpiredConditions();
}

// Filters out any conditions that reached 0 and syncs changes to the server
function cleanUpExpiredConditions() {
    const filteredConditions = activeConditions.filter(cond => {
        if (cond.duration === "-") return true;
        if (cond.duration === undefined || cond.duration === null) return true;
        let num = parseInt(cond.duration); // ParseInt stops at characters, so '0r' perfectly resolves to 0
        return isNaN(num) || num > 0;
    });
    
    activeConditions = filteredConditions;
    if (typeof updateServerConditions === 'function') {
        updateServerConditions(activeConditions);
    }
}

// Render the Active Conditions Panel dynamically matching the UI layout
function renderConditions() {
    const container = document.getElementById('conditions-list-container');
    if (!container) return;

    if (!activeConditions || activeConditions.length === 0) {
        container.innerHTML = `<div class="empty-list-placeholder">${t('placeholder_no_conditions')}</div>`;
        return;
    }

    let html = '';
    activeConditions.forEach(cond => {
        const safeInvoker = (cond.invoker || '').replace(/'/g, "\\'");
        const safeTarget = (cond.target || '').replace(/'/g, "\\'");

        // Support both new target_ prefixed keys and legacy group target names
        const isGroupTarget = ['target_team_enemy', 'target_team_ally', 'target_all', 'team_enemy', 'team_ally', 'all', 'hero', 'enemy'].includes(cond.target);
        
        // Dynamically resolve translation for group targets (e.g., mapping 'team_enemy' to 'target_team_enemy')
        let displayTarget = cond.target;
        if (isGroupTarget) {
            let i18nKey = cond.target;
            if (!i18nKey.startsWith('target_')) {
                i18nKey = 'target_' + i18nKey;
            }
            displayTarget = t(i18nKey);
        }

        // Fetch invoker and target combatants
        const invokerCombatant = activeCombatants.find(c => c.uniqueName === cond.invoker);
        const targetCombatant = activeCombatants.find(c => c.uniqueName === cond.target);

        // Determine calculation context based on cond.source ("self" [default] vs "target")
        let evalContext = invokerCombatant;
        if (cond.source === 'target' && targetCombatant) {
            evalContext = targetCombatant;
        } else if (!evalContext && targetCombatant) {
            evalContext = targetCombatant;
        }

        // Aggregate condition properties as prefixes
        let descString = cond.description || "";
        if (cond.conditionProperties && cond.conditionProperties.length > 0) {
            const propsPrefix = cond.conditionProperties.map(p => `[${p}]`).join(' ');
            descString = propsPrefix + (descString ? ' ' + descString : '');
        }

        const parsedDesc = typeof parseDescription === 'function' ? parseDescription(descString, evalContext) : descString;

        html += `
            <div class="condition-block">
                <div class="condition-header">
                    <span class="condition-name">${cond.name || t('condition')}</span>
                    <div class="condition-header-actions">
                        ${cond.duration !== undefined && cond.duration !== null ? `<span class="condition-duration" title="${t('condition_duration')}">${cond.duration}</span>` : ''}
                        <div class="condition-actions">
                            <button class="condition-btn remove" title="${t('condition_remove')}" onclick="removeCondition('${cond.id}')">✖</button>
                        </div>
                    </div>
                </div>
                <div class="condition-target-wrapper">
                    <span class="copyable-value" title="${t('condition_copy')}" onclick="copyValue('${safeInvoker}')">${t('condition_invoker')}</span>
                    <input type="text" class="condition-target" value="${cond.invoker || ''}" onchange="updateConditionInvoker('${cond.id}', this.value)">
                </div>
                ${cond.target ? `
                <div class="condition-target-wrapper">
                    <span class="copyable-value" title="${t('condition_copy')}" onclick="copyValue('${safeTarget}')">${t('target')}</span>
                    <input type="text" class="condition-target ${isGroupTarget ? 'readonly-group' : ''}" value="${displayTarget}" ${isGroupTarget ? 'readonly' : ''} onchange="updateConditionTarget('${cond.id}', this.value)">
                </div>
                ` : ''}
                <div class="condition-desc">${parsedDesc}</div>
            </div>
        `;
    });

    container.innerHTML = html;
}

function updateConditionInvoker(id, newInvoker) {
    if (!activeConditions) return;
    const condition = activeConditions.find(c => c.id === id);
    if (condition && condition.invoker !== newInvoker) {
        condition.invoker = newInvoker;
        if (typeof updateServerConditions === 'function') {
            updateServerConditions(activeConditions);
        }
    }
}

function updateConditionTarget(id, newTarget) {
    if (!activeConditions) return;
    const condition = activeConditions.find(c => c.id === id);
    if (condition && condition.target !== newTarget) {
        condition.target = newTarget;
        if (typeof updateServerConditions === 'function') {
            updateServerConditions(activeConditions);
        }
    }
}

function buildConditionObject(invoker, target, name, description, duration, source = "self", conditionProperties = []) {
    // Preserve raw description so property tags like [prop_extra_turn] are searchable and dynamic
    return {
        id: `condition-${Date.now()}-${Math.random().toString(16).slice(2)}`,
        name: name,
        invoker: invoker,
        target: target || null,
        source: source || "self",
        description: description,
        duration: duration,
        conditionProperties: conditionProperties
    };
}

// Centralized helper to process, batch, and broadcast conditions from either the new array format or legacy single format
function processAndSendConditions(invoker, target, sourceData, fallbackName, defaultSource = "self", evalData = null) {
    let newConditions = [];

    if (sourceData.conditions && Array.isArray(sourceData.conditions)) {
        for (const cond of sourceData.conditions) {
            const isCondBeneficial = cond.conditionIsBeneficial;

            // Evaluates if this specific condition should apply based on its beneficial flag and force roll results
            if (evalData && evalData.hasForcedRolls) {
                if (isCondBeneficial !== evalData.targetPassedChecks) {
                    continue; // Skip pushing this condition if the target passed/failed the save appropriately
                }
            }

            const condName = cond.conditionName || cond.name || fallbackName;
            const condDesc = cond.conditionDescription || cond.description || '';
            const condDuration = cond.conditionDuration || cond.duration || '-';
            const condSource = cond.conditionSource !== undefined ? cond.conditionSource : defaultSource;
            
            let condTarget = cond.target !== undefined ? cond.target : target;
            
            // Resolves "self" tags globally (case-insensitive) to explicitly clear the UI targeting parameter internally
            if (String(condTarget).toLowerCase() === 'self' || String(sourceData.target).toLowerCase() === 'self') {
                condTarget = null; 
            }
            
            const condProps = cond.conditionProperties || cond.properties || [];
            
            newConditions.push(buildConditionObject(invoker, condTarget, condName, condDesc, condDuration, condSource, condProps));
        }
    }

    // Batch update to the server to prevent multiple UI re-renders and network spikes
    if (newConditions.length > 0) {
        activeConditions = activeConditions.concat(newConditions);
        if (typeof updateServerConditions === 'function') {
            updateServerConditions(activeConditions);
        }
    }
}

// Safely removes a specific condition and syncs it back through the server
function removeCondition(id) {
    const filteredConditions = activeConditions.filter(cond => cond.id !== id);
    if (typeof updateServerConditions === 'function') updateServerConditions(filteredConditions);
}

// Universal function to completely remove all conditions targeting a specific character
function removeConditionsForTarget(targetName) {
    if (!activeConditions || activeConditions.length === 0) return;
    
    const initialLength = activeConditions.length;
    const filteredConditions = activeConditions.filter(cond => cond.target !== targetName);
    
    if (filteredConditions.length !== initialLength) {
        activeConditions = filteredConditions;
        if (typeof updateServerConditions === 'function') {
            updateServerConditions(activeConditions);
        }
    }
}