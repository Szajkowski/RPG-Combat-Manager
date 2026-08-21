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

    const physVal = stats.physArmor || 0;
    const magVal = stats.magArmor || 0;
    
    // Separate scaling logic for the character sheet using sheet-specific CSS classes
    const physScaleClass = physVal > 999 ? 'sheet-text-xs' : (physVal > 99 ? 'sheet-text-sm' : '');
    const magScaleClass = magVal > 999 ? 'sheet-text-xs' : (magVal > 99 ? 'sheet-text-sm' : '');

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

        <div class="sheet-armor-container-split">
            <div class="sheet-armor-box">
                <span class="stat-label" data-i18n="phys_armor"></span>
                <div class="armor-shield phys sheet-armor-shield" title="${t('phys_armor_caps')}">
                    <input type="number" class="sheet-armor-input base-phys-armor ${physScaleClass}" data-val="${physVal}" value="${physVal}">
                </div>
            </div>
            <div class="sheet-armor-box">
                <span class="stat-label" data-i18n="mag_armor"></span>
                <div class="armor-shield mag sheet-armor-shield" title="${t('mag_armor_caps')}">
                    <input type="number" class="sheet-armor-input base-mag-armor ${magScaleClass}" data-val="${magVal}" value="${magVal}">
                </div>
            </div>
        </div>

        <div class="char-stats-container">
            ${rollsHtml} 
            <div class="stat-row derived-stat">
                <span class="stat-label" data-i18n="base_damage"></span>
                <input type="number" class="base-damage-input" value="${stats.damage || 0}">
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

// Sub-function explicitly handling items
function applyEquipmentStats(combatant, updatedStats) {
    if (!combatant.equipment || !Array.isArray(combatant.equipment)) return;

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

            // Ignore old percentage armor values if they remained in old data files
            if (statKey.includes('ArmorPerc') || statKey.includes('ArmorMod')) return;

            // Armor values from gear are handled independently by calculateEquipmentArmor now
            if (statKey === 'physArmor' || statKey === 'magArmor') return;

            updatedStats[statKey] = (updatedStats[statKey] || 0) + numericVal;
            
            // Vitality secretly adds 10 HP per point dynamically
            if (statKey === "vitality") {
                updatedStats.maxHp = (updatedStats.maxHp || 0) + 10 * numericVal;
            }
        });
    });
}

// New isolated function to calculate armor granted purely by equipment
function calculateEquipmentArmor(combatant, baseStats = null) {
    let armor = { physArmor: 0, magArmor: 0 };
    if (!combatant.equipment || !Array.isArray(combatant.equipment)) return armor;
    
    const evalContext = baseStats || combatant.baselineStats;
    
    combatant.equipment.forEach(item => {
        if (item.type !== 'gear' || !item.stats) return;
        
        ['physArmor', 'magArmor'].forEach(statKey => {
            if (item.stats[statKey] !== undefined) {
                let statVal = item.stats[statKey];
                let numericVal = typeof statVal === 'string' && statVal.includes('[') ? evaluateFormula(statVal, evalContext) : parseFloat(statVal);
                armor[statKey] += numericVal || 0;
            }
        });
    });
    return armor;
}

// Sub-function explicitly handling active effects
function applyEffectsStats(combatant, updatedStats) {
    if (typeof activeEffects === 'undefined' || !Array.isArray(activeEffects)) return;

    activeEffects.forEach(effect => {
        // Evaluate if the effect modifies stats AND actively targets the current combatant
        const targetName = effect.target ? effect.target : effect.invoker;
        if (targetName !== combatant.uniqueName) return; 
        if (!effect.stats) return; 

        // Determine evaluation context based on effect source ("self" uses invoker's stats for math formulas)
        let contextCombatant = combatant; 
        if (effect.source === "self" || effect.source === "invoker") {
            const invoker = activeCharacters.find(c => c.uniqueName === effect.invoker);
            if (invoker) contextCombatant = invoker;
        }
        
        const evalContextStats = contextCombatant.baselineStats;

        Object.keys(effect.stats).forEach(statKey => {
            // Effects completely ignore passive armors (shields do not scale passively)
            if (statKey.includes('Armor')) return;

            let statVal = effect.stats[statKey];
            let numericVal = 0;

            if (typeof statVal === 'string' && statVal.includes('[')) {
                numericVal = evaluateFormula(statVal, evalContextStats);
            } else {
                numericVal = parseFloat(statVal) || 0;
            }

            updatedStats[statKey] = (updatedStats[statKey] || 0) + numericVal;
            
            if (statKey === "vitality") {
                updatedStats.maxHp = (updatedStats.maxHp || 0) + 10 * numericVal;
            }
        });
    });
}

// Wrapper applying all statistical modifiers dynamically
function applyAllModifiers(combatant) {
    const updatedStats = JSON.parse(JSON.stringify(combatant.baselineStats));
    
    // 1. Apply equipment modifiers
    applyEquipmentStats(combatant, updatedStats);

    // 2. Apply active effects modifiers
    applyEffectsStats(combatant, updatedStats);

    // 3. Enforce minimum value of 1 for core stats and damage
    const coreStatsAndDamage = ['vitality', 'intuition', 'strength', 'agility', 'attunement', 'perception', 'accuracy', 'reflex', 'resilience', 'damage'];
    coreStatsAndDamage.forEach(stat => {
        if (updatedStats[stat] !== undefined) {
            updatedStats[stat] = Math.max(1, updatedStats[stat]);
        }
    });

    // Format modifiers to include the '+' sign for UI display
    Object.keys(updatedStats).forEach(key => {
        if (key.endsWith("Mod")) {
            updatedStats[key] = formatSigned(updatedStats[key]);
        }
    });

    return updatedStats;
}

// Safely recalculates currentStats based on the baseline properties and the pipeline
function recalculateCurrentStats(combatant) {
    const previousMaxHp = combatant.currentStats ? (combatant.currentStats.maxHp || 10) : (combatant.baselineStats.maxHp || 10);
    const currentHp = combatant.currentStats ? combatant.currentStats.hp : combatant.baselineStats.hp;
    
    // Store expected max base armor and current armor to calculate equipment deltas
    const prevExpectedPhys = combatant.currentStats ? (combatant.currentStats.expectedBasePhys || 0) : (parseInt(combatant.baselineStats.physArmor) || 0);
    const prevExpectedMag = combatant.currentStats ? (combatant.currentStats.expectedBaseMag || 0) : (parseInt(combatant.baselineStats.magArmor) || 0);
    
    const currentPhys = combatant.currentStats ? (combatant.currentStats.physArmor || 0) : (parseInt(combatant.baselineStats.physArmor) || 0);
    const currentMag = combatant.currentStats ? (combatant.currentStats.magArmor || 0) : (parseInt(combatant.baselineStats.magArmor) || 0);

    // Rebuild pipeline from scratch based on baseline, equipment and effects
    combatant.currentStats = applyAllModifiers(combatant);
    
    const newMaxHp = combatant.currentStats.maxHp || 10;
    const hpDelta = newMaxHp - previousMaxHp;

    if (currentHp !== undefined) {
        // If max HP increased, we add the difference to current HP. If it decreased, hpDelta is negative, we just clamp.
        const bonusHp = hpDelta > 0 ? hpDelta : 0;
        combatant.currentStats.hp = Math.min(currentHp + bonusHp, newMaxHp);
    }

    // Calculate equipment armor independently
    const equipArmor = calculateEquipmentArmor(combatant);

    // Calculate new base armors with modifiers and add the difference (e.g. equipping gear) to current ablative armor
    const expectedBasePhys = (parseInt(combatant.baselineStats.physArmor) || 0) + equipArmor.physArmor;
    const expectedBaseMag = (parseInt(combatant.baselineStats.magArmor) || 0) + equipArmor.magArmor;
    
    const physDelta = expectedBasePhys - prevExpectedPhys;
    const magDelta = expectedBaseMag - prevExpectedMag;
    
    combatant.currentStats.expectedBasePhys = expectedBasePhys;
    combatant.currentStats.expectedBaseMag = expectedBaseMag;
    
    combatant.currentStats.physArmor = Math.max(0, currentPhys + physDelta);
    combatant.currentStats.magArmor = Math.max(0, currentMag + magDelta);

    // Safely update the additional fields in the UI instantly if still focused
    if (typeof selectedCharacterId !== 'undefined' && selectedCharacterId === combatant.id) {
        const dmgInput = document.querySelector('.base-damage-input');
        if (dmgInput) dmgInput.value = combatant.currentStats.damage || 0;
        
        const physArmorInput = document.querySelector('.base-phys-armor');
        if (physArmorInput) physArmorInput.value = combatant.currentStats.physArmor || 0;
        
        const magArmorInput = document.querySelector('.base-mag-armor');
        if (magArmorInput) magArmorInput.value = combatant.currentStats.magArmor || 0;
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
    const additionalInputs = charSheet.querySelectorAll('.base-damage-input, .base-phys-armor, .base-mag-armor');
    additionalInputs.forEach(input => {
        input.addEventListener('change', (e) => {
            const freshCombatant = activeCharacters.find(c => c.id === combatantData.id);
            if(!freshCombatant) return;

            let statKey = '';
            if (e.target.classList.contains('base-damage-input')) statKey = 'damage';
            if (e.target.classList.contains('base-phys-armor')) statKey = 'physArmor';
            if (e.target.classList.contains('base-mag-armor')) statKey = 'magArmor';

            let val = e.target.value;
            let newVal = parseFloat(val) || 0;

            // Enforce minimum value of 1 for damage
            if (statKey === 'damage' && newVal < 1) {
                newVal = 1;
                e.target.value = 1;
            }

            if (statKey === 'physArmor' || statKey === 'magArmor') {
                // For ablative armor, manual change directly overwrites current armor
                const currentVal = parseFloat(freshCombatant.currentStats[statKey]) || 0;
                const delta = newVal - currentVal;
                
                freshCombatant.currentStats[statKey] = newVal;
                
                // Modify baseline to survive reload, and expected base to prevent recalculation overwrite
                freshCombatant.baselineStats[statKey] = (parseFloat(freshCombatant.baselineStats[statKey]) || 0) + delta;
                if (statKey === 'physArmor') freshCombatant.currentStats.expectedBasePhys = (freshCombatant.currentStats.expectedBasePhys || 0) + delta;
                if (statKey === 'magArmor') freshCombatant.currentStats.expectedBaseMag = (freshCombatant.currentStats.expectedBaseMag || 0) + delta;
            } else {
                const currentValStr = String(freshCombatant.currentStats[statKey] || '0');
                const currentVal = parseFloat(currentValStr) || 0;
                const delta = newVal - currentVal;
                const baseValStr = String(freshCombatant.baselineStats[statKey] || '0');
                const baseVal = parseFloat(baseValStr) || 0;
                
                freshCombatant.baselineStats[statKey] = baseVal + delta;
                recalculateCurrentStats(freshCombatant);
            }

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