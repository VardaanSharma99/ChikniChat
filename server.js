// =======================================================================
//  ReelRite Chat - Single File Server v5 (Video + Text Chat)
// =======================================================================
const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;

// --- PART 1: ROBUST SERVER-SIDE LOGIC (No changes needed) ---
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
        console.log(`[Matchmaking] Paired ${peerId} with ${partnerId}`);
        res.json({ partnerId: partnerId });
    } else {
        waitingPeers.add(peerId);
        console.log(`[Matchmaking] ${peerId} is now waiting.`);
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

// --- PART 2: THE ROOT ROUTE THAT SERVES THE ENTIRE APP ---
app.get('/', (req, res) => {
    const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>ReelRite Chat - Anonymous Video & Text Chat</title>
    <meta name="description" content="Connect with random strangers for free anonymous video, audio, and text chat. No signup required.">
    <link rel="icon" href="data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>🦊</text></svg>">
    <style>
        :root { --bg-color: #1a1a1a; --surface-color: rgba(30, 30, 30, 0.85); --primary-color: #2574ff; --danger-color: #ff3b30; --text-color: #f5f5f7; --text-secondary: #a8a8a8; --font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; }
        * { box-sizing: border-box; margin: 0; padding: 0; }
        html, body { height: 100%; width: 100%; overflow: hidden; font-family: var(--font-family); background-color: var(--bg-color); color: var(--text-color); }
        .ui-container { display: none; }
        .ui-container.active { display: flex; }
        #lobby { flex-direction: column; justify-content: center; align-items: center; text-align: center; height: 100%; padding: 2rem; }
        #lobby .logo { font-size: 3.5rem; font-weight: bold; }
        #lobby p { font-size: 1.2rem; color: var(--text-secondary); margin: 1rem 0; max-width: 500px; }
        #online-status { margin: 1rem 0 2rem 0; font-size: 1rem; color: var(--primary-color); font-weight: 500; }
        #start-btn { background-color: var(--primary-color); color: white; border: none; padding: 1rem 2.5rem; font-size: 1.2rem; font-weight: bold; cursor: pointer; border-radius: 50px; transition: transform 0.2s, box-shadow 0.2s; }
        #start-btn:hover { transform: scale(1.05); box-shadow: 0 5px 20px rgba(37, 116, 255, 0.4); }
        #chat-ui { position: fixed; top: 0; left: 0; width: 100%; height: 100%; }
        #video-container { position: absolute; top: 0; left: 0; width: 100%; height: 100%; background-color: #000; }
        #remote-video { width: 100%; height: 100%; object-fit: cover; transform: scaleX(-1); }
        #local-video-pip { position: absolute; bottom: 20px; right: 20px; width: 20vw; max-width: 320px; min-width: 150px; border-radius: 12px; border: 2px solid var(--primary-color); overflow: hidden; box-shadow: 0 5px 15px rgba(0,0,0,0.5); cursor: move; z-index: 100; }
        #local-video-pip video { width: 100%; height: 100%; object-fit: cover; transform: scaleX(-1); display: block; }
        #status-overlay { position: absolute; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.8); z-index: 90; display: flex; flex-direction: column; justify-content: center; align-items: center; transition: opacity 0.3s; }
        #status-overlay.hidden { opacity: 0; pointer-events: none; }
        .spinner { border: 4px solid rgba(255,255,255,0.3); border-top: 4px solid var(--primary-color); border-radius: 50%; width: 60px; height: 60px; animation: spin 1s linear infinite; }
        @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
        #status-text { margin-top: 1.5rem; font-size: 1.2rem; }
        #chat-controls-overlay { position: absolute; bottom: 0; left: 0; width: 100%; z-index: 95; padding: 20px; display: flex; justify-content: space-between; align-items: flex-end; background: linear-gradient(to top, rgba(0,0,0,0.7), transparent); pointer-events: none; }
        .controls-bar { display: flex; align-items: center; gap: 15px; padding: 12px; background-color: var(--surface-color); backdrop-filter: blur(10px); border-radius: 50px; box-shadow: 0 5px 15px rgba(0,0,0,0.3); margin: 0 auto; pointer-events: all; }
        .control-btn { background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.15); color: var(--text-color); width: 50px; height: 50px; border-radius: 50%; font-size: 1.5rem; cursor: pointer; display: flex; justify-content: center; align-items: center; transition: background-color 0.2s; position: relative; }
        .control-btn:hover { background: rgba(255,255,255,0.2); }
        .notification-badge { position: absolute; top: 5px; right: 5px; width: 10px; height: 10px; background-color: var(--danger-color); border-radius: 50%; display: none; }
        #next-btn { background-color: var(--primary-color); color: white; border: none; font-weight: bold; font-size: 1rem; padding: 0 25px; height: 50px; border-radius: 25px; display: flex; align-items: center; gap: 8px; }
        #next-btn:hover { filter: brightness(1.1); }
        #end-btn { background-color: var(--danger-color); color: white; border: none; }
        
        /* --- Text Chat Window --- */
        #chat-window { position: absolute; bottom: 100px; left: 20px; width: 340px; height: 450px; background-color: var(--surface-color); backdrop-filter: blur(10px); border-radius: 12px; box-shadow: 0 5px 15px rgba(0,0,0,0.3); z-index: 94; display: flex; flex-direction: column; overflow: hidden; transform: translateY(120%); transition: transform 0.3s ease-in-out; pointer-events: all; }
        #chat-window.open { transform: translateY(0); }
        #message-list { flex-grow: 1; padding: 15px; overflow-y: auto; }
        .message { margin-bottom: 12px; display: flex; flex-direction: column; }
        .message .author { font-size: 0.8rem; color: var(--text-secondary); margin-bottom: 4px; }
        .message p { padding: 8px 12px; border-radius: 18px; line-height: 1.4; max-width: 80%; word-wrap: break-word; }
        .message.local { align-items: flex-end; }
        .message.local .author { color: #81c784; }
        .message.local p { background-color: var(--primary-color); color: white; }
        .message.remote { align-items: flex-start; }
        .message.remote .author { color: #bb86fc; }
        .message.remote p { background-color: #373737; }
        .message.system { align-items: center; font-style: italic; font-size: 0.8rem; color: var(--text-secondary); }
        #chat-form { display: flex; padding: 10px; border-top: 1px solid rgba(255,255,255,0.1); }
        #chat-input { flex-grow: 1; background: rgba(0,0,0,0.2); border: 1px solid rgba(255,255,255,0.1); color: var(--text-color); padding: 10px; border-radius: 20px; font-size: 1rem; }
        #chat-input:disabled { background-color: rgba(0,0,0,0.5); }
    </style>
</head>
<body>
    <div id="lobby" class="ui-container active">
        <h1 class="logo">ReelRite <span>🦊</span></h1>
        <p>Anonymous Video & Text Chat</p>
        <div id="online-status">🟢 <span id="online-counter">--</span> users online</div>
        <button id="start-btn">Start Chatting</button>
    </div>
    <div id="chat-ui" class="ui-container">
        <div id="video-container"><video id="remote-video" autoplay playsinline></video></div>
        <div id="local-video-pip"><video id="local-video" muted autoplay playsinline></video></div>
        <div id="status-overlay"><div class="spinner"></div><p id="status-text">Searching...</p></div>
        <div id="chat-window"><div id="message-list"></div><form id="chat-form"><input id="chat-input" placeholder="Type a message..." autocomplete="off" disabled/></form></div>
        <div id="chat-controls-overlay">
            <div class="controls-bar">
                <button id="mic-btn" class="control-btn" title="Mute Mic">🎤</button>
                <button id="cam-btn" class="control-btn" title="Hide Camera">📷</button>
                <button id="chat-btn" class="control-btn" title="Toggle Chat">💬<div class="notification-badge"></div></button>
                <button id="end-btn" class="control-btn" title="End Session">⏹️</button>
                <button id="next-btn" title="Find Next User">Next ➡️</button>
            </div>
        </div>
    </div>
    <script src="https://unpkg.com/peerjs@1.4.7/dist/peerjs.min.js"></script>
    <script>
        document.addEventListener('DOMContentLoaded', () => {
            const lobbyUI = document.getElementById('lobby'), chatUI = document.getElementById('chat-ui');
            const onlineCounter = document.getElementById('online-counter');
            const startBtn = document.getElementById('start-btn');
            const localVideo = document.getElementById('local-video'), remoteVideo = document.getElementById('remote-video');
            const statusOverlay = document.getElementById('status-overlay'), statusText = document.getElementById('status-text');
            const nextBtn = document.getElementById('next-btn'), endBtn = document.getElementById('end-btn');
            const micBtn = document.getElementById('mic-btn'), camBtn = document.getElementById('cam-btn');
            const chatBtn = document.getElementById('chat-btn'), chatWindow = document.getElementById('chat-window');
            const messageList = document.getElementById('message-list'), chatForm = document.getElementById('chat-form'), chatInput = document.getElementById('chat-input');
            let localStream, peer, currentCall, currentDataConnection, myPeerId;
            let matchmakingInterval, heartbeatInterval, statsInterval;

            // --- Lobby Logic ---
            async function updateOnlineCount() {
                try {
                    const response = await fetch('/api/stats');
                    const data = await response.json();
                    onlineCounter.textContent = data.online || 1;
                } catch (error) { onlineCounter.textContent = '--'; }
            }
            statsInterval = setInterval(updateOnlineCount, 5000);
            updateOnlineCount();

            // --- Main Flow ---
            startBtn.addEventListener('click', startChatSession);
            
            async function startChatSession() {
                try {
                    localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
                    localVideo.srcObject = localStream;
                    clearInterval(statsInterval);
                    lobbyUI.classList.remove('active');
                    chatUI.classList.add('active');
                    initializePeer();
                } catch (err) { alert('Camera/mic access is required. Please refresh and allow permissions.'); }
            }

            function initializePeer() {
                if (peer) peer.destroy();
                peer = new Peer(undefined, { host: 'peerjs-server.fly.dev', secure: true, port: 443 });
                peer.on('open', id => {
                    myPeerId = id;
                    startHeartbeat();
                    startMatchmaking();
                });
                peer.on('call', handleIncomingCall);
                peer.on('connection', handleIncomingDataConnection); // Listen for data connection
                peer.on('error', (err) => { console.error('PeerJS error:', err); showStatus('Connection error...'); });
            }

            // --- Heartbeat & Matchmaking ---
            function startHeartbeat() {
                if (heartbeatInterval) clearInterval(heartbeatInterval);
                heartbeatInterval = setInterval(() => { if (myPeerId) fetch(\`/api/heartbeat?peerId=\${myPeerId}\`, { method: 'POST' }); }, 10000);
            }

            function startMatchmaking() {
                showStatus('Searching for a partner...');
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

            function handleIncomingCall(call) {
                if (matchmakingInterval) clearInterval(matchmakingInterval);
                currentCall = call;
                call.answer(localStream);
                call.on('stream', (remoteStream) => {
                    hideStatus();
                    remoteVideo.srcObject = remoteStream;
                });
                call.on('close', handlePartnerDisconnect);
            }

            // --- Data Channel (Text Chat) Logic ---
            function handleIncomingDataConnection(conn) {
                currentDataConnection = conn;
                setupDataConnection(conn);
            }

            function setupDataConnection(conn) {
                conn.on('open', () => {
                    addSystemMessage('Partner connected. Say hi!');
                    enableChat();
                });
                conn.on('data', (data) => {
                    addChatMessage('Partner', data);
                    if (!chatWindow.classList.contains('open')) {
                        chatBtn.querySelector('.notification-badge').style.display = 'block';
                    }
                });
                conn.on('close', handlePartnerDisconnect);
            }
            
            function connectToPartner(partnerId) {
                // Connect both media (video) and data (text)
                const call = peer.call(partnerId, localStream);
                currentCall = call;
                call.on('stream', (remoteStream) => {
                    hideStatus();
                    remoteVideo.srcObject = remoteStream;
                });
                call.on('close', handlePartnerDisconnect);

                const conn = peer.connect(partnerId);
                currentDataConnection = conn;
                setupDataConnection(conn);
            }

            function handlePartnerDisconnect() {
                addSystemMessage('Partner has disconnected.');
                cleanUpConnection();
                startMatchmaking();
            }

            function cleanUpConnection() {
                if (currentCall) currentCall.close();
                if (currentDataConnection) currentDataConnection.close();
                currentCall = null;
                currentDataConnection = null;
                remoteVideo.srcObject = null;
                disableChat();
                messageList.innerHTML = ''; // Clear chat history
            }
            
            // --- UI Control Handlers ---
            nextBtn.addEventListener('click', () => { cleanUpConnection(); startMatchmaking(); });
            endBtn.addEventListener('click', () => { window.location.reload(); });
            
            micBtn.addEventListener('click', () => {
                const audioTrack = localStream.getAudioTracks()[0];
                audioTrack.enabled = !audioTrack.enabled;
                micBtn.innerHTML = audioTrack.enabled ? '🎤' : '<span style="color:var(--danger-color);">🔇</span>';
            });
            camBtn.addEventListener('click', () => {
                const videoTrack = localStream.getVideoTracks()[0];
                videoTrack.enabled = !videoTrack.enabled;
                camBtn.innerHTML = videoTrack.enabled ? '📷' : '<span style="color:var(--danger-color);">📸</span>';
            });

            chatBtn.addEventListener('click', () => {
                chatWindow.classList.toggle('open');
                chatBtn.querySelector('.notification-badge').style.display = 'none';
            });

            chatForm.addEventListener('submit', (e) => {
                e.preventDefault();
                const message = chatInput.value;
                if (message.trim() && currentDataConnection) {
                    currentDataConnection.send(message);
                    addChatMessage('You', message);
                    chatInput.value = '';
                }
            });

            function enableChat() { chatInput.disabled = false; }
            function disableChat() { chatInput.disabled = true; }

            function addChatMessage(author, text) {
                const messageDiv = document.createElement('div');
                const type = author === 'You' ? 'local' : 'remote';
                messageDiv.className = \`message \${type}\`;
                messageDiv.innerHTML = \`<div class="author">\${author}</div><p>\${text}</p>\`;
                messageList.appendChild(messageDiv);
                messageList.scrollTop = messageList.scrollHeight;
            }
            function addSystemMessage(text) {
                const messageDiv = document.createElement('div');
                messageDiv.className = 'message system';
                messageDiv.innerHTML = \`<p>\${text}</p>\`;
                messageList.appendChild(messageDiv);
                messageList.scrollTop = messageList.scrollHeight;
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

// --- PART 3: START THE SERVER ---
app.listen(PORT, () => {
    console.log(`[Server] ReelRite server v5 is live on port ${PORT}`);
});
