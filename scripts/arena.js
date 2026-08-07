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
        isDead: finalStats.isDead === true || finalStats.isDead === "true",
        hasDeathsDoor: finalStats.hasDeathsDoor === true || finalStats.hasDeathsDoor === "true",
        turnsTakenThisRound: 0, // Swapped from hasActedThisRound
        isStunned: false
    };

    // Push to server -> which will broadcast it back to everyone (including GM) and trigger renderToken()
    syncAddCombatant(combatant);

    // Automatically apply entry conditions attached directly to the character template
    processAndSendConditions(uniqueName, null, stats, t('condition'), "self");
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
        <div class="token-stun-icon ${combatant.isStunned ? 'visible' : ''}">💫</div>
        <button class="token-delete-btn" onclick="removeCharacterById('${combatant.id}', event)" title="${t('remove_character')}">✖</button>
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

// Returns only the result and color as an object (payload), without sending to the server.
// Prepared for integration with more complex rolls.
function rollDice(combatantId, diceType, difficulty = null) {
    const combatant = activeCombatants.find(c => c.id === combatantId);
    if (!combatant) return null;

    const baseStat = parseInt(combatant.stats[diceType]) || 0;
    const modValue = parseInt(combatant.stats[`${diceType}Mod`]) || 0;

    // Safely check if stat exists at all
    if (combatant.stats[diceType] === undefined && combatant.stats[`${diceType}Mod`] === undefined) {
        showAlertDialog(t('no_stats_error'));
        return null;
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

    return { stat: diceType, result: result, color: resultColor };
}

// Wrapper to execute and broadcast a single roll directly from the character sheet
function rollSingleStat(combatantId, diceType, difficulty = null) {
    const combatant = activeCombatants.find(c => c.id === combatantId);
    if (!combatant) return;

    const rollData = rollDice(combatantId, diceType, difficulty);
    if (!rollData) return;

    const rollEvent = {
        id: 'roll-' + Date.now() + '-' + Math.random().toString(36).substr(2, 5),
        combatantId: combatant.id,
        combatantName: combatant.uniqueName,
        combatantTeam: combatant.team, // Added for easy color identification on the rolls panel
        rolls: [ rollData ]
    };
    
    // Instantly broadcast the roll to all clients
    syncAddRollEvent(rollEvent);
}

// Renders the entire rolls feed history
function renderRollsFeed(history) {
    const feed = document.getElementById('rolls-feed');
    if (!feed) return;

    feed.innerHTML = '';
    if (history.length === 0) {
        feed.innerHTML = `<div class="rolls-placeholder" data-i18n="placeholder_no_rolls">${t('placeholder_no_rolls')}</div>`;
        return;
    }

    history.forEach(event => appendRollEvent(event, false));
    feed.scrollTop = feed.scrollHeight;
}

// Performs actual randomized dice rolls resolving opposing interactions and supports caching the first roll across mass actions
function performOpposedRoll(attacker, defender, attStatName, defStatName, cachedAttRoll = null, isHitVsDodge = false) {
    const attBase = parseInt(attacker.stats[attStatName]) || 0;
    const defBase = parseInt(defender.stats[defStatName]) || 0;

    let attRes = 0, defRes = 0;

    if (cachedAttRoll !== null && cachedAttRoll !== undefined) {
        attRes = cachedAttRoll;
    } else if (attBase > 0) {
        const attMod = parseInt(attacker.stats[`${attStatName}Mod`]) || 0;
        attRes = Math.max(1, Math.floor(Math.random() * attBase) + 1 + attMod);
    }

    if (defBase > 0) {
        const defMod = parseInt(defender.stats[`${defStatName}Mod`]) || 0;
        defRes = Math.max(1, Math.floor(Math.random() * defBase) + 1 + defMod);
    }

    // Tie goes to the attacker
    const isSuccess = attRes >= defRes;
    
    // Inject display names conditionally
    const displayAttStat = isHitVsDodge ? 'roll_hit' : attStatName;
    const displayDefStat = isHitVsDodge ? 'roll_dodge' : defStatName;

    return {
        isSuccess: isSuccess,
        actualAttRoll: attRes, // Saved for potential external caching
        attRoll: { stat: displayAttStat, result: attBase > 0 ? attRes : "X", color: isSuccess ? '#50fa7b' : '#ff5555' },
        defRoll: { stat: displayDefStat, result: defBase > 0 ? defRes : "X", color: isSuccess ? '#ff5555' : '#50fa7b' }
    };
}

// Small helper mapping structure matching the broadcast event payload exactly
function buildRollEvent(attacker, target, rollsObj, payload = null, skipSync = false) {
    return {
        id: 'roll-' + Date.now() + '-' + Math.random().toString(36).substr(2, 5),
        groupId: payload ? payload.stepId : null,
        isTargeted: true, 
        isAuto: skipSync, 
        attackerName: attacker.uniqueName,
        attackerTeam: attacker.team,
        defenderName: target.uniqueName,
        defenderTeam: target.team,
        attackerSingleRolls: rollsObj.attackerSingleRolls,
        opposedRolls: rollsObj.opposedRolls,
        defenderSingleRolls: rollsObj.defenderSingleRolls
    };
}

// Rolls Death's Door chance for the combatant and returns the result object. DOES NOT broadcast to server independently!
function rollDeathsDoor(combatant) {
    const resilience = parseInt(combatant.stats.resilience) || 0;
    const baseSurvivalChance = 15; // Base survival chance
    // cannot have more than 75% death resistance
    const survivalThreshold = Math.max(100 - (baseSurvivalChance + resilience), 25); 

    // Roll 1-100
    const rollResult = Math.floor(Math.random() * 100) + 1;
    const survived = rollResult >= survivalThreshold;

    return {
        survived: survived,
        roll: { stat: "deaths_door", result: rollResult, color: survived ? '#50fa7b' : '#ff5555' }
    };
}

// Appends a single roll event visually and triggers animation if requested
function appendRollEvent(event, animate = true) {
    const feed = document.getElementById('rolls-feed');
    if (!feed) return;

    const placeholder = feed.querySelector('.rolls-placeholder');
    if (placeholder) placeholder.remove();

    // Helper function to dynamically capitalize the first letter of the translated stat name
    const capitalize = (str) => {
        if (!str) return str;
        return str.charAt(0).toUpperCase() + str.slice(1);
    };

    // Helper functions to build standard roll pill HTML
    const createDiceHtml = (r) => animate ? `<div class="mini-dice tumbling"></div>` : `<div class="mini-dice" style="color: ${r.color};">${r.result}</div>`;
    const createPillHtml = (r) => `<div class="roll-pill"><span class="roll-stat">${capitalize(t(r.stat))}</span>${createDiceHtml(r)}</div>`;

    // Helper functions to prevent multiple diceroll sounds in a single action
    const playDiceSoundDeduplicated = () => {
        let shouldPlayDiceSound = true;
        
        // Deduplicate sound ONLY for auto-actions (e.g., group targets) to play once per group
        // Manual actions (like multi-target clicks) will play sound for every individual target clicked
        if (event.isAuto && event.groupId) {
            const diceSoundKey = `dice-${event.groupId}`;
            if (!window.playedStepSounds) window.playedStepSounds = new Set();
            
            if (window.playedStepSounds.has(diceSoundKey)) {
                shouldPlayDiceSound = false; // A character from this group did already trigger the diceroll sound
            } else {
                window.playedStepSounds.add(diceSoundKey);
                setTimeout(() => window.playedStepSounds.delete(diceSoundKey), 5000);
            }
        }
        
        if (shouldPlayDiceSound) {
            playSoundEffect('sound/diceroll.mp3');
        }
    };

    // MULTI-TARGET GROUPING LOGIC: If this event belongs to a grouped action, append it to the existing row instead of making a new one
    if (event.isTargeted && event.groupId) {
        const existingRow = feed.querySelector(`.roll-event-row[data-group-id="${event.groupId}"]`);
        if (existingRow) {
            const container = existingRow.querySelector('.targeted-roll-container');
            if (container) {
                const ampersand = document.createElement('div');
                ampersand.className = 'targeted-arrow';
                ampersand.innerHTML = '&amp;'; // Symbol of connection
                
                const defNameColor = event.defenderTeam === 'hero' ? '#8be9fd' : (event.defenderTeam === 'enemy' ? '#ff5555' : '#bd93f9');
                const defNameHtml = `<div class="roll-char-name" style="color: ${defNameColor};" title="${event.defenderName}">${event.defenderName}</div>`;
                const defSingleHtml = (event.defenderSingleRolls || []).map(createPillHtml).join('');
                
                let clashPillarHtml = '';
                if (event.opposedRolls && event.opposedRolls.length > 0) {
                    clashPillarHtml = event.opposedRolls.map(opp => `
                        <div class="vs-block">
                            ${createPillHtml(opp.attRoll)}
                            <div class="vs-text" data-i18n="vs">${t('vs')}</div>
                            ${createPillHtml(opp.defRoll)}
                        </div>
                    `).join('');
                }

                const defPillar = document.createElement('div');
                defPillar.className = 'roll-pillar';
                defPillar.innerHTML = defNameHtml + clashPillarHtml + defSingleHtml;
                
                container.appendChild(ampersand);
                container.appendChild(defPillar);
                
                // Animate ONLY the newly appended dice
                if (animate) {
                    playDiceSoundDeduplicated(); 
                    setTimeout(() => {
                        const newDice = defPillar.querySelectorAll('.mini-dice');
                        let targetRolls = [];
                        if (event.opposedRolls) {
                            event.opposedRolls.forEach(opp => targetRolls.push(opp.attRoll, opp.defRoll));
                        }
                        if (event.defenderSingleRolls) targetRolls.push(...event.defenderSingleRolls);

                        newDice.forEach((diceEl, index) => {
                            const r = targetRolls[index];
                            if (r) {
                                diceEl.classList.remove('tumbling');
                                diceEl.style.color = r.color;
                                diceEl.textContent = r.result;
                            }
                        });
                    }, 600);
                }
                
                feed.scrollTop = feed.scrollHeight;
                return; // Stop execution here, we successfully appended to a group
            }
        }
    }

    const row = document.createElement('div');
    row.className = 'roll-event-row';
    if (event.groupId) row.dataset.groupId = event.groupId; // Tag the row for future group appending
    if (!animate) row.style.animation = 'none';

    // Dynamic Narrative Flow Rendering for targeted (combat) actions utilizing the Three Pillars concept
    if (event.isTargeted) {
        const isSelf = event.attackerName === event.defenderName;

        const nameColorAtt = event.attackerTeam === 'hero' ? '#8be9fd' : (event.attackerTeam === 'enemy' ? '#ff5555' : '#bd93f9');
        const nameColorDef = event.defenderTeam === 'hero' ? '#8be9fd' : (event.defenderTeam === 'enemy' ? '#ff5555' : '#bd93f9');

        // Attacker's Pillar (Name on the left + Standalone rolls on the right)
        const attNameHtml = `<div class="roll-char-name" style="color: ${nameColorAtt};" title="${event.attackerName}">${event.attackerName}</div>`;
        
        const attRolls = [...(event.attackerSingleRolls || [])];
        if (isSelf && event.defenderSingleRolls) {
            // Merge defender rolls directly into attacker pillar if self-targeting
            attRolls.push(...event.defenderSingleRolls);
        }
        
        const attSingleHtml = attRolls.map(createPillHtml).join('');
        const attPillar = `<div class="roll-pillar">${attNameHtml}${attSingleHtml}</div>`;

        let flowElements = [attPillar];

        // Only generate Defender pillar if it's NOT self-targeted
        if (!isSelf) {
            let clashHtml = '';
            if (event.opposedRolls && event.opposedRolls.length > 0) {
                clashHtml = event.opposedRolls.map(opp => `
                    <div class="vs-block">
                        ${createPillHtml(opp.attRoll)}
                        <div class="vs-text" data-i18n="vs">${t('vs')}</div>
                        ${createPillHtml(opp.defRoll)}
                    </div>
                `).join('');
            }

            const defNameHtml = `<div class="roll-char-name" style="color: ${nameColorDef};" title="${event.defenderName}">${event.defenderName}</div>`;
            const defSingleHtml = (event.defenderSingleRolls || []).map(createPillHtml).join('');
            const defPillar = `<div class="roll-pillar">${defNameHtml}${clashHtml}${defSingleHtml}</div>`;

            flowElements.push(defPillar);
        }

        row.innerHTML = `
            <div class="targeted-roll-container">
                ${flowElements.join('<div class="targeted-arrow">&#10132;</div>')}
            </div>
        `;
    } 
    // Rendering for standard standalone rolls (e.g., purely clicking "ROLL" from UI)
    else {
        const nameColor = event.combatantTeam === 'hero' ? '#8be9fd' : (event.combatantTeam === 'enemy' ? '#ff5555' : '#bd93f9');

        let rollsHtml = '';
        event.rolls.forEach(r => {
            rollsHtml += createPillHtml(r);
        });

        row.innerHTML = `
            <div class="roll-char-name" style="color: ${nameColor};" title="${event.combatantName}">${event.combatantName}</div>
            <div class="roll-results">
                ${rollsHtml}
            </div>
        `;
    }

    feed.appendChild(row);
    feed.scrollTop = feed.scrollHeight;

    if (animate) {
        playDiceSoundDeduplicated(); 
        // The CSS dice-tumble animation takes 0.6s. We reveal the numeric result immediately after.
        setTimeout(() => {
            const diceElements = row.querySelectorAll('.mini-dice');
            
            // Build a flat array of all rolls dynamically based on the event structure to map to the HTML elements
            let allRolls = [];
            if (event.isTargeted) {
                const isSelf = event.attackerName === event.defenderName;
                if (event.attackerSingleRolls) allRolls.push(...event.attackerSingleRolls);
                
                if (!isSelf) {
                    if (event.opposedRolls) {
                        event.opposedRolls.forEach(opp => {
                            allRolls.push(opp.attRoll, opp.defRoll);
                        });
                    }
                    if (event.defenderSingleRolls) allRolls.push(...event.defenderSingleRolls);
                } else {
                    if (event.defenderSingleRolls) allRolls.push(...event.defenderSingleRolls);
                }
            } else {
                allRolls = event.rolls;
            }

            diceElements.forEach((diceEl, index) => {
                const r = allRolls[index];
                if (r) {
                    diceEl.classList.remove('tumbling');
                    diceEl.style.color = r.color;
                    diceEl.textContent = r.result;
                }
            });
        }, 600);
    }
}