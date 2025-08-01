import { apiFetch } from './components/api.js';
import { ICONS } from './components/icons.js';
import { renderStatus } from './components/Post.js';
import { renderProfilePage } from './components/Profile.js';
import { renderSearchResults } from './components/Search.js';
import { showComposeModal, initComposeModal } from './components/Compose.js';
import { fetchNotifications } from './components/Notifications.js';

document.addEventListener('DOMContentLoaded', () => {
    // --- DOM Elements ---
    const loginView = document.getElementById('login-view');
    const instanceUrlInput = document.getElementById('instance-url');
    const accessTokenInput = document.getElementById('access-token');
    const connectBtn = document.getElementById('connect-btn');
    const appView = document.getElementById('app-view');
    const userDisplayBtn = document.getElementById('user-display-btn');
    const timelineDiv = document.getElementById('timeline');
    const profilePageView = document.getElementById('profile-page-view');
    const searchResultsView = document.getElementById('search-results-view');
    const statusDetailView = document.getElementById('status-detail-view');
    const backBtn = document.getElementById('back-btn');
    const logoutBtn = document.getElementById('logout-btn');
    const feedsDropdown = document.getElementById('feeds-dropdown');
    const userDropdown = document.getElementById('user-dropdown');
    const notificationsDropdown = document.getElementById('notifications-dropdown');
    const searchToggleBtn = document.getElementById('search-toggle-btn');
    const searchForm = document.getElementById('search-form');
    const searchInput = document.getElementById('search-input');
    const navPostBtn = document.getElementById('nav-post-btn');
    const profileLink = document.getElementById('profile-link');
    const settingsLink = document.getElementById('settings-link');

    const editPostModal = document.getElementById('edit-post-modal');
    // ... other modal elements ...
    
    // --- App State ---
    const state = {
        instanceUrl: '',
        accessToken: '',
        currentUser: null,
        settings: {},
        currentTimeline: 'home',
        actions: {}
    };

    // --- Core Actions ---
    state.actions.showProfile = (id) => {
        renderProfilePage(state, id);
        switchView('profile');
    };
    state.actions.showStatusDetail = (id) => showStatusDetail(id);
    // ... other actions ...

    // --- View Management ---
    function switchView(viewName) {
        timelineDiv.style.display = 'none';
        profilePageView.style.display = 'none';
        searchResultsView.style.display = 'none';
        statusDetailView.style.display = 'none'; // ADDED
        backBtn.style.display = 'none';
        feedsDropdown.style.display = 'none';
        
        if (viewName === 'timeline') {
            timelineDiv.style.display = 'flex';
            feedsDropdown.style.display = 'block';
        } else if (viewName === 'profile' || viewName === 'search' || viewName === 'statusDetail') { // MODIFIED
            if (viewName === 'profile') profilePageView.style.display = 'block';
            if (viewName === 'search') searchResultsView.style.display = 'flex';
            if (viewName === 'statusDetail') statusDetailView.style.display = 'block'; // ADDED
            backBtn.style.display = 'block';
        }
    }

    // --- Main App Logic ---
    async function showStatusDetail(statusId) {
        const container = document.getElementById('status-detail-view');
        container.innerHTML = '<p>Loading post...</p>';
        switchView('statusDetail');

        try {
            // Fetch the main post and its context (ancestors/descendants)
            const context = await apiFetch(state.instanceUrl, state.accessToken, `/api/v1/statuses/${statusId}/context`);
            const mainStatus = await apiFetch(state.instanceUrl, state.accessToken, `/api/v1/statuses/${statusId}`);

            container.innerHTML = '';
            
            // Render main post and replies
            const mainPostElement = renderStatus(mainStatus, state, state.actions);
            container.appendChild(mainPostElement);

            if (context.descendants && context.descendants.length > 0) {
                const repliesContainer = document.createElement('div');
                repliesContainer.className = 'comment-thread';
                context.descendants.forEach(reply => {
                    repliesContainer.appendChild(renderStatus(reply, state, state.actions));
                });
                container.appendChild(repliesContainer);
            }

        } catch (error) {
            console.error('Failed to load status detail:', error);
            container.innerHTML = '<p>Could not load post.</p>';
        }
    }
    
    // ... The rest of your app.js file (initializeApp, fetchTimeline, toggleAction, etc.) ...
});
