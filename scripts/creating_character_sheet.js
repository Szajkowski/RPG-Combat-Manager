function getUniqueCharacterName(baseName) {
    const existingNames = Array.from(document.querySelectorAll('.character input[type="text"]'))
        .map(input => input.value.trim()); // Get all existing character names

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
    if (type === 'monster' && monsters[name]) {
        addCharacter(type, team, monsters[name], name);
    } else if (type === 'adventurer' && adventurers[name]) {
        addCharacter(type, team, adventurers[name], name);  
    } else if (type === 'boss' && bosses[name]) {
        addCharacter(type, team, bosses[name], name);
    } else if (type === 'player' && players[name]) {
        addPlayerCharacter(name, team); 
        // Adding the team in attributes might be a bit weird, but I don't like hardcoding things and maybe I'd like to add a player to the enemies someday?
    }
}

function addCharacter(type, team, stats = {}, image = null) {
    const teamDiv = document.getElementById(team + 'Team');

    let uniqueName = '';
    // Determine unique name
    if (stats.name)
    {
        uniqueName = getUniqueCharacterName(stats.name);
    }

    // Update stats based on equipment
    const finalStats = applyGearBonuses(stats);

    const characterDiv = document.createElement('div');
    characterDiv.classList.add('character');

    // Add 'hasDeathsDoor' and 'type' attributes to dataset
    characterDiv.dataset.hasDeathsDoor = finalStats.hasDeathsDoor || "false";
    characterDiv.dataset.type = type;

    // Build character content - the X button is now after the potential image
    let characterContent = '';
        
    // Add image only if it's a specific character (image is defined)
    if (image) {
        characterContent += `<img src="images/${type}/${image}.jpg" alt="${image}">`;
    }

    characterContent += `
        <span class="remove-button" onclick="removeCharacter(this)">✖</span>
        <div class="stat"><strong>Nazwa:</strong> <input type="text" onclick="copyInputValue(this)" value="${uniqueName || ''}"></div>
        ${getCharacterStats(finalStats, type)}
        <div class="character-buttons">
            ${getCharacterButtons(finalStats, type)}
        </div>
        <div class="roll-zone">
            <div class="big-dice" id="bigDice">🎲</div>
        </div>
    `;

    characterDiv.innerHTML = characterContent;
    teamDiv.appendChild(characterDiv);

    // This part basically handles adding oninput=update to stat inputs and correctly loading the character from the server after reload or disconnect
    if (type === 'player') { 
        addInputSync(characterDiv);  // Automatically send changes after any stat change
        updatePlayer(finalStats.name, finalStats);
    }
}

function applyGearBonuses(stats) {
    if (!stats.equipment || !Array.isArray(stats.equipment)) return stats;

    let totalPhysFlat = parseInt(stats.physArmor) || 0;
    let totalPhysPercent = parseInt(stats.physArmorMod) || 0;
    let totalMagFlat = parseInt(stats.magArmor) || 0;
    let totalMagPercent = parseInt(stats.magArmorMod) || 0;

    const updatedStats = { ...stats };

    stats.equipment.forEach(item => {
        if (item.type !== 'gear') return;

        if (item.description) {
            const statBonuses = item.description.match(/([+-]\d+)\s+(wyniku\s+)?([\p{L}]+)/gu);
            if (statBonuses) {
                statBonuses.forEach(bonus => {
                    const [, value, isRollBonus, stat] = bonus.match(/([+-]\d+)\s+(wyniku\s+)?([\p{L}]+)/u);
                    const statKey = translateStatName(stat.toLowerCase());
                    const statValue = parseInt(value, 10);

                    if (isRollBonus) {
                        const rollKey = `${statKey}Mod`;
                        updatedStats[rollKey] = (updatedStats[rollKey] || 0) + statValue;
                    } else if (statKey && updatedStats[statKey] !== undefined) {
                        updatedStats[statKey] += statValue;
                        if (statKey === "vitality") {
                            updatedStats.hp += 10 * statValue;
                            updatedStats.maxHp += 10 * statValue;
                        }
                    } else if (stat.toLowerCase() === "zdrowia") {
                        const healthBonus = parseInt(value, 10);
                        updatedStats.hp += healthBonus;
                        updatedStats.maxHp += healthBonus;
                    } else {
                        console.warn(`Unknown stat: ${stat}`);
                    }
                });
            }
        }

        // Process damage
        if (typeof item.damage === 'string' && item.damage.includes('[')) {
            updatedStats.damage = (updatedStats.damage || 0) + evaluateFormula(item.damage, updatedStats);
        } else if (typeof item.damage === 'number') {
            updatedStats.damage = (updatedStats.damage || 0) + item.damage;
        }

        // Process physical armor
        if (typeof item.physArmor === 'string' && item.physArmor.includes('[')) {
            totalPhysFlat += evaluateFormula(item.physArmor, updatedStats);
        } else if (typeof item.physArmor === 'string' && item.physArmor.endsWith('%')) {  
            const itemPhysArmor = parseInt(item.physArmor, 10);
            totalPhysPercent += (100 - totalPhysPercent) * itemPhysArmor / 100;
        } else if (typeof item.physArmor === 'number') {
            totalPhysFlat += item.physArmor;
        }

        // Process magical armor
        if (typeof item.magArmor === 'string' && item.magArmor.includes('[')) {
            totalMagFlat += evaluateFormula(item.magArmor, updatedStats);
        } else if (typeof item.magArmor === 'string' && item.magArmor.endsWith('%')) {
            const itemMagArmor = parseInt(item.magArmor, 10);
            totalMagPercent += (100 - totalMagPercent) * itemMagArmor / 100;
        } else if (typeof item.magArmor === 'number') {
            totalMagFlat += item.magArmor;
        }
    });

    // Format modifier values
    Object.keys(updatedStats).forEach(key => {
        if (key.endsWith("Mod")) {
            updatedStats[key] = formatSigned(updatedStats[key]);
        }
    });

    return {
        ...updatedStats,
        physArmor: totalPhysFlat,
        physArmorMod: totalPhysPercent > 0 ? `${Math.floor(totalPhysPercent)}%` : '',
        magArmor: totalMagFlat,
        magArmorMod: totalMagPercent > 0 ? `${Math.floor(totalMagPercent)}%` : ''
    };
}

function formatSigned(value) {
    if (value === 0) return '';
    return `${value > 0 ? '+' : ''}${value}`;
}

function evaluateFormula(formula, stats) {
    try {
        // Replace stats with values without translation
        const evaluatedFormula = formula.replace(/\b([a-zA-Z_]+)\b/gi, (stat) => {
            const statValue = stats[stat] !== undefined ? stats[stat] : 0;
            return statValue;
        });

        // Calculate formula result
        const result = Math.max(0, Math.ceil(eval(evaluatedFormula)));
        return result;

    } catch (e) {
        console.error(`Error calculating formula: ${formula}`, e);
        return 0;
    }
}

function getCharacterStats(stats = {}, type) {
    let characterStats = `
    <div class="character-content">
        <div class="bar-container"><div class="bar hp-bar"></div></div>
        <div class="stat">Zdrowie:
            <div class="health-container">
                <input type="number" class="current-hp" oninput="updateHpBar(this)" value="${stats.hp ?? ''}"> / 
                <input type="number" class="max-hp" oninput="updateHpBar(this)" value="${stats.maxHp ?? ''}">
            </div>
        </div>
        ${getDamageControls()}

        <div class="stat"><span class="stat-label">Żywotność:</span> 
            <input type="number" class="stat-value vitality" placeholder="Wartość" value="${stats.vitality ?? ''}">
            <input class="mod-value vitality" placeholder="mod" value="${stats.vitalityMod ?? ''}">
            <button class="dice" onclick="rollDice(this, 'vitality')">🎲</button>
        </div>
        <div class="stat"><span class="stat-label">Intuicja:</span> 
            <input type="number" class="stat-value intuition" placeholder="Wartość" value="${stats.intuition ?? ''}">
            <input class="mod-value intuition" placeholder="mod" value="${stats.intuitionMod ?? ''}">
            <button class="dice" onclick="rollDice(this, 'intuition')">🎲</button>
        </div>
        <div class="stat"><span class="stat-label">Siła:</span> 
            <input type="number" class="stat-value strength" placeholder="Wartość" value="${stats.strength ?? ''}">
            <input class="mod-value strength" placeholder="mod" value="${stats.strengthMod ?? ''}">
            <button class="dice" onclick="rollDice(this, 'strength')">🎲</button>
        </div>
        <div class="stat"><span class="stat-label">Zwinność:</span> 
            <input type="number" class="stat-value agility" placeholder="Wartość" value="${stats.agility ?? ''}">
            <input class="mod-value agility" placeholder="mod" value="${stats.agilityMod ?? ''}">
            <button class="dice" onclick="rollDice(this, 'agility')">🎲</button>
        </div>`;

    if (stats.attunement || type === "adventurer") {
        characterStats += `
        <div class="stat"><span class="stat-label">Dostrojenie:</span> 
            <input type="number" class="stat-value attunement" placeholder="Wartość" value="${stats.attunement ?? ''}">
            <input class="mod-value attunement" placeholder="mod" value="${stats.attunementMod ?? ''}">
            <button class="dice" onclick="rollDice(this, 'attunement')">🎲</button>
        </div>
        <div class="stat"><span class="stat-label">Percepcja:</span> 
            <input type="number" class="stat-value perception" placeholder="Wartość" value="${stats.perception ?? ''}">
            <input class="mod-value perception" placeholder="mod" value="${stats.perceptionMod ?? ''}">
            <button class="dice" onclick="rollDice(this, 'perception')">🎲</button>
        </div>`;
    }

    characterStats += `
        <div class="stat"><span class="stat-label">Celność:</span> 
            <input type="number" class="stat-value accuracy" placeholder="Wartość" value="${stats.accuracy ?? ''}">
            <input class="mod-value accuracy" placeholder="mod" value="${stats.accuracyMod ?? ''}">
            <button class="dice" onclick="rollDice(this, 'accuracy')">🎲</button>
        </div>
        <div class="stat"><span class="stat-label">Refleks:</span> 
            <input type="number" class="stat-value reflex" placeholder="Wartość" value="${stats.reflex ?? ''}">
            <input class="mod-value reflex" placeholder="mod" value="${stats.reflexMod ?? ''}">
            <button class="dice" onclick="rollDice(this, 'reflex')">🎲</button>
        </div>
        <div class="stat"><span class="stat-label">Nieustępliwość:</span> 
            <input type="number" class="stat-value resilience" placeholder="Wartość" value="${stats.resilience ?? ''}">
            <input class="mod-value resilience" placeholder="mod" value="${stats.resilienceMod ?? ''}">
            <button class="dice" onclick="rollDice(this, 'resilience')">🎲</button>
        </div>
        <div class="stat"><span class="stat-label">Obrażenia:</span>
            <input class="stat-value damage" onclick="copyInputValue(this)" placeholder="Wartość" value="${stats.damage ?? ''}">
        </div>
        <div class="stat"><span class="stat-label">Pancerz fizyczny:</span>
            <input type="number" class="stat-value physArmor" placeholder="Wartość" value="${stats.physArmor ?? ''}">
            <input class="mod-value physArmor" placeholder="proc" value="${stats.physArmorMod ?? ''}">
        </div>
        <div class="stat"><span class="stat-label">Pancerz magiczny:</span>
            <input type="number" class="stat-value magArmor" placeholder="Wartość" value="${stats.magArmor ?? ''}">
            <input class="mod-value magArmor" placeholder="proc" value="${stats.magArmorMod ?? ''}">
        </div>
    </div>`;

    return characterStats;
}

function getDamageControls() {
    return `
        <div class="damage-controls">
            <input class="damage-input" placeholder="Obrażenia" >
            <button class="damage-controls-btn" onclick="applyDamage(this, 'phys')">⚒️</button>
            <button class="damage-controls-btn" onclick="applyDamage(this, 'mag')">🔮</button>
            <button class="damage-controls-btn" onclick="applyDamage(this, 'pierce')">🔪</button>
        </div>
        <div class="damage-controls">
            <input class="heal-input" placeholder="Leczenie" >
            <button class="damage-controls-btn" onclick="healDamage(this, 'single')">❤️</button>
            <button class="damage-controls-btn" onclick="healDamage(this, 'threshold')">💝</button>
            <button class="damage-controls-btn" onclick="healDamage(this, 'group')">💕</button>
        </div>
        <div class="damage-controls">
            <button class="armor-toggle-btn" onclick="toggleArmorMode(this)">+</button>
            <input class="armor-input" placeholder="Pancerz">
            <button class="damage-controls-btn" onclick="changeArmor(this, 'phys')">🛡️</button>
            <button class="damage-controls-btn" onclick="changeArmor(this, 'mag')">✨</button>
        </div>
    `;
}

function getCharacterButtons(stats = {}, type) {
    let buttons = '';
    if (stats.name) {
        realStats = type === "player" ? players[stats.name] 
                  : type === "adventurer" ? adventurers[stats.name]
                  : type === "monster" ? monsters[stats.name] 
                  : type === "boss" ? bosses[stats.name]
                  : {};

        // If there are stats and they have abilities, add a button
        if (realStats.abilities && realStats.abilities.length !== 0) {
            buttons += '<button class="abilities-button" onclick="showAbilitiesPanel(this)">📖</button>';
        }
        // If there are stats and they have equipment, add a button
        if (realStats.equipment && realStats.equipment.length !== 0) {
            buttons += '<button class="equipment-button" onclick="showEquipmentPanel(this)">💼</button>';
        }
    }

    buttons += '<button class="stun-button" onclick="toggleStun(this)">🌟</button>';

    if (type === "player")
        buttons += '<button class="reload-button" onclick="reloadPlayer(this)">↻</button>';
    return buttons;
}

async function removeCharacter(button) {
    const characterDiv = button.closest('.character');
    const characterName = characterDiv.querySelector('input[type="text"]').value.trim();

    // Remove conditions related to the character
    let activeConditions = await loadServerActiveConditions();
    activeConditions = activeConditions.filter(condition => condition.target !== characterName);
    await updateServerConditions(activeConditions);

    // Remove character element
    characterDiv.remove();

    // Update sidebar if it's visible
    const sidebar = document.getElementById('Sidebar');
    const sidebarConditions = sidebar.querySelector('.sidebar-conditions');
    if (sidebar && sidebarConditions.style.display === 'flex') {
        sidebarConditions.innerHTML = `<h3>Stany</h3>`;
        activeConditions.forEach(condition => {
            addConditionToSidebar(condition);
        });
    }
}

async function reloadPlayer(button) {
    try {
        const characterDiv = button.closest('.character');
        const playerName = characterDiv.querySelector('input[type="text"]').value;
        characterDiv.remove(); // Remove old character card

        await reloadPlayersScript();

        addCharacter("player", "hero",  players[playerName], playerName); 

        const newCharacterDiv = Array.from(document.querySelectorAll('.character'))
        .find(div => div.querySelector('input[type="text"]').value.trim() === playerName);

        sendPlayerStats(newCharacterDiv); // Update on server
    } catch (error) {
        console.error("Error while reloading players.js:", error);
    }
}

async function reloadPlayersScript() {
    // Remove old script
    const oldScript = document.querySelector('#players-data');
    if (oldScript) {
        oldScript.remove();
    }
    
    return new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.id = 'players-data';
        script.src = 'data/players.js';
        script.onload = resolve; // Script loaded successfully
        script.onerror = () => reject(new Error("Error loading players.js"));
        document.body.appendChild(script);
    });
}