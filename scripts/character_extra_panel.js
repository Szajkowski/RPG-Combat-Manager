// Main entry point for rendering the Extra Panel (Skills & Equipment tabs)
function renderExtraPanel(combatantId) {
    const combatant = activeCombatants.find(c => c.id === combatantId);
    if (!combatant) return;

    const extraPanel = document.getElementById('panel-extra');
    if (!extraPanel) return;

    // Fetch globally saved extra panel tab state from localStorage
    let activeTabTarget = localStorage.getItem('CombatManager-ExtraTab') || 'panel-skills';

    // Calculate maximum number of abilities based on current dynamically stored attunement
    let attunement = 1000; // if there is no attunement stat, you can have as many abilities as you want.
    if (combatant.stats.attunement !== undefined) {
        attunement = parseInt(combatant.stats.attunement) || 0;
    }

    let maxAbilities = 3;  // Base 3 abilities
    if (attunement > 10) {
        maxAbilities += Math.floor((attunement - 10) / 2);
    }
    
    // Slice by maxAbilities first to strictly consume attunement slots, THEN filter out [prop_non_combat] for the combat view
    const slicedAbilities = combatant.abilities ? combatant.abilities.slice(0, maxAbilities) : [];
    const displayAbilities = slicedAbilities.filter(a => !(a.description && a.description.toLowerCase().includes('[prop_non_combat]')));
    const equipment = combatant.equipment || [];

    const hasAbilities = displayAbilities.length > 0;
    const hasEquipment = equipment.length > 0;

    // If character has neither skills nor equipment, render an empty state placeholder
    if (!hasAbilities && !hasEquipment) {
        extraPanel.innerHTML = `<div class="right-panel-placeholder" style="font-size: 1rem; padding: 20px;" data-i18n="placeholder_no_extra_content">${t('placeholder_no_extra_content')}</div>`;
        return;
    }

    // Fallback logic if the stored tab doesn't exist on the selected character
    if (activeTabTarget === 'panel-skills' && !hasAbilities) activeTabTarget = 'panel-equip';
    if (activeTabTarget === 'panel-equip' && !hasEquipment) activeTabTarget = 'panel-skills';

    // Check existing layout elements to determine if UI shell needs structural updates
    const existingTabsHeader = extraPanel.querySelector('.char-extra-tabs');
    const existingSkillsContainer = document.getElementById('panel-skills');
    const existingEquipContainer = document.getElementById('panel-equip');

    const currentHasSkillsTab = existingTabsHeader ? !!existingTabsHeader.querySelector('[data-target="panel-skills"]') : false;
    const currentHasEquipTab = existingTabsHeader ? !!existingTabsHeader.querySelector('[data-target="panel-equip"]') : false;

    // Structure needs rebuild if containers are missing or tab availability changed
    const needsStructureRebuild = !existingTabsHeader || !existingSkillsContainer || !existingEquipContainer ||
                                  (currentHasSkillsTab !== hasAbilities) ||
                                  (currentHasEquipTab !== hasEquipment);

    if (needsStructureRebuild) {
        let html = '';
        // Always render the tabs container if there's at least one, to serve as a visual header
        html += `<div class="char-extra-tabs">`;
        if (hasAbilities) {
            const isSkillsActive = activeTabTarget === 'panel-skills' ? 'active' : '';
            html += `<div class="char-extra-tab ${isSkillsActive}" data-target="panel-skills">${t('tab_skills')}</div>`;
        }
        if (hasEquipment) {
            const isEquipActive = activeTabTarget === 'panel-equip' ? 'active' : '';
            html += `<div class="char-extra-tab ${isEquipActive}" data-target="panel-equip">${t('tab_equip')}</div>`;
        }
        html += `</div>`;

        // Prepare content containers based on preserved tab state
        html += `<div class="char-extra-content ${activeTabTarget === 'panel-skills' ? 'active' : ''}" id="panel-skills"></div>`;
        html += `<div class="char-extra-content ${activeTabTarget === 'panel-equip' ? 'active' : ''}" id="panel-equip"></div>`;

        extraPanel.innerHTML = html;

        // Attach tab switching logic and persist state globally to localStorage
        extraPanel.querySelectorAll('.char-extra-tab').forEach(tab => {
            tab.addEventListener('click', () => {
                const target = tab.dataset.target;
                localStorage.setItem('CombatManager-ExtraTab', target);

                extraPanel.querySelectorAll('.char-extra-tab').forEach(t => t.classList.remove('active'));
                extraPanel.querySelectorAll('.char-extra-content').forEach(c => c.classList.remove('active'));
                
                tab.classList.add('active');
                const targetContent = document.getElementById(target);
                if (targetContent) targetContent.classList.add('active');
            });
        });
    } else {
        // Maintain active styles on existing containers if tabs layout matches
        extraPanel.querySelectorAll('.char-extra-tab').forEach(tab => {
            if (tab.dataset.target === activeTabTarget) tab.classList.add('active');
            else tab.classList.remove('active');
        });
        [existingSkillsContainer, existingEquipContainer].forEach(c => {
            if (c) {
                if (c.id === activeTabTarget) c.classList.add('active');
                else c.classList.remove('active');
            }
        });
    }

    const skillsContainer = document.getElementById('panel-skills');
    const equipContainer = document.getElementById('panel-equip');

    // Populate data into containers using the combatant object directly or clear unused container
    if (skillsContainer) {
        skillsContainer.innerHTML = '';
        if (hasAbilities) {
            fillAbilitiesPanel(displayAbilities, combatant, skillsContainer);
        }
    }

    if (equipContainer) {
        equipContainer.innerHTML = '';
        if (hasEquipment) {
            fillEquipmentPanel(equipment, combatant, equipContainer);
        }
    }
}

function fillAbilitiesPanel(abilities, combatant, container) {
    abilities.forEach(ability => {
        const abilityName = ability.name;

        // Initialize state in abilitiesStates if missing (failsafe)
        if (!combatant.abilitiesStates[abilityName]) {
            const isSingleUse = ability.cooldown === "[cooldown_once]";
            const maxCooldown = isSingleUse ? Infinity : (!ability.cooldown && ability.cooldown !== 0 ? 0 : parseInt(ability.cooldown) + 1);
            
            combatant.abilitiesStates[abilityName] = {
                currentCooldown: 0, // Available by default
                maxCooldown: maxCooldown,
                singleUse: isSingleUse // Can it only be used once per combat
            };
        }

        const abilityState = combatant.abilitiesStates[abilityName];
        const abilityCard = document.createElement('div');
        abilityCard.className = 'char-extra-card';

        // Build ability content
        // Parse description directly using memory stats instead of reading DOM
        const parsedDesc = parseDescription(ability.description || "", combatant, ability.difficulty);

        let cardInner = `
            <div class="char-extra-card-title">
                ${abilityName}
                <div class="btn-container"></div>
            </div>
            <div class="char-extra-card-desc">${parsedDesc}</div>
            <div class="char-extra-card-meta">
        `;

        // Optional attributes
        if (ability.roll) cardInner += `<span>${t('ability_roll')} <strong class="stat-bonus">${t(ability.roll)}</strong></span>`;

        if (ability.roll && ability.difficulty) cardInner += `<span>${t('ability_difficulty')} <strong class="stat-bonus">${ability.difficulty}</strong></span>`;

        if (ability.cooldown !== undefined && ability.cooldown !== "[cooldown_once]") cardInner += `<span>${t('ability_cooldown')} <strong class="stat-bonus">${t(ability.cooldown)}</strong></span>`;
        else if (ability.cooldown !== undefined) cardInner += `<span>${t('ability_cooldown')} <strong class="stat-bonus">${t('cooldown_once')}</strong></span>`;

        if (ability.roll && ability.difficulty && ability.difficulty !== "X") cardInner += `<span>${t('ability_success_chance')} <strong style="color: #bd93f9;">${calculateAbilitySuccessRate(combatant, ability.roll, ability.difficulty)}%</strong></span>`;

        cardInner += `</div>`;
        abilityCard.innerHTML = cardInner;

        // Create cooldown button        
        if (ability.cooldown !== undefined && ability.cooldown !== null) {
            const cooldownButton = document.createElement('button');
            cooldownButton.className = 'action-cd-btn';
            cooldownButton.dataset.abilityName = abilityName;

            // Determine specific logical exceptions
            const isReaction = ability.description && ability.description.toLowerCase().includes('[prop_reaction]');
            const hasTurn = typeof hasCurrentTurn === 'function' ? hasCurrentTurn(combatant.id) : true;

            // Block ability if character is dead
            if (combatant.isDead) {
                cooldownButton.style.background = '#ff5555';
                cooldownButton.style.color = 'white';
                cooldownButton.textContent = t('dead');
                cooldownButton.disabled = true;
            } 
            // Normal cooldowns block
            else if (abilityState.currentCooldown !== 0) {
                cooldownButton.style.background = '#ff5555';
                cooldownButton.style.color = 'white';
                let displayCooldown = abilityState.currentCooldown;
                if (abilityState.currentCooldown === 'unavailable') displayCooldown = t('unavailable');
                cooldownButton.textContent = displayCooldown;
                cooldownButton.disabled = true;
            } 
            // Stun mechanic block (overrides available state)
            else if (combatant.isStunned) {
                cooldownButton.style.background = '#f1fa8c'; // Yellow
                cooldownButton.style.color = '#181922'; // Dark readable text
                cooldownButton.textContent = t('stunned');
                cooldownButton.disabled = true;
            }
            // Turn constraint mechanic block (Exceptions for Reaction tags)
            else if (!hasTurn && !isReaction) {
                cooldownButton.style.background = '#44475a'; // Deep gray
                cooldownButton.style.color = '#f8f8f2';
                cooldownButton.textContent = t('wait');
                cooldownButton.disabled = true;
            }
            // Available
            else {
                cooldownButton.textContent = t('available');
                cooldownButton.disabled = false;
            }
            
            // PASS EVENT to hook pipeline origin coordinates correctly
            cooldownButton.onclick = (e) => useAbility(combatant.id, ability, e);
            abilityCard.querySelector('.btn-container').appendChild(cooldownButton);
        }

        container.appendChild(abilityCard);
    });
}

function fillEquipmentPanel(equipment, combatant, container) {
    // Group items into gear and others
    const gear = equipment.filter(item => item.type === 'gear');
    const other = equipment.filter(item => item.type !== 'gear');

    // Add gear section if it exists
    if (gear.length > 0) {
        gear.forEach(item => {
            const itemCard = document.createElement('div');
            itemCard.className = 'char-extra-card';
            
            let html = `<div class="char-extra-card-title">${item.name}</div>`;
            if (item.description) {
                html += `<div class="char-extra-card-desc">${parseDescription(item.description, combatant)}</div>`;
            }

            html += `<div class="char-extra-card-meta">`;
            
            if (item.damage !== undefined) {
                const val = getFormulaValue(item.damage, combatant);
                const breakdown = getFormulaBreakdown(item.damage);
                html += `<div>${t('damage')}: <strong style="color: #f8f8f2;" class="copyable-value" onclick="copyValue(${val}, event)">${val}</strong>${breakdown ? ` <span class="formula-display">(${breakdown})</span>` : ''}</div>`;
            }
            if (item.physArmor !== undefined) {
                const val = getFormulaValue(item.physArmor, combatant);
                const breakdown = getFormulaBreakdown(item.physArmor);
                html += `<div>${t('phys_armor')}: <strong style="color: #f8f8f2;" class="copyable-value" onclick="copyValue(${val}, event)">${val}</strong>${breakdown ? ` <span class="formula-display">(${breakdown})</span>` : ''}</div>`;
            }
            if (item.physArmorPerc !== undefined) {
                const val = getFormulaValue(item.physArmorPerc, combatant);
                const breakdown = getFormulaBreakdown(item.physArmorPerc);
                html += `<div>${t('phys_armor')} %: <strong style="color: #f8f8f2;" class="copyable-value" onclick="copyValue(${val}, event)">${val}</strong>%${breakdown ? ` <span class="formula-display">(${breakdown})</span>` : ''}</div>`;
            }
            if (item.magArmor !== undefined) {
                const val = getFormulaValue(item.magArmor, combatant);
                const breakdown = getFormulaBreakdown(item.magArmor);
                html += `<div>${t('mag_armor')}: <strong style="color: #f8f8f2;" class="copyable-value" onclick="copyValue(${val}, event)">${val}</strong>${breakdown ? ` <span class="formula-display">(${breakdown})</span>` : ''}</div>`;
            }
            if (item.magArmorPerc !== undefined) {
                const val = getFormulaValue(item.magArmorPerc, combatant);
                const breakdown = getFormulaBreakdown(item.magArmorPerc);
                html += `<div>${t('mag_armor')} %: <strong style="color: #f8f8f2;" class="copyable-value" onclick="copyValue(${val}, event)">${val}</strong>%${breakdown ? ` <span class="formula-display">(${breakdown})</span>` : ''}</div>`;
            }
            if (item.value !== undefined) {
                html += `<div>${t('value')}: ${item.value}S</div>`;
            }
            
            html += `</div>`;
            itemCard.innerHTML = html;
            container.appendChild(itemCard);
        });
    }

    // Add other items section if they exist
    if (other.length > 0) {
        other.forEach(item => {
            const itemCard = document.createElement('div');
            itemCard.className = 'char-extra-card';
            
            let html = `<div class="char-extra-card-title">${item.name}</div>`;
            if (item.description) {
                html += `<div class="char-extra-card-desc">${parseDescription(item.description, combatant)}</div>`;
            }
            
            html += `
                <div class="char-extra-card-meta">
                    <div style="display: flex; align-items: center; gap: 8px;">
                        ${t('quantity')} <input type="number" class="quantity-input" value="${item.quantity || 0}" min="0" style="width: 50px; background: #212330; border: 1px solid #44475a; color: white; text-align: center; border-radius: 4px; padding: 2px;">
                    </div>
                    ${item.value !== undefined ? `<div>${t('value')}: ${item.value}</div>` : ''}
                </div>
            `;
            itemCard.innerHTML = html;
            container.appendChild(itemCard);
        });
    }
}

function calculateAbilitySuccessRate(combatant, abilityRoll, abilityDifficulty) {
    const statValue = parseInt(combatant.stats[abilityRoll]) || 0;
    const modValue = parseInt(combatant.stats[`${abilityRoll}Mod`]) || 0;

    if (statValue <= 0) {
        return 0; // No stat
    }

    const successThreshold = abilityDifficulty - modValue;

    if (successThreshold <= 1) {
        return 100; // Automatic success
    }

    if (successThreshold > statValue) {
        return 0; // Automatic failure
    }

    const successRolls = statValue - successThreshold + 1;
    return Math.floor((successRolls / statValue) * 100);
}

function useAbility(combatantId, ability, event) {
    // Fetch fresh combatant from memory based on ID
    const combatant = activeCombatants.find(c => c.id === combatantId);
    if (!combatant) return;

    const abilityState = combatant.abilitiesStates[ability.name];
    if (!abilityState || abilityState.currentCooldown !== 0) return;

    let success = true; 
    let initialRollData = null;

    if (ability.roll) { 
        initialRollData = rollDice(combatant.id, ability.roll, ability.difficulty);
        
        if (initialRollData) {
            success = ability.difficulty === "X" ? true : initialRollData.result >= ability.difficulty;
        } else {
            success = false;
        }
    }

    if (success) {
        if (abilityState.singleUse) {
            abilityState.currentCooldown = 'unavailable';
        } else { 
            abilityState.currentCooldown = abilityState.maxCooldown;
        }

        // Check if the ability utilizes the new Action Pipeline system
        if (ability.actions && ability.actions.length > 0) {
            let shouldBroadcastInitRollImmediately = false;
            
            // Determine if the initial roll should be broadcasted immediately as a standalone row
            if (initialRollData) {
                const firstAction = ability.actions[0];
                const requiresTargeting = ['single', 'multi'].includes(firstAction.target);
                const isNonOffensive = ['heal', 'armor', 'condition'].includes(firstAction.type);

                if (requiresTargeting || isNonOffensive) {
                    shouldBroadcastInitRollImmediately = true;
                }
            }

            if (shouldBroadcastInitRollImmediately) {
                syncAddRollEvent({
                    id: 'roll-' + Date.now() + '-' + Math.random().toString(36).substr(2, 5),
                    isTargeted: false,
                    combatantId: combatant.id,
                    combatantName: combatant.uniqueName,
                    combatantTeam: combatant.team,
                    rolls: [ initialRollData ]
                });
                initialRollData = null; // Consume the roll so the pipeline doesn't attach it to other actions
            }

            // IMMEDIATELY sync the combatant to secure the cooldown block across all clients globally 
            syncUpdateCombatant(combatant);

            if (typeof startActionPipeline === 'function') {
                // Pass the initial roll (or null if already consumed) to the pipeline
                startActionPipeline(combatant, ability.actions, ability, initialRollData, event);
            }
        } else {
            // Legacy fallback for simple abilities without pipeline
            if (initialRollData) {
                syncAddRollEvent({
                    id: 'roll-' + Date.now() + '-' + Math.random().toString(36).substr(2, 5),
                    isTargeted: false,
                    combatantId: combatant.id,
                    combatantName: combatant.uniqueName,
                    combatantTeam: combatant.team,
                    rolls: [ initialRollData ]
                });
            }
            processAndSendConditions(combatant.uniqueName, null, ability, ability.name, ability.source || "self");
            // Non-pipeline abilities must sync their cooldown state immediately
            syncUpdateCombatant(combatant); 
        }
    } else {
        if (abilityState.singleUse && abilityState.currentCooldown !== 'unavailable') {
            abilityState.currentCooldown = 2;
        } else if (!abilityState.singleUse) {
            abilityState.currentCooldown = abilityState.maxCooldown;
        }
        
        // Always broadcast failures immediately as normal, non-targeted standalone logs (No arrow)
        if (initialRollData) {
            syncAddRollEvent({
                id: 'roll-' + Date.now() + '-' + Math.random().toString(36).substr(2, 5),
                isTargeted: false,
                combatantId: combatant.id,
                combatantName: combatant.uniqueName,
                combatantTeam: combatant.team,
                rolls: [ initialRollData ]
            });
        }
        
        // Failed skills must sync their failure cooldown penalty immediately
        syncUpdateCombatant(combatant);
    }
}

// TEXT REPLACEMENTS (Used only in text blocks like descriptions)

/**
 * Replaces property tags with translated HTML spans.
 * Example Input: "This attack is [prop_unavoidable]."
 * Example Output: "This attack is <span class="highlighted-property">Nieunikalne.</span>"
 */
 function parsePropertyTags(description) {
    return description.replace(/\[(prop_[a-zA-Z0-9_]+)\]/gi, (match, tag) => {
        return `<span class="highlighted-property">${t(tag.toLowerCase())}</span>`;
    });
}

/**
 * Replaces stat modifier tags with translated and formatted HTML strings.
 * Example Input: "Grants [+2 strength] and [-1 agility mod]."
 * Example Output (PL): "Grants <strong class="stat-bonus">+2 siły</strong> and <strong class="stat-bonus">-1 do wyniku zwinności</strong>."
 */
 function parseStatTags(description) {
    return description.replace(/\[([+-]?\d+(?:\.\d+)?)\s+([a-zA-Z0-9_]+)(?:\s+(mod))?\]/gi, (match, value, stat, isMod) => {
        const statKey = stat.toLowerCase();
        let statTranslated;

        if (isMod) {
            // Dynamically build the modifier string using the {stat} placeholder
            statTranslated = t('to_result').replace('{stat}', t('desc_' + statKey));
        } else {
            statTranslated = t('desc_' + statKey);
        }
        
        const numVal = parseFloat(value);
        const prefix = numVal > 0 ? '+' : '';
        return `<strong class="stat-bonus">${prefix}${numVal} ${statTranslated}</strong>`;
    });
}

// MATH & TRANSLATION CORE (Used by both Gear and Abilities)

/**
 * Extracts the final numerical result of a gear stat, whether it's flat or a formula.
 * Example Input 1: 15 (Number) -> Returns: 15
 * Example Input 2: "[-10 + 0.5 * vitality]" (String) -> Returns: 5 (Number), assuming vitality is 30
 */
 function getFormulaValue(statValue, combatant) {
    if (typeof statValue === "number") return statValue;
    
    if (typeof statValue === "string" && statValue.includes('[')) {
        const formula = statValue.replace(/[\[\]]/g, '');
        const evaluatedFormula = formula.replace(/\b([a-zA-Z_]\w*)\b/g, (stat) => getStatValue(combatant, stat));
        
        if (!/^[0-9+\-*/().\s]+$/.test(evaluatedFormula)) {
            console.error("Formula contains invalid characters:", evaluatedFormula);
            return 0;
        }
        
        return Math.round(new Function('return ' + evaluatedFormula)());
    }
    
    const parsed = parseFloat(statValue);
    return isNaN(parsed) ? 0 : parsed;
}

/**
 * Generates the readable formula breakdown for the UI. Returns empty string if not applicable.
 * Example Input 1: "[10 + 0.5 * vitality]" -> Returns: "10 + 0.5 * żywotność"
 * Example Input 2: 15 -> Returns: "" (No formula to display)
 * Example Input 3: "[15]" -> Returns: "" (No formula to display)
 */
function getFormulaBreakdown(statValue) {
    if (typeof statValue !== "string" || !statValue.includes('[')) return "";
    
    const formula = statValue.replace(/[\[\]]/g, '');
    const displayFormula = formula.replace(/\b([a-zA-Z_]\w*)\b/g, (stat) => {
        return t(stat.toLowerCase()).toLowerCase();
    });
    
    // Ignore formulas that are just plain numbers wrapped in brackets (e.g., "[-15]")
    if (/^[+-]?\d+(\.\d+)?$/.test(formula.replace(/\s+/g, ''))) return "";
    
    return displayFormula;
}

// ABILITY SPECIFIC PARSERS (Used only for Ability Descriptions)

// Handles dynamic range calculations parsing complex math patterns and explicit stat names.
// Example Input 1 (X * roll stat): "2 * roll vitality"
// Example Input 2 (Base - X * roll stat): "100 - 4 * roll agility"
// Example Input 3 (X ^ over stat): "1.5 ^ over resilience"
function evaluateDynamicAbilityRoll(formula, combatant, rollDifficulty) {
    // Regex parsing structure: (Optional Base +/- ) Mult (* or ^) (roll or over) StatName
    const match = formula.match(/^\s*(?:(\d+(?:\.\d+)?)\s*([+-])\s*)?(\d+(?:\.\d+)?)\s*([*^])\s*(roll|over)\s+([a-zA-Z_]+)\s*$/i);
    if (!match) return null;

    const hasBase = match[1] !== undefined;
    const baseConst = hasBase ? parseFloat(match[1]) : 0;
    const baseOp = match[2] || '+';
    const factor = parseFloat(match[3]);
    const mathOp = match[4];
    const type = match[5].toLowerCase();
    const stat = match[6].toLowerCase();

    const statValue = getStatValue(combatant, stat);
    const modValue = getModValue(combatant, stat);

    let minParam, maxParam;

    // Calculate absolute roll spectrum boundaries based on dice properties clamped to 1
    const minRollResult = Math.max(1, 1 + modValue);
    const maxRollResult = Math.max(1, statValue + modValue);

    if (type === 'roll') {
        minParam = minRollResult;
        maxParam = maxRollResult;
    } else if (type === 'over') {
        const diff = (rollDifficulty && rollDifficulty !== "X") ? parseInt(rollDifficulty) : 0;
        minParam = minRollResult > diff ? (minRollResult - diff) : 1;
        maxParam = maxRollResult > diff ? (maxRollResult - diff) : 1;
    }

    // Mathematical formula runner execution closure
    const compute = (param) => {
        let v = 0;
        if (mathOp === '*') v = factor * param;
        else if (mathOp === '^') v = Math.pow(factor, param);
        
        if (hasBase) {
            if (baseOp === '+') return baseConst + v;
            if (baseOp === '-') return baseConst - v;
        }
        return v;
    };

    const val1 = Math.round(compute(minParam));
    const val2 = Math.round(compute(maxParam));

    // Sort bounds to return correct min-max layout sequence even with negative multipliers
    return { 
        min: Math.min(val1, val2), 
        max: Math.max(val1, val2), 
        formulaData: { hasBase, baseConst, baseOp, factor, mathOp, type, stat } 
    };
}

/**
 * Specifically parses formulas embedded inside text blocks (e.g. descriptions).
 * Wraps calculated results in clickable HTML tags.
 * Example Input 1: "Deals [2 * roll strength] damage and [10 + 1 * vitality] frost damage."
 * Example Output 1: "Deals <strong ...>2-24</strong> <span ...>(2 * wynik siły)</span> damage and <strong ...>20</strong> <span ...>(10 + 1 * żywotności)</span> frost damage."
 * Example Input 2: "Deals [100 - 4 * roll agility] damage."
 * Example Output 2: "Deals <strong ...>56</strong> - <strong ...>92</strong> <span ...>(100 - 4 * wynik na zwinność)</span> damage."
 */
function parseFormulaTags(description, combatant, rollDifficulty) {
    return description.replace(/\[(.*?)\]/g, (match, formula) => {
        try {
            if (/roll|over/i.test(formula)) {
                const resultData = evaluateDynamicAbilityRoll(formula, combatant, rollDifficulty);
                
                if (resultData) {
                    const { min, max, formulaData } = resultData;
                    
                    let formulaText = '';
                    // Fetch appropriate grammatical cases for placeholders
                    const translatedRollStat = t('roll_' + formulaData.stat); 
                    const translatedDescStat = t('desc_' + formulaData.stat);
                    
                    const prefix = formulaData.hasBase ? `${formulaData.baseConst} ${formulaData.baseOp} ` : '';
                    
                    // Format output syntax template linearly using localized translations and placeholders
                    if (formulaData.type === 'roll') {
                        formulaText = `${prefix}${formulaData.factor} ${formulaData.mathOp} ` + t('result_for').replace('{stat}', translatedRollStat);
                    } else {
                        formulaText = `${prefix}${formulaData.factor} ${formulaData.mathOp} ` + t('margin_of').replace('{stat}', translatedDescStat);
                    }

                    return `<strong class="copyable-value" onclick="copyValue(${min}, event)">${min}</strong> - <strong class="copyable-value" onclick="copyValue(${max}, event)">${max}</strong> <span class="formula-display">(${formulaText})</span>`;
                } else {
                    return `<strong class="calculated-value">0</strong> - <strong class="calculated-value">0</strong>`;
                }
            }

            // Standard fallback parsing engine block for flat mathematical expressions
            const result = getFormulaValue(match, combatant);
            const breakdown = getFormulaBreakdown(match);
            
            let displayHtml = '';
            if (breakdown) {
                displayHtml = ` <span class="formula-display">(${breakdown})</span>`;
            }

            return `<strong class="copyable-value" onclick="copyValue(${result}, event)">${result}</strong>${displayHtml}`;
        } catch (e) {
            console.error(`Cannot calculate formula: ${match}`, e);
            return match; 
        }
    });
}

// MASTER TEXT WRAPPER

/**
 * Master wrapper used strictly for formatting text blocks (e.g., item or ability descriptions).
 * Sequentially applies property highlights, stat highlights, and formula calculations.
 */
function parseDescription(description, combatant, rollDifficulty = null) {
    if (typeof description === "number") return description;

    let processedDescription = parsePropertyTags(String(description));
    processedDescription = parseStatTags(processedDescription);
    processedDescription = parseFormulaTags(processedDescription, combatant, rollDifficulty);

    return processedDescription;
}

// Retrieves only the value of the statistic itself, without counting the additional bonus. Roll bonuses shouldn't affect ability damage in the [number * stat] convention
function getStatValue(combatant, stat) {
    if (!combatant || !combatant.stats) return 0;
    return parseInt(combatant.stats[stat]) || 0; 
}

// Retrieves the value of the stat bonus. Useful when calculating things dependent on the height of the roll or margin points
function getModValue(combatant, stat) {
    if (!combatant || !combatant.stats) return 0;
    return parseInt(combatant.stats[`${stat}Mod`]) || 0; 
}