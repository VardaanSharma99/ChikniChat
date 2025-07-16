// =======================================================================
//  ReelRite Chat - Single File Server v4 (Connection Fix & Live Count)
// =======================================================================
const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;

// --- PART 1: ROBUST SERVER-SIDE LOGIC ---

// A Map to store active users and their last heartbeat timestamp.
// Key: peerId, Value: timestamp
const activeUsers = new Map();
// A Set to store users waiting for a match.
const waitingPeers = new Set();

// API to get current stats (online users)
app.get('/api/stats', (req, res) => {
    res.json({ online: activeUsers.size });
});

// API for users to send a heartbeat to show they are still online
app.post('/api/heartbeat', (req, res) => {
    const { peerId } = req.query;
    if (peerId) {
        activeUsers.set(peerId, Date.now());
    }
    res.status(200).send();
});

// The corrected matchmaking API
app.get('/api/match', (req, res) => {
    const { peerId } = req.query;
    if (!peerId) return res.status(400).json({ error: 'peerId is required' });

    // Ensure the current user is considered active
    activeUsers.set(peerId, Date.now());
    // Remove self from waiting list in case of a retry
    waitingPeers.delete(peerId);

    // Find a waiting partner
    const waitingArray = Array.from(waitingPeers);
    if (waitingArray.length > 0) {
        const partnerId = waitingArray.shift(); // Get the first person waiting
        waitingPeers.delete(partnerId); // Remove them from the queue
        console.log(`[Matchmaking] Paired ${peerId} with ${partnerId}`);
        res.json({ partnerId: partnerId });
    } else {
        // No one is waiting, so add this user to the queue
        waitingPeers.add(peerId);
        console.log(`[Matchmaking] ${peerId} is now waiting.`);
        res.json({ status: 'waiting' });
    }
});

// Garbage Collector: Periodically remove users who haven't sent a heartbeat
setInterval(() => {
    const now = Date.now();
    const staleTime = 20000; // 20 seconds
    let cleanedCount = 0;
    
    for (const [peerId, timestamp] of activeUsers.entries()) {
        if (now - timestamp > staleTime) {
            activeUsers.delete(peerId);
            waitingPeers.delete(peerId); // Also remove from waiting queue if they were there
            cleanedCount++;
        }
    }
    if (cleanedCount > 0) {
        console.log(`[GC] Cleaned up ${cleanedCount} stale users.`);
    }
}, 30000); // Run every 30 seconds

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
        :root { --bg-color: #1a1a1a; --surface-color: rgba(30, 30, 30, 0.8); --primary-color: #2574ff; --danger-color: #ff3b30; --text-color: #f5f5f7; --text-secondary: #a8a8a8; }
        * { box-sizing: border-box; margin: 0; padding: 0; }
        html, body { height: 100%; width: 100%; overflow: hidden; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; background-color: var(--bg-color); color: var(--text-color); }
        .ui-container { display: none; }
        .ui-container.active { display: flex; }
        #lobby { flex-direction: column; justify-content: center; align-items: center; text-align: center; height: 100%; padding: 2rem; }
        #lobby .logo { font-size: 3.5rem; font-weight: bold; }
        #lobby .logo span { font-size: 5rem; vertical-align: middle; }
        #lobby p { font-size: 1.2rem; color: var(--text-secondary); margin: 1rem 0 2rem 0; max-width: 500px; }
        #online-status { margin-bottom: 2rem; font-size: 1rem; color: var(--primary-color); font-weight: 500; }
        #online-status #online-counter { font-weight: bold; }
        #start-btn { background-color: var(--primary-color); color: white; border: none; padding: 1rem 2.5rem; font-size: 1.2rem; font-weight: bold; cursor: pointer; border-radius: 50px; transition: transform 0.2s, box-shadow 0.2s; }
        #start-btn:hover { transform: scale(1.05); box-shadow: 0 5px 20px rgba(37, 116, 255, 0.4); }
        .permission-text { margin-top: 1.5rem; font-size: 0.9rem; color: var(--text-secondary); }
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
    <div id="lobby" class="ui-container active">
        <h1 class="logo">ReelRite <span>🦊</span></h1>
        <p>Connect instantly with random people from around the world. Your conversations are anonymous and secure.</p>
        <div id="online-status">🟢 <span id="online-counter">--</span> users online</div>
        <button id="start-btn">Start Chafffftting</button>
        <p class="permission-text">Camera and microphone access will be requested.</p>
    </div>
    <div id="chat-ui" class="ui-container">
        <div id="video-container"><video id="remote-video" autoplay playsinline></video></div>
        <div id="local-video-pip"><video id="local-video" muted autoplay playsinline></video></div>
        <div id="status-overlay"><div class="spinner"></div><p id="status-text">Searching for a partner...</p></div>
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
            const lobbyUI = document.getElementById('lobby'), chatUI = document.getElementById('chat-ui');
            const onlineCounter = document.getElementById('online-counter');
            const startBtn = document.getElementById('start-btn');
            const localVideo = document.getElementById('local-video'), remoteVideo = document.getElementById('remote-video');
            const statusOverlay = document.getElementById('status-overlay'), statusText = document.getElementById('status-text');
            const nextBtn = document.getElementById('next-btn'), endBtn = document.getElementById('end-btn');
            const micBtn = document.getElementById('mic-btn'), camBtn = document.getElementById('cam-btn');
            let localStream, peer, currentCall, myPeerId;
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
                    lobbyUI.querySelector('p').textContent = 'Requesting permissions...';
                    localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
                    localVideo.srcObject = localStream;
                    
                    clearInterval(statsInterval); // Stop polling stats on the lobby
                    lobbyUI.classList.remove('active');
                    chatUI.classList.add('active');
                    
                    initializePeer();
                } catch (err) {
                    lobbyUI.querySelector('p').textContent = 'Camera/mic access is required. Please refresh and allow.';
                }
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
                peer.on('error', (err) => { console.error('PeerJS error:', err); showStatus('Connection error...'); });
            }

            // --- Heartbeat & Matchmaking ---
            function startHeartbeat() {
                if (heartbeatInterval) clearInterval(heartbeatInterval);
                heartbeatInterval = setInterval(() => {
                    if (myPeerId) fetch(\`/api/heartbeat?peerId=\${myPeerId}\`, { method: 'POST' });
                }, 10000); // Send a heartbeat every 10 seconds
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
                poll(); // Immediately check for a partner
                matchmakingInterval = setInterval(poll, 3000); // Then poll every 3 seconds
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

            function connectToPartner(partnerId) {
                const call = peer.call(partnerId, localStream);
                currentCall = call;
                call.on('stream', (remoteStream) => {
                    hideStatus();
                    remoteVideo.srcObject = remoteStream;
                });
                call.on('close', handlePartnerDisconnect);
            }
            
            function handlePartnerDisconnect() {
                cleanUpConnection();
                startMatchmaking();
            }

            function cleanUpConnection() {
                if (currentCall) currentCall.close();
                currentCall = null;
                remoteVideo.srcObject = null;
            }

            // --- UI Control Handlers ---
            function stopAllIntervals() {
                clearInterval(statsInterval);
                clearInterval(heartbeatInterval);
                clearInterval(matchmakingInterval);
            }

            nextBtn.addEventListener('click', () => {
                cleanUpConnection();
                startMatchmaking();
            });

            endBtn.addEventListener('click', () => {
                stopAllIntervals();
                if (peer) peer.destroy();
                if (localStream) localStream.getTracks().forEach(track => track.stop());
                window.location.reload();
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
    console.log(`[Server] ReelRite server v4 is live on port ${PORT}`);
});
