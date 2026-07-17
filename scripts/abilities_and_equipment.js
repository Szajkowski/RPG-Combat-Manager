// Main entry point for rendering the Extra Panel (Skills & Equipment tabs)
async function renderExtraPanel(combatantId) {
    const combatant = activeCombatants.find(c => c.id === combatantId);
    if (!combatant) return;

    const extraPanel = document.getElementById('panel-extra');
    if (!extraPanel) return;

    const baseName = combatant.baseName;
    const baseData = players[baseName] || npcs[baseName] || mobs[baseName] || bosses[baseName] || {};
    const rightPanel = document.getElementById('characterDetailsPanel');
    
    const attunementInput = rightPanel.querySelector('.stat-val-input[data-stat="attunement"]');
    let attunement = 1000; // if there is no attunement stat, you can have as many abilities as you want.
    if (attunementInput) attunement = parseInt(attunementInput.value);

    // Calculate maximum number of abilities
    let maxAbilities = 3;  // Base 3 abilities
    if (attunement > 10) {
        maxAbilities += Math.floor((attunement - 10) / 2);
    }
    
    const abilities = baseData.abilities?.slice(0, maxAbilities) || [];
    const equipment = baseData.equipment || [];

    const hasAbilities = abilities.length > 0;
    const hasEquipment = equipment.length > 0;

    // If character has neither skills nor equipment, clear and hide the panel completely
    if (!hasAbilities && !hasEquipment) {
        extraPanel.innerHTML = '';
        return;
    }

    let html = '';

    // Always render the tabs container if there's at least one, to serve as a visual header
    html += `<div class="char-extra-tabs">`;
    if (hasAbilities) {
        html += `<div class="char-extra-tab active" data-target="panel-skills">${t('tab_skills')}</div>`;
    }
    if (hasEquipment) {
        // Make it active if it's the ONLY tab present
        const equipActiveClass = !hasAbilities ? 'active' : '';
        html += `<div class="char-extra-tab ${equipActiveClass}" data-target="panel-equip">${t('tab_equip')}</div>`;
    }
    html += `</div>`;

    // Prepare content containers
    html += `<div class="char-extra-content ${hasAbilities ? 'active' : ''}" id="panel-skills"></div>`;
    html += `<div class="char-extra-content ${!hasAbilities && hasEquipment ? 'active' : ''}" id="panel-equip"></div>`;

    extraPanel.innerHTML = html;

    // Attach tab switching logic ONLY if both tabs are present
    if (hasAbilities && hasEquipment) {
        extraPanel.querySelectorAll('.char-extra-tab').forEach(tab => {
            tab.addEventListener('click', () => {
                extraPanel.querySelectorAll('.char-extra-tab').forEach(t => t.classList.remove('active'));
                extraPanel.querySelectorAll('.char-extra-content').forEach(c => c.classList.remove('active'));
                tab.classList.add('active');
                document.getElementById(tab.dataset.target).classList.add('active');
            });
        });
    }

    // Populate data into containers
    if (hasAbilities) {
        const skillsContainer = document.getElementById('panel-skills');
        await populateAbilities(abilities, combatant, rightPanel, skillsContainer);
    }

    if (hasEquipment) {
        const equipContainer = document.getElementById('panel-equip');
        populateEquipment(equipment, rightPanel, equipContainer);
    }
}

async function populateAbilities(abilities, combatant, rightPanel, container) {
    const characterName = combatant.uniqueName;
    const abilitiesStates = await loadServerAbilitiesStates();
    if (!abilitiesStates[characterName]) {
        abilitiesStates[characterName] = {};
    }

    abilities.forEach(ability => {
        const abilityName = ability.name;

        // Initialize state in abilitiesStates
        if (!abilitiesStates[characterName][abilityName]) {
            const isSingleUse = ability.cooldown === "[cooldown_once]";
            const maxCooldown = isSingleUse ? Infinity : (!ability.cooldown && ability.cooldown !== 0 ? 0 : parseInt(ability.cooldown) + 1);
            
            abilitiesStates[characterName][abilityName] = {
                currentCooldown: 0, // Available by default
                maxCooldown: maxCooldown,
                singleUse: isSingleUse // Can it only be used once per combat
            };
        }

        const abilityState = abilitiesStates[characterName][abilityName];
        const abilityCard = document.createElement('div');
        abilityCard.className = 'char-extra-card';

        // Build ability content
        const parsedDesc = parseDescription(ability.description || "", rightPanel, ability.roll, ability.difficulty);

        let cardInner = `
            <div class="char-extra-card-title">
                ${abilityName}
                <div class="btn-container"></div>
            </div>
            <div class="char-extra-card-desc">${parsedDesc}</div>
            <div class="char-extra-card-meta">
        `;

        // Optional attributes
        if (ability.roll) cardInner += `<span>${t('roll')} <strong class="stat-bonus">${t(ability.roll)}</strong></span>`;

        if (ability.roll && ability.difficulty) cardInner += `<span>${t('difficulty')} <strong class="stat-bonus">${ability.difficulty}</strong></span>`;

        if (ability.roll && ability.difficulty && ability.difficulty !== "X") cardInner += `<span>${t('success_chance')} <strong style="color: #bd93f9;">${calculateAbilitySuccessRate(rightPanel, ability.roll, ability.difficulty)}%</strong></span>`;

        cardInner += `</div>`;
        abilityCard.innerHTML = cardInner;

        // Create cooldown button        
        if (ability.cooldown !== undefined && ability.cooldown !== null) {
            const cooldownButton = document.createElement('button');
            cooldownButton.className = 'action-cd-btn';

            // Assign custom attributes to help updateActivePanel later
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
            
            cooldownButton.onclick = () => useAbility(cooldownButton, characterName, ability);
            abilityCard.querySelector('.btn-container').appendChild(cooldownButton);
        }

        container.appendChild(abilityCard);
    });

    await updateServerAbilitiesStates(abilitiesStates);
}

function populateEquipment(equipment, rightPanel, container) {
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
                html += `<div class="char-extra-card-desc">${parseDescription(item.description, rightPanel)}</div>`;
            }

            html += `<div class="char-extra-card-meta">`;
            
            if (item.damage !== undefined) {
                const val = getFormulaValue(item.damage, rightPanel);
                const breakdown = getFormulaBreakdown(item.damage);
                html += `<div>${t('damage')}: <strong style="color: #f8f8f2;" class="copyable-value" onclick="copyToClipboard(${val}, event)">${val}</strong>${breakdown ? ` <span class="formula-display">(${breakdown})</span>` : ''}</div>`;
            }
            if (item.physArmor !== undefined) {
                const val = getFormulaValue(item.physArmor, rightPanel);
                const breakdown = getFormulaBreakdown(item.physArmor);
                html += `<div>${t('phys_armor')}: <strong style="color: #f8f8f2;" class="copyable-value" onclick="copyToClipboard(${val}, event)">${val}</strong>${breakdown ? ` <span class="formula-display">(${breakdown})</span>` : ''}</div>`;
            }
            if (item.physArmorPerc !== undefined) {
                const val = getFormulaValue(item.physArmorPerc, rightPanel);
                const breakdown = getFormulaBreakdown(item.physArmorPerc);
                html += `<div>${t('phys_armor')} %: <strong style="color: #f8f8f2;" class="copyable-value" onclick="copyToClipboard(${val}, event)">${val}</strong>%${breakdown ? ` <span class="formula-display">(${breakdown})</span>` : ''}</div>`;
            }
            if (item.magArmor !== undefined) {
                const val = getFormulaValue(item.magArmor, rightPanel);
                const breakdown = getFormulaBreakdown(item.magArmor);
                html += `<div>${t('mag_armor')}: <strong style="color: #f8f8f2;" class="copyable-value" onclick="copyToClipboard(${val}, event)">${val}</strong>${breakdown ? ` <span class="formula-display">(${breakdown})</span>` : ''}</div>`;
            }
            if (item.magArmorPerc !== undefined) {
                const val = getFormulaValue(item.magArmorPerc, rightPanel);
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
                html += `<div class="char-extra-card-desc">${parseDescription(item.description, rightPanel)}</div>`;
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

function calculateAbilitySuccessRate(rightPanel, abilityRoll, abilityDifficulty) {
    const statValue = parseInt(rightPanel.querySelector(`.stat-val-input[data-stat="${abilityRoll}"]`)?.value) || 0;
    const modValue = parseInt(rightPanel.querySelector(`.stat-mod-input[data-stat="${abilityRoll}Mod"]`)?.value) || 0;

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

async function useAbility(button, characterName, ability) {
    const abilitiesStates = await loadServerAbilitiesStates();

    const abilityState = abilitiesStates[characterName][ability.name];
    const rightPanel = document.getElementById('characterDetailsPanel');

    if (abilityState.currentCooldown !== 0) return;

    let success = true; // abilities without info on what to roll are treated as always successful

    if (ability.roll) { // roll, if the ability has one
        // Pass null for diceElement since we are now rolling from the UI panel directly
        const result = rollDice(null, ability.roll, ability.difficulty);
        success = ability.difficulty === "X" ? true 
                                             : result >= ability.difficulty ? true 
                                             : false;
    }

    if (success) {
        if (abilityState.singleUse) {
            // Permanent block, if the ability is single-use and succeeds
            button.disabled = true;
            button.style.background = '#ff5555';
            button.style.color = 'white';
            button.textContent = t('unavailable');
            abilityState.currentCooldown = 'unavailable';
            if (ability.condition && ability.conditionDuration) {
                // Warning: sendCondition expects the rightPanel context now
                sendCondition(characterName, ability.condition, ability.conditionDuration, rightPanel);
            }
        } else { // if it isn't, it gets normal cd
            if (ability.condition && ability.conditionDuration) {
                sendCondition(characterName, ability.condition, ability.conditionDuration, rightPanel);
            }
            setAbilityCooldown(button, abilityState.maxCooldown, abilityState);
        }
    } else {
        if (abilityState.singleUse && abilityState.currentCooldown !== 'unavailable') {
            // A failed roll for a single-use ability always gets a one-turn cd. It's written as two because these cds are sort of +1 always, to wait out the next turn, 
            // instead of the ability being immediately available again
            setAbilityCooldown(button, 2, abilityState);
        } else if (!abilityState.singleUse) {
            // Failed roll for regular abilities
            setAbilityCooldown(button, abilityState.maxCooldown, abilityState);
        }
    }

    await updateServerAbilitiesStates(abilitiesStates);
    requestUpdateActivePanel();
}

function rollDice(diceElement, diceType, difficulty = null) {
    const rightPanel = document.getElementById('characterDetailsPanel');
    const statInput = rightPanel.querySelector(`.stat-val-input[data-stat="${diceType}"]`);
    const modInput = rightPanel.querySelector(`.stat-mod-input[data-stat="${diceType}Mod"]`);
    
    const lastRollDisplay = document.getElementById('last-roll-display');
    const lastRollLabel = document.querySelector('.dice-result-label');

    if (!statInput || !modInput) {
        alert(t('no_stats_error'));
        return 0;
    }

    const baseStat = parseInt(statInput.value) || 0;
    const modValue = parseInt(modInput.value) || 0;
    const roll = Math.floor(Math.random() * baseStat) + 1;
    let result = Math.max(1, roll + modValue);

    // Intuition bonus for Agility and Accuracy
    if (diceType === 'agility' || diceType === 'accuracy') {
        const intuitionInput = rightPanel.querySelector(`.stat-val-input[data-stat="intuition"]`);
        const intuitionValue = parseInt(intuitionInput?.value) || 0;
        if (intuitionValue >= 10) {
            const intuitionBonus = Math.floor((intuitionValue - 10) / 4);
            result += intuitionBonus;
        }
    }

    // Update UI
    if (lastRollDisplay && lastRollLabel) {
        lastRollLabel.textContent = `${t('last_roll')} (${t(diceType)})`;
        lastRollDisplay.textContent = result;
        
        // Color the result based on difficulty
        if (difficulty && difficulty !== "X") {
            difficulty = parseInt(difficulty);
            lastRollDisplay.style.color = result >= difficulty ? '#50fa7b' : '#ff5555';
        } else {
            lastRollDisplay.style.color = 'white';
        }
    }

    playSoundEffect('sound/diceroll.mp3');

    return result; 
}

function setAbilityCooldown(button, cooldown, abilityState) {
    abilityState.currentCooldown = cooldown;
    button.disabled = true;
    button.style.background = '#ff5555';
    button.style.color = 'white';
    button.textContent = cooldown;
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
 function getFormulaValue(statValue, rightPanel) {
    if (typeof statValue === "number") return statValue;
    
    if (typeof statValue === "string" && statValue.includes('[')) {
        const formula = statValue.replace(/[\[\]]/g, '');
        const evaluatedFormula = formula.replace(/\b([a-zA-Z_]\w*)\b/g, (stat) => getStatValue(rightPanel, stat));
        
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
function evaluateDynamicAbilityRoll(formula, rightPanel, rollAbility, rollDifficulty) {
    if (!rollAbility) return "0";

    const statValue = getStatValue(rightPanel, rollAbility);
    const modValue = getModValue(rightPanel, rollAbility);

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
function parseFormulaTags(description, rightPanel, rollAbility, rollDifficulty) {
    return description.replace(/\[(.*?)\]/g, (match, formula) => {
        try {
            // Forward ability-specific keywords (roll/over) to the dynamic handler
            if (/roll|over/i.test(formula)) {
                const result = evaluateDynamicAbilityRoll(formula, rightPanel, rollAbility, rollDifficulty);
                return `<strong class="calculated-value">${result}</strong>`;
            }

            // Using 'match' (which includes brackets) to utilize the universal getFormula functions
            const result = getFormulaValue(match, rightPanel);
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
function parseDescription(description, rightPanel, rollAbility = null, rollDifficulty = null) {
    if (typeof description === "number") return description;

    let processedDescription = parsePropertyTags(String(description));
    processedDescription = parseStatTags(processedDescription);
    processedDescription = parseFormulaTags(processedDescription, rightPanel, rollAbility, rollDifficulty);

    return processedDescription;
}

// Retrieves only the value of the statistic itself, without counting the additional bonus. Roll bonuses shouldn't affect ability damage in the [number * stat] convention
function getStatValue(rightPanel, stat) {
    const statInput = rightPanel.querySelector(`.stat-val-input[data-stat="${stat}"]`);
    return statInput ? parseInt(statInput.value) || 0 : 0; 
}

// Retrieves the value of the stat bonus. Useful when calculating things dependent on the height of the roll or penetration points
function getModValue(rightPanel, stat) {
    const modInput = rightPanel.querySelector(`.stat-mod-input[data-stat="${stat}Mod"]`);
    return modInput ? parseInt(modInput.value) || 0 : 0; 
}

async function updateActivePanel() {
    const extraPanel = document.getElementById('panel-extra');
    if (!extraPanel || extraPanel.innerHTML === '') return;

    if (!selectedCharacterId) return;
    const combatant = activeCombatants.find(c => c.id === selectedCharacterId);
    if (!combatant) return;

    const abilitiesStates = await loadServerAbilitiesStates();
    const characterName = combatant.uniqueName;
    if (!abilitiesStates[characterName]) return;

    const allCooldownButtons = extraPanel.querySelectorAll('.action-cd-btn');
    allCooldownButtons.forEach(button => {
        const abilityName = button.dataset.abilityName;
        if (!abilityName || !abilitiesStates[characterName][abilityName]) return;

        const abilityState = abilitiesStates[characterName][abilityName];

        // Block if dead
        if (combatant.isDead) {
            button.disabled = true;
            button.style.background = '#ff5555';
            button.style.color = 'white';
            button.textContent = t('dead');
        } 
        else if (abilityState.currentCooldown === 0) {
            button.disabled = false; 
            button.style.background = '#50fa7b';
            button.style.color = '#181922';
            button.textContent = t('available');
        } 
        else if (abilityState.currentCooldown !== 'unavailable') {
            button.disabled = true;
            button.style.background = '#ff5555';
            button.style.color = 'white';
            button.textContent = abilityState.currentCooldown;
        } 
        else {
            button.disabled = true;
            button.style.background = '#ff5555';
            button.style.color = 'white';
            button.textContent = t('unavailable');
        }
    });
}