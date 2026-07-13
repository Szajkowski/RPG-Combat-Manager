let activePanel = null;
let activeOverlay = null;
let isRemoving = false;  // Flag to prevent multiple panel removals at once
let currentCombatRound = 0;

let diceAudio = null;

window.onload = () => {
    // Get the 'player' parameter from the URL
    const urlParams = new URLSearchParams(window.location.search);
    let playerNames = urlParams.get('player');

    if (playerNames) {
        // Remove unnecessary characters
        playerNames = decodeURI(playerNames).replace(/"/g, "");

        // Split into an array of characters
        const playersArray = playerNames.split(",");

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
        alert("Brak poprawnych graczy w URL!");
    }
};

document.addEventListener('DOMContentLoaded', () => {
    diceAudio = new Audio('sound/diceroll.mp3');

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