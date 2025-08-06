import { fetchTimeline, renderLoginPrompt } from './components/Timeline.js';
import { renderProfilePage } from './components/Profile.js';
import { renderSearchResults, renderHashtagSuggestions } from './components/Search.js';
import { renderSettingsPage } from './components/Settings.js';
import { renderStatusDetail } from './components/Post.js';
import { initComposeModal, showComposeModal, showComposeModalWithReply } from './components/Compose.js';
import { fetchLemmyFeed, renderLemmyCard } from './components/Lemmy.js';
import { renderLemmyPostPage } from './components/LemmyPost.js';
import { renderNotificationsPage, updateNotificationBell } from './components/Notifications.js';
import { ICONS } from './components/icons.js';
import { apiFetch } from './components/api.js';
import { showLoadingBar, hideLoadingBar } from './components/ui.js';

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

function initPullToRefresh(state, actions) {
    const ptrIndicator = document.getElementById('pull-to-refresh-indicator');
    let startY = 0;
    let isPulling = false;

    document.body.addEventListener('touchstart', (e) => {
        if (window.scrollY === 0) {
            startY = e.touches[0].pageY;
            isPulling = true;
        }
    });

    document.body.addEventListener('touchmove', (e) => {
        if (!isPulling) return;

        const currentY = e.touches[0].pageY;
        const diffY = currentY - startY;

        if (diffY > 0) {
            e.preventDefault();
            ptrIndicator.style.transform = `translateY(${Math.min(diffY, 100) - 50}px)`;
        }
    });

    document.body.addEventListener('touchend', (e) => {
        if (!isPulling) return;
        isPulling = false;
        
        const currentY = e.changedTouches[0].pageY;
        const diffY = currentY - startY;

        ptrIndicator.style.transform = 'translateY(-150%)';

        if (diffY > 80) { // Threshold to trigger refresh
            if (state.currentView === 'timeline') {
                if (state.currentTimeline) {
                    actions.showHomeTimeline();
                } else if (state.currentLemmyFeed) {
                    actions.showLemmyFeed(state.currentLemmyFeed);
                }
            } else if (state.currentView === 'notifications') {
                actions.showNotifications();
            }
        }
    });
}


document.addEventListener('DOMContentLoaded', async () => {
    // Apply saved theme on startup
    const savedTheme = localStorage.getItem('feedstodon-theme') || 'feedstodon';
    document.body.dataset.theme = savedTheme;

    // Setup UI Elements
    const notificationsBtn = document.getElementById('notifications-btn');
    notificationsBtn.innerHTML = ICONS.notifications + '<div class="notification-dot"></div>';


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
    
    async function verifyUserCredentials() {
        if (state.instanceUrl && state.accessToken) {
            try {
                const { data: account } = await apiFetch(state.instanceUrl, state.accessToken, '/api/v1/accounts/verify_credentials');
                state.currentUser = account;
                document.getElementById('user-display-btn').textContent = state.currentUser.display_name;
            } catch (error) {
                console.error("Token verification failed:", error);
                // Clear invalid token
                localStorage.removeItem('fediverse-instance');
                localStorage.removeItem('fediverse-token');
                state.instanceUrl = null;
                state.accessToken = null;
            }
        }
    }

    const switchView = (viewName, pushToHistory = true) => {
        if (state.currentView === viewName && viewName !== 'notifications') return;

        if (pushToHistory) {
            history.pushState({view: viewName}, '', `#${viewName}`);
        }
        state.currentView = viewName;
        window.scrollTo(0, 0);

        Object.keys(views).forEach(key => {
            if (views[key] && views[key].style) {
                views[key].style.display = 'none';
            }
        });
        
        // Hide sub-nav by default on every view change
        document.getElementById('timeline-sub-nav').style.display = 'none';
        
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
        showProfilePage: (platform, accountId = null, userAcct = null) => {
            showLoadingBar();
            switchView('profile');
            renderProfilePage(state, actions, platform, accountId, userAcct);
            hideLoadingBar();
        },
        showStatusDetail: async (statusId) => {
            showLoadingBar();
            switchView('statusDetail');
            await renderStatusDetail(state, statusId, actions);
            hideLoadingBar();
        },
        showHashtagTimeline: async (tagName) => {
            showLoadingBar();
            switchView('search');
            await renderSearchResults(state, `#${tagName}`);
            hideLoadingBar();
        },
        showSettings: () => {
            switchView('settings');
            renderSettingsPage(state);
        },
        showNotifications: async () => {
            showLoadingBar();
            switchView('notifications');
            await renderNotificationsPage(state, actions);
            hideLoadingBar();
        },
        showLemmyPostDetail: async (post) => {
            showLoadingBar();
            switchView('lemmyPost');
            await renderLemmyPostPage(state, post, actions);
            hideLoadingBar();
        },
         showLemmyFeed: async (feedType, sortType = 'New') => {
            showLoadingBar();
            state.currentLemmyFeed = feedType;
            state.currentTimeline = null;
            state.currentLemmySort = sortType;
            switchView('timeline');
            renderTimelineSubNav('lemmy');
            await fetchLemmyFeed(state, actions, false, onLemmyLoginSuccess);
            hideLoadingBar();
        },
        showMastodonTimeline: async (timelineType) => {
            showLoadingBar();
            state.currentLemmyFeed = null;
            state.currentTimeline = timelineType;
            switchView('timeline');
            renderTimelineSubNav('mastodon');
            await fetchTimeline(state, actions, false, onMastodonLoginSuccess);
            hideLoadingBar();
        },
         showHomeTimeline: async () => {
            showLoadingBar();
            state.currentLemmyFeed = null;
            state.currentTimeline = 'home';
            switchView('timeline');
            await fetchTimeline(state, actions, false, onMastodonLoginSuccess);
            hideLoadingBar();
        },
        replyToStatus: (post) => {
            showComposeModalWithReply(state, post);
        },
        handleSearchResultClick: (account) => {
            if (account.acct.includes('@')) {
                actions.showProfilePage('mastodon', account.id);
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
        try {
            const { data: account } = await apiFetch(instanceUrl, accessToken, '/api/v1/accounts/verify_credentials');
            if (!account || !account.id) {
                showToast('Mastodon login failed.'); return false;
            }
            state.instanceUrl = instanceUrl;
            state.accessToken = accessToken;
            state.currentUser = account;
            localStorage.setItem('fediverse-instance', instanceUrl);
            localStorage.setItem('fediverse-token', accessToken);
            document.getElementById('user-display-btn').textContent = state.currentUser.display_name;
            showToast('Mastodon login successful!');
            actions.showHomeTimeline();
            return true;
        } catch (error) {
            showToast('Mastodon login failed.');
            return false;
        }
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
                updateNotificationBell();
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
    initPullToRefresh(state, actions);
    initComposeModal(state, () => actions.showHomeTimeline());
    
    notificationsBtn.addEventListener('click', () => {
        actions.showNotifications();
    });

    // --- Initial Load ---
    await verifyUserCredentials();
    const initialView = location.hash.substring(1) || 'timeline';
    
    if (state.accessToken || localStorage.getItem('lemmy_jwt')) {
        updateNotificationBell();
    }
    
    if (initialView === 'timeline') {
        if (state.accessToken) { 
            actions.showHomeTimeline();
        } else if (localStorage.getItem('lemmy_jwt')) {
            actions.showLemmyFeed('Subscribed');
        } else {
            actions.showHomeTimeline(); 
        }
    } else {
        switchView(initialView, false);
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
                let defaultPlatform = null;
                if(state.currentUser) defaultPlatform = 'mastodon';
                else if(localStorage.getItem('lemmy_jwt')) defaultPlatform = 'lemmy';
                
                if(defaultPlatform) {
                    actions.showProfilePage(defaultPlatform);
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
