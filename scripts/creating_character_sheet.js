// Generates a unique ID for each character instance on the board
function generateId() {
    return 'char-' + Date.now().toString(36) + '-' + Math.random().toString(36).substr(2, 5);
}

function getUniqueCharacterName(baseName) {
    // Get all existing character names from memory
    const existingNames = activeCombatants.map(c => c.uniqueName); 

    let uniqueName = baseName;
    let counter = 2;

    while (existingNames.includes(uniqueName)) {
        uniqueName = `${baseName} ${counter}`;
        counter++;
    }

    return uniqueName;
}

function removeUniqueNameNumber(charName) {
    return charName.replace(/\s\d{1,2}$/, ''); // Match a space and a number (1-2 digits) at the end and remove
}

function addSpecificCharacter(type, name, team) {
    if (type === 'mob' && mobs[name]) {
        addCharacter('mob', team, mobs[name], name);
    } else if (type === 'npc' && npcs[name]) {
        addCharacter('npc', team, npcs[name], name);  
    } else if (type === 'boss' && bosses[name]) {
        addCharacter('boss', team, bosses[name], name);
    } else if (type === 'player' && players[name]) {
        addCharacter('player', team, players[name], name); 
    } else if (type === 'character') {
        addCharacter('character', team, { name: '' }, '');
    }
}

// Core character creation: Calculates stats and sends the new combatant to the server
function addCharacter(type, team, stats = {}, image = null) {
    let uniqueName = '';
    // Determine unique name
    if (stats.name) {
        uniqueName = getUniqueCharacterName(stats.name);
    }

    // Update stats based on equipment
    const finalStats = applyGearBonuses(stats);

    // Set default HP values if missing
    if (finalStats.hp === undefined) finalStats.hp = 10;
    if (finalStats.maxHp === undefined) finalStats.maxHp = 10;

    // Initialize abilities states directly in memory
    const initialAbilitiesStates = {};
    if (stats.abilities && Array.isArray(stats.abilities)) {
        stats.abilities.forEach(ability => {
            const isSingleUse = ability.cooldown === "[cooldown_once]";
            const maxCooldown = isSingleUse ? Infinity : (!ability.cooldown && ability.cooldown !== 0 ? 0 : parseInt(ability.cooldown) + 1);
            
            initialAbilitiesStates[ability.name] = {
                currentCooldown: 0,
                maxCooldown: maxCooldown,
                singleUse: isSingleUse
            };
        });
    }

    // Create the rich character object in memory holding EVERYTHING
    const combatant = {
        id: generateId(),
        uniqueName: uniqueName,
        baseName: stats.name || '',
        type: type,
        team: team,
        image: image,
        stats: finalStats,
        equipment: stats.equipment ? JSON.parse(JSON.stringify(stats.equipment)) : [],
        abilities: stats.abilities ? JSON.parse(JSON.stringify(stats.abilities)) : [],
        abilitiesStates: initialAbilitiesStates,
        lastRoll: { stat: '', result: '', color: 'white' }, // New dictionary for keeping track of dice rolls
        isDead: finalStats.isDead === true || finalStats.isDead === "true",
        hasDeathsDoor: finalStats.hasDeathsDoor === true || finalStats.hasDeathsDoor === "true",
        hasActedThisRound: false,
        isStunned: false
    };

    // Push to server -> which will broadcast it back to everyone (including GM) and trigger renderToken()
    syncAddCombatant(combatant);
}

// Renders the token visually on the board based on the combatant object
function renderToken(combatant) {
    const teamDiv = document.getElementById(combatant.team + 'Team');
    if (!teamDiv) return;

    // Build Token HTML
    const tokenDiv = document.createElement('div');
    tokenDiv.className = `character-token ${combatant.team}-token ${combatant.isDead ? 'dead' : ''}`;
    tokenDiv.dataset.id = combatant.id;
    tokenDiv.onclick = () => selectCharacter(combatant.id);

    const imgSrc = combatant.image ? `/api/image/${combatant.type}/${encodeURIComponent(combatant.image)}` : '/images/default-img.svg';
    const imgAlt = combatant.image ? combatant.image : t('unknown_character');
    const hpPercentage = (combatant.stats.hp / combatant.stats.maxHp) * 100;

    tokenDiv.innerHTML = `
        <img src="${imgSrc}" class="token-img" alt="${imgAlt}" onerror="this.src='/images/default-img.svg'">
        <div class="token-hp-bg">
            <div class="token-hp-fill ${getHpClass(hpPercentage, combatant.isDead)}" style="width: ${Math.max(0, Math.min(100, hpPercentage))}%;"></div>
        </div>
        <div class="token-name">${combatant.uniqueName || t('unknown_character')}</div>
    `;

    teamDiv.appendChild(tokenDiv);
}

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
    renderRightPanel(id);
}

function renderRightPanel(id) {
    const combatant = activeCombatants.find(c => c.id === id);
    if (!combatant) return;

    const rightPanel = document.getElementById('characterDetailsPanel');
    rightPanel.style.display = 'flex'; 

    const charSheet = document.getElementById('panel-char-sheet');
    const charFunctional = document.getElementById('panel-char-functional');
    
    const stats = combatant.stats;
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

    // Dynamically prepare the Last Roll string
    const rollLabelText = combatant.lastRoll.stat ? `${t('last_roll')} (${t(combatant.lastRoll.stat)})` : t('last_roll');
    const rollResultText = combatant.lastRoll.result || '-';

    // 1. Render Main Character Sheet (.char-sheet)
    charSheet.innerHTML = `
        <img src="${imgSrc}" class="char-portrait-square" onerror="this.src='/images/default-img.svg'">
        <div class="char-header">
            <input type="text" class="char-name-input" value="${combatant.uniqueName || ''}">
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

        <div class="char-internal-tabs">
            <div class="char-internal-tab ${savedSheetTab === 'tab-rolls' ? 'active' : ''}" data-target="tab-rolls" data-i18n="tab_rolls"></div>
            <div class="char-internal-tab ${savedSheetTab === 'tab-damage' ? 'active' : ''}" data-target="tab-damage" data-i18n="tab_damage"></div>
        </div>

        <div class="char-tab-content ${savedSheetTab === 'tab-rolls' ? 'active' : ''}" id="tab-rolls">
            ${rollsHtml}
        </div>

        <div class="char-tab-content ${savedSheetTab === 'tab-damage' ? 'active' : ''}" id="tab-damage">
            <div class="complex-control dmg-group">
                <div class="complex-header">
                    <span class="complex-label" data-i18n="damage"></span>
                    <button class="complex-toggle" onclick="toggleMode(this)" data-i18n="value_flat"></button>
                </div>
                <div class="complex-body">
                    <input type="number" class="damage-input" placeholder="" data-i18n="value">
                    <button title="${t('dmg_type_phys')}" onclick="applyDamage('phys')" data-i18n="dmg_type_phys_short"></button>
                    <button title="${t('dmg_type_mag')}" onclick="applyDamage('mag')" data-i18n="dmg_type_mag_short"></button>
                    <button title="${t('dmg_type_pierce')}" onclick="applyDamage('pierce')" data-i18n="dmg_type_pierce_short"></button>
                </div>
            </div>

            <div class="complex-control heal-group">
                <div class="complex-header">
                    <span class="complex-label" data-i18n="heal"></span>
                    <button class="complex-toggle" onclick="toggleMode(this)" data-i18n="value_flat"></button>
                </div>
                <div class="complex-body">
                    <input type="number" class="heal-input" placeholder="" data-i18n="value">
                    <button title="${t('heal_type_normal')}" onclick="healDamage('single')" data-i18n="heal_type_normal_short"></button>
                    <button title="${t('heal_type_threshold')}" onclick="healDamage('threshold')" data-i18n="heal_type_threshold_short"></button>
                    <button title="${t('heal_type_group')}" onclick="healDamage('group')" data-i18n="heal_type_group_short"></button>
                </div>
            </div>

            <div class="complex-control armor-group">
                <div class="complex-header">
                    <span class="complex-label" data-i18n="add_armor"></span>
                    <button class="complex-toggle" onclick="toggleMode(this)" data-i18n="value_flat"></button>
                </div>
                <div class="complex-body">
                    <input type="number" class="armor-input" placeholder="" data-i18n="value">
                    <button title="${t('armor_type_phys')}" onclick="changeArmor('phys')" data-i18n="armor_type_phys_short"></button>
                    <button title="${t('armor_type_mag')}" onclick="changeArmor('mag')" data-i18n="armor_type_mag_short"></button>
                </div>
            </div>

            <div class="stat-row" style="border-color: #44475a;">
                <span class="stat-label" data-i18n="base_damage"></span>
                <input type="number" class="base-damage-input" style="margin:0;" value="${stats.damage || 0}">
            </div>
            <div class="stat-row" style="border-color: #44475a;">
                <span class="stat-label" data-i18n="phys_armor_caps"></span>
                <input type="number" class="armor-val-input base-phys-armor" title="${t('armor_value_base')}" value="${stats.physArmor || 0}">
                <span class="armor-plus-sign">+</span>
                <input type="text" class="armor-perc-input base-phys-armor-mod" title="${t('armor_value_percent')}" value="${stats.physArmorMod || ''}">
            </div>
            <div class="stat-row" style="border-color: #44475a;">
                <span class="stat-label" data-i18n="mag_armor_caps"></span>
                <input type="number" class="armor-val-input base-mag-armor" title="${t('armor_value_base')}" value="${stats.magArmor || 0}">
                <span class="armor-plus-sign">+</span>
                <input type="text" class="armor-perc-input base-mag-armor-mod" title="${t('armor_value_percent')}" value="${stats.magArmorMod || ''}">
            </div>
        </div>

        <div class="dice-result-box">
            <div class="dice-result-label">${rollLabelText}</div>
            <div class="dice-result-value" id="last-roll-display" style="color: ${combatant.lastRoll.color};">${rollResultText}</div>
        </div>
    `;

    // 2. Render Functional Column (.char-functional-col)
    charFunctional.innerHTML = `
    <button class="func-btn delete" title="${t('delete_character')}" onclick="removeCharacter()">✖</button>
    <button class="func-btn stun ${combatant.isStunned ? 'active' : ''}" title="${t('toggle_stun')}" onclick="toggleStun()">🌟</button>
    ${combatant.type !== 'character' ? `<button class="func-btn reload" title="${t('reload_character')}" onclick="reloadCharacterData()">↻</button>` : ''}
`;

    // 3. Re-run translation for the newly injected HTML
    document.querySelectorAll('#characterDetailsPanel [data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        if (el.tagName === 'INPUT' && el.hasAttribute('placeholder')) {
            el.setAttribute('placeholder', t(key));
        } else {
            el.textContent = t(key);
        }
    });

    // 4. Attach event listeners to tabs
    document.querySelectorAll('.char-internal-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            const target = tab.dataset.target;
            localStorage.setItem('CombatManager-SheetTab', target);
            
            document.querySelectorAll('.char-internal-tab').forEach(t => t.classList.remove('active'));
            document.querySelectorAll('.char-sheet .char-tab-content').forEach(c => c.classList.remove('active'));
            
            tab.classList.add('active');
            document.getElementById(target).classList.add('active');
        });
    });

    bindRightPanelInputs(combatant);
    if (typeof renderExtraPanel === 'function') renderExtraPanel(id);
}

function generateStatRow(combatantId, statName, value, mod) {
    return `
        <div class="stat-row">
            <span class="stat-label" data-i18n="${statName}"></span>
            <input type="number" class="stat-val-input" data-stat="${statName}" value="${value || ''}">
            <input type="text" class="stat-mod-input" data-stat="${statName}Mod" placeholder="mod" value="${mod || ''}">
            <button class="roll-btn" onclick="rollDice('${combatantId}', '${statName}')">${t('roll')}</button>
        </div>
    `;
}

// Calculates core stats (HP, Strength, Agility, etc.) from item description tags
function calculateCoreStatBonuses(stats) {
    const updatedStats = { ...stats };
    if (!stats.equipment || !Array.isArray(stats.equipment)) return updatedStats;

    stats.equipment.forEach(item => {
        if (item.type !== 'gear' || !item.description) return;

        // Extract and process tags like [+2 strength], [-1 agility mod], [+50 hp]
        const statBonuses = item.description.match(/\[([+-]?\d+(?:\.\d+)?)\s+([a-zA-Z0-9_]+)(?:\s+(mod))?\]/gi);
        if (statBonuses) {
            statBonuses.forEach(bonus => {
                const match = bonus.match(/\[([+-]?\d+(?:\.\d+)?)\s+([a-zA-Z0-9_]+)(?:\s+(mod))?\]/i);
                if (match) {
                    const value = parseFloat(match[1]);
                    const statKey = match[2].toLowerCase();
                    const isMod = match[3] ? true : false;

                    // Handle HP specifically (base HP and Max HP)
                    if (statKey === "hp" || statKey === "health") {
                        updatedStats.hp = Math.max(1, (updatedStats.hp || 0) + value);
                        updatedStats.maxHp = Math.max(1, (updatedStats.maxHp || 0) + value);
                    } 
                    // Handle stat modifiers (can drop below 0)
                    else if (isMod) {
                        const modKey = `${statKey}Mod`;
                        updatedStats[modKey] = (updatedStats[modKey] || 0) + value;
                    } 
                    // Handle core stats (minimum value is 1)
                    else {
                        updatedStats[statKey] = Math.max(1, (updatedStats[statKey] || 0) + value);
                        // Vitality secretly adds 10 HP per point
                        if (statKey === "vitality") {
                            updatedStats.hp = Math.max(1, (updatedStats.hp || 0) + 10 * value);
                            updatedStats.maxHp = Math.max(1, (updatedStats.maxHp || 0) + 10 * value);
                        }
                    }
                }
            });
        }
    });

    return updatedStats;
}

// Calculates additional stats (Damage, Armor) using the core stats
function calculateAdditionalStatsBonuses(stats) {
    const updatedStats = { ...stats };
    if (!stats.equipment || !Array.isArray(stats.equipment)) return updatedStats;

    let totalPhysFlat = parseFloat(stats.physArmor) || 0;
    let totalMagFlat = parseFloat(stats.magArmor) || 0;

    // Multipliers start at 1.0 (representing 100% damage taken)
    let physDamageMult = 1.0;
    let magDamageMult = 1.0;

    // Apply native/base character armor percentage from json
    if (stats.physArmorPerc) {
        const basePhysPerc = parseFloat(stats.physArmorPerc);
        physDamageMult *= basePhysPerc > 0 ? (1 - basePhysPerc / 100) : (1 + Math.abs(basePhysPerc) / 100);
    }
    if (stats.magArmorPerc) {
        const baseMagPerc = parseFloat(stats.magArmorPerc);
        magDamageMult *= baseMagPerc > 0 ? (1 - baseMagPerc / 100) : (1 + Math.abs(baseMagPerc) / 100);
    }

    stats.equipment.forEach(item => {
        if (item.type !== 'gear') return;

        // Process Damage (Flat or Formula)
        if (item.damage !== undefined) {
            if (typeof item.damage === 'string' && item.damage.includes('[')) {
                updatedStats.damage = (updatedStats.damage || 0) + evaluateFormula(item.damage, updatedStats);
            } else {
                updatedStats.damage = (updatedStats.damage || 0) + (parseFloat(item.damage) || 0);
            }
        }

        // Process Physical Armor (Flat or Formula)
        if (item.physArmor !== undefined) {
            if (typeof item.physArmor === 'string' && item.physArmor.includes('[')) {
                totalPhysFlat += evaluateFormula(item.physArmor, updatedStats);
            } else {
                totalPhysFlat += (parseFloat(item.physArmor) || 0);
            }
        }

        // Process Physical Armor Percentage (Flat or Formula)
        if (item.physArmorPerc !== undefined) {
            let percVal = 0;
            if (typeof item.physArmorPerc === 'string' && item.physArmorPerc.includes('[')) {
                percVal = evaluateFormula(item.physArmorPerc, updatedStats);
            } else {
                percVal = parseFloat(item.physArmorPerc) || 0;
            }
            physDamageMult *= percVal > 0 ? (1 - percVal / 100) : (1 + Math.abs(percVal) / 100);
        }

        // Process Magical Armor (Flat or Formula)
        if (item.magArmor !== undefined) {
            if (typeof item.magArmor === 'string' && item.magArmor.includes('[')) {
                totalMagFlat += evaluateFormula(item.magArmor, updatedStats);
            } else {
                totalMagFlat += (parseFloat(item.magArmor) || 0);
            }
        }

        // Process Magical Armor Percentage (Flat or Formula)
        if (item.magArmorPerc !== undefined) {
            let percVal = 0;
            if (typeof item.magArmorPerc === 'string' && item.magArmorPerc.includes('[')) {
                percVal = evaluateFormula(item.magArmorPerc, updatedStats);
            } else {
                percVal = parseFloat(item.magArmorPerc) || 0;
            }
            magDamageMult *= percVal > 0 ? (1 - percVal / 100) : (1 + Math.abs(percVal) / 100);
        }
    });

    // Convert damage multipliers back into armor percentages
    const finalPhysPercent = (1 - physDamageMult) * 100;
    const finalMagPercent = (1 - magDamageMult) * 100;

    return {
        ...updatedStats,
        physArmor: Math.round(totalPhysFlat),
        physArmorMod: Math.round(finalPhysPercent) !== 0 ? `${Math.round(finalPhysPercent)}%` : '',
        magArmor: Math.round(totalMagFlat),
        magArmorMod: Math.round(finalMagPercent) !== 0 ? `${Math.round(finalMagPercent)}%` : ''
    };
}

// Master wrapper that runs the full item compilation
function applyGearBonuses(stats) {
    // Run core stats processing
    let updatedStats = calculateCoreStatBonuses(stats);
    
    // Run additional stats processing using the newly boosted core stats
    updatedStats = calculateAdditionalStatsBonuses(updatedStats);

    // Format modifier values to include the '+' sign for UI display
    Object.keys(updatedStats).forEach(key => {
        // Skip formatting the percentage armor strings as they format themselves
        if (key.endsWith("Mod") && key !== "physArmorMod" && key !== "magArmorMod") {
            updatedStats[key] = formatSigned(updatedStats[key]);
        }
    });

    return updatedStats;
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

// Binds inputs from the Right Panel directly to the activeCombatants state
function bindRightPanelInputs(combatantData) {
    const charSheet = document.getElementById('panel-char-sheet');

    // Handle Name change
    const nameInput = charSheet.querySelector('.char-name-input');
    if (nameInput) {
        nameInput.addEventListener('input', (e) => {
            // ALWAYS fetch the freshest memory object to avoid overwriting network changes (like HP)
            const freshCombatant = activeCombatants.find(c => c.id === combatantData.id);
            if(!freshCombatant) return;

            freshCombatant.uniqueName = e.target.value;
            syncUpdateCombatant(freshCombatant);
        });
    }

    // Handle Core Stats (Triggers recalculation)
    const coreInputs = charSheet.querySelectorAll('.stat-val-input:not(.base-damage-input), .stat-mod-input');
    coreInputs.forEach(input => {
        input.addEventListener('input', (e) => {
            const freshCombatant = activeCombatants.find(c => c.id === combatantData.id);
            if(!freshCombatant) return;
            
            const statKey = e.target.dataset.stat;
            freshCombatant.stats[statKey] = e.target.value;
            
            if (typeof recalculateAdditionalStats === 'function') {
                recalculateAdditionalStats(freshCombatant);
            }
            
            syncUpdateCombatant(freshCombatant);
        });
    });

    // Handle Manual Additional Stats changes (Damage/Armor)
    const additionalInputs = charSheet.querySelectorAll('.base-damage-input, .base-phys-armor, .base-phys-armor-mod, .base-mag-armor, .base-mag-armor-mod');
    additionalInputs.forEach(input => {
        input.addEventListener('input', (e) => {
            const freshCombatant = activeCombatants.find(c => c.id === combatantData.id);
            if(!freshCombatant) return;

            if (e.target.classList.contains('base-damage-input')) freshCombatant.stats.damage = e.target.value;
            if (e.target.classList.contains('base-phys-armor')) freshCombatant.stats.physArmor = e.target.value;
            if (e.target.classList.contains('base-phys-armor-mod')) freshCombatant.stats.physArmorMod = e.target.value;
            if (e.target.classList.contains('base-mag-armor')) freshCombatant.stats.magArmor = e.target.value;
            if (e.target.classList.contains('base-mag-armor-mod')) freshCombatant.stats.magArmorMod = e.target.value;

            syncUpdateCombatant(freshCombatant);
        });
    });

    // Handle manual HP input changes directly
    const hpInputs = charSheet.querySelectorAll('.current-hp-input, .max-hp-input');
    hpInputs.forEach(input => {
        input.addEventListener('input', (e) => {
            const freshCombatant = activeCombatants.find(c => c.id === combatantData.id);
            if(!freshCombatant) return;

            if (e.target.classList.contains('current-hp-input')) freshCombatant.stats.hp = parseInt(e.target.value) || 0;
            if (e.target.classList.contains('max-hp-input')) freshCombatant.stats.maxHp = parseInt(e.target.value) || 1;

            syncUpdateCombatant(freshCombatant);
        });
    });
}

// Safely recalculates only Damage and Armor based on the current UI input values
function recalculateAdditionalStats(combatant) {
    const baseName = combatant.baseName;
    
    // Fetch raw base character data to prevent infinite stacking of item bonuses
    const baseData = players[baseName] || npcs[baseName] || mobs[baseName] || bosses[baseName];
    if (!baseData || !baseData.equipment || baseData.equipment.length === 0) return;

    // Build a hybrid stat object using the current values typed into the UI
    let currentStats = { equipment: baseData.equipment };
    const statsList = ['vitality', 'intuition', 'strength', 'agility', 'accuracy', 'reflex', 'resilience', 'attunement', 'perception'];
    
    statsList.forEach(stat => {
        currentStats[stat] = combatant.stats[stat] || 0;
        currentStats[`${stat}Mod`] = combatant.stats[`${stat}Mod`] || 0;
    });

    // Inject the original base Damage and Armor values (to start with a clean slate before items)
    currentStats.damage = baseData.damage || 0;
    currentStats.physArmor = baseData.physArmor || 0;
    currentStats.magArmor = baseData.magArmor || 0;
    currentStats.physArmorMod = baseData.physArmorMod || 0;
    currentStats.magArmorMod = baseData.magArmorMod || 0;

    // Run ONLY the additional stats calculation!
    const finalStats = calculateAdditionalStatsBonuses(currentStats);

    // Save back to memory
    combatant.stats.damage = finalStats.damage;
    combatant.stats.physArmor = finalStats.physArmor;
    combatant.stats.physArmorMod = finalStats.physArmorMod;
    combatant.stats.magArmor = finalStats.magArmor;
    combatant.stats.magArmorMod = finalStats.magArmorMod;

    // Safely update the additional fields in the UI
    if (selectedCharacterId === combatant.id) {
        document.querySelector('.base-damage-input').value = finalStats.damage;
        document.querySelector('.base-phys-armor').value = finalStats.physArmor;
        document.querySelector('.base-phys-armor-mod').value = finalStats.physArmorMod;
        document.querySelector('.base-mag-armor').value = finalStats.magArmor;
        document.querySelector('.base-mag-armor-mod').value = finalStats.magArmorMod;
    }
}

function rollDice(combatantId, diceType, difficulty = null) {
    const combatant = activeCombatants.find(c => c.id === combatantId);
    if (!combatant) return 0;

    const baseStat = parseInt(combatant.stats[diceType]) || 0;
    const modValue = parseInt(combatant.stats[`${diceType}Mod`]) || 0;
    
    // Safely check if stat exists at all
    if (combatant.stats[diceType] === undefined && combatant.stats[`${diceType}Mod`] === undefined) {
        alert(t('no_stats_error'));
        return 0;
    }

    const roll = Math.floor(Math.random() * baseStat) + 1;
    let result = Math.max(1, roll + modValue);

    // Intuition bonus for Agility and Accuracy
    if (diceType === 'agility' || diceType === 'accuracy') {
        const intuitionValue = parseInt(combatant.stats.intuition) || 0;
        if (intuitionValue >= 10) {
            const intuitionBonus = Math.floor((intuitionValue - 10) / 4);
            result += intuitionBonus;
        }
    }

    // Determine color
    let resultColor = 'white';
    if (difficulty && difficulty !== "X") {
        difficulty = parseInt(difficulty);
        resultColor = result >= difficulty ? '#50fa7b' : '#ff5555';
    }

    // Update combatant memory state for Last Roll
    combatant.lastRoll = {
        stat: diceType,
        result: result,
        color: resultColor
    };

    playSoundEffect('sound/diceroll.mp3');

    // Instantly sync the roll to all clients (which will refresh the UI)
    syncUpdateCombatant(combatant);
    return result; 
}

// Removes the currently selected character from the arena, memory, and cleans up conditions
async function removeCharacter() {
    if (!selectedCharacterId) return;

    const combatant = activeCombatants.find(c => c.id === selectedCharacterId);
    if (!combatant) return;

    // 1. Remove conditions tied to this character (Server sync)
    // Directly use the globally synced activeConditions array to prevent Promise/undefined errors!
    if (typeof activeConditions !== 'undefined' && Array.isArray(activeConditions)) {
        const filteredConditions = activeConditions.filter(condition => condition.target !== combatant.uniqueName);
        
        // Only trigger network update if something was actually deleted
        if (filteredConditions.length !== activeConditions.length && typeof updateServerConditions === 'function') {
            updateServerConditions(filteredConditions);
        }
    }

    // 2. Request removal from server. Server will broadcast removal and clients will automatically delete token and clear panel.
    if (typeof syncRemoveCombatant === 'function') {
        syncRemoveCombatant(selectedCharacterId);
    }
}

// Reloads the corresponding data file and recalculates the currently selected character's stats
async function reloadCharacterData() {
    if (!selectedCharacterId) return;
    
    const combatant = activeCombatants.find(c => c.id === selectedCharacterId);
    // We can only reload named characters that originate from a file
    if (!combatant || combatant.baseName === '') return;

    try {
        let freshData = null;
        
        // Dynamically reload the correct script and fetch fresh data based on character type
        if (combatant.type === 'player') {
            await reloadScript('players-data', 'data/players.js');
            freshData = players[combatant.baseName];
        } else if (combatant.type === 'mob') {
            await reloadScript('mobs-data', 'data/mobs.js');
            freshData = mobs[combatant.baseName];
        } else if (combatant.type === 'npc') {
            await reloadScript('npcs-data', 'data/npcs.js');
            freshData = npcs[combatant.baseName];
        } else if (combatant.type === 'boss') {
            await reloadScript('bosses-data', 'data/bosses.js');
            freshData = bosses[combatant.baseName];
        }

        if (!freshData) return;

        // Apply equipment math to get the final stats
        const finalStats = applyGearBonuses(freshData);

        // Keep default HP fallback
        if (finalStats.hp === undefined) finalStats.hp = 10;
        if (finalStats.maxHp === undefined) finalStats.maxHp = 10;

        // Preserve current health to prevent unwanted full heals, but clamp to new max HP
        const currentHp = combatant.stats.hp;
        const wasDead = combatant.isDead;
        const acted = combatant.hasActedThisRound;
        
        // Update memory core stats
        combatant.stats = finalStats;
        combatant.stats.hp = Math.min(currentHp, finalStats.maxHp);
        combatant.isDead = wasDead;
        combatant.hasActedThisRound = acted;
        
        // Deep copy fresh equipment and abilities
        combatant.equipment = freshData.equipment ? JSON.parse(JSON.stringify(freshData.equipment)) : [];
        combatant.abilities = freshData.abilities ? JSON.parse(JSON.stringify(freshData.abilities)) : [];

        // Check if any new abilities were added and assign them default memory states
        combatant.abilities.forEach(ability => {
            if (!combatant.abilitiesStates[ability.name]) {
                const isSingleUse = ability.cooldown === "[cooldown_once]";
                const maxCooldown = isSingleUse ? Infinity : (!ability.cooldown && ability.cooldown !== 0 ? 0 : parseInt(ability.cooldown) + 1);
                combatant.abilitiesStates[ability.name] = {
                    currentCooldown: 0,
                    maxCooldown: maxCooldown,
                    singleUse: isSingleUse
                };
            }
        });
        
        syncUpdateCombatant(combatant);
        
    } catch (error) {
        console.error("Error while reloading character data:", error);
    }
}

// Generic helper to reload a script dynamically
async function reloadScript(scriptId, srcPath) {
    const oldScript = document.querySelector(`#${scriptId}`);
    if (oldScript) oldScript.remove();
    
    return new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.id = scriptId;
        // Adding a timestamp prevents the browser from loading a cached version of the file
        script.src = `${srcPath}?t=${new Date().getTime()}`;
        script.onload = resolve;
        script.onerror = () => reject(new Error(`Error loading ${srcPath}`));
        document.body.appendChild(script);
    });
}