import { apiFetch } from './components/api.js';
import { renderStatus } from './components/Post.js';
import { fetchTimeline } from './components/Timeline.js';
import { initLogin, showLogin } from './components/Login.js';

// --- DOM Elements ---
const appView = document.getElementById('app-view');
const userDisplayBtn = document.getElementById('user-display-btn');
const timelineDiv = document.getElementById('timeline');
const userDropdown = document.getElementById('user-dropdown');
const feedsDropdown = document.getElementById('feeds-dropdown');
const logoutBtn = document.getElementById('logout-btn');

// --- App State ---
const state = {
    instanceUrl: '',
    accessToken: '',
    currentUser: null,
    settings: { hideNsfw: false, filteredWords: [] },
    currentTimeline: 'home',
    lastPostId: null,
    isLoadingMore: false,
    timelineDiv: document.getElementById('timeline'),
    scrollLoader: document.getElementById('scroll-loader')
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

/**
 * This is the callback function we pass to the Login component.
 * It's triggered on a successful login.
 */
function onLoginSuccess(instance, token) {
    state.instanceUrl = instance;
    state.accessToken = token;
    initializeApp();
}

// --- Event Listeners ---
window.addEventListener('scroll', () => {
    if (state.isLoadingMore || !state.currentUser) return;
    const { scrollTop, scrollHeight, clientHeight } = document.documentElement;
    if (scrollTop + clientHeight >= scrollHeight - 400) {
        fetchTimeline(state, state.currentTimeline, true);
    }
});

[userDropdown, feedsDropdown].forEach(dd => {
    dd.addEventListener('click', (e) => {
        e.stopPropagation();
        document.querySelectorAll('.dropdown').forEach(d => { if(d !== dd) d.classList.remove('active'); });
        dd.classList.toggle('active');
    });
});

feedsDropdown.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', (e) => { e.preventDefault(); fetchTimeline(state, e.target.dataset.timeline); });
});

logoutBtn.addEventListener('click', (e) => { 
    e.preventDefault(); 
    localStorage.clear(); 
    window.location.reload(); 
});

// --- Start the App ---
initLogin(onLoginSuccess);
