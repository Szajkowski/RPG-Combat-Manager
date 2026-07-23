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

    // Route to permanently save character stats modifications to the corresponding data files without destroying JS references
    app.post('/api/save-character-stats', express.json(), (req, res) => {
        const { type, baseName, deltas } = req.body;
        
        if (!type || !baseName || !deltas) {
            return res.status(400).json({ error: 'Missing required parameters' });
        }

        // Determine the correct file name based on character type
        let fileName = '';
        switch (type) {
            case 'player': fileName = 'players.js'; break;
            case 'mob': fileName = 'mobs.js'; break;
            case 'npc': fileName = 'npcs.js'; break;
            case 'boss': fileName = 'bosses.js'; break;
            default: return res.status(400).json({ error: 'Invalid character type' });
        }

        const path = require('path');
        const filePath = path.join('data', fileName);

        try {
            if (!fs.existsSync(filePath)) {
                return res.status(404).json({ error: `File not found: ${fileName}` });
            }

            let fileContent = fs.readFileSync(filePath, 'utf8');
            
            // 1. Locate the beginning of the character definition block
            let charIndex = fileContent.indexOf(`"${baseName}":`);
            if (charIndex === -1) charIndex = fileContent.indexOf(`'${baseName}':`);
            if (charIndex === -1) charIndex = fileContent.indexOf(`${baseName}:`); 

            if (charIndex === -1) {
                return res.status(404).json({ error: `Character ${baseName} not found in ${fileName}` });
            }

            // 2. Find the strict boundaries of this block using brace tracking (Now String-Safe)
            let blockStart = fileContent.indexOf('{', charIndex);
            if (blockStart === -1) throw new Error("Could not find character block start");

            let braceCount = 0;
            let blockEnd = -1;
            let inString = false;
            let stringChar = '';

            for (let i = blockStart; i < fileContent.length; i++) {
                const char = fileContent[i];
                
                // Ignore escaped quote characters like \"
                if (inString && fileContent[i - 1] === '\\') continue;

                // Enter string state
                if (!inString && (char === '"' || char === "'" || char === '`')) {
                    inString = true;
                    stringChar = char;
                    continue;
                }

                // Exit string state
                if (inString && char === stringChar) {
                    inString = false;
                    continue;
                }

                // Count braces only if we are strictly outside of any strings
                if (!inString) {
                    if (char === '{') braceCount++;
                    if (char === '}') braceCount--;
                    
                    if (braceCount === 0) {
                        blockEnd = i;
                        break;
                    }
                }
            }

            if (blockEnd === -1) throw new Error("Could not find character block end");

            let blockContent = fileContent.substring(blockStart + 1, blockEnd);

            // 3. SECURE THE ROOT NAMESPACE
            // We isolate the root variables from nested arrays to prevent accidentally modifying stats inside equipment/abilities
            let abilitiesIdx = blockContent.indexOf('abilities:');
            let equipmentIdx = blockContent.indexOf('equipment:');
            
            let splitIdx = blockContent.length;
            if (abilitiesIdx !== -1 && equipmentIdx !== -1) splitIdx = Math.min(abilitiesIdx, equipmentIdx);
            else if (abilitiesIdx !== -1) splitIdx = abilitiesIdx;
            else if (equipmentIdx !== -1) splitIdx = equipmentIdx;

            let rootContent = blockContent.substring(0, splitIdx);
            const nestedContent = blockContent.substring(splitIdx);

            // 4. Apply directional adjustments based on the received deltas
            Object.keys(deltas).forEach(stat => {
                const statRegex = new RegExp(`^(\\s*['"]?${stat}['"]?\\s*:\\s*)([-]?\\d+)(,?)`, 'm');
                const match = rootContent.match(statRegex);
                
                // Core primary attributes list that must never evaluate to 0 or be removed from the script file
                const coreAttributes = ['vitality', 'intuition', 'strength', 'agility', 'attunement', 'perception', 'accuracy', 'reflex', 'resilience'];
                
                if (match) {
                    const currentVal = parseInt(match[2]);
                    let newVal = currentVal + deltas[stat];
                    
                    if (coreAttributes.includes(stat)) {
                        // Primary core attributes cannot drop below 1
                        if (newVal <= 0) newVal = 1;
                        rootContent = rootContent.replace(statRegex, `$1${newVal}$3`);
                    } else {
                        if (newVal === 0) {
                            // Remove the stat property completely from the file if it evaluates back to zero default state
                            const lineRegex = new RegExp(`^\\s*['"]?${stat}['"]?\\s*:\\s*[-]?\\d+,?\\s*\\n?`, 'm');
                            rootContent = rootContent.replace(lineRegex, '');
                        } else {
                            rootContent = rootContent.replace(statRegex, `$1${newVal}$3`);
                        }
                    }
                } else {
                    // If the specific stat property doesn't exist yet, we must inject it
                    let newVal = deltas[stat]; 
                    if (coreAttributes.includes(stat) && newVal <= 0) newVal = 1;

                    if (newVal !== 0) {
                        const indentMatch = rootContent.match(/^(\s+)/m);
                        const indent = indentMatch ? indentMatch[1] : '        ';
                        rootContent = `\n${indent}${stat}: ${newVal},` + rootContent;
                    }
                }
            });

            // 5. Reconstruct the complete valid JS file and push it to the server filesystem
            blockContent = rootContent + nestedContent;
            const updatedFileContent = fileContent.substring(0, blockStart + 1) + blockContent + fileContent.substring(blockEnd);
            fs.writeFileSync(filePath, updatedFileContent, 'utf8');

            res.json({ success: true });
        } catch (error) {
            console.error('Error writing stats to database file:', error);
            res.status(500).json({ error: 'Internal server error while writing data' });
        }
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