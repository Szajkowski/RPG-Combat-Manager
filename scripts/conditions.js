// Universal function to decrement conditions based on a provided logical condition
function decrementConditions(shouldDecrement) {
    if (!activeConditions || activeConditions.length === 0) return;
    
    let changed = false;
    activeConditions.forEach(cond => {
        // Execute decrement only if the callback condition evaluates to true
        if (shouldDecrement(cond)) {
            if (cond.duration !== undefined && cond.duration !== null && cond.duration !== "-") {
                let dur = parseInt(cond.duration);
                if (!isNaN(dur) && dur > 0) {
                    cond.duration = dur - 1;
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
        let dur = parseInt(cond.duration);
        return isNaN(dur) || dur > 0;
    });
    
    activeConditions = filteredConditions;
    if (typeof updateServerConditions === 'function') {
        updateServerConditions(activeConditions);
    }
}

// Render the Active Conditions Panel dynamically matching the dummy UI layout perfectly
function renderConditions() {
    const container = document.getElementById('conditions-list-container');
    if (!container) return;

    if (!activeConditions || activeConditions.length === 0) {
        container.innerHTML = `<div style="padding: 10px; color: #6272a4; text-align: center; font-size: 0.8rem;">${t('placeholder_no_conditions')}</div>`;
        return;
    }

    let html = '';
    activeConditions.forEach(cond => {
        // Safely escape the target name in case it has quotes, for the clipboard function
        const safeTarget = (cond.target || '').replace(/'/g, "\\'");

        html += `
            <div class="condition-block">
                <div class="condition-header">
                    <span class="condition-name">${cond.name || t('condition')}</span>
                    <div style="display: flex; gap: 5px; align-items: center;">
                        ${cond.duration !== undefined && cond.duration !== null ? `<span class="condition-duration" title="${t('condition_duration')}">${cond.duration}</span>` : ''}
                        <div class="condition-actions">
                            <button class="condition-btn copy" title="${t('condition_copy')}" onclick="copyValue('${safeTarget}', event)">©</button>
                            <button class="condition-btn remove" title="${t('condition_remove')}" onclick="removeCondition('${cond.id}')">✖</button>
                        </div>
                    </div>
                </div>
                <div class="condition-target-wrapper">
                    <span>${t('target')}</span>
                    <input type="text" class="condition-target" value="${cond.target}" onchange="updateConditionTarget('${cond.id}', this.value)">
                </div>
                <div class="condition-desc">${cond.description}</div>
            </div>
        `;
    });

    container.innerHTML = html;
}

// Updates the target of a specific condition in global state and broadcasts to server
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

// Safely removes a specific condition and syncs it back through the server
function removeCondition(id) {
    const filteredConditions = activeConditions.filter(cond => cond.id !== id);
    if (typeof updateServerConditions === 'function') updateServerConditions(filteredConditions);
}