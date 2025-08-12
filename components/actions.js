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
            const postsWithPlatform = data.posts.map(post => ({ ...post, platform: 'lemmy' }));
            
            if (loadMore) {
                postsWithPlatform.forEach(post => store.addPost(post));
            } else {
                store.posts = postsWithPlatform;
            }
            
            store.ui.hasMore = data.posts.length > 0;
            console.log('Loaded Lemmy feed:', data.posts.length, 'posts');
        } catch (error) {
            console.error('Failed to load Lemmy feed:', error);
            showToast(`Failed to load Lemmy feed: ${error.message}`);
        } finally {
            store.ui.isLoading = false;
            store.ui.loadingMore = false;
        }
    },

    async loadMastodonTimeline(type = 'home', loadMore = false) {
        const store = Alpine.store('app');
        
        if (!store.auth.mastodon.accessToken) {
            console.log('No Mastodon credentials');
            return;
        }

        if (!loadMore) {
            store.ui.isLoading = true;
            store.clearPosts();
            store.ui.currentTimeline = type;
        } else {
            store.ui.loadingMore = true;
        }

        try {
            const url = `https://${store.auth.mastodon.instanceUrl}/api/v1/timelines/${type}?limit=20`;
            
            const response = await fetch(url, {
                headers: {
                    'Authorization': `Bearer ${store.auth.mastodon.accessToken}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();
            const postsWithPlatform = data.map(post => ({ ...post, platform: 'mastodon' }));
            
            if (loadMore) {
                postsWithPlatform.forEach(post => store.addPost(post));
            } else {
                store.posts = postsWithPlatform;
            }
            
            store.ui.hasMore = data.length > 0;
            console.log('Loaded Mastodon timeline:', data.length, 'posts');
        } catch (error) {
            console.error('Failed to load Mastodon timeline:', error);
            showToast(`Failed to load Mastodon timeline: ${error.message}`);
        } finally {
            store.ui.isLoading = false;
            store.ui.loadingMore = false;
        }
    },

    async loadMergedFeed(loadMore = false) {
        const store = Alpine.store('app');

        if (!loadMore) {
            store.ui.isLoading = true;
            store.clearPosts();
            store.ui.currentTimeline = null;
            store.ui.currentLemmyFeed = null;
        } else {
            store.ui.loadingMore = true;
        }

        try {
            const promises = [];
            
            // Fetch Mastodon posts if logged in
            if (store.auth.mastodon.accessToken) {
                promises.push(
                    fetch(`https://${store.auth.mastodon.instanceUrl}/api/v1/timelines/home?limit=10`, {
                        headers: {
                            'Authorization': `Bearer ${store.auth.mastodon.accessToken}`,
                            'Content-Type': 'application/json'
                        }
                    }).then(r => r.json()).then(posts => posts.map(p => ({ ...p, platform: 'mastodon' })))
                );
            }
            
            // Fetch Lemmy posts if logged in
            if (store.auth.lemmy.jwt) {
                promises.push(
                    fetch(`https://${store.auth.lemmy.instance}/api/v3/post/list?sort=Hot&type_=Subscribed&limit=10`, {
                        headers: {
                            'Authorization': `Bearer ${store.auth.lemmy.jwt}`,
                            'Content-Type': 'application/json'
                        }
                    }).then(r => r.json()).then(data => data.posts.map(p => ({ ...p, platform: 'lemmy' })))
                );
            }

            const results = await Promise.all(promises);
            const allPosts = results.flat();
            
            // Sort by date
            allPosts.sort((a, b) => {
                const dateA = new Date(a.platform === 'lemmy' ? a.post.published : a.created_at);
                const dateB = new Date(b.platform === 'lemmy' ? b.post.published : b.created_at);
                return dateB - dateA;
            });

            if (loadMore) {
                allPosts.forEach(post => store.addPost(post));
            } else {
                store.posts = allPosts;
            }
            
            store.ui.hasMore = allPosts.length > 0;
            console.log('Loaded merged feed:', allPosts.length, 'posts');
        } catch (error) {
            console.error('Failed to load merged feed:', error);
            showToast('Failed to load merged feed');
        } finally {
            store.ui.isLoading = false;
            store.ui.loadingMore = false;
        }
    },

    // Post interactions
    async lemmyVote(postId, score) {
        const store = Alpine.store('app');
        
        if (!store.auth.lemmy.jwt) return;
        
        try {
            const response = await fetch(`https://${store.auth.lemmy.instance}/api/v3/post/like`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${store.auth.lemmy.jwt}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    post_id: postId,
                    score: score
                })
            });

            if (!response.ok) throw new Error(`HTTP ${response.status}`);

            const data = await response.json();
            
            // Update post in store
            store.updatePost('lemmy', postId, {
                my_vote: data.post_view.my_vote,
                counts: data.post_view.counts
            });
            
            return true;
        } catch (error) {
            console.error('Failed to vote:', error);
            showToast('Failed to vote on post');
            return false;
        }
    },

    async lemmySave(postId, save = true) {
        const store = Alpine.store('app');
        
        if (!store.auth.lemmy.jwt) return;
        
        try {
            const response = await fetch(`https://${store.auth.lemmy.instance}/api/v3/post/save`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${store.auth.lemmy.jwt}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    post_id: postId,
                    save: save
                })
            });

            if (!response.ok) throw new Error(`HTTP ${response.status}`);

            const data = await response.json();
            
            // Update post in store
            store.updatePost('lemmy', postId, {
                saved: data.post_view.saved
            });
            
            showToast(save ? 'Post saved!' : 'Post unsaved!');
            return true;
        } catch (error) {
            console.error('Failed to save post:', error);
            showToast('Failed to save post');
            return false;
        }
    },

    async mastodonFavorite(statusId, favorite = true) {
        const store = Alpine.store('app');
        
        if (!store.auth.mastodon.accessToken) return;
        
        try {
            const action = favorite ? 'favourite' : 'unfavourite';
            const response = await fetch(`https://${store.auth.mastodon.instanceUrl}/api/v1/statuses/${statusId}/${action}`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${store.auth.mastodon.accessToken}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) throw new Error(`HTTP ${response.status}`);

            const data = await response.json();
            
            // Update post in store
            store.updatePost('mastodon', statusId, {
                favourited: data.favourited,
                favourites_count: data.favourites_count
            });
            
            return true;
        } catch (error) {
            console.error('Failed to favorite:', error);
            showToast('Failed to favorite post');
            return false;
        }
    },

    async mastodonBoost(statusId, boost = true) {
        const store = Alpine.store('app');
        
        if (!store.auth.mastodon.accessToken) return;
        
        try {
            const action = boost ? 'reblog' : 'unreblog';
            const response = await fetch(`https://${store.auth.mastodon.instanceUrl}/api/v1/statuses/${statusId}/${action}`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${store.auth.mastodon.accessToken}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) throw new Error(`HTTP ${response.status}`);

            const data = await response.json();
            
            // Update post in store
            store.updatePost('mastodon', statusId, {
                reblogged: data.reblogged,
                reblogs_count: data.reblogs_count
            });
            
            return true;
        } catch (error) {
            console.error('Failed to boost:', error);
            showToast('Failed to boost post');
            return false;
        }
    }
};
