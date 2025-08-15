// components/Router.js - Version 1: Instance-specific JWT checking
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
            // First try without auth (for public posts)
            let url = `https://${instance}/api/v3/post?id=${postId}`;
            let response = await fetch(url);
            
            // If it fails with 400/401, it might need auth
            if (!response.ok && (response.status === 400 || response.status === 401)) {
                const jwt = localStorage.getItem('lemmy_jwt');
                const userInstance = localStorage.getItem('lemmy_instance');
                
                // Only use JWT if it's for the same instance
                if (jwt && userInstance && userInstance.includes(instance)) {
                    // Try with auth in query params (Lemmy format)
                    url = `https://${instance}/api/v3/post?id=${postId}&auth=${encodeURIComponent(jwt)}`;
                    response = await fetch(url);
                }
            }
            
            // If still not ok, this might be a private post or deleted
            if (!response.ok) {
                // Try to get more info about the error
                const errorText = await response.text();
                console.error('Lemmy API error:', errorText);
                
                // Check if it's a "not found" error
                if (response.status === 404 || errorText.includes('not_found')) {
                    throw new Error('Post not found or deleted');
                } else if (response.status === 400) {
                    // This might be a federation issue or the post doesn't exist on this instance
                    throw new Error('Post not available. It may be from an instance that doesn\'t federate with ' + instance);
                } else {
                    throw new Error(`HTTP ${response.status}`);
                }
            }
            
            const data = await response.json();
            
            if (data.post_view) {
                await this.actions.showLemmyPostDetail(data.post_view);
            } else {
                throw new Error('Post not found');
            }
        } catch (error) {
            console.error('Failed to fetch Lemmy post:', error);
            
            // Provide more helpful error messages
            let errorMessage = 'Post not found or instance unreachable';
            
            if (error.message.includes('not available')) {
                errorMessage = error.message;
            } else if (error.message.includes('not found')) {
                errorMessage = 'This post has been deleted or is not available';
            } else if (error.message.includes('NetworkError')) {
                errorMessage = `Cannot connect to ${instance}. The instance may be down or blocking requests.`;
            }
            
            this.actions.showErrorPage(errorMessage);
        }
    }

    async fetchAndShowLemmyComment(instance, postId, commentId) {
        try {
            // Fetch the post first if we have postId
            if (postId) {
                // Try without auth first
                let url = `https://${instance}/api/v3/post?id=${postId}`;
                let response = await fetch(url);
                
                // If fails, try with auth only if it's the same instance
                if (!response.ok && (response.status === 400 || response.status === 401)) {
                    const jwt = localStorage.getItem('lemmy_jwt');
                    const userInstance = localStorage.getItem('lemmy_instance');
                    
                    // Only use JWT if it's for the same instance
                    if (jwt && userInstance && userInstance.includes(instance)) {
                        url = `https://${instance}/api/v3/post?id=${postId}&auth=${encodeURIComponent(jwt)}`;
                        response = await fetch(url);
                    }
                }
                
                if (!response.ok) {
                    const errorText = await response.text();
                    console.error('Lemmy API error:', errorText);
                    
                    if (response.status === 404 || errorText.includes('not_found')) {
                        throw new Error('Post not found or deleted');
                    } else {
                        throw new Error(`HTTP ${response.status}`);
                    }
                }
                
                const data = await response.json();
                
                if (data.post_view) {
                    await this.actions.showLemmyPostDetail(data.post_view);
                    // Scroll to comment after page loads
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
                }
            } else {
                // Direct comment link without post context
                let url = `https://${instance}/api/v3/comment?id=${commentId}`;
                let response = await fetch(url);
                
                // Try with auth if needed and same instance
                if (!response.ok && (response.status === 400 || response.status === 401)) {
                    const jwt = localStorage.getItem('lemmy_jwt');
                    const userInstance = localStorage.getItem('lemmy_instance');
                    
                    if (jwt && userInstance && userInstance.includes(instance)) {
                        url = `https://${instance}/api/v3/comment?id=${commentId}&auth=${encodeURIComponent(jwt)}`;
                        response = await fetch(url);
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
