import { fetchTimeline, renderLoginPrompt } from './components/Timeline.js';
import { renderProfilePage, renderLemmyProfilePage } from './components/Profile.js';
import { renderSearchResults, renderHashtagSuggestions } from './components/Search.js';
import { renderSettingsPage } from './components/Settings.js';
import { renderStatusDetail } from './components/Post.js';
import { initComposeModal, showComposeModal, showComposeModalWithReply } from './components/Compose.js';
import { fetchLemmyFeed, renderLemmyCard } from './components/Lemmy.js';
import { renderLemmyPostPage } from './components/LemmyPost.js';
import { ICONS } from './components/icons.js';
import { apiFetch } from './components/api.js';
import { renderNotificationsPage } from './components/Notifications.js';

function initDropdowns() {
    document.querySelectorAll('.dropdown').forEach(dropdown => {
        const button = dropdown.querySelector('button');
        if (button) {
            button.addEventListener('click', (e) => {
                e.stopPropagation();
                document.querySelectorAll('.dropdown.active').forEach(d => {
                    if (d !== dropdown) d.classList.remove('active');
                });
                dropdown.classList.toggle('active');
            });
        }
    });

    window.addEventListener('click', () => {
        document.querySelectorAll('.dropdown.active').forEach(d => {
            d.classList.remove('active');
        });
    });
}


document.addEventListener('DOMContentLoaded', () => {
    const state = {
        history: [],
        instanceUrl: localStorage.getItem('fediverse-instance') || null,
        accessToken: localStorage.getItem('fediverse-token') || null,
        currentUser: null,
        currentView: null,
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
        app: document.getElementById('app-view'),
        timeline: document.getElementById('timeline'),
        notifications: document.getElementById('notifications-view'),
        profile: document.getElementById('profile-page-view'),
        search: document.getElementById('search-results-view'),
        settings: document.getElementById('settings-view'),
        statusDetail: document.getElementById('status-detail-view'),
        lemmyPost: document.getElementById('lemmy-post-view'),
    };

    const switchView = (viewName, pushToHistory = true) => {
        if (state.currentView === viewName) return;

        if (pushToHistory) {
            history.pushState({view: viewName}, '', `#${viewName}`);
        }
        state.currentView = viewName;

        Object.keys(views).forEach(key => {
            if (views[key] && views[key].style) {
                views[key].style.display = 'none';
            }
        });
        
        document.querySelector('.top-nav').style.display = 'flex';
        views.app.style.display = 'block';
        if (views[viewName]) {
            views[viewName].style.display = 'flex';
        }
    };

    const showToast = (message) => {
        const toast = document.getElementById('toast-notification');
        toast.textContent = message;
        toast.classList.add('visible');
        setTimeout(() => {
            toast.classList.remove('visible');
        }, 3000);
    };
    
    const renderTimelineSubNav = (platform) => {
        const subNavContainer = document.getElementById('timeline-sub-nav');
        subNavContainer.innerHTML = '';
        if (!platform) {
            subNavContainer.style.display = 'none';
            return;
        }

        let items = [];
        let currentFeed = '';
        const tabs = document.createElement('div');
        tabs.className = 'timeline-sub-nav-tabs';

        if (platform === 'lemmy') {
            items = [
                { label: 'Subbed', feed: 'Subscribed' },
                { label: 'Local', feed: 'Local' },
                { label: 'All', feed: 'All' }
            ];
            currentFeed = state.currentLemmyFeed;
        } else if (platform === 'mastodon') {
             items = [
                { label: 'Subbed', feed: 'home' },
                { label: 'Local', feed: 'public?local=true' },
                { label: 'All', feed: 'public' }
            ];
            currentFeed = state.currentTimeline;
        }

        items.forEach(item => {
            const button = document.createElement('button');
            button.className = 'timeline-sub-nav-btn';
            button.textContent = item.label;
            if (item.feed === currentFeed) {
                button.classList.add('active');
            }
            button.addEventListener('click', () => {
                if (platform === 'lemmy') {
                    actions.showLemmyFeed(item.feed);
                } else {
                    actions.showMastodonTimeline(item.feed);
                }
            });
            tabs.appendChild(button);
        });
        
        subNavContainer.appendChild(tabs);

        if (platform === 'lemmy') {
            const filterContainer = document.createElement('div');
            filterContainer.id = 'lemmy-filter-container';
            filterContainer.innerHTML = `
                 <select id="lemmy-sort-select">
                    <option value="New">New</option>
                    <option value="Active">Active</option>
                    <option value="Hot">Hot</option>
                    <option value="TopHour">Top Hour</option>
                    <option value="TopSixHour">Top Six Hour</option>
                    <option value="TopTwelveHour">Top Twelve Hour</option>
                    <option value="TopDay">Top Day</option>
                </select>
            `;
            filterContainer.querySelector('#lemmy-sort-select').value = state.currentLemmySort;
            filterContainer.querySelector('#lemmy-sort-select').addEventListener('change', (e) => {
                actions.showLemmyFeed(state.currentLemmyFeed, e.target.value);
            });
            subNavContainer.appendChild(filterContainer);
        }
        
        subNavContainer.style.display = 'flex';
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
        showSettings: () => {
            switchView('settings');
            renderSettingsPage(state);
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
            renderTimelineSubNav('lemmy');
            fetchLemmyFeed(state, actions, false, onLemmyLoginSuccess);
        },
        showMastodonTimeline: (timelineType) => {
            state.currentLemmyFeed = null;
            state.currentTimeline = timelineType;
            switchView('timeline');
            renderTimelineSubNav('mastodon');
            fetchTimeline(state, actions, false, onMastodonLoginSuccess);
        },
         showHomeTimeline: () => {
            state.currentLemmyFeed = null;
            state.currentTimeline = 'home';
            switchView('timeline');
            renderTimelineSubNav(null); // Hide sub-nav
            fetchTimeline(state, actions, false, onMastodonLoginSuccess);
        },
        showNotificationsPage: () => {
            renderTimelineSubNav(null); // Hide timeline sub-nav
            switchView('notifications');
            renderNotificationsPage(state, actions);
        },
        replyToStatus: (post) => {
            showComposeModalWithReply(state, post);
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

    const onMastodonLoginSuccess = async (instanceUrl, accessToken) => {
        const success = await apiFetch(instanceUrl, accessToken, '/api/v1/accounts/verify_credentials')
            .then(response => {
                if (!response || !response.data || !response.data.id) {
                    showToast('Mastodon login failed.'); return false;
                }
                state.instanceUrl = instanceUrl;
                state.accessToken = accessToken;
                state.currentUser = response.data;
                localStorage.setItem('fediverse-instance', instanceUrl);
                localStorage.setItem('fediverse-token', accessToken);
                document.getElementById('user-display-btn').textContent = state.currentUser.display_name;
                showToast('Mastodon login successful!');
                actions.showMastodonTimeline('home');
                return true;
            })
            .catch(() => {
                showToast('Mastodon login failed.');
                return false;
            });
        return success;
    };

    const onLemmyLoginSuccess = (instance, username, password) => {
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
                actions.showLemmyFeed('Subscribed');
            } else {
                alert('Lemmy login failed.');
            }
        })
        .catch(err => {
             alert('Lemmy login error.');
        });
    };
    
    initDropdowns();
    document.getElementById('notifications-btn').innerHTML = ICONS.notifications;
    document.getElementById('notifications-btn').addEventListener('click', actions.showNotificationsPage);
    initComposeModal(state, () => actions.showHomeTimeline());
    
    const initialView = location.hash.substring(1) || 'timeline';
    switchView(initialView, false);
    
    if (initialView === 'timeline') {
        if (state.accessToken) { // Corrected check for Mastodon login
            actions.showHomeTimeline();
        } else if (localStorage.getItem('lemmy_jwt')) {
            actions.showLemmyFeed('Subscribed');
        } else {
            actions.showHomeTimeline(); 
        }
    }

    document.getElementById('feeds-dropdown').querySelector('.dropdown-content').addEventListener('click', (e) => {
        e.preventDefault();
        const target = e.target.closest('a');
        if (!target) return;

        if (target.id === 'lemmy-main-link') {
            actions.showLemmyFeed('Subscribed');
        } else if (target.id === 'mastodon-main-link') {
            actions.showMastodonTimeline('home');
        } else if (target.dataset.timeline === 'home') {
            actions.showHomeTimeline();
        }
        document.getElementById('feeds-dropdown').classList.remove('active');
    });

    document.getElementById('user-dropdown').querySelector('.dropdown-content').addEventListener('click', (e) => {
        e.preventDefault();
        const target = e.target.closest('a');
        if (!target) return;
        
        switch (target.id) {
            case 'new-post-link':
                showComposeModal(state);
                break;
            case 'profile-link':
                if (state.currentUser) {
                    actions.showProfile(state.currentUser.id);
                } else if (localStorage.getItem('lemmy_username')) {
                    const lemmyUser = `${localStorage.getItem('lemmy_username')}@${localStorage.getItem('lemmy_instance')}`;
                    actions.showLemmyProfile(lemmyUser, true);
                }
                break;
            case 'settings-link':
                actions.showSettings();
                break;
        }
        document.getElementById('user-dropdown').classList.remove('active');
    });

    window.addEventListener('scroll', () => {
        if (state.isLoadingMore) return;

        if (window.innerHeight + window.scrollY >= document.body.offsetHeight - 500) {
            if (state.currentView === 'timeline' && state.currentLemmyFeed && state.lemmyHasMore) {
                fetchLemmyFeed(state, actions, true);
            } else if (state.currentView === 'timeline' && state.currentTimeline && state.nextPageUrl) {
                fetchTimeline(state, state.currentTimeline, true);
            }
        }
    });

    window.addEventListener('popstate', (event) => {
        if (event.state && event.state.view) {
            switchView(event.state.view, false);
        } else {
            switchView('timeline', false);
        }
    });

    history.replaceState({view: state.currentView}, '', `#${state.currentView}`);
});
