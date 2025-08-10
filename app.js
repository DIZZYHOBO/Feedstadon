import { fetchTimeline } from './components/Timeline.js';
import { renderProfilePage, renderEditProfilePage, loadMoreLemmyProfile } from './components/Profile.js';
import { renderSearchResults, renderHashtagSuggestions } from './components/Search.js';
import { renderSettingsPage } from './components/Settings.js';
import { renderStatusDetail, renderStatus } from './components/Post.js';
import { initComposeModal, showComposeModal, showComposeModalWithReply } from './components/Compose.js';
import { fetchLemmyFeed, renderLemmyCard } from './components/Lemmy.js';
import { renderLemmyPostPage } from './components/LemmyPost.js';
import { renderLemmyCommunityPage } from './components/LemmyCommunity.js';
import { renderMergedPostPage } from './components/MergedPost.js';
import { renderNotificationsPage, updateNotificationBell } from './components/Notifications.js';
import { renderDiscoverPage, loadMoreLemmyCommunities, loadMoreMastodonTrendingPosts } from './components/Discover.js';
import { renderScreenshotPage } from './components/Screenshot.js';
import { ICONS } from './components/icons.js';
import { apiFetch } from './components/api.js';
import { showLoadingBar, hideLoadingBar, initImageModal, renderLoginPrompt } from './components/ui.js';

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
    const refreshBtn = document.getElementById('refresh-btn');
    refreshBtn.innerHTML = ICONS.refresh;
    const refreshSpinner = document.getElementById('refresh-spinner');
    refreshSpinner.innerHTML = ICONS.refresh;


    const state = {
        history: [],
        instanceUrl: localStorage.getItem('fediverse-instance') || null,
        accessToken: localStorage.getItem('fediverse-token') || null,
        currentUser: null,
        currentView: null,
        currentProfileTab: 'mastodon',
        currentTimeline: 'home',
        currentLemmyFeed: null,
        currentLemmySort: 'New',
        currentDiscoverTab: 'lemmy',
        timelineDiv: document.getElementById('timeline'),
        scrollLoader: document.getElementById('scroll-loader'),
        isLoadingMore: false,
        nextPageUrl: null,
        lemmyPage: 1,
        lemmyHasMore: true,
        lemmyProfilePage: 1,
        lemmyProfileHasMore: true,
        mastodonTrendingPage: 1,
        mastodonTrendingHasMore: true,
        conversations: [],
        lemmyInstances: ['lemmy.world', 'lemmy.ml', 'sh.itjust.works', 'leminal.space'],
        settings: {
            hideNsfw: JSON.parse(localStorage.getItem('settings-hideNsfw')) || false,
        },
        actions: {}
    };

    const views = {
        app: document.getElementById('app-view'),
        timeline: document.getElementById('timeline'),
        notifications: document.getElementById('notifications-view'),
        discover: document.getElementById('discover-view'),
        screenshot: document.getElementById('screenshot-view'),
        mergedPost: document.getElementById('merged-post-view'),
        profile: document.getElementById('profile-page-view'),
        editProfile: document.getElementById('edit-profile-view'),
        search: document.getElementById('search-results-view'),
        settings: document.getElementById('settings-view'),
        statusDetail: document.getElementById('status-detail-view'),
        lemmyPost: document.getElementById('lemmy-post-view'),
        lemmyCommunity: document.getElementById('lemmy-community-view'),
    };
    
    // ... (rest of the file is unchanged)
});
