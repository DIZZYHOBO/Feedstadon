import { initLogin } from './components/Login.js';
import { fetchTimeline } from './components/Timeline.js';
import { renderProfilePage, renderLemmyProfilePage } from './components/Profile.js';
import { renderSearchResults, renderHashtagSuggestions } from './components/Search.js';
import { renderSettingsPage } from './components/Settings.js';
import { renderStatusDetail } from './components/Post.js';
import { renderConversationsList, renderConversationDetail } from './components/Conversations.js';
import { initComposeModal, showComposeModal } from './components/Compose.js';
import { renderLemmyDiscoverPage, renderLemmyCommunityPage, renderSubscribedFeed, renderUnifiedFeed, fetchLemmyFeed, renderLemmyCard } from './components/Lemmy.js';
import { renderLemmyPostPage } from './components/LemmyPost.js';
import { ICONS } from './components/icons.js';
import { apiFetch } from './components/api.js';

function initDropdowns() {
    document.querySelectorAll('.dropdown').forEach(dropdown => {
        const button = dropdown.querySelector('button');
        if (button) {
            button.addEventListener('click', (e) => {
                e.stopPropagation();
                // Close other open dropdowns
                document.querySelectorAll('.dropdown.active').forEach(d => {
                    if (d !== dropdown) d.classList.remove('active');
                });
                dropdown.classList.toggle('active');
            });
        }
    });

    // Global click to close dropdowns
    window.addEventListener('click', () => {
        document.querySelectorAll('.dropdown.active').forEach(d => {
            d.classList.remove('active');
        });
    });
}


document.addEventListener('DOMContentLoaded', () => {
    const state = {
        history: [],
        instanceUrl: null,
        accessToken: null,
        currentUser: null,
        currentView: 'login',
        currentTimeline: 'home',
        currentLemmyFeed: null,
        currentLemmySort: 'New',
        timelineDiv: document.getElementById('timeline'),
        scrollLoader: document.getElementById('scroll-loader'),
        isLoadingMore: false,
        nextPageUrl: null,
        lemmyPage: 1,
        lemmyHasMore: true,
        conversations: [],
        lemmyInstances: ['lemmy.world', 'lemmy.ml', 'sh.itjust.works', 'leminal.space'],
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
        lemmyPost: document.getElementById('lemmy-post-view'),
    };

    const switchView = (viewName, pushToHistory = true) => {
        if (pushToHistory && state.currentView !== viewName) {
            state.history.push(state.currentView);
        }
        state.currentView = viewName;

        Object.keys(views).forEach(key => {
            if (views[key] && views[key].style) {
                views[key].style.display = 'none';
            }
        });

        const lemmyFilter = document.getElementById('lemmy-filter-container');
        if (state.currentLemmyFeed) {
            lemmyFilter.style.display = 'block';
        } else {
            lemmyFilter.style.display = 'none';
        }

        if (viewName === 'login') {
            document.body.style.paddingTop = '0';
            document.querySelector('.top-nav').style.display = 'none';
            views.login.style.display = 'flex';
            views.app.style.display = 'none';
            refreshLoginView();
            return;
        }

        document.body.style.paddingTop = '50px';
        views.app.style.display = 'block';
        if (views[viewName]) {
            views[viewName].style.display = 'flex';
        }

        document.querySelector('.top-nav').style.display = 'flex';
        document.getElementById('back-btn').style.display = state.history.length > 0 ? 'block' : 'none';
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
        showLemmyProfile: (userAcct, isOwnProfile = false) => {
            switchView('profile');
            renderLemmyProfilePage(state, userAcct, actions, isOwnProfile);
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
         showLemmyFeed: (feedType, sortType = 'New') => {
            state.currentLemmyFeed = feedType;
            state.currentTimeline = null;
            state.currentLemmySort = sortType;
            switchView('timeline');
            document.getElementById('lemmy-sort-select').value = sortType;
            fetchLemmyFeed(state, actions);
        },
        showMastodonTimeline: (timelineType) => {
            state.currentLemmyFeed = null;
            state.currentTimeline = timelineType;
            switchView('timeline');
            fetchTimeline(state, timelineType);
        },
        showLemmySubscribedFeed: () => {
            actions.showLemmyFeed('Subscribed');
        },
        showUnifiedFeed: () => {
            state.currentTimeline = null;
            state.currentLemmyFeed = null;
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
        showEditModal: (post) => {},
        showDeleteModal: (postId) => {},
        lemmyVote: async (postId, score, card) => {
            try {
                const lemmyInstance = localStorage.getItem('lemmy_instance') || state.lemmyInstances[0];
                const response = await apiFetch(lemmyInstance, null, '/api/v3/post/like', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ post_id: postId, score: score })
                }, 'lemmy');
                const scoreSpan = card.querySelector('.lemmy-score');
                scoreSpan.textContent = response.data.post.counts.score;
            } catch (err) {
                showToast('Failed to vote on post.');
            }
        },
        lemmySave: async (postId, button) => {
            try {
                const lemmyInstance = localStorage.getItem('lemmy_instance') || state.lemmyInstances[0];
                const response = await apiFetch(lemmyInstance, null, '/api/v3/post/save', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ post_id: postId, save: !button.classList.contains('active') })
                }, 'lemmy');
                button.classList.toggle('active');
            } catch (err) {
                showToast('Failed to save post.');
            }
        },
        lemmyCommentVote: async (commentId, score, commentDiv) => {
            try {
                const lemmyInstance = localStorage.getItem('lemmy_instance') || state.lemmyInstances[0];
                const response = await apiFetch(lemmyInstance, null, '/api/v3/comment/like', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ comment_id: commentId, score: score })
                }, 'lemmy');
                const scoreSpan = commentDiv.querySelector('.lemmy-score');
                scoreSpan.textContent = response.data.comment.counts.score;
            } catch (err) {
                showToast('Failed to vote on comment.');
            }
        },
        lemmyPostComment: async (commentData) => {
            const lemmyInstance = localStorage.getItem('lemmy_instance');
            if (!lemmyInstance) {
                showToast('You must be logged in to comment.');
                throw new Error('Not logged in');
            }
            const response = await apiFetch(lemmyInstance, null, '/api/v3/comment', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(commentData)
            }, 'lemmy');
            return response.data;
        }
    };
    state.actions = actions;

    const onMastodonLoginSuccess = async (instanceUrl, accessToken, callback) => {
        const success = await apiFetch(instanceUrl, accessToken, '/api/v1/accounts/verify_credentials')
            .then(response => {
                if (!response || !response.data || !response.data.id) {
                    showToast('Mastodon login failed: Invalid credentials.');
                    return false;
                }
                state.instanceUrl = instanceUrl;
                state.accessToken = accessToken;
                state.currentUser = response.data;
                localStorage.setItem('fediverse-instance', instanceUrl);
                localStorage.setItem('fediverse-token', accessToken);
                document.getElementById('user-display-btn').textContent = state.currentUser.display_name;
                showToast('Mastodon login successful!');
                if (callback) callback();
                return true;
            })
            .catch(() => {
                showToast('Mastodon login failed.');
                return false;
            });
        return success;
    };

    const onLemmyLoginSuccess = (instance, username, password, callback) => {
        apiFetch(instance, null, '/api/v3/user/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username_or_email: username, password: password })
        }, 'none')
        .then(response => {
            if (response.data.jwt) {
                localStorage.setItem('lemmy_jwt', response.data.jwt);
                localStorage.setItem('lemmy_username', username);
                localStorage.setItem('lemmy_instance', instance);
                showToast('Lemmy login successful!');
                if (callback) callback();
            } else {
                alert('Lemmy login failed.');
            }
        })
        .catch(err => {
             alert('Lemmy login error.');
        });
    };

    const onEnterApp = async () => {
        const mastodonToken = localStorage.getItem('fediverse-token');
        const lemmyJwt = localStorage.getItem('lemmy_jwt');

        if (!mastodonToken && !lemmyJwt) {
            showToast("Please log in to at least one service.");
            return;
        }
        
        if (lemmyJwt) {
            actions.showLemmyFeed('All');
            return;
        }

        if (mastodonToken) {
            const loggedIn = await onMastodonLoginSuccess(localStorage.getItem('fediverse-instance'), mastodonToken);
            if (loggedIn) {
                actions.showMastodonTimeline('home');
            }
        }
    };

    const refreshLoginView = () => {
        const mastodonToken = localStorage.getItem('fediverse-token');
        const lemmyJwt = localStorage.getItem('lemmy_jwt');
        const mastodonSection = document.getElementById('mastodon-login-section');
        const lemmySection = document.getElementById('lemmy-login-section');
        const enterBtn = document.getElementById('enter-app-btn');

        mastodonSection.style.display = mastodonToken ? 'none' : 'flex';
        lemmySection.style.display = lemmyJwt ? 'none' : 'flex';
        enterBtn.style.display = (mastodonToken || lemmyJwt) ? 'block' : 'none';

        if (!mastodonToken && !lemmyJwt && state.currentView !== 'login') {
            switchView('login');
        }
    };

    initLogin(onMastodonLoginSuccess, onLemmyLoginSuccess, onEnterApp);
    initComposeModal(state, () => actions.showMastodonTimeline('home'));
    initDropdowns(); // Initialize dropdowns on first load

    const logoutModal = document.getElementById('logout-modal');
    document.getElementById('logout-link').addEventListener('click', (e) => {
        e.preventDefault();
        logoutModal.classList.add('visible');
        document.getElementById('user-dropdown').classList.remove('active');
    });

    document.getElementById('cancel-logout-btn').addEventListener('click', () => {
        logoutModal.classList.remove('visible');
    });

    document.getElementById('mastodon-logout-btn').addEventListener('click', () => {
        localStorage.removeItem('fediverse-instance');
        localStorage.removeItem('fediverse-token');
        state.instanceUrl = null;
        state.accessToken = null;
        state.currentUser = null;
        showToast("Logged out from Mastodon.");
        logoutModal.classList.remove('visible');
        refreshLoginView();
    });

    document.getElementById('lemmy-logout-btn').addEventListener('click', () => {
        localStorage.removeItem('lemmy_jwt');
        localStorage.removeItem('lemmy_username');
        localStorage.removeItem('lemmy_instance');
        showToast("Logged out from Lemmy.");
        logoutModal.classList.remove('visible');
        refreshLoginView();
    });

    document.getElementById('logout-all-btn').addEventListener('click', () => {
        localStorage.clear();
        window.location.reload();
    });
    
    document.getElementById('lemmy-sort-select').addEventListener('change', (e) => {
        actions.showLemmyFeed(state.currentLemmyFeed, e.target.value);
    });

    // Initial check on load
    if (localStorage.getItem('fediverse-token') || localStorage.getItem('lemmy_jwt')) {
        onEnterApp();
    } else {
        switchView('login');
    }
});
