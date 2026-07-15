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
        
    // Build character content
    let characterContent = '';
            
    // Determine the source for the image. If 'image' is passed, ask the API. 
    // If it's a blank character, point directly to the default placeholder.
    const imgSrc = image ? `/api/image/${type}/${encodeURIComponent(image)}` : '/images/default-img.svg';
    const imgAlt = image ? image : t('unknown_character');

    // Add the image tag (with an extra onerror fallback just to be absolutely bulletproof)
    characterContent += `<img src="${imgSrc}" alt="${imgAlt}">`;
    
    characterContent += `
        <span class="remove-button" onclick="removeCharacter(this)">✖</span>
        <div class="stat"><strong>${t('name')}:</strong> <input type="text" onclick="copyInputValue(this, event)" value="${uniqueName || ''}"></div>
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

    // Bind dynamic stat recalculation for all characters, network sync is only for player chars though
    bindCharacterInputs(characterDiv, type);

    // Initial sync to server only for players
    if (type === 'player') { 
        updatePlayer(finalStats.name, finalStats);
    }
}

// Calculates core stats (HP, Strength, Agility, etc.) from item description tags
function calculateCoreStatBonuses(stats) {
    const updatedStats = { ...stats };
    if (!stats.equipment || !Array.isArray(stats.equipment)) return updatedStats;

    stats.equipment.forEach(item => {
        if (item.type !== 'gear' || !item.description) return;

        // Extract and process tags like [+2 strength], [-1 agility mod], [+50 hp]
        const statBonuses = item.description.match(/\[([+-]?\d+(?:\.\d+)?)\s+([a-zA-Z0-9_]+)(?:\s+(mod))?\]/gi);
        if (statBonuses) {
            statBonuses.forEach(bonus => {
                const match = bonus.match(/\[([+-]?\d+(?:\.\d+)?)\s+([a-zA-Z0-9_]+)(?:\s+(mod))?\]/i);
                if (match) {
                    const value = parseFloat(match[1]);
                    const statKey = match[2].toLowerCase();
                    const isMod = match[3] ? true : false;

                    // Handle HP specifically (base HP and Max HP)
                    if (statKey === "hp" || statKey === "health") {
                        updatedStats.hp = Math.max(1, (updatedStats.hp || 0) + value);
                        updatedStats.maxHp = Math.max(1, (updatedStats.maxHp || 0) + value);
                    } 
                    // Handle stat modifiers (can drop below 0)
                    else if (isMod) {
                        const modKey = `${statKey}Mod`;
                        updatedStats[modKey] = (updatedStats[modKey] || 0) + value;
                    } 
                    // Handle core stats (minimum value is 1)
                    else {
                        updatedStats[statKey] = Math.max(1, (updatedStats[statKey] || 0) + value);
                        // Vitality secretly adds 10 HP per point
                        if (statKey === "vitality") {
                            updatedStats.hp = Math.max(1, (updatedStats.hp || 0) + 10 * value);
                            updatedStats.maxHp = Math.max(1, (updatedStats.maxHp || 0) + 10 * value);
                        }
                    }
                }
            });
        }
    });

    return updatedStats;
}

// Calculates additional stats (Damage, Armor) using the core stats
function calculateAdditionalStatsBonuses(stats) {
    const updatedStats = { ...stats };
    if (!stats.equipment || !Array.isArray(stats.equipment)) return updatedStats;

    let totalPhysFlat = parseFloat(stats.physArmor) || 0;
    let totalMagFlat = parseFloat(stats.magArmor) || 0;

    // Multipliers start at 1.0 (representing 100% damage taken)
    let physDamageMult = 1.0;
    let magDamageMult = 1.0;

    // Apply native/base character armor percentage from json
    if (stats.physArmorPerc) {
        const basePhysPerc = parseFloat(stats.physArmorPerc);
        physDamageMult *= basePhysPerc > 0 ? (1 - basePhysPerc / 100) : (1 + Math.abs(basePhysPerc) / 100);
    }
    if (stats.magArmorPerc) {
        const baseMagPerc = parseFloat(stats.magArmorPerc);
        magDamageMult *= baseMagPerc > 0 ? (1 - baseMagPerc / 100) : (1 + Math.abs(baseMagPerc) / 100);
    }

    stats.equipment.forEach(item => {
        if (item.type !== 'gear') return;

        // Process Damage (Flat or Formula)
        if (item.damage !== undefined) {
            if (typeof item.damage === 'string' && item.damage.includes('[')) {
                updatedStats.damage = (updatedStats.damage || 0) + evaluateFormula(item.damage, updatedStats);
            } else {
                updatedStats.damage = (updatedStats.damage || 0) + (parseFloat(item.damage) || 0);
            }
        }

        // Process Physical Armor (Flat or Formula)
        if (item.physArmor !== undefined) {
            if (typeof item.physArmor === 'string' && item.physArmor.includes('[')) {
                totalPhysFlat += evaluateFormula(item.physArmor, updatedStats);
            } else {
                totalPhysFlat += (parseFloat(item.physArmor) || 0);
            }
        }

        // Process Physical Armor Percentage (Flat or Formula)
        if (item.physArmorPerc !== undefined) {
            let percVal = 0;
            if (typeof item.physArmorPerc === 'string' && item.physArmorPerc.includes('[')) {
                percVal = evaluateFormula(item.physArmorPerc, updatedStats);
            } else {
                percVal = parseFloat(item.physArmorPerc) || 0;
            }
            physDamageMult *= percVal > 0 ? (1 - percVal / 100) : (1 + Math.abs(percVal) / 100);
        }

        // Process Magical Armor (Flat or Formula)
        if (item.magArmor !== undefined) {
            if (typeof item.magArmor === 'string' && item.magArmor.includes('[')) {
                totalMagFlat += evaluateFormula(item.magArmor, updatedStats);
            } else {
                totalMagFlat += (parseFloat(item.magArmor) || 0);
            }
        }

        // Process Magical Armor Percentage (Flat or Formula)
        if (item.magArmorPerc !== undefined) {
            let percVal = 0;
            if (typeof item.magArmorPerc === 'string' && item.magArmorPerc.includes('[')) {
                percVal = evaluateFormula(item.magArmorPerc, updatedStats);
            } else {
                percVal = parseFloat(item.magArmorPerc) || 0;
            }
            magDamageMult *= percVal > 0 ? (1 - percVal / 100) : (1 + Math.abs(percVal) / 100);
        }
    });

    // Convert damage multipliers back into armor percentages
    const finalPhysPercent = (1 - physDamageMult) * 100;
    const finalMagPercent = (1 - magDamageMult) * 100;

    return {
        ...updatedStats,
        physArmor: Math.round(totalPhysFlat),
        physArmorMod: Math.round(finalPhysPercent) !== 0 ? `${Math.round(finalPhysPercent)}%` : '',
        magArmor: Math.round(totalMagFlat),
        magArmorMod: Math.round(finalMagPercent) !== 0 ? `${Math.round(finalMagPercent)}%` : ''
    };
}

// Master wrapper that runs the full item compilation
function applyGearBonuses(stats) {
    // Run core stats processing
    let updatedStats = calculateCoreStatBonuses(stats);
    
    // Run additional stats processing using the newly boosted core stats
    updatedStats = calculateAdditionalStatsBonuses(updatedStats);

    // Format modifier values to include the '+' sign for UI display
    Object.keys(updatedStats).forEach(key => {
        // Skip formatting the percentage armor strings as they format themselves
        if (key.endsWith("Mod") && key !== "physArmorMod" && key !== "magArmorMod") {
            updatedStats[key] = formatSigned(updatedStats[key]);
        }
    });

    return updatedStats;
}

// Formats modifiers to include a '+' sign for positive values. Handles empty inputs to prevent NaN bugs.
function formatSigned(value) {
    if (value === 0 || value === "0" || value === "" || value === null || value === undefined) return '';
    const floatVal = parseFloat(value);
    if (isNaN(floatVal)) return '';
    return `${floatVal > 0 ? '+' : ''}${floatVal}`;
}

function evaluateFormula(formula, stats) {
    try {
        // Remove square brackets if they were passed in the formula string
        const cleanFormula = formula.replace(/[\[\]]/g, '');

        // Replace stats with values without translation
        const evaluatedFormula = cleanFormula.replace(/\b([a-zA-Z_]+)\b/gi, (stat) => {
            const statValue = stats[stat] !== undefined ? stats[stat] : 0;
            return statValue;
        });

        // Security Check: Only allow digits, basic math operators, dots, and spaces.
        if (!/^[0-9+\-*/().\s]+$/.test(evaluatedFormula)) {
            throw new Error("Formula contains invalid/unsafe characters!");
        }

        // Calculate formula result using secure Function constructor
        // Math.round is used to handle potential decimals from the gear multipliers properly
        const result = Math.round(new Function('return ' + evaluatedFormula)());
        return result;

    } catch (e) {
        console.error(`Error calculating formula: ${formula}`, e);
        return 0;
    }
}

// Binds event listeners to inputs. Handles both UI recalculation and network syncing seamlessly
function bindCharacterInputs(characterDiv, type) {
    // Core inputs trigger recalculation first, then network sync
    const coreInputs = characterDiv.querySelectorAll('.stat-value:not(.damage):not(.physArmor):not(.magArmor), .mod-value:not(.physArmor):not(.magArmor)');
    
    coreInputs.forEach(input => {
        input.addEventListener('input', () => {
            recalculateAdditionalStats(characterDiv);
            
            // Network sync is restricted to player characters only
            if (type === 'player' && typeof sendPlayerStats === 'function') {
                sendPlayerStats(characterDiv);
            }
        });
    });

    // ONLY Additional stat inputs trigger network sync (to prevent infinite calculation loops)
    const additionalInputs = characterDiv.querySelectorAll('.stat-value.damage, .stat-value.physArmor, .stat-value.magArmor, .mod-value.physArmor, .mod-value.magArmor');
    
    additionalInputs.forEach(input => {
        input.addEventListener('input', () => {
            // Network sync is restricted to player characters only
            if (type === 'player' && typeof sendPlayerStats === 'function') {
                sendPlayerStats(characterDiv);
            }
        });
    });
}

// Safely recalculates only Damage and Armor based on the current UI input values
function recalculateAdditionalStats(characterDiv) {
    const nameInput = characterDiv.querySelector('input[type="text"]').value;
    const baseName = removeUniqueNameNumber(nameInput);
    
    // Fetch raw base character data to prevent infinite stacking of item bonuses
    const baseData = players[baseName] || adventurers[baseName] || monsters[baseName] || bosses[baseName];
    if (!baseData || !baseData.equipment || baseData.equipment.length === 0) return;

    // Build a hybrid stat object using the current values typed into the UI
    let currentStats = { equipment: baseData.equipment };

    const getVal = (selector) => {
        const el = characterDiv.querySelector(selector);
        return el ? (parseFloat(el.value) || 0) : 0;
    };

    const statsList = ['vitality', 'intuition', 'strength', 'agility', 'accuracy', 'reflex', 'resilience', 'attunement', 'perception'];
    
    statsList.forEach(stat => {
        currentStats[stat] = getVal(`.stat-value.${stat}`);
        currentStats[`${stat}Mod`] = getVal(`.mod-value.${stat}`);
    });

    // Inject the original base Damage and Armor values (to start with a clean slate before items)
    currentStats.damage = baseData.damage || 0;
    currentStats.physArmor = baseData.physArmor || 0;
    currentStats.magArmor = baseData.magArmor || 0;
    currentStats.physArmorMod = baseData.physArmorMod || 0;
    currentStats.magArmorMod = baseData.magArmorMod || 0;

    // 4. Run ONLY the additional stats calculation!
    const finalStats = calculateAdditionalStatsBonuses(currentStats);

    // 5. Safely update the additional fields in the UI
    const setVal = (selector, val) => {
        const el = characterDiv.querySelector(selector);
        if (el) el.value = val;
    };

    setVal('.stat-value.damage', finalStats.damage);
    setVal('.stat-value.physArmor', finalStats.physArmor);
    setVal('.mod-value.physArmor', finalStats.physArmorMod);
    setVal('.stat-value.magArmor', finalStats.magArmor);
    setVal('.mod-value.magArmor', finalStats.magArmorMod);
}

function getCharacterStats(stats = {}, type) {
    let characterStats = `
    <div class="character-content">
        <div class="bar-container"><div class="bar hp-bar"></div></div>
        <div class="stat">${t('health')}:
            <div class="health-container">
                <input type="number" class="current-hp" oninput="updateHpBar(this)" value="${stats.hp ?? ''}"> / 
                <input type="number" class="max-hp" oninput="updateHpBar(this)" value="${stats.maxHp ?? ''}">
            </div>
        </div>
        ${getDamageControls()}

        <div class="stat"><span class="stat-label">${t('vitality')}:</span> 
            <input type="number" class="stat-value vitality" placeholder="${t('value')}" value="${stats.vitality ?? ''}">
            <input class="mod-value vitality" placeholder="${t('mod')}" value="${stats.vitalityMod ?? ''}">
            <button class="dice" onclick="rollDice(this, 'vitality')">🎲</button>
        </div>
        <div class="stat"><span class="stat-label">${t('intuition')}:</span> 
            <input type="number" class="stat-value intuition" placeholder="${t('value')}" value="${stats.intuition ?? ''}">
            <input class="mod-value intuition" placeholder="${t('mod')}" value="${stats.intuitionMod ?? ''}">
            <button class="dice" onclick="rollDice(this, 'intuition')">🎲</button>
        </div>
        <div class="stat"><span class="stat-label">${t('strength')}:</span> 
            <input type="number" class="stat-value strength" placeholder="${t('value')}" value="${stats.strength ?? ''}">
            <input class="mod-value strength" placeholder="${t('mod')}" value="${stats.strengthMod ?? ''}">
            <button class="dice" onclick="rollDice(this, 'strength')">🎲</button>
        </div>
        <div class="stat"><span class="stat-label">${t('agility')}:</span> 
            <input type="number" class="stat-value agility" placeholder="${t('value')}" value="${stats.agility ?? ''}">
            <input class="mod-value agility" placeholder="${t('mod')}" value="${stats.agilityMod ?? ''}">
            <button class="dice" onclick="rollDice(this, 'agility')">🎲</button>
        </div>`;

    if (stats.attunement || type === "adventurer") {
        characterStats += `
        <div class="stat"><span class="stat-label">${t('attunement')}:</span> 
            <input type="number" class="stat-value attunement" placeholder="${t('value')}" value="${stats.attunement ?? ''}">
            <input class="mod-value attunement" placeholder="${t('mod')}" value="${stats.attunementMod ?? ''}">
            <button class="dice" onclick="rollDice(this, 'attunement')">🎲</button>
        </div>
        <div class="stat"><span class="stat-label">${t('perception')}:</span> 
            <input type="number" class="stat-value perception" placeholder="${t('value')}" value="${stats.perception ?? ''}">
            <input class="mod-value perception" placeholder="${t('mod')}" value="${stats.perceptionMod ?? ''}">
            <button class="dice" onclick="rollDice(this, 'perception')">🎲</button>
        </div>`;
    }

    characterStats += `
        <div class="stat"><span class="stat-label">${t('accuracy')}:</span> 
            <input type="number" class="stat-value accuracy" placeholder="${t('value')}" value="${stats.accuracy ?? ''}">
            <input class="mod-value accuracy" placeholder="${t('mod')}" value="${stats.accuracyMod ?? ''}">
            <button class="dice" onclick="rollDice(this, 'accuracy')">🎲</button>
        </div>
        <div class="stat"><span class="stat-label">${t('reflex')}:</span> 
            <input type="number" class="stat-value reflex" placeholder="${t('value')}" value="${stats.reflex ?? ''}">
            <input class="mod-value reflex" placeholder="${t('mod')}" value="${stats.reflexMod ?? ''}">
            <button class="dice" onclick="rollDice(this, 'reflex')">🎲</button>
        </div>
        <div class="stat"><span class="stat-label">${t('resilience')}:</span> 
            <input type="number" class="stat-value resilience" placeholder="${t('value')}" value="${stats.resilience ?? ''}">
            <input class="mod-value resilience" placeholder="${t('mod')}" value="${stats.resilienceMod ?? ''}">
            <button class="dice" onclick="rollDice(this, 'resilience')">🎲</button>
        </div>
        <div class="stat"><span class="stat-label">${t('damage')}:</span>
            <input class="stat-value damage" onclick="copyInputValue(this, event)" placeholder="${t('value')}" value="${stats.damage ?? ''}">
        </div>
        <div class="stat"><span class="stat-label">${t('phys_armor')}:</span>
            <input type="number" class="stat-value physArmor" placeholder="${t('value')}" value="${stats.physArmor ?? ''}">
            <input class="mod-value physArmor" placeholder="${t('proc')}" value="${stats.physArmorMod ?? ''}">
        </div>
        <div class="stat"><span class="stat-label">${t('mag_armor')}:</span>
            <input type="number" class="stat-value magArmor" placeholder="${t('value')}" value="${stats.magArmor ?? ''}">
            <input class="mod-value magArmor" placeholder="${t('proc')}" value="${stats.magArmorMod ?? ''}">
        </div>
    </div>`;

    return characterStats;
}

function getDamageControls() {
    return `
        <div class="damage-controls">
            <input class="damage-input" placeholder="${t('damage')}" >
            <button class="damage-controls-btn" onclick="applyDamage(this, 'phys')">⚒️</button>
            <button class="damage-controls-btn" onclick="applyDamage(this, 'mag')">🔮</button>
            <button class="damage-controls-btn" onclick="applyDamage(this, 'pierce')">🔪</button>
        </div>
        <div class="damage-controls">
            <input class="heal-input" placeholder="${t('heal')}" >
            <button class="damage-controls-btn" onclick="healDamage(this, 'single')">❤️</button>
            <button class="damage-controls-btn" onclick="healDamage(this, 'threshold')">💝</button>
            <button class="damage-controls-btn" onclick="healDamage(this, 'group')">💕</button>
        </div>
        <div class="damage-controls">
            <button class="armor-toggle-btn" onclick="toggleArmorMode(this)">+</button>
            <input class="armor-input" placeholder="${t('armor')}">
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
        sidebarConditions.innerHTML = `<h3>${t('conditions')}</h3>`;
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