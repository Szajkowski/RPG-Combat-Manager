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
    
    // Use the deep-copied arrays stored in the central memory
    const abilities = combatant.abilities.slice(0, maxAbilities);
    const equipment = combatant.equipment;

    const hasAbilities = abilities.length > 0;
    const hasEquipment = equipment.length > 0;

    // If character has neither skills nor equipment, clear and hide the panel completely
    if (!hasAbilities && !hasEquipment) {
        extraPanel.innerHTML = '';
        return;
    }

    // Fallback logic if the stored tab doesn't exist on the selected character
    if (activeTabTarget === 'panel-skills' && !hasAbilities) activeTabTarget = 'panel-equip';
    if (activeTabTarget === 'panel-equip' && !hasEquipment) activeTabTarget = 'panel-skills';

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
    if (hasAbilities && hasEquipment) {
        extraPanel.querySelectorAll('.char-extra-tab').forEach(tab => {
            tab.addEventListener('click', () => {
                const target = tab.dataset.target;
                localStorage.setItem('CombatManager-ExtraTab', target);

                extraPanel.querySelectorAll('.char-extra-tab').forEach(t => t.classList.remove('active'));
                extraPanel.querySelectorAll('.char-extra-content').forEach(c => c.classList.remove('active'));
                
                tab.classList.add('active');
                document.getElementById(target).classList.add('active');
            });
        });
    }

    // Populate data into containers using the combatant object directly
    if (hasAbilities) {
        const skillsContainer = document.getElementById('panel-skills');
        populateAbilities(abilities, combatant, skillsContainer);
    }

    if (hasEquipment) {
        const equipContainer = document.getElementById('panel-equip');
        populateEquipment(equipment, combatant, equipContainer);
    }
}

function populateAbilities(abilities, combatant, container) {
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
        const parsedDesc = parseDescription(ability.description || "", combatant, ability.roll, ability.difficulty);

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

            // Block ability if character is dead
            if (combatant.isDead) {
                cooldownButton.style.background = '#ff5555';
                cooldownButton.style.color = 'white';
                cooldownButton.textContent = t('dead');
                cooldownButton.disabled = true;
            } 
            // Normal cooldowns
            else if (abilityState.currentCooldown !== 0) {
                cooldownButton.style.background = '#ff5555';
                cooldownButton.style.color = 'white';
                let displayCooldown = abilityState.currentCooldown;
                if (abilityState.currentCooldown === 'unavailable') displayCooldown = t('unavailable');
                cooldownButton.textContent = displayCooldown;
                cooldownButton.disabled = true;
            } 
            // Available
            else {
                cooldownButton.textContent = t('available');
                cooldownButton.disabled = false;
            }
            
            cooldownButton.onclick = () => useAbility(combatant.id, ability);
            abilityCard.querySelector('.btn-container').appendChild(cooldownButton);
        }

        container.appendChild(abilityCard);
    });
}

function populateEquipment(equipment, combatant, container) {
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
                html += `<div>${t('damage')}: <strong style="color: #f8f8f2;" class="copyable-value" onclick="copyToClipboard(${val}, event)">${val}</strong>${breakdown ? ` <span class="formula-display">(${breakdown})</span>` : ''}</div>`;
            }
            if (item.physArmor !== undefined) {
                const val = getFormulaValue(item.physArmor, combatant);
                const breakdown = getFormulaBreakdown(item.physArmor);
                html += `<div>${t('phys_armor')}: <strong style="color: #f8f8f2;" class="copyable-value" onclick="copyToClipboard(${val}, event)">${val}</strong>${breakdown ? ` <span class="formula-display">(${breakdown})</span>` : ''}</div>`;
            }
            if (item.physArmorPerc !== undefined) {
                const val = getFormulaValue(item.physArmorPerc, combatant);
                const breakdown = getFormulaBreakdown(item.physArmorPerc);
                html += `<div>${t('phys_armor')} %: <strong style="color: #f8f8f2;" class="copyable-value" onclick="copyToClipboard(${val}, event)">${val}</strong>%${breakdown ? ` <span class="formula-display">(${breakdown})</span>` : ''}</div>`;
            }
            if (item.magArmor !== undefined) {
                const val = getFormulaValue(item.magArmor, combatant);
                const breakdown = getFormulaBreakdown(item.magArmor);
                html += `<div>${t('mag_armor')}: <strong style="color: #f8f8f2;" class="copyable-value" onclick="copyToClipboard(${val}, event)">${val}</strong>${breakdown ? ` <span class="formula-display">(${breakdown})</span>` : ''}</div>`;
            }
            if (item.magArmorPerc !== undefined) {
                const val = getFormulaValue(item.magArmorPerc, combatant);
                const breakdown = getFormulaBreakdown(item.magArmorPerc);
                html += `<div>${t('mag_armor')} %: <strong style="color: #f8f8f2;" class="copyable-value" onclick="copyToClipboard(${val}, event)">${val}</strong>%${breakdown ? ` <span class="formula-display">(${breakdown})</span>` : ''}</div>`;
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

function useAbility(combatantId, ability) {
    // Fetch fresh combatant from memory based on ID
    const combatant = activeCombatants.find(c => c.id === combatantId);
    if (!combatant) return;

    const abilityState = combatant.abilitiesStates[ability.name];
    if (!abilityState || abilityState.currentCooldown !== 0) return;

    let success = true; // abilities without info on what to roll are treated as always successful

    if (ability.roll) { // roll, if the ability has one
        const result = rollDice(combatant.id, ability.roll, ability.difficulty);
        success = ability.difficulty === "X" ? true 
                                             : result >= ability.difficulty ? true 
                                             : false;
    }

    if (success) {
        if (abilityState.singleUse) {
            // Permanent block, if the ability is single-use and succeeds
            abilityState.currentCooldown = 'unavailable';
            if (ability.condition && ability.conditionDuration) {
                // For now, pass a dummy context or panel to sendCondition if needed
                sendCondition(combatant.uniqueName, ability.name, ability.condition, ability.conditionDuration);
            }
        } else { // if it isn't, it gets normal cd
            if (ability.condition && ability.conditionDuration) {
                sendCondition(combatant.uniqueName, ability.name, ability.condition, ability.conditionDuration);
            }
            abilityState.currentCooldown = abilityState.maxCooldown;
        }
    } else {
        if (abilityState.singleUse && abilityState.currentCooldown !== 'unavailable') {
            // A failed roll for a single-use ability always gets a one-turn cd. It's written as two because these cds are sort of +1 always, to wait out the next turn, 
            // instead of the ability being immediately available again
            abilityState.currentCooldown = 2;
        } else if (!abilityState.singleUse) {
            // Failed roll for regular abilities
            abilityState.currentCooldown = abilityState.maxCooldown;
        }
    }

    // Instantly sync the modified ability state to all clients (which will refresh the UI buttons globally)
    syncUpdateCombatant(combatant); 
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
 * Example Output: "Grants <strong class="stat-bonus">+2 siły</strong> and <strong class="stat-bonus">-1 do rzutu na zwinność</strong>."
 */
function parseStatTags(description) {
    return description.replace(/\[([+-]?\d+(?:\.\d+)?)\s+([a-zA-Z0-9_]+)(?:\s+(mod))?\]/gi, (match, value, stat, isMod) => {
        const statKey = stat.toLowerCase();
        let statTranslated;

        if (isMod) {
            const modKey = 'mod_' + statKey;
            const modTranslation = t(modKey);
            // If specific translation for the mod exists, use it. Otherwise fallback to "statname mod".
            statTranslated = modTranslation !== modKey ? modTranslation : `${t('desc_' + statKey)} ${t('desc_mod')}`;
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
 * Example Input 1: "[10 + 0.5 * vitality]" -> Returns: "10 + 0.5 * żywotności"
 * Example Input 2: 15 -> Returns: "" (No formula to display)
 * Example Input 3: "[15]" -> Returns: "" (No formula to display)
 */
function getFormulaBreakdown(statValue) {
    if (typeof statValue !== "string" || !statValue.includes('[')) return "";
    
    const formula = statValue.replace(/[\[\]]/g, '');
    const displayFormula = formula.replace(/\b([a-zA-Z_]\w*)\b/g, (stat) => {
        const descKey = 'desc_' + stat.toLowerCase();
        const translatedDesc = t(descKey);
        
        return translatedDesc === descKey ? t(stat.toLowerCase()) : translatedDesc;
    });
    
    // Ignore formulas that are just plain numbers wrapped in brackets (e.g., "[-15]")
    if (/^[+-]?\d+(\.\d+)?$/.test(formula.replace(/\s+/g, ''))) return "";
    
    return displayFormula;
}

// ABILITY SPECIFIC PARSERS (Used only for Ability Descriptions)

/**
 * Handles dynamic range calculations specifically for ability rolls and penetration.
 * Example Input (X * roll): "2 * roll" -> Returns: "4 - 24" (String range)
 * Example Input (X * over): "3 * over" -> Returns: "3 - 15" (String range)
 */
function evaluateDynamicAbilityRoll(formula, combatant, rollAbility, rollDifficulty) {
    if (!rollAbility) return "0";

    const statValue = getStatValue(combatant, rollAbility);
    const modValue = getModValue(combatant, rollAbility);

    // Multiplier roll (X * roll)
    if (/^\s*(\d+)\s*\*\s*roll\s*$/i.test(formula)) {
        const multiplier = parseInt(formula.match(/^\s*(\d+)/)[1]);
        if (rollDifficulty > statValue + modValue) return "0";
        
        if (!rollDifficulty || rollDifficulty === "X") {
            return `${multiplier * (1 + modValue)} - ${multiplier * (statValue + modValue)}`;
        }
        return `${rollDifficulty > modValue ? multiplier * rollDifficulty : multiplier * (1 + modValue)} - ${multiplier * (statValue + modValue)}`;
    }

    // Penetration points (X * over)
    if (/^\s*(\d+)\s*\*\s*over\s*$/i.test(formula) && rollDifficulty) {
        const multiplier = parseInt(formula.match(/^\s*(\d+)/)[1]);
        if (rollDifficulty >= (statValue + modValue) || rollDifficulty === "X") return "0";

        const maxOverPoints = statValue + modValue - rollDifficulty;
        const minOverPoints = modValue > rollDifficulty ? modValue - rollDifficulty : 1;
        return `${multiplier * minOverPoints} - ${multiplier * maxOverPoints}`;
    }

    // Power scaling (X ^ over)
    if (/^\s*(\d+)\s*\^\s*over\s*$/i.test(formula) && rollDifficulty && rollDifficulty !== "X") {
        const baseValue = parseInt(formula.match(/^\s*(\d+)/)[1]);
        if (rollDifficulty >= (statValue + modValue) || rollDifficulty === "X") return "0";

        const maxOverPoints = statValue + modValue - rollDifficulty;
        const minOverPoints = modValue > rollDifficulty ? modValue - rollDifficulty : 1;
        return `${Math.pow(baseValue, minOverPoints)} - ${Math.pow(baseValue, maxOverPoints)}`;
    }

    return "0";
}

/**
 * Specifically parses formulas embedded inside text blocks (e.g. descriptions).
 * Wraps calculated results in clickable HTML tags.
 * Example Input: "Deals [2 * roll] damage and [10 + 1 * vitality] frost damage."
 * Example Output: "Deals <strong ...>2-24</strong> damage and <strong ...>20</strong> <span ...>(10 + 1 * żywotności)</span> frost damage."
 */
function parseFormulaTags(description, combatant, rollAbility, rollDifficulty) {
    return description.replace(/\[(.*?)\]/g, (match, formula) => {
        try {
            // Forward ability-specific keywords (roll/over) to the dynamic handler
            if (/roll|over/i.test(formula)) {
                const result = evaluateDynamicAbilityRoll(formula, combatant, rollAbility, rollDifficulty);
                return `<strong class="calculated-value">${result}</strong>`;
            }

            // Using 'match' (which includes brackets) to utilize the universal getFormula functions
            const result = getFormulaValue(match, combatant);
            const breakdown = getFormulaBreakdown(match);
            
            // Only append the formula breakdown if it's not a raw number
            let displayHtml = '';
            if (breakdown) {
                displayHtml = ` <span class="formula-display">(${breakdown})</span>`;
            }

            return `<strong class="copyable-value" onclick="copyToClipboard(${result}, event)">${result}</strong>${displayHtml}`;
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
function parseDescription(description, combatant, rollAbility = null, rollDifficulty = null) {
    if (typeof description === "number") return description;

    let processedDescription = parsePropertyTags(String(description));
    processedDescription = parseStatTags(processedDescription);
    processedDescription = parseFormulaTags(processedDescription, combatant, rollAbility, rollDifficulty);

    return processedDescription;
}

// Retrieves only the value of the statistic itself, without counting the additional bonus. Roll bonuses shouldn't affect ability damage in the [number * stat] convention
function getStatValue(combatant, stat) {
    return parseInt(combatant.stats[stat]) || 0; 
}

// Retrieves the value of the stat bonus. Useful when calculating things dependent on the height of the roll or penetration points
function getModValue(combatant, stat) {
    return parseInt(combatant.stats[`${stat}Mod`]) || 0; 
}