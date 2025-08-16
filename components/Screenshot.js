import { ICONS } from './icons.js';
import { apiFetch } from './api.js';
import { renderLemmyCard } from './Lemmy.js';
import { renderLemmyComment } from './LemmyPost.js';

let currentCommentView = null;
let currentPostView = null;
let commentChain = [];
let allComments = [];

async function captureScreenshot() {
    const content = document.getElementById('screenshot-content');
    try {
        const canvas = await html2canvas(content, {
            backgroundColor: getComputedStyle(document.body).getPropertyValue('--bg-color'),
            useCORS: true,
            scale: 2 // Higher scale for better resolution
        });
        const dataUrl = canvas.toDataURL('image/png');
        
        // Create a link and trigger download
        const link = document.createElement('a');
        link.download = `feedstadon-screenshot-${Date.now()}.png`;
        link.href = dataUrl;
        link.click();
    } catch (error) {
        console.error("Failed to capture screenshot:", error);
        alert("Sorry, something went wrong while creating the screenshot.");
    }
}

function getCommentChain(commentView, allComments) {
    const commentMap = {};
    
    // Create lookup map
    allComments.forEach(comment => {
        commentMap[comment.comment.id] = comment;
    });
    
    // Build chain upwards (parents)
    let current = commentView;
    const parents = [];
    while (current && current.comment.parent_id) {
        const parent = commentMap[current.comment.parent_id];
        if (parent) {
            parents.unshift(parent); // Add to beginning
            current = parent;
        } else {
            break;
        }
    }
    
    // Build chain downwards (replies) - improved logic
    const replies = [];
    
    function getDirectReplies(comment) {
        return allComments.filter(c => {
            // Check if this comment is a direct reply to the given comment
            const isDirectReply = c.comment.parent_id === comment.comment.id;
            
            // Also check path-based relationship for better compatibility
            const commentPath = comment.comment.path || '';
            const replyPath = c.comment.path || '';
            const isPathChild = commentPath && replyPath && 
                               replyPath.startsWith(commentPath + '.') &&
                               replyPath.split('.').length === commentPath.split('.').length + 1;
            
            return isDirectReply || isPathChild;
        }).sort((a, b) => new Date(a.comment.published) - new Date(b.comment.published));
    }
    
    function buildReplyChain(comment, depth = 0, maxDepth = 5) {
        if (depth >= maxDepth) return; // Prevent infinite chains
        
        const directReplies = getDirectReplies(comment);
        console.log(`Found ${directReplies.length} direct replies for comment ${comment.comment.id}`);
        
        if (directReplies.length > 0) {
            // Take the first reply to continue the main chain
            const nextReply = directReplies[0];
            replies.push(nextReply);
            
            // Recursively build the chain from this reply
            buildReplyChain(nextReply, depth + 1, maxDepth);
        }
    }
    
    console.log(`Building reply chain from comment ${commentView.comment.id}`);
    buildReplyChain(commentView);
    console.log(`Found ${replies.length} replies in chain`);
    
    return {
        parents: parents,
        target: commentView,
        replies: replies
    };
}

function renderScreenshotContent(state, actions) {
    const screenshotContent = document.getElementById('screenshot-content');
    const includeParents = document.getElementById('include-parents-checkbox').checked;
    const includeReplies = document.getElementById('include-replies-checkbox').checked;
    const hideText = document.getElementById('hide-text-checkbox').checked;
    const hideImages = document.getElementById('hide-images-checkbox').checked;
    
    screenshotContent.innerHTML = '';
    
    // Always show the main post
    const postCard = renderLemmyCard(currentPostView, actions);
    
    // Apply content filters to post
    if (hideText) {
        const textElements = postCard.querySelectorAll('.lemmy-post-body, .lemmy-title');
        textElements.forEach(el => el.style.display = 'none');
    }
    
    if (hideImages) {
        const imageElements = postCard.querySelectorAll('.status-media img, .status-media video');
        imageElements.forEach(el => el.style.display = 'none');
    }
    
    screenshotContent.appendChild(postCard);
    
    // Add separator
    const separator = document.createElement('div');
    separator.style.cssText = `
        height: 20px;
        display: flex;
        align-items: center;
        justify-content: center;
        color: var(--font-color-muted);
        font-size: 14px;
        font-weight: 500;
    `;
    separator.textContent = 'Comments';
    screenshotContent.appendChild(separator);
    
    // Build comment chain
    const chain = getCommentChain(currentCommentView, allComments);
    const commentsToShow = [];
    
    if (includeParents) {
        commentsToShow.push(...chain.parents);
    }
    
    commentsToShow.push(chain.target);
    
    if (includeReplies) {
        commentsToShow.push(...chain.replies);
    }
    
    console.log('Comments to show:', commentsToShow.length);
    console.log('Chain details:', chain);
    
    // Render comment chain
    commentsToShow.forEach((commentView, index) => {
        const commentElement = renderLemmyComment(commentView, state, actions);
        
        // Make username smaller in screenshots
        const usernameElement = commentElement.querySelector('.username-instance');
        if (usernameElement) {
            usernameElement.style.fontSize = '0.9em';
        }
        
        // Apply content filters to comments
        if (hideText) {
            const textElements = commentElement.querySelectorAll('.status-content');
            textElements.forEach(el => el.style.display = 'none');
        }
        
        if (hideImages) {
            const imageElements = commentElement.querySelectorAll('img:not(.avatar)');
            imageElements.forEach(el => el.style.display = 'none');
        }
        
        // Highlight the target comment
        if (commentView.comment.id === currentCommentView.comment.id) {
            commentElement.style.backgroundColor = 'var(--hover-color)';
            commentElement.style.border = '2px solid var(--accent-color)';
        }
        
        // Remove action buttons for cleaner screenshot
        const actionsFooter = commentElement.querySelector('.status-footer');
        if (actionsFooter) {
            actionsFooter.style.display = 'none';
        }
        
        // Remove reply boxes
        const replyBoxes = commentElement.querySelectorAll('.lemmy-reply-box-container, .lemmy-replies-container');
        replyBoxes.forEach(box => box.style.display = 'none');
        
        screenshotContent.appendChild(commentElement);
    });
}

export async function renderScreenshotPage(state, commentView, postView, actions) {
    currentCommentView = commentView;
    currentPostView = postView;
    
    const view = document.getElementById('screenshot-view');
    view.innerHTML = `
        <div class="screenshot-page-container">
            <div class="screenshot-controls">
                <h3>Screenshot Options</h3>
                
                <div class="control-group">
                    <div class="checkbox-group">
                        <input type="checkbox" id="include-parents-checkbox">
                        <label for="include-parents-checkbox">Include parent comments</label>
                    </div>
                    <div class="checkbox-group">
                        <input type="checkbox" id="include-replies-checkbox">
                        <label for="include-replies-checkbox">Include reply comments</label>
                    </div>
                </div>
                
                <div class="control-group">
                    <h4>Content Filters</h4>
                    <div class="checkbox-group">
                        <input type="checkbox" id="hide-text-checkbox">
                        <label for="hide-text-checkbox">Hide text content</label>
                    </div>
                    <div class="checkbox-group">
                        <input type="checkbox" id="hide-images-checkbox">
                        <label for="hide-images-checkbox">Hide images/media</label>
                    </div>
                </div>
                
                <div class="control-actions">
                    <button id="update-preview-btn" class="button-secondary">Update Preview</button>
                    <button id="capture-screenshot-btn" class="button-primary">Take Screenshot</button>
                    <button id="back-to-post-btn" class="button-secondary">Back to Post</button>
                </div>
            </div>
            
            <div class="screenshot-preview">
                <h4>Preview</h4>
                <div id="screenshot-content" class="screenshot-content">
                    <p>Loading preview...</p>
                </div>
            </div>
        </div>
    `;

    // Load all comments for the post to build chains
    try {
        const lemmyInstance = localStorage.getItem('lemmy_instance') || state.lemmyInstances[0];
        const response = await apiFetch(lemmyInstance, null, `/api/v3/comment/list?post_id=${postView.post.id}&max_depth=8&sort=Old`, {}, 'lemmy');
        allComments = response?.data?.comments || [];
        console.log(`Loaded ${allComments.length} comments for screenshot`);
    } catch (error) {
        console.error('Failed to load comments for screenshot:', error);
        allComments = [commentView]; // Fallback to just the target comment
    }

    // Event listeners
    document.getElementById('update-preview-btn').addEventListener('click', () => {
        renderScreenshotContent(state, actions);
    });

    document.getElementById('capture-screenshot-btn').addEventListener('click', () => {
        captureScreenshot();
    });

    document.getElementById('back-to-post-btn').addEventListener('click', () => {
        actions.showLemmyPostDetail(postView);
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
