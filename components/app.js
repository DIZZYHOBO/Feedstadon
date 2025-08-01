import { apiFetch } from './components/api.js';
import { renderStatus } from './components/Post.js';
import { fetchTimeline } from './components/Timeline.js';
import { initLogin, showLogin } from './components/Login.js';

// --- DOM Elements ---
const appView = document.getElementById('app-view');
const userDisplayBtn = document.getElementById('user-display-btn');
// ... other const declarations

// --- App State ---
const state = {
    instanceUrl: '',
    accessToken: '',
    currentUser: null,
    // ... other state properties
};

// --- App Initialization ---
async function initializeApp() {
    try {
        state.currentUser = await apiFetch(state.instanceUrl, state.accessToken, '/api/v1/accounts/verify_credentials');
        
        document.getElementById('login-view').style.display = 'none';
        appView.style.display = 'block';
        document.querySelector('.top-nav').style.display = 'flex';
        userDisplayBtn.textContent = state.currentUser.display_name;
        
        fetchTimeline(state, 'home');
    } catch (error) {
        alert('Connection failed. Please check your URL and token.');
        localStorage.clear();
        showLogin();
    }
}

function onLoginSuccess(instance, token) {
    state.instanceUrl = instance;
    state.accessToken = token;
    initializeApp();
}

// --- All other Event Listeners go here ---

// --- Start the App ---
initLogin(onLoginSuccess);


