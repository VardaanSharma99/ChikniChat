const express = require('express');
const path = require('path');

const app = express();
// Render provides the PORT environment variable.
const PORT = process.env.PORT || 3000;

// --- In-Memory Matchmaking Queue ---
// This array will hold the peer IDs of users waiting for a partner.
let waitingQueue = [];

// --- API Endpoint for Matchmaking ---
app.get('/api/match', (req, res) => {
    const { peerId } = req.query;
    if (!peerId) {
        return res.status(400).json({ error: 'peerId is required' });
    }

    // Check if there's someone already in the queue
    if (waitingQueue.length > 0) {
        // Found a partner! Remove them from the queue.
        const partnerId = waitingQueue.shift(); 
        
        console.log(`Matched ${peerId} with ${partnerId}`);
        // Send the partner's ID back to the requester
        res.status(200).json({ partnerId });
    } else {
        // No one is waiting, so add this user to the queue
        waitingQueue.push(peerId);
        console.log(`${peerId} added to queue. Waiting for a partner.`);
        // Tell the user they are now waiting
        res.status(200).json({ status: 'waiting' });
    }
});

// --- Serve Static Frontend Files ---
// This tells Express to serve the files from the 'public' folder
app.use(express.static(path.join(__dirname, 'public')));

// --- Cleanup Logic (Optional but good practice) ---
// Simple periodic cleanup of the queue to remove stale entries
setInterval(() => {
    // In a real app, you'd have a more robust way to check for disconnected peers.
    // For this simple case, we just log the queue state.
    console.log(`Current queue size: ${waitingQueue.length}`);
}, 60000); // every minute

// --- Start the Server ---
app.listen(PORT, () => {
    console.log(`ReelRite server listening on port ${PORT}`);
});