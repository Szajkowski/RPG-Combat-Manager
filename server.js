const http = require('http');
const express = require('express');
const WebSocket = require('ws');
const path = require('path');
const fs = require('fs');
const os = require('os');

// Unique ID for this specific server run to detect restarts
const serverInstanceId = Date.now().toString();

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

// Global server lock for action pipeline to prevent concurrent action overlaps
let serverLock = {
    isBusy: false,
    ownerId: null,
    timeout: null
};

function releaseServerLock() {
    serverLock.isBusy = false;
    serverLock.ownerId = null;
    if (serverLock.timeout) {
        clearTimeout(serverLock.timeout);
        serverLock.timeout = null;
    }
}

async function startServer() {
    logEvent("--- SERVER STARTING ---");

    const app = express();
    const PORT = 4444;  // Standard HTTP port

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

        fs.readdir(dirPath, (err, files) => {
            // If the directory doesn't exist (e.g. no 'boss' folder yet), return 404 to trigger client-side fallback
            if (err) {
                return res.status(404).send('Not found');
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
                // Return 404 to trigger fast client-side SVG rendering
                res.status(404).send('Not found');
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
            let abilitiesIdx = blockContent.indexOf('abilities:');
            let equipmentIdx = blockContent.indexOf('equipment:');
            
            let splitIdx = blockContent.length;
            if (abilitiesIdx !== -1 && equipmentIdx !== -1) splitIdx = Math.min(abilitiesIdx, equipmentIdx);
            else if (abilitiesIdx !== -1) splitIdx = abilitiesIdx;
            else if (equipmentIdx !== -1) splitIdx = equipmentIdx;

            let rootContent = blockContent.substring(0, splitIdx);
            const nestedContent = blockContent.substring(splitIdx);

            // Parse existing flat properties into an object mapping
            let properties = {};
            let propRegex = /^\s*['"]?([a-zA-Z0-9_]+)['"]?\s*:\s*(.*?),?\s*$/gm;
            let match;
            while ((match = propRegex.exec(rootContent)) !== null) {
                properties[match[1]] = match[2].trim();
            }

            // 4. Apply directional adjustments based on the received deltas
            const coreAttributes = ['vitality', 'intuition', 'strength', 'agility', 'attunement', 'perception', 'accuracy', 'reflex', 'resilience'];
            
            Object.keys(deltas).forEach(stat => {
                let currentVal = properties[stat] !== undefined ? parseFloat(properties[stat]) : 0;
                if (isNaN(currentVal)) currentVal = 0;
                
                let newVal = currentVal + deltas[stat];

                if (coreAttributes.includes(stat)) {
                    // Primary core attributes cannot drop below 1
                    if (newVal <= 0) newVal = 1;
                    properties[stat] = newVal;
                } else {
                    if (newVal === 0) {
                        // Remove the stat property completely from the file if it evaluates back to zero default state
                        delete properties[stat];
                    } else {
                        properties[stat] = newVal;
                    }
                }
            });

            // 5. Reconstruct the complete valid JS file enforcing specific formatting order
            // Removed 'physArmorPerc', 'magArmorPerc' from STAT_ORDER
            const STAT_ORDER = [
                'lvl', 
                'name', 
                'hasDeathsDoor', 
                'hp', 
                'maxHp',
                'vitality', 
                'vitalityMod', 
                'intuition', 
                'intuitionMod',
                'strength', 
                'strengthMod', 
                'agility', 
                'agilityMod',
                'attunement', 
                'attunementMod', 
                'perception', 
                'perceptionMod',
                'accuracy', 
                'accuracyMod', 
                'reflex', 
                'reflexMod',
                'resilience', 
                'resilienceMod', 
                'damage',
                'physArmor', 
                'magArmor',
                'abilities', 
                'equipment',
            ];

            // Safely extract the exact indentation used in the file
            const indentMatch = fileContent.substring(blockStart, blockEnd).match(/\n([ \t]+)/);
            const indent = indentMatch ? indentMatch[1] : '    ';

            let newRootContent = '\n';
            let keys = Object.keys(properties);
            
            keys.sort((a, b) => {
                let idxA = STAT_ORDER.indexOf(a);
                let idxB = STAT_ORDER.indexOf(b);
                
                // Keep alphabetical order for unlisted elements
                if (idxA === -1 && idxB === -1) return a.localeCompare(b);
                // Unlisted keys stay at the top (e.g., 'image' or 'type')
                if (idxA === -1) return -1;
                if (idxB === -1) return 1;
                // Otherwise sort by defined sequence
                return idxA - idxB;
            });

            keys.forEach(k => {
                newRootContent += `${indent}${k}: ${properties[k]},\n`;
            });

            // Merge back everything correctly tabbed without accumulating newlines
            if (nestedContent.trim().length > 0) {
                blockContent = newRootContent + indent + nestedContent.trimStart();
            } else {
                // If there are no nested arrays, close the block cleanly
                blockContent = newRootContent + indent.substring(0, Math.max(0, indent.length - 4));
            }
            
            const updatedFileContent = fileContent.substring(0, blockStart + 1) + blockContent + fileContent.substring(blockEnd);
            fs.writeFileSync(filePath, updatedFileContent, 'utf8');

            logEvent(`DB SAVE: Successfully applied stat modifications to character template "${baseName}" in file ${fileName}.`);
            res.json({ success: true });
        } catch (error) {
            logEvent(`DB SAVE ERROR: Failed writing stats to database file for "${baseName}" - ${error.message}`);
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

    // Start HTTP server
    const server = http.createServer(app);

    server.listen(PORT, () => {
        const ipAddress = getLocalIp();
        logEvent(`Server is listening on: http://${ipAddress}:${PORT}`);
    });

    // Start WebSocket server
    const wss = new WebSocket.Server({ server });

    // Store global game state
    let activeCharacters = []; // Single source of truth for all characters
    let activeEffects = []; // Kept separate for now
    let rollsHistory = []; // Global roll history feed array
    let activeMusic = { filePath: null, isPlaying: false }; // Tracks globally active music
    const connectedClients = new Map(); // Maps socket to client details { clientId, clientName, isGM }

    // Handle WebSocket connections
    wss.on('connection', socket => {
        // Generate a unique ID for this specific socket connection
        const clientId = 'client-' + Math.random().toString(36).substr(2, 9);

        socket.on('message', message => {
            const data = JSON.parse(message);

            switch (data.type) {
                case 'PING': {
                    socket.send(JSON.stringify({ type: 'PONG' }));
                    break;
                }

                case 'registerConnection': {
                    const isGM = data.clientName === "GM";
                    connectedClients.set(socket, {
                        clientId: clientId,
                        clientName: data.clientName,
                        isGM: isGM
                    });
                    
                    logEvent(`CLIENT CONNECTED: ${data.clientName} [ID: ${clientId}] [GM: ${isGM}]`);
                    
                    // Send registration confirmation along with the full game state and server instance ID
                    socket.send(JSON.stringify({
                        type: 'RESPONSEregisterConnection',
                        clientId: clientId,
                        serverInstanceId: serverInstanceId,
                        activeCharacters: activeCharacters,
                        activeEffects: activeEffects,
                        rollsHistory: rollsHistory,
                        activeMusic: activeMusic
                    }));
                    break;
                }

                // --- ACTION LOCKING MECHANISM ---
                case 'REQUESTinitiateAction': {
                    // Check if the server is currently locked by another pipeline
                    if (serverLock.isBusy) {
                        socket.send(JSON.stringify({
                            type: 'RESPONSEactionDenied',
                            requestId: data.requestId
                        }));
                        break;
                    }

                    // Process and broadcast the bundled state modifications immediately while granting the lock
                    if (data.combatant) {
                        const index = activeCharacters.findIndex(c => c.id === data.combatant.id);
                        if (index !== -1) {
                            const diffLog = getCombatantDiffLog(activeCharacters[index], data.combatant);
                            logEvent(`ACTION INITIATED by "${data.combatant.uniqueName}" | Changes: ${diffLog}`);
                            
                            activeCharacters[index] = data.combatant;
                            wss.clients.forEach(client => {
                                if (client.readyState === WebSocket.OPEN) {
                                    client.send(JSON.stringify({
                                        type: 'BROADCASTupdateCombatant',
                                        combatant: data.combatant,
                                        senderId: clientId
                                    }));
                                }
                            });
                        }
                    }

                    if (data.rollEvent) {
                        rollsHistory.push(data.rollEvent);
                        // Cap history at 50 events to prevent memory overflow
                        if (rollsHistory.length > 50) rollsHistory.shift();
                        wss.clients.forEach(client => {
                            if (client.readyState === WebSocket.OPEN) {
                                client.send(JSON.stringify({
                                    type: 'BROADCASTaddRollEvent',
                                    rollEvent: data.rollEvent
                                }));
                            }
                        });
                    }

                    // autoRelease prevents the server from keeping the lock open if the client doesn't intend to start the targeting pipeline
                    if (!data.autoRelease) {
                        serverLock.isBusy = true;
                        serverLock.ownerId = clientId;
                        serverLock.timeout = setTimeout(() => releaseServerLock(), 45000); // Failsafe timeout
                    }

                    socket.send(JSON.stringify({
                        type: 'RESPONSEactionGranted',
                        requestId: data.requestId
                    }));
                    break;
                }

                case 'REQUESTreleaseActionLock': {
                    // Allow releasing only if the client owns the lock
                    if (serverLock.ownerId === clientId) {
                        releaseServerLock();
                    }
                    break;
                }

                case 'REQUESTaddCombatant': {
                    activeCharacters.push(data.combatant);
                    logEvent(`ADDED COMBATANT: "${data.combatant.uniqueName}" (Type: ${data.combatant.type}, Team: ${data.combatant.team}, HP: ${data.combatant.currentStats.hp}/${data.combatant.currentStats.maxHp})`);

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
                    const index = activeCharacters.findIndex(c => c.id === data.combatant.id);
                    if (index !== -1) {
                        const diffLog = getCombatantDiffLog(activeCharacters[index], data.combatant);
                        logEvent(`UPDATED COMBATANT: "${data.combatant.uniqueName}" | Changes: ${diffLog}`);
                        
                        activeCharacters[index] = data.combatant;
                        
                        wss.clients.forEach(client => {
                            if (client.readyState === WebSocket.OPEN) {
                                client.send(JSON.stringify({
                                    type: 'BROADCASTupdateCombatant',
                                    combatant: data.combatant,
                                    senderId: clientId, // Pass the sender identity
                                    systemSound: data.systemSound // Safely pass the optional sound parameter
                                }));
                            }
                        });
                    }
                    break;
                }

                case 'REQUESTupdateCombatantsBatch': {
                    // Update all combatants received in the payload at once
                    if (Array.isArray(data.combatants)) {
                        logEvent(`BATCH UPDATE for ${data.combatants.length} combatants.`);
                        
                        data.combatants.forEach(updatedC => {
                            const index = activeCharacters.findIndex(c => c.id === updatedC.id);
                            if (index !== -1) {
                                const diffLog = getCombatantDiffLog(activeCharacters[index], updatedC);
                                logEvent(` -> "${updatedC.uniqueName}" | Changes: ${diffLog}`);
                                activeCharacters[index] = updatedC;
                            }
                        });
                        
                        wss.clients.forEach(client => {
                            if (client.readyState === WebSocket.OPEN) {
                                client.send(JSON.stringify({
                                    type: 'BROADCASTupdateCombatantsBatch',
                                    combatants: data.combatants,
                                    senderId: clientId
                                }));
                            }
                        });
                    }
                    break;
                }

                case 'REQUESTremoveCombatant': {
                    const indexToRemove = activeCharacters.findIndex(c => c.id === data.id);
                    if (indexToRemove !== -1) {
                        logEvent(`REMOVED COMBATANT: "${activeCharacters[indexToRemove].uniqueName}" (ID: ${data.id})`);
                        activeCharacters.splice(indexToRemove, 1);
                    }

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
                
                case 'REQUESTgetEffects': {
                    socket.send(JSON.stringify({
                        type: "RESPONSEgetEffects",
                        requestId: data.requestId,
                        activeEffects
                    }));
                    break;
                }

                case 'REQUESTaddEffect': {
                    const effect = data.effect;
                    activeEffects.push(effect);
                    logEvent(`ADDED EFFECT: "${effect.name}" from [${effect.invoker}] to [${effect.target || 'Self'}]. Duration: ${effect.duration}`);

                    wss.clients.forEach(client => {
                        if (client.readyState === WebSocket.OPEN) {
                            client.send(JSON.stringify({
                                type: "BROADCASTaddEffect",
                                activeEffects,
                                senderId: clientId
                            }));
                        }
                    });
                    break;
                }

                case 'REQUESTupdateEffects': {
                    logEvent(`UPDATED EFFECTS LIST (Total length: ${data.activeEffects ? data.activeEffects.length : 0}).`);
                    
                    const newEffects = data.activeEffects || [];
                    const oldIds = activeEffects.map(e => e.id);
                    const newIds = newEffects.map(e => e.id);
                    
                    const added = newEffects.filter(e => !oldIds.includes(e.id));
                    const removed = activeEffects.filter(e => !newIds.includes(e.id));
                    const kept = newEffects.filter(e => oldIds.includes(e.id));
                    
                    added.forEach(e => logEvent(` -> EFFECT ADDED: "${e.name}" from [${e.invoker}] to [${e.target || 'Self'}]`));
                    removed.forEach(e => logEvent(` -> EFFECT REMOVED/EXPIRED: "${e.name}" from [${e.invoker}] to [${e.target || 'Self'}]`));
                    
                    kept.forEach(newEff => {
                        const oldEff = activeEffects.find(e => e.id === newEff.id);
                        if (oldEff && oldEff.duration !== newEff.duration) {
                            logEvent(` -> EFFECT DURATION CHANGED: "${newEff.name}" targeting [${newEff.target || 'Self'}] (${oldEff.duration} -> ${newEff.duration})`);
                        }
                    });

                    activeEffects = newEffects;

                    wss.clients.forEach(client => {
                        if (client.readyState === WebSocket.OPEN) {
                            client.send(JSON.stringify({
                                type: "BROADCASTupdateEffects",
                                activeEffects,
                                senderId: clientId
                            }));
                        }
                    });
                    break;
                }  

                case 'REQUESTplayMusic': {
                    // Update global state for reconnecting clients
                    if (data.action === 'play') {
                        activeMusic.filePath = data.filePath;
                        activeMusic.isPlaying = true;
                    } else if (data.action === 'pause') {
                        activeMusic.isPlaying = false;
                    } else if (data.action === 'resume') {
                        activeMusic.isPlaying = true;
                    }

                    wss.clients.forEach(client => {
                        if (client.readyState === WebSocket.OPEN) {
                            client.send(JSON.stringify({
                                type: 'BROADCASTplayMusic',
                                action: data.action,
                                // Ensure filePath is always passed to avoid broken states on reconnect
                                filePath: data.filePath || activeMusic.filePath 
                            }));
                        }
                    });
                    break;
                }

                case 'REQUESTaddRollEvent': {
                    const roll = data.rollEvent;
                    const groupMark = roll.groupId ? ` [Group: ${roll.groupId}]` : '';
                    let actionDesc = roll.isTargeted ? 
                        `TARGETED ROLL: [${roll.attackerName}] -> [${roll.defenderName}]` : 
                        `STANDALONE ROLL: [${roll.combatantName}]`;
                    logEvent(`${actionDesc}${groupMark}`);

                    rollsHistory.push(data.rollEvent);
                    // Cap history at 50 events to prevent memory overflow
                    if (rollsHistory.length > 50) rollsHistory.shift();
        
                    wss.clients.forEach(client => {
                        if (client.readyState === WebSocket.OPEN) {
                            client.send(JSON.stringify({
                                type: 'BROADCASTaddRollEvent',
                                rollEvent: data.rollEvent
                            }));
                        }
                    });
                    break;
                }

                case 'REQUESTplayActionSequence': {
                    // Broadcast the action sequence to all clients simultaneously (including the initiator)
                    wss.clients.forEach(client => {
                        if (client.readyState === WebSocket.OPEN) {
                            client.send(JSON.stringify({
                                type: 'BROADCASTplayActionSequence',
                                payload: data.payload
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
                // Instantly free the lock if the owner disconnects
                if (serverLock.ownerId === clientInfo.clientId) {
                    releaseServerLock();
                }
                logEvent(`CLIENT DISCONNECTED: ${clientInfo.clientName} [ID: ${clientInfo.clientId}]`);
                connectedClients.delete(socket);
            }
        });
    });
}

// --- LOGGING SYSTEM ---
const logsDir = path.join(__dirname, 'logs');
if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
}

// Generate filename based on server start time (YYYY-MM-DD_HH-MM)
const now = new Date();
const pad = (n) => n.toString().padStart(2, '0');
const logFileName = `server_${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}_${pad(now.getHours())}-${pad(now.getMinutes())}.log`;
const logStream = fs.createWriteStream(path.join(logsDir, logFileName), { flags: 'a' });

function logEvent(message) {
    // Format timestamp for each log line
    const eventTime = new Date();
    const timeString = `${eventTime.getFullYear()}-${pad(eventTime.getMonth() + 1)}-${pad(eventTime.getDate())} ${pad(eventTime.getHours())}:${pad(eventTime.getMinutes())}:${pad(eventTime.getSeconds())}`;
    const formattedMessage = `[${timeString}] ${message}\n`;
    
    logStream.write(formattedMessage);
    console.log(`[LOG] ${message}`);
}

// Helper to determine exact changes between two combatant states for detailed logging
function getCombatantDiffLog(oldC, newC) {
    if (!oldC) return `(Unknown previous state)`;
    let changes = [];
    
    // Check Baseline & Initial Stats explicitly
    if (oldC.baselineStats && newC.baselineStats) {
        for (let k of Object.keys(newC.baselineStats)) {
            if (k === 'abilities' || k === 'equipment') {
                const oldNames = (oldC.baselineStats[k] || []).map(i => i.name).sort().join(', ');
                const newNames = (newC.baselineStats[k] || []).map(i => i.name).sort().join(', ');
                if (oldNames !== newNames) {
                    changes.push(`[Baseline] ${k}: [${oldNames || 'None'}] -> [${newNames || 'None'}]`);
                }
            } else if (typeof newC.baselineStats[k] !== 'object' && typeof oldC.baselineStats[k] !== 'object') {
                if (oldC.baselineStats[k] !== newC.baselineStats[k]) {
                    changes.push(`[Baseline] ${k}: ${oldC.baselineStats[k]} -> ${newC.baselineStats[k]}`);
                }
            }
        }
    }
    
    if (oldC.initialStats && newC.initialStats) {
        for (let k of Object.keys(newC.initialStats)) {
            if (k === 'abilities' || k === 'equipment') {
                const oldNames = (oldC.initialStats[k] || []).map(i => i.name).sort().join(', ');
                const newNames = (newC.initialStats[k] || []).map(i => i.name).sort().join(', ');
                if (oldNames !== newNames) {
                    changes.push(`[Initial] ${k}: [${oldNames || 'None'}] -> [${newNames || 'None'}]`);
                }
            } else if (typeof newC.initialStats[k] !== 'object' && typeof oldC.initialStats[k] !== 'object') {
                if (oldC.initialStats[k] !== newC.initialStats[k]) {
                    changes.push(`[Initial] ${k}: ${oldC.initialStats[k]} -> ${newC.initialStats[k]}`);
                }
            }
        }
    }
    
    // Check core survival states
    if (oldC.currentStats.hp !== newC.currentStats.hp) changes.push(`HP: ${oldC.currentStats.hp} -> ${newC.currentStats.hp}`);
    if (oldC.currentStats.maxHp !== newC.currentStats.maxHp) changes.push(`MaxHP: ${oldC.currentStats.maxHp} -> ${newC.currentStats.maxHp}`);
    if (oldC.isDead !== newC.isDead) changes.push(newC.isDead ? `DIED` : `RESURRECTED`);
    if (oldC.isStunned !== newC.isStunned) changes.push(newC.isStunned ? `STUNNED` : `STUN REMOVED`);
    if (oldC.turnsTakenThisRound !== newC.turnsTakenThisRound) changes.push(`Turns taken: ${oldC.turnsTakenThisRound} -> ${newC.turnsTakenThisRound}`);
    
    // Check abilities cooldowns changes explicitly for ability usage
    if (oldC.abilitiesStates && newC.abilitiesStates) {
        for (let ability in newC.abilitiesStates) {
            if (oldC.abilitiesStates[ability] && oldC.abilitiesStates[ability].currentCooldown !== newC.abilitiesStates[ability].currentCooldown) {
                const oldCd = oldC.abilitiesStates[ability].currentCooldown;
                const newCd = newC.abilitiesStates[ability].currentCooldown;
                
                // Identify if the ability was used (cooldown went from 0 to something else)
                if (oldCd === 0 && newCd !== 0) {
                    changes.push(`USED ABILITY: [${ability}] (CD: 0 -> ${newCd})`);
                } else {
                    changes.push(`CD [${ability}]: ${oldCd} -> ${newCd}`);
                }
            }
        }
    }
    
    // Check extra stats (damage, armor)
    // Removed old Mod/Perc logic from here as well
    const extraStats = ['damage', 'physArmor', 'magArmor'];
    for (let stat of extraStats) {
        if (oldC.currentStats[stat] !== newC.currentStats[stat]) {
            changes.push(`${stat}: ${oldC.currentStats[stat]} -> ${newC.currentStats[stat]}`);
        }
    }

    return changes.length > 0 ? changes.join(', ') : 'No tracked visual changes';
}
// --- END LOGGING SYSTEM ---

// Initialize the application
startServer();