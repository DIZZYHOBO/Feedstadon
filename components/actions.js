// Create: components/actions.js
import { store } from './store.js';
import { apiFetch } from './api.js';

export const actions = {
    // Auth Actions
    async loginMastodon(instanceUrl, accessToken) {
        try {
            const { data: user } = await apiFetch(instanceUrl, accessToken, '/api/v1/accounts/verify_credentials');
            store.auth.mastodon.instanceUrl = instanceUrl;
            store.auth.mastodon.accessToken = accessToken;
            store.auth.mastodon.currentUser = user;
            return true;
        } catch (error) {
            console.error('Mastodon login failed:', error);
            return false;
        }
    },

    async loginLemmy(instance, username, password) {
        try {
            const { data } = await apiFetch(instance, null, '/api/v3/user/login', {
                method: 'POST',
                body: { username_or_email: username, password }
            }, 'lemmy');
            
            store.auth.lemmy.instance = instance;
            store.auth.lemmy.username = username;
            store.auth.lemmy.jwt = data.jwt;
            return true;
        } catch (error) {
            console.error('Lemmy login failed:', error);
            return false;
        }
    },

    // Feed Actions
    async loadTimeline(type = 'home', loadMore = false) {
        if (!loadMore) {
            store.ui.isLoading = true;
            store.posts = [];
        } else {
            store.ui.loadingMore = true;
        }

        try {
            const { data } = await apiFetch(
                store.auth.mastodon.instanceUrl,
                store.auth.mastodon.accessToken,
                `/api/v1/timelines/${type}`
            );
            
            if (loadMore) {
                store.posts.push(...data);
            } else {
                store.posts = data;
            }
        } catch (error) {
            console.error('Failed to load timeline:', error);
        } finally {
            store.ui.isLoading = false;
            store.ui.loadingMore = false;
        }
    },

    async loadLemmyFeed(feedType = 'Subscribed', sortType = 'Hot', loadMore = false) {
        if (!loadMore) {
            store.ui.isLoading = true;
            store.posts = [];
        } else {
            store.ui.loadingMore = true;
        }

        try {
            const { data } = await apiFetch(
                store.auth.lemmy.instance,
                null,
                '/api/v3/post/list',
                {},
                'lemmy',
                { sort: sortType, type_: feedType, limit: 20 }
            );
            
            const postsWithPlatform = data.posts.map(post => ({ ...post, platform: 'lemmy' }));
            
            if (loadMore) {
                store.posts.push(...postsWithPlatform);
            } else {
                store.posts = postsWithPlatform;
            }
        } catch (error) {
            console.error('Failed to load Lemmy feed:', error);
        } finally {
            store.ui.isLoading = false;
            store.ui.loadingMore = false;
        }
    },

    async loadMergedFeed(loadMore = false) {
        if (!loadMore) {
            store.ui.isLoading = true;
            store.posts = [];
        } else {
            store.ui.loadingMore = true;
        }

        try {
            const [mastodonData, lemmyData] = await Promise.all([
                store.auth.mastodon.accessToken ? 
                    apiFetch(store.auth.mastodon.instanceUrl, store.auth.mastodon.accessToken, '/api/v1/timelines/home') :
                    Promise.resolve({ data: [] }),
                store.auth.lemmy.jwt ?
                    apiFetch(store.auth.lemmy.instance, null, '/api/v3/post/list', {}, 'lemmy', { sort: 'Hot', type_: 'Subscribed' }) :
                    Promise.resolve({ data: { posts: [] } })
            ]);

            const mastodonPosts = mastodonData.data.map(post => ({ ...post, platform: 'mastodon' }));
            const lemmyPosts = lemmyData.data.posts.map(post => ({ ...post, platform: 'lemmy' }));
            
            const allPosts = [...mastodonPosts, ...lemmyPosts].sort((a, b) => {
                const dateA = new Date(a.platform === 'lemmy' ? a.post.published : a.created_at);
                const dateB = new Date(b.platform === 'lemmy' ? b.post.published : b.created_at);
                return dateB - dateA;
            });

            if (loadMore) {
                store.posts.push(...allPosts);
            } else {
                store.posts = allPosts;
            }
        } catch (error) {
            console.error('Failed to load merged feed:', error);
        } finally {
            store.ui.isLoading = false;
            store.ui.loadingMore = false;
        }
    },

    // Post Actions
    async votePost(postId, score) {
        try {
            await apiFetch(
                store.auth.lemmy.instance,
                null,
                '/api/v3/post/like',
                { method: 'POST', body: { post_id: postId, score } },
                'lemmy'
            );
            
            // Update local state
            const post = store.posts.find(p => p.post?.id === postId);
            if (post) {
                post.my_vote = score;
                post.counts.score += score - (post.my_vote || 0);
            }
        } catch (error) {
            console.error('Failed to vote on post:', error);
        }
    },

    // UI Actions
    setView(viewName) {
        store.ui.currentView = viewName;
        window.history.pushState({ view: viewName }, '', `#${viewName}`);
    },

    setTheme(themeName) {
        store.settings.theme = themeName;
        document.body.dataset.theme = themeName;
        localStorage.setItem('feedstodon-theme', themeName);
    }
};
