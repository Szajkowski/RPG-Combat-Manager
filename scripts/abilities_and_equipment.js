async function showAbilitiesPanel(button) {
    const characterDiv = button.closest('.character');
    let name = characterDiv.querySelector('input[type="text"]').value;
    name = removeUniqueNameNumber(name); // dzieki temu jesli powtarzaja sie postacie, np sa dwa takie same gobliny castery, to kazdy z nich ma te same spelle, za to ich cd sa inne!

    const attunementInput = characterDiv.querySelector('.stat-value.attunement');
    let attunement = 1000; // jesli nie ma statu dostrojenie mozna miec tyle umiejetnosci ile sie chce.
    if (attunementInput) attunement = parseInt(attunementInput.value);

    const stats = (players[name] || adventurers[name] || monsters[name] || bosses[name] || {});

    // Oblicz maksymalną liczbę umiejętności
    let maxAbilities = 3;  // Podstawowe 3 umiejętności
    if (attunement > 10) {
        maxAbilities += Math.floor((attunement - 10) / 2);
    }
    const abilities = stats.abilities?.slice(0, maxAbilities) || [];
    
    let panel = characterDiv.querySelector('.abilities-panel');
    let overlay = document.querySelector('.overlay');

    if (isRemoving) return; // jesli jakis panel jest aktualnie chowany, daj mu sie schowac

    hideActivePanel(); // schowaj jakikolwiek otwarty panel

    if (panel) return; // jesli jakis panel jest nieschowany, wroc. W ten sposob klikniecie przycisku jeszcze raz, 
                       // kiedy jest otwarty panel z umiejetnosciami go chowa, zamiast wysuwac jeszcze raz

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

        // Inicjalizacja stanu w abilitiesStates
        if (!abilitiesStates[characterName][abilityName]) {
            const isSingleUse = ability.cooldown === "raz";
            const maxCooldown = isSingleUse ? Infinity : (!ability.cooldown && ability.cooldown !== 0 ? 0 : parseInt(ability.cooldown) + 1);
            
            abilitiesStates[characterName][abilityName] = {
                currentCooldown: 0, // Domyślnie dostępne
                maxCooldown: maxCooldown,
                singleUse: isSingleUse // Czy można użyć tylko raz na walkę
            };
        }

        const abilityState = abilitiesStates[characterName][abilityName];

        const abilityItem = document.createElement('li');
        abilityItem.className = 'ability-item';

        // Budowanie zawartości umiejętności
        let abilityContent = `
            <div class="ability-name">${abilityName}</div>
            <div class="ability-description">${parseDescription(ability.description || "", characterDiv, ability.roll, ability.difficulty)}</div>
        `;

        // Opcjonalne atrybuty
        if (ability.roll) {
            const rollName = translateRollName(ability.roll); // Funkcja tłumacząca
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

        // Tworzenie przycisku cooldown
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
        return 0; // Brak statystyki
    }

    const successThreshold = abilityDifficulty - modValue;

    if (successThreshold <= 1) {
        return 100; // Automatyczny sukces
    }

    if (successThreshold > statValue) {
        return 0; // Automatyczna porażka
    }

    const successRolls = statValue - successThreshold + 1;
    return Math.floor((successRolls / statValue) * 100);
}

async function useAbility(button, characterName, ability) {
    const abilitiesStates = await loadServerAbilitiesStates();

    const abilityState = abilitiesStates[characterName][ability.name];
    const characterDiv = document.querySelector(`.character input[value="${characterName}"]`).closest('.character');

    if (abilityState.currentCooldown !== 0) return;

    let success = true; // umiejetnosci bez informacji na co to rzut sa traktowane jako zawsze zakonczone sukcesem

    if (ability.roll) { // rzut, jesli umiejetnosci takowy posiada
        const diceElement = characterDiv.querySelector('.dice');

        const result = rollDice(diceElement, ability.roll, ability.difficulty);
        success = ability.difficulty === "X" ? true 
                                             : result >= ability.difficulty ? true 
                                             : false;
    }

    if (success) {
        if (abilityState.singleUse) {
            // Trwałe zablokowanie, jesli umiejetnosc jest jednorazowa i sie uda
            button.disabled = true;
            button.classList.remove('available');
            button.classList.add('unavailable');
            button.textContent = 'Niedostępne';
            abilityState.currentCooldown = 'Niedostępne';
            if (ability.condition && ability.conditionDuration) {
                sendCondition(characterName, ability.condition, ability.conditionDuration, characterDiv);
            }
        } else { // jesli nie jest to dostaje normalny cd
            if (ability.condition && ability.conditionDuration) {
                sendCondition(characterName, ability.condition, ability.conditionDuration, characterDiv);
            }
            setAbilityCooldown(button, abilityState.maxCooldown, abilityState);
        }
    } else {
        if (abilityState.singleUse && abilityState.currentCooldown !== 'Niedostępne') {
            // Nieudany rzut dla umiejętności jednorazowej dostaje zawsze jedna ture cd. Wpisane jest dwa bo te cd sa jakby +1 zawsze, zeby wlasnie przeczekac nast ture, 
            // zamiast tego, ze umiejetnosc bedzie od razu znowu dostepna
            setAbilityCooldown(button, 2, abilityState);
        } else if (!abilityState.singleUse) {
            // Nieudany rzut dla zwykłych umiejętności
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

    // Bonus intuicji dla Zwinności i Celności
    if (diceType === 'agility' || diceType === 'accuracy') {
        const intuitionInput = characterDiv.querySelector('.stat-value.intuition');
        const intuitionValue = parseInt(intuitionInput.value) || 0;
        if (intuitionValue >= 10) {
            const intuitionBonus = Math.floor((intuitionValue - 10) / 4);
            result += intuitionBonus;
        }
    }

    // Kolorowanie wyniku na podstawie trudności
    if (difficulty && difficulty !== "X") {
        difficulty = parseInt(difficulty);
        bigDice.style.color = result >= difficulty ? 'green' : 'red';
    } else {
        bigDice.style.color = 'gray';
    }

    bigDice.textContent = `🎲 ${result}`;

    // Odtwarzanie dźwięku
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

    // Podświetl właściwości specjalne
    const highlightedDescription = description.replace(/(Nieunikalne\.|Penetrujące\.)/g, 
        `<span class="highlighted-property">$1</span>`
    );

    // Parsowanie formuł
    return highlightedDescription.replace(/\[(.*?)\]/g, (match, formula) => {
        try {
            let result;

            // Obsługa rzutu (roll)
            if (/^\s*(\d+)\s*\*\s*roll\s*$/i.test(formula) && rollAbility) {
                const multiplier = parseInt(formula.match(/^\s*(\d+)/)[1]);
                const statValue = getStatValue(characterDiv, rollAbility);
                const modValue = getModValue(characterDiv, rollAbility);

                if (rollDifficulty > statValue + modValue) return `<strong class="calculated-value">0</strong>`;

                // Brak lub "X" dla trudności
                if (!rollDifficulty || rollDifficulty === "X") {
                    result = `${multiplier * (1 + modValue)} - ${multiplier * (statValue + modValue)}`;
                } else {
                    result = `${rollDifficulty > modValue ? multiplier * rollDifficulty : multiplier * (1 + modValue)} - ${multiplier * (statValue + modValue)}`;
                }
                return `<strong class="calculated-value">${result}</strong>`;
            }

            // Obsługa przebicia (over)
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

            // Obsługa potęgi (X ^ over)
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

            // Obsługa standardowej formuły
            const evaluatedFormula = formula.replace(/\b([a-zA-Z_]\w*)\b/g, (stat) => {
                return getStatValue(characterDiv, stat);
            });

            result = Math.ceil(eval(evaluatedFormula));
            return `<strong class="copyable-value" onclick="copyToClipboard(${result})">${result}</strong>`;
        } catch (e) {
            console.error(`Nie można obliczyć formuły: ${formula}`, e);
            return match; // Zwróć oryginalny tekst w razie błędu
        }
    });
}

// pobiera wartosc tylko samej statystyki, nie licząc dodatkowo bonusu. Bonusy do rzutu nie mają wpływać na obrażenia umiejętności w konwencji [liczba * stat]
function getStatValue(characterDiv, stat) {
    const statInput = characterDiv.querySelector(`.stat-value.${stat}`);
    return statInput ? parseInt(statInput.value) || 0 : 0; 
}

// pobiera wartosc bonusu do statystyki. Przydatne przy liczeniu rzeczy zaleznych od wysokosci rzutu lub punktow przebicia
function getModValue(characterDiv, stat) {
    const modInput = characterDiv.querySelector(`.mod-value.${stat}`);
    return modInput ? parseInt(modInput.value) || 0 : 0; 
}

function showEquipmentPanel(button) {
    const characterDiv = button.closest('.character');
    let panel = characterDiv.querySelector('.equipment-panel');
    let overlay = document.querySelector('.overlay');
    
    // Jeśli panel jest w trakcie usuwania, nie rób nic
    if (isRemoving) {
        return;
    }
    
    // Najpierw ukryj aktywny panel (jeśli istnieje)
    hideActivePanel();
    
    // Jeśli panel nie istnieje dla tej postaci, stwórz go
    if (!panel) {
        let name = characterDiv.querySelector('input[type="text"]').value;
        name = removeUniqueNameNumber(name); // dzieki temu jesli powtarzaja sie postacie, np sa dwa takie same gobliny, to kazdy z nich ma ten sam ekwipunek
        const equipment = (players[name]?.equipment || adventurers[name]?.equipment || monsters[name]?.equipment || bosses[name]?.equipment || []);
        
        panel = createEquipmentPanel(equipment, characterDiv);
        characterDiv.appendChild(panel);
        
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.className = 'overlay';
            document.body.appendChild(overlay);
        }
        
        overlay.addEventListener('click', hideActivePanel);
        
        // Daj czas na renderowanie panelu przed dodaniem klasy active
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
    
    // Grupujemy przedmioty na zbroje i inne
    const gear = equipment.filter(item => item.type === 'gear');
    const other = equipment.filter(item => item.type !== 'gear');
    
    // Dodajemy sekcję zbroi jeśli istnieje
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
    
    // Dodajemy sekcję innych przedmiotów jeśli istnieją
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

