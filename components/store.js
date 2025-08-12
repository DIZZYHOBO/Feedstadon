// Create: components/store.js
import Alpine from 'alpinejs';

export const store = Alpine.reactive({
    // Authentication
    auth: {
        mastodon: {
            instanceUrl: localStorage.getItem('fediverse-instance'),
            accessToken: localStorage.getItem('fediverse-token'),
            currentUser: null
        },
        lemmy: {
            instance: localStorage.getItem('lemmy_instance'),
            username: localStorage.getItem('lemmy_username'),
            jwt: localStorage.getItem('lemmy_jwt')
        }
    },
    
    // UI State
    ui: {
        currentView: 'timeline',
        currentTimeline: 'home',
        currentLemmyFeed: 'Subscribed',
        isLoading: false,
        loadingMore: false
    },
    
    // Data
    posts: [],
    notifications: [],
    profiles: new Map(),
    
    // Settings
    settings: {
        theme: localStorage.getItem('feedstodon-theme') || 'feedstodon',
        defaultStartPage: localStorage.getItem('defaultStartPage') || 'lemmy',
        wordFilter: JSON.parse(localStorage.getItem('wordFilter') || '[]')
    }
});

// Auto-persist auth changes
Alpine.effect(() => {
    localStorage.setItem('fediverse-instance', store.auth.mastodon.instanceUrl || '');
    localStorage.setItem('fediverse-token', store.auth.mastodon.accessToken || '');
});

Alpine.effect(() => {
    localStorage.setItem('lemmy_instance', store.auth.lemmy.instance || '');
    localStorage.setItem('lemmy_jwt', store.auth.lemmy.jwt || '');
});
