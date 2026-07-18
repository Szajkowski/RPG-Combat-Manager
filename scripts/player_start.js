let activePanel = null;
let activeOverlay = null;
let isRemoving = false;  // Flag to prevent multiple panel removals at once

window.onload = () => {
    // Get the parameter directly from the path
    let pathParam = window.location.pathname.substring(1);

    if (pathParam && !pathParam.includes("player.html")) {
        // Remove unnecessary characters and decode
        let playerNames = decodeURIComponent(pathParam).replace(/"/g, "");

        // Split into an array of characters, using '&'
        const playersArray = playerNames.split("&");

        // Add each character to the team
        playersArray.forEach(playerName => {
            playerName = playerName.trim();  // Remove leading and trailing spaces
            if (playerName) {
                waitForSocket(() => {
                    addSpecificCharacter('player', playerName, 'hero');
                });      
            }
        });
    } else {
        alert(t('invalid_url'));
    }
};

document.addEventListener('DOMContentLoaded', () => {
    // Create mute button for player
    const muteBtn = document.createElement('div');
    muteBtn.className = 'global-mute-btn';
    muteBtn.innerHTML = window.isAudioMuted ? '🔇' : '🔊';
    
    muteBtn.onclick = () => {
        window.isAudioMuted = !window.isAudioMuted;
        muteBtn.innerHTML = window.isAudioMuted ? '🔇' : '🔊';
        // save the state on localStorage
        localStorage.setItem('CombatManager-Muted', window.isAudioMuted);
    };
    document.body.appendChild(muteBtn);

    // Create floating language toggle button
    const langBtn = document.createElement('div');
    langBtn.className = 'global-lang-btn';
    langBtn.innerHTML = window.currentLanguage === 'PL' ? '🇵🇱' : '🇬🇧';
    langBtn.onclick = () => toggleLanguage();
    document.body.appendChild(langBtn);

    // Workaround to handle disconnections on mobile devices
    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible' && socket.readyState !== WebSocket.OPEN) {
            console.log("Returned to the page, reconnecting...");
            socket = connectSocket();

            const playerNames = Array.from(document.querySelectorAll('.character[data-type="player"]'))
            .map(playerDiv => playerDiv.querySelector('input[type="text"]').value.trim());

            // Wait for the socket to connect using the existing helper function
            waitForSocket(() => {
                updateSpecificPlayersStats(playerNames);
            });
        }
    });

    document.addEventListener('keydown', function(event) {
        // Check if a text field is currently active
        const isInputFocused = document.activeElement.tagName.toLowerCase() === 'input' || document.activeElement.tagName.toLowerCase() === 'textarea';

        // If a text field is not active, execute keyboard shortcuts
        if (!isInputFocused) {
            switch (event.key.toUpperCase()) {
                case 'Z':
                    console.log("Connection closed");
                    socket.close();
                    break;
                default:
                    break;
            }
        }
    });
});