import { apiFetch } from './components/api.js';
import { showModal, hideModal, initUI } from './components/ui.js';
import { ICONS } from './components/icons.js';
import { renderStatus } from './components/Post.js';
import { fetchTimeline } from './components/Timeline.js';
import { showComposeModal } from './components/Compose.js';
import { showSettingsModal, loadSettings } from './components/Settings.js';
import { renderProfilePage } from './components/Profile.js';
import { renderSearchResults } from './components/Search.js';
import { fetchNotifications } from './components/Notifications.js';
import { initLogin, showLogin } from './components/Login.js';

document.addEventListener('DOMContentLoaded', () => {
    initUI();

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
    const scrollLoader = document.getElementById('scroll-loader');
    const profilePageView = document.getElementById('profile-page-view');
    const searchResultsView = document.getElementById('search-results-view');
    const backBtn = document.getElementById('back-btn');
    
    const editPostModal = document.getElementById('edit-post-modal');
    const editPostForm = document.getElementById('edit-post-form');
    const editPostTextarea = document.getElementById('edit-post-textarea');
    const cancelEditBtn = document.getElementById('cancel-edit-post');
    
    const deletePostModal = document.getElementById('delete-post-modal');
    const cancelDeleteBtn = document.getElementById('cancel-delete-post');
    const confirmDeleteBtn = document.getElementById('confirm-delete-btn');

    // --- App State ---
    const state = {
        instanceUrl: '',
        accessToken: '',
        currentUser: null,
        settings: { hideNsfw: false, filters: [] },
        currentTimeline: 'home',
        lastPostId: null,
        isLoadingMore: false,
        timelineDiv,
        scrollLoader,
        notificationsList,
        actions: {}
    };
    
    let postToEdit = null;
    let postToDeleteId = null;

    state.actions.showProfile = (id) => {
        renderProfilePage(state, id);
        switchView('profile');
    };
    state.actions.toggleCommentThread = (status, element) => toggleCommentThread(status, element);
    state.actions.toggleAction = (action, id, button) => toggleAction(action, id, button);
    state.actions.showEditModal = (post) => {
        postToEdit = post;
        editPostTextarea.value = post.content.replace(/<br\s*\/?>/gi, "\n"); // Convert <br> to newlines
        editPostModal.classList.add('visible');
    };
    state.actions.showDeleteModal = (postId) => {
        postToDeleteId = postId;
        deletePostModal.classList.add('visible');
    };

    function switchView(viewName) {
        timelineDiv.style.display = 'none';
        profilePageView.style.display = 'none';
        searchResultsView.style.display = 'none';
        scrollLoader.style.display = 'none';
        feedsDropdown.style.display = 'none';
        backBtn.style.display = 'none';
        searchToggleBtn.style.display = 'block';
        navPostBtn.style.display = 'block';
        searchForm.style.display = 'none';

        if (viewName === 'timeline') {
            timelineDiv.style.display = 'flex';
            scrollLoader.style.display = 'block';
            feedsDropdown.style.display = 'block';
        } else if (viewName === 'profile' || viewName === 'search') {
            if (viewName === 'profile') profilePageView.style.display = 'block';
            if (viewName === 'search') searchResultsView.style.display = 'flex';
            backBtn.style.display = 'block';
        }
    }

    async function initializeApp() {
        try {
            // MODIFIED: Verify user credentials FIRST to ensure the token is valid.
            state.currentUser = await apiFetch(state.instanceUrl, state.accessToken, '/api/v1/accounts/verify_credentials');
            
            // MODIFIED: Load settings AFTER successful verification.
            state.settings = await loadSettings(state);
            
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
    
    // --- EVENT LISTENERS ---
    
    window.addEventListener('scroll', () => {
        if (state.isLoadingMore || !state.currentUser || timelineDiv.style.display === 'none') return;
        const { scrollTop, scrollHeight, clientHeight } = document.documentElement;
        if (scrollTop + clientHeight >= scrollHeight - 400) fetchTimeline(state, state.currentTimeline, true);
    });
    
    backBtn.addEventListener('click', () => switchView('timeline'));
    
    [userDropdown, feedsDropdown, notificationsDropdown].forEach(dd => {
        if (dd) {
            dd.addEventListener('click', (e) => {
                e.stopPropagation();
                document.querySelectorAll('.dropdown').forEach(d => { if(d !== dd) d.classList.remove('active'); });
                dd.classList.toggle('active');
                if (dd.id === 'notifications-dropdown' && dd.classList.contains('active')) fetchNotifications(state);
            });
        }
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

    // --- Edit/Delete Modal Handlers ---
    
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
            await apiFetch(state.instanceUrl, state.accessToken, `/api/v1/statuses/${postToDeleteId}`, {
                method: 'DELETE'
            });
            
            const postElement = document.querySelector(`.status[data-id='${postToDeleteId}']`);
            if (postElement) {
                postElement.style.transition = 'opacity 0.5s';
                postElement.style.opacity = '0';
                setTimeout(() => postElement.remove(), 500);
            }
            deletePostModal.classList.remove('visible');
        } catch (error) {
            console.error('Failed to delete post:', error);
            alert('Error deleting post.');
        }
    });

    cancelDeleteBtn.addEventListener('click', () => deletePostModal.classList.remove('visible'));

    // --- Initialize App ---
    initLogin(onLoginSuccess);
});
