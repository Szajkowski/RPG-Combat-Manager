let activePanel = null;
let activeOverlay = null;
let isRemoving = false;  // Flaga zeby powstrzymac kilka usuwan paneli na raz
let currentCombatRound = 0;

let diceAudio = null;

window.onload = () => {
    // Pobierz parametr 'player' z URL
    const urlParams = new URLSearchParams(window.location.search);
    let playerNames = urlParams.get('player');

    if (playerNames) {
        // Usuń niepotrzebne znaki
        playerNames = decodeURI(playerNames).replace(/"/g, "");

        // Podziel na tablicę postaci
        const playersArray = playerNames.split(",");

        // Dodaj każdą postać do drużyny
        playersArray.forEach(playerName => {
            playerName = playerName.trim();  // Usuń spacje na początku i końcu
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

    // sposob na ogarniecie tego rozlaczania na telefonach
    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible' && socket.readyState !== WebSocket.OPEN) {
            console.log("Wrócono na stronę, ponowne łączenie...");
            socket = connectSocket();

            const playerNames = Array.from(document.querySelectorAll('.character[data-type="player"]'))
            .map(playerDiv => playerDiv.querySelector('input[type="text"]').value.trim());

            const checkInterval = setInterval(() => {
                if (socket.readyState === WebSocket.OPEN) { // czekamy az socket sie polaczy
                    updateSpecificPlayersStats(playerNames);
                    clearInterval(checkInterval);  // Zatrzymaj sprawdzanie
                }
            }, 100);  // Sprawdzaj co 100ms            
        }
    });

    document.addEventListener('keydown', function(event) {
        // Sprawdzamy, czy w danym momencie aktywne jest pole tekstowe
        const isInputFocused = document.activeElement.tagName.toLowerCase() === 'input' || document.activeElement.tagName.toLowerCase() === 'textarea';

        // Jeśli nie jest aktywne pole tekstowe, wykonujemy skróty klawiszowe
        if (!isInputFocused) {
            switch (event.key.toUpperCase()) {
                case 'Z':
                    console.log("Połączenie zamknięte");
                    socket.close();
                    break;
                default:
                    break;
            }
        }
    });
});