// --- COPYING AND PASTING ---

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

// --- NOTIFICATIONS ---

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

// Replaces standard window.alert() with a custom non-blocking UI modal
// Uses a single global overlay and prevents identical messages from stacking
function showAlertDialog(message) {
    return new Promise((resolve) => {
        let overlay = document.getElementById('global-modal-overlay');
        
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.id = 'global-modal-overlay';
            overlay.className = 'custom-modal-overlay';
            // Force flex direction to stack multiple different alerts vertically if they occur
            overlay.style.flexDirection = 'column'; 
            overlay.style.gap = '15px';
            document.body.appendChild(overlay);
        } else {
            // Prevent duplicate identical alerts from spawning (e.g. repeated connection errors)
            const existingTexts = Array.from(overlay.querySelectorAll('.custom-modal-text')).map(el => el.innerHTML);
            if (existingTexts.includes(message)) {
                resolve();
                return;
            }
        }

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
        
        // Resolve the promise and clean up when the user dismisses the dialog
        btn.onclick = () => {
            box.remove();
            if (overlay.childNodes.length === 0) overlay.remove();
            resolve();
        };
        
        btnContainer.appendChild(btn);
        box.appendChild(text);
        box.appendChild(btnContainer);
        overlay.appendChild(box);
    });
}

// Replaces standard window.confirm() with a custom callback-driven UI modal
// Uses a single global overlay and prevents identical messages from stacking
function showConfirmDialog(message, onConfirmCallback) {
    let overlay = document.getElementById('global-modal-overlay');
    
    if (!overlay) {
        overlay = document.createElement('div');
        overlay.id = 'global-modal-overlay';
        overlay.className = 'custom-modal-overlay';
        overlay.style.flexDirection = 'column'; 
        overlay.style.gap = '15px';
        document.body.appendChild(overlay);
    } else {
        const existingTexts = Array.from(overlay.querySelectorAll('.custom-modal-text')).map(el => el.innerHTML);
        if (existingTexts.includes(message)) {
            return;
        }
    }

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
        box.remove();
        if (overlay.childNodes.length === 0) overlay.remove();
        if (onConfirmCallback) onConfirmCallback();
    };

    const btnNo = document.createElement('button');
    btnNo.className = 'custom-modal-btn';
    btnNo.textContent = t('btn_no') || 'No';
    btnNo.onclick = () => {
        box.remove();
        if (overlay.childNodes.length === 0) overlay.remove();
    };
    
    btnContainer.appendChild(btnYes);
    btnContainer.appendChild(btnNo);
    box.appendChild(text);
    box.appendChild(btnContainer);
    overlay.appendChild(box);
}

// --- PROPERTY TOOLTIP LOGIC ---
let propertyHoverTimeout = null;

function showPropertyTooltip(anchorEl, propKey) {
    let tooltip = document.getElementById('property-tooltip');
    if (!tooltip) {
        tooltip = document.createElement('div');
        tooltip.id = 'property-tooltip';
        document.body.appendChild(tooltip);
    }

    tooltip.innerHTML = t('desc_' + propKey);
    tooltip.style.display = 'block';

    const rect = anchorEl.getBoundingClientRect();
    let left = rect.left + (rect.width / 2) - (tooltip.offsetWidth / 2);
    let top = rect.top - tooltip.offsetHeight - 10;

    // Boundary checks to keep it on screen
    if (left < 10) left = 10;
    if (left + tooltip.offsetWidth > window.innerWidth - 10) left = window.innerWidth - tooltip.offsetWidth - 10;
    if (top < 10) top = rect.bottom + 10; // Flip below if it goes above the viewport

    tooltip.style.left = `${left}px`;
    tooltip.style.top = `${top}px`;
}

function hidePropertyTooltip() {
    const tooltip = document.getElementById('property-tooltip');
    if (tooltip) tooltip.style.display = 'none';
}

document.addEventListener('mouseover', (e) => {
    if (e.target.classList.contains('highlighted-property')) {
        const propKey = e.target.dataset.prop;
        if (propKey) {
            propertyHoverTimeout = setTimeout(() => {
                showPropertyTooltip(e.target, propKey);
            }, 1000); // 1 second delay
        }
    }
});

document.addEventListener('mouseout', (e) => {
    if (e.target.classList.contains('highlighted-property')) {
        clearTimeout(propertyHoverTimeout);
        hidePropertyTooltip();
    }
});

// Force hide if user clicks anything to prevent tooltip lingering
document.addEventListener('mousedown', () => {
    clearTimeout(propertyHoverTimeout);
    hidePropertyTooltip();
});