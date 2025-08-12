// app.js - Simplified main entry point
import { store } from './components/store.js';
import { actions } from './components/actions.js';
import './components/alpine-components.js';
import { initImageModal } from './components/ui.js';
import { ICONS } from './components/icons.js';

// Make store and actions globally available for Alpine components
window.$store = store;
window.actions = actions;

// Global app data function for Alpine
window.appData = function() {
    return {
        init() {
            // Initialize the app
            this.setupTheme();
            this.setupAuth();
            this.setupRouting();
            this.setupImageModal();
            this.loadInitialView();
        },

        setupTheme() {
            const savedTheme = localStorage.getItem('feedstodon-theme') || 'feedstodon';
            document.body.dataset.theme = savedTheme;
            store.settings.theme = savedTheme;
        },

        async setupAuth() {
            // Verify existing credentials
            if (store.auth.mastodon.instanceUrl && store.auth.mastodon.accessToken) {
                await actions.verifyMastodonCredentials();
            }
            
            if (store.auth.lemmy.jwt) {
                // Lemmy JWT is already in store, no need to verify
                console.log('Lemmy credentials found');
            }
        },

        setupRouting() {
            // Handle browser back/forward
            window.addEventListener('popstate', (event) => {
                const imageModal = document.getElementById('image-modal');
                if (imageModal && imageModal.classList.contains('visible')) {
                    imageModal.classList.remove('visible');
                    history.pushState({ view: store.ui.currentView }, '', `#${store.ui.currentView}`);
                } else if (event.state && event.state.view) {
                    store.ui.currentView = event.state.view;
                } else {
                    store.ui.currentView = 'timeline';
                }
            });

            // Set initial view from URL hash
            const initialView = location.hash.substring(1) || 'timeline';
            store.ui.currentView = initialView;
            history.replaceState({ view: initialView }, '', `#${initialView}`);
        },

        setupImageModal() {
            initImageModal();
        },

        loadInitialView() {
            // Load content based on current view
            if (store.ui.currentView === 'timeline') {
                // Timeline will auto-load via Alpine component
                const defaultStartPage = localStorage.getItem('defaultStartPage') || 'lemmy';
                const defaultFeedType = localStorage.getItem('defaultFeedType') || 'Subscribed';
                const defaultLemmySort = localStorage.getItem('lemmySortType') || 'Hot';

                if (defaultStartPage === 'lemmy') {
                    store.ui.currentLemmyFeed = defaultFeedType;
                    store.ui.currentLemmySort = defaultLemmySort;
                    store.ui.currentTimeline = null;
                } else {
                    let timeline = 'home';
                    if (defaultFeedType === 'All') timeline = 'public';
                    if (defaultFeedType === 'Local') timeline = 'public?local=true';
                    store.ui.currentTimeline = timeline;
                    store.ui.currentLemmyFeed = null;
                }
            }
        }
    };
};

// Global navigation component
window.navComponent = function() {
    return {
        refreshIcon: ICONS.refresh,
        notificationIcon: ICONS.notifications + '<div class="notification-dot"></div>',

        get hasUnreadNotifications() {
            return store.notifications.some(n => !n.read);
        },

        refresh() {
            if (store.ui.currentView === 'timeline') {
                if (store.ui.currentTimeline) {
                    actions.loadTimeline(store.ui.currentTimeline);
                } else if (store.ui.currentLemmyFeed) {
                    actions.loadLemmyFeed(store.ui.currentLemmyFeed, store.ui.currentLemmySort);
                } else {
                    actions.loadMergedFeed();
                }
            }
        },

        setFeed(feedType) {
            store.ui.currentView = 'timeline';
            
            switch (feedType) {
                case 'home':
                    const defaultStartPage = localStorage.getItem('defaultStartPage') || 'lemmy';
                    const defaultFeedType = localStorage.getItem('defaultFeedType') || 'Subscribed';
                    const defaultLemmySort = localStorage.getItem('lemmySortType') || 'Hot';

                    if (defaultStartPage === 'lemmy') {
                        store.ui.currentLemmyFeed = defaultFeedType;
                        store.ui.currentLemmySort = defaultLemmySort;
                        store.ui.currentTimeline = null;
                        actions.loadLemmyFeed(defaultFeedType, defaultLemmySort);
                    } else {
                        let timeline = 'home';
                        if (defaultFeedType === 'All') timeline = 'public';
                        if (defaultFeedType === 'Local') timeline = 'public?local=true';
                        store.ui.currentTimeline = timeline;
                        store.ui.currentLemmyFeed = null;
                        actions.loadTimeline(timeline);
                    }
                    break;
                    
                case 'merged':
                    store.ui.currentTimeline = null;
                    store.ui.currentLemmyFeed = null;
                    actions.loadMergedFeed();
                    break;
                    
                case 'lemmy':
                    store.ui.currentTimeline = null;
                    store.ui.currentLemmyFeed = 'Subscribed';
                    store.ui.currentLemmySort = 'Hot';
                    actions.loadLemmyFeed('Subscribed', 'Hot');
                    break;
                    
                case 'mastodon':
                    store.ui.currentTimeline = 'home';
                    store.ui.currentLemmyFeed = null;
                    actions.loadTimeline('home');
                    break;
            }
        },

        showComposeModal() {
            const modal = document.getElementById('compose-modal');
            modal.classList.add('visible');
        },

        showProfile() {
            if (store.auth.mastodon.currentUser) {
                actions.showProfilePage('mastodon', store.auth.mastodon.currentUser.id, store.auth.mastodon.currentUser.acct);
            } else if (store.auth.lemmy.jwt) {
                const lemmyUsername = store.auth.lemmy.username;
                const lemmyInstance = store.auth.lemmy.instance;
                if (lemmyUsername && lemmyInstance) {
                    const userAcct = `${lemmyUsername}@${lemmyInstance}`;
                    actions.showLemmyProfile(userAcct);
                } else {
                    this.showToast("Could not determine Lemmy user profile.");
                }
            } else {
                this.showToast("Please log in to view your profile.");
            }
        },

        showHelp() {
            document.getElementById('help-modal').classList.add('visible');
        },

        showToast(message) {
            const toast = document.getElementById('toast-notification');
            toast.textContent = message;
            toast.classList.add('visible');
            setTimeout(() => {
                toast.classList.remove('visible');
            }, 3000);
        }
    };
};

// Global timeline sub-nav component
window.timelineSubNavComponent = function() {
    return {
        setLemmyFeed(feedType, sortType = store.ui.currentLemmySort) {
            store.ui.currentLemmyFeed = feedType;
            store.ui.currentLemmySort = sortType;
            actions.loadLemmyFeed(feedType, sortType);
        },

        setMastodonTimeline(timelineType) {
            store.ui.currentTimeline = timelineType;
            actions.loadTimeline(timelineType);
        }
    };
};

// Keep some essential legacy functionality for modals and other components
document.addEventListener('DOMContentLoaded', () => {
    // Setup existing modal close handlers
    document.getElementById('close-help-btn')?.addEventListener('click', () => {
        document.getElementById('help-modal').classList.remove('visible');
    });

    // Setup compose modal functionality (keep existing logic)
    const modal = document.getElementById('compose-modal');
    const cancelBtn = document.getElementById('cancel-compose-btn');
    const cancelLemmyBtn = document.getElementById('cancel-lemmy-compose-btn');
    
    cancelBtn?.addEventListener('click', () => modal.classList.remove('visible'));
    cancelLemmyBtn?.addEventListener('click', () => modal.classList.remove('visible'));

    // Setup tab switching in compose modal
    const mastodonTabBtn = document.querySelector('[data-tab="mastodon-compose"]');
    const lemmyTabBtn = document.querySelector('[data-tab="lemmy-compose"]');
    const mastodonTab = document.getElementById('mastodon-compose-tab');
    const lemmyTab = document.getElementById('lemmy-compose-tab');
    
    mastodonTabBtn?.addEventListener('click', () => {
        mastodonTabBtn.classList.add('active');
        lemmyTabBtn.classList.remove('active');
        mastodonTab.classList.add('active');
        lemmyTab.classList.remove('active');
    });

    lemmyTabBtn?.addEventListener('click', () => {
        lemmyTabBtn.classList.add('active');
        mastodonTabBtn.classList.remove('active');
        lemmyTab.classList.add('active');
        mastodonTab.classList.remove('active');
    });

    // Keep other essential DOM event handlers that don't need Alpine conversion yet
    window.addEventListener('scroll', () => {
        // This will be handled by Alpine x-intersect in the timeline component
    });
});
