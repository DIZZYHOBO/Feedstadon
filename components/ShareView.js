// components/ShareView.js
import { timeAgo } from './utils.js';
import { ICONS } from './icons.js';

// Clean comment renderer for share view
function renderShareComment(commentView, level = 0, postAuthorId = null) {
    const commentDiv = document.createElement('div');
    commentDiv.className = 'share-comment';
    commentDiv.dataset.commentId = commentView.comment.id;
    
    if (level > 0) {
        commentDiv.style.marginLeft = `${Math.min(level * 20, 60)}px`;
        commentDiv.classList.add('nested-comment');
    }

    const converter = new showdown.Converter();
    const htmlContent = converter.makeHtml(commentView.comment.content || '');
    const isOP = postAuthorId && commentView.creator.id === postAuthorId;

    commentDiv.innerHTML = `
        <div class="share-comment-header">
            <img src="${commentView.creator.avatar || './images/php.png'}" alt="${commentView.creator.name}'s avatar" class="avatar">
            <div class="comment-meta">
                <span class="comment-author">${commentView.creator.name}</span>
                ${isOP ? '<span class="op-badge">OP</span>' : ''}
                <span class="comment-time">${timeAgo(commentView.comment.published)}</span>
            </div>
            <span class="comment-score">${ICONS.lemmyUpvote} ${commentView.counts.score}</span>
        </div>
        <div class="share-comment-body">${htmlContent}</div>
    `;

    return commentDiv;
}

// Build comment tree for threading
function buildCommentTree(comments) {
    const commentMap = {};
    const rootComments = [];

    // First pass: create map
    comments.forEach(comment => {
        commentMap[comment.comment.id] = {
            ...comment,
            children: []
        };
    });

    // Second pass: build tree
    comments.forEach(comment => {
        if (comment.comment.parent_id) {
            const parent = commentMap[comment.comment.parent_id];
            if (parent) {
                parent.children.push(commentMap[comment.comment.id]);
            }
        } else {
            rootComments.push(commentMap[comment.comment.id]);
        }
    });

    return rootComments;
}

// Render comment tree recursively
function renderCommentTree(comments, container, level = 0, postAuthorId = null) {
    comments.forEach(comment => {
        container.appendChild(renderShareComment(comment, level, postAuthorId));
        
        if (comment.children && comment.children.length > 0) {
            renderCommentTree(comment.children, container, level + 1, postAuthorId);
        }
    });
}

// Main share view renderer
export async function renderShareView(shortId, mapping) {
    // Create the share view container
    const container = document.createElement('div');
    container.className = 'share-view-container';
    
    try {
        // Use leminal.space as the public instance for fetching
        const publicInstance = 'leminal.space';
        
        // Try to fetch from the original instance first, fallback to leminal.space
        let postData = null;
        let commentsData = null;
        
        try {
            // Try original instance
            const postResponse = await fetch(`https://${mapping.instance}/api/v3/post?id=${mapping.postId}`);
            if (postResponse.ok) {
                postData = await postResponse.json();
            }
        } catch (err) {
            console.log('Original instance failed, trying leminal.space');
        }
        
        // If original failed, try leminal.space
        if (!postData) {
            // Search for the post on leminal.space by URL
            const searchResponse = await fetch(`https://${publicInstance}/api/v3/search?q=https://${mapping.instance}/post/${mapping.postId}&type_=Posts&limit=1`);
            if (searchResponse.ok) {
                const searchData = await searchResponse.json();
                if (searchData.posts && searchData.posts.length > 0) {
                    postData = { post_view: searchData.posts[0] };
                }
            }
        }
        
        if (!postData || !postData.post_view) {
            throw new Error('Post not found');
        }
        
        const postView = postData.post_view;
        
        // Try to fetch comments
        try {
            const commentsResponse = await fetch(
                `https://${mapping.instance}/api/v3/comment/list?post_id=${mapping.postId}&max_depth=8&sort=Top&limit=300`
            );
            if (commentsResponse.ok) {
                commentsData = await commentsResponse.json();
            }
        } catch (err) {
            console.log('Could not fetch comments from original instance');
        }
        
        // Process media
        let mediaHTML = '';
        const url = postView.post.url;
        const isImagePost = url && /\.(jpg|jpeg|png|gif|webp)$/i.test(url);
        
        if (url) {
            const youtubeRegex = /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/(?:[^\/\n\s]+\/\S+\/|(?:v|e(?:mbed)?)\/|\S*?[?&]v=)|youtu\.be\/)([a-zA-Z0-9_-]{11})/;
            const youtubeMatch = url.match(youtubeRegex);

            if (youtubeMatch) {
                mediaHTML = `
                    <div class="video-embed-container">
                        <iframe src="https://www.youtube.com/embed/${youtubeMatch[1]}" frameborder="0" allowfullscreen></iframe>
                    </div>
                `;
            } else if (/\.(mp4|webm)$/i.test(url)) {
                mediaHTML = `<div class="status-media"><video src="${url}" controls></video></div>`;
            } else if (isImagePost) {
                mediaHTML = `<div class="status-media"><img src="${url}" alt="${postView.post.name}" loading="lazy"></div>`;
            } else if (postView.post.thumbnail_url) {
                mediaHTML = `
                    <div class="status-media link-thumbnail">
                        <a href="${url}" target="_blank" rel="noopener noreferrer" class="link-thumbnail-wrapper">
                            <img src="${postView.post.thumbnail_url}" alt="${postView.post.name}" loading="lazy">
                            <div class="link-domain">${new URL(url).hostname.replace('www.', '')}</div>
                        </a>
                    </div>
                `;
            }
        }
        
        // Process body if exists
        let bodyHTML = '';
        if (postView.post.body) {
            const converter = new showdown.Converter();
            bodyHTML = converter.makeHtml(postView.post.body);
        }
        
        // Build the HTML
        container.innerHTML = `
            <div class="share-view-header">
                <div class="share-header-content">
                    <img src="./images/logo.png" alt="Feedstodon" class="share-logo">
                    <span class="share-tagline">Shared from ${mapping.instance}</span>
                    <button class="share-close-btn" onclick="window.close()">✕</button>
                </div>
            </div>
            
            <div class="share-content-wrapper">
                <!-- Main Post -->
                <div class="share-post-card status lemmy-card">
                    <div class="status-body-content">
                        <div class="status-header">
                            <a class="status-header-main">
                                <img src="${postView.community.icon || './images/php.png'}" alt="${postView.community.name} icon" class="avatar">
                                <div>
                                    <span class="display-name">${postView.community.name}</span>
                                    <span class="acct">posted by ${postView.creator.name} · ${formatTimestamp(postView.post.published)}</span>
                                </div>
                            </a>
                            <div class="status-header-side">
                                <div class="lemmy-icon-indicator">${ICONS.lemmy}</div>
                            </div>
                        </div>
                        <div class="status-content">
                            <h3 class="lemmy-title">${postView.post.name}</h3>
                            ${mediaHTML}
                            ${bodyHTML ? `<div class="lemmy-post-body">${bodyHTML}</div>` : ''}
                        </div>
                    </div>
                    <div class="share-post-stats">
                        <div class="stat-item">
                            <span class="stat-icon">${ICONS.lemmyUpvote}</span>
                            <span class="stat-value">${postView.counts.score}</span>
                            <span class="stat-label">points</span>
                        </div>
                        <div class="stat-item">
                            <span class="stat-icon">${ICONS.comments}</span>
                            <span class="stat-value">${postView.counts.comments}</span>
                            <span class="stat-label">comments</span>
                        </div>
                    </div>
                </div>
                
                <!-- Comments Section -->
                <div class="share-comments-section">
                    <h3 class="comments-header">Comments</h3>
                    <div id="share-comments-list"></div>
                </div>
                
                <!-- Footer -->
                <div class="share-view-footer">
                    <p>This is a read-only view. To participate in the discussion, visit <a href="https://${mapping.instance}/post/${mapping.postId}" target="_blank">${mapping.instance}</a></p>
                    <div class="share-footer-actions">
                        <button onclick="navigator.clipboard.writeText(window.location.href); this.textContent='Copied!';">Copy Link</button>
                        <button onclick="window.print()">Print</button>
                    </div>
                </div>
            </div>
        `;
        
        // Add comments if available
        const commentsContainer = container.querySelector('#share-comments-list');
        
        if (commentsData && commentsData.comments && commentsData.comments.length > 0) {
            const commentTree = buildCommentTree(commentsData.comments);
            renderCommentTree(commentTree, commentsContainer, 0, postView.creator.id);
            
            // Highlight specific comment if needed
            if (mapping.commentId) {
                setTimeout(() => {
                    const targetComment = container.querySelector(`.share-comment[data-comment-id="${mapping.commentId}"]`);
                    if (targetComment) {
                        targetComment.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        targetComment.classList.add('highlighted-comment');
                    }
                }, 100);
            }
        } else {
            commentsContainer.innerHTML = '<p class="no-comments">No comments yet. Be the first to comment on the original post!</p>';
        }
        
    } catch (error) {
        console.error('Error loading shared content:', error);
        container.innerHTML = `
            <div class="share-error-view">
                <img src="./images/logo.png" alt="Feedstodon" class="error-logo">
                <h2>Content Unavailable</h2>
                <p>This post may have been deleted or the community may be private.</p>
                <p class="error-details">Error: ${error.message}</p>
                <button onclick="window.location.href='/'">Visit Feedstodon</button>
            </div>
        `;
    }
    
    return container;
}

// Helper function for timestamp formatting
function formatTimestamp(timestamp) {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInHours = (now - date) / (1000 * 60 * 60);
    
    if (diffInHours < 24) {
        return timeAgo(timestamp);
    } else {
        return date.toLocaleDateString();
    }
}
