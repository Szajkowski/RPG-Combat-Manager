// --- COPYING AND PASTING ---

async function copyInputValue(input) {
    // Prevent copying if the input is empty or just whitespaces
    if (!input.value || input.value.trim() === '') return;

    try {
        await navigator.clipboard.writeText(input.value);
        window.lastCopiedRPGValue = input.value;
        showNotification(`${t('copied')} ${input.value}`);
    } catch (err) {
        console.error("Failed to copy text: ", err);
        showNotification(t('copy_error'));
    }
}

async function copyValue(value) {
    try {
        if (typeof value === "number") await navigator.clipboard.writeText(value.toString());
        else await navigator.clipboard.writeText(value);

        window.lastCopiedRPGValue = typeof value === "number" ? value.toString() : value;
        showNotification(`${t('copied')} ${value}`);
    } catch (err) {
        console.error("Failed to copy text: ", err);
        showNotification(t('copy_error'));
    }
}

function pasteValueToInput(input) {
    const val = window.lastCopiedRPGValue;
    if (!val) return;
    
    const trimmed = val.trim();
    input.value = trimmed;
    
    // Trigger generic DOM events in case other scripts/listeners depend on them
    input.dispatchEvent(new Event('change', { bubbles: true }));
    
    // Clear local memory, but don't touch the clipboard. That way you can paste something once, but also ctrl+v it if you need the value multiple times
    window.lastCopiedRPGValue = null;

    if (typeof showNotification === 'function') {
        showNotification(`${t('pasted')} ${trimmed}`);
    }
}

// --- NOTIFICATIONS ---

// Global mouse tracking for tooltips and notifications
window.currentMouseX = window.innerWidth / 2;
window.currentMouseY = window.innerHeight / 2;

document.addEventListener('mousemove', (e) => {
    window.currentMouseX = e.clientX;
    window.currentMouseY = e.clientY;
});

function showNotification(message) {
    const notification = document.createElement('div');
    notification.className = 'copy-notification';
    notification.textContent = message;
    
    // Hide initially to measure elements offset dimensions accurately before rendering
    notification.style.visibility = 'hidden';
    document.body.appendChild(notification);

    let left = window.currentMouseX + 15;
    let top = window.currentMouseY - 35;

    const notificationWidth = notification.offsetWidth;
    
    // Prevent overflowing the right edge of the viewport
    if (left + notificationWidth > window.innerWidth) {
        left = window.innerWidth - notificationWidth - 15;
    }

    // Prevent overflowing the left edge of the viewport
    if (left < 0) left = 10;

    // Prevent overflowing the top edge of the viewport (flip below cursor if needed)
    if (top < 0) {
        top = window.currentMouseY + 20;
    }

    notification.style.left = `${left}px`;
    notification.style.top = `${top}px`;
    notification.style.visibility = 'visible';

    // Remove notification after 1.2 seconds
    setTimeout(() => {
        notification.remove();
    }, 1200);
}

// Non-invasive, non-blocking toast notification displayed near the cursor
function showToast(message, duration = 2500) {
    const toast = document.createElement('div');
    toast.className = 'toast-notification';
    toast.textContent = message;
    
    document.body.appendChild(toast);
    
    const toastWidth = toast.offsetWidth;
    const toastHeight = toast.offsetHeight;

    let left = window.currentMouseX;
    let top = window.currentMouseY - toastHeight - 15; // 15px above cursor

    // Boundary checks to keep it on screen
    if (left - (toastWidth / 2) < 10) left = (toastWidth / 2) + 10;
    if (left + (toastWidth / 2) > window.innerWidth - 10) left = window.innerWidth - (toastWidth / 2) - 10;
    if (top < 10) top = window.currentMouseY + 25; // Flip below cursor if too close to top edge
    
    toast.style.left = `${left}px`;
    toast.style.top = `${top}px`;
    
    // Trigger reflow to ensure the CSS transition plays correctly
    void toast.offsetWidth;
    toast.classList.add('show');
    
    setTimeout(() => {
        toast.classList.remove('show');
        // Wait for the slide-out animation to finish before removing from DOM
        setTimeout(() => toast.remove(), 300);
    }, duration);
}

// Organizes modals visually as a stack of cards to prevent flat visual clutter
function updateModalStack() {
    const overlay = document.getElementById('global-modal-overlay');
    if (!overlay) return;
    
    const modals = Array.from(overlay.querySelectorAll('.custom-modal-box'));
    const total = modals.length;
    
    modals.forEach((modal, index) => {
        const reverseIndex = total - 1 - index; // 0 is the newest (top) modal
        
        modal.style.position = 'absolute';
        modal.style.transition = 'all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1)';
        
        if (reverseIndex === 0) {
            modal.style.transform = 'translateY(0) scale(1)';
            modal.style.opacity = '1';
            modal.style.zIndex = '1000';
            modal.style.pointerEvents = 'auto'; // Only the top one is interactable
        } else {
            const yOffset = reverseIndex * -15; // Move up and behind
            const scale = Math.max(0.85, 1 - (reverseIndex * 0.05)); // Shrink slightly to create depth
            
            modal.style.transform = `translateY(${yOffset}px) scale(${scale})`;
            modal.style.opacity = Math.max(0, 1 - (reverseIndex * 0.2)).toString();
            modal.style.zIndex = (1000 - reverseIndex).toString();
            modal.style.pointerEvents = 'none'; // Background modals cannot be clicked
        }
    });
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
            else updateModalStack(); // Adjust remaining modals in the stack
            resolve();
        };
        
        btnContainer.appendChild(btn);
        box.appendChild(text);
        box.appendChild(btnContainer);
        overlay.appendChild(box);

        updateModalStack();
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
        else updateModalStack(); // Adjust remaining modals in the stack
        if (onConfirmCallback) onConfirmCallback();
    };

    const btnNo = document.createElement('button');
    btnNo.className = 'custom-modal-btn';
    btnNo.textContent = t('btn_no') || 'No';
    btnNo.onclick = () => {
        box.remove();
        if (overlay.childNodes.length === 0) overlay.remove();
        else updateModalStack(); // Adjust remaining modals in the stack
    };
    
    btnContainer.appendChild(btnYes);
    btnContainer.appendChild(btnNo);
    box.appendChild(text);
    box.appendChild(btnContainer);
    overlay.appendChild(box);

    updateModalStack();
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