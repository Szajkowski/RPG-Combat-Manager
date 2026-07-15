function updateHpBar(input) {
    const characterDiv = input.closest('.character');

    const currentHpInput = characterDiv.querySelector('.current-hp');
    const maxHpInput = characterDiv.querySelector('.max-hp');
    const hpBar = characterDiv.querySelector('.hp-bar');

    const currentHp = parseInt(currentHpInput.value) || 0;
    const maxHp = parseInt(maxHpInput.value) || 0;

    if (isNaN(currentHp) || isNaN(maxHp) || maxHp <= 0) {
        hpBar.style.width = '100%';
        hpBar.style.background = 'black';
        return;
    }

    const isDead = characterDiv.dataset.isDead === "true";

    if (isDead) {
        hpBar.style.width = '100%';
        hpBar.style.background = 'black'; // Black if the character is dead
        return;
    }

    const hpPercentage = (currentHp / maxHp) * 100;
    hpBar.style.width = '100%';
    hpBar.style.background = `linear-gradient(to right, red ${hpPercentage}%, darkred ${hpPercentage}%)`;
}

function parseDamageAmount(targetDiv, damageValue) {
    const maxHp = parseInt(targetDiv.querySelector('.max-hp').value) || 0;
    if (damageValue.endsWith('%')) { // calculate HP damage value based on target's max HP
        const percent = parseInt(damageValue);
        return Math.ceil((maxHp * percent) / 100); // round up percentage HP
    } else {
        return parseInt(damageValue) || 0;
    }
}

function applyDamage(button, type) {
    const characterDiv = button.closest('.character');
    const damageInput = characterDiv.querySelector('.damage-input');

    // Ignore damage requests if the character is already dead
    if (characterDiv.dataset.isDead === "true") {
        damageInput.value = '';
        return;
    }
    
    const maxHp = parseInt(characterDiv.querySelector('.max-hp').value) || 0;
    let damage = damageInput.value;
    
    if (damage.endsWith('%')) { // calculate HP damage value based on attacked character's max HP
        const percent = parseInt(damage);
        damage = Math.ceil((maxHp * percent) / 100); // round up percentage HP
    } else
        damage = parseInt(damage) || 0;

    if (damage <= 0) return;
    
    const currentHpInput = characterDiv.querySelector('.current-hp');
    let currentHp = parseInt(currentHpInput.value) || 0;

    let damageAfterArmor = damage;
    if (type === 'phys' || type === 'mag') {
        const armorFlatInput = characterDiv.querySelector(`.stat-value.${type}Armor`);
        const armorPercentInput = characterDiv.querySelector(`.mod-value.${type}Armor`);
        const armorFlat = parseInt(armorFlatInput.value) || 0;
        const armorPercent = parseInt(armorPercentInput.value) || 0;

        damageAfterArmor *= (100 - armorPercent) / 100;
        damageAfterArmor = Math.ceil(damageAfterArmor - armorFlat);
    }
    damageAfterArmor = Math.max(damageAfterArmor, 0);

    playSoundEffect(damageAfterArmor > 0 ? `sound/${type}_hit.mp3` : 'sound/no_dmg_hit.mp3');

    // Check Death's Door before subtracting HP
    if (characterDiv.dataset.hasDeathsDoor === "true" && currentHp <= 0 && damageAfterArmor > 0) {
        const survived = handleDeathsDoor(characterDiv);
        if (!survived) {
            currentHpInput.value = 0;
            damageInput.value = ''; // Clear field after dealing damage

            characterDiv.dataset.isDead = "true";
            // running updateHpBar for players 2 times (here and in sendPlayerStats) seems a bit silly, but I can't remove it from this function. Because it must also run for non-player characters
            updateHpBar(currentHpInput); 

            if (characterDiv.dataset.type === "player") 
                sendPlayerStats(characterDiv);
            return; // Interrupt function, character died
        }
    }

    currentHp -= damageAfterArmor;

    // if the character doesn't have Death's Door, they die immediately
    if (characterDiv.dataset.hasDeathsDoor === "false" && currentHp <= 0 && damageAfterArmor > 0) {
        currentHp = 0; // Set HP to 0 after death
        currentHpInput.value = currentHp;
        damageInput.value = ''; // Clear field after dealing damage

        characterDiv.dataset.isDead = "true";
        updateHpBar(currentHpInput); 

        if (characterDiv.dataset.type === "player") 
            sendPlayerStats(characterDiv);
        return;
    }

    currentHpInput.value = currentHp;
    updateHpBar(currentHpInput); // Update health bar
    damageInput.value = ''; // Clear field after dealing damage

    if (characterDiv.dataset.type === "player") 
        sendPlayerStats(characterDiv);
}

function handleDeathsDoor(characterDiv) {
    const resilienceInput = characterDiv.querySelector('.stat-value.resilience');
    const resilience = parseInt(resilienceInput?.value) || 0;
    const baseSurvivalChance = 15; // Base survival chance
    const survivalThreshold = Math.max(100 - (baseSurvivalChance + resilience), 25); // cannot have more than 75% death resistance

    playSoundEffect('sound/diceroll.mp3');

    // Roll 1-100
    const rollResult = Math.floor(Math.random() * 100) + 1;

    // Display roll result
    const bigDice = characterDiv.querySelector('.big-dice');
    bigDice.textContent = `🎲 ${rollResult}`;
    bigDice.style.color = rollResult >= survivalThreshold ? 'green' : 'red';

    if (rollResult < survivalThreshold) {
        // Character dies, health bar turns black
        const hpBar = characterDiv.querySelector('.hp-bar');
        hpBar.style.width = '100%';
        hpBar.style.background = 'black';
        return false; // Character died
    }

    return true; // Character survived
}

function parseHealAmount(targetDiv, healValue) {
    const maxHp = parseInt(targetDiv.querySelector('.max-hp').value) || 0;
    if (healValue.endsWith('%')) { // calculate HP heal value based on target's max HP
        const percent = parseInt(healValue);
        return Math.ceil((maxHp * percent) / 100); // round up percentage HP
    } else {
        return parseInt(healValue) || 0;
    }
}

function healOneCharacter(targetDiv, healAmount, type, healValue) {
    const currentHpInput = targetDiv.querySelector('.current-hp');
    const maxHp = parseInt(targetDiv.querySelector('.max-hp').value) || 0;
    let currentHp = parseInt(currentHpInput.value) || 0;

    if (type === 'threshold') {
        if (healValue.endsWith('%')) { // healing up to a specific percentage of HP
            const thresholdHp = Math.floor((maxHp * parseInt(healValue)) / 100);
            if (currentHp < thresholdHp) {
                currentHp = thresholdHp;
            } else {
                return; // Does not heal if HP is already higher or equal
            }
        } else { // healing up to a specific HP value
            const thresholdHp = parseInt(healValue); 
            if (currentHp < thresholdHp) {
                currentHp = thresholdHp;
            } else {
                return; // Does not heal if HP is already higher or equal
            }
        }
    } else {
        currentHp += healAmount;
    }

    if (currentHp > maxHp)
        currentHp = maxHp; // Do not exceed maximum HP

    if (targetDiv.dataset.isDead === "true" && currentCombatRound !== 0) return; // rising from the dead is only possible after combat

    currentHpInput.value = currentHp;
    targetDiv.dataset.isDead = "false";
    updateHpBar(currentHpInput); // Update health bar

    if (targetDiv.dataset.type === "player")
        sendPlayerStats(targetDiv);
}

function healDamage(button, type) {
    const characterDiv = button.closest('.character');
    const healInput = characterDiv.querySelector('.heal-input');
    const healValue = healInput.value.trim();

    if (!healValue) {
        return;
    }

    const healAmount = parseHealAmount(characterDiv, healValue);

    if (type === 'group') {
        const isHero = characterDiv.closest('#heroTeam') !== null; // Check if the character is a hero
        const teamSelector = isHero ? '#heroTeam .character' : '#enemyTeam .character';
        const teamMembers = document.querySelectorAll(teamSelector);

        teamMembers.forEach(member => {
            const groupHealAmount = parseHealAmount(member, healValue);
            healOneCharacter(member, groupHealAmount, type, healValue);
        });
    } else {
        healOneCharacter(characterDiv, healAmount, type, healValue);
    }

    playSoundEffect(`sound/heal_${type}.mp3`);

    healInput.value = ''; // Clear field after healing
}

function toggleArmorMode(button) {
    button.textContent = button.textContent === "+" ? "-" : "+";
}

function changeArmor(button, type) {
    const characterDiv = button.closest('.character');
    const flatInput = characterDiv.querySelector(`.stat-value.${type}Armor`);
    const percentInput = characterDiv.querySelector(`.mod-value.${type}Armor`);
    const armorInput = characterDiv.querySelector('.armor-input');
    const mode = characterDiv.querySelector('.armor-toggle-btn').textContent;
    const isAdding = mode === "+";

    let value = armorInput.value.trim();
    if (!value) return;

    let flat = parseInt(flatInput.value) || 0;
    let percent = parseInt(percentInput.value) || 0;

    if (value.endsWith('%')) {  // Handle percentage value
        const percentValue = parseInt(value);
        percent = isAdding 
            ? percent + Math.floor((100 - percent) * (percentValue / 100))
            : Math.max(percent - percentValue, 0);

        percentInput.value = percent > 0 ? `${percent}%` : '';
    } else {  // Handle flat value
        const flatValue = parseInt(value);
        flat = isAdding ? flat + flatValue : Math.max(flat - flatValue, 0);

        flatInput.value = flat;
    }

    playSoundEffect(isAdding ? `sound/${type}_armor_up.mp3` : `sound/${type}_armor_down.mp3`);
    armorAudio.volume = 0.5;
    armorAudio.play();

    armorInput.value = ''; // Clear field after armor change

    if (characterDiv.dataset.type === "player") {
        sendPlayerStats(characterDiv);
    }
}