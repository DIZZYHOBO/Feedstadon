import { apiFetch } from './api.js';

let socket = null;
let currentAuthToken = null;

const connect = (state, actions) => {
    // Disconnect any existing socket before creating a new one
    disconnect();

    const instance = localStorage.getItem('lemmy_instance') || 'leminal.space';
    currentAuthToken = localStorage.getItem('lemmy_jwt');

    if (!instance) {
        console.error("Lemmy instance not set. Cannot connect WebSocket.");
        return;
    }

    const url = `wss://${instance}/api/v3/ws`;
    
    try {
        socket = new WebSocket(url);

        socket.onopen = () => {
            console.log("Lemmy WebSocket connected.");
            // We don't need to send auth here; Lemmy authenticates via the wss link parameters if needed,
            // but for public feeds, no auth is required.
        };

        socket.onmessage = (event) => {
            const data = JSON.parse(event.data);
            
            // Check for new posts and publish them as custom events
            if (data.op === 'CreatePost') {
                const newPostEvent = new CustomEvent('lemmy:new-post', {
                    detail: { post_view: data.data }
                });
                window.dispatchEvent(newPostEvent);
            }
        };

        socket.onerror = (error) => {
            console.error("Lemmy WebSocket error:", error);
        };

        socket.onclose = () => {
            console.log("Lemmy WebSocket disconnected.");
            socket = null;
        };
    } catch (err) {
        console.error("Failed to establish WebSocket connection:", err);
    }
};

const disconnect = () => {
    if (socket) {
        socket.close();
        socket = null;
    }
};

export const LemmySocket = {
    connect,
    disconnect,
};
