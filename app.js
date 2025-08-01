import { apiFetch } from './components/api.js';
import { ICONS } from './components/icons.js';
import { renderStatus } from './components/Post.js';

document.addEventListener('DOMContentLoaded', () => {
    // --- DOM Elements ---
    const loginView = document.getElementById('login-view');
    const instanceUrlInput = document.getElementById('instance-url');
    const accessTokenInput = document.getElementById('access-token');
    const connectBtn = document.getElementById('connect-btn');
    const appView = document.getElementById('app-view');
    const userDisplayBtn = document.getElementById('user-display-btn');
    const timelineDiv = document.getElementById('timeline');
    const logoutBtn = document.getElementById('logout-btn');
    
    // --- App State ---
    const state = {
        instanceUrl: '',
        accessToken: '',
        currentUser: null,
        settings: {}, // Simplified for now
        actions: {}
    };

    // --- Core Action ---
    // We pass the entire state object now to simplify dependencies
    state.actions.showProfile = (id) => console.log("Show profile action for:", id); // Placeholder
    state.actions.toggleAction = (action, id, button) => toggleAction(action, id, button);

    // --- Main App Logic ---
    async function initializeApp() {
        try {
            // Step 1: Verify the credentials. This is the call that was failing.
            state.currentUser = await apiFetch(state.instanceUrl, state.accessToken, '/api/v1/accounts/verify_credentials');
            
            // If successful, hide login and show the app
            loginView.style.display = 'none';
            appView.style.display = 'block';
            document.querySelector('.top-nav').style.display = 'flex';
            userDisplayBtn.textContent = state.currentUser.display_name;
            
            // Step 2: Fetch the home timeline
            fetchTimeline();

        } catch (error) {
            console.error('Initialization failed:', error);
            alert('Connection failed. Please ensure your instance URL and token are correct.');
            localStorage.clear();
            loginView.style.display = 'block';
            appView.style.display = 'none';
            document.querySelector('.top-nav').style.display = 'none';
        }
    }

    async function fetchTimeline() {
        try {
            const statuses = await apiFetch(state.instanceUrl, state.accessToken, '/api/v1/timelines/home');
            timelineDiv.innerHTML = '';
            statuses.forEach(status => {
                const statusElement = renderStatus(status, state, state.actions);
                if (statusElement) {
                    timelineDiv.appendChild(statusElement);
                }
            });
        } catch (error) {
            console.error('Failed to fetch timeline:', error);
            timelineDiv.innerHTML = '<p>Could not load timeline.</p>';
        }
    }
    
    function onLoginSuccess(instance, token) {
        state.instanceUrl = instance;
        state.accessToken = token;
        initializeApp();
    }
    
    async function toggleAction(action, id, button) {
        // We can add this logic back later. For now, just log it.
        console.log(`Action: ${action} on post ID: ${id}`);
    }

    // --- Event Listeners ---
    connectBtn.addEventListener('click', () => {
        const instance = instanceUrlInput.value.trim();
        const token = accessTokenInput.value.trim();

        if (!instance || !token) {
            alert('Please provide both an instance URL and an access token.');
            return;
        }

        localStorage.setItem('instanceUrl', instance);
        localStorage.setItem('accessToken', token);
        onLoginSuccess(instance, token);
    });

    logoutBtn.addEventListener('click', (e) => { 
        e.preventDefault(); 
        localStorage.clear(); 
        window.location.reload(); 
    });

    // --- Initial Load ---
    function initLoginOnLoad() {
        const instance = localStorage.getItem('instanceUrl');
        const token = localStorage.getItem('accessToken');
        if (instance && token) {
            onLoginSuccess(instance, token);
        } else {
            loginView.style.display = 'block';
            appView.style.display = 'none';
            document.querySelector('.top-nav').style.display = 'none';
        }
    }
    
    initLoginOnLoad();
});
