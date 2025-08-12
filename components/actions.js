// components/actions.js - Complete implementation
import { apiFetch } from './api.js';
import { showToast } from './ui.js';

// Create actions object
const actions = {
    // Auth Actions
    async verifyMastodonCredentials() {
        if (!window.$store?.auth.mastodon.instanceUrl || !window.$store?.auth.mastodon.accessToken) {
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
            
            // Persist to localStorage
            localStorage.setItem('fediverse-instance', instanceUrl);
            localStorage.setItem('fediverse-token', accessToken);
            
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
                window.$store.auth.lemmy.instance = instance;
                window.$store.auth.lemmy.username = username;
                window.$store.auth.lemmy.jwt = data.jwt;
                
                // Persist to localStorage
                localStorage.setItem('lemmy_instance', instance);
                localStorage.setItem('lemmy_username', username);
                localStorage.setItem('lemmy_jwt', data.jwt);
                
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

    // Feed Actions
    async loadTimeline(type = 'home', loadMore = false) {
        if (!window.$store?.auth.mastodon.accessToken) {
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
        if (!window.$store?.auth.lemmy.jwt) {
            console.log('No Lemmy credentials for feed');
            return;
        }

        if (!loadMore) {
            window.$store.ui.isLoading = true;
            window.$store.posts = [];
            window.$store.ui.currentLemmyFeed = feedType;
            window.$store.ui.currentLemmySort = sortType;
        } else {
            window.$store.ui.loadingMore = true;
        }

        try {
            const page = loadMore ? Math.floor(window.$store.posts.length / 20) + 1 : 1;
            const response = await fetch(`https://${window.$store.auth.lemmy.instance}/api/v3/post/list?sort=${sortType}&type_=${feedType}&limit=20&page=${page}`, {
                headers: {
                    'Authorization': `Bearer ${window.$store.auth.lemmy.jwt}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();
            const postsWithPlatform = data.posts.map(post => ({ ...post, platform: 'lemmy' }));
            
            if (loadMore) {
                window.$store.posts.push(...postsWithPlatform);
            } else {
                window.$store.posts = postsWithPlatform;
            }
            
            window.$store.ui.hasMore = data.posts.length > 0;
            console.log('Loaded Lemmy feed:', data.posts.length, 'posts');
        } catch (error) {
            console.error('Failed to load Lemmy feed:', error);
            showToast(`Failed to load Lemmy feed: ${error.message}`);
        } finally {
            window.$store.ui.isLoading = false;
            window.$store.ui.loadingMore = false;
        }
    },

    async loadMergedFeed(loadMore = false) {
        if (!loadMore) {
            window.$store.ui.isLoading = true;
            window.$store.posts = [];
        } else {
            window.$store.ui.loadingMore = true;
        }

        try {
            const promises = [];
            
            // Add Mastodon timeline if credentials exist
            if (window.$store.auth.mastodon.accessToken) {
                promises.push(
                    apiFetch(
                        window.$store.auth.mastodon.instanceUrl,
                        window.$store.auth.mastodon.accessToken,
                        '/api/v1/timelines/home'
                    ).then(response => response.data.map(post => ({ ...post, platform: 'mastodon' })))
                );
            }
            
            // Add Lemmy feed if credentials exist
            if (window.$store.auth.lemmy.jwt) {
                promises.push(
                    fetch(`https://${window.$store.auth.lemmy.instance}/api/v3/post/list?sort=Hot&type_=Subscribed&limit=20`, {
                        headers: {
                            'Authorization': `Bearer ${window.$store.auth.lemmy.jwt}`,
                            'Content-Type': 'application/json'
                        }
                    }).then(response => response.json())
                      .then(data => data.posts.map(post => ({ ...post, platform: 'lemmy' })))
                );
            }

            const results = await Promise.all(promises);
            const allPosts = results.flat();
            
            // Sort by creation date
            allPosts.sort((a, b) => {
                const dateA = new Date(a.platform === 'lemmy' ? a.post.published : a.created_at);
                const dateB = new Date(b.platform === 'lemmy' ? b.post.published : b.created_at);
                return dateB - dateA;
            });

            if (loadMore) {
                window.$store.posts.push(...allPosts);
            } else {
                window.$store.posts = allPosts;
            }
            
            window.$store.ui.hasMore = allPosts.length > 0;
            console.log('Loaded merged feed:', allPosts.length, 'posts');
        } catch (error) {
            console.error('Failed to load merged feed:', error);
            showToast('Failed to load merged feed');
        } finally {
            window.$store.ui.isLoading = false;
            window.$store.ui.loadingMore = false;
        }
    },

    // Post Actions
    async lemmyVote(postId, score) {
        if (!window.$store?.auth.lemmy.jwt) return;
        
        try {
            const response = await fetch(`https://${window.$store.auth.lemmy.instance}/api/v3/post/like`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${window.$store.auth.lemmy.jwt}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    post_id: postId,
                    score: score
                })
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            const data = await response.json();
            
            // Update the post in the store
            const post = window.$store.posts.find(p => p.post?.id === postId);
            if (post && data.post_view) {
                post.my_vote = data.post_view.my_vote;
                post.counts.score = data.post_view.counts.score;
            }
            
            return data;
        } catch (error) {
            console.error('Failed to vote on post:', error);
            showToast('Failed to vote on post');
            throw error;
        }
    },

    async lemmySave(postId, save = true) {
        if (!window.$store?.auth.lemmy.jwt) return;
        
        try {
            const response = await fetch(`https://${window.$store.auth.lemmy.instance}/api/v3/post/save`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${window.$store.auth.lemmy.jwt}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    post_id: postId,
                    save: save
                })
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            const data = await response.json();
            
            // Update the post in the store
            const post = window.$store.posts.find(p => p.post?.id === postId);
            if (post && data.post_view) {
                post.saved = data.post_view.saved;
            }
            
            showToast(save ? 'Post saved!' : 'Post unsaved!');
            return data;
        } catch (error) {
            console.error('Failed to save post:', error);
            showToast('Failed to save post');
            throw error;
        }
    },

    async lemmyPostComment(commentData) {
        if (!window.$store?.auth.lemmy.jwt) {
            showToast('You must be logged in to comment');
            throw new Error('Not logged in');
        }
        
        try {
            const response = await fetch(`https://${window.$store.auth.lemmy.instance}/api/v3/comment`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${window.$store.auth.lemmy.jwt}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    ...commentData,
                    auth: window.$store.auth.lemmy.jwt
                })
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            const data = await response.json();
            showToast('Comment posted!');
            return data;
        } catch (error) {
            console.error('Failed to post comment:', error);
            showToast('Failed to post comment');
            throw error;
        }
    },

    async toggleMastodonAction(action, statusId, active) {
        if (!window.$store?.auth.mastodon.accessToken) return;
        
        try {
            const endpoint = active ? action : `un${action}`;
            const { data } = await apiFetch(
                window.$store.auth.mastodon.instanceUrl,
                window.$store.auth.mastodon.accessToken,
                `/api/v1/statuses/${statusId}/${endpoint}`,
                { method: 'POST' }
            );
            
            return data;
        } catch (error) {
            console.error(`Failed to ${action} status:`, error);
            showToast(`Failed to ${action} post`);
            throw error;
        }
    },

    async postMastodonStatus(statusData) {
        if (!window.$store?.auth.mastodon.accessToken) {
            showToast('You must be logged in to post');
            throw new Error('Not logged in');
        }
        
        try {
            const { data } = await apiFetch(
                window.$store.auth.mastodon.instanceUrl,
                window.$store.auth.mastodon.accessToken,
                '/api/v1/statuses',
                {
                    method: 'POST',
                    body: statusData
                }
            );
            
            showToast('Status posted!');
            return data;
        } catch (error) {
            console.error('Failed to post status:', error);
            showToast('Failed to post status');
            throw error;
        }
    },

    // Navigation Actions
    setView(viewName) {
        window.$store.ui.currentView = viewName;
        window.history.pushState({ view: viewName }, '', `#${viewName}`);
    },

    setTheme(themeName) {
        window.$store.settings.theme = themeName;
        document.body.dataset.theme = themeName;
        localStorage.setItem('feedstodon-theme', themeName);
    },

    // Legacy actions for backward compatibility
    showLemmyProfile(userAcct) {
        console.log('Show Lemmy profile:', userAcct);
        showToast('Profile view coming soon!');
    },

    showLemmyCommunity(communityName) {
        console.log('Show Lemmy community:', communityName);
        showToast('Community view coming soon!');
    },

    showLemmyPostDetail(post) {
        console.log('Show Lemmy post detail:', post.post.name);
        showToast('Post detail view coming soon!');
    },

    showMergedPost(post) {
        console.log('Show merged post:', post);
        showToast('Merged post view coming soon!');
    },

    showProfilePage(platform, accountId, accountAcct) {
        console.log('Show profile page:', platform, accountId, accountAcct);
        showToast('Profile page coming soon!');
    },

    showStatusDetail(statusId) {
        console.log('Show status detail:', statusId);
        showToast('Status detail coming soon!');
    },

    showHashtagTimeline(tagName) {
        console.log('Show hashtag timeline:', tagName);
        showToast('Hashtag timeline coming soon!');
    }
};

// Make actions globally available
window.actions = actions;

// Export for module imports
export { actions };
export default actions;
