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
        hpBar.style.background = 'black'; // Czarny, jeśli postać zginęła
        return;
    }

    const hpPercentage = (currentHp / maxHp) * 100;
    hpBar.style.width = '100%';
    hpBar.style.background = `linear-gradient(to right, red ${hpPercentage}%, darkred ${hpPercentage}%)`;
}

function parseDamageAmount(targetDiv) {
    const maxHp = parseInt(targetDiv.querySelector('.max-hp').value) || 0;
    if (healValue.endsWith('%')) { // liczy wartosc hp do uleczenia na podstawie max hp celu
        const percent = parseInt(healValue);
        return Math.ceil((maxHp * percent) / 100); // zaokraglaj w gore procentowe hp
    } else {
        return parseInt(healValue) || 0;
    }
}

function applyDamage(button, type) {
    const characterDiv = button.closest('.character');
    const damageInput = characterDiv.querySelector('.damage-input');
    
    const maxHp = parseInt(characterDiv.querySelector('.max-hp').value) || 0;
    let damage = damageInput.value;
    
    if (damage.endsWith('%')) { // liczy wartosc hp do uderzenia na podstawie hp uderzanego
        const percent = parseInt(damage);
        damage = Math.ceil((maxHp * percent) / 100); // zaokraglaj w gore procentowe hp
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

    const hitAudio = new Audio(damageAfterArmor > 0 ? `sound/${type}_hit.mp3` : 'sound/no_dmg_hit.mp3');
    hitAudio.volume = 0.5;
    hitAudio.play();

    // Sprawdzenie Wrót Śmierci przed odejmowaniem HP
    if (characterDiv.dataset.hasDeathsDoor === "true" && currentHp <= 0 && damageAfterArmor > 0) {
        const survived = handleDeathsDoor(characterDiv);
        if (!survived) {
            currentHpInput.value = 0;
            damageInput.value = ''; // Wyczyść pole po zadaniu obrażeń

            characterDiv.dataset.isDead = "true";
            // robienie updateHpBar dla graczy 2 razy (tu i w sendPlayerStats) wydaje sie troche glupie, ale nie moge z tej funkcji usunac tego. Bo dla postaci nie-graczy musi sie tez robic
            updateHpBar(currentHpInput); 

            if (characterDiv.dataset.type === "player") 
                sendPlayerStats(characterDiv);
            return; // Przerwij funkcję, postać zginęła
        }
    }

    currentHp -= damageAfterArmor;

    // jesli postac nie ma wrot smierci to ginie od razu
    if (characterDiv.dataset.hasDeathsDoor === "false" && currentHp <= 0 && damageAfterArmor > 0) {
        currentHp = 0; // Ustaw HP na 0 po śmierci
        currentHpInput.value = currentHp;
        damageInput.value = ''; // Wyczyść pole po zadaniu obrażeń

        characterDiv.dataset.isDead = "true";
        updateHpBar(currentHpInput); 

        if (characterDiv.dataset.type === "player") 
            sendPlayerStats(characterDiv);
        return;
    }

    currentHpInput.value = currentHp;
    updateHpBar(currentHpInput); // Zaktualizuj pasek zdrowia
    damageInput.value = ''; // Wyczyść pole po zadaniu obrażeń

    if (characterDiv.dataset.type === "player") 
        sendPlayerStats(characterDiv);
}

function handleDeathsDoor(characterDiv) {
    const resilienceInput = characterDiv.querySelector('.stat-value.resilience');
    const resilience = parseInt(resilienceInput?.value) || 0;
    const baseSurvivalChance = 15; // Podstawowa szansa przeżycia
    const survivalThreshold = Math.max(100 - (baseSurvivalChance + resilience), 25); // nie można mieć więcej niż 75% odporności na śmierć

    if (diceAudio) {
        diceAudio.currentTime = 0; // Ustaw czas odtwarzania na początek
        diceAudio.volume = 0.5;
        diceAudio.play();
    }

    // Wykonujemy rzut 1-100
    const rollResult = Math.floor(Math.random() * 100) + 1;

    // Wyświetlamy wynik rzutu
    const bigDice = characterDiv.querySelector('.big-dice');
    bigDice.textContent = `🎲 ${rollResult}`;
    bigDice.style.color = rollResult >= survivalThreshold ? 'green' : 'red';

    if (rollResult < survivalThreshold) {
        // Postać umiera, pasek zdrowia na czarno
        const hpBar = characterDiv.querySelector('.hp-bar');
        hpBar.style.width = '100%';
        hpBar.style.background = 'black';
        return false; // Postać zginęła
    }

    return true; // Postać przeżyła
}

function healDamage(button, type) {
    const characterDiv = button.closest('.character');
    const healInput = characterDiv.querySelector('.heal-input');
    const healValue = healInput.value.trim();

    if (!healValue) {
        return;
    }

    function parseHealAmount(targetDiv) {
        const maxHp = parseInt(targetDiv.querySelector('.max-hp').value) || 0;
        if (healValue.endsWith('%')) { // liczy wartosc hp do uleczenia na podstawie max hp celu
            const percent = parseInt(healValue);
            return Math.ceil((maxHp * percent) / 100); // zaokraglaj w gore procentowe hp
        } else {
            return parseInt(healValue) || 0;
        }
    }

    const healAmount = parseHealAmount(characterDiv);

    function healOneCharacter(targetDiv, healAmount) {
        const currentHpInput = targetDiv.querySelector('.current-hp');
        const maxHp = parseInt(targetDiv.querySelector('.max-hp').value) || 0;
        let currentHp = parseInt(currentHpInput.value) || 0;

        if (type === 'threshold') {
            if (healValue.endsWith('%')) { // leczenie do konkretnego procenta hp
                const thresholdHp = Math.floor((maxHp * parseInt(healValue)) / 100);
                if (currentHp < thresholdHp) {
                    currentHp = thresholdHp;
                } else {
                    return; // Nie leczy, jeśli HP jest już wyższe lub równe
                }
            } else { // leczenie do konkretnej wartosci hp
                const thresholdHp = parseInt(healValue); 
                if (currentHp < thresholdHp) {
                    currentHp = thresholdHp;
                } else {
                    return; // Nie leczy, jeśli HP jest już wyższe lub rowne
                }
            }
        } else {
            currentHp += healAmount;
        }

        if (currentHp > maxHp)
            currentHp = maxHp; // Nie przekraczaj maksymalnego HP

        if (targetDiv.dataset.isDead === "true" && currentCombatRound !== 0) return; // wstac z martwych mozna tylko po walce

        currentHpInput.value = currentHp;
        targetDiv.dataset.isDead = "false";
        updateHpBar(currentHpInput); // Zaktualizuj pasek zdrowia

        if (targetDiv.dataset.type === "player")
            sendPlayerStats(targetDiv);
    }

    if (type === 'group') {
        const isHero = characterDiv.closest('#heroTeam') !== null; // Sprawdź, czy postać jest bohaterem
        const teamSelector = isHero ? '#heroTeam .character' : '#enemyTeam .character';
        const teamMembers = document.querySelectorAll(teamSelector);

        teamMembers.forEach(member => {
            const groupHealAmount = parseHealAmount(member);
            healOneCharacter(member, groupHealAmount);
        });
    } else {
        healOneCharacter(characterDiv, healAmount);
    }

    const healAudio = new Audio(`sound/heal_${type}.mp3`);
    healAudio.volume = 0.5;
    healAudio.play();

    healInput.value = ''; // Wyczyść pole po leczeniu
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

    if (value.endsWith('%')) {  // Obsługa wartości procentowej
        const percentValue = parseInt(value);
        percent = isAdding 
            ? percent + Math.floor((100 - percent) * (percentValue / 100))
            : Math.max(percent - percentValue, 0);

        percentInput.value = percent > 0 ? `${percent}%` : '';
    } else {  // Obsługa wartości płaskiej
        const flatValue = parseInt(value);
        flat = isAdding ? flat + flatValue : Math.max(flat - flatValue, 0);

        flatInput.value = flat;
    }

    const armorAudio = new Audio(isAdding ? `sound/${type}_armor_up.mp3` : `sound/${type}_armor_down.mp3`);
    armorAudio.volume = 0.5;
    armorAudio.play();

    armorInput.value = ''; // Wyczyść pole po zmianie pancerza

    if (characterDiv.dataset.type === "player") {
        sendPlayerStats(characterDiv);
    }
}