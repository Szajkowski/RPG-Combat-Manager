// Universal function to decrement effects based on a provided logical check
function decrementEffects(shouldDecrement) {
    if (!activeEffects || activeEffects.length === 0) return;
    
    let changed = false;
    activeEffects.forEach(effect => {
        // Execute decrement only if the callback check evaluates to true
        if (shouldDecrement(effect)) {
            if (effect.duration !== undefined && effect.duration !== null && effect.duration !== "-") {
                let durStr = String(effect.duration).trim();
                let type = durStr.slice(-1); // Check for 't' or 'r'
                let num = parseInt(durStr);  // Safely extract the numeric value
                
                if (!isNaN(num) && num > 0) {
                    // Append the type suffix back if it had one (fallback to empty for legacy integers)
                    let suffix = (type === 't' || type === 'r') ? type : ''; 
                    effect.duration = (num - 1) + suffix;
                    changed = true;
                }
            }
        }
    });

    if (changed) cleanUpExpiredEffects();
}

// Filters out any effects that reached 0 and syncs changes to the server
function cleanUpExpiredEffects() {
    const filteredEffects = activeEffects.filter(effect => {
        if (effect.duration === "-") return true;
        if (effect.duration === undefined || effect.duration === null) return true;
        let num = parseInt(effect.duration); // ParseInt stops at characters, so '0r' perfectly resolves to 0
        return isNaN(num) || num > 0;
    });
    
    activeEffects = filteredEffects;
    updateServerEffects(activeEffects);
}

// Render the Active Effects Panel dynamically matching the UI layout
function renderEffects() {
    const container = document.getElementById('effects-list-container');
    if (!container) return;

    if (!activeEffects || activeEffects.length === 0) {
        container.innerHTML = `<div class="empty-list-placeholder">${t('placeholder_no_effects')}</div>`;
        return;
    }

    let html = '';
    activeEffects.forEach(effect => {
        const safeInvoker = (effect.invoker || '').replace(/'/g, "\\'");
        const safeTarget = (effect.target || '').replace(/'/g, "\\'");

        // Support both new target_ prefixed keys and legacy group target names
        const isGroupTarget = ['target_team_enemy', 'target_team_ally', 'target_all', 'team_enemy', 'team_ally', 'all', 'hero', 'enemy'].includes(effect.target);
        
        // Dynamically resolve translation for group targets (e.g., mapping 'team_enemy' to 'target_team_enemy')
        let displayTarget = effect.target;
        if (isGroupTarget) {
            let i18nKey = effect.target;
            if (!i18nKey.startsWith('target_')) {
                i18nKey = 'target_' + i18nKey;
            }
            displayTarget = t(i18nKey);
        }

        // Fetch invoker and target combatants
        const invokerCombatant = activeCharacters.find(c => c.uniqueName === effect.invoker);
        const targetCombatant = activeCharacters.find(c => c.uniqueName === effect.target);

        // Determine calculation context based on effect.source ("self" [default] vs "target")
        let evalContext = invokerCombatant;
        if (effect.source === 'target' && targetCombatant) {
            evalContext = targetCombatant;
        } else if (!evalContext && targetCombatant) {
            evalContext = targetCombatant;
        }

        // Aggregate effect properties as prefixes
        let descString = effect.description || "";
        if (effect.effectProperties && effect.effectProperties.length > 0) {
            const propsPrefix = effect.effectProperties.map(p => `[${p}]`).join(' ');
            descString = propsPrefix + (descString ? ' ' + descString : '');
        }

        const parsedDesc = executeSafely(() => parseDescription(descString, evalContext)) ?? descString;

        html += `
            <div class="effect-block">
                <div class="effect-header">
                    <span class="effect-name">${effect.name || t('effect')}</span>
                    <div class="effect-header-actions">
                        ${effect.duration !== undefined && effect.duration !== null ? `<span class="effect-duration" title="${t('effect_duration')}">${effect.duration}</span>` : ''}
                        <div class="effect-actions">
                            <button class="effect-btn remove" title="${t('effect_remove')}" onclick="removeEffect('${effect.id}')">✖</button>
                        </div>
                    </div>
                </div>
                <div class="effect-target-wrapper">
                    <span class="copyable-value" title="${t('effect_copy')}" onclick="copyValue('${safeInvoker}')">${t('effect_invoker')}</span>
                    <input type="text" class="effect-target" value="${effect.invoker || ''}" onchange="updateEffectInvoker('${effect.id}', this.value)">
                </div>
                ${effect.target ? `
                <div class="effect-target-wrapper">
                    <span class="copyable-value" title="${t('effect_copy')}" onclick="copyValue('${safeTarget}')">${t('target')}</span>
                    <input type="text" class="effect-target ${isGroupTarget ? 'readonly-group' : ''}" value="${displayTarget}" ${isGroupTarget ? 'readonly' : ''} onchange="updateEffectTarget('${effect.id}', this.value)">
                </div>
                ` : ''}
                <div class="effect-desc">${parsedDesc}</div>
            </div>
        `;
    });

    container.innerHTML = html;
}

function updateEffectInvoker(id, newInvoker) {
    if (!activeEffects) return;
    const effect = activeEffects.find(e => e.id === id);
    if (effect && effect.invoker !== newInvoker) {
        effect.invoker = newInvoker;
        updateServerEffects(activeEffects);
    }
}

function updateEffectTarget(id, newTarget) {
    if (!activeEffects) return;
    const effect = activeEffects.find(e => e.id === id);
    if (effect && effect.target !== newTarget) {
        effect.target = newTarget;
        updateServerEffects(activeEffects);
    }
}

function buildEffectObject(invoker, target, name, description, duration, source = "self", effectProperties = []) {
    // Preserve raw description so property tags like [prop_extra_turn] are searchable and dynamic
    return {
        id: `effect-${Date.now()}-${Math.random().toString(16).slice(2)}`,
        name: name,
        invoker: invoker,
        target: target || null,
        source: source || "self",
        description: description,
        duration: duration,
        effectProperties: effectProperties
    };
}

// Centralized helper to process, batch, and broadcast effects from either the new array format or legacy single format
function processAndSendEffects(invoker, target, sourceData, fallbackName, defaultSource = "self", evalData = null) {
    let newEffects = [];

    if (sourceData.effects && Array.isArray(sourceData.effects)) {
        for (const effect of sourceData.effects) {
            const isEffBeneficial = effect.effectIsBeneficial;

            // Evaluates if this specific effect should apply based on its beneficial flag and force roll results
            if (evalData && evalData.hasForcedRolls) {
                if (isEffBeneficial !== evalData.targetPassedChecks) {
                    continue; // Skip pushing this effect if the target passed/failed the save appropriately
                }
            }

            const effName = effect.effectName || effect.name || fallbackName;
            const effDesc = effect.effectDescription || effect.description || '';
            const effDuration = effect.effectDuration || effect.duration || '-';
            const effSource = effect.effectSource !== undefined ? effect.effectSource : defaultSource;
            
            let effTarget = effect.target !== undefined ? effect.target : target;
            
            // Resolves "self" tags globally (case-insensitive) to explicitly clear the UI targeting parameter internally
            if (String(effTarget).toLowerCase() === 'self' || String(sourceData.target).toLowerCase() === 'self') {
                effTarget = null; 
            }
            
            const effProps = effect.effectProperties || effect.properties || [];
            
            newEffects.push(buildEffectObject(invoker, effTarget, effName, effDesc, effDuration, effSource, effProps));
        }
    }

    // Batch update to the server to prevent multiple UI re-renders and network spikes
    if (newEffects.length > 0) {
        activeEffects = activeEffects.concat(newEffects);
        updateServerEffects(activeEffects);
    }
}

// Safely removes a specific effect and syncs it back through the server
function removeEffect(id) {
    const filteredEffects = activeEffects.filter(eff => eff.id !== id);
    updateServerEffects(filteredEffects);
}

// Universal function to completely remove all effects targeting a specific character
function removeEffectsForTarget(targetName) {
    if (!activeEffects || activeEffects.length === 0) return;
    
    const initialLength = activeEffects.length;
    const filteredEffects = activeEffects.filter(eff => eff.target !== targetName);
    
    if (filteredEffects.length !== initialLength) {
        activeEffects = filteredEffects;
        updateServerEffects(activeEffects);
    }
}