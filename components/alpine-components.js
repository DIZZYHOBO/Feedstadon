// components/alpine-components.js - Complete Alpine component definitions
import { store, storeHelpers } from './store.js';
import { actions } from './actions.js';
import { ICONS } from './icons.js';
import { timeAgo, formatTimestamp, processSpoilers } from './utils.js';
import { showImageModal, showToast } from './ui.js';

// Initialize components when Alpine is ready
document.addEventListener('alpine:init', () => {
    console.log('Alpine initializing, registering components...');

    // Global App Data Component
    window.appData = function() {
        return {
            init() {
                console.log('App component initializing...');
                
                // Ensure store is available
                if (!window.$store && store) {
                    window.$store = store;
                }
                
                this.setupRouting();
                this.loadInitialContent();
            },

            setupRouting() {
                // Handle browser back/forward
                window.addEventListener('popstate', (event) => {
                    if (event.state && event.state.view) {
                        window.$store.ui.currentView = event.state.view;
                    } else {
                        window.$store.ui.currentView = 'timeline';
                    }
                });

                // Set initial view from URL hash
                const initialView = location.hash.substring(1) || 'timeline';
                window.$store.ui.currentView = initialView;
                history.replaceState({ view: initialView }, '', `#${initialView}`);
            },

            async loadInitialContent() {
                // Check for existing credentials and load appropriate content
                if (storeHelpers.isLoggedInToLemmy() && !window.$store.ui.currentTimeline) {
                    const defaultFeed = window.$store.settings.defaultFeedType;
                    const defaultSort = window.$store.ui.currentLemmySort;
                    window.$store.ui.currentLemmyFeed = defaultFeed;
                    await actions.loadLemmyFeed(defaultFeed, defaultSort);
                } else if (storeHelpers.isLoggedInToMastodon() && !window.$store.ui.currentLemmyFeed) {
                    window.$store.ui.currentTimeline = 'home';
                    await actions.loadTimeline('home');
                }
            }
        };
    };

    // Navigation Component
    window.navComponent = function() {
        return {
            refreshIcon: ICONS.refresh,
            notificationIcon: ICONS.notifications + '<div class="notification-dot"></div>',

            get hasUnreadNotifications() {
                return storeHelpers.getUnreadNotificationCount() > 0;
            },

            refresh() {
                if (window.$store.ui.currentLemmyFeed) {
                    actions.loadLemmyFeed(window.$store.ui.currentLemmyFeed, window.$store.ui.currentLemmySort);
                } else if (window.$store.ui.currentTimeline) {
                    actions.loadTimeline(window.$store.ui.currentTimeline);
                } else {
                    actions.loadMergedFeed();
                }
            },

            setFeed(feedType) {
                window.$store.ui.currentView = 'timeline';
                
                switch (feedType) {
                    case 'home':
                        if (storeHelpers.isLoggedInToLemmy()) {
                            window.$store.ui.currentLemmyFeed = 'Subscribed';
                            window.$store.ui.currentTimeline = null;
                            actions.loadLemmyFeed('Subscribed', window.$store.ui.currentLemmySort);
                        } else if (storeHelpers.isLoggedInToMastodon()) {
                            window.$store.ui.currentTimeline = 'home';
                            window.$store.ui.currentLemmyFeed = null;
                            actions.loadTimeline('home');
                        }
                        break;
                        
                    case 'merged':
                        window.$store.ui.currentTimeline = null;
                        window.$store.ui.currentLemmyFeed = null;
                        actions.loadMergedFeed();
                        break;
                        
                    case 'lemmy':
                        window.$store.ui.currentTimeline = null;
                        window.$store.ui.currentLemmyFeed = 'Subscribed';
                        actions.loadLemmyFeed('
