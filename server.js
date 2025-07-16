const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;

// =================================================================
// PART 1: SERVER-SIDE API LOGIC (Matchmaking)
// =================================================================

let waitingQueue = [];

app.get('/api/match', (req, res) => {
    const { peerId } = req.query;
    if (!peerId) {
        return res.status(400).json({ error: 'peerId is required' });
    }
    if (waitingQueue.length > 0) {
        const partnerId = waitingQueue.shift();
        console.log(`Matched ${peerId} with ${partnerId}`);
        res.status(200).json({ partnerId });
    } else {
        waitingQueue.push(peerId);
        console.log(`${peerId} added to queue.`);
        res.status(200).json({ status: 'waiting' });
    }
});

// =================================================================
// PART 2: THE MAIN ROUTE THAT SERVES THE ENTIRE FRONTEND
// =================================================================

app.get('/', (req, res) => {
    // We will send a single HTML string that contains everything.
    const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    
    <!-- Core SEO Meta Tags -->
    <title>ReelRite Chat - Anonymous, Random Video Chat</title>
    <meta name="description" content="Connect instantly with random strangers for free anonymous video chat, audio call, or text chat. No signup required. Fast, secure, and private conversations on ReelRite.site.">
    <link rel="canonical" href="https://ReelRite.site">
    <link rel="icon" href="data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>🦊</text></svg>">
    
    <!-- ================== EMBEDDED CSS ================== -->
    <style>
        :root {
            --bg-color: #121212; --surface-color: #1e1e1e; --primary-color: #03dac6;
            --text-color: #e0e0e0; --text-secondary-color: #a0a0a0; --error-color: #cf6679;
        }
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; background-color: var(--bg-color); color: var(--text-color); line-height: 1.6; }
        header { display: flex; justify-content: space-between; align-items: center; padding: 1rem 2rem; background-color: var(--surface-color); border-bottom: 1px solid #333; }
        .logo { font-size: 1.5rem; font-weight: bold; }
        nav a { color: var(--text-color); text-decoration: none; margin-left: 1.5rem; transition: color 0.2s; }
        nav a:hover { color: var(--primary-color); }
        main { max-width: 1200px; margin: 2rem auto; padding: 0 2rem; }
        #loading-screen { text-align: center; padding-top: 10vh; }
        #loading-screen h1 { font-size: 3rem; color: var(--primary-color); }
        #loading-screen button { background-color: var(--primary-color); color: var(--bg-color); border: none; padding: 1rem 2rem; font-size: 1.2rem; font-weight: bold; cursor: pointer; border-radius: 8px; margin-top: 2rem; transition: transform 0.2s; }
        #loading-screen button:hover { transform: scale(1.05); }
        .permission-text { margin-top: 1rem; color: var(--text-secondary-color); font-size: 0.9rem; }
        #chat-app { display: flex; gap: 1.5rem; }
        .video-container { flex: 3; display: flex; flex-direction: column; gap: 1rem; }
        .video-wrapper { position: relative; background-color: #000; border-radius: 8px; overflow: hidden; aspect-ratio: 16 / 9;}
        #remote-video, #local-video { width: 100%; height: 100%; object-fit: cover; transform: scaleX(-1); }
        .video-wrapper.local { max-height: 180px; width: 320px; position: absolute; bottom: 30px; right: 40px; border: 2px solid var(--primary-color); z-index: 10; }
        .status-overlay { position: absolute; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.7); display: flex; flex-direction: column; justify-content: center; align-items: center; color: white; z-index: 5; }
        .spinner { border: 4px solid #f3f3f3; border-top: 4px solid var(--primary-color); border-radius: 50%; width: 50px; height: 50px; animation: spin 1s linear infinite; }
        @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
        #status-text { margin-top: 1rem; }
        .chat-and-controls { flex: 1; display: flex; flex-direction: column; background-color: var(--surface-color); border-radius: 8px; }
        #text-chat-container { display: flex; flex-direction: column; height: 100%; }
        #messages { flex-grow: 1; padding: 1rem; overflow-y: auto; }
        .message { margin-bottom: 0.75rem; }
        .message.system { font-style: italic; color: var(--text-secondary-color); }
        .message.remote .author { color: var(--primary-color); font-weight: bold; }
        .message.local .author { color: #81c784; font-weight: bold; }
        .message p { margin: 0; padding: 0.5rem 0.75rem; background: #333; border-radius: 12px; display: inline-block; max-width: 90%; }
        .message.local { text-align: right; }
        #chat-form { display: flex; padding: 1rem; border-top: 1px solid #333; }
        #chat-input { flex-grow: 1; background: #333; border: 1px solid #444; color: var(--text-color); padding: 0.75rem; border-radius: 8px; }
        #chat-form button { background: var(--primary-color); color: var(--bg-color); border: none; padding: 0.75rem; margin-left: 0.5rem; border-radius: 8px; font-weight: bold; cursor: pointer; }
        #chat-form button:disabled, #chat-input:disabled { opacity: 0.5; cursor: not-allowed; }
        #controls { display: grid; grid-template-columns: 1fr 1fr; gap: 0.5rem; padding: 1rem; border-top: 1px solid #333; }
        #controls button { padding: 0.75rem; border: 1px solid #444; background: #333; color: var(--text-color); font-weight: bold; cursor: pointer; border-radius: 8px; transition: background-color 0.2s; }
        #controls button:hover { background-color: #444; }
        #controls #next-btn { background-color: var(--primary-color); color: var(--bg-color); grid-column: 1 / -1; }
        #controls .danger { background-color: var(--error-color); color: var(--bg-color); }
        .hidden { display: none !important; }
        @media (max-width: 900px) { #chat-app { flex-direction: column; } .video-wrapper.local { bottom: 1rem; right: 1rem; width: 160px; } }
    </style>
</head>
<body>
    <!-- ================== EMBEDDED HTML ================== -->
    <header>
        <div class="logo">ReelRite Chat 🦊</div>
        <nav><a href="#home">Chat</a></nav>
    </header>
    <main id="home">
        <div id="loading-screen" class="active">
            <h1>ReelRite Chat</h1>
            <p>Connecting you to the world, anonymously.</p>
            <button id="start-btn">Start Chatting</button>
            <p class="permission-text">Please allow camera and microphone access.</p>
        </div>
        <div id="chat-app" class="hidden">
            <div class="video-container">
                <div class="video-wrapper">
                    <video id="remote-video" autoplay playsinline></video>
                    <div id="status-overlay" class="status-overlay">
                        <div class="spinner"></div>
                        <p id="status-text">Searching for a partner...</p>
                    </div>
                </div>
                <div class="video-wrapper local"><video id="local-video" muted autoplay playsinline></video></div>
            </div>
            <div class="chat-and-controls">
                <div id="text-chat-container">
                    <div id="messages"><div class="message system">Welcome! Be respectful.</div></div>
                    <form id="chat-form">
                        <input type="text" id="chat-input" placeholder="Type a message..." autocomplete="off" disabled>
                        <button type="submit" disabled>Send</button>
                    </form>
                </div>
                <div id="controls">
                    <button id="next-btn">Next</button>
                    <button id="end-btn" class="danger">End</button>
                    <button id="toggle-mic-btn">🎤 Mute</button>
                    <button id="toggle-cam-btn">📷 Hide Cam</button>
                </div>
            </div>
        </div>
    </main>
    <footer><p>© 2023 ReelRite.site</p></footer>
    
    <!-- PeerJS Library from CDN -->
    <script src="https://unpkg.com/peerjs@1.4.7/dist/peerjs.min.js"></script>

    <!-- ================== EMBEDDED CLIENT-SIDE JAVASCRIPT ================== -->
    <script>
        document.addEventListener('DOMContentLoaded', () => {
            const startBtn = document.getElementById('start-btn');
            const loadingScreen = document.getElementById('loading-screen');
            const chatApp = document.getElementById('chat-app');
            const localVideo = document.getElementById('local-video');
            const remoteVideo = document.getElementById('remote-video');
            const statusOverlay = document.getElementById('status-overlay');
            const statusText = document.getElementById('status-text');
            const nextBtn = document.getElementById('next-btn');
            const endBtn = document.getElementById('end-btn');
            const toggleMicBtn = document.getElementById('toggle-mic-btn');
            const toggleCamBtn = document.getElementById('toggle-cam-btn');
            const chatForm = document.getElementById('chat-form');
            const chatInput = document.getElementById('chat-input');
            const messagesDiv = document.getElementById('messages');

            let localStream, peer, currentPeerConnection, currentCall, myPeerId;
            
            startBtn.addEventListener('click', initialize);
            
            async function initialize() {
                try {
                    loadingScreen.querySelector('h1').textContent = 'Getting permissions...';
                    localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
                    localVideo.srcObject = localStream;
                    loadingScreen.classList.remove('active');
                    chatApp.classList.remove('hidden');
                    initializePeer();
                } catch (err) {
                    loadingScreen.querySelector('h1').textContent = 'Error!';
                    loadingScreen.querySelector('p').textContent = 'Camera/mic access is required. Please refresh and allow.';
                }
            }

            function initializePeer() {
                peer = new Peer(undefined, { host: 'peerjs-server.fly.dev', secure: true, port: 443 });
                peer.on('open', id => { myPeerId = id; findPartner(); });
                peer.on('call', call => {
                    currentCall = call;
                    statusOverlay.style.display = 'none';
                    call.answer(localStream);
                    call.on('stream', remoteStream => { remoteVideo.srcObject = remoteStream; });
                    call.on('close', endSession);
                });
                peer.on('connection', conn => { currentPeerConnection = conn; setupDataConnection(conn); });
                peer.on('error', err => { console.error('PeerJS error:', err); addSystemMessage('Error. Reconnecting...'); resetState(); setTimeout(initializePeer, 3000); });
            }

            async function findPartner() {
                statusOverlay.style.display = 'flex';
                statusText.textContent = 'Searching for a partner...';
                try {
                    const response = await fetch(\`/api/match?peerId=\${myPeerId}\`);
                    const data = await response.json();
                    if (data.partnerId) { connectToPartner(data.partnerId); } 
                    else { statusText.textContent = 'Waiting in queue...'; }
                } catch (error) {
                    statusText.textContent = 'Error finding partner. Retrying...';
                    setTimeout(findPartner, 5000);
                }
            }

            function connectToPartner(partnerId) {
                statusText.textContent = 'Connecting...';
                const call = peer.call(partnerId, localStream);
                currentCall = call;
                call.on('stream', remoteStream => { remoteVideo.srcObject = remoteStream; statusOverlay.style.display = 'none'; });
                call.on('close', endSession);
                const conn = peer.connect(partnerId);
                currentPeerConnection = conn;
                setupDataConnection(conn);
            }
            
            function setupDataConnection(conn) {
                conn.on('open', () => { enableChat(); addSystemMessage('Partner connected!'); });
                conn.on('data', data => { addChatMessage(data.message, 'remote'); });
                conn.on('close', () => { addSystemMessage('Partner left.'); endSession(); });
            }

            function endSession() {
                if (currentCall) { currentCall.close(); currentCall = null; }
                if (currentPeerConnection) { currentPeerConnection.close(); currentPeerConnection = null; }
                remoteVideo.srcObject = null;
                disableChat();
                findPartner();
            }
            function resetState() {
                if(peer && !peer.destroyed) peer.destroy();
                localStream.getTracks().forEach(track => track.stop());
                loadingScreen.classList.add('active');
                chatApp.classList.add('hidden');
            }
            nextBtn.addEventListener('click', endSession);
            endBtn.addEventListener('click', () => { endSession(); resetState(); });
            toggleMicBtn.addEventListener('click', () => {
                const enabled = localStream.getAudioTracks()[0].enabled;
                localStream.getAudioTracks()[0].enabled = !enabled;
                toggleMicBtn.textContent = !enabled ? '🎤 Mute' : '🎤 Unmute';
            });
            toggleCamBtn.addEventListener('click', () => {
                const enabled = localStream.getVideoTracks()[0].enabled;
                localStream.getVideoTracks()[0].enabled = !enabled;
                toggleCamBtn.textContent = !enabled ? '📷 Hide Cam' : '📷 Show Cam';
            });
            chatForm.addEventListener('submit', e => {
                e.preventDefault();
                const message = chatInput.value;
                if (message.trim() && currentPeerConnection) {
                    currentPeerConnection.send({ message });
                    addChatMessage(message, 'local');
                    chatInput.value = '';
                }
            });
            function enableChat() { chatInput.disabled = false; chatForm.querySelector('button').disabled = false; }
            function disableChat() { chatInput.disabled = true; chatForm.querySelector('button').disabled = true; }
            function addChatMessage(text, type) {
                const author = type === 'local' ? 'You' : 'Partner';
                const messageDiv = document.createElement('div');
                messageDiv.className = \`message \${type}\`;
                messageDiv.innerHTML = \`<div class="author">\${author}</div><p>\${text}</p>\`;
                messagesDiv.appendChild(messageDiv);
                messagesDiv.scrollTop = messagesDiv.scrollHeight;
            }
            function addSystemMessage(text) {
                const messageDiv = document.createElement('div');
                messageDiv.className = 'message system';
                messageDiv.textContent = text;
                messagesDiv.appendChild(messageDiv);
                messagesDiv.scrollTop = messagesDiv.scrollHeight;
            }
        });
    </script>
</body>
</html>
    `;
    res.setHeader('Content-Type', 'text/html');
    res.send(htmlContent);
});

// =================================================================
// PART 3: START THE SERVER
// =================================================================
app.listen(PORT, () => {
    console.log(`ReelRite single-file server listening on port ${PORT}`);
});
