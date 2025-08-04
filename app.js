import { initLogin } from './components/Login.js';
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
        nextPageUrl: null, // For Mastodon pagination
        lemmyPage: 1, // For Lemmy pagination
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

    const switchView = (viewName, pushToHistory = true) => {
        if(pushToHistory && state.currentView !== viewName) {
            state.history.push(state.currentView);
        }
        state.currentView = viewName;

        // Hide all views first
        Object.keys(views).forEach(key => {
            if (views[key] && views[key].style) {
                views[key].style.display = 'none';
            }
        });

        if (viewName === 'login') {
            document.body.style.paddingTop = '0';
            document.querySelector('.top-nav').style.display = 'none';
            views.login.style.display = 'flex';
            views.app.style.display = 'none'; 
            return; 
        }

        document.body.style.paddingTop = '50px';
        views.app.style.display = 'block';
        
        if (views[viewName]) {
            views[viewName].style.display = 'flex';
        }

        document.querySelector('.top-nav').style.display = 'flex';
        document.getElementById('back-btn').style.display = state.history.length > 0 ? 'block' : 'none';
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
            document.getElementById('lemmy-filter-bar').style.display = 'flex';
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
        showEditModal: (post) => {},
        showDeleteModal: (postId) => {},
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
            return response.data;
        }
    };

    state.actions = actions;

    const onMastodonLoginSuccess = (instanceUrl, accessToken, callback) => {
        apiFetch(instanceUrl, accessToken, '/api/v1/accounts/verify_credentials')
            .then(response => {
                if(!response || !response.data || !response.data.id) {
                    showToast('Mastodon login failed: Invalid credentials.');
                    return;
                }
                state.instanceUrl = instanceUrl;
                state.accessToken = accessToken;
                state.currentUser = response.data;
                localStorage.setItem('fediverse-instance', instanceUrl);
                localStorage.setItem('fediverse-token', accessToken);
                document.getElementById('user-display-btn').textContent = state.currentUser.display_name;
                showToast('Mastodon login successful!');
                if(callback) callback();
            })
            .catch(err => {
                showToast('Mastodon login failed.');
            });
    };

    const onLemmyLoginSuccess = (instance, username, password, callback) => {
        apiFetch(instance, null, '/api/v3/user/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username_or_email: username, password: password })
        })
        .then(response => {
            if (response.data.jwt) {
                localStorage.setItem('lemmy_jwt', response.data.jwt);
                localStorage.setItem('lemmy_username', username);
                localStorage.setItem('lemmy_instance', instance);
                showToast('Lemmy login successful!');
                if(callback) callback();
            } else {
                alert('Lemmy login failed.');
            }
        })
        .catch(err => {
             alert('Lemmy login error.');
        });
    };

    const onEnterApp = () => {
        const mastodonToken = localStorage.getItem('fediverse-token');
        if (mastodonToken) {
            onMastodonLoginSuccess(localStorage.getItem('fediverse-instance'), mastodonToken);
        }
        switchView('timeline');
        actions.showUnifiedFeed();
    };
    
    initLogin(onMastodonLoginSuccess, onLemmyLoginSuccess, onEnterApp);
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
            actions.showMastodonTimeline(target.dataset.timeline);
            document.getElementById('feeds-dropdown').classList.remove('active');
        } else if (target.dataset.lemmyFeed) {
             e.preventDefault();
            actions.showLemmyFeed(target.dataset.lemmyFeed);
            document.getElementById('feeds-dropdown').classList.remove('active');
        }
    });

    document.getElementById('refresh-btn').addEventListener('click', () => {
        if (state.currentView === 'timeline' && state.currentLemmyFeed) {
            actions.showLemmyFeed(state.currentLemmyFeed, state.currentLemmySort);
        } else if (state.currentView === 'timeline' && state.currentTimeline) {
            actions.showMastodonTimeline(state.currentTimeline);
        } else if(state.currentView === 'unifiedFeed') {
            actions.showUnifiedFeed();
        }
    });

    document.getElementById('back-btn').addEventListener('click', () => {
        const previousView = state.history.pop();
        if(previousView) {
            switchView(previousView, false);
        }
    });
    
    document.getElementById('discover-lemmy-link').addEventListener('click', (e) => {
        e.preventDefault();
        actions.showLemmyDiscover();
        document.getElementById('feeds-dropdown').classList.remove('active');
    });

    document.getElementById('lemmy-sort-select').addEventListener('change', (e) => {
        actions.showLemmyFeed(state.currentLemmyFeed, e.target.value);
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
        if (state.currentUser && localStorage.getItem('lemmy_jwt')) {
            const lemmyUser = `${localStorage.getItem('lemmy_username')}@${localStorage.getItem('lemmy_instance')}`;
            actions.showLemmyProfile(lemmyUser, true);
        } else if(state.currentUser) {
            actions.showProfile(state.currentUser.id);
        }
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
        window.location.reload();
    });

    document.getElementById('lemmy-logout-btn').addEventListener('click', (e) => {
        e.preventDefault();
        localStorage.removeItem('lemmy_jwt');
        localStorage.removeItem('lemmy_username');
        localStorage.removeItem('lemmy_instance');
        showToast("You've been logged out from Lemmy.");
        document.getElementById('user-dropdown').classList.remove('active');
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
        if (state.isLoadingMore) return;

        if (window.innerHeight + window.scrollY >= document.body.offsetHeight - 500) {
            if (state.currentView === 'timeline' && state.currentLemmyFeed) {
                state.lemmyPage++;
                fetchLemmyFeed(state, actions, true);
            } else if (state.currentView === 'timeline' && state.currentTimeline && state.nextPageUrl) {
                fetchTimeline(state, state.currentTimeline, true);
            }
        }
    });
});
