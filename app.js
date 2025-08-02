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
        notificationsList,
        actions: {}
    };

    let postToEdit = null;
    let postToDeleteId = null;

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
        timelineDiv.style.display = 'none';
        profilePageView.style.display = 'none';
        searchResultsView.style.display = 'none';
        statusDetailView.style.display = 'none';
        settingsView.style.display = 'none';
        hashtagTimelineView.style.display = 'none';
        backBtn.style.display = 'none';
        feedsDropdown.style.display = 'none';
        
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
            state.currentUser = await apiFetch(state.instanceUrl, state.accessToken, '/api/v1/accounts/verify_credentials');
            
            loginView.style.display = 'none';
            appView.style.display = 'block';
            document.querySelector('.top-nav').style.display = 'flex';
            userDisplayBtn.textContent = state.currentUser.display_name;
            
            initComposeModal(state, () => fetchTimeline('home', true));
            fetchTimeline('home');
            initWebSocket(); // ADDED: Start the live connection

        } catch (error) {
            console.error('Initialization failed:', error);
            alert('Connection failed. Please ensure your instance URL and token are correct.');
            localStorage.clear();
            loginView.style.display = 'block';
            appView.style.display = 'none';
            document.querySelector('.top-nav').style.display = 'none';
        }
    }

    // ADDED: New function to handle WebSocket connection
    function initWebSocket() {
        const cleanInstanceUrl = state.instanceUrl.replace(/^https?:\/\//, '');
        const socketUrl = `wss://${cleanInstanceUrl}/api/v1/streaming?stream=user&access_token=${state.accessToken}`;
        const socket = new WebSocket(socketUrl);

        socket.onopen = () => {
            console.log('WebSocket connection established.');
        };

        socket.onmessage = (event) => {
            const data = JSON.parse(event.data);
            
            // Listen for new posts on the home timeline
            if (data.event === 'update' && state.currentTimeline === 'home') {
                const post = JSON.parse(data.payload);
                const postElement = renderStatus(post, state, state.actions);
                if (postElement) {
                    timelineDiv.prepend(postElement);
                }
            }

            // You can add more event handlers here later (e.g., for notifications)
            if (data.event === 'notification') {
                console.log('New notification received:', JSON.parse(data.payload));
            }
        };

        socket.onclose = () => {
            console.log('WebSocket connection closed. Attempting to reconnect in 5 seconds...');
            setTimeout(initWebSocket, 5000); // Simple auto-reconnect
        };

        socket.onerror = (error) => {
            console.error('WebSocket error:', error);
        };
    }
    
    async function showStatusDetail(statusId) {
        const container = document.getElementById('status-detail-view');
        container.innerHTML = '<p>Loading post...</p>';
        switchView('statusDetail');

        try {
            const mainStatus = await apiFetch(state.instanceUrl, state.accessToken, `/api/v1/statuses/${statusId}`);
            const context = await apiFetch(state.instanceUrl, state.accessToken, `/api/v1/statuses/${statusId}/context`);
            
            container.innerHTML = '';
            
            const mainPostElement = renderStatus(mainStatus, state, state.actions);
            container.appendChild(mainPostElement);

            if (context.descendants && context.descendants.length > 0) {
                const repliesContainer = document.createElement('div');
                repliesContainer.className = 'comment-thread';
                repliesContainer.style.marginTop = '0';
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

    async function fetchTimeline(type = 'home', isNewPost = false) {
        state.currentTimeline = type.split('?')[0];
        if (!isNewPost) {
            timelineDiv.innerHTML = '<p>Loading timeline...</p>';
        }
        try {
            const statuses = await apiFetch(state.instanceUrl, state.accessToken, `/api/v1/timelines/${type}`);
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
    
    async function fetchHashtagTimeline(tagName) {
        switchView('hashtag');
        hashtagTimelineView.innerHTML = `
            <div class="view-header">#${tagName}</div>
            <p>Loading posts...</p>
        `;

        try {
            const statuses = await apiFetch(state.instanceUrl, state.accessToken, `/api/v1/timelines/tag/${tagName}`);
            
            hashtagTimelineView.innerHTML = `<div class="view-header">#${tagName}</div>`;

            if (statuses.length === 0) {
                hashtagTimelineView.innerHTML += '<p>No posts found for this hashtag.</p>';
                return;
            }

            statuses.forEach(status => {
                const statusElement = renderStatus(status, state, state.actions);
                if (statusElement) hashtagTimelineView.appendChild(statusElement);
            });
        } catch (error) {
            console.error(`Failed to fetch timeline for #${tagName}:`, error);
            hashtagTimelineView.innerHTML += '<p>Could not load timeline.</p>';
        }
    }
    
    function onLoginSuccess(instance, token) {
        state.instanceUrl = instance;
        state.accessToken = token;
        initializeApp();
    }
    
    async function toggleAction(action, post, button) {
        if (action === 'reply') {
            const postElement = button.closest('.status');
            const threadContainer = postElement.closest('.comment-thread, .status-detail-view, #timeline');
            
            if (postElement.parentElement.classList.contains('comment-thread')) {
                insertTemporaryReplyBox(post, postElement, threadContainer);
            } else {
                toggleCommentThread(post, postElement, post.account.acct);
            }
            return;
        }

        const isActive = button.classList.contains('active');
        const endpointAction = (action === 'boost' && isActive) ? 'unreblog' :
                               (action === 'boost' && !isActive) ? 'reblog' :
                               (action === 'favorite' && isActive) ? 'unfavourite' :
                               (action === 'favorite' && !isActive) ? 'favourite' :
                               (action === 'bookmark' && isActive) ? 'unbookmark' : 'bookmark';
        
        const endpoint = `/api/v1/statuses/${post.id}/${endpointAction}`;

        try {
            const response = await apiFetch(state.instanceUrl, state.accessToken, endpoint, { method: 'POST' });
            button.classList.toggle('active');

            if (action === 'boost' && state.currentTimeline === 'home') {
                fetchTimeline('home');
            } 
            else if (action === 'boost' || action === 'favorite') {
                const count = response[action === 'boost' ? 'reblogs_count' : 'favourites_count'];
                button.innerHTML = `${ICONS[action]} ${count}`;
            }

        } catch (error) {
            console.error(`Failed to ${action} post:`, error);
            alert(`Could not ${action} post.`);
        }
    }

    async function toggleCommentThread(status, statusElement, replyToAcct = null) {
        document.querySelectorAll('.comment-thread').forEach(thread => {
            if (thread.parentElement !== statusElement) {
                thread.remove();
            }
        });

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

            const textarea = replyForm.querySelector('textarea');
            if (replyToAcct) {
                textarea.value = `@${replyToAcct} `;
                textarea.focus();
            }

            replyForm.addEventListener('submit', async (e) => {
                e.preventDefault();
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

    function insertTemporaryReplyBox(post, statusElement, threadContainer) {
        const existingTempBox = threadContainer.querySelector('.temporary-reply-form');
        if (existingTempBox) {
            existingTempBox.remove();
        }

        const mainReplyBox = threadContainer.querySelector('.comment-reply-form:not(.temporary-reply-form)');
        if (mainReplyBox) mainReplyBox.style.display = 'none';

        const tempReplyForm = document.createElement('form');
        tempReplyForm.className = 'comment-reply-form temporary-reply-form';
        tempReplyForm.innerHTML = `
            <textarea></textarea>
            <div style="display: flex; flex-direction: column; gap: 5px;">
                <button type="submit">Reply</button>
                <button type="button" class="cancel-temp-reply button-secondary">Cancel</button>
            </div>
        `;
        
        statusElement.after(tempReplyForm);

        const textarea = tempReplyForm.querySelector('textarea');
        textarea.value = `@${post.account.acct} `;
        textarea.focus();

        const closeAndCleanup = () => {
            tempReplyForm.remove();
            if (mainReplyBox) mainReplyBox.style.display = 'flex';
        };

        tempReplyForm.querySelector('.cancel-temp-reply').addEventListener('click', closeAndCleanup);

        tempReplyForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const content = textarea.value.trim();
            if (!content) return;

            try {
                const mainPostElement = threadContainer.closest('.status');
                const mainPostId = mainPostElement.dataset.id;
                
                await apiFetch(state.instanceUrl, state.accessToken, `/api/v1/statuses`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ status: content, in_reply_to_id: mainPostId })
                });

                toggleCommentThread(mainPostElement, mainPostElement);
                setTimeout(() => toggleCommentThread(mainPostElement, mainPostElement), 100);

            } catch(error) {
                console.error("Failed to post nested reply:", error);
                alert("Could not post reply.");
                closeAndCleanup();
            }
        });
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

    settingsLink.addEventListener('click', (e) => {
        e.preventDefault();
        renderSettingsPage(state);
        switchView('settings');
    });
    
    [userDropdown, feedsDropdown, notificationsDropdown].forEach(dd => {
        if (dd) {
            dd.addEventListener('click', (e) => {
                e.stopPropagation();
                document.querySelectorAll('.dropdown').forEach(d => {
                    if (d !== dd) d.classList.remove('active');
                });
                dd.classList.toggle('active');
                if (dd.id === 'notifications-dropdown' && dd.classList.contains('active')) {
                    fetchNotifications(state);
                }
            });
        }
    });

    document.addEventListener('click', (e) => {
        const isClickInsideDropdown = e.target.closest('.dropdown');
        const isClickInsideSearch = e.target.closest('.nav-center') || e.target.closest('#search-toggle-btn');

        if (!isClickInsideDropdown) {
            document.querySelectorAll('.dropdown.active').forEach(d => {
                d.classList.remove('active');
            });
        }
        
        if (!isClickInsideSearch) {
            searchInput.value = '';
            searchForm.style.display = 'none';
            searchToggleBtn.style.display = 'block';
        }
    });

    feedsDropdown.querySelectorAll('a').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            switchView('timeline');
            fetchTimeline(link.dataset.timeline);
        });
    });
    
    searchToggleBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        searchForm.style.display = 'block';
        searchInput.focus();
        searchToggleBtn.style.display = 'none';
    });
    
    searchForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const query = searchInput.value.trim();
        if (!query) return;
    
        renderSearchResults(state, query);
        switchView('search');
    });
    
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
