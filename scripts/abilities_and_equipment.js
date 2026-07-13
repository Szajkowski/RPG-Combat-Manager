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
            const isSingleUse = ability.cooldown === "raz";
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
            const rollName = translateRollName(ability.roll); // Translation function
            abilityContent += `<div class="ability-stat">Rzut: ${rollName}</div>`;
        }
        if (ability.difficulty) {
            abilityContent += `<div class="ability-stat">Trudność: ${ability.difficulty}</div>`;
        }
        if (ability.cooldown !== undefined && ability.cooldown !== null) {
            abilityContent += `<div class="ability-stat btn-here">Czas oczekiwania: ${ability.cooldown}</div>`;
        }
        if (ability.difficulty && ability.difficulty !== "X") {
            abilityContent += `<div class="ability-stat">Szansa na powodzenie: <span class="highlighted-property">${calculateaAbilitySuccessRate(characterDiv, ability.roll, ability.difficulty)}%</span></div>`;
        }

        abilityItem.innerHTML = abilityContent;

        // Create cooldown button
        if (ability.cooldown !== undefined && ability.cooldown !== null) {
            const cooldownButton = document.createElement('button');
            cooldownButton.className = abilityState.currentCooldown === 0 ? 'cooldown-button available' : 'cooldown-button unavailable';
            cooldownButton.textContent = abilityState.currentCooldown === 0 ? 'Dostępne' : abilityState.currentCooldown;
            cooldownButton.disabled = abilityState.currentCooldown > 0;
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
            button.textContent = 'Niedostępne';
            abilityState.currentCooldown = 'Niedostępne';
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
        if (abilityState.singleUse && abilityState.currentCooldown !== 'Niedostępne') {
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
        alert("Brak wymaganych pól statystyki!");
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

    // Play sound
    diceAudio.currentTime = 0;
    diceAudio.volume = 0.5;
    diceAudio.play();

    return result; 
}

function setAbilityCooldown(button, cooldown, abilityState) {
    abilityState.currentCooldown = cooldown;
    button.disabled = true;
    button.classList.remove('available');
    button.classList.add('unavailable');
    button.textContent = cooldown;
}

function parseDescription(description, characterDiv, rollAbility = null, rollDifficulty = null) {
    if (typeof description === "number") return description;

    // Highlight special properties
    const highlightedDescription = description.replace(/(Nieunikalne\.|Penetrujące\.)/g, 
        `<span class="highlighted-property">$1</span>`
    );

    // Parse formulas
    return highlightedDescription.replace(/\[(.*?)\]/g, (match, formula) => {
        try {
            let result;

            // Handle roll
            if (/^\s*(\d+)\s*\*\s*roll\s*$/i.test(formula) && rollAbility) {
                const multiplier = parseInt(formula.match(/^\s*(\d+)/)[1]);
                const statValue = getStatValue(characterDiv, rollAbility);
                const modValue = getModValue(characterDiv, rollAbility);

                if (rollDifficulty > statValue + modValue) return `<strong class="calculated-value">0</strong>`;

                // Missing or "X" for difficulty
                if (!rollDifficulty || rollDifficulty === "X") {
                    result = `${multiplier * (1 + modValue)} - ${multiplier * (statValue + modValue)}`;
                } else {
                    result = `${rollDifficulty > modValue ? multiplier * rollDifficulty : multiplier * (1 + modValue)} - ${multiplier * (statValue + modValue)}`;
                }
                return `<strong class="calculated-value">${result}</strong>`;
            }

            // Handle penetration (over)
            if (/^\s*(\d+)\s*\*\s*over\s*$/i.test(formula) && rollAbility && rollDifficulty) {
                const multiplier = parseInt(formula.match(/^\s*(\d+)/)[1]);
                const statValue = getStatValue(characterDiv, rollAbility);
                const modValue = getModValue(characterDiv, rollAbility);

                if (rollDifficulty >= (statValue + modValue) || rollDifficulty === "X") return `<strong class="calculated-value">0</strong>`;

                const maxOverPoints = statValue + modValue - rollDifficulty;
                const minOverPoints = modValue > rollDifficulty ? modValue - rollDifficulty : 1;
                result = `${multiplier * minOverPoints} - ${multiplier * maxOverPoints}`;
                return `<strong class="calculated-value">${result}</strong>`;
            }

            // Handle power (X ^ over)
            if (/^\s*(\d+)\s*\^\s*over\s*$/i.test(formula) && rollAbility && rollDifficulty && rollDifficulty !== "X") {
                const baseValue = parseInt(formula.match(/^\s*(\d+)/)[1]);
                const statValue = getStatValue(characterDiv, rollAbility);
                const modValue = getModValue(characterDiv, rollAbility);

                if (rollDifficulty >= (statValue + modValue) || rollDifficulty === "X") return `<strong class="calculated-value">0</strong>`;

                const maxOverPoints = statValue + modValue - rollDifficulty;
                const minOverPoints = modValue > rollDifficulty ? modValue - rollDifficulty : 1;
                result = `${Math.pow(baseValue, minOverPoints)} - ${Math.pow(baseValue, maxOverPoints)}`;
                return `<strong class="calculated-value">${result}</strong>`;
            }

            // Handle standard formula
            const evaluatedFormula = formula.replace(/\b([a-zA-Z_]\w*)\b/g, (stat) => {
                return getStatValue(characterDiv, stat);
            });

            result = Math.ceil(eval(evaluatedFormula));
            return `<strong class="copyable-value" onclick="copyToClipboard(${result})">${result}</strong>`;
        } catch (e) {
            console.error(`Cannot calculate formula: ${formula}`, e);
            return match; // Return original text in case of error
        }
    });
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
        gearSection.innerHTML = '<h3>Oporządzenie</h3>';
        
        gear.forEach(item => {
            const itemElement = document.createElement('div');
            itemElement.className = 'equipment-item gear-item';
            isWeapon = 'damage' in item;
            html = ''
            html += `<div class="item-name">${item.name}</div>`;
            if (item.description)
                html += `<div class="item-description">${item.description}</div>`;

            html += `<div class="gear-stats">`;
            
            if (item.damage)
                html += `<div class="gear-stat">Obrażenia: ${parseDescription(item.damage || "", characterDiv)}</div>`;
            if (item.physArmor)
                html += `<div class="gear-stat">Pancerz fizyczny: ${parseDescription(item.physArmor || "", characterDiv)}</div>`;
            if (item.magArmor)
                html += `<div class="gear-stat">Pancerz magiczny: ${parseDescription(item.magArmor || "", characterDiv)}</div>`;
            if (item.value)
                html += `<div class="gear-stat">Wartość: ${item.value}S</div>`;

            html += "</div>"

            itemElement.innerHTML = html;
            gearSection.appendChild(itemElement);
        });
        
        equipmentList.appendChild(gearSection);
    }
    
    // Add other items section if they exist
    if (other.length > 0) {
        const otherSection = document.createElement('div');
        otherSection.className = 'equipment-section';
        otherSection.innerHTML = '<h3>Inne przedmioty</h3>';
        
        other.forEach(item => {
            const itemElement = document.createElement('div');
            itemElement.className = 'equipment-item other-item';
            itemElement.innerHTML = `
                <div class="item-name">${item.name}</div>
                <div class="item-description">${item.description}</div>
                <div class="item-quantity">
                    <span>Ilość:</span>
                    <input type="number" class="quantity-input" value="${item.quantity || 0}" min="0">
                </div>
                <div class="gear-stats">
                    <div class="gear-stat">Wartość: ${item.value}</div>
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