let isProcessingRoundTransition = false;

// Helper: Calculate total turns for a combatant dynamically based on [prop_extra_turn]
function calculateTotalTurns(combatant) {
    if (combatant.isDead) return 0;

    let extraTurns = 0;
    const tag = 'prop_extra_turn';

    // Check abilities explicitly examining the properties array
    if (combatant.abilities) {
        combatant.abilities.forEach(ability => {
            if (ability.properties && ability.properties.includes(tag)) extraTurns++;
        });
    }

    // Check equipment looking at the properties array (with fallback for legacy items relying on old description tag searches)
    if (combatant.equipment) {
        combatant.equipment.forEach(item => {
            if (item.properties && item.properties.includes(tag)) extraTurns++;
            else if (!item.properties && item.description && item.description.toLowerCase().includes(`[${tag}]`)) extraTurns++;
        });
    }

    // Check active effects targeting this specific combatant explicitly via effectProperties
    if (typeof activeEffects !== 'undefined') {
        activeEffects.forEach(effect => {
            // Null target automatically implies the effect affects the invoker
            const effectiveTarget = effect.target ? effect.target : effect.invoker;
            if (effectiveTarget === combatant.uniqueName && effect.effectProperties && effect.effectProperties.includes(tag)) {
                extraTurns++;
            }
        });
    }

    return 1 + extraTurns; // Base turn (1) + Extra Turns found
}

// Helper: Calculate the exact reflex steps where the character acts
function calculateReflexStops(combatant) {
    const totalTurns = calculateTotalTurns(combatant);
    if (totalTurns === 0) return [];
    
    const baseReflex = parseInt(combatant.stats.reflex) || 0;
    if (baseReflex <= 0) return [];

    let stops = [];
    // Division stops math (e.g. 30 reflex and 4 turns -> 30, 22, 15, 7)
    for (let i = totalTurns; i >= 1; i--) {
        const stopReflex = Math.max(1, Math.floor(i * (baseReflex / totalTurns)));
        stops.push(stopReflex);
    }
    return stops; 
}

// Helper: Determine if it's currently a specific combatant's turn
function hasCurrentTurn(combatantId) {
    if (!activeCombatants || activeCombatants.length === 0) return false;

    const groups = {};
    activeCombatants.forEach(c => {
        if (c.isDead || c.stats.reflex === undefined || c.stats.reflex === null || c.stats.reflex === '') return;
        const stops = calculateReflexStops(c);
        const turnsTaken = c.turnsTakenThisRound || 0;
        
        stops.forEach((ref, index) => {
            if (index >= turnsTaken) {
                if (!groups[ref]) groups[ref] = [];
                groups[ref].push(c.id);
            }
        });
    });

    const sortedReflexes = Object.keys(groups).map(Number).sort((a, b) => b - a);
    if (sortedReflexes.length === 0) return false;

    const activeReflex = sortedReflexes[0];
    return groups[activeReflex].includes(combatantId);
}

// Render the Initiative Tracker mapping out all specific dynamic stops
function renderInitiativeTracker() {
    const tracker = document.querySelector('.initiative-tracker');
    if (!tracker) return;

    // Filter alive combatants with valid reflex
    const validCombatants = activeCombatants.filter(c => 
        !c.isDead && 
        c.stats.reflex !== undefined && 
        c.stats.reflex !== null && 
        c.stats.reflex !== ''
    );

    if (validCombatants.length === 0) {
        tracker.innerHTML = `<div class="empty-list-placeholder" data-i18n="placeholder_no_initiative">${t('placeholder_no_initiative')}</div>`;
        return;
    }

    const groups = {};
    const allReflexes = new Set();

    // Map out every stop for every combatant
    validCombatants.forEach(c => {
        const stops = calculateReflexStops(c);
        const turnsTaken = c.turnsTakenThisRound || 0;
        
        stops.forEach((ref, index) => {
            if (!groups[ref]) groups[ref] = [];
            allReflexes.add(ref);
            
            // If the turn index is lower than the amount of turns they have taken, this particular spot is done
            const isDone = index < turnsTaken;
            // Mark STRICTLY the first un-acted turn as stunned if character is currently stunned
            const isStunnedTurn = c.isStunned && (index === turnsTaken);

            groups[ref].push({ combatant: c, isDone: isDone, isStunnedTurn: isStunnedTurn });
        });
    });

    const sortedReflexes = Array.from(allReflexes).sort((a, b) => b - a);

    // Find active reflex (The highest reflex where at least one combatant turn is not done yet)
    let activeReflex = null;
    for (const ref of sortedReflexes) {
        if (groups[ref].some(entry => !entry.isDone)) {
            activeReflex = ref;
            break;
        }
    }

    let html = '';
    sortedReflexes.forEach((ref, index) => {
        // Prepare unique visual entries per reflex step, splitting Stunned turns from Normal turns
        const uniqueEntries = [];
        const seenIds = new Set();
        
        groups[ref].forEach(entry => {
            if (!seenIds.has(entry.combatant.id)) {
                const characterTurns = groups[ref].filter(e => e.combatant.id === entry.combatant.id);
                const pendingTurns = characterTurns.filter(e => !e.isDone);
                
                if (pendingTurns.length === 0) {
                    // All turns done at this reflex stop
                    uniqueEntries.push({ combatant: entry.combatant, isDone: true, count: characterTurns.length, isStunned: false });
                } else {
                    const c = entry.combatant;
                    const stunnedPendingCount = pendingTurns.filter(e => e.isStunnedTurn).length;
                    
                    if (stunnedPendingCount > 0) {
                        // The very first pending turn consumes the stun constraint (Separate into two entries)
                        uniqueEntries.push({ combatant: c, isDone: false, count: 1, isStunned: true });
                        if (pendingTurns.length > 1) {
                            // Remaining un-stunned turns pushed as a normal chunk
                            uniqueEntries.push({ combatant: c, isDone: false, count: pendingTurns.length - 1, isStunned: false });
                        }
                    } else {
                        uniqueEntries.push({ combatant: c, isDone: false, count: pendingTurns.length, isStunned: false });
                    }
                }
                seenIds.add(entry.combatant.id);
            }
        });

        // Map names with ' xN' suffix and inject stun color wrappers
        const namesHtml = uniqueEntries.map(e => {
            let text = e.combatant.uniqueName;
            if (e.count > 1) text += ` x${e.count}`;
            
            if (e.isStunned) {
                return `<span class="init-name-stunned" title="${t('stunned')}">${text}</span>`;
            }
            return text;
        }).join(', ');
        
        const isActive = ref === activeReflex;
        const isDone = !isActive && uniqueEntries.every(e => e.isDone);

        let slotClass = 'initiative-slot';
        if (isActive) slotClass += ' active';
        else if (isDone) slotClass += ' done';

        html += `
            <div class="${slotClass}">
                <span class="init-reflex">${ref}</span>
                <span class="init-names">${namesHtml}</span>
            </div>
        `;

        if (index < sortedReflexes.length - 1) {
            html += `<span class="init-arrow">▶</span>`;
        }
    });

    tracker.innerHTML = html;

    setTimeout(() => {
        const activeSlot = tracker.querySelector('.initiative-slot.active');
        if (activeSlot) {
            activeSlot.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
        }
        // Force refresh the Extra Panel for the currently selected character to update turn-based ability locks globally
        if (typeof selectedCharacterId !== 'undefined' && selectedCharacterId !== null && typeof renderExtraPanel === 'function') {
            renderExtraPanel(selectedCharacterId);
        }
    }, 50); 
}

// Next Turn logic: calculates turn blocks and scales down CDs based on overlapping extra turns
function nextTurn(isSilent = false) {
    if (activeCombatants.length === 0) return;

    const groups = {}; 
    
    // Check pending stops ONLY for the entire board
    activeCombatants.forEach(c => {
        if (c.isDead || c.stats.reflex === undefined || c.stats.reflex === null || c.stats.reflex === '') return;
        
        const stops = calculateReflexStops(c);
        const turnsTaken = c.turnsTakenThisRound || 0;
        
        stops.forEach((ref, index) => {
            if (index >= turnsTaken) { 
                if (!groups[ref]) groups[ref] = [];
                groups[ref].push({ combatant: c, turnIndex: index });
            }
        });
    });

    const sortedReflexes = Object.keys(groups).map(Number).sort((a, b) => b - a);

    if (sortedReflexes.length === 0) return; // No actions pending on the board

    const activeReflex = sortedReflexes[0];
    const remainingGroupsCount = sortedReflexes.length;

    // Execute logic for all combatants participating in this reflex threshold
    const actors = groups[activeReflex];
    
    // Group them to count how many consecutive turns they are taking AT ONCE (Edge case handling for stacked 1 reflex)
    const actionsPerCombatant = {};
    actors.forEach(actor => {
        if (!actionsPerCombatant[actor.combatant.id]) actionsPerCombatant[actor.combatant.id] = 0;
        actionsPerCombatant[actor.combatant.id]++;
    });

    const modifiedCombatants = [];

    Object.keys(actionsPerCombatant).forEach(id => {
        const c = activeCombatants.find(comb => comb.id === id);
        let turnsToTake = actionsPerCombatant[id];
        
        // Stun strictly consumes 1 turn action and clears itself immediately
        if (c.isStunned) {
            turnsToTake = 1;
            c.isStunned = false; 
        }

        c.turnsTakenThisRound += turnsToTake;
        
        // Cooldown reductions multiplied by how many turns they technically took
        if (c.abilitiesStates) {
            Object.keys(c.abilitiesStates).forEach(abilityName => {
                const state = c.abilitiesStates[abilityName];
                if (typeof state.currentCooldown === 'number' && state.currentCooldown > 0) {
                    state.currentCooldown = Math.max(0, state.currentCooldown - turnsToTake);
                }
            });
        }
        
        // Decrement targeted effects matching the turn amount evaluated (ONLY 't' duration states)
        if (typeof decrementEffects === 'function') {
            for (let i = 0; i < turnsToTake; i++) {
                decrementEffects(effect => {
                    const durStr = String(effect.duration || '').trim();
                    const type = durStr.slice(-1);
                    // Turn-based logic: string explicitly ends with 't' or is purely numeric (legacy compatibility)
                    const isTurnBased = type === 't' || !isNaN(type);
                    const effectiveTarget = effect.target ? effect.target : effect.invoker;
                    return effectiveTarget === c.uniqueName && isTurnBased;
                });
            }
        }

        modifiedCombatants.push(c);
    });

    // Batch update the server to avoid spamming network requests per combatant
    if (!isSilent && modifiedCombatants.length > 0) {
        if (typeof syncUpdateCombatantsBatch === 'function') syncUpdateCombatantsBatch(modifiedCombatants);
    }

    // Check if we hit the end of the round natively
    if (remainingGroupsCount <= 1) {
        if (!isProcessingRoundTransition) {
            newRound();
        }
    }
}

// New Round logic: Advances round counter natively evaluating total computed steps
function newRound() {
    isProcessingRoundTransition = true;

    // Fast forward verification
    let hasNotActed = activeCombatants.some(c => {
        if (c.isDead || c.stats.reflex === undefined || c.stats.reflex === null || c.stats.reflex === '') return false;
        const totalTurns = calculateTotalTurns(c);
        return (c.turnsTakenThisRound || 0) < totalTurns;
    });
    
    while (hasNotActed) {
        nextTurn(true); // Silent fast-forward till end
        hasNotActed = activeCombatants.some(c => {
            if (c.isDead || c.stats.reflex === undefined || c.stats.reflex === null || c.stats.reflex === '') return false;
            const totalTurns = calculateTotalTurns(c);
            return (c.turnsTakenThisRound || 0) < totalTurns;
        });
    }

    // Full round reset
    const modifiedCombatants = [];
    activeCombatants.forEach(c => {
        if (!c.isDead) {
            c.turnsTakenThisRound = 0; // Wipe history state
            modifiedCombatants.push(c);
        }
    });

    // Batch update the server
    if (modifiedCombatants.length > 0 && typeof syncUpdateCombatantsBatch === 'function') {
        syncUpdateCombatantsBatch(modifiedCombatants);
    }

    // Handle global round effect decrement logic (Round based 'r', and missing targets for 't')
    const activeNames = activeCombatants.map(c => c.uniqueName);
    if (typeof decrementEffects === 'function') {
        decrementEffects(effect => {
            const durStr = String(effect.duration || '').trim();
            const type = durStr.slice(-1);
            const isRoundBased = type === 'r';
            const isTurnBased = type === 't' || !isNaN(type);
            
            const effectiveTarget = effect.target ? effect.target : effect.invoker;
            const isOrphaned = !activeNames.includes(effectiveTarget);
            
            // Evaluates TRUE if the effect explicitly tracks rounds, or tracks turns but the target is gone
            return isRoundBased || (isTurnBased && isOrphaned);
        });
    }

    isProcessingRoundTransition = false;
}

// End Combat: Reset cooldowns and interaction histories safely
function endCombat() {
    const modifiedCombatants = [];

    activeCombatants.forEach(c => {
        if (c.team === 'enemy' && typeof syncRemoveCombatant === 'function') {
            syncRemoveCombatant(c.id);
        } else if (!c.isDead) {
            if (c.abilitiesStates) {
                Object.keys(c.abilitiesStates).forEach(abilityName => {
                    const state = c.abilitiesStates[abilityName];
                    state.currentCooldown = 0; 
                });
            }
            c.turnsTakenThisRound = 0; // Wipe history state
            modifiedCombatants.push(c);
        }
    });
    
    if (modifiedCombatants.length > 0 && typeof syncUpdateCombatantsBatch === 'function') {
        syncUpdateCombatantsBatch(modifiedCombatants);
    }

    if (typeof updateServerEffects === 'function') {
        updateServerEffects([]);
    }
}