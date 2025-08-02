import { apiFetch } from './components/api.js';
import { ICONS } from './components/icons.js';
import { renderStatus } from './components/Post.js';
import { renderProfilePage } from './components/Profile.js';
import { renderSearchResults } from './components/Search.js';
import { showComposeModal, initComposeModal } from './components/Compose.js';
import { fetchNotifications } from './components/Notifications.js';
import { renderSettingsPage } from './components/Settings.js';

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
    const settingsView = document.getElementById('settings-view');
    const hashtagTimelineView = document.getElementById('hashtag-timeline-view');
    const backBtn = document.getElementById('back-btn');
    const logoutBtn = document.getElementById('logout-btn');
    const feedsDropdown = document.getElementById('feeds-dropdown');
    const userDropdown = document.getElementById('user-dropdown');
    const notificationsDropdown = document.getElementById('notifications-dropdown');
    const notificationsList = document.getElementById('notifications-list');
    const searchToggleBtn = document.getElementById('search-toggle-btn');
    const searchForm = document.getElementById('search-form');
    const searchInput = document.getElementById('search-input');
    const navPostBtn = document.getElementById('nav-post-btn');
    const profileLink = document.getElementById('profile-link');
    const settingsLink = document.getElementById('settings-link');

    const editPostModal = document.getElementById('edit-post-modal');
    const editPostForm = document.getElementById('edit-post-form');
    const editPostTextarea = document.getElementById('edit-post-textarea');
    const cancelEditBtn = editPostModal.querySelector('.cancel-edit');
    
    const deletePostModal = document.getElementById('delete-post-modal');
    const cancelDeleteBtn = deletePostModal.querySelector('.cancel-delete');
    const confirmDeleteBtn = document.getElementById('confirm-delete-btn');
    
    // --- App State ---
    const state = {
        instanceUrl: '',
        accessToken: '',
        currentUser: null,
        settings: {},
        currentTimeline: 'home',
        currentView: 'timeline',
        notificationsList,
        actions: {},
        isLoadingMore: false,
        nextPageUrl: null
    };

    state.setNextPageUrl = (linkHeader) => {
        if (linkHeader) {
            const nextLink = linkHeader.split(',').find(link => link.includes('rel="next"'));
            if (nextLink) {
                state.nextPageUrl = nextLink.match(/<(.+)>/)[1];
                return;
            }
        }
        state.nextPageUrl = null;
    };
    
    let postToEdit = null;
    let postToDeleteId = null;
    let publicSocket = null;

    // --- Core Actions ---
    state.actions.showProfile = (id) => {
        renderProfilePage(state, id);
        switchView('profile');
    };
    state.actions.showStatusDetail = (id) => showStatusDetail(id);
    state.actions.showHashtagTimeline = (tagName) => fetchHashtagTimeline(tagName);
    state.actions.toggleAction = (action, post, button) => toggleAction(action, post, button);
    state.actions.toggleCommentThread = (status, element, replyToAcct) => toggleCommentThread(status, element, replyToAcct);
    state.actions.showEditModal = (post) => {
        postToEdit = post;
        const plainText = post.content.replace(/<br\s*\/?>/gi, "\n").replace(/<\/p>/gi, "\n\n").replace(/<[^>]*>/g, "").trim();
        editPostTextarea.value = plainText;
        editPostModal.classList.add('visible');
    };
    state.actions.showDeleteModal = (postId) => {
        postToDeleteId = postId;
        deletePostModal.classList.add('visible');
    };

    // --- View Management ---
    function switchView(viewName) {
        state.currentView = viewName;
        timelineDiv.style.display = 'none';
        profilePageView.style.display = 'none';
        searchResultsView.style.display = 'none';
        statusDetailView.style.display = 'none';
        settingsView.style.display = 'none';
        hashtagTimelineView.style.display = 'none';
        backBtn.style.display = 'none';
        feedsDropdown.style.display = 'none';
        
        if (publicSocket && publicSocket.readyState === WebSocket.OPEN) {
            publicSocket.close();
        }

        if (viewName === 'timeline') {
            timelineDiv.style.display = 'flex';
            feedsDropdown.style.display = 'block';
        } else if (['profile', 'search', 'statusDetail', 'settings', 'hashtag'].includes(viewName)) {
            if (viewName === 'profile') profilePageView.style.display = 'block';
            if (viewName === 'search') searchResultsView.style.display = 'flex';
            if (viewName === 'statusDetail') statusDetailView.style.display = 'block';
            if (viewName === 'settings') settingsView.style.display = 'block';
            if (viewName === 'hashtag') hashtagTimelineView.style.display = 'block';
            backBtn.style.display = 'block';
        }
    }

    // --- Main App Logic ---
    async function initializeApp() {
        try {
            state.currentUser = (await apiFetch(state.instanceUrl, state.accessToken, '/api/v1/accounts/verify_credentials')).data;
            
            loginView.style.display = 'none';
            appView.style.display = 'block';
            document.querySelector('.top-nav').style.display = 'flex';
            userDisplayBtn.textContent = state.currentUser.display_name;
            
            initComposeModal(state, () => fetchTimeline('home', true));
            fetchTimeline('home');
            initUserStreamSocket();

        } catch (error) {
            console.error('Initialization failed:', error);
            alert('Connection failed. Please ensure your instance URL and token are correct.');
            localStorage.clear();
            loginView.style.display = 'block';
            appView.style.display = 'none';
            document.querySelector('.top-nav').style.display = 'none';
        }
    }

    function initUserStreamSocket() {
        const cleanInstanceUrl = state.instanceUrl.replace(/^https?:\/\//, '');
        const socketUrl = `wss://${cleanInstanceUrl}/api/v1/streaming?stream=user&access_token=${state.accessToken}`;
        const socket = new WebSocket(socketUrl);

        socket.onopen = () => console.log('User WebSocket connection established.');
        socket.onmessage = (event) => {
            const data = JSON.parse(event.data);
            if (data.event === 'update' && state.currentTimeline === 'home') {
                const post = JSON.parse(data.payload);
                const postElement = renderStatus(post, state, state.actions);
                if (postElement) {
                    postElement.classList.add('newly-added');
                    timelineDiv.prepend(postElement);
                }
            }
            if (data.event === 'notification') {
                console.log('New notification received:', JSON.parse(data.payload));
            }
        };
        socket.onclose = () => {
            console.log('User WebSocket connection closed. Reconnecting in 5s...');
            setTimeout(initUserStreamSocket, 5000);
        };
        socket.onerror = (error) => console.error('User WebSocket error:', error);
    }

    function initPublicStreamSocket(type) {
        if (type !== 'public?local=true') {
            return;
        }
        const cleanInstanceUrl = state.instanceUrl.replace(/^https?:\/\//, '');
        const streamType = 'public:local';

        const socketUrl = `wss://${cleanInstanceUrl}/api/v1/streaming?stream=${streamType}`;
        publicSocket = new WebSocket(socketUrl);

        publicSocket.onopen = () => console.log(`Public WebSocket (${streamType}) connection established.`);
        publicSocket.onmessage = (event) => {
            const data = JSON.parse(event.data);
            if (data.event === 'update' && state.currentTimeline === 'local') {
                const post = JSON.parse(data.payload);
                const postElement = renderStatus(post, state, state.actions);
                if (postElement) {
                    postElement.classList.add('newly-added');
                    timelineDiv.prepend(postElement);
                }
            }
        };
        publicSocket.onclose = () => console.log(`Public WebSocket (${streamType}) connection closed.`);
        publicSocket.onerror = (error) => console.error(`Public WebSocket (${streamType}) error:`, error);
    }
    
    async function showStatusDetail(statusId) {
        switchView('statusDetail');

        try {
            const mainStatusResponse = await apiFetch(state.instanceUrl, state.accessToken, `/api/v1/statuses/${statusId}`);
            const contextResponse = await apiFetch(state.instanceUrl, state.accessToken, `/api/v1/statuses/${statusId}/context`);
            
            const container = document.getElementById('status-detail-view');
            container.innerHTML = '';
            
            const mainPostElement = renderStatus(mainStatusResponse.data, state, state.actions);
            container.appendChild(mainPostElement);

            if (contextResponse.data.descendants && contextResponse.data.descendants.length > 0) {
                const repliesContainer = document.createElement('div');
                repliesContainer.className = 'comment-thread';
                repliesContainer.style.marginTop = '0';
                contextResponse.data.descendants.forEach(reply => {
                    repliesContainer.appendChild(renderStatus(reply, state, state.actions));
                });
                container.appendChild(repliesContainer);
            }
            state.setNextPageUrl(null); // No infinite scroll on detail view for now

        } catch (error) {
            console.error('Failed to load status detail:', error);
            document.getElementById('status-detail-view').innerHTML = '<p>Could not load post.</p>';
        }
    }

    async function fetchTimeline(type = 'home') {
        state.currentTimeline = type.split('?')[0];
        
        if (publicSocket && publicSocket.readyState === WebSocket.OPEN) {
            publicSocket.close();
        }
        
        try {
            const response = await apiFetch(state.instanceUrl, state.accessToken, `/api/v1/timelines/${type}`);
            timelineDiv.innerHTML = '';
            response.data.forEach(status => {
                const statusElement = renderStatus(status, state, state.actions);
                if (statusElement) timelineDiv.appendChild(statusElement);
            });
            
            state.setNextPageUrl(response.linkHeader);

            if (type.startsWith('public')) {
                initPublicStreamSocket(type);
            }

        } catch (error) {
            console.error('Failed to fetch timeline:', error);
            timelineDiv.innerHTML = '<p>Could not load timeline.</p>';
        }
    }
    
    async function fetchHashtagTimeline(tagName) {
        switchView('hashtag');
        try {
            const response = await apiFetch(state.instanceUrl, state.accessToken, `/api/v1/timelines/tag/${tagName}`);
            hashtagTimelineView.innerHTML = `<div class="view-header">#${tagName}</div>`;
            if (response.data.length === 0) {
                hashtagTimelineView.innerHTML += '<p>No posts found for this hashtag.</p>';
                state.setNextPageUrl(null);
                return;
            }
            response.data.forEach(status => {
                const statusElement = renderStatus(status, state, state.actions);
                if (statusElement) hashtagTimelineView.appendChild(statusElement);
            });
            state.setNextPageUrl(response.linkHeader);
        } catch (error) {
            console.error(`Failed to fetch timeline for #${tagName}:`, error);
            hashtagTimelineView.innerHTML = `<div class="view-header">#${tagName}</div><p>Could not load timeline.</p>`;
        }
    }

    async function loadMoreContent() {
        if (!state.nextPageUrl || state.isLoadingMore) return;

        state.isLoadingMore = true;
        const endpoint = state.nextPageUrl.split(state.instanceUrl)[1];

        try {
            const response = await apiFetch(state.instanceUrl, state.accessToken, endpoint);
            
            let container;
            if (state.currentView === 'timeline') {
                container = timelineDiv;
            } else if (state.currentView === 'profile') {
                container = profilePageView.querySelector('.profile-feed');
            } else if (state.currentView === 'hashtag') {
                container = hashtagTimelineView;
            }

            if (container) {
                response.data.forEach(status => {
                    container.appendChild(renderStatus(status, state, state.actions));
                });
            }

            state.setNextPageUrl(response.linkHeader);
        } catch (error) {
            console.error('Failed to load more content:', error);
        } finally {
            state.isLoadingMore = false;
        }
    }
    
    function onLoginSuccess(instance, token) {
        state.instanceUrl = instance;
        state.accessToken = token;
        initializeApp();
    }
    
    async function toggleAction(action, post, button) {
        // ... (function is unchanged from last full version)
    }

    async function toggleCommentThread(status, statusElement, replyToAcct = null) {
        // ... (function is unchanged from last full version)
    }

    function insertTemporaryReplyBox(post, statusElement, threadContainer) {
        // ... (function is unchanged from last full version)
    }

    // --- Event Listeners ---
    window.addEventListener('scroll', () => {
        if ((window.innerHeight + window.scrollY) >= document.body.offsetHeight - 500) {
            loadMoreContent();
        }
    });

    connectBtn.addEventListener('click', () => { /* ... */ });
    logoutBtn.addEventListener('click', (e) => { /* ... */ });
    backBtn.addEventListener('click', () => switchView('timeline'));
    profileLink.addEventListener('click', (e) => { /* ... */ });
    settingsLink.addEventListener('click', (e) => { /* ... */ });
    [userDropdown, feedsDropdown, notificationsDropdown].forEach(dd => { /* ... */ });
    document.addEventListener('click', (e) => { /* ... */ });
    feedsDropdown.querySelectorAll('a').forEach(link => { /* ... */ });
    searchToggleBtn.addEventListener('click', (e) => { /* ... */ });
    searchForm.addEventListener('submit', (e) => { /* ... */ });
    navPostBtn.addEventListener('click', () => showComposeModal(state));
    editPostForm.addEventListener('submit', async (e) => { /* ... */ });
    cancelEditBtn.addEventListener('click', () => editPostModal.classList.remove('visible'));
    confirmDeleteBtn.addEventListener('click', async (e) => { /* ... */ });
    cancelDeleteBtn.addEventListener('click', () => deletePostModal.classList.remove('visible'));

    // --- Initial Load ---
    function initLoginOnLoad() { /* ... */ }
    initLoginOnLoad();
});
