import { initLogin, showLogin } from './components/Login.js';
import { fetchTimeline } from './components/Timeline.js';
import { renderProfilePage, renderLemmyProfilePage } from './components/Profile.js';
import { renderSearchResults, renderHashtagSuggestions } from './components/Search.js';
import { renderSettingsPage } from './components/Settings.js';
import { renderStatusDetail } from './components/Post.js';
import { renderConversationsList, renderConversationDetail } from './components/Conversations.js';
import { initComposeModal, showComposeModal } from './components/Compose.js';
import { renderLemmyDiscoverPage, renderLemmyCommunityPage, renderSubscribedFeed, renderUnifiedFeed, fetchLemmyFeed } from './components/Lemmy.js';
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
        nextPageUrl: null,
        conversations: [],
        lemmyInstances: ['lemmy.world', 'lemmy.ml', 'sh.itjust.works', 'lemina.space'],
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
        // Hide all views first by iterating over the `views` object
        Object.keys(views).forEach(key => {
            if (views[key] && views[key].style) {
                views[key].style.display = 'none';
            }
        });

        // Handle login view separately
        if (viewName === 'login') {
            views.login.style.display = 'block';
            views.app.style.display = 'none'; // Ensure app is hidden
            return; 
        }

        // For all other views, show the main app container
        views.app.style.display = 'block';
        
        // And show the specific view inside it
        if (views[viewName]) {
            views[viewName].style.display = 'flex'; // Most views are flex containers
        }

        // Set visibility of other UI elements
        document.getElementById('back-btn').style.display = viewName !== 'timeline' ? 'block' : 'none';
        document.getElementById('search-form').style.display = 'none';
        document.getElementById('search-toggle-btn').style.display = 'block';
        document.getElementById('lemmy-filter-bar').style.display = 'none';
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
            switchView('profile');
            renderProfilePage(state, accountId, actions);
        },
        showLemmyProfile: (userAcct) => {
            switchView('profile');
            renderLemmyProfilePage(state, userAcct, actions);
        },
        showStatusDetail: (statusId) => {
            switchView('statusDetail');
            renderStatusDetail(state, statusId, actions);
        },
        showHashtagTimeline: (tagName) => {
            switchView('search');
            renderSearchResults(state, `#${tagName}`);
        },
        showConversations: () => {
            switchView('conversations');
            renderConversationsList(state, actions);
        },
        showConversationDetail: (conversationId, participants) => {
            switchView('conversations');
            renderConversationDetail(state, conversationId, participants);
        },
        showSettings: () => {
            switchView('settings');
            renderSettingsPage(state);
        },
        showLemmyDiscover: () => {
            switchView('lemmyDiscover');
            renderLemmyDiscoverPage(state, actions);
        },
        showLemmyCommunity: (communityAcct) => {
            switchView('lemmyCommunity');
            renderLemmyCommunityPage(state, communityAcct, actions);
        },
        showLemmyPostDetail: (post) => {
            switchView('lemmyPost');
            renderLemmyPostPage(state, post, actions);
        },
        showLemmyFeed: (feedType) => {
            switchView('timeline');
            document.getElementById('lemmy-filter-bar').style.display = 'flex';
            fetchLemmyFeed(state, feedType, 'New'); // Default to 'New' sort
        },
        showLemmySubscribedFeed: () => {
            switchView('subscribedFeed');
            renderSubscribedFeed(state, actions);
        },
        showUnifiedFeed: () => {
            switchView('unifiedFeed');
            renderUnifiedFeed(state, actions);
        },
        handleSearchResultClick: (account) => {
            if (account.acct.includes('@')) {
                actions.showProfile(account.id);
            } else {
                actions.showLemmyCommunity(account.acct);
            }
        },
        toggleAction: async (action, status, button) => {
            const isToggled = button.classList.contains('active');
            const newAction = isToggled ? action.replace('reblog', 'unreblog').replace('favorite', 'unfavorite').replace('bookmark', 'unbookmark') : action;
            try {
                await apiFetch(state.instanceUrl, state.accessToken, `/api/v1/statuses/${status.id}/${newAction}`, { method: 'POST' });
                button.classList.toggle('active');
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
        },
        lemmyPostComment: async (commentData) => {
            const lemmyInstance = localStorage.getItem('lemmy_instance');
            const jwt = localStorage.getItem('lemmy_jwt');
            if (!jwt || !lemmyInstance) {
                showToast('You must be logged in to comment.');
                throw new Error('Not logged in');
            }
            const response = await apiFetch(lemmyInstance, jwt, '/api/v3/comment', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(commentData)
            });
            return response.data.comment_view;
        }
    };

    state.actions = actions;

    const onLoginSuccess = (instanceUrl, accessToken) => {
        state.instanceUrl = instanceUrl;
        state.accessToken = accessToken;
        apiFetch(instanceUrl, accessToken, '/api/v1/accounts/verify_credentials')
            .then(response => {
                if(!response || !response.data || !response.data.id) {
                    showLogin();
                    showToast('Login failed: Invalid credentials response.');
                    return;
                }
                state.currentUser = response.data;
                document.getElementById('user-display-btn').textContent = state.currentUser.display_name;
                document.querySelector('.top-nav').style.display = 'flex';
                switchView('timeline');
                fetchTimeline(state, 'home');
            })
            .catch(err => {
                console.error("Login API call failed:", err);
                showLogin();
                showToast('Login failed. Please check your instance URL and access token.');
            });
    };

    initLogin(onLoginSuccess);
    initComposeModal(state, () => {
        fetchTimeline(state, state.currentTimeline);
        showToast('Post created successfully!');
    });

    document.querySelectorAll('.dropdown').forEach(dropdown => {
        const button = dropdown.querySelector('button');
        button.addEventListener('click', (e) => {
            e.stopPropagation();
            document.querySelectorAll('.dropdown.active').forEach(d => {
                if (d !== dropdown) d.classList.remove('active');
            });
            dropdown.classList.toggle('active');
        });
    });

    window.addEventListener('click', () => {
        document.querySelectorAll('.dropdown.active').forEach(d => {
            d.classList.remove('active');
        });
    });
    
    document.getElementById('feeds-dropdown').addEventListener('click', (e) => {
        const target = e.target;
        if (target.dataset.timeline) {
            e.preventDefault();
            switchView('timeline');
            fetchTimeline(state, target.dataset.timeline);
            document.getElementById('feeds-dropdown').classList.remove('active');
        } else if (target.dataset.lemmyFeed) {
             e.preventDefault();
            actions.showLemmyFeed(target.dataset.lemmyFeed);
            document.getElementById('feeds-dropdown').classList.remove('active');
        }
    });

    document.getElementById('refresh-btn').addEventListener('click', () => fetchTimeline(state, state.currentTimeline));
    document.getElementById('back-btn').addEventListener('click', () => {
        switchView('timeline');
        fetchTimeline(state, state.currentTimeline);
    });
    
    document.getElementById('discover-lemmy-link').addEventListener('click', (e) => {
        e.preventDefault();
        actions.showLemmyDiscover();
        document.getElementById('feeds-dropdown').classList.remove('active');
    });

    document.getElementById('lemmy-subscribed-link')?.addEventListener('click', (e) => {
        e.preventDefault();
        actions.showLemmySubscribedFeed();
        document.getElementById('feeds-dropdown').classList.remove('active');
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
            switchView('search');
            renderSearchResults(state, query);
        }
    });

    document.getElementById('search-input').addEventListener('input', (e) => {
        renderHashtagSuggestions(state, e.target.value);
    });

    document.getElementById('new-post-link').addEventListener('click', (e) => {
        e.preventDefault();
        showComposeModal(state);
        document.getElementById('user-dropdown').classList.remove('active');
    });

    document.getElementById('profile-link').addEventListener('click', (e) => {
        e.preventDefault();
        // For now, this will show the user's own Mastodon profile.
        // A unified profile could be a future enhancement.
        actions.showProfile(state.currentUser.id);
        document.getElementById('user-dropdown').classList.remove('active');
    });

    document.getElementById('settings-link').addEventListener('click', (e) => {
        e.preventDefault();
        actions.showSettings();
        document.getElementById('user-dropdown').classList.remove('active');
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
        document.getElementById('user-dropdown').classList.remove('active');
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
