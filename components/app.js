import { apiFetch } from './components/api.js';
import { showModal, hideModal } from './components/ui.js';
import { renderStatus } from './components/Post.js';
import { fetchTimeline } from './components/Timeline.js';
import { showComposeModal } from './components/Compose.js';
import { showSettingsModal, loadSettings } from './components/Settings.js';
import { showProfile } from './components/Profile.js';
import { performSearch } from './components/Search.js';
import { fetchNotifications } from './components/Notifications.js';

document.addEventListener('DOMContentLoaded', () => {
    // --- DOM Elements ---
    const loginView = document.getElementById('login-view');
    const appView = document.getElementById('app-view');
    const instanceUrlInput = document.getElementById('instance-url');
    const accessTokenInput = document.getElementById('access-token');
    const connectBtn = document.getElementById('connect-btn');
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
        settings: { hideNsfw: false, filteredWords: [] },
        currentTimeline: 'home',
        lastPostId: null,
        isLoadingMore: false,
        searchDebounce: null,
        // Pass DOM elements into state for components to use
        timelineDiv,
        scrollLoader,
        searchResults,
        notificationsList
    };

    // --- App Initialization ---
    async function initializeApp() {
        try {
            state.settings = loadSettings();
            state.currentUser = await apiFetch(state.instanceUrl, state.accessToken, '/api/v1/accounts/verify_credentials');
            loginView.style.display = 'none';
            appView.style.display = 'block';
            document.querySelector('.top-nav').style.display = 'flex';
            userDisplayBtn.textContent = state.currentUser.display_name;
            fetchTimeline(state, 'home');
        } catch (error) {
            alert('Connection failed. Please check URL and token.');
            localStorage.clear();
            window.location.reload();
        }
    }
    
    // --- Event Listeners ---
    connectBtn.addEventListener('click', () => {
        state.instanceUrl = instanceUrlInput.value.trim();
        state.accessToken = accessTokenInput.value.trim();
        if (state.instanceUrl && state.accessToken) {
            localStorage.setItem('fediverse-instance', state.instanceUrl);
            localStorage.setItem('fediverse-token', state.accessToken);
            initializeApp();
        }
    });
    
    window.addEventListener('click', (e) => {
        if (!e.target.closest('.dropdown')) {
            document.querySelectorAll('.dropdown.active').forEach(d => d.classList.remove('active'));
        }
        if (!searchContainer.contains(e.target)) {
            searchForm.classList.remove('active');
            searchToggleBtn.style.display = 'inline-block';
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

    navPostBtn.addEventListener('click', () => showComposeModal(state));
    logoutBtn.addEventListener('click', (e) => { e.preventDefault(); localStorage.clear(); window.location.reload(); });
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
    
    window.addEventListener('scroll', () => {
        if (state.isLoadingMore || !state.currentUser) return;
        const { scrollTop, scrollHeight, clientHeight } = document.documentElement;
        if (scrollTop + clientHeight >= scrollHeight - 400) {
            fetchTimeline(state, state.currentTimeline, true);
        }
    });

    // --- Initial Page Load ---
    const savedInstance = localStorage.getItem('fediverse-instance');
    const savedToken = localStorage.getItem('fediverse-token');
    if (savedInstance && savedToken) {
        instanceUrlInput.value = savedInstance;
        accessTokenInput.value = savedToken;
        state.instanceUrl = savedInstance;
        state.accessToken = savedToken;
        initializeApp();
    } else {
         document.querySelector('.top-nav').style.display = 'none';
    }
});
