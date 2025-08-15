// components/Router.js - Complete version with federation and error handling
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

    async checkInstanceHealth(instance) {
        // Quick health check for an instance
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout
            
            const response = await fetch(`https://${instance}/api/v3/site`, {
                signal: controller.signal,
                method: 'HEAD'
            });
            
            clearTimeout(timeoutId);
            return response.ok;
        } catch (error) {
            console.log(`Instance ${instance} appears to be down or unreachable`);
            return false;
        }
    }

    async fetchAndShowLemmyPost(instance, postId) {
        try {
            // First check if the instance is reachable
            const instanceHealthy = await this.checkInstanceHealth(instance);
            if (!instanceHealthy) {
                throw new Error(`Cannot connect to ${instance}. The instance may be down or does not exist.`);
            }

            // Try without auth first (for public posts)
            let url = `https://${instance}/api/v3/post?id=${postId}`;
            let response = await fetch(url);
            
            // If it fails with 400/401, might need auth for private communities
            if (!response.ok && (response.status === 400 || response.status === 401)) {
                const jwt = localStorage.getItem('lemmy_jwt');
                const userInstance = localStorage.getItem('lemmy_instance');
                
                if (jwt && userInstance) {
                    const cleanUserInstance = userInstance.replace(/^https?:\/\//, '');
                    
                    // Only use JWT if it's for the same instance
                    if (cleanUserInstance === instance || userInstance.includes(instance)) {
                        url = `https://${instance}/api/v3/post?id=${postId}&auth=${encodeURIComponent(jwt)}`;
                        response = await fetch(url);
                    }
                }
            }
            
            // Parse error response if not ok
            if (!response.ok) {
                let errorMessage = '';
                try {
                    const errorText = await response.text();
                    console.error('Lemmy API error:', errorText);
                    
                    // Parse common Lemmy errors
                    if (errorText.includes('couldnt_find_post') || response.status === 404) {
                        errorMessage = 'Post not found. It may have been deleted or is not federated to this instance.';
                    } else if (errorText.includes('not_logged_in')) {
                        errorMessage = 'This post requires authentication to view.';
                    } else if (response.status === 400) {
                        errorMessage = `This post is not available on ${instance}.`;
                    } else {
                        errorMessage = `Error loading post from ${instance} (${response.status})`;
                    }
                } catch (e) {
                    errorMessage = `Error loading post from ${instance} (${response.status})`;
                }
                
                throw new Error(errorMessage);
            }
            
            const data = await response.json();
            
            if (data.post_view) {
                await this.actions.showLemmyPostDetail(data.post_view);
            } else {
                throw new Error('Post data not found in response');
            }
            
        } catch (error) {
            console.error('Failed to fetch Lemmy post:', error);
            
            // Provide user-friendly error messages
            let errorMessage = 'Unable to load post';
            
            if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
                errorMessage = `Cannot connect to ${instance}. The instance may be down or blocking requests.`;
            } else if (error.message.includes('does not exist')) {
                errorMessage = error.message;
            } else if (error.message) {
                errorMessage = error.message;
            }
            
            // Show error with suggestion to try on original instance
            this.actions.showErrorPage(`
                <div style="text-align: center; padding: 20px;">
                    <h3>⚠️ ${errorMessage}</h3>
                    <p style="margin-top: 20px; color: var(--text-secondary);">
                        Post ID: ${postId}<br>
                        Instance: ${instance}
                    </p>
                    <div style="margin-top: 30px;">
                        <button onclick="history.back()" style="margin-right: 10px;">Go Back</button>
                        <a href="https://${instance}/post/${postId}" target="_blank" rel="noopener">
                            <button>Open on ${instance}</button>
                        </a>
                    </div>
                </div>
            `);
        }
    }

    async fetchAndShowLemmyComment(instance, postId, commentId) {
        try {
            // Check instance health first
            const instanceHealthy = await this.checkInstanceHealth(instance);
            if (!instanceHealthy) {
                throw new Error(`Cannot connect to ${instance}`);
            }

            // Fetch the post first if we have postId
            if (postId) {
                // Try without auth first
                let url = `https://${instance}/api/v3/post?id=${postId}`;
                let response = await fetch(url);
                
                // Try with auth if needed and same instance
                if (!response.ok && (response.status === 400 || response.status === 401)) {
                    const jwt = localStorage.getItem('lemmy_jwt');
                    const userInstance = localStorage.getItem('lemmy_instance');
                    
                    if (jwt && userInstance) {
                        const cleanUserInstance = userInstance.replace(/^https?:\/\//, '');
                        
                        if (cleanUserInstance === instance || userInstance.includes(instance)) {
                            url = `https://${instance}/api/v3/post?id=${postId}&auth=${encodeURIComponent(jwt)}`;
                            response = await fetch(url);
                        }
                    }
                }
                
                if (!response.ok) {
                    const errorText = await response.text();
                    console.error('Lemmy API error:', errorText);
                    
                    if (response.status === 404 || errorText.includes('couldnt_find_post')) {
                        throw new Error('Post not found or deleted');
                    } else {
                        throw new Error(`Cannot load post from ${instance}`);
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
                
                // Try with auth if needed
                if (!response.ok && (response.status === 400 || response.status === 401)) {
                    const jwt = localStorage.getItem('lemmy_jwt');
                    const userInstance = localStorage.getItem('lemmy_instance');
                    
                    if (jwt && userInstance) {
                        const cleanUserInstance = userInstance.replace(/^https?:\/\//, '');
                        
                        if (cleanUserInstance === instance || userInstance.includes(instance)) {
                            url = `https://${instance}/api/v3/comment?id=${commentId}&auth=${encodeURIComponent(jwt)}`;
                            response = await fetch(url);
                        }
                    }
                }
                
                if (!response.ok) {
                    throw new Error('Comment not found');
                }
                
                const data = await response.json();
                if (data.comment_view) {
                    // Show the parent post with comment highlighted
                    await this.fetchAndShowLemmyPost(instance, data.comment_view.post.id);
                }
            }
        } catch (error) {
            console.error('Failed to fetch comment:', error);
            
            this.actions.showErrorPage(`
                <div style="text-align: center; padding: 20px;">
                    <h3>⚠️ ${error.message || 'Comment not found'}</h3>
                    <p style="margin-top: 20px; color: var(--text-secondary);">
                        Comment ID: ${commentId}<br>
                        Instance: ${instance}
                    </p>
                    <div style="margin-top: 30px;">
                        <button onclick="history.back()">Go Back</button>
                    </div>
                </div>
            `);
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
            this.actions.showErrorPage(`
                <div style="text-align: center; padding: 20px;">
                    <h3>⚠️ User not found</h3>
                    <p style="margin-top: 20px; color: var(--text-secondary);">
                        @${username}@${instance}
                    </p>
                    <div style="margin-top: 30px;">
                        <button onclick="history.back()">Go Back</button>
                    </div>
                </div>
            `);
        }
    }

    async fetchAndShowMastodonStatus(instance, statusId) {
        try {
            // Try public endpoint first
            const response = await fetch(`https://${instance}/api/v1/statuses/${statusId}`);
            
            if (!response.ok) {
                throw new Error(`Status not found (${response.status})`);
            }
            
            const status = await response.json();
            
            if (status.id) {
                await this.actions.showStatusDetail(status);
            } else {
                throw new Error('Status not found');
            }
        } catch (error) {
            console.error('Failed to fetch status:', error);
            this.actions.showErrorPage(`
                <div style="text-align: center; padding: 20px;">
                    <h3>⚠️ ${error.message || 'Status not found'}</h3>
                    <p style="margin-top: 20px; color: var(--text-secondary);">
                        Status ID: ${statusId}<br>
                        Instance: ${instance}
                    </p>
                    <div style="margin-top: 30px;">
                        <button onclick="history.back()">Go Back</button>
                    </div>
                </div>
            `);
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
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 3000);
            
            const mastodonResponse = await fetch(`https://${instance}/api/v1/instance`, {
                signal: controller.signal
            });
            clearTimeout(timeoutId);
            
            if (mastodonResponse.ok) return 'mastodon';
        } catch (e) {}
        
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 3000);
            
            const lemmyResponse = await fetch(`https://${instance}/api/v3/site`, {
                signal: controller.signal
            });
            clearTimeout(timeoutId);
            
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
