// components/store.js - Reactive store using Alpine's reactive system

// Wait for Alpine to be available
let store;

// Initialize the store when Alpine is ready
document.addEventListener('alpine:init', () => {
    if (window.Alpine) {
        store = window.Alpine.reactive({
            // Authentication
            auth: {
                mastodon: {
                    instanceUrl: localStorage.getItem('fediverse-instance') || '',
                    accessToken: localStorage.getItem('fediverse-token') || '',
                    currentUser: null
                },
                lemmy: {
                    instance: localStorage.getItem('lemmy_instance') || '',
                    username: localStorage.getItem('lemmy_username') || '',
                    jwt: localStorage.getItem('lemmy_jwt') || ''
                }
            },
            
            // UI State
            ui: {
                currentView: 'timeline',
                currentTimeline: null, // 'home', 'public', etc.
                currentLemmyFeed: null, // 'Subscribed', 'All', 'Local'
                currentLemmySort: localStorage.getItem('lemmySortType') || 'Hot',
                isLoading: false,
                loadingMore: false,
                hasMore: true
            },
            
            // Data
            posts: [],
            notifications: [],
            profiles: new Map(),
            
            // Settings
            settings: {
                theme: localStorage.getItem('feedstodon-theme') || 'feedstodon',
                defaultStartPage: localStorage.getItem('defaultStartPage') || 'lemmy',
                defaultFeedType: localStorage.getItem('defaultFeedType') || 'Subscribed',
                wordFilter: JSON.parse(localStorage.getItem('wordFilter') || '[]'),
                hideNsfw: false
            }
        });

        // Auto-persist auth changes to localStorage
        window.Alpine.effect(() => {
            if (store.auth.mastodon.instanceUrl !== undefined) {
                localStorage.setItem('fediverse-instance', store.auth.mastodon.instanceUrl || '');
            }
        });

        window.Alpine.effect(() => {
            if (store.auth.mastodon.accessToken !== undefined) {
                localStorage.setItem('fediverse-token', store.auth.mastodon.accessToken || '');
            }
        });

        window.Alpine.effect(() => {
            if (store.auth.lemmy.instance !== undefined) {
                localStorage.setItem('lemmy_instance', store.auth.lemmy.instance || '');
            }
        });

        window.Alpine.effect(() => {
            if (store.auth.lemmy.username !== undefined) {
                localStorage.setItem('lemmy_username', store.auth.lemmy.username || '');
            }
        });

        window.Alpine.effect(() => {
            if (store.auth.lemmy.jwt !== undefined) {
                localStorage.setItem('lemmy_jwt', store.auth.lemmy.jwt || '');
            }
        });

        window.Alpine.effect(() => {
            if (store.settings.theme !== undefined) {
                localStorage.setItem('feedstodon-theme', store.settings.theme);
                document.body.dataset.theme = store.settings.theme;
            }
        });

        window.Alpine.effect(() => {
            if (store.ui.currentLemmySort !== undefined) {
                localStorage.setItem('lemmySortType', store.ui.currentLemmySort);
            }
        });

        // Make store globally available
        window.$store = store;
        
        console.log('Store initialized:', store);
    } else {
        console.error('Alpine.js not available - store initialization failed');
    }
});

// Export for module imports (will be undefined until Alpine initializes)
export { store };
