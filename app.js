import { apiFetch } from './components/api.js';
import { ICONS } from './components/icons.js';
import { renderStatus } from './components/Post.js';
import { renderProfilePage } from './components/Profile.js';
import { renderSearchResults } from './components/Search.js';
import { showComposeModal, initComposeModal } from './components/Compose.js';


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
        actions: {}
    };

    let postToEdit = null;
    let postToDeleteId = null;

    // --- Core Actions ---
    state.actions.showProfile = (id) => {
        renderProfilePage(state, id);
        switchView('profile');
    };
    state.actions.toggleAction = (action, id, button) => toggleAction(action, id, button);
    state.actions.toggleCommentThread = (status, element) => toggleCommentThread(status, element);
    state.actions.showEditModal = (post) => {
        postToEdit = post;
        editPostTextarea.value = post.content.replace(/<br\s*\/?>/gi, "\n");
        editPostModal.classList.add('visible');
    };
    state.actions.showDeleteModal = (postId) => {
        postToDeleteId = postId;
        deletePostModal.classList.add('visible');
    };

    // --- View Management ---
    function switchView(viewName) {
        timelineDiv.style.display = 'none';
        profilePageView.style.display = 'none';
        searchResultsView.style.display = 'none';
        backBtn.style.display = 'none';
        feedsDropdown.style.display = 'none';
        
        if (viewName === 'timeline') {
            timelineDiv.style.display = 'flex';
            feedsDropdown.style.display = 'block';
        } else if (viewName === 'profile' || viewName === 'search') {
            if (viewName === 'profile') profilePageView.style.display = 'block';
            if (viewName === 'search') searchResultsView.style.display = 'flex';
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
            
            initComposeModal(state, () => fetchTimeline());
            
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
                if (statusElement) timelineDiv.appendChild(statusElement);
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
    
    async function toggleAction(action, id, button) { /* ... unchanged ... */ }
    async function toggleCommentThread(status, statusElement) { /* ... unchanged ... */ }

    // --- Event Listeners ---
    connectBtn.addEventListener('click', () => { /* ... unchanged ... */ });
    logoutBtn.addEventListener('click', (e) => { /* ... unchanged ... */ });
    backBtn.addEventListener('click', () => switchView('timeline'));
    profileLink.addEventListener('click', (e) => state.actions.showProfile(state.currentUser.id));
    searchToggleBtn.addEventListener('click', (e) => { /* ... unchanged ... */ });
    searchForm.addEventListener('submit', (e) => { /* ... unchanged ... */ });
    
    navPostBtn.addEventListener('click', () => showComposeModal(state));
    
    editPostForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const newContent = editPostTextarea.value;
        if (!postToEdit || newContent.trim() === '') return;

        try {
            const updatedPost = await apiFetch(state.instanceUrl, state.accessToken, `/api/v1/statuses/${postToEdit.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: newContent })
            });

            const oldPostElement = document.querySelector(`.status[data-id='${postToEdit.id}']`);
            if (oldPostElement) {
                const newPostElement = renderStatus(updatedPost, state, state.actions);
                oldPostElement.replaceWith(newPostElement);
            }
            editPostModal.classList.remove('visible');
        } catch (error) {
            console.error('Failed to edit post:', error);
            alert('Error editing post.');
        }
    });

    cancelEditBtn.addEventListener('click', () => editPostModal.classList.remove('visible'));

    confirmDeleteBtn.addEventListener('click', async () => {
        if (!postToDeleteId) return;
        try {
            await apiFetch(state.instanceUrl, state.accessToken, `/api/v1/statuses/${postToDeleteId}`, { method: 'DELETE' });
            
            const postElement = document.querySelector(`.status[data-id='${postToDeleteId}']`);
            if (postElement) postElement.remove();
            
            deletePostModal.classList.remove('visible');
        } catch (error) {
            console.error('Failed to delete post:', error);
            alert('Error deleting post.');
        }
    });

    cancelDeleteBtn.addEventListener('click', () => deletePostModal.classList.remove('visible'));

    // --- Initial Load ---
    function initLoginOnLoad() { /* ... unchanged ... */ }
    initLoginOnLoad();
});
