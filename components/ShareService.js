// components/ShareService.js
class ShareService {
    constructor() {
        this.initStorage();
    }

    initStorage() {
        if (!localStorage.getItem('share-mappings')) {
            localStorage.setItem('share-mappings', JSON.stringify({}));
        }
        // Clean up old mappings (older than 30 days)
        this.cleanOldMappings();
    }

    cleanOldMappings() {
        const mappings = JSON.parse(localStorage.getItem('share-mappings'));
        const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
        
        Object.keys(mappings).forEach(key => {
            if (mappings[key].created < thirtyDaysAgo) {
                delete mappings[key];
            }
        });
        
        localStorage.setItem('share-mappings', JSON.stringify(mappings));
    }

    generateShortHash(length = 6) {
        const chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
        let result = '';
        for (let i = 0; i < length; i++) {
            result += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return result;
    }

    createShareUrl(type, data) {
        let shortId;
        let instance;
        let postId;
        let commentId = null;

        if (type === 'lemmy-post') {
            instance = new URL(data.post.ap_id).hostname;
            postId = data.post.id;
            
            // Check if we already have a mapping for this post
            const existingId = this.findExistingMapping('post', instance, postId);
            if (existingId) {
                return `${window.location.origin}/f/${existingId}`;
            }
            
            shortId = this.generateShortHash();
        } else if (type === 'lemmy-comment') {
            instance = new URL(data.comment.ap_id).hostname;
            postId = data.post.id;
            commentId = data.comment.id;
            
            // Check existing
            const existingId = this.findExistingMapping('comment', instance, postId, commentId);
            if (existingId) {
                return `${window.location.origin}/f/${existingId}`;
            }
            
            shortId = this.generateShortHash();
        }

        // Store mapping
        const mappings = JSON.parse(localStorage.getItem('share-mappings'));
        mappings[shortId] = {
            type: type === 'lemmy-post' ? 'post' : 'comment',
            instance,
            postId,
            commentId,
            created: Date.now()
        };
        localStorage.setItem('share-mappings', JSON.stringify(mappings));

        return `${window.location.origin}/f/${shortId}`;
    }

    findExistingMapping(type, instance, postId, commentId = null) {
        const mappings = JSON.parse(localStorage.getItem('share-mappings'));
        
        for (const [shortId, mapping] of Object.entries(mappings)) {
            if (mapping.type === type && 
                mapping.instance === instance && 
                mapping.postId === postId &&
                mapping.commentId === commentId) {
                return shortId;
            }
        }
        
        return null;
    }

    resolveShortId(shortId) {
        const mappings = JSON.parse(localStorage.getItem('share-mappings'));
        return mappings[shortId] || null;
    }
}

export const shareService = new ShareService();
