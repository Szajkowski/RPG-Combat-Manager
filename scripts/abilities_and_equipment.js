async function showAbilitiesPanel(button) {
    const characterDiv = button.closest('.character');
    let name = characterDiv.querySelector('input[type="text"]').value;
    name = removeUniqueNameNumber(name); // thanks to this, if characters repeat, e.g., there are two of the same goblin casters, each of them has the same spells, but their CDs are different!

    const attunementInput = characterDiv.querySelector('.stat-value.attunement');
    let attunement = 1000; // if there is no attunement stat, you can have as many abilities as you want.
    if (attunementInput) attunement = parseInt(attunementInput.value);

    const stats = (players[name] || adventurers[name] || monsters[name] || bosses[name] || {});

    // Calculate maximum number of abilities
    let maxAbilities = 3;  // Base 3 abilities
    if (attunement > 10) {
        maxAbilities += Math.floor((attunement - 10) / 2);
    }
    const abilities = stats.abilities?.slice(0, maxAbilities) || [];
    
    let panel = characterDiv.querySelector('.abilities-panel');
    let overlay = document.querySelector('.overlay');

    if (isRemoving) return; // if any panel is currently being hidden, let it hide

    hideActivePanel(); // hide any open panel

    if (panel) return; // if any panel is not hidden, return. This way, clicking the button again 
                       // when the abilities panel is open hides it, instead of sliding it out again

    panel = await createAbilitiesPanel(abilities, characterDiv);
    characterDiv.appendChild(panel);

    if (!overlay) {
        overlay = document.createElement('div');
        overlay.className = 'overlay';
        document.body.appendChild(overlay);
    }

    overlay.addEventListener('click', hideActivePanel);

    requestAnimationFrame(() => {
        requestAnimationFrame(() => {
            if (panel && panel.parentNode) {
                characterDiv.style.zIndex = '1002';
                panel.classList.add('active');
                overlay.classList.add('active');
                activePanel = panel;
                activeOverlay = overlay;
            }
        });
    });
}

async function createAbilitiesPanel(abilities, characterDiv) {
    const panel = document.createElement('div');
    panel.className = 'abilities-panel';

    const abilitiesList = document.createElement('ul');
    abilitiesList.className = 'abilities-list';

    let characterName = characterDiv.querySelector('input[type="text"]').value;

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

        const abilityItem = document.createElement('li');
        abilityItem.className = 'ability-item';

        // Build ability content
        let abilityContent = `
            <div class="ability-name">${abilityName}</div>
            <div class="ability-description">${parseDescription(ability.description || "", characterDiv, ability.roll, ability.difficulty)}</div>
        `;

        // Optional attributes
        if (ability.roll) {
            const rollName = t(ability.roll); 
            abilityContent += `<div class="ability-stat">${t('roll')} ${rollName}</div>`;
        }
        if (ability.difficulty) {
            abilityContent += `<div class="ability-stat">${t('difficulty')} ${ability.difficulty}</div>`;
        }
        if (ability.cooldown !== undefined && ability.cooldown !== null) {
            // If it's a tag, translate it
            let displayCooldown = ability.cooldown === "[cooldown_once]" ? t('cooldown_once') : ability.cooldown;
            abilityContent += `<div class="ability-stat btn-here">${t('cooldown')} ${displayCooldown}</div>`;
        }
        if (ability.difficulty && ability.difficulty !== "X") {
            abilityContent += `<div class="ability-stat">${t('success_chance')} <span class="highlighted-property">${calculateaAbilitySuccessRate(characterDiv, ability.roll, ability.difficulty)}%</span></div>`;
        }

        abilityItem.innerHTML = abilityContent;

        // Create cooldown button
        if (ability.cooldown !== undefined && ability.cooldown !== null) {
            const cooldownButton = document.createElement('button');
            cooldownButton.className = abilityState.currentCooldown === 0 ? 'cooldown-button available' : 'cooldown-button unavailable';
            cooldownButton.textContent = abilityState.currentCooldown === 0 ? t('available') : (abilityState.currentCooldown === 'unavailable' ? t('unavailable') : abilityState.currentCooldown);
            cooldownButton.disabled = abilityState.currentCooldown !== 0;
            cooldownButton.onclick = () => useAbility(cooldownButton, characterName, ability);

            abilityItem.querySelector('.ability-stat.btn-here').appendChild(cooldownButton);
        }

        abilitiesList.appendChild(abilityItem);
    });

    await updateServerAbilitiesStates(abilitiesStates);

    panel.appendChild(abilitiesList);
    return panel;
}

function calculateaAbilitySuccessRate(characterDiv, abilityRoll, abilityDifficulty) {
    const statValue = parseInt(characterDiv.querySelector(`.stat-value.${abilityRoll}`).value) || 0;
    const modValue = parseInt(characterDiv.querySelector(`.mod-value.${abilityRoll}`).value) || 0;

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
    const characterDiv = document.querySelector(`.character input[value="${characterName}"]`).closest('.character');

    if (abilityState.currentCooldown !== 0) return;

    let success = true; // abilities without info on what to roll are treated as always successful

    if (ability.roll) { // roll, if the ability has one
        const diceElement = characterDiv.querySelector('.dice');

        const result = rollDice(diceElement, ability.roll, ability.difficulty);
        success = ability.difficulty === "X" ? true 
                                             : result >= ability.difficulty ? true 
                                             : false;
    }

    if (success) {
        if (abilityState.singleUse) {
            // Permanent block, if the ability is single-use and succeeds
            button.disabled = true;
            button.classList.remove('available');
            button.classList.add('unavailable');
            button.textContent = t('unavailable');
            abilityState.currentCooldown = 'unavailable';
            if (ability.condition && ability.conditionDuration) {
                sendCondition(characterName, ability.condition, ability.conditionDuration, characterDiv);
            }
        } else { // if it isn't, it gets normal cd
            if (ability.condition && ability.conditionDuration) {
                sendCondition(characterName, ability.condition, ability.conditionDuration, characterDiv);
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
    const characterDiv = diceElement.closest('.character');
    const statInput = characterDiv.querySelector(`.stat-value.${diceType}`);
    const modInput = characterDiv.querySelector(`.mod-value.${diceType}`);
    const bigDice = characterDiv.querySelector('.big-dice');

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
        const intuitionInput = characterDiv.querySelector('.stat-value.intuition');
        const intuitionValue = parseInt(intuitionInput.value) || 0;
        if (intuitionValue >= 10) {
            const intuitionBonus = Math.floor((intuitionValue - 10) / 4);
            result += intuitionBonus;
        }
    }

    // Color the result based on difficulty
    if (difficulty && difficulty !== "X") {
        difficulty = parseInt(difficulty);
        bigDice.style.color = result >= difficulty ? 'green' : 'red';
    } else {
        bigDice.style.color = 'gray';
    }

    bigDice.textContent = `🎲 ${result}`;

    playSoundEffect('sound/diceroll.mp3');

    return result; 
}

function setAbilityCooldown(button, cooldown, abilityState) {
    abilityState.currentCooldown = cooldown;
    button.disabled = true;
    button.classList.remove('available');
    button.classList.add('unavailable');
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
 * Example Output: "Grants <strong class="stat-bonus">+2 siły</strong> and <strong class="stat-bonus">-1 zwinności mod</strong>."
 */
function parseStatTags(description) {
    return description.replace(/\[([+-]?\d+(?:\.\d+)?)\s+([a-zA-Z0-9_]+)(?:\s+(mod))?\]/gi, (match, value, stat, isMod) => {
        const statTranslated = t('desc_' + stat.toLowerCase());
        const modText = isMod ? ` ${t('desc_mod')}` : '';
        const numVal = parseFloat(value);
        const prefix = numVal > 0 ? '+' : '';
        return `<strong class="stat-bonus">${prefix}${numVal} ${statTranslated}${modText}</strong>`;
    });
}


// MATH & TRANSLATION CORE (Used by both Gear and Abilities)

/**
 * Extracts the final numerical result of a gear stat, whether it's flat or a formula.
 * Example Input 1: 15 (Number) -> Returns: 15
 * Example Input 2: "[-10 + 0.5 * vitality]" (String) -> Returns: 5 (Number), assuming vitality is 30
 */
 function getFormulaValue(statValue, characterDiv) {
    if (typeof statValue === "number") return statValue;
    
    if (typeof statValue === "string" && statValue.includes('[')) {
        const formula = statValue.replace(/[\[\]]/g, '');
        const evaluatedFormula = formula.replace(/\b([a-zA-Z_]\w*)\b/g, (stat) => getStatValue(characterDiv, stat));
        
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
    
    // Ignore formulas that are just plain numbers wrapped in brackets (e.g., "[15]")
    if (/^\d+(\.\d+)?$/.test(formula.replace(/\s+/g, ''))) return "";
    
    return displayFormula;
}


// ABILITY SPECIFIC PARSERS (Used only for Ability Descriptions)

/**
 * Handles dynamic range calculations specifically for ability rolls and penetration.
 * Example Input (X * roll): "2 * roll" -> Returns: "4 - 24" (String range)
 * Example Input (X * over): "3 * over" -> Returns: "3 - 15" (String range)
 */
function evaluateDynamicAbilityRoll(formula, characterDiv, rollAbility, rollDifficulty) {
    if (!rollAbility) return "0";

    const statValue = getStatValue(characterDiv, rollAbility);
    const modValue = getModValue(characterDiv, rollAbility);

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
function parseFormulaTags(description, characterDiv, rollAbility, rollDifficulty) {
    return description.replace(/\[(.*?)\]/g, (match, formula) => {
        try {
            // Forward ability-specific keywords (roll/over) to the dynamic handler
            if (/roll|over/i.test(formula)) {
                const result = evaluateDynamicAbilityRoll(formula, characterDiv, rollAbility, rollDifficulty);
                return `<strong class="calculated-value">${result}</strong>`;
            }

            // Route standard math to the universal math handler
            const result = calculateMathFormula(formula, characterDiv);
            const displayFormula = translateFormulaText(formula);
            
            // Only append the formula breakdown if it's not a raw number
            let displayHtml = '';
            if (displayFormula.replace(/\s+/g, '') !== result.toString()) {
                displayHtml = ` <span class="formula-display">(${displayFormula})</span>`;
            }

            return `<strong class="copyable-value" onclick="copyToClipboard(${result})">${result}</strong>${displayHtml}`;
        } catch (e) {
            console.error(`Cannot calculate formula: ${formula}`, e);
            return match; 
        }
    });
}


// MASTER TEXT WRAPPER

/**
 * Master wrapper used strictly for formatting text blocks (e.g., item or ability descriptions).
 * Sequentially applies property highlights, stat highlights, and formula calculations.
 */
function parseDescription(description, characterDiv, rollAbility = null, rollDifficulty = null) {
    if (typeof description === "number") return description;

    let processedDescription = parsePropertyTags(String(description));
    processedDescription = parseStatTags(processedDescription);
    processedDescription = parseFormulaTags(processedDescription, characterDiv, rollAbility, rollDifficulty);

    return processedDescription;
}

// Retrieves only the value of the statistic itself, without counting the additional bonus. Roll bonuses shouldn't affect ability damage in the [number * stat] convention
function getStatValue(characterDiv, stat) {
    const statInput = characterDiv.querySelector(`.stat-value.${stat}`);
    return statInput ? parseInt(statInput.value) || 0 : 0; 
}

// Retrieves the value of the stat bonus. Useful when calculating things dependent on the height of the roll or penetration points
function getModValue(characterDiv, stat) {
    const modInput = characterDiv.querySelector(`.mod-value.${stat}`);
    return modInput ? parseInt(modInput.value) || 0 : 0; 
}

function showEquipmentPanel(button) {
    const characterDiv = button.closest('.character');
    let panel = characterDiv.querySelector('.equipment-panel');
    let overlay = document.querySelector('.overlay');
    
    // If the panel is being removed, do nothing
    if (isRemoving) {
        return;
    }
    
    // First hide the active panel (if it exists)
    hideActivePanel();
    
    // If the panel doesn't exist for this character, create it
    if (!panel) {
        let name = characterDiv.querySelector('input[type="text"]').value;
        name = removeUniqueNameNumber(name); // thanks to this, if characters repeat, e.g., there are two of the same goblins, each of them has the same equipment
        const equipment = (players[name]?.equipment || adventurers[name]?.equipment || monsters[name]?.equipment || bosses[name]?.equipment || []);
        
        panel = createEquipmentPanel(equipment, characterDiv);
        characterDiv.appendChild(panel);
        
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.className = 'overlay';
            document.body.appendChild(overlay);
        }
        
        overlay.addEventListener('click', hideActivePanel);
        
        // Give time to render the panel before adding the active class
        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                if (panel && panel.parentNode) {
                    characterDiv.style.zIndex = '1002';
                    panel.classList.add('active');
                    overlay.classList.add('active');
                    activePanel = panel;
                    activeOverlay = overlay;
                }
            });
        });
    }
}

function createEquipmentPanel(equipment = [], characterDiv) {
    const panel = document.createElement('div');
    panel.className = 'equipment-panel';
    
    const equipmentList = document.createElement('div');
    equipmentList.className = 'equipment-list';
    
    // Group items into gear and others
    const gear = equipment.filter(item => item.type === 'gear');
    const other = equipment.filter(item => item.type !== 'gear');
    
    // Add gear section if it exists
    if (gear.length > 0) {
        const gearSection = document.createElement('div');
        gearSection.className = 'equipment-section';
        gearSection.innerHTML = `<h3>${t('gear')}</h3>`;
        
        gear.forEach(item => {
            const itemElement = document.createElement('div');
            itemElement.className = 'equipment-item gear-item';
            let html = '';
            
            html += `<div class="item-name">${item.name}</div>`;
            
            if (item.description) {
                html += `<div class="item-description">${parseDescription(item.description, characterDiv)}</div>`;
            }

            html += `<div class="gear-stats">`;
            
            if (item.damage !== undefined) {
                const val = getFormulaValue(item.damage, characterDiv);
                const breakdown = getFormulaBreakdown(item.damage);
                html += `<div class="gear-stat">${t('damage')}: <strong class="copyable-value" onclick="copyToClipboard(${val})">${val}</strong>${breakdown ? ` <span class="formula-display">(${breakdown})</span>` : ''}</div>`;
            }
            
            if (item.physArmor !== undefined) {
                const val = getFormulaValue(item.physArmor, characterDiv);
                const breakdown = getFormulaBreakdown(item.physArmor);
                html += `<div class="gear-stat">${t('phys_armor')}: <strong class="copyable-value" onclick="copyToClipboard(${val})">${val}</strong>${breakdown ? ` <span class="formula-display">(${breakdown})</span>` : ''}</div>`;
            }
            
            if (item.physArmorPerc !== undefined) {
                const val = getFormulaValue(item.physArmorPerc, characterDiv);
                const breakdown = getFormulaBreakdown(item.physArmorPerc);
                html += `<div class="gear-stat">${t('phys_armor')} %: <strong class="copyable-value" onclick="copyToClipboard(${val})">${val}</strong>%${breakdown ? ` <span class="formula-display">(${breakdown})</span>` : ''}</div>`;
            }
            
            if (item.magArmor !== undefined) {
                const val = getFormulaValue(item.magArmor, characterDiv);
                const breakdown = getFormulaBreakdown(item.magArmor);
                html += `<div class="gear-stat">${t('mag_armor')}: <strong class="copyable-value" onclick="copyToClipboard(${val})">${val}</strong>${breakdown ? ` <span class="formula-display">(${breakdown})</span>` : ''}</div>`;
            }
            
            if (item.magArmorPerc !== undefined) {
                const val = getFormulaValue(item.magArmorPerc, characterDiv);
                const breakdown = getFormulaBreakdown(item.magArmorPerc);
                html += `<div class="gear-stat">${t('mag_armor')} %: <strong class="copyable-value" onclick="copyToClipboard(${val})">${val}</strong>%${breakdown ? ` <span class="formula-display">(${breakdown})</span>` : ''}</div>`;
            }
            
            if (item.value !== undefined) {
                html += `<div class="gear-stat">${t('value')}: ${item.value}S</div>`;
            }

            html += "</div>";

            itemElement.innerHTML = html;
            gearSection.appendChild(itemElement);
        });
        
        equipmentList.appendChild(gearSection);
    }
    
    // Add other items section if they exist
    if (other.length > 0) {
        const otherSection = document.createElement('div');
        otherSection.className = 'equipment-section';
        otherSection.innerHTML = `<h3>${t('other_items')}</h3>`;
        
        other.forEach(item => {
            const itemElement = document.createElement('div');
            itemElement.className = 'equipment-item other-item';
            itemElement.innerHTML = `
                <div class="item-name">${item.name}</div>
                <div class="item-description">${parseDescription(item.description, characterDiv)}</div>
                <div class="item-quantity">
                    <span>${t('quantity')}</span>
                    <input type="number" class="quantity-input" value="${item.quantity || 0}" min="0">
                </div>
                <div class="gear-stats">
                    <div class="gear-stat">${t('value')}: ${item.value}</div>
                </div>
            `;
            otherSection.appendChild(itemElement);
        });
        
        equipmentList.appendChild(otherSection);
    }
    
    panel.appendChild(equipmentList);
    return panel;
}

function hideActivePanel() {
    if (activePanel && !isRemoving) {
        const characterDiv = activePanel.closest('.character');
        if (characterDiv) {
            characterDiv.style.zIndex = '';
        }
        
        isRemoving = true;
        
        const panelToRemove = activePanel;
        const overlayToHandle = activeOverlay;
        
        panelToRemove.classList.add('removing');
        if (overlayToHandle) {
            overlayToHandle.classList.remove('active');
        }
        
        setTimeout(() => {
            if (panelToRemove && panelToRemove.parentNode) {
                panelToRemove.classList.remove('active', 'removing');
                panelToRemove.remove();
            }
            
            if (activePanel === panelToRemove) {
                activePanel = null;
                activeOverlay = null;
            }
            isRemoving = false;
        }, 500);
    }
}