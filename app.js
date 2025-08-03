import { initLogin, showLogin } from './components/Login.js';
import { fetchTimeline } from './components/Timeline.js';
import { renderProfilePage } from './components/Profile.js';
import { renderSearchResults, renderHashtagSuggestions } from './components/Search.js';
import { renderSettingsPage } from './components/Settings.js';
import { renderStatusDetail } from './components/Post.js';
import { renderConversationsList, renderConversationDetail } from './components/Conversations.js';
import { initComposeModal, showComposeModal } from './components/Compose.js';
import { renderLemmyDiscoverPage, renderLemmyCommunityPage, renderSubscribedFeed, renderUnifiedFeed } from './components/Lemmy.js';
import { renderLemmyPostPage } from './components/LemmyPost.js';
import { ICONS } from './components/icons.js';
import { apiFetch } from './components/api.js';

document.addEventListener('DOMContentLoaded', () => {
    const state = {
        instanceUrl: null,
        accessToken: null,
        currentUser: null,
        currentTimeline: 'home',
        timelineDiv: document.getElementById('timeline'),
        scrollLoader: document.getElementById('scroll-loader'),
        isLoadingMore: false,
        lastPostId: null,
        nextPageUrl: null,
        conversations: [],
        lemmyInstances: ['lemmy.world', 'lemmy.ml', 'sh.itjust.works'],
        settings: {
            hideNsfw: false,
        },
        actions: {}
    };

    const views = {
        login: document.getElementById('login-view'),
        app: document.getElementById('app-view'),
        timeline: document.getElementById('timeline'),
        profile: document.getElementById('profile-page-view'),
        search: document.getElementById('search-results-view'),
        settings: document.getElementById('settings-view'),
        statusDetail: document.getElementById('status-detail-view'),
        hashtag: document.getElementById('hashtag-timeline-view'),
        notifications: document.getElementById('notifications-view'),
        bookmarks: document.getElementById('bookmarks-view'),
        conversations: document.getElementById('conversations-view'),
        lemmyDiscover: document.getElementById('lemmy-discover-view'),
        lemmyCommunity: document.getElementById('lemmy-community-view'),
        lemmyPost: document.getElementById('lemmy-post-view'),
        subscribedFeed: document.getElementById('subscribed-feed'),
        unifiedFeed: document.getElementById('unified-feed'),
    };

    const switchView = (viewName) => {
        Object.values(views).forEach(view => view.style.display = 'none');
        views[viewName].style.display = 'block';
        document.getElementById('back-btn').style.display = viewName !== 'timeline' ? 'block' : 'none';
        document.getElementById('search-form').style.display = 'none';
        document.getElementById('search-toggle-btn').style.display = 'block';
    };

    const showToast = (message) => {
        const toast = document.getElementById('toast-notification');
        toast.textContent = message;
        toast.classList.add('visible');
        setTimeout(() => {
            toast.classList.remove('visible');
        }, 3000);
    };

    const actions = {
        showProfile: (accountId) => {
            renderProfilePage(state, accountId);
            switchView('profile');
        },
        showStatusDetail: (statusId) => {
            renderStatusDetail(state, statusId);
            switchView('statusDetail');
        },
        showHashtagTimeline: (tagName) => {
            renderSearchResults(state, `#${tagName}`);
            switchView('search');
        },
        showConversations: () => {
            renderConversationsList(state);
            switchView('conversations');
        },
        showConversationDetail: (conversationId, participants) => {
            renderConversationDetail(state, conversationId, participants);
            switchView('conversations');
        },
        showSettings: () => {
            renderSettingsPage(state);
            switchView('settings');
        },
        showLemmyDiscover: () => {
            renderLemmyDiscoverPage(state, switchView);
        },
        showLemmyCommunity: (communityAcct) => {
            renderLemmyCommunityPage(state, communityAcct, switchView);
        },
        showLemmyPostDetail: (post) => {
            renderLemmyPostPage(state, post, switchView);
        },
        showLemmySubscribedFeed: () => {
            renderSubscribedFeed(state, switchView);
        },
        showUnifiedFeed: () => {
            renderUnifiedFeed(state, switchView);
        },
        handleSearchResultClick: (account) => {
            if (account.acct.includes('@')) {
                actions.showProfile(account.id);
            } else {
                actions.showLemmyCommunity(account.acct);
            }
        },
        toggleAction: async (action, status, button) => {
            const endpoint = `/api/v1/statuses/${status.id}/${action}`;
            const isToggled = button.classList.contains('active');
            const method = isToggled ? 'POST' : 'POST'; // Mastodon uses POST for both
            const newAction = isToggled ? action.replace('reblog', 'unreblog').replace('favorite', 'unfavorite').replace('bookmark', 'unbookmark') : action;
            try {
                const response = await apiFetch(state.instanceUrl, state.accessToken, `/api/v1/statuses/${status.id}/${newAction}`, { method: 'POST' });
                button.classList.toggle('active');
                const countSpan = button.nextElementSibling;
                if (countSpan && countSpan.classList.contains('count')) {
                    const currentCount = parseInt(countSpan.textContent, 10);
                    countSpan.textContent = isToggled ? currentCount - 1 : currentCount + 1;
                }
            } catch (err) {
                showToast(`Failed to ${action} post.`);
            }
        },
        muteAccount: async (accountId) => {
            try {
                await apiFetch(state.instanceUrl, state.accessToken, `/api/v1/accounts/${accountId}/mute`, { method: 'POST' });
                showToast('User muted successfully.');
                fetchTimeline(state, state.currentTimeline);
            } catch (err) {
                showToast('Failed to mute user.');
            }
        },
        showEditModal: (post) => {
            // Implementation for editing a post
        },
        showDeleteModal: (postId) => {
            // Implementation for deleting a post
        },
        lemmyVote: async (postId, score, card) => {
            try {
                const lemmyInstance = localStorage.getItem('lemmy_instance') || state.lemmyInstances[0];
                const jwt = localStorage.getItem('lemmy_jwt');
                if (!jwt) {
                    showToast('You need to be logged into Lemmy to vote.');
                    return;
                }
                const response = await apiFetch(lemmyInstance, jwt, '/api/v3/post/like', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ post_id: postId, score: score })
                });
                const scoreSpan = card.querySelector('.lemmy-score');
                scoreSpan.textContent = response.data.post.counts.score;
            } catch (err) {
                showToast('Failed to vote on post.');
            }
        },
        lemmySave: async (postId, button) => {
            try {
                const lemmyInstance = localStorage.getItem('lemmy_instance') || state.lemmyInstances[0];
                const jwt = localStorage.getItem('lemmy_jwt');
                if (!jwt) {
                    showToast('You need to be logged into Lemmy to save posts.');
                    return;
                }
                const response = await apiFetch(lemmyInstance, jwt, '/api/v3/post/save', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ post_id: postId, save: !button.classList.contains('active') })
                });
                button.classList.toggle('active');
            } catch (err) {
                showToast('Failed to save post.');
            }
        },
        lemmyCommentVote: async (commentId, score, commentDiv) => {
            try {
                const lemmyInstance = localStorage.getItem('lemmy_instance') || state.lemmyInstances[0];
                const jwt = localStorage.getItem('lemmy_jwt');
                if (!jwt) {
                    showToast('You need to be logged into Lemmy to vote.');
                    return;
                }
                const response = await apiFetch(lemmyInstance, jwt, '/api/v3/comment/like', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ comment_id: commentId, score: score })
                });
                const scoreSpan = commentDiv.querySelector('.lemmy-score');
                scoreSpan.textContent = response.data.comment.counts.score;
            } catch (err) {
                showToast('Failed to vote on comment.');
            }
        }
    };

    state.actions = actions;

    const onLoginSuccess = (instanceUrl, accessToken) => {
        state.instanceUrl = instanceUrl;
        state.accessToken = accessToken;
        apiFetch(instanceUrl, accessToken, '/api/v1/accounts/verify_credentials')
            .then(response => {
                state.currentUser = response.data;
                document.getElementById('user-display-btn').textContent = state.currentUser.display_name;
                document.querySelector('.top-nav').style.display = 'flex';
                switchView('app');
                fetchTimeline(state, 'home');
            })
            .catch(err => {
                showLogin();
                showToast('Login failed. Please check your instance URL and access token.');
            });
    };

    initLogin(onLoginSuccess);
    initComposeModal(state, () => {
        fetchTimeline(state, state.currentTimeline);
        showToast('Post created successfully!');
    });

    document.getElementById('refresh-btn').addEventListener('click', () => fetchTimeline(state, state.currentTimeline));
    document.getElementById('back-btn').addEventListener('click', () => switchView('timeline'));
    document.getElementById('home-feed-link').addEventListener('click', (e) => {
        e.preventDefault();
        fetchTimeline(state, 'home');
        switchView('timeline');
    });
    document.getElementById('saved-feed-link').addEventListener('click', (e) => {
        e.preventDefault();
        fetchTimeline(state, 'bookmarks');
        switchView('timeline');
    });
    document.getElementById('discover-lemmy-link').addEventListener('click', (e) => {
        e.preventDefault();
        actions.showLemmyDiscover();
    });
    document.getElementById('lemmy-subscribed-link').addEventListener('click', (e) => {
        e.preventDefault();
        actions.showLemmySubscribedFeed();
    });

    document.getElementById('search-toggle-btn').addEventListener('click', () => {
        document.getElementById('search-form').style.display = 'block';
        document.getElementById('search-toggle-btn').style.display = 'none';
        document.getElementById('search-input').focus();
    });

    document.getElementById('search-form').addEventListener('submit', (e) => {
        e.preventDefault();
        const query = document.getElementById('search-input').value.trim();
        if (query) {
            renderSearchResults(state, query);
            switchView('search');
        }
    });

    document.getElementById('search-input').addEventListener('input', (e) => {
        renderHashtagSuggestions(state, e.target.value);
    });

    document.getElementById('new-post-link').addEventListener('click', (e) => {
        e.preventDefault();
        showComposeModal(state);
    });

    document.getElementById('profile-link').addEventListener('click', (e) => {
        e.preventDefault();
        actions.showProfile(state.currentUser.id);
    });

    document.getElementById('settings-link').addEventListener('click', (e) => {
        e.preventDefault();
        actions.showSettings();
    });

    document.getElementById('logout-btn').addEventListener('click', () => {
        localStorage.removeItem('fediverse-instance');
        localStorage.removeItem('fediverse-token');
        localStorage.removeItem('lemmy_jwt');
        localStorage.removeItem('lemmy_username');
        localStorage.removeItem('lemmy_instance');
        window.location.reload();
    });

    document.getElementById('messages-btn').addEventListener('click', (e) => {
        e.preventDefault();
        actions.showConversations();
    });

    document.getElementById('notifications-btn').addEventListener('click', (e) => {
        e.preventDefault();
        // Show notifications dropdown
    });

    window.addEventListener('scroll', () => {
        if (state.isLoadingMore || !state.nextPageUrl) return;
        if (window.innerHeight + window.scrollY >= document.body.offsetHeight - 500) {
            fetchTimeline(state, state.currentTimeline, true);
        }
    });
});
