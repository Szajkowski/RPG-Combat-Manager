function selectCharacter(id) {
    selectedCharacterId = id;

    // Remove selection highlight from all tokens
    document.querySelectorAll('.character-token').forEach(token => {
        token.classList.remove('selected');
    });

    // Add highlight to the selected token
    const selectedToken = document.querySelector(`.character-token[data-id="${id}"]`);
    if (selectedToken) {
        selectedToken.classList.add('selected');
    }

    // Render the right panel with the selected character's data
    renderCharMainPanel(id);
}

function renderCharMainPanel(id) {
    const combatant = activeCharacters.find(c => c.id === id);
    if (!combatant) return;

    const mainPanel = document.getElementById('characterDetailsPanel');
    mainPanel.style.display = 'flex'; 

    // Dynamically manage placeholder and columns visibility based on selection state
    checkCharMainPanelEmptyState();

    const charSheet = document.getElementById('panel-char-sheet');
    const charFunctional = document.getElementById('panel-char-functional');
    
    const stats = combatant.currentStats;
    const hpPercentage = (stats.hp / stats.maxHp) * 100;
    const imgSrc = combatant.image ? `/api/image/${combatant.type}/${encodeURIComponent(combatant.image)}` : '/images/default-img.svg';

    // Filter and generate only the existing stats for this specific character
    // Always show all stats for completely blank custom characters (type === 'character')
    const allStats = ['vitality', 'intuition', 'strength', 'agility', 'attunement', 'perception', 'accuracy', 'reflex', 'resilience'];
    let rollsHtml = '';
    allStats.forEach(stat => {
        if (stats[stat] !== undefined || combatant.type === 'character') {
            rollsHtml += generateStatRow(combatant.id, stat, stats[stat], stats[`${stat}Mod`]);
        }
    });

    // Fetch globally saved sheet tab state from localStorage
    const savedSheetTab = localStorage.getItem('CombatManager-SheetTab') || 'tab-rolls';

    // Name formatting logic
    let charNameHtml = '';
    if (combatant.type === 'character') {
        charNameHtml = `<input type="text" class="char-name-input char-name-display" value="${combatant.uniqueName || ''}" onclick="copyInputValue(this)">`;
    } else {
        charNameHtml = `<div class="char-name-input char-name-display copyable-value text-neutral" onclick="copyValue('${combatant.uniqueName || ''}')">${combatant.uniqueName || ''}</div>`;
    }

    // 1. Render Main Character Sheet (.char-sheet)
    charSheet.innerHTML = `
        <img src="${imgSrc}" class="char-portrait-square" onerror="this.src='/images/default-img.svg'">
        <div class="char-header">
            ${charNameHtml}
        </div>
        <div class="char-hp-visual ${combatant.isDead ? 'dead' : ''}">
            <div class="char-hp-visual-fill ${getHpClass(hpPercentage, combatant.isDead)}" style="width: ${Math.max(0, Math.min(100, hpPercentage))}%;"></div>
        </div>
        <div class="hp-section">
            <span class="hp-label" data-i18n="health"></span>
            <div class="hp-inputs">
                <input type="number" class="current-hp-input" value="${stats.hp}"> / 
                <input type="number" class="max-hp-input" value="${stats.maxHp}">
            </div>
        </div>

        <div class="char-stats-container">
            ${rollsHtml} 
            <div class="stat-row derived-stat">
                <span class="stat-label" data-i18n="base_damage"></span>
                <input type="number" class="base-damage-input" value="${stats.damage || 0}">
            </div>
            <div class="stat-row derived-stat">
                <span class="stat-label" data-i18n="phys_armor_caps"></span>
                <input type="number" class="armor-val-input base-phys-armor" title="${t('armor_value_base')}" value="${stats.physArmor || 0}">
                <span class="armor-plus-sign">+</span>
                <input type="text" class="armor-perc-input base-phys-armor-mod" title="${t('armor_value_percent')}" placeholder="%" value="${stats.physArmorMod || ''}">
            </div>
            <div class="stat-row derived-stat">
                <span class="stat-label" data-i18n="mag_armor_caps"></span>
                <input type="number" class="armor-val-input base-mag-armor" title="${t('armor_value_base')}" value="${stats.magArmor || 0}">
                <span class="armor-plus-sign">+</span>
                <input type="text" class="armor-perc-input base-mag-armor-mod" title="${t('armor_value_percent')}" placeholder="%" value="${stats.magArmorMod || ''}">
            </div>
        </div>
    `;

    // 2. Re-run translation for the newly injected HTML
    document.querySelectorAll('#characterDetailsPanel [data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        if (el.tagName === 'INPUT' && el.hasAttribute('placeholder')) {
            el.setAttribute('placeholder', t(key));
        } else {
            el.textContent = t(key);
        }
    });

    // 3. Render Extra Panel
    bindMainPanelInputs(combatant);
    renderExtraPanel(id);

    // 4. Render Functional Column (.char-functional-col)
    charFunctional.innerHTML = generateFunctionalColumn(combatant);
}

function generateStatRow(combatantId, statName, value, mod) {
    return `
        <div class="stat-row">
            <span class="stat-label" data-i18n="${statName}"></span>
            <input type="number" class="stat-val-input" data-stat="${statName}" value="${value || ''}">
            <input type="text" class="stat-mod-input" data-stat="${statName}Mod" placeholder="mod" value="${mod || ''}">
            <button class="roll-btn" onclick="rollSingleStat('${combatantId}', '${statName}')">${t('roll')}</button>
        </div>
    `;
}

function applyAllModifiers(combatant) {
    const updatedStats = JSON.parse(JSON.stringify(combatant.baselineStats));
    
    let physDamageMult = 1.0;
    let magDamageMult = 1.0;

    if (updatedStats.physArmorPerc) {
        const basePhysPerc = parseFloat(updatedStats.physArmorPerc);
        physDamageMult *= basePhysPerc > 0 ? (1 - basePhysPerc / 100) : (1 + Math.abs(basePhysPerc) / 100);
    }
    if (updatedStats.magArmorPerc) {
        const baseMagPerc = parseFloat(updatedStats.magArmorPerc);
        magDamageMult *= baseMagPerc > 0 ? (1 - baseMagPerc / 100) : (1 + Math.abs(baseMagPerc) / 100);
    }

    // 1. Apply equipment modifiers
    if (combatant.equipment && Array.isArray(combatant.equipment)) {
        combatant.equipment.forEach(item => {
            if (item.type !== 'gear' || !item.stats) return;

            Object.keys(item.stats).forEach(statKey => {
                let statVal = item.stats[statKey];
                let numericVal = 0;

                if (typeof statVal === 'string' && statVal.includes('[')) {
                    // Evaluate formula strictly against the UNMODIFIED baselineStats to prevent item synergy
                    numericVal = evaluateFormula(statVal, combatant.baselineStats);
                } else {
                    numericVal = parseFloat(statVal) || 0;
                }

                // Handle percentage armors specifically to maintain multiplicative diminishing returns
                if (statKey === 'physArmorPerc') {
                    physDamageMult *= numericVal > 0 ? (1 - numericVal / 100) : (1 + Math.abs(numericVal) / 100);
                } else if (statKey === 'magArmorPerc') {
                    magDamageMult *= numericVal > 0 ? (1 - numericVal / 100) : (1 + Math.abs(numericVal) / 100);
                } else {
                    updatedStats[statKey] = (updatedStats[statKey] || 0) + numericVal;
                    
                    // Vitality secretly adds 10 HP per point dynamically
                    if (statKey === "vitality") {
                        updatedStats.maxHp = (updatedStats.maxHp || 0) + 10 * numericVal;
                    }
                }
            });
        });
    }

    // 2. Apply active effects modifiers
    if (typeof activeEffects !== 'undefined' && Array.isArray(activeEffects)) {
        activeEffects.forEach(effect => {
            const targetName = effect.target ? effect.target : effect.invoker;
            if (targetName !== combatant.uniqueName) return; 
            if (!effect.stats) return; 

            // Determine evaluation context based on effect source
            let contextCombatant = combatant; 
            if (effect.source === "self" || effect.source === "invoker") {
                const invoker = activeCharacters.find(c => c.uniqueName === effect.invoker);
                if (invoker) contextCombatant = invoker;
            }
            
            const evalContextStats = contextCombatant.baselineStats;

            Object.keys(effect.stats).forEach(statKey => {
                let statVal = effect.stats[statKey];
                let numericVal = 0;

                if (typeof statVal === 'string' && statVal.includes('[')) {
                    numericVal = evaluateFormula(statVal, evalContextStats);
                } else {
                    numericVal = parseFloat(statVal) || 0;
                }

                if (statKey === 'physArmorPerc') {
                    physDamageMult *= numericVal > 0 ? (1 - numericVal / 100) : (1 + Math.abs(numericVal) / 100);
                } else if (statKey === 'magArmorPerc') {
                    magDamageMult *= numericVal > 0 ? (1 - numericVal / 100) : (1 + Math.abs(numericVal) / 100);
                } else {
                    updatedStats[statKey] = (updatedStats[statKey] || 0) + numericVal;
                    
                    if (statKey === "vitality") {
                        updatedStats.maxHp = (updatedStats.maxHp || 0) + 10 * numericVal;
                    }
                }
            });
        });
    }

    const finalPhysPercent = (1 - physDamageMult) * 100;
    const finalMagPercent = (1 - magDamageMult) * 100;

    updatedStats.physArmorMod = Math.round(finalPhysPercent) !== 0 ? `${Math.round(finalPhysPercent)}%` : '';
    updatedStats.magArmorMod = Math.round(finalMagPercent) !== 0 ? `${Math.round(finalMagPercent)}%` : '';

    // Format modifiers to include the '+' sign for UI display
    Object.keys(updatedStats).forEach(key => {
        if (key.endsWith("Mod") && key !== "physArmorMod" && key !== "magArmorMod") {
            updatedStats[key] = formatSigned(updatedStats[key]);
        }
    });

    return updatedStats;
}

// Safely recalculates currentStats based on the baseline properties and the pipeline
function recalculateCurrentStats(combatant) {
    const previousMaxHp = combatant.currentStats ? (combatant.currentStats.maxHp || 10) : (combatant.baselineStats.maxHp || 10);
    const currentHp = combatant.currentStats ? combatant.currentStats.hp : combatant.baselineStats.hp;
    
    // Rebuild pipeline from scratch based on baseline, equipment and effects
    combatant.currentStats = applyAllModifiers(combatant);
    
    const newMaxHp = combatant.currentStats.maxHp || 10;
    const hpDelta = newMaxHp - previousMaxHp;

    if (currentHp !== undefined) {
        // If max HP increased, we add the difference to current HP. If it decreased, hpDelta is negative, we just clamp.
        const bonusHp = hpDelta > 0 ? hpDelta : 0;
        combatant.currentStats.hp = Math.min(currentHp + bonusHp, newMaxHp);
    }

    // Safely update the additional fields in the UI instantly if still focused
    if (typeof selectedCharacterId !== 'undefined' && selectedCharacterId === combatant.id) {
        const dmgInput = document.querySelector('.base-damage-input');
        if (dmgInput) dmgInput.value = combatant.currentStats.damage || 0;
        
        const physArmorInput = document.querySelector('.base-phys-armor');
        if (physArmorInput) physArmorInput.value = combatant.currentStats.physArmor || 0;
        
        const physArmorModInput = document.querySelector('.base-phys-armor-mod');
        if (physArmorModInput) physArmorModInput.value = combatant.currentStats.physArmorMod || '';
        
        const magArmorInput = document.querySelector('.base-mag-armor');
        if (magArmorInput) magArmorInput.value = combatant.currentStats.magArmor || 0;
        
        const magArmorModInput = document.querySelector('.base-mag-armor-mod');
        if (magArmorModInput) magArmorModInput.value = combatant.currentStats.magArmorMod || '';
    }
}

// Formats modifiers to include a '+' sign for positive values. Handles empty inputs to prevent NaN bugs.
function formatSigned(value) {
    if (value === 0 || value === "0" || value === "" || value === null || value === undefined) return '';
    const floatVal = parseFloat(value);
    if (isNaN(floatVal)) return '';
    return `${floatVal > 0 ? '+' : ''}${floatVal}`;
}

function evaluateFormula(formula, stats) {
    try {
        // Remove square brackets if they were passed in the formula string
        const cleanFormula = formula.replace(/[\[\]]/g, '');

        // Replace stats with values without translation
        const evaluatedFormula = cleanFormula.replace(/\b([a-zA-Z_]+)\b/gi, (stat) => {
            const statValue = stats[stat] !== undefined ? stats[stat] : 0;
            return statValue;
        });

        // Security Check: Only allow digits, basic math operators, dots, and spaces.
        if (!/^[0-9+\-*/().\s]+$/.test(evaluatedFormula)) {
            throw new Error("Formula contains invalid/unsafe characters!");
        }

        // Calculate formula result using secure Function constructor
        // Math.round is used to handle potential decimals from the gear multipliers properly
        const result = Math.round(new Function('return ' + evaluatedFormula)());
        return result;

    } catch (e) {
        console.error(`Error calculating formula: ${formula}`, e);
        return 0;
    }
}

// Binds inputs from the Right Panel directly to the activeCharacters state using delta calculation
function bindMainPanelInputs(combatantData) {
    const charSheet = document.getElementById('panel-char-sheet');

    // Handle Name change strictly enforcing that we only bind if it's an INPUT tag
    const nameInput = charSheet.querySelector('input.char-name-input');
    if (nameInput) {
        nameInput.addEventListener('change', (e) => {
            // ALWAYS fetch the freshest memory object to avoid overwriting network changes (like HP)
            const freshCombatant = activeCharacters.find(c => c.id === combatantData.id);
            if(!freshCombatant) return;

            freshCombatant.uniqueName = e.target.value;
            syncUpdateCombatant(freshCombatant);
        });
    }

    // Handle Core Stats Delta
    const coreInputs = charSheet.querySelectorAll('.stat-val-input:not(.base-damage-input), .stat-mod-input');
    coreInputs.forEach(input => {
        input.addEventListener('change', (e) => {
            const freshCombatant = activeCharacters.find(c => c.id === combatantData.id);
            if(!freshCombatant) return;
            
            const statKey = e.target.dataset.stat;
            let val = e.target.value;

            // Enforce minimum value of 1 for core stat fields visually
            if (!statKey.endsWith('Mod') && val !== '') {
                let parsed = parseInt(val);
                if (isNaN(parsed) || parsed < 1) parsed = 1;
                val = parsed;
                e.target.value = val; 
            }

            // CALCULATE DELTA: Difference between the input and currentStats value
            const currentVal = parseInt(freshCombatant.currentStats[statKey]) || 0;
            const delta = (parseInt(val) || 0) - currentVal;
            
            // Apply delta to baselineStats to prevent double overwriting by equipment
            freshCombatant.baselineStats[statKey] = (parseInt(freshCombatant.baselineStats[statKey]) || 0) + delta;
            
            recalculateCurrentStats(freshCombatant);
            syncUpdateCombatant(freshCombatant);
        });
    });

    // Handle Manual Additional Stats changes Delta
    const additionalInputs = charSheet.querySelectorAll('.base-damage-input, .base-phys-armor, .base-phys-armor-mod, .base-mag-armor, .base-mag-armor-mod');
    additionalInputs.forEach(input => {
        input.addEventListener('change', (e) => {
            const freshCombatant = activeCharacters.find(c => c.id === combatantData.id);
            if(!freshCombatant) return;

            let statKey = '';
            if (e.target.classList.contains('base-damage-input')) statKey = 'damage';
            if (e.target.classList.contains('base-phys-armor')) statKey = 'physArmor';
            if (e.target.classList.contains('base-phys-armor-mod')) statKey = 'physArmorMod';
            if (e.target.classList.contains('base-mag-armor')) statKey = 'magArmor';
            if (e.target.classList.contains('base-mag-armor-mod')) statKey = 'magArmorMod';

            let val = e.target.value;
            
            const currentValStr = String(freshCombatant.currentStats[statKey] || '0').replace('%', '');
            const currentVal = parseFloat(currentValStr) || 0;
            
            const newValStr = String(val).replace('%', '');
            const newVal = parseFloat(newValStr) || 0;

            const delta = newVal - currentVal;
            
            const baseValStr = String(freshCombatant.baselineStats[statKey] || '0').replace('%', '');
            const baseVal = parseFloat(baseValStr) || 0;
            
            let finalBaseline = baseVal + delta;
            if (statKey.endsWith('Mod') && statKey.includes('Armor')) {
                freshCombatant.baselineStats[statKey] = `${finalBaseline}%`;
            } else {
                freshCombatant.baselineStats[statKey] = finalBaseline;
            }

            recalculateCurrentStats(freshCombatant);
            syncUpdateCombatant(freshCombatant);
        });
    });

    // Handle manual HP input changes
    const hpInputs = charSheet.querySelectorAll('.current-hp-input, .max-hp-input');
    hpInputs.forEach(input => {
        input.addEventListener('change', (e) => {
            const freshCombatant = activeCharacters.find(c => c.id === combatantData.id);
            if(!freshCombatant) return;

            if (e.target.classList.contains('current-hp-input')) {
                // HP only modifies currentStats.hp (we don't move this to baseline, it's a dynamic resource)
                freshCombatant.currentStats.hp = parseInt(e.target.value) || 0;
            }
            if (e.target.classList.contains('max-hp-input')) {
                // maxHp keeps the delta logic relative to baseline
                const newVal = parseInt(e.target.value) || 1;
                const delta = newVal - (parseInt(freshCombatant.currentStats.maxHp) || 1);
                freshCombatant.baselineStats.maxHp = (parseInt(freshCombatant.baselineStats.maxHp) || 1) + delta;
                recalculateCurrentStats(freshCombatant);
            }

            syncUpdateCombatant(freshCombatant);
        });
    });
}

// Checks right panel state and manages the placeholder or component visibility based on character selection
function checkCharMainPanelEmptyState() {
    const mainPanel = document.getElementById('characterDetailsPanel');
    if (!mainPanel) return;

    // Determine if the panel should be empty (no character selected or character no longer exists)
    const isEmpty = !selectedCharacterId || !activeCharacters.some(c => c.id === selectedCharacterId);

    const sheetEl = document.getElementById('panel-char-sheet');
    const functionalEl = document.getElementById('panel-char-functional');
    const extraEl = document.getElementById('panel-extra');

    if (isEmpty) {
        // Hide standard components to clear the space
        [sheetEl, functionalEl, extraEl].forEach(el => {
            if (el) {
                el.style.display = 'none';
                el.innerHTML = ''; // Thoroughly clear their content
            }
        });

        // Insert placeholder if it doesn't already exist
        if (!document.getElementById('right-panel-placeholder')) {
            const placeholder = document.createElement('div');
            placeholder.id = 'right-panel-placeholder';
            placeholder.className = 'right-panel-placeholder';
            placeholder.textContent = t('placeholder_no_character_selected');
            mainPanel.appendChild(placeholder);
        }
    } else {
        // Restore standard component displays
        [sheetEl, functionalEl, extraEl].forEach(el => {
            if (el) el.style.display = '';
        });

        // Remove the placeholder if it exists in the DOM
        const placeholder = document.getElementById('right-panel-placeholder');
        if (placeholder) {
            placeholder.remove();
        }
    }
}