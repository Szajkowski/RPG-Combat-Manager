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
    
    // Clear local memory, but don't touch the clipboard. That way you can paste something once, but also ctrl+v it if you need the value multiple times
    window.lastCopiedRPGValue = null;

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

// Injects dynamic CSS for the custom modal dialogs to avoid missing styles
function injectModalStylesIfNeeded() {
    if (document.getElementById('custom-modal-styles')) return;
    const style = document.createElement('style');
    style.id = 'custom-modal-styles';
    style.innerHTML = `
        .custom-modal-overlay {
            position: fixed; top: 0; left: 0; width: 100vw; height: 100vh;
            background: rgba(40, 42, 54, 0.85); z-index: 9999;
            display: flex; justify-content: center; align-items: center;
            backdrop-filter: blur(2px);
        }
        .custom-modal-box {
            background: #282a36; border: 2px solid #bd93f9; border-radius: 8px;
            padding: 20px; max-width: 400px; text-align: center; color: #f8f8f2;
            box-shadow: 0 4px 15px rgba(0,0,0,0.5); font-family: sans-serif;
        }
        .custom-modal-text { margin-bottom: 20px; line-height: 1.5; font-size: 1rem; }
        .custom-modal-actions { display: flex; justify-content: center; gap: 15px; }
        .custom-modal-btn {
            background: #44475a; color: #f8f8f2; border: 1px solid #6272a4;
            padding: 8px 16px; border-radius: 4px; cursor: pointer; font-size: 0.9rem;
            transition: 0.2s;
        }
        .custom-modal-btn:hover { background: #6272a4; }
        .custom-modal-btn.confirm { background: #bd93f9; color: #282a36; border-color: #bd93f9; font-weight: bold; }
        .custom-modal-btn.confirm:hover { background: #d6b4ff; }
    `;
    document.head.appendChild(style);
}

// Replaces standard window.alert() with a custom non-blocking UI modal
function showAlertDialog(message) {
    const overlay = document.createElement('div');
    overlay.className = 'custom-modal-overlay';
    
    const box = document.createElement('div');
    box.className = 'custom-modal-box';
    
    const text = document.createElement('div');
    text.className = 'custom-modal-text';
    text.innerHTML = message;
    
    const btnContainer = document.createElement('div');
    btnContainer.className = 'custom-modal-actions';
    
    const btn = document.createElement('button');
    btn.className = 'custom-modal-btn confirm';
    btn.textContent = t('btn_ok') || 'OK';
    btn.onclick = () => overlay.remove();
    
    btnContainer.appendChild(btn);
    box.appendChild(text);
    box.appendChild(btnContainer);
    overlay.appendChild(box);
    document.body.appendChild(overlay);
}

// Replaces standard window.confirm() with a custom callback-driven UI modal
function showConfirmDialog(message, onConfirmCallback) {    
    const overlay = document.createElement('div');
    overlay.className = 'custom-modal-overlay';
    
    const box = document.createElement('div');
    box.className = 'custom-modal-box';
    
    const text = document.createElement('div');
    text.className = 'custom-modal-text';
    text.innerHTML = message;
    
    const btnContainer = document.createElement('div');
    btnContainer.className = 'custom-modal-actions';
    
    const btnYes = document.createElement('button');
    btnYes.className = 'custom-modal-btn confirm';
    btnYes.textContent = t('btn_yes') || 'Yes';
    btnYes.onclick = () => {
        overlay.remove();
        if (onConfirmCallback) onConfirmCallback();
    };

    const btnNo = document.createElement('button');
    btnNo.className = 'custom-modal-btn';
    btnNo.textContent = t('btn_no') || 'No';
    btnNo.onclick = () => overlay.remove();
    
    btnContainer.appendChild(btnYes);
    btnContainer.appendChild(btnNo);
    box.appendChild(text);
    box.appendChild(btnContainer);
    overlay.appendChild(box);
    document.body.appendChild(overlay);
}