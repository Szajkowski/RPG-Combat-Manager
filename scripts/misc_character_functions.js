// Toggles stun state via the functional column button
function toggleStun() {
    if (!selectedCharacterId) return;
    
    const combatant = activeCombatants.find(c => c.id === selectedCharacterId);
    if (!combatant || combatant.isDead) return;
    
    combatant.isStunned = !combatant.isStunned;
    
    // Broadcast change to server
    syncUpdateCombatant(combatant);
}

async function copyInputValue(input, event) {
    try {
        await navigator.clipboard.writeText(input.value);
        showNotification(`${t('copied')} ${input.value}`, event);
    } catch (err) {
        console.error("Failed to copy text: ", err);
        showNotification(t('copy_error'), event);
    }
}

async function copyToClipboard(value, event) {
    try {
        if (typeof value === "number") await navigator.clipboard.writeText(value.toString());
        else await navigator.clipboard.writeText(value);

        showNotification(`${t('copied')} ${value}`, event);
    } catch (err) {
        console.error("Failed to copy text: ", err);
        showNotification(t('copy_error'), event);
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
        showNotification(`${t('pasted')} ${clipboardText}`, event);
    } catch (err) {
        console.error("Failed to read clipboard contents: ", err);
        showNotification(t('paste_error'));
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

window.isAudioMuted = localStorage.getItem('CombatManager-Muted') === 'true';

function playSoundEffect(src, volume = 0.5) {
    if (window.isAudioMuted) return null;
    
    const audio = new Audio(src);
    audio.volume = volume;
    audio.play().catch(e => console.warn("Audio playback failed:", e));
    return audio;
}