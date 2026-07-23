async function copyInputValue(input, event) {
    // Prevent copying if the input is empty or just whitespaces
    if (!input.value || input.value.trim() === '') return;

    try {
        await navigator.clipboard.writeText(input.value);
        window.lastCopiedRPGValue = input.value;
        showNotification(`${t('copied')} ${input.value}`, event);
    } catch (err) {
        console.error("Failed to copy text: ", err);
        showNotification(t('copy_error'), event);
    }
}

async function copyValue(value, event) {
    try {
        if (typeof value === "number") await navigator.clipboard.writeText(value.toString());
        else await navigator.clipboard.writeText(value);

        window.lastCopiedRPGValue = typeof value === "number" ? value.toString() : value;
        showNotification(`${t('copied')} ${value}`, event);
    } catch (err) {
        console.error("Failed to copy text: ", err);
        showNotification(t('copy_error'), event);
    }
}

function pasteValueToInput(input, event) {
    const val = window.lastCopiedRPGValue;
    if (!val) return;
    
    const trimmed = val.trim();
    input.value = trimmed;
    
    // Trigger generic DOM events in case other scripts/listeners depend on them
    input.dispatchEvent(new Event('change', { bubbles: true }));
    
    // Clear both local memory and system clipboard to execute a true Cut-and-Paste action
    window.lastCopiedRPGValue = null;
    try {
        navigator.clipboard.writeText('');
    } catch (err) {
        console.error("Failed to clear system clipboard: ", err);
    }

    if (typeof showNotification === 'function') {
        showNotification(`${t('pasted')} ${trimmed}`, event);
    }
}

function showNotification(message, event = null) {
    const notification = document.createElement('div');
    notification.className = 'copy-notification';
    notification.textContent = message;
    
    // Hide initially to measure elements offset dimensions accurately before rendering
    notification.style.visibility = 'hidden';
    document.body.appendChild(notification);

    const e = event || window.event;
    let left = 0;
    let top = 0;

    if (e && e.clientX !== undefined && e.clientY !== undefined) {
        left = e.clientX + 15;
        top = e.clientY - 35;

        const notificationWidth = notification.offsetWidth;
        
        // Prevent overflowing the right edge of the viewport
        if (left + notificationWidth > window.innerWidth) {
            left = window.innerWidth - notificationWidth - 15;
        }

        // Prevent overflowing the left edge of the viewport
        if (left < 0) left = 10;

        // Prevent overflowing the top edge of the viewport (flip below cursor if needed)
        if (top < 0) {
            top = e.clientY + 20;
        }
    } else {
        // Fallback positioning if event context is entirely missing
        left = window.innerWidth / 2 - notification.offsetWidth / 2;
        top = 20;
    }

    notification.style.left = `${left}px`;
    notification.style.top = `${top}px`;
    notification.style.visibility = 'visible';

    // Remove notification after 1.2 seconds
    setTimeout(() => {
        notification.remove();
    }, 1200);
}