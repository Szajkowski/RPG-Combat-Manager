let currentCombatRound = 0;
let currentRowIndex = 0; // Śledzi aktualny rząd w kolejce ruchów
let isSidebarLocked = false;

let activePanel = null;
let activeOverlay = null;
let isRemoving = false;  // Flaga zeby powstrzymac kilka usuwan paneli na raz

let currentMusic = null;
let diceAudio = null;
let mp3Files = [];

async function loadMusicFiles() {
    try {
        const response = await fetch('/api/music-files'); // to w zasadzie zwraca promise z danymi, a nie dane
        mp3Files = await response.json(); // no i wlasnie dlatego tu jest await
        mp3Files = mp3Files.sort();
    } catch (error) {
        console.error('Błąd ładowania plików:', error);
    }
}

loadMusicFiles();

document.addEventListener('DOMContentLoaded', () => {
    const monsterSelectorEnemy = document.getElementById('monsterSelectorEnemy');
    const monsterSelectorHero = document.getElementById('monsterSelectorHero');
    const adventurerSelectorEnemy = document.getElementById('adventurerSelectorEnemy');
    const adventurerSelectorHero = document.getElementById('adventurerSelectorHero');
    const bossSelector = document.getElementById('bossSelector');
    diceAudio = new Audio('sound/diceroll.mp3');

    // Dodaj opcje potworów do obu list
    for (const monster in monsters) {
        if (monsters[monster].hidden) continue; // pomijanie ukrytych

        const option = document.createElement('option');
        option.value = monster;
        option.textContent = monster;
        monsterSelectorEnemy.appendChild(option.cloneNode(true));
        monsterSelectorHero.appendChild(option.cloneNode(true));
    }

    // Dodaj opcje poszukiwaczy do obu list poszukiwaczy
    for (const adventurer in adventurers) {
        if (adventurers[adventurer].hidden) continue;

        const option = document.createElement('option');
        option.value = adventurer;
        option.textContent = adventurer;
        adventurerSelectorEnemy.appendChild(option.cloneNode(true));
        adventurerSelectorHero.appendChild(option.cloneNode(true));
    }

    // Dodaj opcje bossów do listy bossów
    for (const boss in bosses) {
        if (bosses[boss].hidden) continue;

        const option = document.createElement('option');
        option.value = boss;
        option.textContent = boss;
        bossSelector.appendChild(option.cloneNode(true));
    }

    // Obsługa wyboru potwora dla przeciwników
    monsterSelectorEnemy.addEventListener('change', (event) => {
        const selectedMonster = event.target.value;
        if (selectedMonster && monsters[selectedMonster]) {
            addSpecificCharacter('monster', selectedMonster, 'enemy');
            monsterSelectorEnemy.selectedIndex = "0"; // Zresetuj wybór
        }
    });

    // Obsługa wyboru potwora dla bohaterów
    monsterSelectorHero.addEventListener('change', (event) => {
        const selectedMonster = event.target.value;
        if (selectedMonster && monsters[selectedMonster]) {
            addSpecificCharacter('monster', selectedMonster, 'hero');
            monsterSelectorHero.selectedIndex = "0"; // Zresetuj wybór
        }
    });

    // Obsługa wyboru poszukiwacza dla przeciwników
    adventurerSelectorEnemy.addEventListener('change', (event) => {
        const selectedAdventurer = event.target.value;
        if (selectedAdventurer && adventurers[selectedAdventurer]) {
            addSpecificCharacter('adventurer', selectedAdventurer, 'enemy');
            adventurerSelectorEnemy.selectedIndex = "0"; // Zresetuj wybór
        }
    });

    // Obsługa wyboru poszukiwacza dla bohaterów
    adventurerSelectorHero.addEventListener('change', (event) => {
        const selectedAdventurer = event.target.value;
        if (selectedAdventurer && adventurers[selectedAdventurer]) {
            addSpecificCharacter('adventurer', selectedAdventurer, 'hero');
            adventurerSelectorHero.selectedIndex = "0"; // Zresetuj wybór
        }
    });

    // Obsługa wyboru bossa
    bossSelector.addEventListener('change', (event) => {
        const selectedBoss = event.target.value;
        if (selectedBoss && bosses[selectedBoss]) {
            addSpecificCharacter('boss', selectedBoss, 'enemy');
            bossSelector.selectedIndex = "0"; // Zresetuj wybór
        }
    });

    waitForSocket(() => {
        addSpecificCharacter('adventurer', "Nadia Cardigan", 'hero');
        addSpecificCharacter('player', "Elias Shlongue", 'hero');
        addSpecificCharacter('player', "Aurelia", 'hero');
        addSpecificCharacter('player', "Shabi Zovalt", 'hero');
        addSpecificCharacter('player', "Pafnucy", 'hero');
    });

    const gmMenuBar = document.getElementById('GM-menu-bar');

    gmMenuBar.addEventListener('mouseenter', () => {
        gmMenuBar.style.top = '0'; // Pełne wysunięcie
    });

    gmMenuBar.addEventListener('mouseleave', () => {
        gmMenuBar.style.top = `-50px`;
    });

    // Referencje do elementów
    const sidebar = document.getElementById('Sidebar');

    // Wysuwanie paska przy najechaniu myszką
    sidebar.addEventListener('mouseenter', () => {
        if (!isSidebarLocked) {
            sidebar.classList.add('visible');
        }
    });

    // Chowanie paska po zdjęciu myszki
    sidebar.addEventListener('mouseleave', () => {
        if (!isSidebarLocked) {
            sidebar.classList.remove('visible');
        }
    });

    // taki tam dupochron na wypadek rozlaczenia
    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible' && socket.readyState !== WebSocket.OPEN) {
            console.log("Wrócono na stronę, ponowne łączenie...");
            socket = connectSocket();

            const playerNames = Array.from(document.querySelectorAll('.character[data-type="player"]'))
            .map(playerDiv => playerDiv.querySelector('input[type="text"]').value.trim());

            const checkInterval = setInterval(() => {
                if (socket.readyState === WebSocket.OPEN) { // czekamy az socket sie polaczy
                    updateSpecificPlayersStats(playerNames);
                    clearInterval(checkInterval);  // Zatrzymaj sprawdzanie
                }
            }, 100);  // Sprawdzaj co 100ms            
        }
    });

    document.addEventListener('keydown', function(event) {
        // Sprawdzamy, czy w danym momencie aktywne jest pole tekstowe
        const isInputFocused = document.activeElement.tagName.toLowerCase() === 'input' || document.activeElement.tagName.toLowerCase() === 'textarea';
    
        // Jeśli nie jest aktywne pole tekstowe, wykonujemy skróty klawiszowe
        if (!isInputFocused) {
            switch (event.key.toUpperCase()) {
                case 'K':
                    setTurnOrder();
                    break;
                case 'N':
                    newRound();
                    break;
                case 'Z':
                    endCombat();
                    break;
                case 'M':
                    showMusicMenu();
                    break;
                case 'S':
                    toggleMusic();
                    break;
                case 'L':
                    toggleSidebar();
                    break;
                case 'ARROWDOWN':
                    event.preventDefault();
                    moveToNextTurn();
                    break;
                default:
                    break;
            }
        }
    });
});