function toggleStun(button) {
    const characterDiv = button.closest('.character');
    const abilitiesButton = characterDiv.querySelector('.abilities-button');

    // Toggle stun state
    const isStunned = button.classList.toggle('stunned');

    if (isStunned) {
        playSoundEffect('sound/stun.mp3');
        if (abilitiesButton)
        {
            hideActivePanel(); // Hide open panel (if any)
            abilitiesButton.disabled = true;
        } 
    } else if (abilitiesButton) {
        abilitiesButton.disabled = false;
    }

    // Send stun update to server
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
    return translations[roll] || roll; // Default to original name if translation is missing
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

// Merged and cleaned up copyInputValue function
async function copyInputValue(input) {
    try {
        // Write text to clipboard
        await navigator.clipboard.writeText(input.value);
        showNotification(`Skopiowano: ${input.value}`);
    } catch (err) {
        console.error("Failed to copy text: ", err);
        showNotification("Błąd kopiowania!");
    }
}

async function copyToClipboard(value) {
    try {
        if (typeof value === "number") await navigator.clipboard.writeText(value.toString());
        else await navigator.clipboard.writeText(value);

        showNotification(`Skopiowano: ${value}`);
    } catch (err) {
        console.error("Failed to copy text: ", err);
        showNotification("Błąd kopiowania!");
    }
}

async function pasteClipboardToInput(input, event) {
    try {
        // Clear input content
        input.value = '';

        // Get clipboard content and replace
        const clipboardText = await navigator.clipboard.readText();
        input.value = clipboardText;
        await updateConditionTarget(input);

        // Without passing the event, something messes up due to await
        showNotification(`Wklejono: ${clipboardText}`, event); 
    } catch (err) {
        console.error("Failed to read clipboard contents: ", err);
        showNotification("Błąd wklejania z domyślnego schowka!");
    }
}

function showNotification(message, event = null) {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = 'copy-notification';
    notification.textContent = message;

    // Set notification position based on cursor position
    const e = event || window.event;
    if (e) {
        const { clientX: x, clientY: y } = e;
        notification.style.left = `${x + 20}px`;
        notification.style.top = `${y - 50}px`;
    } else {
        // Fallback if event is missing entirely (e.g. lost context after async operations)
        notification.style.left = `50%`;
        notification.style.top = `20px`;
        notification.style.transform = `translateX(-50%)`;
    }

    // Add notification to document
    document.body.appendChild(notification);

    // Remove notification after 1.2 seconds
    setTimeout(() => {
        notification.remove();
    }, 1200);
}

window.isAudioMuted = localStorage.getItem('Muted') === 'true';

function playSoundEffect(src, volume = 0.5) {
    if (window.isAudioMuted) return null;
    
    const audio = new Audio(src);
    audio.volume = volume;
    audio.play().catch(e => console.warn("Audio playback failed:", e));
    return audio;
}