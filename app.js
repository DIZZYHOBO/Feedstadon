import { apiFetch } from './components/api.js';
import { ICONS } from './components/icons.js';
import { renderStatus } from './components/Post.js';
import { renderProfilePage } from './components/Profile.js';
import { renderSearchResults } from './components/Search.js';


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
    const backBtn = document.getElementById('back-btn');
    const logoutBtn = document.getElementById('logout-btn');
    const feedsDropdown = document.getElementById('feeds-dropdown');
    const searchToggleBtn = document.getElementById('search-toggle-btn');
    const searchForm = document.getElementById('search-form');
    const searchInput = document.getElementById('search-input');
    const navPostBtn = document.getElementById('nav-post-btn');
    const profileLink = document.getElementById('profile-link');
    
    // --- App State ---
    const state = {
        instanceUrl: '',
        accessToken: '',
        currentUser: null,
        settings: {},
        actions: {}
    };

    // --- Core Actions ---
    state.actions.showProfile = (id) => {
        renderProfilePage(state, id);
        switchView('profile');
    };
    state.actions.toggleAction = (action, id, button) => toggleAction(action, id, button);
    state.actions.toggleCommentThread = (status, element) => toggleCommentThread(status, element);


    // --- View Management ---
    function switchView(viewName) {
        // Hide all main views
        timelineDiv.style.display = 'none';
        profilePageView.style.display = 'none';
        searchResultsView.style.display = 'none';

        // Set default nav state
        backBtn.style.display = 'none';
        feedsDropdown.style.display = 'none';
        
        if (viewName === 'timeline') {
            timelineDiv.style.display = 'flex';
            feedsDropdown.style.display = 'block';
        } else if (viewName === 'profile') {
            profilePageView.style.display = 'block';
            backBtn.style.display = 'block';
        } else if (viewName === 'search') {
            searchResultsView.style.display = 'flex';
            backBtn.style.display = 'block';
        }
    }

    // --- Main App Logic ---
    async function initializeApp() {
        try {
            state.currentUser = await apiFetch(state.instanceUrl, state.accessToken, '/api/v1/accounts/verify_credentials');
            
            loginView.style.display = 'none';
            appView.style.display = 'block';
            document.querySelector('.top-nav').style.display = 'flex';
            userDisplayBtn.textContent = state.currentUser.display_name;
            
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
        if (action === 'reply') {
            const postElement = button.closest('.status');
            toggleCommentThread({ id: id }, postElement);
            return;
        }

        const isActive = button.classList.contains('active');
        const endpointAction = (action === 'boost' && isActive) ? 'unreblog' :
                               (action === 'boost' && !isActive) ? 'reblog' :
                               (action === 'favorite' && isActive) ? 'unfavourite' :
                               (action === 'favorite' && !isActive) ? 'favourite' :
                               (action === 'bookmark' && isActive) ? 'unbookmark' : 'bookmark';
        
        const endpoint = `/api/v1/statuses/${id}/${endpointAction}`;

        try {
            await apiFetch(state.instanceUrl, state.accessToken, endpoint, { method: 'POST' });
            button.classList.toggle('active');
        } catch (error) {
            console.error(`Failed to ${action} post:`, error);
            alert(`Could not ${action} post.`);
        }
    }

    async function toggleCommentThread(status, statusElement) {
        const existingThread = statusElement.querySelector('.comment-thread');
        if (existingThread) {
            existingThread.remove();
            return;
        }

        const threadContainer = document.createElement('div');
        threadContainer.className = 'comment-thread';
        threadContainer.innerHTML = `<p>Loading replies...</p>`;
        statusElement.appendChild(threadContainer);

        try {
            const context = await apiFetch(state.instanceUrl, state.accessToken, `/api/v1/statuses/${status.id}/context`);
            threadContainer.innerHTML = '';

            if (context.descendants && context.descendants.length > 0) {
                context.descendants.forEach(reply => {
                    const replyElement = renderStatus(reply, state, state.actions);
                    if (replyElement) threadContainer.appendChild(replyElement);
                });
            } else {
                threadContainer.innerHTML = '<p>No replies yet.</p>';
            }

            const replyForm = document.createElement('form');
            replyForm.className = 'comment-reply-form';
            replyForm.innerHTML = `<textarea placeholder="Write a reply..."></textarea><button type="submit">Reply</button>`;
            threadContainer.appendChild(replyForm);

            replyForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                const textarea = replyForm.querySelector('textarea');
                const content = textarea.value.trim();
                if (!content) return;

                await apiFetch(state.instanceUrl, state.accessToken, `/api/v1/statuses`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ status: content, in_reply_to_id: status.id })
                });

                toggleCommentThread(status, statusElement);
                setTimeout(() => toggleCommentThread(status, statusElement), 100);
            });

        } catch (error) {
            console.error('Could not load comment thread:', error);
            threadContainer.innerHTML = '<p>Failed to load replies.</p>';
        }
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
    
    backBtn.addEventListener('click', () => switchView('timeline'));
    
    profileLink.addEventListener('click', (e) => {
        e.preventDefault();
        state.actions.showProfile(state.currentUser.id);
    });

    feedsDropdown.querySelectorAll('a').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            fetchTimeline(link.dataset.timeline); // Need to fix fetchTimeline to accept a type
        });
    });

    searchToggleBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        searchForm.style.display = 'block';
        searchInput.focus();
        searchToggleBtn.style.display = 'none';
        navPostBtn.style.display = 'none';
    });
    
    searchForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const query = searchInput.value.trim();
        if (!query) return;
    
        renderSearchResults(state, query);
        switchView('search');
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
