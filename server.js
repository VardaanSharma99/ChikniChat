// ==========================================================
//  ReelRite Chat - Single File Server v2 (Improved UI)
// ==========================================================
const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;

// --- PART 1: IN-MEMORY MATCHMAKING API (No changes needed) ---
let waitingQueue = [];

app.get('/api/match', (req, res) => {
    const { peerId } = req.query;
    if (!peerId) return res.status(400).json({ error: 'peerId is required' });
    waitingQueue = waitingQueue.filter(id => id !== peerId);
    if (waitingQueue.length > 0) {
        const partnerId = waitingQueue.shift();
        console.log(`[Matchmaking] Matched ${peerId} with ${partnerId}`);
        res.status(200).json({ partnerId });
    } else {
        waitingQueue.push(peerId);
        console.log(`[Matchmaking] ${peerId} added to queue.`);
        res.status(200).json({ status: 'waiting' });
    }
});


// --- PART 2: THE ROOT ROUTE THAT SERVES THE ENTIRE APP ---
app.get('/', (req, res) => {
    const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>ReelRite Chat - Anonymous, Random Video Chat</title>
    <meta name="description" content="Connect instantly with random strangers for free anonymous video chat. No signup required.">
    <link rel="icon" href="data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>🦊</text></svg>">
    
    <style>
        /* --- General Setup --- */
        :root { --bg-color: #1a1a1a; --surface-color: rgba(30, 30, 30, 0.8); --primary-color: #2574ff; --danger-color: #ff3b30; --text-color: #f5f5f7; --text-secondary: #a8a8a8; }
        * { box-sizing: border-box; margin: 0; padding: 0; }
        html, body { height: 100%; width: 100%; overflow: hidden; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; background-color: var(--bg-color); color: var(--text-color); }

        /* --- UI Containers --- */
        .ui-container { display: none; }
        .ui-container.active { display: flex; }

        /* --- Lobby Screen --- */
        #lobby { flex-direction: column; justify-content: center; align-items: center; text-align: center; height: 100%; padding: 2rem; }
        #lobby .logo { font-size: 3.5rem; font-weight: bold; }
        #lobby .logo span { font-size: 5rem; vertical-align: middle; }
        #lobby p { font-size: 1.2rem; color: var(--text-secondary); margin: 1rem 0 2rem 0; max-width: 500px; }
        #start-btn { background-color: var(--primary-color); color: white; border: none; padding: 1rem 2.5rem; font-size: 1.2rem; font-weight: bold; cursor: pointer; border-radius: 50px; transition: transform 0.2s, box-shadow 0.2s; }
        #start-btn:hover { transform: scale(1.05); box-shadow: 0 5px 20px rgba(37, 116, 255, 0.4); }
        .permission-text { margin-top: 1.5rem; font-size: 0.9rem; color: var(--text-secondary); }

        /* --- Main Chat UI --- */
        #chat-ui { position: fixed; top: 0; left: 0; width: 100%; height: 100%; }
        #video-container { position: absolute; top: 0; left: 0; width: 100%; height: 100%; background-color: #000; }
        #remote-video { width: 100%; height: 100%; object-fit: cover; transform: scaleX(-1); }
        #local-video-pip { position: absolute; bottom: 20px; right: 20px; width: 20vw; max-width: 320px; min-width: 150px; border-radius: 12px; border: 2px solid var(--primary-color); overflow: hidden; box-shadow: 0 5px 15px rgba(0,0,0,0.5); cursor: move; z-index: 100; }
        #local-video-pip video { width: 100%; height: 100%; object-fit: cover; transform: scaleX(-1); display: block; }
        
        /* --- Status Overlay (Connecting, etc.) --- */
        #status-overlay { position: absolute; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.8); z-index: 90; display: flex; flex-direction: column; justify-content: center; align-items: center; transition: opacity 0.3s; }
        #status-overlay.hidden { opacity: 0; pointer-events: none; }
        .spinner { border: 4px solid rgba(255,255,255,0.3); border-top: 4px solid var(--primary-color); border-radius: 50%; width: 60px; height: 60px; animation: spin 1s linear infinite; }
        @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
        #status-text { margin-top: 1.5rem; font-size: 1.2rem; }

        /* --- Chat & Controls Overlay --- */
        #chat-controls-overlay { position: absolute; bottom: 0; left: 0; width: 100%; z-index: 95; padding: 20px; display: flex; justify-content: center; align-items: flex-end; background: linear-gradient(to top, rgba(0,0,0,0.7), transparent); }
        .controls-bar { display: flex; align-items: center; gap: 15px; padding: 12px 20px; background-color: var(--surface-color); backdrop-filter: blur(10px); border-radius: 50px; box-shadow: 0 5px 15px rgba(0,0,0,0.3); }
        .control-btn { background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.15); color: var(--text-color); width: 50px; height: 50px; border-radius: 50%; font-size: 1.5rem; cursor: pointer; display: flex; justify-content: center; align-items: center; transition: background-color 0.2s; }
        .control-btn:hover { background: rgba(255,255,255,0.2); }
        #next-btn { background-color: var(--primary-color); color: white; border: none; font-weight: bold; font-size: 1rem; padding: 0 25px; height: 50px; border-radius: 25px; display: flex; align-items: center; gap: 8px; }
        #next-btn:hover { filter: brightness(1.1); }
        #end-btn { background-color: var(--danger-color); color: white; border: none; }
    </style>
</head>
<body>
    <!-- Lobby Screen: Shown on first load -->
    <div id="lobby" class="ui-container active">
        <h1 class="logo">ReelRite <span>🦊</span></h1>
        <p>Connect instantly with random people from around the world. Your conversations are anonymous and secure.</p>
        <button id="start-btn">Start Chatting</button>
        <p class="permission-text">Camera and microphone access will be requested.</p>
    </div>

    <!-- Main Chat UI: Hidden until chat starts -->
    <div id="chat-ui" class="ui-container">
        <div id="video-container">
            <video id="remote-video" autoplay playsinline></video>
        </div>

        <div id="local-video-pip">
            <video id="local-video" muted autoplay playsinline></video>
        </div>

        <div id="status-overlay">
            <div class="spinner"></div>
            <p id="status-text">Searching for a partner...</p>
        </div>

        <div id="chat-controls-overlay">
            <div class="controls-bar">
                <button id="mic-btn" class="control-btn" title="Mute/Unmute Mic">🎤</button>
                <button id="cam-btn" class="control-btn" title="Hide/Show Camera">📷</button>
                <button id="end-btn" class="control-btn" title="End Session">⏹️</button>
                <button id="next-btn" title="Find Next User">Next ➡️</button>
            </div>
        </div>
    </div>
    
    <script src="https://unpkg.com/peerjs@1.4.7/dist/peerjs.min.js"></script>
    <script>
        document.addEventListener('DOMContentLoaded', () => {
            // UI Elements
            const lobbyUI = document.getElementById('lobby');
            const chatUI = document.getElementById('chat-ui');
            const startBtn = document.getElementById('start-btn');
            
            // Video Elements
            const localVideo = document.getElementById('local-video');
            const remoteVideo = document.getElementById('remote-video');
            const localVideoPip = document.getElementById('local-video-pip');

            // Status & Controls
            const statusOverlay = document.getElementById('status-overlay');
            const statusText = document.getElementById('status-text');
            const nextBtn = document.getElementById('next-btn');
            const endBtn = document.getElementById('end-btn');
            const micBtn = document.getElementById('mic-btn');
            const camBtn = document.getElementById('cam-btn');

            // App State
            let localStream, peer, currentCall, myPeerId;

            // --- Main Flow ---
            startBtn.addEventListener('click', startChatSession);
            
            async function startChatSession() {
                try {
                    lobbyUI.querySelector('p').textContent = 'Requesting permissions...';
                    localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
                    localVideo.srcObject = localStream;
                    
                    lobbyUI.classList.remove('active');
                    chatUI.classList.add('active');
                    
                    initializePeer();
                } catch (err) {
                    lobbyUI.querySelector('p').textContent = 'Camera and microphone access is required to chat. Please refresh and allow permissions.';
                }
            }

            // --- PeerJS Logic ---
            function initializePeer() {
                peer = new Peer(undefined, { host: 'peerjs-server.fly.dev', secure: true, port: 443 });
                peer.on('open', id => { myPeerId = id; findPartner(); });
                peer.on('call', handleIncomingCall);
                peer.on('error', (err) => {
                    console.error('PeerJS error:', err);
                    showStatus('Connection error, retrying...');
                    setTimeout(findPartner, 5000);
                });
            }

            function handleIncomingCall(call) {
                currentCall = call;
                call.answer(localStream);
                call.on('stream', (remoteStream) => {
                    hideStatus();
                    remoteVideo.srcObject = remoteStream;
                });
                call.on('close', handlePartnerDisconnect);
            }
            
            function handlePartnerDisconnect() {
                addSystemMessage('Partner has disconnected.');
                cleanUpConnection();
                findPartner();
            }

            async function findPartner() {
                showStatus('Searching for a partner...');
                try {
                    const response = await fetch(\`/api/match?peerId=\${myPeerId}\`);
                    const data = await response.json();
                    if (data.partnerId) {
                        connectToPartner(data.partnerId);
                    } else {
                        showStatus('You are in the queue...');
                    }
                } catch (error) {
                    showStatus('Error finding partner. Retrying...');
                    setTimeout(findPartner, 5000);
                }
            }

            function connectToPartner(partnerId) {
                showStatus('Partner found! Connecting...');
                const call = peer.call(partnerId, localStream);
                currentCall = call;
                call.on('stream', (remoteStream) => {
                    hideStatus();
                    remoteVideo.srcObject = remoteStream;
                });
                call.on('close', handlePartnerDisconnect);
            }

            function cleanUpConnection() {
                if (currentCall) {
                    currentCall.close();
                }
                currentCall = null;
                remoteVideo.srcObject = null;
            }

            // --- UI Control Handlers ---
            nextBtn.addEventListener('click', () => {
                cleanUpConnection();
                findPartner();
            });

            endBtn.addEventListener('click', () => {
                if (peer) peer.destroy();
                if (localStream) localStream.getTracks().forEach(track => track.stop());
                chatUI.classList.remove('active');
                lobbyUI.classList.add('active');
                lobbyUI.querySelector('p').textContent = 'Connect instantly with random people from around the world. Your conversations are anonymous and secure.';
            });
            
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
            
            function showStatus(message) {
                statusText.textContent = message;
                statusOverlay.classList.remove('hidden');
            }

            function hideStatus() {
                statusOverlay.classList.add('hidden');
            }
            
            // This is a placeholder for future text chat
            function addSystemMessage(text) {
                console.log(`System: ${text}`);
            }

            // --- Draggable PiP Video ---
            let isDragging = false;
            let offsetX, offsetY;

            localVideoPip.addEventListener('mousedown', (e) => {
                isDragging = true;
                offsetX = e.clientX - localVideoPip.offsetLeft;
                offsetY = e.clientY - localVideoPip.offsetTop;
                localVideoPip.style.transition = 'none'; // Disable transition while dragging
            });

            document.addEventListener('mousemove', (e) => {
                if (!isDragging) return;
                let newX = e.clientX - offsetX;
                let newY = e.clientY - offsetY;

                // Constrain to viewport
                const parentRect = document.body.getBoundingClientRect();
                const pipRect = localVideoPip.getBoundingClientRect();
                newX = Math.max(0, Math.min(newX, parentRect.width - pipRect.width));
                newY = Math.max(0, Math.min(newY, parentRect.height - pipRect.height));
                
                localVideoPip.style.left = \`\${newX}px\`;
                localVideoPip.style.top = \`\${newY}px\`;
            });

            document.addEventListener('mouseup', () => {
                isDragging = false;
                localVideoPip.style.transition = ''; // Re-enable transition
            });
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
    console.log(`[Server] ReelRite server v2 is live on port ${PORT}`);
});
