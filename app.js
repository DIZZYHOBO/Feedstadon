import { apiFetch } from './components/api.js';
import { ICONS } from './components/icons.js';
import { renderStatus, renderPollHTML } from './components/Post.js';
import { renderProfilePage } from './components/Profile.js';
import { renderSearchResults, renderHashtagSuggestions } from './components/Search.js';
import { showComposeModal, initComposeModal } from './components/Compose.js';
import { fetchNotifications, renderNotification } from './components/Notifications.js';
import { renderSettingsPage } from './components/Settings.js';
import { renderConversationsList } from './components/Conversations.js';
import { renderLemmyDiscoverPage, renderLemmyCommunityPage, renderLemmyPostPage } from './components/Lemmy.js';

document.addEventListener('DOMContentLoaded', () => {
    // --- App Initialization ---
    const savedTheme = localStorage.getItem('feedstodon-theme') || 'feedstodon';
    document.documentElement.dataset.theme = savedTheme;

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
    const notificationsView = document.getElementById('notifications-view');
    const bookmarksView = document.getElementById('bookmarks-view');
    const conversationsView = document.getElementById('conversations-view');
    const lemmyDiscoverView = document.getElementById('lemmy-discover-view');
    const lemmyCommunityView = document.getElementById('lemmy-community-view');
    const lemmyPostView = document.getElementById('lemmy-post-view');
    const backBtn = document.getElementById('back-btn');
    const logoutBtn = document.getElementById('logout-btn');
    const feedsDropdown = document.getElementById('feeds-dropdown');
    const userDropdown = document.getElementById('user-dropdown');
    const searchToggleBtn = document.getElementById('search-toggle-btn');
    const searchForm = document.getElementById('search-form');
    const searchInput = document.getElementById('search-input');
    const searchSuggestionsContainer = document.getElementById('search-suggestions-container');
    const newPostLink = document.getElementById('new-post-link');
    const messagesBtn = document.getElementById('messages-btn');
    const notificationsBtn = document.getElementById('notifications-btn');
    const profileLink = document.getElementById('profile-link');
    const settingsLink = document.getElementById('settings-link');
    const savedFeedLink = document.getElementById('saved-feed-link');
    const discoverLemmyLink = document.getElementById('discover-lemmy-link');
    const refreshBtn = document.getElementById('refresh-btn');
    const scrollLoader = document.getElementById('scroll-loader');
    const toastNotification = document.getElementById('toast-notification');

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
        conversations: [],
        lemmyInstances: JSON.parse(localStorage.getItem('lemmyInstances')) || ['lemmy.world'],
        actions: {},
        isLoadingMore: false,
        nextPageUrl: null,
        hasUnreadNotifications: false,
        hasUnreadMessages: false
    };
    
    let postToEdit = null;
    let postToDeleteId = null;
    let publicSocket = null;
    let backPressExit = false;
    let searchTimeout = null;

    state.setNextPageUrl = (linkHeader) => {
        if (linkHeader) {
            const nextLink = linkHeader.split(',').find(link => link.includes('rel="next"'));
            if (nextLink) {
                state.nextPageUrl = nextLink.match(/<(.+)>/)[1];
                scrollLoader.style.display = 'block';
                return;
            }
        }
        state.nextPageUrl = null;
        scrollLoader.style.display = 'none';
    };

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
    state.actions.voteOnPoll = (pollId, choices, statusElement) => voteOnPoll(pollId, choices, statusElement);
    state.actions.muteAccount = (accountId) => muteAccount(accountId);
    state.actions.showAllNotifications = () => {
        renderNotificationsPage();
    };
    state.actions.showConversations = () => {
        renderConversationsList(state);
        switchView('conversations');
    };
    state.actions.showLemmyDiscover = () => {
        renderLemmyDiscoverPage(state, switchView);
    };
    state.actions.showLemmyCommunity = (communityAcct) => {
        renderLemmyCommunityPage(state, communityAcct, switchView);
    };
    state.actions.showLemmyPostDetail = (post) => {
        renderLemmyPostPage(state, post, switchView);
    };
    state.actions.loadMoreContent = () => loadMoreContent();

    state.actions.handleSearchResultClick = (account) => {
        if (state.lemmyInstances.some(instance => account.acct.endsWith(`@${instance}`))) {
            state.actions.showLemmyCommunity(account.acct);
        } else {
            state.actions.showProfile(account.id);
        }
    };

    // --- View Management ---
    function switchView(viewName, pushHistory = true) {
        state.currentView = viewName;
        timelineDiv.style.display = 'none';
        profilePageView.style.display = 'none';
        searchResultsView.style.display = 'none';
        statusDetailView.style.display = 'none';
        settingsView.style.display = 'none';
        hashtagTimelineView.style.display = 'none';
        notificationsView.style.display = 'none';
        bookmarksView.style.display = 'none';
        conversationsView.style.display = 'none';
        lemmyDiscoverView.style.display = 'none';
        lemmyCommunityView.style.display = 'none';
        lemmyPostView.style.display = 'none';
        backBtn.style.display = 'none';
        feedsDropdown.style.display = 'none';
        refreshBtn.style.display = 'none';
        
        if (publicSocket && publicSocket.readyState === WebSocket.OPEN) {
            publicSocket.close();
            publicSocket = null;
        }

        if (viewName === 'timeline') {
            timelineDiv.style.display = 'flex';
            feedsDropdown.style.display = 'block';
            refreshBtn.style.display = 'flex';
        } else if (['profile', 'search', 'statusDetail', 'settings', 'hashtag', 'notifications', 'bookmarks', 'conversations', 'lemmy-discover', 'lemmy-community', 'lemmy-post'].includes(viewName)) {
            if (viewName === 'profile') profilePageView.style.display = 'block';
            if (viewName === 'search') searchResultsView.style.display = 'flex';
            if (viewName === 'statusDetail') statusDetailView.style.display = 'block';
            if (viewName === 'settings') settingsView.style.display = 'block';
            if (viewName === 'hashtag') hashtagTimelineView.style.display = 'block';
            if (viewName === 'notifications') notificationsView.style.display = 'block';
            if (viewName === 'bookmarks') bookmarksView.style.display = 'block';
            if (viewName === 'conversations') {
                conversationsView.style.display = 'flex';
                state.setNextPageUrl(null); 
            }
            if (viewName === 'lemmy-discover') lemmyDiscoverView.style.display = 'block';
            if (viewName === 'lemmy-community') lemmyCommunityView.style.display = 'block';
            if (viewName === 'lemmy-post') lemmyPostView.style.display = 'block';
            backBtn.style.display = 'block';
            feedsDropdown.style.display = 'block';
        }

        if (pushHistory) {
            history.pushState({ view: viewName }, '', `#${viewName}`);
        }
    }

    // --- Main App Logic ---
    async function initializeApp() {
        try {
            state.currentUser = (await apiFetch(state.instanceUrl, state.accessToken, '/api/v1/accounts/verify_credentials')).data;
            
            loginView.style.display = 'none';
            appView.style.display = 'block';
            document.querySelector('.top-nav').style.display = 'flex';
            
            messagesBtn.innerHTML = ICONS.message;
            notificationsBtn.innerHTML = ICONS.notifications;
            refreshBtn.innerHTML = ICONS.refresh;
            initComposeModal(state, () => fetchTimeline('home', true));
            fetchTimeline('home');
            initUserStreamSocket();
            initInfiniteScroll();

            history.replaceState({ view: 'timeline' }, '', '#timeline');

        } catch (error) {
            console.error('Initialization failed:', error);
            alert('Connection failed. Please ensure your instance URL and token are correct.');
            localStorage.clear();
            loginView.style.display = 'block';
            appView.style.display = 'none';
            document.querySelector('.top-nav').style.display = 'none';
        }
    }

    function showToast(message) {
        toastNotification.textContent = message;
        toastNotification.classList.add('visible');
        setTimeout(() => {
            toastNotification.classList.remove('visible');
        }, 2000);
    }
    
    async function renderNotificationsPage() {
        switchView('notifications');
        notificationsView.innerHTML = '<div class="view-header">Notifications</div>';
        try {
            const response = await apiFetch(state.instanceUrl, state.accessToken, '/api/v1/notifications');
            const notifications = response.data;
            if (notifications.length === 0) {
                notificationsView.innerHTML += '<p>No notifications found.</p>';
                state.setNextPageUrl(null);
                return;
            }
            notifications.forEach(notification => {
                const item = renderNotification(notification, state);
                if(item) notificationsView.appendChild(item);
            });
            state.setNextPageUrl(response.linkHeader);
            state.hasUnreadNotifications = false;
            updateNotificationIndicator();
        } catch (error) {
            console.error('Failed to load notifications page:', error);
            notificationsView.innerHTML += '<p>Could not load notifications.</p>';
        }
    }

    function updateNotificationIndicator() {
        const hasUnread = state.hasUnreadNotifications || state.hasUnreadMessages;
        userDisplayBtn.classList.toggle('has-unread', hasUnread);
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
                state.hasUnreadNotifications = true;
                updateNotificationIndicator();
                if (Notification.permission === 'granted') {
                    showBrowserNotification(JSON.parse(data.payload));
                }
            }
            if (data.event === 'conversation') {
                state.hasUnreadMessages = true;
                updateNotificationIndicator();
                if (state.currentView === 'conversations') {
                    state.actions.showConversations();
                }
            }
            if (data.event === 'delete') {
                const postId = data.payload;
                const postElement = document.querySelector(`.status[data-id='${postId}']`);
                if (postElement) {
                    postElement.classList.add('fading-out');
                    setTimeout(() => postElement.remove(), 500);
                }
            }
            if (data.event === 'status.update') {
                const updatedPost = JSON.parse(data.payload);
                const postElement = document.querySelector(`.status[data-id='${updatedPost.id}']`);
                if (postElement) {
                    const favButton = postElement.querySelector('[data-action="favorite"]');
                    const boostButton = postElement.querySelector('[data-action="boost"]');
                    if (favButton) {
                        favButton.innerHTML = `${ICONS.favorite} ${updatedPost.favourites_count}`;
                    }
                    if (boostButton) {
                        boostButton.innerHTML = `${ICONS.boost} ${updatedPost.reblogs_count}`;
                    }
                }
            }
        };
        socket.onclose = () => {
            console.log('User WebSocket connection closed. Reconnecting in 5s...');
            setTimeout(initUserStreamSocket, 5000);
        };
        socket.onerror = (error) => console.error('User WebSocket error:', error);
    }
    
    function showBrowserNotification(notificationData) {
        let title = 'New Notification';
        let options = {
            icon: notificationData.account.avatar_static,
            body: ''
        };

        switch (notificationData.type) {
            case 'favourite':
                title = `${notificationData.account.display_name} favorited your post`;
                options.body = notificationData.status.content.replace(/<[^>]*>/g, "");
                break;
            case 'reblog':
                title = `${notificationData.account.display_name} boosted your post`;
                options.body = notificationData.status.content.replace(/<[^>]*>/g, "");
                break;
            case 'mention':
                title = `${notificationData.account.display_name} mentioned you`;
                options.body = notificationData.status.content.replace(/<[^>]*>/g, "");
                break;
            case 'follow':
                title = `${notificationData.account.display_name} followed you`;
                break;
            default:
                return;
        }

        const notification = new Notification(title, options);
        notification.onclick = () => {
            window.focus();
            if (notificationData.status) {
                showStatusDetail(notificationData.status.id);
            } else {
                showProfile(notificationData.account.id);
            }
        };
    }

    function initPublicStreamSocket(type) {
        if (type !== 'public?local=true') {
            return;
        }
        const cleanInstanceUrl = state.instanceUrl.replace(/^https?:\/\//, '');
        const streamType = 'public:local';
        const socketUrl = `wss://${cleanInstanceUrl}/api/v1/streaming?stream=${streamType}`;
        
        try {
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
            publicSocket.onerror = (error) => {
                console.error(`Public WebSocket (${streamType}) error. This instance may not support this stream.`, error);
            };
        } catch (error) {
            console.error(`Failed to create Public WebSocket (${streamType}).`, error);
        }
    }
    
    async function showStatusDetail(statusId) {
        switchView('statusDetail');
        try {
            const mainStatusResponse = await apiFetch(state.instanceUrl, state.accessToken, `/api/v1/statuses/${statusId}`);
            const contextResponse = await apiFetch(state.instanceUrl, state.accessToken, `/api/v1/statuses/${statusId}/context`);
            const container = document.getElementById('status-detail-view');
            container.innerHTML = '';
            
            if (contextResponse.data.ancestors && contextResponse.data.ancestors.length > 0) {
                contextResponse.data.ancestors.forEach(ancestor => {
                    container.appendChild(renderStatus(ancestor, state, state.actions, true));
                });
            }

            const mainPostElement = renderStatus(mainStatusResponse.data, state, state.actions);
            mainPostElement.classList.add('main-thread-post');
            container.appendChild(mainPostElement);

            if (contextResponse.data.descendants && contextResponse.data.descendants.length > 0) {
                contextResponse.data.descendants.forEach(descendant => {
                    container.appendChild(renderStatus(descendant, state, state.actions, true));
                });
            }
            state.setNextPageUrl(null);
        } catch (error) {
            console.error('Failed to load status detail:', error);
            document.getElementById('status-detail-view').innerHTML = '<p>Could not load post.</p>';
        }
    }

    async function fetchTimeline(type = 'home') {
        if (type === 'public?local=true') {
            state.currentTimeline = 'local';
        } else {
            state.currentTimeline = type.split('?')[0];
        }

        if (publicSocket && publicSocket.readyState === WebSocket.OPEN) {
            publicSocket.close();
            publicSocket = null;
        }

        try {
            let endpoint;
            if (type === 'bookmarks') {
                endpoint = '/api/v1/bookmarks';
            } else {
                endpoint = `/api/v1/timelines/${type}`;
            }
            const response = await apiFetch(state.instanceUrl, state.accessToken, endpoint);
            timelineDiv.innerHTML = '';
            response.data.forEach(status => {
                if (type === 'home' && state.lemmyInstances.some(instance => status.account.acct.endsWith(`@${instance}`)) && !status.reblog) {
                    return; 
                }
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
        scrollLoader.classList.add('loading');
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
            } else if (state.currentView === 'notifications') {
                container = notificationsView;
            } else if (state.currentView === 'bookmarks') {
                container = bookmarksView;
            }
            if (container) {
                response.data.forEach(item => {
                    let element;
                    if (state.currentView === 'notifications') {
                        element = renderNotification(item, state);
                    } else {
                        element = renderStatus(item, state, state.actions);
                    }
                    if (element) container.appendChild(element);
                });
            }
            state.setNextPageUrl(response.linkHeader);
        } catch (error) {
            console.error('Failed to load more content:', error);
            alert('Failed to load more posts.');
        } finally {
            state.isLoadingMore = false;
            scrollLoader.classList.remove('loading');
        }
    }
    
    function onLoginSuccess(instance, token) {
        state.instanceUrl = instance;
        state.accessToken = token;
        initializeApp();
    }
    
    async function voteOnPoll(pollId, choices, statusElement) {
        try {
            const response = await apiFetch(state.instanceUrl, state.accessToken, `/api/v1/polls/${pollId}/votes`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ choices })
            });
            const updatedPoll = response.data;
            const pollContainer = statusElement.querySelector('.poll-container');
            if (pollContainer) {
                pollContainer.outerHTML = renderPollHTML(updatedPoll);
            }
        } catch (error) {
            console.error('Failed to vote on poll:', error);
            alert('Could not cast vote.');
        }
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
        const endpointAction = (action === 'boost' && isActive) ? 'unreblog' : (action === 'boost' && !isActive) ? 'reblog' : (action === 'favorite' && isActive) ? 'unfavourite' : (action === 'favorite' && !isActive) ? 'favourite' : (action === 'bookmark' && isActive) ? 'unbookmark' : 'bookmark';
        const endpoint = `/api/v1/statuses/${post.id}/${endpointAction}`;
        try {
            const response = await apiFetch(state.instanceUrl, state.accessToken, endpoint, { method: 'POST' });
            const updatedPost = response.data;
            button.classList.toggle('active');
            if (action === 'boost' && state.currentTimeline === 'home') {
                if (endpointAction === 'reblog') {
                    const newPostElement = renderStatus(updatedPost, state, state.actions);
                    if (newPostElement) {
                        newPostElement.classList.add('newly-added');
                        timelineDiv.prepend(newPostElement);
                    }
                } else {
                    const postToRemove = timelineDiv.querySelector(`.status[data-id='${updatedPost.id}']`);
                    if (postToRemove) postToRemove.remove();
                }
            } else if (action === 'boost' || action === 'favorite') {
                const count = updatedPost[action === 'boost' ? 'reblogs_count' : 'favourites_count'];
                button.innerHTML = `${ICONS[action]} ${count}`;
            }
            if (action === 'bookmark' && endpointAction === 'unbookmark' && state.currentTimeline === 'bookmarks') {
                const postElement = document.querySelector(`.status[data-id='${post.id}']`);
                if (postElement) {
                    postElement.classList.add('fading-out');
                    setTimeout(() => postElement.remove(), 500);
                }
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
            const context = (await apiFetch(state.instanceUrl, state.accessToken, `/api/v1/statuses/${status.id}/context`)).data;
            threadContainer.innerHTML = '';
            if (context.descendants && context.descendants.length > 0) {
                context.descendants.forEach(reply => {
                    const replyElement = renderStatus(reply, state, state.actions, true);
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

    async function muteAccount(accountId) {
        try {
            await apiFetch(state.instanceUrl, state.accessToken, `/api/v1/accounts/${accountId}/mute`, {
                method: 'POST'
            });
            alert('User muted. Their posts will be hidden on your next timeline refresh.');
        } catch (error) {
            console.error('Failed to mute user:', error);
            alert('Could not mute user.');
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
    
    backBtn.addEventListener('click', () => {
        if (state.currentView === 'conversations' && document.querySelector('.message-list')) {
             state.actions.showConversations();
        } else {
            window.history.back();
        }
    });
    
    function handleMenuAction(action) {
        action();
        userDropdown.classList.remove('active');
    }

    messagesBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        handleMenuAction(state.actions.showConversations);
    });

    notificationsBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        handleMenuAction(state.actions.showAllNotifications);
    });

    newPostLink.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        handleMenuAction(() => showComposeModal(state));
    });

    profileLink.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        handleMenuAction(() => state.actions.showProfile(state.currentUser.id));
    });

    settingsLink.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        handleMenuAction(() => {
            renderSettingsPage(state);
            switchView('settings');
        });
    });

    discoverLemmyLink.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        handleMenuAction(() => {
            state.actions.showLemmyDiscover();
        });
    });
    
    [userDropdown, feedsDropdown].forEach(dd => {
        if (dd) {
            dd.addEventListener('click', (e) => {
                e.stopPropagation();
                document.querySelectorAll('.dropdown').forEach(d => {
                    if (d !== dd) d.classList.remove('active');
                });
                dd.classList.toggle('active');
            });
        }
    });

    function initInfiniteScroll() {
        const options = {
            root: null,
            rootMargin: '400px 0px', // Increased margin for better mobile performance
            threshold: 0
        };
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    loadMoreContent();
                }
            });
        }, options);
        observer.observe(scrollLoader);
    }
    
    document.addEventListener('click', (e) => {
        const isClickInsideDropdown = e.target.closest('.dropdown');
        const isClickInsideSearch = e.target.closest('.nav-center') || e.target.closest('#search-toggle-btn');
        const isClickInsidePostOptions = e.target.closest('.post-options-btn') || e.target.closest('.post-options-menu');
        if (!isClickInsideDropdown) {
            document.querySelectorAll('.dropdown.active').forEach(d => {
                d.classList.remove('active');
            });
        }
        if (!isClickInsideSearch) {
            searchInput.value = '';
            searchForm.style.display = 'none';
            searchToggleBtn.style.display = 'block';
            searchSuggestionsContainer.style.display = 'none';
        }
        if (!isClickInsidePostOptions) {
            document.querySelectorAll('.post-options-menu').forEach(menu => {
                menu.style.display = 'none';
            });
        }
    });

    feedsDropdown.querySelectorAll('a').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            switchView('timeline');
            fetchTimeline(link.dataset.timeline);
        });
    });
    
    refreshBtn.addEventListener('click', () => {
        if (state.currentView === 'timeline') {
            fetchTimeline(state.currentTimeline === 'local' ? 'public?local=true' : state.currentTimeline);
        }
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
        switchView('search');
        renderSearchResults(state, query);
    });

    searchInput.addEventListener('input', () => {
        const query = searchInput.value.trim();
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => {
            if (query.startsWith('#')) {
                renderHashtagSuggestions(state, query);
            } else {
                searchSuggestionsContainer.style.display = 'none';
            }
        }, 100);
    });
    
    editPostForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const newContent = editPostTextarea.value;
        if (!postToEdit || newContent.trim() === '') return;
        try {
            const updatedPost = (await apiFetch(state.instanceUrl, state.accessToken, `/api/v1/statuses/${postToEdit.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: newContent })
            })).data;
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
    
    window.addEventListener('popstate', (event) => {
        if (state.currentView === 'timeline') {
            if (backPressExit) {
                window.close();
            } else {
                backPressExit = true;
                showToast('Press back again to exit');
                setTimeout(() => { backPressExit = false; }, 2000);
                history.pushState({ view: 'timeline' }, '', '#timeline');
            }
            return;
        }

        if (event.state && event.state.view) {
            switchView(event.state.view, false);
            if (event.state.view === 'timeline') {
                fetchTimeline(state.currentTimeline);
            } else if (event.state.view === 'bookmarks') {
                fetchTimeline('bookmarks');
            } else if (event.state.view === 'notifications') {
                renderNotificationsPage();
            }
        } else {
            switchView('timeline', false);
            fetchTimeline('home');
        }
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
