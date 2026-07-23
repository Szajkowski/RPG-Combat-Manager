// Render the Initiative Tracker based on reflex and hasActedThisRound status
function renderInitiativeTracker() {
    const tracker = document.querySelector('.initiative-tracker');
    if (!tracker) return;

    // Filter alive combatants who have an explicitly defined, non-empty reflex stat
    const validCombatants = activeCombatants.filter(c => 
        !c.isDead && 
        c.stats.reflex !== undefined && 
        c.stats.reflex !== null && 
        c.stats.reflex !== ''
    );

    // Render placeholder if there are no combatants with valid initiative stats
    if (validCombatants.length === 0) {
        tracker.innerHTML = `<div style="color: #6272a4; margin: auto;" data-i18n="placeholder_no_initiative">${t('placeholder_no_initiative')}</div>`;
        return;
    }

    // Group by reflex
    const groups = {};
    validCombatants.forEach(c => {
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
function nextTurn(isSilent = false) {
    if (activeCombatants.length === 0) return;

    // Group by reflex to find the currently active ones (skipping characters without a defined reflex stat)
    const groups = {};
    activeCombatants.forEach(c => {
        if (c.isDead) return;
        if (c.stats.reflex === undefined || c.stats.reflex === null || c.stats.reflex === '') return;
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
                
                // Decrement explicitly targeted conditions for this combatant
                if (typeof decrementConditions === 'function') {
                    decrementConditions(cond => cond.target === c.uniqueName);
                }

                // Explicitly mark as acted so the round transition tracker evaluates remaining turns accurately
                c.hasActedThisRound = true;
            });
        }

        // Only call newRound if we are not already processing a round transition fast-forward
        if (!isProcessingRoundTransition) {
            newRound();
        }
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

            // Decrement explicitly targeted conditions for this combatant
            if (typeof decrementConditions === 'function') {
                decrementConditions(cond => cond.target === c.uniqueName);
            }

            // Suppress individual network api updates during rapid programmatic fast-forwards
            if (!isSilent) {
                syncUpdateCombatant(c);
            }
        });
    }
}

// New Round logic: Advances round counter, decrements condition timers, and resets turn states
function newRound() {
    // Set the transition lock flag to prevent nextTurn from recursively triggering newRound
    isProcessingRoundTransition = true;

    // Check if there are any alive combatants with a valid reflex stat who haven't acted yet this round
    let hasNotActed = activeCombatants.some(c => 
        !c.isDead && 
        c.stats.reflex !== undefined && 
        c.stats.reflex !== null && 
        c.stats.reflex !== '' && 
        !c.hasActedThisRound
    );
    
    // Programmatically fast-forward outstanding turns silently without spamming network endpoints
    while (hasNotActed) {
        nextTurn(true);
        hasNotActed = activeCombatants.some(c => 
            !c.isDead && 
            c.stats.reflex !== undefined && 
            c.stats.reflex !== null && 
            c.stats.reflex !== '' && 
            !c.hasActedThisRound
        );
    }

    // --- CLEANUP AND ROUND RESET (Executed only when everyone on the board has completed their turn) ---
    // Reset acted flags and handle edge-case cooldowns
    activeCombatants.forEach(c => {
        if (!c.isDead) {
            c.hasActedThisRound = false;
            // Execute a single synchronized batch update for each combatant at the very end of calculation
            syncUpdateCombatant(c);
        }
    });

    // Decrement conditions without a live specific target on the board
    const activeNames = activeCombatants.map(c => c.uniqueName);
    if (typeof decrementConditions === 'function') {
        decrementConditions(cond => !activeNames.includes(cond.target));
    }

    // Release the transition lock flag now that the round cleanup sequence is fully complete
    isProcessingRoundTransition = false;
}

// End Combat: Automatically clear enemies and conditions, preserving heroes and resetting their cooldowns
function endCombat() {
    activeCombatants.forEach(c => {
        if (c.team === 'enemy' && typeof syncRemoveCombatant === 'function') {
            syncRemoveCombatant(c.id);
        } else if (!c.isDead) {
            // Reset all cooldowns for surviving characters, including single-use abilities
            if (c.abilitiesStates) {
                Object.keys(c.abilitiesStates).forEach(abilityName => {
                    const state = c.abilitiesStates[abilityName];
                    state.currentCooldown = 0; 
                });
            }
            c.hasActedThisRound = false;
            if (typeof syncUpdateCombatant === 'function') syncUpdateCombatant(c);
        }
    });
    
    // Clear all conditions from the board
    if (typeof updateServerConditions === 'function') {
        updateServerConditions([]);
    }
}