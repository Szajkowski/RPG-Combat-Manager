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
    
    // Slice by maxAbilities first to strictly consume attunement slots, THEN filter out [prop_non_combat] via properties array for the combat view
    const slicedAbilities = combatant.abilities ? combatant.abilities.slice(0, maxAbilities) : [];
    const displayAbilities = slicedAbilities.filter(a => !(a.properties && a.properties.includes('prop_non_combat')));
    const equipment = combatant.equipment || [];

    const hasAbilities = displayAbilities.length > 0;
    const hasEquipment = equipment.length > 0;

    // If character has neither skills nor equipment, render an empty state placeholder
    if (!hasAbilities && !hasEquipment) {
        extraPanel.innerHTML = `<div class="right-panel-placeholder empty-list-placeholder" data-i18n="placeholder_no_extra_content">${t('placeholder_no_extra_content')}</div>`;
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

    const teamClass = combatant.team === 'enemy' ? 'enemy-tab' : '';

    if (needsStructureRebuild) {
        let html = '';
        // Always render the tabs container if there's at least one, to serve as a visual header
        html += `<div class="char-extra-tabs">`;
        if (hasAbilities) {
            const isSkillsActive = activeTabTarget === 'panel-skills' ? 'active' : '';
            html += `<div class="char-extra-tab ${isSkillsActive} ${teamClass}" data-target="panel-skills">${t('tab_skills')}</div>`;
        }
        if (hasEquipment) {
            const isEquipActive = activeTabTarget === 'panel-equip' ? 'active' : '';
            html += `<div class="char-extra-tab ${isEquipActive} ${teamClass}" data-target="panel-equip">${t('tab_equip')}</div>`;
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

            // Update team class dynamically in case character team changed but layout remained the same
            tab.classList.remove('enemy-tab');
            if (combatant.team === 'enemy') {
                tab.classList.add('enemy-tab');
            }
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

// Helper to safely parse string stat structures combined with a plus sign
function parseRollStats(rollString) {
    if (!rollString || typeof rollString !== 'string') return [];
    return rollString.split('+').map(s => s.trim());
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

        // Aggregate unique properties directly from ability properties array to append as prefixes
        let allProps = new Set(ability.properties || []);
        
        let descString = ability.description || "";
        if (allProps.size > 0) {
            // Join using space because translation map values natively contain trailing periods
            const propsPrefix = Array.from(allProps).map(p => `[${p}]`).join(' ');
            descString = propsPrefix + (descString ? ' ' + descString : '');
        }

        // Build ability content
        // Parse description using the newly generated composite string passing the full ability object for dynamic mathematical resolution
        const parsedDesc = parseDescription(descString, combatant, ability);
        
        const titleClass = combatant.team === 'enemy' ? 'card-title-enemy' : 'card-title-hero';

        let cardInner = `
            <div class="char-extra-card-title ${titleClass}">
                ${abilityName}
                <div class="btn-container"></div>
            </div>
            <div class="char-extra-card-desc">${parsedDesc}</div>
            <div class="char-extra-card-meta">
        `;

        // Optional attributes
        if (ability.roll) {
            // Properly format multiple stats if chained with a plus sign
            const displayRollStr = parseRollStats(ability.roll).map(s => `<strong class="stat-bonus">${t(s.trim())}</strong>`).join(' + ');
            cardInner += `<span>${t('ability_roll')} ${displayRollStr}</span>`;
        }

        if (ability.roll && ability.difficulty) cardInner += `<span>${t('ability_difficulty')} <strong class="stat-bonus">${ability.difficulty}</strong></span>`;

        if (ability.cooldown !== undefined && ability.cooldown !== "[cooldown_once]") cardInner += `<span>${t('ability_cooldown')} <strong class="stat-bonus">${t(ability.cooldown)}</strong></span>`;
        else if (ability.cooldown !== undefined) cardInner += `<span>${t('ability_cooldown')} <strong class="stat-bonus">${t('cooldown_once')}</strong></span>`;

        if (ability.roll && ability.difficulty && ability.difficulty !== "X") cardInner += `<span>${t('ability_success_chance')} <strong class="ability-success-rate">${calculateAbilitySuccessRate(combatant, ability.roll, ability.difficulty)}%</strong></span>`;

        cardInner += `</div>`;
        abilityCard.innerHTML = cardInner;

        // Create cooldown button        
        if (ability.cooldown !== undefined && ability.cooldown !== null) {
            const cooldownButton = document.createElement('button');
            cooldownButton.className = 'action-cd-btn';
            cooldownButton.dataset.abilityName = abilityName;

            // Determine specific logical exceptions checking properties directly
            const isReaction = ability.properties && ability.properties.includes('prop_reaction');
            const hasTurn = typeof hasCurrentTurn === 'function' ? hasCurrentTurn(combatant.id) : true;

            // Block ability if character is dead
            if (combatant.isDead) {
                cooldownButton.classList.add('btn-state-dead');
                cooldownButton.textContent = t('dead');
                cooldownButton.disabled = true;
            } 
            // Normal cooldowns block
            else if (abilityState.currentCooldown !== 0) {
                cooldownButton.classList.add('btn-state-cd');
                let displayCooldown = abilityState.currentCooldown;
                if (abilityState.currentCooldown === 'unavailable') displayCooldown = t('unavailable');
                cooldownButton.textContent = displayCooldown;
                cooldownButton.disabled = true;
            } 
            // Stun mechanic block (overrides available state)
            else if (combatant.isStunned) {
                cooldownButton.classList.add('btn-state-stunned');
                cooldownButton.textContent = t('stunned');
                cooldownButton.disabled = true;
            }
            // Turn constraint mechanic block (Exceptions for Reaction tags)
            else if (!hasTurn && !isReaction) {
                cooldownButton.classList.add('btn-state-wait');
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
    
    const titleClass = combatant.team === 'enemy' ? 'card-title-enemy' : 'card-title-hero';

    // Add gear section if it exists
    if (gear.length > 0) {
        gear.forEach(item => {
            const itemCard = document.createElement('div');
            itemCard.className = 'char-extra-card';
            
            let html = `<div class="char-extra-card-title ${titleClass}">${item.name}</div>`;
            
            // Construct properties prefix dynamically for items as well if properties array exists
            let descString = item.description || "";
            if (item.properties && item.properties.length > 0) {
                const propsPrefix = item.properties.map(p => `[${p}]`).join(' ');
                descString = propsPrefix + (descString ? ' ' + descString : '');
            }

            if (descString) {
                html += `<div class="char-extra-card-desc">${parseDescription(descString, combatant)}</div>`;
            }

            html += `<div class="char-extra-card-meta">`;
            
            if (item.damage !== undefined) {
                const val = getFormulaValue(item.damage, combatant);
                const breakdown = getFormulaBreakdown(item.damage);
                html += `<div>${t('damage')}: <strong class="copyable-value text-neutral" onclick="copyValue(${val}, event)">${val}</strong>${breakdown ? ` <span class="formula-display">(${breakdown})</span>` : ''}</div>`;
            }
            if (item.physArmor !== undefined) {
                const val = getFormulaValue(item.physArmor, combatant);
                const breakdown = getFormulaBreakdown(item.physArmor);
                html += `<div>${t('phys_armor')}: <strong class="copyable-value text-neutral" onclick="copyValue(${val}, event)">${val}</strong>${breakdown ? ` <span class="formula-display">(${breakdown})</span>` : ''}</div>`;
            }
            if (item.physArmorPerc !== undefined) {
                const val = getFormulaValue(item.physArmorPerc, combatant);
                const breakdown = getFormulaBreakdown(item.physArmorPerc);
                html += `<div>${t('phys_armor')} %: <strong class="copyable-value text-neutral" onclick="copyValue(${val}, event)">${val}</strong>%${breakdown ? ` <span class="formula-display">(${breakdown})</span>` : ''}</div>`;
            }
            if (item.magArmor !== undefined) {
                const val = getFormulaValue(item.magArmor, combatant);
                const breakdown = getFormulaBreakdown(item.magArmor);
                html += `<div>${t('mag_armor')}: <strong class="copyable-value text-neutral" onclick="copyValue(${val}, event)">${val}</strong>${breakdown ? ` <span class="formula-display">(${breakdown})</span>` : ''}</div>`;
            }
            if (item.magArmorPerc !== undefined) {
                const val = getFormulaValue(item.magArmorPerc, combatant);
                const breakdown = getFormulaBreakdown(item.magArmorPerc);
                html += `<div>${t('mag_armor')} %: <strong class="copyable-value text-neutral" onclick="copyValue(${val}, event)">${val}</strong>%${breakdown ? ` <span class="formula-display">(${breakdown})</span>` : ''}</div>`;
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
            
            let html = `<div class="char-extra-card-title ${titleClass}">${item.name}</div>`;
            
            // Construct properties prefix dynamically for items as well if properties array exists
            let descString = item.description || "";
            if (item.properties && item.properties.length > 0) {
                const propsPrefix = item.properties.map(p => `[${p}]`).join(' ');
                descString = propsPrefix + (descString ? ' ' + descString : '');
            }

            if (descString) {
                html += `<div class="char-extra-card-desc">${parseDescription(descString, combatant)}</div>`;
            }
            
            html += `
                <div class="char-extra-card-meta">
                    <div class="quantity-wrapper">
                        ${t('quantity')} <input type="number" class="quantity-input" value="${item.quantity || 0}" min="0">
                    </div>
                    ${item.value !== undefined ? `<div>${t('value')}: ${item.value}</div>` : ''}
                </div>
            `;
            itemCard.innerHTML = html;
            container.appendChild(itemCard);
        });
    }
}

// Simulates combination of multiple dice mathematically evaluating exact permutations to determine UI success rate
function calculateAbilitySuccessRate(combatant, abilityRoll, abilityDifficulty) {
    if (abilityDifficulty === "X") return 100;

    const dist = getDiceDistribution(combatant, abilityRoll);
    if (!dist) return 0;

    const difficulty = parseInt(abilityDifficulty);
    let successfulCombos = 0;
    
    for (let sum in dist.dp) {
        if (parseInt(sum) >= difficulty) {
            successfulCombos += dist.dp[sum];
        }
    }

    return Math.floor((successfulCombos / dist.totalCombos) * 100);
}

// Routes abilities, resolves multi-dice arrays securely and prepares sequence pipelines
function useAbility(combatantId, ability, event) {
    // Fetch fresh combatant from memory based on ID
    const combatant = activeCombatants.find(c => c.id === combatantId);
    if (!combatant) return;

    const abilityState = combatant.abilitiesStates[ability.name];
    if (!abilityState || abilityState.currentCooldown !== 0) return;

    let success = true; 
    let initialRollsData = null; // Changed to array structure to support combined multiple stat executions

    if (ability.roll) { 
        initialRollsData = [];
        const stats = parseRollStats(ability.roll);
        let totalResult = 0;
        let combinedBreakdown = [];
        let hasBase = false;

        stats.forEach(stat => {
            const baseStat = parseInt(combatant.stats[stat]) || 0;
            if (baseStat > 0) {
                hasBase = true;
                const modValue = parseInt(combatant.stats[`${stat}Mod`]) || 0;
                const roll = Math.floor(Math.random() * baseStat) + 1;
                const finalRes = Math.max(1, roll + modValue);
                totalResult += finalRes;
                combinedBreakdown.push({ stat: stat, roll: roll, mod: modValue, total: finalRes });
            }
        });

        if (hasBase) {
            success = ability.difficulty === "X" ? true : totalResult >= parseInt(ability.difficulty);
            
            // Adjust visual colors uniformly across the array block mapped directly to compound success condition
            const groupColor = success ? 'text-success' : 'text-fail';
            initialRollsData.push({
                stat: ability.roll,
                result: totalResult,
                color: ability.difficulty === "X" ? 'text-neutral' : groupColor,
                breakdown: combinedBreakdown,
                difficulty: ability.difficulty !== "X" ? parseInt(ability.difficulty) : null
            });
        } else {
            success = false; // Failing strictly due to stats missing entirely
        }
    }

    if (success) {
        if (abilityState.singleUse) {
            abilityState.currentCooldown = 'unavailable';
        } else { 
            abilityState.currentCooldown = abilityState.maxCooldown;
        }

        // IMMEDIATELY sync the combatant to secure the cooldown block across all clients globally before any manual targeting delays
        syncUpdateCombatant(combatant);

        // Check if the ability utilizes the Action Pipeline system
        if (ability.actions && ability.actions.length > 0) {
            let shouldBroadcastInitRollImmediately = false;
            
            // Determine if the initial roll should be broadcasted immediately as a standalone row
            if (initialRollsData && initialRollsData.length > 0) {
                const firstAction = ability.actions[0];
                const requiresTargeting = ['single', 'multi'].includes(firstAction.target);
                
                const hasExtraRolls = firstAction.type === 'damage' || firstAction.forceRoll || firstAction.forceRollVS;
                
                if (requiresTargeting || !hasExtraRolls) {
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
                    rolls: initialRollsData
                });
            }

            if (typeof startActionPipeline === 'function') {
                // Pass the initial rolls array and broadcast flag to the pipeline so math continues resolving accurately
                startActionPipeline(combatant, ability.actions, ability, initialRollsData, event, shouldBroadcastInitRollImmediately);
            }
        } else {
            // Legacy fallback for simple abilities without pipeline
            if (initialRollsData && initialRollsData.length > 0) {
                syncAddRollEvent({
                    id: 'roll-' + Date.now() + '-' + Math.random().toString(36).substr(2, 5),
                    isTargeted: false,
                    combatantId: combatant.id,
                    combatantName: combatant.uniqueName,
                    combatantTeam: combatant.team,
                    rolls: initialRollsData
                });
            }
            processAndSendConditions(combatant.uniqueName, null, ability, ability.name, ability.source || "self");
        }
    } else {
        if (abilityState.singleUse && abilityState.currentCooldown !== 'unavailable') {
            abilityState.currentCooldown = 2;
        } else if (!abilityState.singleUse) {
            abilityState.currentCooldown = abilityState.maxCooldown;
        }
        
        // Always broadcast failures immediately as normal, non-targeted standalone logs (No arrow)
        if (initialRollsData && initialRollsData.length > 0) {
            syncAddRollEvent({
                id: 'roll-' + Date.now() + '-' + Math.random().toString(36).substr(2, 5),
                isTargeted: false,
                combatantId: combatant.id,
                combatantName: combatant.uniqueName,
                combatantTeam: combatant.team,
                rolls: initialRollsData
            });
        }
        
        // Failed skills must sync their failure cooldown penalty immediately
        syncUpdateCombatant(combatant);
    }
}

// TEXT REPLACEMENTS (Used only in text blocks like descriptions)

/**
 * Replaces property tags with translated HTML spans. Appends data-prop attribute for tooltip hover tracking.
 * Example Input: "This attack is [prop_unavoidable]."
 * Example Output: "This attack is <span class="highlighted-property">Nieunikalne.</span>"
 */
function parsePropertyTags(description) {
    return description.replace(/\[(prop_[a-zA-Z0-9_]+)\]/gi, (match, tag) => {
        return `<span class="highlighted-property" data-prop="${tag.toLowerCase()}">${t(tag.toLowerCase())}</span>`;
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
 * Extracts the final numerical result of a stat dynamically evaluating arbitrary nested equations.
 * Supports execution injections (rollData parameter) substituting active ability roll contexts inside equations safely.
 */
function getFormulaValue(statValue, evalContext, rollData = null) {
    if (typeof statValue === "number") return statValue;
    
    if (typeof statValue === "string") {
        let formula = statValue.replace(/[\[\]]/g, '');
        
        // Contextually substitute `roll` and `over` if present strictly inside calculation scopes
        if (/roll|over/i.test(formula)) {
            if (!rollData || rollData.total === undefined) {
                console.error("Formula requested dynamic 'roll' variables but context lacked pipeline data:", statValue);
                return 0; // Safety measure for undefined roll contexts
            }
            const r = rollData.total;
            const o = rollData.diff ? Math.max(0, r - rollData.diff) : 0;
            
            formula = formula.replace(/\b(roll)\b/gi, r).replace(/\b(over)\b/gi, o);
        }

        const evaluatedFormula = formula.replace(/\b([a-zA-Z_]\w*)\b/g, (stat) => getStatValue(evalContext, stat));
        
        if (!/^[0-9+\-*/().\s]+$/.test(evaluatedFormula)) {
            // Fallback for simple numbers disguised as strings that didn't match the regex replacements correctly
            const parsed = parseFloat(statValue.replace(/[\[\]]/g, ''));
            return isNaN(parsed) ? 0 : parsed;
        }
        
        return Math.round(new Function('return ' + evaluatedFormula)());
    }
    
    const parsed = parseFloat(statValue);
    return isNaN(parsed) ? 0 : parsed;
}

/**
 * Generates the readable formula breakdown for the UI. Returns empty string if not applicable.
 * Translates explicit stat words to their respective description cases dynamically.
 */
function getFormulaBreakdown(statValue) {
    if (typeof statValue !== "string") return "";
    
    const formula = statValue.replace(/[\[\]]/g, '');
    const displayFormula = formula.replace(/\b([a-zA-Z_]\w*)\b/g, (stat) => {
        return t(stat.toLowerCase());
    });
    
    // Ignore formulas that are just plain numbers wrapped in brackets (e.g., "[-15]")
    if (/^[+-]?\d+(\.\d+)?$/.test(formula.replace(/\s+/g, ''))) return "";
    
    return displayFormula;
}

// ABILITY SPECIFIC PARSERS (Used only for Ability Descriptions)

/**
 * Extracts comprehensive math structures supporting infinite sums/subtractions directly replacing roll/over bounds.
 * Wraps dynamic results (e.g., Min - Max) sequentially in fully functional format.
 */
function parseFormulaTags(description, combatant, ability = null) {
    return description.replace(/\[(.*?)\]/g, (match, formula) => {
        try {
            const cleanFormula = formula.replace(/\s+/g, ' ').trim();

            // Intercept complex dynamically structured ability elements heavily depending on multiple parameters
            if (/roll|over/i.test(cleanFormula)) {
                if (!ability || !ability.roll) {
                    showAlertDialog(t('error_ability_roll_missing'));
                    console.error("Missing 'roll' property on requested ability formula resolution.");
                    return match;
                }
                if (/over/i.test(cleanFormula) && (!ability.difficulty || ability.difficulty === "X")) {
                    showAlertDialog(t('error_ability_diff_missing'));
                    console.error("Missing 'difficulty' property parsing margin offset 'over' calculation.");
                    return match;
                }

                // Extrapolate bounds across potential multi-stat array inputs natively
                let minRollSum = 0, maxRollSum = 0;
                const statsArray = parseRollStats(ability.roll);
                
                statsArray.forEach(stat => {
                    const base = getStatValue(combatant, stat);
                    const mod = getModValue(combatant, stat);
                    minRollSum += Math.max(1, 1 + mod); // Minimum physical dice boundary strictly defined per component
                    maxRollSum += Math.max(1, base + mod); // Maximum boundary mapping
                });
                
                const diff = parseInt(ability.difficulty) || 0;
                const minOverSum = Math.max(0, minRollSum - diff);
                const maxOverSum = Math.max(0, maxRollSum - diff);

                // Math execution closure supporting deeply nested formulas replacing variables sequentially
                const computeBound = (rVal, oVal) => {
                    let ev = cleanFormula.replace(/\b(roll)\b/gi, rVal).replace(/\b(over)\b/gi, oVal);
                    ev = ev.replace(/\b([a-zA-Z_]\w*)\b/g, (statName) => getStatValue(combatant, statName));
                    if (!/^[0-9+\-*/().\s]+$/.test(ev)) return 0;
                    return Math.round(new Function('return ' + ev)());
                };

                const val1 = computeBound(minRollSum, minOverSum);
                const val2 = computeBound(maxRollSum, maxOverSum);
                
                let minFinal = Math.min(val1, val2);
                let maxFinal = Math.max(val1, val2);

                // Evaluate the vertex point (difficulty kink) for piecewise linearity to guarantee absolute extremes
                if (diff > minRollSum && diff < maxRollSum) {
                    const val3 = computeBound(diff, 0);
                    minFinal = Math.min(minFinal, val3);
                    maxFinal = Math.max(maxFinal, val3);
                }

                // Reconstruct breakdown utilizing abstract generic variables instead of explicitly mapped dynamic stats to prevent multi-dice clutter
                const displayFormula = cleanFormula.replace(/\b([a-zA-Z_]\w*)\b/g, (term) => {
                    const lTerm = term.toLowerCase();
                    if (lTerm === 'roll') {
                        return t('roll_result');
                    } else if (lTerm === 'over') {
                        return t('success_margin');
                    } else {
                        return t(lTerm);
                    }
                });

                return `<strong class="copyable-value" onclick="copyValue(${minFinal}, event)">${minFinal}</strong> - <strong class="copyable-value" onclick="copyValue(${maxFinal}, event)">${maxFinal}</strong> <span class="formula-display">(${displayFormula})</span>`;
            }

            // Standard fallback parsing engine block for flat mathematical static expressions without 'roll'/'over' elements
            const result = getFormulaValue(cleanFormula, combatant);
            const breakdown = getFormulaBreakdown(cleanFormula);
            
            let displayHtml = '';
            if (breakdown) {
                displayHtml = ` <span class="formula-display">(${breakdown})</span>`;
            }

            return `<strong class="copyable-value" onclick="copyValue(${result}, event)">${result}</strong>${displayHtml}`;
        } catch (e) {
            console.error(`Cannot calculate formula block correctly: ${match}`, e);
            return match; 
        }
    });
}

// MASTER TEXT WRAPPER

/**
 * Master wrapper used strictly for formatting text blocks (e.g., item or ability descriptions).
 * Sequentially applies property highlights, stat highlights, and formula calculations passing active ability structures dynamically.
 */
function parseDescription(description, combatant, ability = null) {
    if (typeof description === "number") return description;

    let processedDescription = parsePropertyTags(String(description));
    processedDescription = parseStatTags(processedDescription);
    processedDescription = parseFormulaTags(processedDescription, combatant, ability);

    return processedDescription;
}

// Retrieves only the value of the statistic itself, without counting the additional bonus.
function getStatValue(combatant, stat) {
    if (!combatant || !combatant.stats) return 0;
    return parseInt(combatant.stats[stat]) || 0; 
}

// Retrieves the value of the stat bonus.
function getModValue(combatant, stat) {
    if (!combatant || !combatant.stats) return 0;
    return parseInt(combatant.stats[`${stat}Mod`]) || 0; 
}