import { apiFetch } from './components/api.js';
import { showModal, hideModal } from './components/ui.js';
import { renderStatus } from './components/Post.js';
import { fetchTimeline } from './components/Timeline.js';
import { showComposeModal } from './components/Compose.js';
import { showSettingsModal, loadSettings } from './components/Settings.js';
import { showProfile } from './components/Profile.js';
import { performSearch } from './components/Search.js';
import { fetchNotifications } from './components/Notifications.js';
import { initLogin, showLogin } from './components/Login.js';

document.addEventListener('DOMContentLoaded', () => {
    // --- DOM Elements ---
    const appView = document.getElementById('app-view');
    const userDisplayBtn = document.getElementById('user-display-btn');
    const timelineDiv = document.getElementById('timeline');
    const notificationsDropdown = document.getElementById('notifications-dropdown');
    const notificationsList = document.getElementById('notifications-list');
    const userDropdown = document.getElementById('user-dropdown');
    const feedsDropdown = document.getElementById('feeds-dropdown');
    const logoutBtn = document.getElementById('logout-btn');
    const profileLink = document.getElementById('profile-link');
    const settingsLink = document.getElementById('settings-link');
    const navPostBtn = document.getElementById('nav-post-btn');
    const searchContainer = document.getElementById('search-container');
    const searchToggleBtn = document.getElementById('search-toggle-btn');
    const searchForm = document.getElementById('search-form');
    const searchInput = document.getElementById('search-input');
    const searchResults = document.getElementById('search-results');
    const scrollLoader = document.getElementById('scroll-loader');

    // --- App State ---
    const state = {
        instanceUrl: '',
        accessToken: '',
        currentUser: null,
        attachedMediaId: null,
        // MODIFIED: 'filteredWords' is now 'filters' to hold the full server objects
        settings: { hideNsfw: false, filters: [] },
        currentTimeline: 'home',
        lastPostId: null,
        isLoadingMore: false,
        searchDebounce: null,
        timelineDiv,
        scrollLoader,
        searchResults,
        notificationsList,
        actions: {}
    };

    state.actions.toggleCommentThread = (status, element) => toggleCommentThread(status, element);
    state.actions.toggleAction = (action, id, button) => toggleAction(action, id, button);
    state.actions.showProfile = (id) => showProfile(state, id);

    async function initializeApp() {
        try {
            // MODIFIED: Settings load is now an async network request
            state.settings = await loadSettings(state);
            state.currentUser = await apiFetch(state.instanceUrl, state.accessToken, '/api/v1/accounts/verify_credentials');
            
            document.getElementById('login-view').style.display = 'none';
            appView.style.display = 'block';
            document.querySelector('.top-nav').style.display = 'flex';
            userDisplayBtn.textContent = state.currentUser.display_name;
            
            fetchTimeline(state, 'home');
        } catch (error) {
            console.error('Initialization failed:', error);
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

    async function toggleCommentThread(status, statusElement) {
        const existingThread = statusElement.querySelector('.comment-thread');
        if (existingThread) { existingThread.remove(); return; }

        const threadContainer = document.createElement('div');
        threadContainer.className = 'comment-thread';
        threadContainer.innerHTML = `<p>Loading replies...</p>`;
        statusElement.appendChild(threadContainer);
        requestAnimationFrame(() => threadContainer.classList.add('visible'));
        
        try {
            const context = await apiFetch(state.instanceUrl, state.accessToken, `/api/v1/statuses/${status.id}/context`);
            threadContainer.innerHTML = '';
            if (context.descendants && context.descendants.length > 0) {
                context.descendants.forEach(reply => threadContainer.appendChild(renderStatus(reply, state.settings, state.actions)));
            }
            const replyForm = document.createElement('div');
            replyForm.className = 'comment-reply-form';
            replyForm.innerHTML = `<textarea></textarea><button>Reply</button>`;
            const textarea = replyForm.querySelector('textarea');
            textarea.value = `@${status.account.acct} `;
            replyForm.querySelector('button').onclick = async () => {
                if (!textarea.value) return;
                await apiFetch(state.instanceUrl, state.accessToken, '/api/v1/statuses', {
                    method: 'POST', headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ status: textarea.value, in_reply_to_id: status.id })
                });
                toggleCommentThread(status, statusElement);
            };
            threadContainer.appendChild(replyForm);
        } catch (error) { threadContainer.innerHTML = `<p class="error">Could not load replies.</p>`; }
    }

    async function toggleAction(action, id, button) {
        let countNode = null;
        for (const node of button.childNodes) {
            if (node.nodeType === 3 && node.nodeValue.trim() !== '') {
                countNode = node;
                break;
            }
        }
        
        const currentCount = countNode ? parseInt(countNode.nodeValue.trim(), 10) : 0;
        
        const actionMap = { boost: 'reblog', favorite: 'favourite', bookmark: 'bookmark' };
        const verb = actionMap[action];
        const isDone = button.classList.contains('active');
        const endpoint = `/api/v1/statuses/${id}/${isDone ? `un${verb}` : verb}`;

        try {
            await apiFetch(state.instanceUrl, state.accessToken, endpoint, { method: 'POST' });
            button.classList.toggle('active');
            
            if (countNode) {
                const newCount = isDone ? currentCount - 1 : currentCount + 1;
                countNode.nodeValue = ` ${newCount}`;
            }

        } catch(err) { alert('Action failed.'); }
    }

    window.addEventListener('scroll', () => {
        if (state.isLoadingMore || !state.currentUser) return;
        const { scrollTop, scrollHeight, clientHeight } = document.documentElement;
        if (scrollTop + clientHeight >= scrollHeight - 400) {
            fetchTimeline(state, state.currentTimeline, true);
        }
    });

    [userDropdown, feedsDropdown, notificationsDropdown].forEach(dd => {
        dd.addEventListener('click', (e) => {
            e.stopPropagation();
            document.querySelectorAll('.dropdown').forEach(d => { if(d !== dd) d.classList.remove('active'); });
            dd.classList.toggle('active');
            if (dd.id === 'notifications-dropdown' && dd.classList.contains('active')) {
                fetchNotifications(state);
            }
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

    navPostBtn.addEventListener('click', () => showComposeModal(state));
    profileLink.addEventListener('click', (e) => { e.preventDefault(); showProfile(state, state.currentUser.id); });
    settingsLink.addEventListener('click', (e) => { e.preventDefault(); showSettingsModal(state); });

    searchToggleBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        searchForm.classList.add('active');
        searchInput.focus();
        searchToggleBtn.style.display = 'none';
    });

    searchInput.addEventListener('input', () => {
        clearTimeout(state.searchDebounce);
        state.searchDebounce = setTimeout(() => performSearch(state, searchInput.value.trim()), 300);
    });

    initLogin(onLoginSuccess);
});
