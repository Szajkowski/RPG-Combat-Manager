// Render the Initiative Tracker based on reflex and hasActedThisRound status
function renderInitiativeTracker() {
    const tracker = document.querySelector('.initiative-tracker');
    if (!tracker) return;

    if (activeCombatants.length === 0) {
        tracker.innerHTML = '';
        return;
    }

    // Group by reflex
    const groups = {};
    activeCombatants.forEach(c => {
        if (c.isDead) return; // Skip dead characters from turn order
        const ref = parseInt(c.stats.reflex) || 0;
        if (!groups[ref]) groups[ref] = [];
        groups[ref].push(c);
    });

    const sortedReflexes = Object.keys(groups).map(Number).sort((a, b) => b - a);

    // Find active reflex (The highest reflex where at least one combatant hasn't acted yet)
    let activeReflex = null;
    for (const ref of sortedReflexes) {
        if (groups[ref].some(c => !c.hasActedThisRound)) {
            activeReflex = ref;
            break;
        }
    }

    let html = '';
    sortedReflexes.forEach((ref, index) => {
        const combatants = groups[ref];
        const names = combatants.map(c => c.uniqueName).join(', ');
        const isActive = ref === activeReflex;
        // Group is done if it's not active and EVERYONE in it has acted
        const isDone = !isActive && combatants.every(c => c.hasActedThisRound);

        // Determine class based on state dynamically
        let slotClass = 'initiative-slot';
        if (isActive) slotClass += ' active';
        else if (isDone) slotClass += ' done';

        html += `
            <div class="${slotClass}">
                <span class="init-reflex">${ref}</span>
                <span class="init-names">${names}</span>
            </div>
        `;

        if (index < sortedReflexes.length - 1) {
            html += `<span class="init-arrow">▶</span>`;
        }
    });

    tracker.innerHTML = html;

    // Automatically scroll to the active element, ensuring it sits exactly in the middle of the container
    setTimeout(() => {
        const activeSlot = tracker.querySelector('.initiative-slot.active');
        if (activeSlot) {
            // inline: 'center' makes sure the specific div sits in the middle of the horizontal scroll
            // block: 'nearest' prevents the entire browser window from jumping down
            activeSlot.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
        }
    }, 50); // slight delay to allow the DOM to update its widths before calculating the scroll position
}

// Next Turn logic: marks current active group as acted, REDUCES COOLDOWNS, and checks for round end
function nextTurn() {
    if (activeCombatants.length === 0) return;

    // Group by reflex to find the currently active ones
    const groups = {};
    activeCombatants.forEach(c => {
        if (c.isDead) return;
        const ref = parseInt(c.stats.reflex) || 0;
        if (!groups[ref]) groups[ref] = [];
        groups[ref].push(c);
    });

    const sortedReflexes = Object.keys(groups).map(Number).sort((a, b) => b - a);

    let activeReflex = null;
    for (const ref of sortedReflexes) {
        if (groups[ref].some(c => !c.hasActedThisRound)) {
            activeReflex = ref;
            break;
        }
    }

    // Check if this is the LAST active reflex group in the round
    const remainingGroups = sortedReflexes.filter(ref => groups[ref].some(c => !c.hasActedThisRound));
    
    if (remainingGroups.length <= 1) {
        // This is the last active group! Just reduce their CDs and run newRound() directly.
        if (activeReflex !== null) {
            groups[activeReflex].forEach(c => {
                if (c.abilitiesStates) {
                    Object.keys(c.abilitiesStates).forEach(abilityName => {
                        const state = c.abilitiesStates[abilityName];
                        if (typeof state.currentCooldown === 'number' && state.currentCooldown > 0) {
                            state.currentCooldown--;
                        }
                    });
                }
            });
        }
        newRound(); // Automatically triggers new round and syncs everything
        return;
    }

    // Normal next turn logic for mid-round updates
    if (activeReflex !== null) {
        groups[activeReflex].forEach(c => {
            c.hasActedThisRound = true;
            
            // Cooldown reduction directly at the end of the character's turn
            if (c.abilitiesStates) {
                Object.keys(c.abilitiesStates).forEach(abilityName => {
                    const state = c.abilitiesStates[abilityName];
                    if (typeof state.currentCooldown === 'number' && state.currentCooldown > 0) {
                        state.currentCooldown--;
                    }
                });
            }

            syncUpdateCombatant(c);
        });
    }

    // Note: Re-rendering of the initiative tracker is automatically triggered by network sync callbacks
}

// New Round logic: Advances round counter, decrements condition timers, and resets turn states
function newRound() {
    // Reset acted flags and handle edge-case cooldowns
    activeCombatants.forEach(c => {
        if (!c.isDead) {
            // If character hasn't acted this round (e.g. skipped, or added mid-round), 
            // reduce their cooldowns now to ensure fairness across round boundaries.
            if (!c.hasActedThisRound && c.abilitiesStates) {
                Object.keys(c.abilitiesStates).forEach(abilityName => {
                    const state = c.abilitiesStates[abilityName];
                    if (typeof state.currentCooldown === 'number' && state.currentCooldown > 0) {
                        state.currentCooldown--;
                    }
                });
            }
            
            c.hasActedThisRound = false;
            syncUpdateCombatant(c);
        }
    });

    decrementConditions();
}

function decrementConditions() {
    if (!activeConditions || activeConditions.length === 0) return;
    
    let changed = false;
    
    activeConditions.forEach(cond => {
        // If duration is defined, > 0, and importantly NOT the infinite string "-", decrement it
        if (cond.duration !== undefined && cond.duration !== null && cond.duration !== "-") {
            let dur = parseInt(cond.duration);
            if (!isNaN(dur) && dur > 0) {
                cond.duration = dur - 1;
                changed = true;
            }
        }
    });

    // Remove conditions that reached 0. (Undefined/null or "-" implies infinite duration)
    const filteredConditions = activeConditions.filter(cond => {
        if (cond.duration === "-") return true;
        if (cond.duration === undefined || cond.duration === null) return true;
        let dur = parseInt(cond.duration);
        return isNaN(dur) || dur > 0;
    });
    
    if (filteredConditions.length !== activeConditions.length) {
        changed = true;
    }

    if (changed) {
        if (typeof updateServerConditions === 'function') updateServerConditions(filteredConditions);
    }
}

// Render the Active Conditions Panel dynamically matching the dummy UI layout perfectly
function renderConditions() {
    const container = document.getElementById('conditions-list-container');
    if (!container) return;

    if (!activeConditions || activeConditions.length === 0) {
        container.innerHTML = `<div style="padding: 10px; color: #6272a4; text-align: center; font-size: 0.8rem;">${t('no_conditions')}</div>`;
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
                            <button class="condition-btn copy" title="${t('condition_copy')}" onclick="copyToClipboard('${safeTarget}', event)">©</button>
                            <button class="condition-btn remove" title="${t('condition_remove')}" onclick="removeCondition('${cond.id}')">✖</button>
                        </div>
                    </div>
                </div>
                <div class="condition-target-wrapper">
                    <span>${t('target')}</span>
                    <input type="text" class="condition-target" value="${cond.target}" readonly>
                </div>
                <div class="condition-desc">${cond.description}</div>
            </div>
        `;
    });

    container.innerHTML = html;
}

// Safely removes a specific condition and syncs it back through the server
function removeCondition(id) {
    const filteredConditions = activeConditions.filter(cond => cond.id !== id);
    if (typeof updateServerConditions === 'function') updateServerConditions(filteredConditions);
}

// End Combat: Automatically clear enemies and conditions, preserving heroes
function endCombat() {
    // End combat removes all enemies automatically
    activeCombatants.forEach(c => {
        if (c.team === 'enemy' && typeof syncRemoveCombatant === 'function') {
            syncRemoveCombatant(c.id);
        }
    });
    
    // Clear all conditions from the board
    if (typeof updateServerConditions === 'function') {
        updateServerConditions([]);
    }
}