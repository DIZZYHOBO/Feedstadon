// components/store.js - Complete reactive store implementation

let store = null;

// Initialize store when Alpine is ready
function initializeStore() {
    if (typeof Alpine !== 'undefined' && Alpine.reactive) {
        store = Alpine.reactive({
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
                hasMore: true,
                lastRefresh: null
            },
            
            // Data
            posts: [],
            notifications: [],
            profiles: new Map(),
            comments: new Map(),
            communities: new Map(),
            
            // Settings
            settings: {
                theme: localStorage.getItem('feedstodon-theme') || 'feedstodon',
                defaultStartPage: localStorage.getItem('defaultStartPage') || 'lemmy',
                defaultFeedType: localStorage.getItem('defaultFeedType') || 'Subscribed',
                wordFilter: JSON.parse(localStorage.getItem('wordFilter') || '[]'),
                hideNsfw: localStorage.getItem('hideNsfw') === 'true',
                autoRefresh: false,
                refreshInterval: 300000 // 5 minutes
            },

            // Pagination state
            pagination: {
                lemmyPage: 1,
                mastodonMaxId: null,
                hasMoreLemmy: true,
                hasMoreMastodon: true
            }
        });

        // Auto-persist changes to localStorage
        setupPersistence();
        
        // Make globally available
        window.$store = store;
        
        console.log('Store initialized and made reactive:', store);
        return store;
    } else {
        console.warn('Alpine.js not ready yet, retrying...');
        setTimeout(initializeStore, 100);
    }
}

// Setup automatic persistence of key data to localStorage
function setupPersistence() {
    if (!store || !Alpine.effect) return;

    // Persist auth changes
    Alpine.effect(() => {
        if (store.auth.mastodon.instanceUrl !== undefined) {
            localStorage.setItem('fediverse-instance', store.auth.mastodon.instanceUrl || '');
        }
    });

    Alpine.effect(() => {
        if (store.auth.mastodon.accessToken !== undefined) {
            localStorage.setItem('fediverse-token', store.auth.mastodon.accessToken || '');
        }
    });

    Alpine.effect(() => {
        if (store.auth.lemmy.instance !== undefined) {
            localStorage.setItem('lemmy_instance', store.auth.lemmy.instance || '');
        }
    });

    Alpine.effect(() => {
        if (store.auth.lemmy.username !== undefined) {
            localStorage.setItem('lemmy_username', store.auth.lemmy.username || '');
        }
    });

    Alpine.effect(() => {
        if (store.auth.lemmy.jwt !== undefined) {
            localStorage.setItem('lemmy_jwt', store.auth.lemmy.jwt || '');
        }
    });

    // Persist settings changes
    Alpine.effect(() => {
        if (store.settings.theme !== undefined) {
            localStorage.setItem('feedstodon-theme', store.settings.theme);
            document.body.dataset.theme = store.settings.theme;
        }
    });

    Alpine.effect(() => {
        if (store.settings.defaultStartPage !== undefined) {
            localStorage.setItem('defaultStartPage', store.settings.defaultStartPage);
        }
    });

    Alpine.effect(() => {
        if (store.settings.defaultFeedType !== undefined) {
            localStorage.setItem('defaultFeedType', store.settings.defaultFeedType);
        }
    });

    Alpine.effect(() => {
        if (store.ui.currentLemmySort !== undefined) {
            localStorage.setItem('lemmySortType', store.ui.currentLemmySort);
        }
    });

    Alpine.effect(() => {
        if (store.settings.wordFilter !== undefined) {
            localStorage.setItem('wordFilter', JSON.stringify(store.settings.wordFilter));
        }
    });

    Alpine.effect(() => {
        if (store.settings.hideNsfw !== undefined) {
            localStorage.setItem('hideNsfw', store.settings.hideNsfw.toString());
        }
    });
}

// Store helper functions
const storeHelpers = {
    // Auth helpers
    isLoggedInToMastodon() {
        return !!(store?.auth.mastodon.instanceUrl && store?.auth.mastodon.accessToken);
    },

    isLoggedInToLemmy() {
        return !!(store?.auth.lemmy.instance && store?.auth.lemmy.jwt);
    },

    isLoggedInToAny() {
        return this.isLoggedInToMastodon() || this.isLoggedInToLemmy();
    },

    getCurrentUser() {
        if (this.isLoggedInToMastodon()) {
            return { platform: 'mastodon', user: store.auth.mastodon.currentUser };
        }
        if (this.isLoggedInToLemmy()) {
            return { platform: 'lemmy', username: store.auth.lemmy.username };
        }
        return null;
    },

    // Post helpers
    findPost(platform, id) {
        return store?.posts.find(post => {
            if (platform === 'lemmy') {
                return post.platform === 'lemmy' && post.post.id === id;
            } else {
                return post.platform === 'mastodon' && post.id === id;
            }
        });
    },

    updatePost(platform, id, updates) {
        const post = this.findPost(platform, id);
        if (post) {
            Object.assign(post, updates);
        }
    },

    addPost(post, prepend = false) {
        if (prepend) {
            store?.posts.unshift(post);
        } else {
            store?.posts.push(post);
        }
    },

    removePost(platform, id) {
        if (!store?.posts) return;
        const index = store.posts.findIndex(post => {
            if (platform === 'lemmy') {
                return post.platform === 'lemmy' && post.post.id === id;
            } else {
                return post.platform === 'mastodon' && post.id === id;
            }
        });
        if (index !== -1) {
            store.posts.splice(index, 1);
        }
    },

    clearPosts() {
        if (store?.posts) {
            store.posts.length = 0;
        }
    },

    // Notification helpers
    addNotification(notification) {
        store?.notifications.unshift(notification);
    },

    markNotificationAsRead(id) {
        const notification = store?.notifications.find(n => n.id === id);
        if (notification) {
            notification.read = true;
        }
    },

    getUnreadNotificationCount() {
        return store?.notifications.filter(n => !n.read).length || 0;
    },

    // UI helpers
    setLoading(loading) {
        if (store?.ui) {
            store.ui.isLoading = loading;
        }
    },

    setLoadingMore(loading) {
        if (store?.ui) {
            store.ui.loadingMore = loading;
        }
    },

    setView(view) {
        if (store?.ui) {
            store.ui.currentView = view;
        }
    },

    // Theme helpers
    setTheme(theme) {
        if (store?.settings) {
            store.settings.theme = theme;
        }
    },

    getTheme() {
        return store?.settings.theme || 'feedstodon';
    },

    // Word filter helpers
    addWordFilter(word) {
        if (store?.settings.wordFilter && !store.settings.wordFilter.includes(word)) {
            store.settings.wordFilter.push(word.toLowerCase());
        }
    },

    removeWordFilter(word) {
        if (store?.settings.wordFilter) {
            const index = store.settings.wordFilter.indexOf(word.toLowerCase());
            if (index !== -1) {
                store.settings.wordFilter.splice(index, 1);
            }
        }
    },

    shouldFilterPost(content) {
        if (!store?.settings.wordFilter || !content) return false;
        const lowerContent = content.toLowerCase();
        return store.settings.wordFilter.some(word => lowerContent.includes(word));
    }
};

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeStore);
} else {
    initializeStore();
}

// Also try to initialize when Alpine starts
document.addEventListener('alpine:init', initializeStore);

// Export store and helpers
export { store, storeHelpers };
export default store;
