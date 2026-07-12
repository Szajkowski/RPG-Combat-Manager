function toggleStun(button) {
    const characterDiv = button.closest('.character');
    const abilitiesButton = characterDiv.querySelector('.abilities-button');

    // Przełącz stan stuna
    const isStunned = button.classList.toggle('stunned');

    if (isStunned) {
        const stunAudio = new Audio('sound/stun.mp3');
        stunAudio.volume = 0.5;
        stunAudio.play();
        if (abilitiesButton)
        {
            hideActivePanel(); // schowaj otwarty panel (jesli jakis jest)
            abilitiesButton.disabled = true;
        } 
    } else if (abilitiesButton) {
        abilitiesButton.disabled = false;
    }

    // Wysłanie aktualizacji stuna na serwer
    if (characterDiv.dataset.type === "player") {
        sendPlayerStats(characterDiv);
    }
}

function translateRollName(roll) {
    const translations = {
        vitality: "żywotność",
        intuition: "intuicja",
        strength: "siła",
        agility: "zwinność",
        attunement: "dostrojenie",
        perception: "percepcja",
        accuracy: "celność",
        reflex: "refleks",
        resilience: "nieustępliwość",
    };
    return translations[roll] || roll; // Domyślnie zwróć oryginalną nazwę, jeśli brak tłumaczenia
}

function translateStatName(statName) {
    const translations = {
        intuicji: "intuition",
        nieustępliwości: "resilience",
        siły: "strength",
        żywotności: "vitality",
        dostrojenia: "attunement",
        percepcji: "perception",
        celności: "accuracy",
        zwinności: "agility",
        refleksu: "reflex",
        obrażeń: "damage",
    };
    return translations[statName] || statName;
}

function copyInputValue(input) {
    input.select();
    document.execCommand("copy");

    // Ustawienie kursora na końcu tekstu
    input.setSelectionRange(input.value.length, input.value.length);

    // Wyświetlenie powiadomienia
    showNotification(`Skopiowano: ${input.value}`);
}

function copyInputValue(input) {
    // wpisz tekst do schowka
    navigator.clipboard.writeText(input.value)

    showNotification(`Skopiowano: ${input.value}`);
}

function copyToClipboard(value) {
    if (typeof value === "number") navigator.clipboard.writeText(value.toString());
    else navigator.clipboard.writeText(value);

    showNotification(`Skopiowano: ${value}`);
}

async function pasteClipboardToInput(input, event) {
    // Wyczyść zawartość inputa
    input.value = '';

    // Pobierz zawartość schowka i zamień
    const clipboardText = await navigator.clipboard.readText();
    input.value = clipboardText;
    await updateConditionTarget(input);

    showNotification(`Wklejono: ${clipboardText}`, event); // bez przekazywania eventa cos sie pierniczy w zwiazku z awaitem
}

function showNotification(message, event = null) {
    // Tworzymy element powiadomienia
    const notification = document.createElement('div');
    notification.className = 'copy-notification';
    notification.textContent = message;

    // Ustawiamy pozycję powiadomienia na podstawie pozycji kursora
    const { clientX: x, clientY: y } = event || window.event;

    notification.style.left = `${x + 20}px`;
    notification.style.top = `${y - 50}px`;

    // Dodajemy powiadomienie do dokumentu
    document.body.appendChild(notification);

    // Usuwamy powiadomienie po 2 sekundach
    setTimeout(() => {
        notification.remove();
    }, 1200);
}

