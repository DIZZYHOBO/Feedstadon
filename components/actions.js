// components/actions.js - Complete actions implementation

// Toast utility
function showToast(message) {
    window.dispatchEvent(new CustomEvent('toast', { detail: message }));
}

// Create actions object
window.actions = {
    // Authentication
    async loginMastodon(instanceUrl, accessToken) {
        try {
            const response = await fetch(`https://${instanceUrl}/api/v1/accounts/verify_credentials`, {
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const user = await response.json();
            
            // Update store
            const store = Alpine.store('app');
            store.auth.mastodon.instanceUrl = instanceUrl;
            store.auth.mastodon.accessToken = accessToken;
            store.auth.mastodon.currentUser = user;
            
            showToast('Mastodon login successful!');
            return true;
        } catch (error) {
            console.error('Mastodon login failed:', error);
            showToast(`Mastodon login failed: ${error.message}`);
            return false;
        }
    },

    async loginLemmy(instance, username, password) {
        try {
            const response = await fetch(`https://${instance}/api/v3/user/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    username_or_email: username,
                    password: password
                })
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();
            
            if (data.jwt) {
                // Update store
                const store = Alpine.store('app');
                store.auth.lemmy.instance = instance;
                store.auth.lemmy.username = username;
                store.auth.lemmy.jwt = data.jwt;
                
                showToast('Lemmy login successful!');
                return true;
            } else {
                throw new Error('No JWT token received');
            }
        } catch (error) {
            console.error('Lemmy login failed:', error);
            showToast(`Lemmy login failed: ${error.message}`);
            return false;
        }
    },

    logoutMastodon() {
        const store = Alpine.store('app');
        store.auth.mastodon.instanceUrl = '';
        store.auth.mastodon.accessToken = '';
        store.auth.mastodon.currentUser = null;
        showToast('Logged out of Mastodon');
    },

    logoutLemmy() {
        const store = Alpine.store('app');
        store.auth.lemmy.instance = '';
        store.auth.lemmy.username = '';
        store.auth.lemmy.jwt = '';
        showToast('Logged out of Lemmy');
    },

    // Feed loading
    async loadLemmyFeed(feedType = 'Subscribed', sortType = 'Hot', loadMore = false) {
        const store = Alpine.store('app');
        
        if (!store.auth.lemmy.jwt) {
            console.log('No Lemmy credentials');
            return;
        }

        if (!loadMore) {
            store.ui.isLoading = true;
            store.clearPosts();
            store.ui.currentLemmyFeed = feedType;
            store.ui.currentLemmySort = sortType;
        } else {
            store.ui.loadingMore = true;
        }

        try {
            const page = loadMore ? Math.floor(store.posts.length / 20) + 1 : 1;
            const url = `https://${store.auth.lemmy.instance}/api/v3/post/list?sort=${sortType}&type_=${feedType}&limit=20&page=${page}`;
            
            const response = await fetch(url, {
                headers: {
                    'Authorization': `Bearer ${store.auth.lemmy.jwt}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();
            const
