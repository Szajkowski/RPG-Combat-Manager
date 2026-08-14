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

    // Automatically apply entry effects attached directly to the character template
    processAndSendEffects(uniqueName, null, stats, t('effect'), "self");
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

    let resultColor = 'text-neutral';
    let difficultyValue = null;
    if (difficulty && difficulty !== "X") {
        difficultyValue = parseInt(difficulty);
        resultColor = result >= difficultyValue ? 'text-positive' : 'text-negative';
    }

    return { 
        stat: diceType, 
        result: result, 
        color: resultColor, 
        breakdown: [{ stat: diceType, roll: roll, mod: modValue, total: result }],
        difficulty: difficultyValue
    };
}

function performOpposedRoll(attacker, defender, attStatString, defStatString, cachedAttData = null, isHitVsDodge = false) {
    const attStats = parseRollStats(attStatString);
    const defStats = parseRollStats(defStatString);
    
    let attRes = 0;
    let hasAttBase = false;
    let attBreakdown = [];

    if (cachedAttData !== null && cachedAttData !== undefined) {
        attRes = cachedAttData.actualAttRoll;
        attBreakdown = cachedAttData.breakdown;
        hasAttBase = true;
    } else {
        for (let stat of attStats) {
            const base = parseInt(attacker.stats[stat]) || 0;
            if (base > 0) {
                hasAttBase = true;
                const mod = parseInt(attacker.stats[`${stat}Mod`]) || 0;
                const roll = Math.floor(Math.random() * base) + 1;
                const total = Math.max(1, roll + mod);
                attRes += total;
                attBreakdown.push({ stat: stat, roll: roll, mod: mod, total: total });
            }
        }
    }

    let defRes = 0;
    let hasDefBase = false;
    let defBreakdown = [];
    
    for (let stat of defStats) {
        const base = parseInt(defender.stats[stat]) || 0;
        if (base > 0) {
            hasDefBase = true;
            const mod = parseInt(defender.stats[`${stat}Mod`]) || 0;
            const roll = Math.floor(Math.random() * base) + 1;
            const total = Math.max(1, roll + mod);
            defRes += total;
            defBreakdown.push({ stat: stat, roll: roll, mod: mod, total: total });
        }
    }

    // Tie goes to the attacker
    const isSuccess = attRes >= defRes;
    
    // Inject display names conditionally
    const displayAttStat = isHitVsDodge ? 'roll_hit' : attStatString;
    const displayDefStat = isHitVsDodge ? 'roll_dodge' : defStatString;

    return {
        isSuccess: isSuccess,
        actualAttRoll: attRes, // Saved for potential external caching
        attBreakdown: attBreakdown, // Save to pass to cache
        attRoll: { stat: displayAttStat, result: hasAttBase ? attRes : "X", color: isSuccess ? 'text-positive' : 'text-negative', breakdown: attBreakdown },
        defRoll: { stat: displayDefStat, result: hasDefBase ? defRes : "X", color: isSuccess ? 'text-negative' : 'text-positive', breakdown: defBreakdown }
    };
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
    
    // Survival chance is strictly equal to resilience, clamped between 20% and 80%
    const survivalChance = Math.max(20, Math.min(80, resilience));
    
    // Calculate threshold for a 1-100 roll (e.g., 20% chance means rolling 81-100)
    const survivalThreshold = 100 - survivalChance + 1; 

    // Roll 1-100
    const rollResult = Math.floor(Math.random() * 100) + 1;
    const survived = rollResult >= survivalThreshold;

    return {
        survived: survived,
        roll: { 
            stat: "deaths_door", 
            result: rollResult, 
            color: survived ? 'text-positive' : 'text-negative',
            breakdown: [{ stat: "deaths_door", roll: rollResult, mod: 0, total: rollResult }],
            difficulty: survivalThreshold
        }
    };
}

// Helper function to dynamically translate and capitalize potentially combined stats
function translateStat(statStr) {
    if (!statStr) return statStr;
    return parseRollStats(statStr).map(s => {
        const translated = t(s);
        return translated.charAt(0).toUpperCase() + translated.slice(1);
    }).join(' + ');
}

// Helper function to build standard roll pill HTML mapping breakdown values directly to the DOM
function createRollPillHtml(r, animate, team) {
    const breakdownAttr = r.breakdown ? `data-breakdown='${JSON.stringify(r.breakdown)}'` : '';
    const diffAttr = r.difficulty ? `data-difficulty='${r.difficulty}'` : '';
    const teamAttr = team ? `data-team='${team}'` : '';
    
    const diceHtml = animate 
        ? `<div class="mini-dice tumbling ${r.color}" ${breakdownAttr} ${diffAttr} ${teamAttr}></div>` 
        : `<div class="mini-dice ${r.color}" ${breakdownAttr} ${diffAttr} ${teamAttr}>${r.result}</div>`;
        
    const statColorClass = r.stat === 'deaths_door' ? 'text-deaths-door' : '';
    return `<div class="roll-pill"><span class="roll-stat ${statColorClass}">${translateStat(r.stat)}</span>${diceHtml}</div>`;
}

// Tries to append a roll to an existing grouped roll row. Returns true if successful.
function tryAppendToGroupedRoll(event, feed, animate) {
    if (!event.isTargeted || !event.groupId) return false;
    
    const existingRow = feed.querySelector(`.roll-event-row[data-group-id="${event.groupId}"]`);
    if (!existingRow) return false;

    const container = existingRow.querySelector('.targeted-roll-container');
    if (!container) return false;

    const connector = document.createElement('div');
    connector.className = 'targeted-arrow';
    connector.innerHTML = '+'; // Symbol of connection;
    
    const defNameClass = event.defenderTeam === 'hero' ? 'text-hero' : (event.defenderTeam === 'enemy' ? 'text-enemy' : 'text-other');
    const defNameHtml = `<div class="roll-char-name ${defNameClass}" title="${event.defenderName}">${event.defenderName}</div>`;
    const defSingleHtml = (event.defenderSingleRolls || []).map(r => createRollPillHtml(r, animate, event.defenderTeam)).join('');
    
    let clashPillarHtml = '';
    if (event.opposedRolls && event.opposedRolls.length > 0) {
        clashPillarHtml = event.opposedRolls.map(opp => `
            <div class="vs-block">
                ${createRollPillHtml(opp.attRoll, animate, event.attackerTeam)}
                <div class="vs-text" data-i18n="vs">${t('vs')}</div>
                ${createRollPillHtml(opp.defRoll, animate, event.defenderTeam)}
            </div>
        `).join('');
    }

    const defPillar = document.createElement('div');
    defPillar.className = 'roll-pillar';
    defPillar.innerHTML = defNameHtml + clashPillarHtml + defSingleHtml;
    
    container.appendChild(connector);
    container.appendChild(defPillar);
    
    // Animate ONLY the newly appended dice
    if (animate) {
        playDiceSoundDeduplicated(event); 
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
                    // Colors are already built into the classes structure from createRollPillHtml mapping
                    diceEl.textContent = r.result;
                }
            });
        }, 600);
    }
    
    feed.scrollTop = feed.scrollHeight;
    return true;
}

// Builds HTML for a targeted action (Three Pillars concept)
function buildTargetedRollHtml(event, animate) {
    const isSelf = event.attackerName === event.defenderName;

    const nameColorAtt = event.attackerTeam === 'hero' ? 'text-hero' : (event.attackerTeam === 'enemy' ? 'text-enemy' : 'text-other');
    const nameColorDef = event.defenderTeam === 'hero' ? 'text-hero' : (event.defenderTeam === 'enemy' ? 'text-enemy' : 'text-other');

    // Attacker's Pillar (Name on the left + Standalone rolls on the right)
    const attNameHtml = `<div class="roll-char-name ${nameColorAtt}" title="${event.attackerName}">${event.attackerName}</div>`;
    
    const attRolls = [...(event.attackerSingleRolls || [])];
    if (isSelf && event.defenderSingleRolls) {
        // Merge defender rolls directly into attacker pillar if self-targeting
        attRolls.push(...event.defenderSingleRolls);
    }
    
    const attSingleHtml = attRolls.map(r => createRollPillHtml(r, animate, event.attackerTeam)).join('');
    const attPillar = `<div class="roll-pillar">${attNameHtml}${attSingleHtml}</div>`;

    let flowElements = [attPillar];

    // Only generate Defender pillar if it's NOT self-targeted
    if (!isSelf) {
        let clashHtml = '';
        if (event.opposedRolls && event.opposedRolls.length > 0) {
            clashHtml = event.opposedRolls.map(opp => `
                <div class="vs-block">
                    ${createRollPillHtml(opp.attRoll, animate, event.attackerTeam)}
                    <div class="vs-text" data-i18n="vs">${t('vs')}</div>
                    ${createRollPillHtml(opp.defRoll, animate, event.defenderTeam)}
                </div>
            `).join('');
        }

        const defNameHtml = `<div class="roll-char-name ${nameColorDef}" title="${event.defenderName}">${event.defenderName}</div>`;
        const defSingleHtml = (event.defenderSingleRolls || []).map(r => createRollPillHtml(r, animate, event.defenderTeam)).join('');
        const defPillar = `<div class="roll-pillar">${defNameHtml}${clashHtml}${defSingleHtml}</div>`;

        flowElements.push(defPillar);
    }

    return `
        <div class="targeted-roll-container">
            ${flowElements.join('<div class="targeted-arrow">&#10132;</div>')}
        </div>
    `;
}

// Builds HTML for standalone rolls
function buildStandaloneRollHtml(event, animate) {
    const nameColorClass = event.combatantTeam === 'hero' ? 'text-hero' : (event.combatantTeam === 'enemy' ? 'text-enemy' : 'text-other');

    let rollsHtml = '';
    event.rolls.forEach(r => {
        rollsHtml += createRollPillHtml(r, animate, event.combatantTeam);
    });

    return `
        <div class="roll-char-name ${nameColorClass}" title="${event.combatantName}">${event.combatantName}</div>
        <div class="roll-results">
            ${rollsHtml}
        </div>
    `;
}

// Retrieves a flat array of all roll objects mapped within the event structure
function extractAllRollsFromEvent(event) {
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
    return allRolls;
}

// Appends a single roll event visually and triggers animation if requested
function appendRollEvent(event, animate = true) {
    const feed = document.getElementById('rolls-feed');
    if (!feed) return;

    const placeholder = feed.querySelector('.rolls-placeholder');
    if (placeholder) placeholder.remove();

    // Try appending to an existing multi-target group first
    if (tryAppendToGroupedRoll(event, feed, animate)) {
        return;
    }

    const row = document.createElement('div');
    row.className = 'roll-event-row';
    if (event.groupId) row.dataset.groupId = event.groupId; // Tag the row for future group appending
    if (!animate) row.style.animation = 'none';

    if (event.isTargeted) {
        row.innerHTML = buildTargetedRollHtml(event, animate);
    } else {
        row.innerHTML = buildStandaloneRollHtml(event, animate);
    }

    feed.appendChild(row);
    feed.scrollTop = feed.scrollHeight;

    if (animate) {
        playDiceSoundDeduplicated(event); 
        // The CSS dice-tumble animation takes 0.6s. We reveal the numeric result immediately after.
        setTimeout(() => {
            const diceElements = row.querySelectorAll('.mini-dice');
            const allRolls = extractAllRollsFromEvent(event);

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

// --- ROLL BREAKDOWN TOOLTIP LOGIC ---

let breakdownHoverTimeout = null;

function showBreakdownTooltip(anchorEl, breakdownData, difficulty) {
    let tooltip = document.getElementById('roll-breakdown-tooltip');
    if (!tooltip) {
        tooltip = document.createElement('div');
        tooltip.id = 'roll-breakdown-tooltip';
        document.body.appendChild(tooltip);
    }

    // Extract dynamic class colors natively applied from createRollPillHtml
    const diceColorClass = Array.from(anchorEl.classList).find(c => c.startsWith('text-')) || 'text-neutral';
    const team = anchorEl.dataset.team;
    const defaultStatColorClass = team === 'enemy' ? 'text-enemy' : 'text-hero';

    let html = `<div class="breakdown-title">${t('breakdown_title')}</div>`;
    
    // Wrap all rows in a single grid container to align columns globally
    html += `<div class="breakdown-grid">`;
    
    breakdownData.forEach(item => {
        const statName = t(item.stat).charAt(0).toUpperCase() + t(item.stat).slice(1);
        const modPrefix = item.mod > 0 ? '+' : '';
        const statColorClass = item.stat === 'deaths_door' ? 'text-deaths-door' : defaultStatColorClass;
        
        html += `
            <div class="breakdown-row">
                <span class="breakdown-stat ${statColorClass}">${statName}</span>
                <span class="breakdown-math">
                    ${item.roll} <span class="breakdown-hint">(${t('breakdown_roll')})</span> 
                    ${item.mod !== 0 ? ` ${modPrefix}${item.mod} <span class="breakdown-hint">(${t('breakdown_mod')})</span>` : ''}
                </span>
                <span class="breakdown-total ${diceColorClass}">= ${item.total}</span>
            </div>
        `;
    });
    
    if (difficulty) {
        html += `
            <div class="breakdown-divider"></div>
            <div class="breakdown-row">
                <span class="breakdown-stat text-white">${t('breakdown_difficulty')}</span>
                <span></span>
                <span class="breakdown-total text-white">${difficulty}</span>
            </div>
        `;
    }
    
    html += `</div>`;

    tooltip.innerHTML = html;
    tooltip.style.display = 'flex';

    const rect = anchorEl.getBoundingClientRect();
    let left = rect.left + (rect.width / 2) - (tooltip.offsetWidth / 2);
    let top = rect.top - tooltip.offsetHeight - 10;

    // Boundary checks to keep the tooltip on screen
    if (left < 10) left = 10;
    if (left + tooltip.offsetWidth > window.innerWidth - 10) left = window.innerWidth - tooltip.offsetWidth - 10;
    if (top < 10) top = rect.bottom + 10; // Flip below if it goes above the viewport

    tooltip.style.left = `${left}px`;
    tooltip.style.top = `${top}px`;
}

function hideBreakdownTooltip() {
    const tooltip = document.getElementById('roll-breakdown-tooltip');
    if (tooltip) tooltip.style.display = 'none';
}

document.addEventListener('mouseover', (e) => {
    const diceEl = e.target.closest('.mini-dice');
    if (diceEl) {
        const dataStr = diceEl.dataset.breakdown;
        const diffStr = diceEl.dataset.difficulty;
        
        if (dataStr) {
            breakdownHoverTimeout = setTimeout(() => {
                showBreakdownTooltip(diceEl, JSON.parse(dataStr), diffStr);
            }, 1000);
        }
    }
});

document.addEventListener('mouseout', (e) => {
    const diceEl = e.target.closest('.mini-dice');
    if (diceEl) {
        // Ensure we are actually leaving the element entirely
        if (!diceEl.contains(e.relatedTarget)) {
            clearTimeout(breakdownHoverTimeout);
            hideBreakdownTooltip();
        }
    }
});

// Force hide if user clicks anything to prevent tooltip lingering
document.addEventListener('mousedown', () => {
    clearTimeout(breakdownHoverTimeout);
    hideBreakdownTooltip();
});