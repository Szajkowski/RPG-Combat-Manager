let currentCombatRound = 0;
let currentRowIndex = 0; // Tracks the current row in the turn order
let isSidebarLocked = false;

let activePanel = null;
let activeOverlay = null;
let isRemoving = false;  // Flag to prevent multiple panel removals at once

let currentMusic = null;
let mp3Files = [];

async function loadMusicFiles() {
    try {
        const response = await fetch('/api/music-files'); // this basically returns a promise with data, not the data itself
        mp3Files = await response.json(); // and that's exactly why await is here
        mp3Files = mp3Files.sort();
    } catch (error) {
        console.error('Error loading files:', error);
    }
}

loadMusicFiles();

// Helper function to parse INI format
function parseINI(data) {
    const result = {};
    let currentSection = null;
    
    data.split(/\r?\n/).forEach(line => {
        line = line.trim();
        // Skip empty lines and comments
        if (!line || line.startsWith(';') || line.startsWith('#')) return; 
        
        // Handle sections like [InitialHeroes]
        if (line.startsWith('[') && line.endsWith(']')) {
            currentSection = line.substring(1, line.length - 1);
            result[currentSection] = {};
        } 
        // Handle key=value pairs
        else if (line.includes('=')) {
            const parts = line.split('=');
            const key = parts.shift().trim();
            const value = parts.join('=').trim(); 
            
            if (currentSection) {
                result[currentSection][key] = value;
            } else {
                result[key] = value;
            }
        }
    });
    return result;
}

document.addEventListener('DOMContentLoaded', () => {
    const monsterSelectorEnemy = document.getElementById('monsterSelectorEnemy');
    const monsterSelectorHero = document.getElementById('monsterSelectorHero');
    const adventurerSelectorEnemy = document.getElementById('adventurerSelectorEnemy');
    const adventurerSelectorHero = document.getElementById('adventurerSelectorHero');
    const bossSelector = document.getElementById('bossSelector');
    const gmToggleBtn = document.getElementById('gm-mute-btn');

    if (gmToggleBtn) {
        gmToggleBtn.textContent = window.isAudioMuted ? "🔇" : "🔊";
    }

    // Set GM language button flag
    const gmLangBtn = document.getElementById('gm-lang-btn');
    if (gmLangBtn) gmLangBtn.textContent = window.currentLanguage === 'PL' ? '🇵🇱' : '🇬🇧';

    // Add monster options to both lists
    for (const monster in monsters) {
        if (monsters[monster].hidden) continue; // skip hidden ones

        const option = document.createElement('option');
        option.value = monster;
        option.textContent = monster;
        monsterSelectorEnemy.appendChild(option.cloneNode(true));
        monsterSelectorHero.appendChild(option.cloneNode(true));
    }

    // Add adventurer options to both adventurer lists
    for (const adventurer in adventurers) {
        if (adventurers[adventurer].hidden) continue;

        const option = document.createElement('option');
        option.value = adventurer;
        option.textContent = adventurer;
        adventurerSelectorEnemy.appendChild(option.cloneNode(true));
        adventurerSelectorHero.appendChild(option.cloneNode(true));
    }

    // Add boss options to the boss list
    for (const boss in bosses) {
        if (bosses[boss].hidden) continue;

        const option = document.createElement('option');
        option.value = boss;
        option.textContent = boss;
        bossSelector.appendChild(option.cloneNode(true));
    }

    // Handle monster selection for enemies
    monsterSelectorEnemy.addEventListener('change', (event) => {
        const selectedMonster = event.target.value;
        if (selectedMonster && monsters[selectedMonster]) {
            addSpecificCharacter('monster', selectedMonster, 'enemy');
            monsterSelectorEnemy.selectedIndex = "0"; // Reset selection
        }
    });

    // Handle monster selection for heroes
    monsterSelectorHero.addEventListener('change', (event) => {
        const selectedMonster = event.target.value;
        if (selectedMonster && monsters[selectedMonster]) {
            addSpecificCharacter('monster', selectedMonster, 'hero');
            monsterSelectorHero.selectedIndex = "0";
        }
    });

    // Handle adventurer selection for enemies
    adventurerSelectorEnemy.addEventListener('change', (event) => {
        const selectedAdventurer = event.target.value;
        if (selectedAdventurer && adventurers[selectedAdventurer]) {
            addSpecificCharacter('adventurer', selectedAdventurer, 'enemy');
            adventurerSelectorEnemy.selectedIndex = "0";
        }
    });

    // Handle adventurer selection for heroes
    adventurerSelectorHero.addEventListener('change', (event) => {
        const selectedAdventurer = event.target.value;
        if (selectedAdventurer && adventurers[selectedAdventurer]) {
            addSpecificCharacter('adventurer', selectedAdventurer, 'hero');
            adventurerSelectorHero.selectedIndex = "0";
        }
    });

    // Handle boss selection
    bossSelector.addEventListener('change', (event) => {
        const selectedBoss = event.target.value;
        if (selectedBoss && bosses[selectedBoss]) {
            addSpecificCharacter('boss', selectedBoss, 'enemy');
            bossSelector.selectedIndex = "0";
        }
    });

    // Fetch config.ini and load initial characters
    fetch('/config.ini')
    .then(response => response.text())
    .then(text => {
        const config = parseINI(text);
        
        waitForSocket(() => {
            // Load heroes
            if (config.InitialHeroes) {
                for (const [name, type] of Object.entries(config.InitialHeroes)) {
                    addSpecificCharacter(type, name, 'hero');
                }
            }
            
            // Load enemies
            if (config.InitialEnemies) {
                for (const [name, type] of Object.entries(config.InitialEnemies)) {
                    addSpecificCharacter(type, name, 'enemy');
                }
            }
        });
    })
    .catch(error => console.error("Error loading config.ini:", error));

    const gmMenuBar = document.getElementById('GM-menu-bar');

    gmMenuBar.addEventListener('mouseenter', () => {
        gmMenuBar.style.top = '0'; // Slide out fully
    });

    gmMenuBar.addEventListener('mouseleave', () => {
        gmMenuBar.style.top = `-50px`;
    });

    // Element references
    const sidebar = document.getElementById('Sidebar');

    // Slide out sidebar on mouse enter
    sidebar.addEventListener('mouseenter', () => {
        if (!isSidebarLocked) {
            sidebar.classList.add('visible');
        }
    });

    // Hide sidebar on mouse leave
    sidebar.addEventListener('mouseleave', () => {
        if (!isSidebarLocked) {
            sidebar.classList.remove('visible');
        }
    });

    // Just a failsafe in case of disconnection
    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible' && socket.readyState !== WebSocket.OPEN) {
            console.log("Returned to the page, reconnecting...");
            socket = connectSocket();

            const playerNames = Array.from(document.querySelectorAll('.character[data-type="player"]'))
            .map(playerDiv => playerDiv.querySelector('input[type="text"]').value.trim());

            // Wait for the socket to connect using the existing helper function
            waitForSocket(() => {
                updateSpecificPlayersStats(playerNames);
            });
        }
    });

    document.addEventListener('keydown', function(event) {
        // Check if a text field is currently active
        const isInputFocused = document.activeElement.tagName.toLowerCase() === 'input' || document.activeElement.tagName.toLowerCase() === 'textarea';
    
        // If a text field is not active, execute keyboard shortcuts
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

    // --- DYNAMIC INDEX.HTML TRANSLATION ---
    const translateElement = (selector, key) => {
        const el = document.querySelector(selector);
        if (el) el.textContent = t(key);
    };

    // Translate Navbar Buttons
    translateElement('button[onclick="setTurnOrder()"]', 'btn_turn_order');
    translateElement('button[onclick="newRound()"]', 'btn_new_round');
    translateElement('button[onclick="endCombat()"]', 'btn_end_combat');
    translateElement('button[onclick="showMusicMenu()"]', 'btn_music_list');
    translateElement('button[onclick="toggleMusic()"]', 'btn_toggle_music');
    translateElement('button[onclick="toggleSidebar()"]', 'btn_toggle_sidebar');

    // Translate Section Headers (h2)
    const h2Elements = document.querySelectorAll('.button-group h2');
    if (h2Elements.length >= 2) {
        h2Elements[0].textContent = t('enemies');
        h2Elements[1].textContent = t('heroes');
    }

    // Translate Select Dropdown Placeholders
    translateElement('#monsterSelectorEnemy option[disabled]', 'add_specific_monster');
    translateElement('#monsterSelectorHero option[disabled]', 'add_specific_monster');
    translateElement('#adventurerSelectorEnemy option[disabled]', 'add_specific_adventurer');
    translateElement('#adventurerSelectorHero option[disabled]', 'add_specific_adventurer');
    translateElement('#bossSelector option[disabled]', 'add_boss');

    // Translate "Add" Div Buttons
    const addButtons = document.querySelectorAll('.add-button');
    if (addButtons.length >= 4) {
        addButtons[0].textContent = t('add_monster');
        addButtons[1].textContent = t('add_adventurer');
        addButtons[2].textContent = t('add_monster');
        addButtons[3].textContent = t('add_adventurer');
    }
});