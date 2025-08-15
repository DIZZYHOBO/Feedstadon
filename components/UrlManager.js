// components/UrlManager.js

export class UrlManager {
    // Generate URLs for different content types
    
    // Lemmy URLs
    static lemmyCommunity(name, instance) {
        return `/c/${name}@${instance}/`;
    }
    
    static lemmyPost(communityName, instance, postId) {
        return `/c/${communityName}@${instance}/post/${postId}/`;
    }
    
    static lemmyComment(communityName, instance, postId, commentId) {
        return `/c/${communityName}@${instance}/comment/${commentId}/`;
    }
    
    static lemmyUser(username, instance) {
        return `/u/${username}@${instance}/`;
    }
    
    static lemmyUserPosts(username, instance) {
        return `/u/${username}@${instance}/posts/`;
    }
    
    static lemmyUserComments(username, instance) {
        return `/u/${username}@${instance}/comments/`;
    }
    
    // Mastodon URLs
    static mastodonUser(username, instance) {
        return `/m/${username}@${instance}/`;
    }
    
    static mastodonStatus(username, instance, statusId) {
        return `/m/${username}@${instance}/status/${statusId}/`;
    }
    
    static mastodonUserMedia(username, instance) {
        return `/m/${username}@${instance}/media/`;
    }
    
    // Direct URLs (when username/community is unknown)
    static directPost(instance, postId) {
        return `/post/${instance}/${postId}/`;
    }
    
    static directComment(instance, commentId) {
        return `/comment/${instance}/${commentId}/`;
    }
    
    static directStatus(instance, statusId) {
        return `/status/${instance}/${statusId}/`;
    }
    
    // Hashtag/Search URLs
    static hashtag(tag) {
        return `/tag/${tag}/`;
    }
    
    static search(query) {
        return `/search/${encodeURIComponent(query)}/`;
    }
    
    // App pages
    static settings() {
        return '/settings/';
    }
    
    static discover() {
        return '/discover/';
    }
    
    static notifications() {
        return '/notifications/';
    }
    
    static compose() {
        return '/compose/';
    }
    
    // Helper functions
    static parseFederatedId(str) {
        // Parse formats like user@instance or !community@instance
        const match = str.match(/^[@!]?([^@]+)@(.+)$/);
        if (match) {
            return {
                name: match[1],
                instance: match[2]
            };
        }
        return null;
    }
    
    static extractInstance(url) {
        try {
            return new URL(url).hostname;
        } catch (e) {
            return null;
        }
    }
    
    // Generate shareable URL for any content
    static generateShareUrl(content) {
        const baseUrl = window.location.origin;
        
        if (content.platform === 'lemmy') {
            if (content.comment) {
                // Lemmy comment
                const instance = this.extractInstance(content.comment.ap_id);
                return baseUrl + this.directComment(instance, content.comment.id);
            } else if (content.post) {
                // Lemmy post
                const instance = this.extractInstance(content.post.ap_id);
                const communityName = content.community.name;
                return baseUrl + this.lemmyPost(communityName, instance, content.post.id);
            }
        } else if (content.platform === 'mastodon' || content.account) {
            // Mastodon status
            const username = content.account.username;
            const instance = this.extractInstance(content.account.url);
            return baseUrl + this.mastodonStatus(username, instance, content.id);
        }
        
        return baseUrl;
    }
    
    // Convert old URL format to new format
    static convertLegacyUrl(url) {
        const urlObj = new URL(url);
        const params = new URLSearchParams(urlObj.search);
        
        if (params.get('share') === 'lemmy-post') {
            const instance = params.get('instance');
            const postId = params.get('postId');
            return this.directPost(instance, postId);
        } else if (params.get('share') === 'lemmy-comment') {
            const instance = params.get('instance');
            const commentId = params.get('commentId');
            return this.directComment(instance, commentId);
        }
        
        // Check for hash routing
        if (urlObj.hash) {
            const hash = urlObj.hash.slice(1);
            const hashMap = {
                'timeline': '/',
                'notifications': '/notifications/',
                'discover': '/discover/',
                'settings': '/settings/'
            };
            return hashMap[hash] || '/';
        }
        
        return '/';
    }
}
