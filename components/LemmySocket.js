import { apiFetch } from './api.js';

let socket = null;
let currentAuthToken = null;

const connect = (state, actions) => {
    // This function is now a no-op as WebSockets are no longer used.
    // All data fetching is handled via HTTP polling in the respective components.
    console.log("WebSocket connection is deprecated and no longer used.");
};

const disconnect = () => {
    // This function is now a no-op.
};

export const LemmySocket = {
    connect,
    disconnect,
};
