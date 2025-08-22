import { ICONS } from './icons.js';
import { apiFetch } from './api.js';
import { renderLemmyCard } from './Lemmy.js';
import { renderLemmyComment } from './LemmyPost.js';
import { showToast } from './ui.js';

let currentCommentView = null;
let currentPostView = null;
let allComments = [];

async function captureScreenshot() {
    const content = document.getElementById('screenshot-content');
    
    // Remove any existing borders/padding temporarily for clean capture
    const originalStyles = {
        padding: content.style.padding,
        border: content.style.border,
        background: content.style.background
    };
    
    content.style.padding = '0';
    content.style.border = 'none';
    content.style.background = 'transparent';
    
    try {
        const canvas = await html2canvas(content, {
            backgroundColor: getComputedStyle(document.body).getPropertyValue('--bg-color'),
            useCORS: true,
            scale: 2, // Higher resolution
            logging: false,
            windowWidth: content.scrollWidth,
            windowHeight: content.scrollHeight
        });
        
        // Restore original styles
        Object.assign(content.style, originalStyles);
        
        const dataUrl = canvas.toDataURL('image/png');
        
        // Create download link
        const link = document.createElement('a');
        link.download = `feedstodon-${Date.now()}.png`;
        link.href = dataUrl;
        link.click();
        
        showToast('Screenshot saved!', 'success');
    } catch (error) {
        console.error("Failed to capture screenshot:", error);
        showToast('Failed to capture screenshot', 'error');
        // Restore styles even on error
        Object.assign(content.style, originalStyles);
    }
}

function getCommentChain(targetCommentId, allComments) {
    const commentMap = {};
    
    // Ensure we're working with numbers
    const numericTargetId = parseInt(targetCommentId, 10);
    
    // Create lookup map - map by comment ID
    allComments.forEach(comment => {
        commentMap[comment.comment.id] = comment;
    });
    
    const targetComment = commentMap[numericTargetId];
    if (!targetComment) {
        console.error('Target comment not found:', numericTargetId);
        console.error('Available IDs:', Object.keys(commentMap).slice(0, 10));
        return { parents: [], target: null, replies: [] };
    }
    
    console.log('Target comment found:', {
        id: targetComment.comment.id,
        author: targetComment.creator.name,
        parent_id: targetComment.comment.parent_id,
        path: targetComment.comment.path
    });
    
    // Build parent chain by walking up using parent_id
    const parents = [];
    let currentParentId = targetComment.comment.parent_id;
    
    // Keep walking up the parent chain
    while (currentParentId) {
        console.log('Looking for parent with ID:', currentParentId);
        const parent = commentMap[currentParentId];
        
        if (parent) {
            console.log('Found parent:', {
                id: parent.comment.id,
                author: parent.creator.name,
                parent_id: parent.comment.parent_id
            });
            parents.unshift(parent); // Add to beginning to maintain order from top to bottom
            currentParentId = parent.comment.parent_id; // Move up to next parent
        } else {
            console.log('Parent not found for ID:', currentParentId);
            break;
        }
    }
    
    // Alternative method using path if no parents found
    if (parents.length === 0 && targetComment.comment.path) {
        console.log('Trying path-based parent search...');
        const targetPath = targetComment.comment.path;
        const pathParts = targetPath.split('.');
        
        // Remove the last part (which is the target comment's position)
        // and try to find comments that match parent paths
        for (let i = pathParts.length - 2; i >= 0; i--) {
            const parentPath = pathParts.slice(0, i + 1).join('.');
            
            // Find comment with this exact path
            const parentComment = allComments.find(c => c.comment.path === parentPath);
            if (parentComment && parentComment.comment.id !== numericTargetId) {
                console.log('Found parent via path:', {
                    id: parentComment.comment.id,
                    author: parentComment.creator.name,
                    path: parentComment.comment.path
                });
                parents.unshift(parentComment);
            }
        }
    }
    
    // Get direct replies to the target comment
    // Method 1: Check by parent_id
    let replies = allComments.filter(c => {
        return c.comment.parent_id === numericTargetId;
    });
    
    console.log('Found replies by parent_id:', replies.length);
    
    // Method 2: If no replies found, try using the path system
    if (replies.length === 0 && targetComment.comment.path) {
        console.log('Trying path-based reply search...');
        const targetPath = targetComment.comment.path;
        const targetPathDepth = targetPath.split('.').length;
        
        replies = allComments.filter(comment => {
            // Skip the target comment itself
            if (comment.comment.id === numericTargetId) {
                return false;
            }
            
            // Check if this comment's path indicates it's a child of our target
            const commentPath = comment.comment.path;
            
            // The path should start with our target's path plus a dot
            if (!commentPath.startsWith(targetPath + '.')) {
                return false;
            }
            
            // Check if it's a direct child (one level deeper)
            const commentPathDepth = commentPath.split('.').length;
            return commentPathDepth === targetPathDepth + 1;
        });
        
        console.log('Found replies by path:', replies.length);
    }
    
    // Sort replies by creation time (oldest first)
    replies.sort((a, b) => 
        new Date(a.comment.published) - new Date(b.comment.published)
    );
    
    console.log('=== Final Chain Summary ===');
    console.log(`Parents (${parents.length}):`, parents.map(p => ({ 
        id: p.comment.id, 
        author: p.creator.name,
        parent_id: p.comment.parent_id 
    })));
    console.log(`Target:`, targetComment ? { 
        id: targetComment.comment.id, 
        author: targetComment.creator.name,
        parent_id: targetComment.comment.parent_id 
    } : 'none');
    console.log(`Replies (${replies.length}):`, replies.map(r => ({ 
        id: r.comment.id, 
        author: r.creator.name,
        parent_id: r.comment.parent_id 
    })));
    
    return { parents, target: targetComment, replies };
}
function renderScreenshotContent(state, actions) {
    const screenshotContent = document.getElementById('screenshot-content');
    
    // Get toggle states
    const showTitle = document.getElementById('show-title-checkbox').checked;
    const showBody = document.getElementById('show-body-checkbox').checked;
    const showImages = document.getElementById('show-images-checkbox').checked;
    const includeParents = document.getElementById('include-parents-checkbox').checked;
    const includeReplies = document.getElementById('include-replies-checkbox').checked;
    
    screenshotContent.innerHTML = '';
    screenshotContent.style.background = 'transparent';
    
    console.log('Current comment view:', currentCommentView);
    console.log('Current post view:', currentPostView);
    console.log('All comments available:', allComments.length);
    
    // Render the main post
    const postCard = renderLemmyCard(currentPostView, actions);
    
    // Apply visibility toggles to post
    if (!showTitle) {
        const titleElements = postCard.querySelectorAll('.lemmy-title, .lemmy-title-container');
        titleElements.forEach(el => el.style.display = 'none');
    }
    
    if (!showBody) {
        const bodyElements = postCard.querySelectorAll('.lemmy-post-body');
        bodyElements.forEach(el => el.style.display = 'none');
    }
    
    if (!showImages) {
        const mediaElements = postCard.querySelectorAll('.status-media, .video-embed-container');
        mediaElements.forEach(el => el.style.display = 'none');
    }
    
    // Remove footer actions for cleaner screenshot
    const footer = postCard.querySelector('.status-footer');
    if (footer) footer.remove();
    
    const optionsBtn = postCard.querySelector('.post-options-btn');
    if (optionsBtn) optionsBtn.remove();
    
    const quickReply = postCard.querySelector('.quick-reply-container');
    if (quickReply) quickReply.remove();
    
    screenshotContent.appendChild(postCard);
    
    // Build comment chain
    if (!currentCommentView || !allComments.length) {
        console.log('No comment data available');
        return;
    }
    
    const chain = getCommentChain(currentCommentView.comment.id, allComments);
    console.log('Comment chain built:', chain);
    
    const commentsToShow = [];
    
    // Add comments based on toggle states
    if (includeParents && chain.parents.length > 0) {
        console.log('Including', chain.parents.length, 'parent comments');
        commentsToShow.push(...chain.parents);
    }
    
    // Always include the target comment
    if (chain.target) {
        console.log('Including target comment');
        commentsToShow.push(chain.target);
    }
    
    if (includeReplies && chain.replies.length > 0) {
        console.log('Including', chain.replies.length, 'reply comments');
        commentsToShow.push(...chain.replies);
    }
    
    console.log('Total comments to show:', commentsToShow.length);
    
    // Render comments if any
    if (commentsToShow.length > 0) {
        // Add subtle separator between post and comments
        const separator = document.createElement('div');
        separator.style.cssText = 'height: 10px; background: transparent;';
        screenshotContent.appendChild(separator);
        
        commentsToShow.forEach((commentView, index) => {
            console.log('Rendering comment:', commentView.comment.id, 'by', commentView.creator.name);
            
            const commentElement = renderLemmyComment(commentView, state, actions);
            
         // Only apply image toggle to comments, not body text
// Body text toggle only applies to the main post
            
            if (!showImages) {
                const imageElements = commentElement.querySelectorAll('img:not(.avatar), .comment-image-wrapper');
                imageElements.forEach(el => el.style.display = 'none');
            }
            
            // Highlight the target comment
            if (commentView.comment.id === currentCommentView.comment.id) {
                const statusEl = commentElement.querySelector('.status');
                if (statusEl) {
                    statusEl.style.borderLeft = '3px solid var(--accent-color)';
                    statusEl.style.paddingLeft = '12px';
                }
            }
            
            // Style parent comments with reduced opacity
            if (chain.parents.includes(commentView)) {
                commentElement.style.opacity = '0.85';
            }
            
            // Remove all action buttons and interactive elements
            const elementsToRemove = [
                '.status-footer',
                '.lemmy-reply-box-container', 
                '.lemmy-replies-container',
                '.view-replies-btn',
                '.more-options-btn',
                '.reply-btn',
                '.share-comment-btn'
            ];
            
            elementsToRemove.forEach(selector => {
                const element = commentElement.querySelector(selector);
                if (element) element.remove();
            });
            
            screenshotContent.appendChild(commentElement);
        });
    } else {
        // If no comments to show, add a notice
        const noComments = document.createElement('div');
        noComments.style.cssText = `
            text-align: center;
            padding: 20px;
            color: var(--font-color-muted);
            font-style: italic;
        `;
        noComments.textContent = 'No comments selected for screenshot';
        screenshotContent.appendChild(noComments);
    }
}

export async function renderScreenshotPage(state, commentView, postView, actions) {
    currentCommentView = commentView;
    currentPostView = postView;
    
    const view = document.getElementById('screenshot-view');
    view.innerHTML = `
        <div class="screenshot-container">
            <!-- Clean header -->
            <div class="screenshot-header">
                <button id="back-to-post-btn" class="nav-button">
                    ${ICONS.reply} Back to Post
                </button>
                <h3>Screenshot Creator</h3>
            </div>
            
            <!-- Two-column layout -->
            <div class="screenshot-layout">
                <!-- Controls sidebar -->
                <div class="screenshot-sidebar">
                    <div class="control-card">
                        <h4>Post Content</h4>
                        <div class="control-group">
                            <label class="toggle-control">
                                <input type="checkbox" id="show-title-checkbox" checked>
                                <span>Show Title</span>
                            </label>
                            <label class="toggle-control">
                                <input type="checkbox" id="show-body-checkbox" checked>
                                <span>Show Body Text</span>
                            </label>
                            <label class="toggle-control">
                                <input type="checkbox" id="show-images-checkbox" checked>
                                <span>Show Images/Media</span>
                            </label>
                        </div>
                    </div>
                    
                    <div class="control-card">
                        <h4>Comments</h4>
                        <div class="control-group">
                            <label class="toggle-control">
                                <input type="checkbox" id="include-parents-checkbox" checked>
                                <span>Include Parent Comments</span>
                                <small id="parent-count" class="comment-count"></small>
                            </label>
                            <label class="toggle-control">
                                <input type="checkbox" id="include-replies-checkbox" checked>
                                <span>Include Reply Comments</span>
                                <small id="reply-count" class="comment-count"></small>
                            </label>
                        </div>
                    </div>
                    
                    <div class="control-actions">
                        <button id="capture-screenshot-btn" class="button-primary capture-btn">
                            📸 Capture
                        </button>
                    </div>
                </div>
                
                <!-- Preview area -->
                <div class="screenshot-preview-area">
                    <div class="preview-header">
                        <span>Preview</span>
                        <button id="refresh-preview-btn" class="icon-button" title="Refresh Preview">
                            ${ICONS.refresh}
                        </button>
                    </div>
                    <div id="screenshot-content" class="screenshot-content">
                        <p class="loading-notice">Loading preview...</p>
                    </div>
                </div>
            </div>
        </div>
    `;

    // Load all comments for the post
    try {
        const lemmyInstance = localStorage.getItem('lemmy_instance') || state.lemmyInstances[0];
        const response = await apiFetch(
            lemmyInstance, 
            null, 
            `/api/v3/comment/list?post_id=${postView.post.id}&max_depth=8&sort=Old&limit=500`, 
            {}, 
            'lemmy'
        );
        allComments = response?.data?.comments || [];
        
        console.log(`Loaded ${allComments.length} total comments for post ${postView.post.id}`);
        console.log('Target comment ID:', commentView.comment.id);
        console.log('Sample of comment IDs:', allComments.slice(0, 5).map(c => c.comment.id));
        
        // Update comment counts
        const chain = getCommentChain(commentView.comment.id, allComments);
        
        const parentCount = document.getElementById('parent-count');
        if (parentCount && chain.parents.length > 0) {
            parentCount.textContent = `(${chain.parents.length})`;
        }
        
        const replyCount = document.getElementById('reply-count');
        if (replyCount && chain.replies.length > 0) {
            replyCount.textContent = `(${chain.replies.length})`;
        }
        
        console.log('Comment chain built:', {
            parents: chain.parents.length,
            target: chain.target ? 'found' : 'missing',
            replies: chain.replies.length
        });
        
    } catch (error) {
        console.error('Failed to load comments:', error);
        allComments = [commentView]; // Fallback to just the target comment
    }

    // Event listeners
    document.getElementById('back-to-post-btn').addEventListener('click', () => {
        actions.showLemmyPostDetail(postView);
    });

    document.getElementById('capture-screenshot-btn').addEventListener('click', () => {
        captureScreenshot();
    });

    document.getElementById('refresh-preview-btn').addEventListener('click', () => {
        renderScreenshotContent(state, actions);
        showToast('Preview refreshed', 'info');
    });

    // Auto-update preview when checkboxes change
    const checkboxes = view.querySelectorAll('input[type="checkbox"]');
    checkboxes.forEach(checkbox => {
        checkbox.addEventListener('change', () => {
            renderScreenshotContent(state, actions);
        });
    });

    // Initial render
    setTimeout(() => {
        renderScreenshotContent(state, actions);
    }, 100);
}
