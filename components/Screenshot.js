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
    allComments.forEach(comment => {
        commentMap[comment.comment.id] = comment;
    });
    
    const targetComment = commentMap[targetCommentId];
    if (!targetComment) return { parents: [], target: null, replies: [] };
    
    // Get parent chain
    const parents = [];
    let current = targetComment;
    while (current && current.comment.parent_id) {
        const parent = commentMap[current.comment.parent_id];
        if (parent) {
            parents.unshift(parent);
            current = parent;
        } else {
            break;
        }
    }
    
    // Get direct replies
    const replies = allComments.filter(c => 
        c.comment.parent_id === targetCommentId
    ).sort((a, b) => 
        new Date(a.comment.published) - new Date(b.comment.published)
    );
    
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
    
    // Remove options button
    const optionsBtn = postCard.querySelector('.post-options-btn');
    if (optionsBtn) optionsBtn.remove();
    
    screenshotContent.appendChild(postCard);
    
    // Build comment chain - FIXED to ensure we have the comment data
    if (!currentCommentView || !allComments.length) {
        console.log('No comment data available');
        return;
    }
    
    const chain = getCommentChain(currentCommentView.comment.id, allComments);
    const commentsToShow = [];
    
    // Debug logging
    console.log('Chain parents:', chain.parents.length);
    console.log('Chain replies:', chain.replies.length);
    console.log('Include parents checkbox:', includeParents);
    console.log('Include replies checkbox:', includeReplies);
    
    if (includeParents && chain.parents.length > 0) {
        commentsToShow.push(...chain.parents);
    }
    
    if (chain.target) {
        commentsToShow.push(chain.target);
    }
    
    if (includeReplies && chain.replies.length > 0) {
        commentsToShow.push(...chain.replies);
    }
    
    // Render comments if any
    if (commentsToShow.length > 0) {
        // Add subtle separator between post and comments
        const separator = document.createElement('div');
        separator.style.cssText = 'height: 10px; background: transparent;';
        screenshotContent.appendChild(separator);
        
        commentsToShow.forEach((commentView, index) => {
            const commentElement = renderLemmyComment(commentView, state, actions);
            
            // Apply visibility toggles to comments
            if (!showBody) {
                const contentElements = commentElement.querySelectorAll('.status-content');
                contentElements.forEach(el => {
                    // Keep the comment structure but hide the text content
                    const paragraphs = el.querySelectorAll('p, div:not(.comment-image-wrapper)');
                    paragraphs.forEach(p => {
                        if (!p.querySelector('img')) {
                            p.style.display = 'none';
                        }
                    });
                });
            }
            
            if (!showImages) {
                const imageElements = commentElement.querySelectorAll('img:not(.avatar), .comment-image-wrapper');
                imageElements.forEach(el => el.style.display = 'none');
            }
            
            // Highlight the target comment
            if (commentView.comment.id === currentCommentView.comment.id) {
                commentElement.style.cssText += `
                    background: linear-gradient(90deg, 
                        var(--accent-color) 3px, 
                        var(--card-color) 3px);
                    border-left: 3px solid var(--accent-color);
                `;
            }
            
            // Style parent comments differently
            if (chain.parents.includes(commentView)) {
                commentElement.style.opacity = '0.8';
            }
            
            // Remove action buttons from comments
            const footer = commentElement.querySelector('.status-footer');
            if (footer) footer.remove();
            
            const replyContainer = commentElement.querySelector('.lemmy-reply-box-container');
            if (replyContainer) replyContainer.remove();
            
            const repliesContainer = commentElement.querySelector('.lemmy-replies-container');
            if (repliesContainer) repliesContainer.remove();
            
            const viewRepliesBtn = commentElement.querySelector('.view-replies-btn');
            if (viewRepliesBtn) viewRepliesBtn.remove();
            
            screenshotContent.appendChild(commentElement);
        });
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
                        <button id="capture-screenshot-btn" class="button-primary">
                            ${ICONS.screenshot || '📸'} Capture Screenshot
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
            `/api/v3/comment/list?post_id=${postView.post.id}&max_depth=8&sort=Old`, 
            {}, 
            'lemmy'
        );
        allComments = response?.data?.comments || [];
        
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

// Add these styles to your style.css or include them inline
const screenshotStyles = `
<style>
.screenshot-container {
    padding: 20px;
    max-width: 1400px;
    margin: 0 auto;
}

.screenshot-header {
    display: flex;
    align-items: center;
    gap: 20px;
    margin-bottom: 20px;
    padding-bottom: 15px;
    border-bottom: 1px solid var(--border-color);
}

.screenshot-header h3 {
    margin: 0;
    color: var(--font-color);
}

.screenshot-layout {
    display: flex;
    gap: 20px;
}

.screenshot-sidebar {
    flex: 0 0 280px;
    display: flex;
    flex-direction: column;
    gap: 15px;
}

.control-card {
    background: var(--card-color);
    border: 1px solid var(--border-color);
    border-radius: var(--border-radius);
    padding: 15px;
}

.control-card h4 {
    margin: 0 0 15px 0;
    color: var(--font-color);
    font-size: 14px;
    font-weight: 600;
}

.control-group {
    display: flex;
    flex-direction: column;
    gap: 12px;
}

.toggle-control {
    display: flex;
    align-items: center;
    gap: 8px;
    cursor: pointer;
    color: var(--font-color);
    font-size: 14px;
}

.toggle-control input[type="checkbox"] {
    width: auto;
    margin: 0;
    cursor: pointer;
}

.toggle-control span {
    flex: 1;
}

.toggle-control small {
    color: var(--font-color-muted);
    font-size: 12px;
}

.comment-count {
    margin-left: auto;
    background: var(--bg-color);
    padding: 2px 6px;
    border-radius: var(--border-radius);
}

.control-actions {
    margin-top: auto;
}

.control-actions button {
    width: 100%;
    padding: 8px 12px;
    font-size: 14px;
    font-weight: 500;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
}

.screenshot-preview-area {
    flex: 1;
    display: flex;
    flex-direction: column;
}

.preview-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 10px 15px;
    background: var(--card-color);
    border: 1px solid var(--border-color);
    border-radius: var(--border-radius) var(--border-radius) 0 0;
    border-bottom: none;
}

.preview-header span {
    color: var(--font-color);
    font-weight: 600;
    font-size: 14px;
}

.screenshot-content {
    flex: 1;
    background: var(--bg-color);
    border: 1px solid var(--border-color);
    border-radius: 0 0 var(--border-radius) var(--border-radius);
    padding: 20px;
    overflow: auto;
    min-height: 400px;
}

.screenshot-content .status {
    margin-bottom: 10px;
}

.screenshot-content .status:last-child {
    margin-bottom: 0;
}

.screenshot-content .comment-wrapper {
    margin-bottom: 10px;
}

.screenshot-content .comment-wrapper:last-child {
    margin-bottom: 0;
}

.loading-notice {
    text-align: center;
    color: var(--font-color-muted);
    padding: 40px;
}

/* Mobile responsive */
@media (max-width: 768px) {
    .screenshot-layout {
        flex-direction: column;
    }
    
    .screenshot-sidebar {
        flex: none;
        width: 100%;
    }
    
    .control-card {
        padding: 12px;
    }
}
</style>
`;

// Export styles for inclusion
export const screenshotCSS = screenshotStyles;
