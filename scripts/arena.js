// Generates a unique ID for each character instance on the board
function generateId() {
    return 'char-' + Date.now().toString(36) + '-' + Math.random().toString(36).substr(2, 5);
}

function getUniqueCharacterName(baseName) {
    // Get all existing character names from memory
    const existingNames = activeCombatants.map(c => c.uniqueName); 

    let uniqueName = baseName;
    let counter = 2;

    while (existingNames.includes(uniqueName)) {
        uniqueName = `${baseName} ${counter}`;
        counter++;
    }

    return uniqueName;
}

function removeUniqueNameNumber(charName) {
    return charName.replace(/\s\d{1,2}$/, ''); // Match a space and a number (1-2 digits) at the end and remove
}

function addSpecificCharacter(type, name, team) {
    if (type === 'mob' && mobs[name]) {
        addCharacter('mob', team, mobs[name], name);
    } else if (type === 'npc' && npcs[name]) {
        addCharacter('npc', team, npcs[name], name);  
    } else if (type === 'boss' && bosses[name]) {
        addCharacter('boss', team, bosses[name], name);
    } else if (type === 'player' && players[name]) {
        addCharacter('player', team, players[name], name); 
    } else if (type === 'character') {
        addCharacter('character', team, { name: '' }, '');
    }
}

// Core character creation: Calculates stats and sends the new combatant to the server
function addCharacter(type, team, stats = {}, image = null) {
    let uniqueName = '';
    // Determine unique name
    if (stats.name) {
        uniqueName = getUniqueCharacterName(stats.name);
    }

    // Update stats based on equipment
    const finalStats = applyGearBonuses(stats);

    // Set default HP values if missing
    if (finalStats.hp === undefined) finalStats.hp = 10;
    if (finalStats.maxHp === undefined) finalStats.maxHp = 10;

    // Initialize abilities states directly in memory
    const initialAbilitiesStates = {};
    if (stats.abilities && Array.isArray(stats.abilities)) {
        stats.abilities.forEach(ability => {
            const isSingleUse = ability.cooldown === "[cooldown_once]";
            const maxCooldown = isSingleUse ? Infinity : (!ability.cooldown && ability.cooldown !== 0 ? 0 : parseInt(ability.cooldown) + 1);
            
            initialAbilitiesStates[ability.name] = {
                currentCooldown: 0,
                maxCooldown: maxCooldown,
                singleUse: isSingleUse
            };
        });
    }

    // Create the rich character object in memory holding EVERYTHING
    const combatant = {
        id: generateId(),
        uniqueName: uniqueName,
        baseName: stats.name || '',
        type: type,
        team: team,
        image: image,
        stats: finalStats,
        baselineStats: JSON.parse(JSON.stringify(finalStats)), // Keep initial state after gear bonuses for future template diff comparison
        equipment: stats.equipment ? JSON.parse(JSON.stringify(stats.equipment)) : [],
        abilities: stats.abilities ? JSON.parse(JSON.stringify(stats.abilities)) : [],
        abilitiesStates: initialAbilitiesStates,
        lastRoll: { stat: '', result: '', color: 'white' }, // New dictionary for keeping track of dice rolls
        isDead: finalStats.isDead === true || finalStats.isDead === "true",
        hasDeathsDoor: finalStats.hasDeathsDoor === true || finalStats.hasDeathsDoor === "true",
        hasActedThisRound: false,
        isStunned: false
    };

    // Push to server -> which will broadcast it back to everyone (including GM) and trigger renderToken()
    syncAddCombatant(combatant);
}

// Renders the token visually on the board based on the combatant object
function renderToken(combatant) {
    const teamDiv = document.getElementById(combatant.team + 'Team');
    if (!teamDiv) return;

    // Build Token HTML
    const tokenDiv = document.createElement('div');
    tokenDiv.className = `character-token ${combatant.team}-token ${combatant.isDead ? 'dead' : ''}`;
    tokenDiv.dataset.id = combatant.id;
    tokenDiv.onclick = () => selectCharacter(combatant.id);

    const imgSrc = combatant.image ? `/api/image/${combatant.type}/${encodeURIComponent(combatant.image)}` : '/images/default-img.svg';
    const imgAlt = combatant.image ? combatant.image : t('unknown_character');
    const hpPercentage = (combatant.stats.hp / combatant.stats.maxHp) * 100;

    tokenDiv.innerHTML = `
        <button class="token-delete-btn" onclick="removeCharacterById('${combatant.id}', event)" title="${t('remove_character')}">✕</button>
        <img src="${imgSrc}" class="token-img" alt="${imgAlt}" onerror="this.src='/images/default-img.svg'">
        <div class="token-hp-bg">
            <div class="token-hp-fill ${getHpClass(hpPercentage, combatant.isDead)}" style="width: ${Math.max(0, Math.min(100, hpPercentage))}%;"></div>
        </div>
        <div class="token-name">${combatant.uniqueName || t('unknown_character')}</div>
    `;

    teamDiv.appendChild(tokenDiv);
    checkArenaEmptyStates();
}

// Helper function to return dynamic HP class based on percentage
function getHpClass(hpPercentage, isDead) {
    if (isDead) return 'hp-fill-dead'; 
    if (hpPercentage <= 25) return 'hp-fill-low'; 
    if (hpPercentage <= 50) return 'hp-fill-medium'; 
    return 'hp-fill-high'; 
}

// Checks and displays placeholder texts if arena teams are empty
function checkArenaEmptyStates() {
    const heroTeam = document.getElementById('heroTeam');
    const enemyTeam = document.getElementById('enemyTeam');
    
    if (heroTeam) { // Checks like this one aren't really necessary for normal users, but they could be useful when someone wants to cause problems by deleting UI elements.
        if (heroTeam.querySelectorAll('.character-token').length === 0) {
            if (!heroTeam.querySelector('.arena-placeholder')) {
                const placeholder = document.createElement('div');
                placeholder.className = 'arena-placeholder';
                placeholder.textContent = t('placeholder_no_heroes');
                heroTeam.appendChild(placeholder);
            }
        } else {
            const placeholder = heroTeam.querySelector('.arena-placeholder');
            if (placeholder) placeholder.remove();
        }
    }
    
    if (enemyTeam) {
        if (enemyTeam.querySelectorAll('.character-token').length === 0) {
            if (!enemyTeam.querySelector('.arena-placeholder')) {
                const placeholder = document.createElement('div');
                placeholder.className = 'arena-placeholder';
                placeholder.textContent = t('placeholder_no_enemies');
                enemyTeam.appendChild(placeholder);
            }
        } else {
            const placeholder = enemyTeam.querySelector('.arena-placeholder');
            if (placeholder) placeholder.remove();
        }
    }
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

    // Intuition bonus for Agility and Accuracy, dunno if I want to hardcode that. Let's leave it for now.
    // if (diceType === 'agility' || diceType === 'accuracy') {
    //     const intuitionValue = parseInt(combatant.stats.intuition) || 0;
    //     if (intuitionValue >= 10) {
    //         const intuitionBonus = Math.floor((intuitionValue - 10) / 4);
    //         result += intuitionBonus;
    //     }
    // }

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