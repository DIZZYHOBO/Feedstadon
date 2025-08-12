// components/store.js - Complete reactive store with Alpine.js

// Create reactive store when Alpine is ready
document.addEventListener('alpine:init', () => {
    Alpine.store('app', {
        // Authentication state
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
        
        // UI state
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
        
        // Settings
        settings: {
            theme: localStorage.getItem('feedstodon-theme') || 'feedstodon',
            defaultStartPage: localStorage.getItem('defaultStartPage') || 'lemmy',
            defaultFeedType: localStorage.getItem('defaultFeedType') || 'Subscribed',
            wordFilter: JSON.parse(localStorage.getItem('wordFilter') || '[]'),
            hideNsfw: localStorage.getItem('hideNsfw') === 'true'
        },

        // Helper methods
        isLoggedInToMastodon() {
            return !!(this.auth.mastodon.instanceUrl && this.auth.mastodon.accessToken);
        },

        isLoggedInToLemmy() {
            return !!(this.auth.lemmy.instance && this.auth.lemmy.jwt);
        },

        isLoggedInToAny() {
            return this.isLoggedInToMastodon() || this.isLoggedInToLemmy();
        },

        findPost(platform, id) {
            return this.posts.find(post => {
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
                this.posts.unshift(post);
            } else {
                this.posts.push(post);
            }
        },

        removePost(platform, id) {
            const index = this.posts.findIndex(post => {
                if (platform === 'lemmy') {
                    return post.platform === 'lemmy' && post.post.id === id;
                } else {
                    return post.platform === 'mastodon' && post.id === id;
                }
            });
            if (index !== -1) {
                this.posts.splice(index, 1);
            }
        },

        clearPosts() {
            this.posts.length = 0;
        },

        setTheme(theme) {
            this.settings.theme = theme;
            document.body.dataset.theme = theme;
            localStorage.setItem('feedstodon-theme', theme);
        },

        // Persistence methods
        persistAuth() {
            localStorage.setItem('fediverse-instance', this.auth.mastodon.instanceUrl || '');
            localStorage.setItem('fediverse-token', this.auth.mastodon.accessToken || '');
            localStorage.setItem('lemmy_instance', this.auth.lemmy.instance || '');
            localStorage.setItem('lemmy_username', this.auth.lemmy.username || '');
            localStorage.setItem('lemmy_jwt', this.auth.lemmy.jwt || '');
        },

        persistSettings() {
            localStorage.setItem('defaultStartPage', this.settings.defaultStartPage);
            localStorage.setItem('defaultFeedType', this.settings.defaultFeedType);
            localStorage.setItem('lemmySortType', this.ui.currentLemmySort);
            localStorage.setItem('wordFilter', JSON.stringify(this.settings.wordFilter));
            localStorage.setItem('hideNsfw', this.settings.hideNsfw.toString());
        },

        // Initialize store
        init() {
            // Apply theme
            document.body.dataset.theme = this.settings.theme;
            
            // Set up automatic persistence
            this.setupPersistence();
            
            console.log('Store initialized:', this);
        },

        setupPersistence() {
            // Watch for auth changes
            Alpine.effect(() => {
                this.persistAuth();
            });

            // Watch for settings changes  
            Alpine.effect(() => {
                this.persistSettings();
            });
        }
    });

    // Make store globally available
    window.$store = Alpine.store('app');
    
    // Initialize the store
    Alpine.store('app').init();
});
