// =======================================================================
//  ReelRite Chat - Single File Server v8 (Ultimate Stability & Debug)
// =======================================================================
const express = require('express');
const http = require('http');
const { ExpressPeerServer } = require('peer');

const app = express();
const PORT = process.env.PORT || 3000;

// It's crucial to create an HTTP server to attach the PeerJS server to.
const server = http.createServer(app);

// --- PART 1: SELF-HOSTED PEERJS SERVER with DEBUG LOGGING ---
const peerServer = ExpressPeerServer(server, {
    debug: false, // Set to false for cleaner logs, true for verbose
    path: '/broker'
});

// Add listeners to the peer server to see what's happening
peerServer.on('connection', (client) => {
    console.log(`[PeerJS] Client connected: ${client.getId()}`);
});
peerServer.on('disconnect', (client) => {
    console.log(`[PeerJS] Client disconnected: ${client.getId()}`);
});

app.use('/broker', peerServer);


// --- PART 2: ROBUST SERVER-SIDE MATCHMAKING LOGIC ---
const activeUsers = new Map();
const waitingPeers = new Set();
app.get('/api/stats', (req, res) => res.json({ online: activeUsers.size }));
app.post('/api/heartbeat', (req, res) => {
    const { peerId } = req.query;
    if (peerId) activeUsers.set(peerId, Date.now());
    res.status(200).send();
});
app.get('/api/match', (req, res) => {
    const { peerId } = req.query;
    if (!peerId) return res.status(400).json({ error: 'peerId is required' });
    activeUsers.set(peerId, Date.now());
    waitingPeers.delete(peerId);
    const waitingArray = Array.from(waitingPeers);
    if (waitingArray.length > 0) {
        const partnerId = waitingArray.shift();
        waitingPeers.delete(partnerId);
        res.json({ partnerId: partnerId });
    } else {
        waitingPeers.add(peerId);
        res.json({ status: 'waiting' });
    }
});
setInterval(() => {
    const now = Date.now();
    for (const [peerId, timestamp] of activeUsers.entries()) {
        if (now - timestamp > 20000) {
            activeUsers.delete(peerId);
            waitingPeers.delete(peerId);
        }
    }
}, 30000);


// --- PART 3: THE ROOT ROUTE THAT SERVES THE ENTIRE APP ---
app.get('/', (req, res) => {
    const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>ReelRite - Anonymous Text Chat</title>
    <style>
        :root { --bg-color: #18191a; --surface-color: #242526; --header-color: #3a3b3c; --primary-color: #0084ff; --danger-color: #e41e3f; --text-color: #e4e6eb; --text-secondary: #b0b3b8; --font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; }
        * { box-sizing: border-box; margin: 0; padding: 0; }
        html, body { height: 100%; width: 100%; overflow: hidden; font-family: var(--font-family); background-color: var(--bg-color); color: var(--text-color); }
        .ui-container { display: none; height: 100%; width: 100%; }
        .ui-container.active { display: flex; }
        #lobby { flex-direction: column; justify-content: center; align-items: center; text-align: center; padding: 2rem; }
        #lobby h1 { font-size: 3rem; font-weight: bold; }
        #lobby p { font-size: 1.1rem; color: var(--text-secondary); margin: 1rem 0; max-width: 500px; }
        #online-status { margin: 1rem 0 2rem 0; font-size: 1rem; color: #45bd62; font-weight: 500; }
        #start-btn { background-color: var(--primary-color); color: white; border: none; padding: 0.8rem 2rem; font-size: 1.1rem; font-weight: 600; cursor: pointer; border-radius: 8px; transition: transform 0.2s, filter 0.2s; }
        #start-btn:hover { filter: brightness(1.1); }
        #status-overlay { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.7); z-index: 100; display: flex; flex-direction: column; justify-content: center; align-items: center; transition: opacity 0.3s; }
        #status-overlay.hidden { opacity: 0; pointer-events: none; }
        .spinner { border: 4px solid rgba(255,255,255,0.2); border-top: 4px solid var(--primary-color); border-radius: 50%; width: 50px; height: 50px; animation: spin 1s linear infinite; }
        @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
        #status-text { margin-top: 1.5rem; font-size: 1.1rem; }
        #chat-ui { flex-direction: column; }
        #chat-header { display: flex; justify-content: space-between; align-items: center; padding: 0 1rem; height: 60px; background-color: var(--surface-color); border-bottom: 1px solid var(--header-color); flex-shrink: 0; }
        #chat-header .status { font-weight: 600; }
        #chat-header .status .dot { display: inline-block; width: 10px; height: 10px; background-color: #45bd62; border-radius: 50%; margin-right: 8px; }
        #chat-header .controls button { background: var(--header-color); color: var(--text-color); border: none; padding: 0.5rem 1rem; margin-left: 0.5rem; border-radius: 6px; font-weight: 600; cursor: pointer; transition: filter 0.2s; }
        #chat-header .controls button:hover { filter: brightness(1.2); }
        #chat-header .controls #end-btn { background-color: var(--danger-color); }
        #message-container { flex-grow: 1; padding: 1rem; overflow-y: auto; }
        .message { margin-bottom: 12px; display: flex; flex-direction: column; max-width: 75%; }
        .message p { padding: 10px 15px; border-radius: 18px; line-height: 1.4; word-wrap: break-word; }
        .message.local { align-self: flex-end; align-items: flex-end; }
        .message.local p { background-color: var(--primary-color); color: white; }
        .message.remote { align-self: flex-start; align-items: flex-start; }
        .message.remote p { background-color: var(--header-color); }
        .message.system { align-self: center; text-align: center; font-style: italic; font-size: 0.8rem; color: var(--text-secondary); max-width: 100%; }
        #chat-form { display: flex; padding: 1rem; border-top: 1px solid var(--header-color); flex-shrink: 0; }
        #chat-input { flex-grow: 1; background: var(--header-color); border: 1px solid var(--surface-color); color: var(--text-color); padding: 0.8rem; border-radius: 18px; font-size: 1rem; }
        #chat-input:focus { outline: none; border-color: var(--primary-color); }
    </style>
</head>
<body>
    <div id="lobby" class="ui-container active"><h1>ReelRite Chat 🦊</h1><p>Chat anonymously with a random stranger. No logs. No history. Just conversation.</p><div id="online-status">🟢 <span id="online-counter">--</span> users online</div><button id="start-btn">Start Chatting</button></div>
    <div id="chat-ui" class="ui-container"><header id="chat-header"><div class="status"><span class="dot"></span>Connected</div><div class="controls"><button id="end-btn">End</button><button id="next-btn">Next</button></div></header><main id="message-container"></main><form id="chat-form"><input id="chat-input" placeholder="Type a message..." autocomplete="off" disabled/></form></div>
    <div id="status-overlay" class="hidden"><div class="spinner"></div><p id="status-text">Searching...</p></div>
    <script src="https://unpkg.com/peerjs@1.4.7/dist/peerjs.min.js"></script>
    <script>
        document.addEventListener('DOMContentLoaded', () => {
            const lobbyUI = document.getElementById('lobby'), chatUI = document.getElementById('chat-ui');
            const onlineCounter = document.getElementById('online-counter'), startBtn = document.getElementById('start-btn');
            const statusOverlay = document.getElementById('status-overlay'), statusText = document.getElementById('status-text');
            const nextBtn = document.getElementById('next-btn'), endBtn = document.getElementById('end-btn');
            const messageContainer = document.getElementById('message-container'), chatForm = document.getElementById('chat-form'), chatInput = document.getElementById('chat-input');
            let peer, currentDataConnection, myPeerId, matchmakingInterval, heartbeatInterval, statsInterval;

            async function updateOnlineCount() {
                try {
                    const response = await fetch('/api/stats');
                    const data = await response.json();
                    onlineCounter.textContent = data.online || 1;
                } catch (error) { onlineCounter.textContent = '--'; }
            }
            statsInterval = setInterval(updateOnlineCount, 5000);
            updateOnlineCount();

            startBtn.addEventListener('click', () => {
                clearInterval(statsInterval);
                lobbyUI.classList.remove('active');
                statusOverlay.classList.remove('hidden');
                initializePeer();
            });

            function initializePeer() {
                if (peer) peer.destroy();
                showStatus("Connecting to server...");
                peer = new Peer(undefined, {
                    host: location.hostname, // Use the same hostname
                    port: location.port || (location.protocol === 'https:' ? 443 : 80),
                    path: '/broker',
                    // No need to set secure, port, or host manually, this is more robust
                });
                peer.on('open', id => { myPeerId = id; startHeartbeat(); startMatchmaking(); });
                peer.on('connection', handleIncomingDataConnection);
                peer.on('error', (err) => {
                    // DETAILED ERROR LOGGING
                    console.error('PEERJS FATAL ERROR: ', err);
                    console.error('Error Type: ', err.type);
                    showStatus(\`Connection Error (\${err.type}). Please refresh.\`);
                });
            }

            function startHeartbeat() {
                if (heartbeatInterval) clearInterval(heartbeatInterval);
                heartbeatInterval = setInterval(() => { if (myPeerId) fetch(\`/api/heartbeat?peerId=\${myPeerId}\`, { method: 'POST' }); }, 10000);
            }

            function startMatchmaking() {
                showStatus('Searching for a stranger...');
                if (matchmakingInterval) clearInterval(matchmakingInterval);
                const poll = async () => {
                    if (!myPeerId) return;
                    try {
                        const response = await fetch(\`/api/match?peerId=\${myPeerId}\`);
                        const data = await response.json();
                        if (data.partnerId) {
                            clearInterval(matchmakingInterval);
                            connectToPartner(data.partnerId);
                        }
                    } catch (error) { console.error('Matchmaking poll failed:', error); }
                };
                poll();
                matchmakingInterval = setInterval(poll, 3000);
            }

            function handleIncomingDataConnection(conn) {
                if (matchmakingInterval) clearInterval(matchmakingInterval);
                currentDataConnection = conn;
                setupDataConnection(conn);
            }
            function connectToPartner(partnerId) {
                const conn = peer.connect(partnerId, { reliable: true });
                currentDataConnection = conn;
                setupDataConnection(conn);
            }
            function setupDataConnection(conn) {
                conn.on('open', () => {
                    hideStatus();
                    chatUI.classList.add('active');
                    addSystemMessage('You are now connected to a stranger. Say hi!');
                    enableChat();
                });
                conn.on('data', (data) => addChatMessage('Stranger', data));
                conn.on('close', handlePartnerDisconnect);
            }
            function handlePartnerDisconnect() {
                if (!currentDataConnection) return;
                addSystemMessage('Stranger has disconnected.');
                cleanUpConnection();
                startMatchmaking();
            }
            function cleanUpConnection() {
                if (currentDataConnection) currentDataConnection.close();
                currentDataConnection = null;
                disableChat();
                messageContainer.innerHTML = '';
                chatUI.classList.remove('active');
            }
            
            nextBtn.addEventListener('click', () => {
                if (currentDataConnection) handlePartnerDisconnect();
                else startMatchmaking();
            });
            endBtn.addEventListener('click', () => window.location.reload());
            chatForm.addEventListener('submit', (e) => {
                e.preventDefault();
                const message = chatInput.value;
                if (message.trim() && currentDataConnection) {
                    currentDataConnection.send(message);
                    addChatMessage('You', message);
                    chatInput.value = '';
                }
            });
            
            function enableChat() { chatInput.disabled = false; chatInput.focus(); }
            function disableChat() { chatInput.disabled = true; }
            function addChatMessage(author, text) {
                const messageDiv = document.createElement('div');
                const type = author === 'You' ? 'local' : 'remote';
                messageDiv.className = \`message \${type}\`;
                messageDiv.innerHTML = \`<p>\${text}</p>\`;
                messageContainer.appendChild(messageDiv);
                messageContainer.scrollTop = messageContainer.scrollHeight;
            }
            function addSystemMessage(text) {
                const messageDiv = document.createElement('div');
                messageDiv.className = 'message system';
                messageDiv.innerHTML = \`<p>\${text}</p>\`;
                messageContainer.appendChild(messageDiv);
            }
            function showStatus(message) { statusText.textContent = message; statusOverlay.classList.remove('hidden'); }
            function hideStatus() { statusOverlay.classList.add('hidden'); }
        });
    </script>
</body>
</html>
    `;
    res.setHeader('Content-Type', 'text/html');
    res.send(htmlContent);
});

// --- PART 4: START THE SERVER ---
// It's crucial to listen on the http server, not the Express app.
server.listen(PORT, () => {
    console.log(`[Server] ReelRite TEXT-ONLY server v8 is live on port ${PORT}`);
});
