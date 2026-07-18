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

async function startServer() {
    // Check and generate SSL keys if they don't exist
    let privateKey, certificate;
    // Check and generate SSL keys if they don't exist
    if (fs.existsSync('server.key') && fs.existsSync('server.cert')) {
        privateKey = fs.readFileSync('server.key', 'utf8');
        certificate = fs.readFileSync('server.cert', 'utf8');
    } else {
        console.log("No SSL certificates found. Generating self-signed certificates...");
        const selfsigned = require('selfsigned');
        const attrs = [{ name: 'commonName', value: 'localhost' }];
        
        // Await the promise returned by the generate function
        const pems = await selfsigned.generate(attrs, { days: 365 });
        
        privateKey = pems.private;
        certificate = pems.cert;
        
        fs.writeFileSync('server.key', privateKey);
        fs.writeFileSync('server.cert', certificate);
        console.log("Certificates generated and saved as server.key and server.cert.");
    }
    
    const credentials = { key: privateKey, cert: certificate };

    const app = express();
    const PORT = 444;  // Standard HTTPS port

    // Serve static files without caching
    app.use(express.static(path.join(__dirname), {
        setHeaders: (res, path) => {
            res.setHeader('Cache-Control', 'no-store');
        }
    }));

    // API endpoint to dynamically fetch character images regardless of their extension
    app.get('/api/image/:type/:name', (req, res) => {
        const { type, name } = req.params;
        const dirPath = path.join(__dirname, 'images', type);
        const defaultImagePath = path.join(__dirname, 'images', 'default-img.svg');

        fs.readdir(dirPath, (err, files) => {
            // If the directory doesn't exist (e.g. no 'boss' folder yet), serve the default image
            if (err) {
                return res.sendFile(defaultImagePath);
            }

            // Find the first file that matches the character's name (ignoring the extension)
            const targetFile = files.find(file => {
                const parsed = path.parse(file);
                // Check if the filename matches and if it has a valid image extension
                return parsed.name === name && 
                    ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg'].includes(parsed.ext.toLowerCase());
            });

            if (targetFile) {
                // Serve the matched specific character image
                res.sendFile(path.join(dirPath, targetFile));
            } else {
                // If the specific image is not found in the directory, serve the default image
                res.sendFile(defaultImagePath);
            }
        });
    });

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

    // This endpoint catches everything after '/', e.g., /Shabi%20Zovalt&Pafnucy
    app.get('/:players', (req, res) => {
        // Ignore requests for files with extensions (like .css, .js)
        // to avoid sending HTML when the browser asks for a script or image
        if (req.path.includes('.')) {
            return res.status(404).send('Not found');
        }
        // Serve the player panel HTML regardless of the name in the URL
        res.sendFile(path.join(__dirname, 'player.html'));
    });

    // Start HTTPS server
    const server = https.createServer(credentials, app);

    server.listen(PORT, () => {
        const ipAddress = getLocalIp();
        console.log(`Server is listening on: https://${ipAddress}:${PORT}`);
    });

    // Start WebSocket server
    const wss = new WebSocket.Server({ server });

    // Store global game state
    let activeCombatants = []; // Single source of truth for all characters
    let activeConditions = []; // Kept separate for now
    const connectedClients = new Map(); // Maps socket to client details { clientId, clientName, isGM }

    // Handle WebSocket connections
    wss.on('connection', socket => {
        // Generate a unique ID for this specific socket connection
        const clientId = 'client-' + Math.random().toString(36).substr(2, 9);

        socket.on('message', message => {
            const data = JSON.parse(message);

            switch (data.type) {
                case 'PING': {
                    break;
                }

                case 'registerConnection': {
                    const isGM = data.clientName === "GM";
                    connectedClients.set(socket, {
                        clientId: clientId,
                        clientName: data.clientName,
                        isGM: isGM
                    });
                    console.log(`Connected: ${data.clientName} [ID: ${clientId}] [GM: ${isGM}]`);
                    
                    // Send registration confirmation with assigned clientId back to the client
                    socket.send(JSON.stringify({
                        type: 'RESPONSEregisterConnection',
                        clientId: clientId
                    }));
                    break;
                }

                case 'REQUESTgetFullState': {
                    socket.send(JSON.stringify({
                        type: 'RESPONSEgetFullState',
                        activeCombatants,
                        activeConditions,
                    }));
                    break;
                }

                case 'REQUESTaddCombatant': {
                    activeCombatants.push(data.combatant);
                    console.log(`Added combatant: ${data.combatant.uniqueName}`);

                    wss.clients.forEach(client => {
                        if (client.readyState === WebSocket.OPEN) {
                            client.send(JSON.stringify({
                                type: 'BROADCASTaddCombatant',
                                combatant: data.combatant,
                                senderId: clientId // Pass the sender identity
                            }));
                        }
                    });
                    break;
                }

                case 'REQUESTupdateCombatant': {
                    const index = activeCombatants.findIndex(c => c.id === data.combatant.id);
                    if (index !== -1) {
                        activeCombatants[index] = data.combatant;
                        
                        wss.clients.forEach(client => {
                            if (client.readyState === WebSocket.OPEN) {
                                client.send(JSON.stringify({
                                    type: 'BROADCASTupdateCombatant',
                                    combatant: data.combatant,
                                    senderId: clientId // Pass the sender identity
                                }));
                            }
                        });
                    }
                    break;
                }

                case 'REQUESTremoveCombatant': {
                    const indexToRemove = activeCombatants.findIndex(c => c.id === data.id);
                    if (indexToRemove !== -1) {
                        activeCombatants.splice(indexToRemove, 1);
                    }
                    console.log(`Removed combatant ID: ${data.id}`);

                    wss.clients.forEach(client => {
                        if (client.readyState === WebSocket.OPEN) {
                            client.send(JSON.stringify({
                                type: 'BROADCASTremoveCombatant',
                                id: data.id,
                                senderId: clientId
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

                    wss.clients.forEach(client => {
                        if (client.readyState === WebSocket.OPEN) {
                            client.send(JSON.stringify({
                                type: "BROADCASTaddCondition",
                                activeConditions,
                                senderId: clientId
                            }));
                        }
                    });
                    break;
                }

                case 'REQUESTupdateConditions': {
                    if (data.activeConditions) activeConditions = data.activeConditions;
                    else activeConditions = [];

                    wss.clients.forEach(client => {
                        if (client.readyState === WebSocket.OPEN) {
                            client.send(JSON.stringify({
                                type: "BROADCASTupdateConditions",
                                activeConditions,
                                senderId: clientId
                            }));
                        }
                    });
                    break;
                }  
                    
                default:
                    console.log('Unknown message type:', data.type);
            }
        });

        socket.on('close', () => {
            const clientInfo = connectedClients.get(socket);
            if (clientInfo) {
                console.log(`Disconnected: ${clientInfo.clientName} [ID: ${clientInfo.clientId}]`);
                connectedClients.delete(socket);
            }
        });
    });
}

// Initialize the application
startServer();