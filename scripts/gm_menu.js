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
                return; // Skip ready or locked abilities
            }

            abilityState.currentCooldown -= 1; // Reduce cooldown
        });
    });
    await updateServerAbilitiesStates(abilitiesStates);
    await requestUpdateActivePanel(); // This must be at the end
}

async function getCharactersInTeam(teamId) {
    const teamDiv = document.getElementById(teamId);
    // Filter only alive characters
    const aliveCharacters = Array.from(teamDiv.getElementsByClassName('character'))
        .filter(characterDiv => characterDiv.dataset.isDead !== "true");

    return aliveCharacters.flatMap(characterDiv => {
        const name = characterDiv.querySelector('input[type="text"]').value || 'Nieznana postać';
        const reflexInput = characterDiv.querySelector('.stat-value.reflex');
        const reflex = reflexInput ? parseInt(reflexInput.value) || 0 : 0;

        // Check if the character has "Dodatkowa akcja" (Extra Action)
        const abilities = (bosses[name]?.abilities || monsters[name]?.abilities || adventurers[name]?.abilities || []);
        const hasExtraAction = abilities.some(ability => ability.name === "Dodatkowa akcja");

        // If they have "Dodatkowa akcja", add two entries: with full and half reflex
        if (hasExtraAction) {
            return [
                { name, reflex, team: teamId },
                { name, reflex: Math.floor(reflex / 2), team: teamId }
            ];
        }

        // Otherwise, add only one entry
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

    // Display on the sidebar
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
    // Ensure the sidebar is visible
    sidebar.classList.remove('hidden');
    await renderConditionsSidebar(activeConditions);
    markExpiredConditions(activeConditions); // This also needs to be done here, otherwise exclamation marks will disappear in a new round
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
    // Handle "Remove" button
    removeButton.onclick = () => {
        conditionsDiv.removeChild(conditionItem); // Remove from UI (out of sight)
        removeCondition(condition.id); // Remove from data (out of mind)
    };

    // Handle "Copy" button
    const copyButton = conditionItem.querySelector('.copy-condition');
    copyButton.onclick = () => {
        copyCondition(condition);
    };
}

async function markConditionTargets() {
    const activeConditions = await loadServerActiveConditions();

    // Search all characterDivs
    const characterInputs = document.querySelectorAll('.character input[type="text"]');

    characterInputs.forEach(charInput => {
        const characterName = charInput.value.trim();

        // Find or create an exclamation mark
        let exclamationMark = charInput.parentElement.querySelector('.exclamation-mark');

        // Check if there is a condition associated with this character
        const hasConditions = activeConditions.some(condition => condition.target === characterName);

        if (hasConditions) {
            if (!exclamationMark) {
                exclamationMark = document.createElement('span');
                exclamationMark.className = 'exclamation-mark';
                exclamationMark.textContent = '❗';
                charInput.parentElement.appendChild(exclamationMark);
            }
        } else if (exclamationMark) {
            exclamationMark.remove(); // Remove the exclamation mark if there are no conditions
        }
    });
}

async function updateConditionTarget(input) {
    const newTarget = input.value.trim();
    const conditionId = input.closest('.condition-item').dataset.id;

    // Fetch current conditions from the server
    let activeConditions = await loadServerActiveConditions();

    // Find the condition to update
    const conditionIndex = activeConditions.findIndex(condition => condition.id === conditionId);

    if (conditionIndex !== -1) {
        // Update the condition's target
        activeConditions[conditionIndex].target = newTarget;
        await updateServerConditions(activeConditions); // Update on the server
    }
    await markConditionTargets(); // Mark targets when changing a target
}

async function removeCondition(conditionID) {
    let activeConditions = await loadServerActiveConditions();
    activeConditions = activeConditions.filter(condition => condition.id !== conditionID);
    await updateServerConditions(activeConditions);
    await markConditionTargets(); // Mark targets when removing a condition
}

function copyCondition(condition) {
    // Create a new condition object with a new ID
    const copiedCondition = {
        ...condition,
        id: `condition-${Date.now()}-${Math.random().toString(16).slice(2)}`
    };

    // Send the new condition to the server
    socket.send(JSON.stringify({
        type: "REQUESTaddCondition",
        condition: copiedCondition
    }));

    // Manually add the new condition to the sidebar (quick update)
    addConditionToSidebar(copiedCondition);
}

async function moveToNextTurn() {
    const turnOrder = document.getElementById('turnOrder');
    if (!turnOrder) return;

    const rows = Array.from(turnOrder.querySelectorAll('li'));

    // Get characters from the current row
    const currentRow = rows[currentRowIndex];
    const turnEndingCharacters = currentRow.textContent
    .replace(/\(\d+\)\s*$/, '')  // Remove the number in parentheses at the end
    .split(',')
    .map(name => name.trim());

    // Move to the next row
    if (currentRowIndex < rows.length) {
        currentRow.classList.remove('active-row');
    }

    currentRowIndex += 1;

    // Reduce duration for the appropriate conditions
    await reduceConditionDurations(turnEndingCharacters);

    // If end of list, return to start + new round
    if (currentRowIndex >= rows.length) {
        currentRowIndex = 0;
        await newRound();
    }

    // Set new class to the current row
    const nextRow = rows[currentRowIndex];
    nextRow.classList.add('active-row');
}

async function reduceConditionDurations(turnEndingCharacters) {
    let activeConditions = await loadServerActiveConditions();

    // Process only those conditions that have a numerical duration
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

// Add exclamation marks to conditions with duration === 0
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

        // Add play button
        const playButton = document.createElement('button');
        playButton.textContent = '▶️'; // Play icon
        playButton.onclick = () => playMusic(file);

        // Add track name
        const musicName = document.createElement('span');
        musicName.textContent = file.replace('.mp3', ''); // Display name without extension
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
    // If something is already playing, stop it
    if (currentMusic) {
        currentMusic.pause();
        currentMusic.currentTime = 0; // Reset time
    }

    // Play new track
    currentMusic = new Audio(`music/${filePath}`);
    currentMusic.volume = 0.4;
    currentMusic.play();

    // Loop track
    currentMusic.onended = () => {
        currentMusic.play();
    };
}

async function endCombat() {
    const abilitiesStates = await loadServerAbilitiesStates();
    // Remove cooldown from all abilities
    Object.keys(abilitiesStates).forEach(characterName => {
        Object.keys(abilitiesStates[characterName]).forEach(abilityName => {
            const abilityState = abilitiesStates[characterName][abilityName];
            abilityState.currentCooldown = 0;
        });
    });
    await updateServerAbilitiesStates(abilitiesStates);

    const sidebar = document.getElementById('Sidebar');
    const sidebarConditions = sidebar.querySelector('.sidebar-conditions');
    sidebarConditions.innerHTML = ''; // Remove conditions from HTML

    removeSidebar();
    currentCombatRound = 0;
    await requestUpdateCurrentCombatRound(); // So that it's possible to heal from death
    await updateServerConditions(); // Not providing activeConditions simply removes them on the server
    await markConditionTargets(); // Remove exclamation marks

    await requestUpdateActivePanel(); // This must always be at the end, period
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
        }, 1); // To make the animation look nice

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
    }, 300); // To make the animation look nice
    
    // Unlock the sidebar
    isSidebarLocked = false; 
    toggleLockButton.classList.remove('locked');
    toggleLockButton.textContent = "🔓";

    // Clear title and content
    sidebarTitle.innerHTML = '';
    sidebarContent.innerHTML = '';
    sidebarConditions.style.display = 'none';
}