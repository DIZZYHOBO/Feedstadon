// components/Router.js - Version 2: Fallback to user's instance for federation
import { apiFetch } from './api.js';
import { showLoadingBar, hideLoadingBar } from './ui.js';

export class Router {
    constructor(state, actions) {
        this.state = state;
        this.actions = actions;
        this.routes = this.defineRoutes();
        this.previousPath = null;
    }

    defineRoutes() {
        return [
            // Home and main feeds
            { pattern: /^\/$/,                                           handler: 'home' },
            { pattern: /^\/local\/?$/,                                   handler: 'local' },
            { pattern: /^\/all\/?$/,                                     handler: 'all' },
            { pattern: /^\/merged\/?$/,                                  handler: 'merged' },
            
            // Lemmy community routes
            { pattern: /^\/c\/([^@]+)@([^\/]+)\/?$/,                    handler: 'lemmyCommunity' },
            { pattern: /^\/c\/([^@]+)@([^\/]+)\/post\/(\d+)\/?$/,       handler: 'lemmyPost' },
            { pattern: /^\/c\/([^@]+)@([^\/]+)\/comment\/(\d+)\/?$/,    handler: 'lemmyComment' },
            
            // Lemmy user routes
            { pattern: /^\/u\/([^@]+)@([^\/]+)\/?$/,                    handler: 'lemmyUser' },
            { pattern: /^\/u\/([^@]+)@([^\/]+)\/(posts|comments)\/?$/,  handler: 'lemmyUserContent' },
            
            // Mastodon routes
            { pattern: /^\/m\/([^@]+)@([^\/]+)\/?$/,                    handler: 'mastodonUser' },
            { pattern: /^\/m\/([^@]+)@([^\/]+)\/status\/(\d+)\/?$/,     handler: 'mastodonStatus' },
            { pattern: /^\/m\/([^@]+)@([^\/]+)\/(followers|following|media)\/?$/, handler: 'mastodonUserContent' },
            
            // Direct post/comment links
            { pattern: /^\/post\/([^\/]+)\/(\d+)\/?$/,                  handler: 'directPost' },
            { pattern: /^\/comment\/([^\/]+)\/(\d+)\/?$/,               handler: 'directComment' },
            { pattern: /^\/status\/([^\/]+)\/(\d+)\/?$/,                handler: 'directStatus' },
            
            // Hashtag and search
            { pattern: /^\/tag\/([^\/]+)\/?$/,                          handler: 'hashtag' },
            { pattern: /^\/search\/([^\/]+)\/?$/,                       handler: 'search' },
            
            // App pages
            { pattern: /^\/settings\/?$/,                               handler: 'settings' },
            { pattern: /^\/discover\/?$/,                               handler: 'discover' },
            { pattern: /^\/notifications\/?$/,                          handler: 'notifications' },
            { pattern: /^\/compose\/?$/,                                handler: 'compose' }
        ];
    }

    async init() {
        // Handle browser back/forward buttons
        window.addEventListener('popstate', () => this.handleRoute());
        
        // Handle initial route
        await this.handleRoute();
    }

    async navigate(path, replaceState = false) {
        if (path === this.previousPath) return;
        
        this.previousPath = path;
        
        if (replaceState) {
            history.replaceState({ path }, '', path);
        } else {
            history.pushState({ path }, '', path);
        }
        
        await this.handleRoute();
    }

    async handleRoute() {
        const path = window.location.pathname;
        
        // Check for legacy hash routing and redirect
        if (window.location.hash) {
            const hash = window.location.hash.slice(1);
            this.handleLegacyHash(hash);
            return;
        }
        
        // Check for legacy query parameters
        const params = new URLSearchParams(window.location.search);
        if (params.get('share')) {
            await this.handleLegacyShare(params);
            return;
        }
        
        // Match against routes
        for (const route of this.routes) {
            const match = path.match(route.pattern);
            if (match) {
                const args = match.slice(1);
                await this.executeHandler(route.handler, args);
                return;
            }
        }
        
        // 404 - redirect to home
        await this.executeHandler('home', []);
    }

    async executeHandler(handlerName, args) {
        showLoadingBar();
        
        try {
            switch(handlerName) {
                case 'home':
                    await this.actions.showHomeTimeline();
                    break;
                    
                case 'local':
                    if (this.state.currentLemmyFeed) {
                        await this.actions.showLemmyFeed('Local');
                    } else {
                        await this.actions.showMastodonTimeline('public?local=true');
                    }
                    break;
                    
                case 'all':
                    if (this.state.currentLemmyFeed) {
                        await this.actions.showLemmyFeed('All');
                    } else {
                        await this.actions.showMastodonTimeline('public');
                    }
                    break;
                    
                case 'merged':
                    await this.actions.showMergedTimeline();
                    break;
                    
                case 'lemmyCommunity':
                    await this.actions.showLemmyCommunity(`${args[0]}@${args[1]}`);
                    break;
                    
                case 'lemmyPost':
                    await this.fetchAndShowLemmyPost(args[1], args[2]);
                    break;
                    
                case 'lemmyComment':
                    await this.fetchAndShowLemmyComment(args[1], args[2], args[3]);
                    break;
                    
                case 'lemmyUser':
                    await this.actions.showLemmyProfile(`${args[0]}@${args[1]}`);
                    break;
                    
                case 'lemmyUserContent':
                    await this.actions.showLemmyProfile(`${args[0]}@${args[1]}`, args[2]);
                    break;
                    
                case 'mastodonUser':
                    await this.fetchAndShowMastodonProfile(args[0], args[1]);
                    break;
                    
                case 'mastodonStatus':
                    await this.fetchAndShowMastodonStatus(args[1], args[2]);
                    break;
                    
                case 'mastodonUserContent':
                    await this.fetchAndShowMastodonProfile(args[0], args[1], args[2]);
                    break;
                    
                case 'directPost':
                    await this.fetchAndShowDirectPost(args[0], args[1]);
                    break;
                    
                case 'directComment':
                    await this.fetchAndShowLemmyComment(args[0], null, args[1]);
                    break;
                    
                case 'directStatus':
                    await this.fetchAndShowMastodonStatus(args[0], args[1]);
                    break;
                    
                case 'hashtag':
                    await this.actions.showHashtagTimeline(args[0]);
                    break;
                    
                case 'search':
                    await this.actions.showSearchResults(decodeURIComponent(args[0]));
                    break;
                    
                case 'settings':
                    this.actions.showSettings();
                    break;
                    
                case 'discover':
                    await this.actions.showDiscoverPage();
                    break;
                    
                case 'notifications':
                    await this.actions.showNotifications();
                    break;
                    
                case 'compose':
                    this.actions.showComposeModal();
                    break;
            }
        } catch (error) {
            console.error('Route handler error:', error);
            this.actions.showErrorPage(error.message);
        } finally {
            hideLoadingBar();
        }
    }

    async fetchAndShowLemmyPost(instance, postId) {
        try {
            // First try the requested instance without auth
            let url = `https://${instance}/api/v3/post?id=${postId}`;
            let response = await fetch(url);
            let fetchedFromUserInstance = false;
            
            // If that fails, try from the user's home instance if they're logged in
            if (!response.ok) {
                const jwt = localStorage.getItem('lemmy_jwt');
                const userInstance = localStorage.getItem('lemmy_instance');
                
                if (jwt && userInstance) {
                    // Clean the instance URL (remove https:// if present)
                    const cleanUserInstance = userInstance.replace(/^https?:\/\//, '');
                    
                    if (cleanUserInstance === instance || userInstance.includes(instance)) {
                        // Same instance, use auth
                        url = `https://${instance}/api/v3/post?id=${postId}&auth=${encodeURIComponent(jwt)}`;
                        response = await fetch(url);
                    } else {
                        // Different instance, try to fetch from user's instance
                        // First try to search for the post by its original URL
                        console.log(`Post not found on ${instance}, trying user's instance: ${cleanUserInstance}`);
                        
                        // Try direct ID first (in case it's federated with same ID)
                        url = `https://${cleanUserInstance}/api/v3/post?id=${postId}&auth=${encodeURIComponent(jwt)}`;
                        response = await fetch(url);
                        
                        if (response.ok) {
                            fetchedFromUserInstance = true;
                        } else {
                            // If that doesn't work, try searching for the post
                            const searchUrl = `https://${cleanUserInstance}/api/v3/search?q=https://${instance}/post/${postId}&type_=Posts&auth=${encodeURIComponent(jwt)}`;
                            const searchResponse = await fetch(searchUrl);
                            
                            if (searchResponse.ok) {
                                const searchData = await searchResponse.json();
                                if (searchData.posts && searchData.posts.length > 0) {
                                    // Found the post via search, now fetch it properly
                                    const federatedPostId = searchData.posts[0].post.id;
                                    url = `https://${cleanUserInstance}/api/v3/post?id=${federatedPostId}&auth=${encodeURIComponent(jwt)}`;
                                    response = await fetch(url);
                                    fetchedFromUserInstance = true;
                                }
                            }
                        }
                    }
                }
                
                // If still not found, try original instance one more time without auth
                if (!response.ok && !fetchedFromUserInstance) {
                    url = `https://${instance}/api/v3/post?id=${postId}`;
                    response = await fetch(url);
                }
            }
            
            if (!response.ok) {
                // Determine the error type
                if (response.status === 404) {
                    throw new Error('Post not found or deleted');
                } else if (response.status === 400) {
                    throw new Error(`This post is not available on ${instance}. It may not be federated to this instance.`);
                } else {
                    throw new Error(`Unable to load post (Error ${response.status})`);
                }
            }
            
            const data = await response.json();
            
            if (data.post_view) {
                // If we fetched from user's instance, note that in console
                if (fetchedFromUserInstance) {
                    console.log('Post loaded from user\'s instance instead of original');
                }
                await this.actions.showLemmyPostDetail(data.post_view);
            } else {
                throw new Error('Post data not found');
            }
        } catch (error) {
            console.error('Failed to fetch Lemmy post:', error);
            
            this.actions.showErrorPage(
                error.message || 'Post not found or instance unreachable'
            );
        }
    }

    async fetchAndShowLemmyComment(instance, postId, commentId) {
        try {
            // Fetch the post first if we have postId
            if (postId) {
                // Use the same logic as fetchAndShowLemmyPost
                await this.fetchAndShowLemmyPost(instance, postId);
                
                // Then scroll to the comment
                setTimeout(() => {
                    const commentEl = document.getElementById(`comment-wrapper-${commentId}`);
                    if (commentEl) {
                        commentEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        commentEl.style.backgroundColor = 'var(--accent-color)';
                        commentEl.style.opacity = '0.3';
                        setTimeout(() => {
                            commentEl.style.backgroundColor = '';
                            commentEl.style.opacity = '';
                        }, 2000);
                    }
                }, 1000);
            } else {
                // Direct comment link without post context
                let url = `https://${instance}/api/v3/comment?id=${commentId}`;
                let response = await fetch(url);
                
                // Try with auth if needed
                if (!response.ok) {
                    const jwt = localStorage.getItem('lemmy_jwt');
                    const userInstance = localStorage.getItem('lemmy_instance');
                    
                    if (jwt && userInstance) {
                        const cleanUserInstance = userInstance.replace(/^https?:\/\//, '');
                        
                        if (cleanUserInstance === instance || userInstance.includes(instance)) {
                            url = `https://${instance}/api/v3/comment?id=${commentId}&auth=${encodeURIComponent(jwt)}`;
                            response = await fetch(url);
                        } else {
                            // Try from user's instance
                            url = `https://${cleanUserInstance}/api/v3/comment?id=${commentId}&auth=${encodeURIComponent(jwt)}`;
                            response = await fetch(url);
                        }
                    }
                }
                
                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}`);
                }
                
                const data = await response.json();
                if (data.comment_view) {
                    // Show the parent post with comment highlighted
                    await this.fetchAndShowLemmyPost(instance, data.comment_view.post.id);
                }
            }
        } catch (error) {
            console.error('Failed to fetch comment:', error);
            
            let errorMessage = 'Comment not found';
            if (error.message.includes('not found')) {
                errorMessage = 'This comment has been deleted or is not available';
            }
            
            this.actions.showErrorPage(errorMessage);
        }
    }

    async fetchAndShowMastodonProfile(username, instance) {
        try {
            // First get the account ID
            const searchResponse = await fetch(`https://${instance}/api/v2/search?q=@${username}&resolve=true&limit=1`);
            
            if (!searchResponse.ok) {
                throw new Error(`HTTP ${searchResponse.status}`);
            }
            
            const searchData = await searchResponse.json();
            
            if (searchData.accounts && searchData.accounts.length > 0) {
                const account = searchData.accounts[0];
                await this.actions.showProfilePage('mastodon', account.id, `${username}@${instance}`);
            } else {
                throw new Error('User not found');
            }
        } catch (error) {
            console.error('Failed to fetch Mastodon profile:', error);
            this.actions.showErrorPage('User not found');
        }
    }

    async fetchAndShowMastodonStatus(instance, statusId) {
        try {
            // Try public endpoint first
            const response = await fetch(`https://${instance}/api/v1/statuses/${statusId}`);
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }
            
            const status = await response.json();
            
            if (status.id) {
                await this.actions.showStatusDetail(status);
            } else {
                throw new Error('Status not found');
            }
        } catch (error) {
            console.error('Failed to fetch status:', error);
            this.actions.showErrorPage('Status not found');
        }
    }

    async fetchAndShowDirectPost(instance, postId) {
        // Try to detect platform
        const platform = await this.detectPlatform(instance);
        
        if (platform === 'mastodon') {
            await this.fetchAndShowMastodonStatus(instance, postId);
        } else {
            await this.fetchAndShowLemmyPost(instance, postId);
        }
    }

    async detectPlatform(instance) {
        try {
            const mastodonResponse = await fetch(`https://${instance}/api/v1/instance`);
            if (mastodonResponse.ok) return 'mastodon';
        } catch (e) {}
        
        try {
            const lemmyResponse = await fetch(`https://${instance}/api/v3/site`);
            if (lemmyResponse.ok) return 'lemmy';
        } catch (e) {}
        
        return 'unknown';
    }

    handleLegacyHash(hash) {
        // Convert old hash routes to new path routes
        const hashMap = {
            'timeline': '/',
            'notifications': '/notifications/',
            'discover': '/discover/',
            'settings': '/settings/'
        };
        
        const newPath = hashMap[hash] || '/';
        this.navigate(newPath, true);
    }

    async handleLegacyShare(params) {
        const shareType = params.get('share');
        const instance = params.get('instance');
        const postId = params.get('postId');
        const commentId = params.get('commentId');
        
        if (shareType === 'lemmy-post' && instance && postId) {
            const newPath = `/post/${instance}/${postId}/`;
            this.navigate(newPath, true);
        } else if (shareType === 'lemmy-comment' && instance && commentId) {
            const newPath = `/comment/${instance}/${commentId}/`;
            this.navigate(newPath, true);
        } else {
            this.navigate('/', true);
        }
    }
}
