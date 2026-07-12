const https = require('https');
const express = require('express');
const WebSocket = require('ws');
const path = require('path');
const fs = require('fs');
const os = require('os');

// Helper function to get local LAN IPv4 address
function getLocalIp() {
    const interfaces = os.networkInterfaces();
    for (const name of Object.keys(interfaces)) {
        for (const iface of interfaces[name]) {
            if (iface.family === 'IPv4' && !iface.internal) {
                return iface.address;
            }
        }
    }
    return 'localhost';
}

// SSL keys
const privateKey = fs.readFileSync('server.key', 'utf8');
const certificate = fs.readFileSync('server.cert', 'utf8');
const credentials = { key: privateKey, cert: certificate };

const app = express();
const PORT = 444;  // Standard HTTPS port

// Serve static files without caching
app.use(express.static(path.join(__dirname), {
    setHeaders: (res, path) => {
        res.setHeader('Cache-Control', 'no-store');
    }
}));

// API endpoint to fetch MP3 files
const musicFolder = path.join(__dirname, 'music');

app.get('/api/music-files', (req, res) => {
    fs.readdir(musicFolder, (err, files) => {
        if (err) {
            return res.status(500).json({ error: 'Server error while reading files' });
        }
        const mp3Files = files.filter(file => file.endsWith('.mp3'));
        res.json(mp3Files);
    });
});

// Start HTTPS server
const server = https.createServer(credentials, app);

server.listen(PORT, () => {
    const ipAddress = getLocalIp();
    console.log(`Server is listening on: https://${ipAddress}:${PORT}`);
});

// Start WebSocket server
const wss = new WebSocket.Server({ server });

// Store character data
let playerCharacters = {};
let abilitiesStates = {};
let activeConditions = [];
const connectedClients = new Map();

// Handle WebSocket connections
wss.on('connection', socket => {
    // Handle incoming messages
    socket.on('message', message => {
        const data = JSON.parse(message);

        switch (data.type) {
            case 'PING': {
                // for (let [clientName, client] of connectedClients.entries()) {
                //     if (client === socket) {
                //         console.log(`PING: ${clientName}`);
                //     }
                // }
                break;
            }

            case 'REQUESTgetPlayer': {
                if (playerCharacters[data.playerName]) {
                    // If player exists, send their data to add from server
                    socket.send(JSON.stringify({
                        type: 'RESPONSEplayerFound',
                        playerName: data.playerName,
                        playerStats: playerCharacters[data.playerName],
                        team: data.team
                    }));
                } else {
                    // If player doesn't exist, add from players.js
                    socket.send(JSON.stringify({
                        type: 'RESPONSEplayerNotFound',
                        playerName: data.playerName,
                        team: data.team
                    }));
                }
                break;
            }
                
            case 'REQUESTupdatePlayer': {
                let { playerName, playerStats } = data;
                playerCharacters[playerName] = playerStats;  // Save player data
                console.log(`Updated: ${playerName}`);

                // Broadcast update to all connected clients
                wss.clients.forEach(client => {
                    if (client.readyState === WebSocket.OPEN) {
                        client.send(JSON.stringify({
                            type: 'BROADCASTupdatePlayer',
                            playerName,
                            playerStats
                        }));
                    }
                });
                break;
            }

            case "REQUESTupdateSpecificPlayersStats": {
                const requestedPlayers = data.playerNames || [];
                const foundPlayers = {};
            
                requestedPlayers.forEach(playerName => {
                    if (playerCharacters[playerName]) {
                        foundPlayers[playerName] = playerCharacters[playerName];
                    }
                });
            
                socket.send(JSON.stringify({
                    type: "RESPONSEupdateSpecificPlayersStats",
                    playersToUpdate: foundPlayers
                }));
                break;
            }

            case "REQUESTupdateServerAbilitiesStates": {
                abilitiesStates = data.localAbilitiesStates;
                console.log("Updated abilitiesStates");
            
                // Response to client confirming operation completion
                socket.send(JSON.stringify({
                    type: "RESPONSEupdateServerAbilitiesStates",
                    requestId: data.requestId
                }));
                break;
            }

            case "REQUESTgetServerAbilitiesStates": {
                socket.send(JSON.stringify({
                    type: "RESPONSEgetServerAbilitiesStates",
                    requestId: data.requestId,
                    serverAbilitiesStates: abilitiesStates
                }));
                console.log("Sent abilitiesStates to client.");
                break;
            }
                
            case "REQUESTupdateActivePanel": {
                wss.clients.forEach(client => {
                    if (client.readyState === WebSocket.OPEN) {
                        client.send(JSON.stringify({
                            type: "BROADCASTupdateActivePanel"
                        }));
                    }
                });
                break;
            }
            
            case 'REQUESTgetConditions': {
                socket.send(JSON.stringify({
                    type: "RESPONSEgetConditions",
                    requestId: data.requestId,
                    activeConditions
                }));
                break;
            }

            case 'REQUESTaddCondition': {
                const condition = data.condition;
                activeConditions.push(condition);
                console.log("Added condition:", condition);

                wss.clients.forEach(client => {
                    if (client.readyState === WebSocket.OPEN) {
                        client.send(JSON.stringify({
                            type: "BROADCASTaddCondition",
                            activeConditions
                        }));
                    }
                });
                break;
            }

            case 'REQUESTupdateConditions': {
                activeConditions = data.activeConditions;

                socket.send(JSON.stringify({
                    type: "RESPONSEupdateConditions",
                    requestId: data.requestId
                }));
                break;
            }

            case "REQUESTupdateCurrentCombatRound": {
                wss.clients.forEach(client => {
                    if (client.readyState === WebSocket.OPEN) {
                        client.send(JSON.stringify({
                            type: "BROADCASTupdateCurrentCombatRound",
                            currentCombatRound: data.currentCombatRound
                        }));
                    }
                });
                break;
            }   

            case 'registerConnection': {
                connectedClients.set(data.clientName, socket);
                console.log(`Connected: ${data.clientName}`);
                break;
            }
                
            default:
                console.log('Unknown message type:', data.type);
        }
    });

    // Handle connection close
    socket.on('close', () => {
        // Remove player upon disconnection
        for (let [clientName, client] of connectedClients.entries()) {
            if (client === socket) {
                connectedClients.delete(clientName);
                console.log(`Disconnected: ${clientName}`);
            }
        }
    });
});