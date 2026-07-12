async function newRound() {
    currentCombatRound += 1;
    currentRowIndex = 0;
    await setTurnOrder();
    await requestUpdateCurrentCombatRound();
    await reduceAbilityCDs();
}

async function reduceAbilityCDs() {
    const abilitiesStates = await loadServerAbilitiesStates();

    Object.keys(abilitiesStates).forEach(characterName => {
        Object.keys(abilitiesStates[characterName]).forEach(abilityName => {
            const abilityState = abilitiesStates[characterName][abilityName];

            if (abilityState.currentCooldown === 0 || abilityState.currentCooldown === 'Niedostępne') {
                return; // Pomijamy gotowe lub zablokowane
            }

            abilityState.currentCooldown -= 1; // Zmniejsz cooldown
        });
    });
    await updateServerAbilitiesStates(abilitiesStates);
    await requestUpdateActivePanel(); // to musi byc na koncu
}

async function getCharactersInTeam(teamId) {
    const teamDiv = document.getElementById(teamId);
    // Filtruj tylko żywe postacie
    const aliveCharacters = Array.from(teamDiv.getElementsByClassName('character'))
        .filter(characterDiv => characterDiv.dataset.isDead !== "true");

    return aliveCharacters.flatMap(characterDiv => {
        const name = characterDiv.querySelector('input[type="text"]').value || 'Nieznana postać';
        const reflexInput = characterDiv.querySelector('.stat-value.reflex');
        const reflex = reflexInput ? parseInt(reflexInput.value) || 0 : 0;

        // Sprawdź, czy postać ma "Dodatkową akcję"
        const abilities = (bosses[name]?.abilities || monsters[name]?.abilities || adventurers[name]?.abilities || []);
        const hasExtraAction = abilities.some(ability => ability.name === "Dodatkowa akcja");

        // Jeśli ma "Dodatkową akcję", dodaj dwa wpisy: z pełnym i połową refleksu
        if (hasExtraAction) {
            return [
                { name, reflex, team: teamId },
                { name, reflex: Math.floor(reflex / 2), team: teamId }
            ];
        }

        // W przeciwnym razie dodaj tylko jeden wpis
        return { name, reflex, team: teamId };
    });
}

async function setTurnOrder() {
    const enemies = await getCharactersInTeam('enemyTeam');
    const heroes = await getCharactersInTeam('heroTeam');
    const allCharacters = [...enemies, ...heroes];

    allCharacters.sort((a, b) => {
        if (a.reflex !== b.reflex) {
            return b.reflex - a.reflex;
        }
        if (a.team === 'heroTeam' && b.team === 'enemyTeam') {
            return -1;
        }
        if (a.team === 'enemyTeam' && b.team === 'heroTeam') {
            return 1;
        }
        return 0;
    });

    const groupedCharacters = [];
    allCharacters.forEach(char => {
        const lastGroup = groupedCharacters[groupedCharacters.length - 1];
        if (lastGroup && lastGroup.reflex === char.reflex && lastGroup.team === char.team) {
            lastGroup.characters.push(char.name);
        } else {
            groupedCharacters.push({
                reflex: char.reflex,
                team: char.team,
                characters: [char.name]
            });
        }
    });

    // Wyswietl na sidebarze
    const sidebar = document.getElementById('Sidebar');
    const sidebarTitle = sidebar.querySelector('.sidebar-title');
    const sidebarContent = sidebar.querySelector('.sidebar-content');
    const sidebarConditions = sidebar.querySelector('.sidebar-conditions');
    sidebarConditions.style.display = 'flex';

    sidebarTitle.textContent = `Kolejność ruchów: [tura ${currentCombatRound}]`

    sidebarContent.innerHTML = `
        <ol id="turnOrder">
            ${groupedCharacters.map((group, index) => `
                <li class="${index === currentRowIndex ? 'active-row' : ''}">
                    ${group.characters.join(', ')} (${group.reflex})
                </li>
            `).join('')}
        </ol>
    `;

    const activeConditions = await loadServerActiveConditions();
    // Upewnij się, że pasek jest widoczny
    sidebar.classList.remove('hidden');
    await renderConditionsSidebar(activeConditions);
    markExpiredConditions(activeConditions); // tutaj tez to trzeba zrobic, bo inaczej wykrzykniki znikna w nowej turze
}

async function renderConditionsSidebar(activeConditions) {
    const sidebarConditions = document.querySelector('.sidebar-conditions');
    
    sidebarConditions.innerHTML = `<h3>Stany</h3>`;
    activeConditions.forEach(condition => addConditionToSidebar(condition));
    await markConditionTargets();
}

function addConditionToSidebar(condition) {
    const conditionsDiv = document.querySelector('.sidebar-conditions');

    const conditionItem = document.createElement('div');
    conditionItem.className = 'condition-item';
    conditionItem.dataset.id = condition.id;

    conditionItem.innerHTML = `
        <div class="condition-top-row">
            <input type="text" class="condition-target" onclick="pasteClipboardToInput(this, event)" oninput="updateConditionTarget(this)" value="${condition.target}" />
            <span class="condition-duration">${condition.duration}</span>
            <button class="copy-condition">Kopiuj</button>
            <button class="remove-condition">X</button>
        </div>
        <div class="condition-bottom-row">
            <span class="condition-description">${condition.description}</span>
        </div>
    `;

    conditionsDiv.appendChild(conditionItem);

    const removeButton = conditionItem.querySelector('.remove-condition');
    // Obsługa przycisku "Usuń"
    removeButton.onclick = () => {
        conditionsDiv.removeChild(conditionItem); // usuniecie z oczu
        removeCondition(condition.id); // usuniecie z serca
    };

    // Obsługa przycisku "Kopiuj"
    const copyButton = conditionItem.querySelector('.copy-condition');
    copyButton.onclick = () => {
        copyCondition(condition);
    };
}

async function markConditionTargets() {
    const activeConditions = await loadServerActiveConditions();

    // Przeszukaj wszystkie characterDiv
    const characterInputs = document.querySelectorAll('.character input[type="text"]');

    characterInputs.forEach(charInput => {
        const characterName = charInput.value.trim();

        // Znajdź lub utwórz wykrzyknik
        let exclamationMark = charInput.parentElement.querySelector('.exclamation-mark');

        // Sprawdź, czy istnieje condition powiązany z daną postacią
        const hasConditions = activeConditions.some(condition => condition.target === characterName);

        if (hasConditions) {
            if (!exclamationMark) {
                exclamationMark = document.createElement('span');
                exclamationMark.className = 'exclamation-mark';
                exclamationMark.textContent = '❗';
                charInput.parentElement.appendChild(exclamationMark);
            }
        } else if (exclamationMark) {
            exclamationMark.remove(); // Usuń wykrzyknik, jeśli nie ma warunków
        }
    });
}

async function updateConditionTarget(input) {
    const newTarget = input.value.trim();
    const conditionId = input.closest('.condition-item').dataset.id;

    // Pobierz aktualne stany z serwera
    let activeConditions = await loadServerActiveConditions();

    // Znajdź condition do aktualizacji
    const conditionIndex = activeConditions.findIndex(condition => condition.id === conditionId);

    if (conditionIndex !== -1) {
        // Zaktualizuj cel condition
        activeConditions[conditionIndex].target = newTarget;
        await updateServerConditions(activeConditions); // Aktualizacja na serwerze
    }
    await markConditionTargets(); // oznacz cele przy zmianie celu
}

async function removeCondition(conditionID) {
    let activeConditions = await loadServerActiveConditions();
    activeConditions = activeConditions.filter(condition => condition.id !== conditionID);
    await updateServerConditions(activeConditions);
    await markConditionTargets(); // oznacz cele przy usunieciu condition
}

function copyCondition(condition) {
    // Utwórz nowy obiekt stanu z nowym ID
    const copiedCondition = {
        ...condition,
        id: `condition-${Date.now()}-${Math.random().toString(16).slice(2)}`
    };

    // Wyślij nowy stan do serwera
    socket.send(JSON.stringify({
        type: "REQUESTaddCondition",
        condition: copiedCondition
    }));

    // Ręcznie dodaj nowy stan do sidebara (szybka aktualizacja)
    addConditionToSidebar(copiedCondition);
}

async function moveToNextTurn() {
    const turnOrder = document.getElementById('turnOrder');
    if (!turnOrder) return;

    const rows = Array.from(turnOrder.querySelectorAll('li'));

    // Pobierz postacie z aktualnego rzędu
    const currentRow = rows[currentRowIndex];
    const turnEndingCharacters = currentRow.textContent
    .replace(/\(\d+\)\s*$/, '')  // Usuń liczbę w nawiasach na końcu
    .split(',')
    .map(name => name.trim());

    // Przejdź do następnego rzędu
    if (currentRowIndex < rows.length) {
        currentRow.classList.remove('active-row');
    }

    currentRowIndex += 1;

    // Zmniejsz czas trwania dla odpowiednich conditions
    await reduceConditionDurations(turnEndingCharacters);

    // Jeśli koniec listy, wracamy do początku + nowa runda
    if (currentRowIndex >= rows.length) {
        currentRowIndex = 0;
        await newRound();
    }

    // Ustaw nową klasę na aktualny rząd
    const nextRow = rows[currentRowIndex];
    nextRow.classList.add('active-row');
}

async function reduceConditionDurations(turnEndingCharacters) {
    let activeConditions = await loadServerActiveConditions();

    // Przetwórz tylko te conditions, które mają liczbowe duration
    activeConditions = activeConditions.map(condition => {
        if (turnEndingCharacters.includes(condition.target) && condition.duration !== "-") {
            condition.duration = Math.max(condition.duration - 1, 0);
        }
        return condition;
    });

    await updateServerConditions(activeConditions);
    await renderConditionsSidebar(activeConditions);

    markExpiredConditions(activeConditions);
}

// Dodaj wykrzykniki do warunków z duration === 0
function markExpiredConditions(activeConditions) {
    const conditionsDiv = document.querySelector('.sidebar-conditions');
    activeConditions.forEach(condition => {
        if (condition.duration === 0) {
            const conditionItem = conditionsDiv.querySelector(`.condition-item[data-id="${condition.id}"]`);
            if (conditionItem && !conditionItem.querySelector('.exclamation-mark')) {
                const exclamationMark = document.createElement('span');
                exclamationMark.className = 'exclamation-mark-condition';
                exclamationMark.textContent = '❗';
                conditionItem.querySelector('.condition-duration').after(exclamationMark);
            }
        }
    });
}

function showMusicMenu() {
    const sidebar = document.getElementById('Sidebar');
    const sidebarTitle = sidebar.querySelector('.sidebar-title');
    const sidebarContent = sidebar.querySelector('.sidebar-content');
    const sidebarConditions = sidebar.querySelector('.sidebar-conditions');

    sidebarTitle.textContent = `Lista utworów:`

    const musicList = document.createElement('div');
    musicList.className = 'music-list';

    mp3Files.forEach(file => {
        const musicItem = document.createElement('div');
        musicItem.className = 'music-item';

        // Dodaj przycisk do odtwarzania
        const playButton = document.createElement('button');
        playButton.textContent = '▶️'; // Ikona odtwarzania
        playButton.onclick = () => playMusic(file);

        // Dodaj nazwę utworu
        const musicName = document.createElement('span');
        musicName.textContent = file.replace('.mp3', ''); // Wyświetl nazwę bez rozszerzenia
        musicName.className = 'music-name';

        musicItem.appendChild(playButton);
        musicItem.appendChild(musicName);
        musicList.appendChild(musicItem);
    });

    sidebarContent.innerHTML = '';
    sidebarConditions.style.display = 'none';
    sidebarContent.appendChild(musicList);
    sidebar.classList.remove('hidden');
}

function playMusic(filePath) {
    // Jeśli coś już gra, zatrzymaj
    if (currentMusic) {
        currentMusic.pause();
        currentMusic.currentTime = 0; // Resetuj czas
    }

    // Odtwarzaj nowy utwór
    currentMusic = new Audio(`music/${filePath}`);
    currentMusic.volume = 0.4;
    currentMusic.play();

    // Zapętl
    currentMusic.onended = () => {
        currentMusic.play();
    };
}

async function endCombat() {
    const abilitiesStates = await loadServerAbilitiesStates();
    // Usuń cooldown we wszystkich umiejętnościach
    Object.keys(abilitiesStates).forEach(characterName => {
        Object.keys(abilitiesStates[characterName]).forEach(abilityName => {
            const abilityState = abilitiesStates[characterName][abilityName];
            abilityState.currentCooldown = 0;
        });
    });
    await updateServerAbilitiesStates(abilitiesStates);

    const sidebar = document.getElementById('Sidebar');
    const sidebarConditions = sidebar.querySelector('.sidebar-conditions');
    sidebarConditions.innerHTML = ''; // usuniecie stanow z htmla

    removeSidebar();
    currentCombatRound = 0;
    await requestUpdateCurrentCombatRound(); // zeby sie dalo juz uleczyc ze smierci
    await updateServerConditions(); // brak podania activeConditions po prostu je usuwa na serwerze
    await markConditionTargets(); // usun wykrzykniki

    await requestUpdateActivePanel(); // to ma byc zawsze na koncu, kropka
}

function toggleMusic() {
    if (currentMusic) {
        if (currentMusic.paused) {
            currentMusic.play();
        }
        else {
            currentMusic.pause();
        }
    }
}

function toggleLockSidebar() {
    const toggleLockButton = document.getElementById('toggleLockSidebar');

    isSidebarLocked = !isSidebarLocked;
    toggleLockButton.classList.toggle('locked', isSidebarLocked);
    if (isSidebarLocked)
        toggleLockButton.textContent = "🔒";
    else if (!isSidebarLocked)
        toggleLockButton.textContent = "🔓";
}

function toggleSidebar() {
    const sidebar = document.getElementById('Sidebar');
    const toggleLockButton = document.getElementById('toggleLockSidebar');

    if (sidebar.classList.contains('hidden') || !sidebar.classList.contains('visible')) {
        sidebar.classList.remove('hidden');

        setTimeout(function(){
            sidebar.classList.add('visible');
        }, 1); // zeby animacja byla ladna

        isSidebarLocked = true;
        toggleLockButton.classList.add('locked');
        toggleLockButton.textContent = "🔒";
    } else {
        removeSidebar();
    }
}

function removeSidebar() {
    const sidebar = document.getElementById('Sidebar');
    const toggleLockButton = document.getElementById('toggleLockSidebar');
    const sidebarTitle = sidebar.querySelector('.sidebar-title');
    const sidebarContent = sidebar.querySelector('.sidebar-content');
    const sidebarConditions = sidebar.querySelector('.sidebar-conditions');

    sidebar.classList.remove('visible');
    setTimeout(function(){
        sidebar.classList.add('hidden');
    }, 300); // zeby animacja byla ladna
    
    // Odblokuj pasek
    isSidebarLocked = false; 
    toggleLockButton.classList.remove('locked');
    toggleLockButton.textContent = "🔓";

    // Wyczysc title i content
    sidebarTitle.innerHTML = '';
    sidebarContent.innerHTML = '';
    sidebarConditions.style.display = 'none';
}