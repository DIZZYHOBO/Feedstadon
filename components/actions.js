// components/actions.js - Centralized actions
import { apiFetch } from './api.js';
import { showToast } from './ui.js';
import { store } from './store.js';

// Create actions object
const actions = {
    // Auth Actions
    async verifyMastodonCredentials() {
        if (!window.$store.auth.mastodon.instanceUrl || !window.$store.auth.mastodon.accessToken) {
            return false;
        }

        try {
            const { data: user } = await apiFetch(
                window.$store.auth.mastodon.instanceUrl, 
                window.$store.auth.mastodon.accessToken, 
                '/api/v1/accounts/verify_credentials'
            );
            window.$store.auth.mastodon.currentUser = user;
            console.log('Mastodon credentials verified:', user.display_name);
            return true;
        } catch (error) {
            console.error('Mastodon credential verification failed:', error);
            // Clear invalid credentials
            window.$store.auth.mastodon.instanceUrl = '';
            window.$store.auth.mastodon.accessToken = '';
            window.$store.auth.mastodon.currentUser = null;
            return false;
        }
    },

    async loginMastodon(instanceUrl, accessToken) {
        try {
            const { data: user } = await apiFetch(instanceUrl, accessToken, '/api/v1/accounts/verify_credentials');
            window.$store.auth.mastodon.instanceUrl = instanceUrl;
            window.$store.auth.mastodon.accessToken = accessToken;
            window.$store.auth.mastodon.currentUser = user;
            showToast('Mastodon login successful!');
            return true;
        } catch (error) {
            console.error('Mastodon login failed:', error);
            showToast('Mastodon login failed');
            return false;
        }
    },

    async loginLemmy(instance, username, password) {
        try {
            const { data } = await apiFetch(instance, null, '/api/v3/user/login', {
                method: 'POST',
                body: { username_or_email: username, password }
            }, 'lemmy');
            
            if (data.jwt) {
                window.$store.auth.lemmy.instance = instance;
                window.$store.auth.lemmy.username = username;
                window.$store.auth.lemmy.jwt = data.jwt;
                showToast('Lemmy login successful!');
                return true;
            } else {
                showToast('Lemmy login failed - no token received');
                return false;
            }
        } catch (error) {
            console.error('Lemmy login failed:', error);
            showToast('Lemmy login failed');
            return false;
        }
    },

    // Feed Actions
    async loadTimeline(type = 'home', loadMore = false) {
        if (!window.$store.auth.mastodon.accessToken) {
            console.log('No Mastodon credentials for timeline');
            return;
        }

        if (!loadMore) {
            window.$store.ui.isLoading = true;
            window.$store.posts = [];
        } else {
            window.$store.ui.loadingMore = true;
        }

        try {
            const { data } = await apiFetch(
                window.$store.auth.mastodon.instanceUrl,
                window.$store.auth.mastodon.accessToken,
                `/api/v1/timelines/${type}`
            );
            
            const postsWithPlatform = data.map(post => ({ ...post, platform: 'mastodon' }));
            
            if (loadMore) {
                window.$store.posts.push(...postsWithPlatform);
            } else {
                window.$store.posts = postsWithPlatform;
            }
            
            window.$store.ui.hasMore = data.length > 0;
            console.log('Loaded Mastodon timeline:', data.length, 'posts');
        } catch (error) {
            console.error('Failed to load timeline:', error);
            showToast('Failed to load timeline');
        } finally {
            window.$store.ui.isLoading = false;
            window.$store.ui.loadingMore = false;
        }
    },

    async loadLemmyFeed(feedType = 'Subscribed', sortType = 'Hot', loadMore = false) {
        if (!window.$store.auth.lemmy.jwt) {
            console.log('No Lemmy credentials for feed');
            return;
        }

        if (!loadMore) {
            window.$store.ui.isLoading = true;
            window.$store.posts = [];
        } else {
            window.$store.ui.loadingMore = true;
        }

        try {
            const { data } = await apiFetch(
                window.$store.auth.lemmy.instance,
                null,
                '/api/v3/post/list',
                {},
                'lemmy',
                { 
                    sort: sortType, 
                    type_: feedType, 
                    limit: 20,
                    page: loadMore ? Math.floor(window.$store.posts.length / 20) + 1 : 1
                }
            );
            
            const postsWithPlatform
