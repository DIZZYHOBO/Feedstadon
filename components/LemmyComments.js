import { apiFetch } from './api.js';
import { renderLemmyComment } from './LemmyPost.js';
import { ICONS } from './icons.js';

// Simple breadcrumb navigation to show the comment path
function createCommentBreadcrumb(commentChain, actions, postView) {
    const breadcrumb = document.createElement('div');
    breadcrumb.className = 'comment-breadcrumb';
    breadcrumb.innerHTML = `
        <div class="breadcrumb-title">Comment Thread:</div>
        <div class="breadcrumb-path"></div>
    `;
    
    const pathContainer = breadcrumb.querySelector('.breadcrumb-path');
    
    commentChain.forEach((comment, index) => {
        const isLast = index === commentChain.length - 1;
        
        const breadcrumbItem = document.createElement('div');
        breadcrumbItem.className = `breadcrumb-item ${isLast ? 'current' : ''}`;
        
        const author = comment.creator.name;
        const truncatedContent = comment.comment.content.length > 30 
            ? comment.comment.content.substring(0, 30) + '...' 
            : comment.comment.content;
            
        breadcrumbItem.innerHTML = `
            <span class="breadcrumb-author">@${author}</span>
            <span class="breadcrumb-preview">${truncatedContent}</span>
        `;
        
        if (!isLast) {
            breadcrumbItem.addEventListener('click', () => {
                actions.showLemmyCommentThread(postView, comment.comment.id, 'replies');
            });
        }
        
        pathContainer.appendChild(breadcrumbItem);
        
        if (index < commentChain.length - 1) {
            const arrow = document.createElement('div');
            arrow.className = 'breadcrumb-arrow';
            arrow.innerHTML = '→';
            pathContainer.appendChild(arrow);
        }
    });
    
    return breadcrumb;
}

// Build the comment chain from root to target comment
function buildCommentChain(allComments, targetCommentId) {
    const commentMap = {};
    
    // Create lookup map
    allComments.forEach(comment => {
        commentMap[comment.comment.id] = comment;
    });
    
    // Start with the target comment
    let current = commentMap[targetCommentId];
    if (!current) {
        console.log('Target comment not found:', targetCommentId);
        return [];
    }
    
    // Build upward chain (parents) 
    const parents = [];
    let parentCurrent = current;
    
    while (parentCurrent && parentCurrent.comment.parent_id) {
        const parent = commentMap[parentCurrent.comment.parent_id];
        if (parent) {
            parents.unshift(parent); // Add to beginning to maintain order
            parentCurrent = parent;
        } else {
            break;
        }
    }
    
    // Build the complete chain: parents + target
    const chain = [...parents, current];
    
    console.log('Built comment chain:', chain.map(c => c.comment.id));
    return chain;
}

async function loadCommentThread(state, actions, postId, rootCommentId, container, postAuthorId, postView) {
    const lemmyInstance = localStorage.getItem('lemmy_instance') || state.lemmyInstances[0];
    
    try {
        // Get all comments for the post
        const response = await apiFetch(lemmyInstance, null, `/api/v3/comment/list?post_id=${postId}&max_depth=8&sort=Old`, {}, 'lemmy');
        const allComments = response?.data?.comments || [];
        
        if (allComments.length === 0) {
            container.innerHTML = '<p class="no-comments">No comments found.</p>';
            return;
        }

        // Find the root comment (the one that was clicked)
        const rootComment = allComments.find(c => c.comment.id === parseInt(rootCommentId));
        
        if (!rootComment) {
            container.innerHTML = '<p class="error-message">Root comment not found.</p>';
            return;
        }

        console.log('Root comment:', rootComment);
        console.log('Looking for replies to comment ID:', parseInt(rootCommentId));

        // Find direct replies to this comment
        const directReplies = allComments.filter(comment => 
            comment.comment.parent_id === parseInt(rootCommentId)
        );

        console.log('Found direct replies:', directReplies.length);

        // Sort replies by creation time (oldest first)
        directReplies.sort((a, b) => new Date(a.comment.published) - new Date(b.comment.published));

        container.innerHTML = '';
        
        // Build and show breadcrumb
        const commentChain = buildCommentChain(allComments, parseInt(rootCommentId));
        if (commentChain.length > 1) {
            const breadcrumb = createCommentBreadcrumb(commentChain, actions, postView);
            container.appendChild(breadcrumb);
        }
        
        // First, render the root comment (the one that was clicked)
        const rootCommentElement = renderLemmyComment(rootComment, state, actions, postAuthorId);
        rootCommentElement.classList.add('thread-root-comment');
        
        // Override the "View replies" button functionality for this context
        overrideViewRepliesButtons(rootCommentElement, rootComment, actions, postView, allComments);
        
        container.appendChild(rootCommentElement);

        // Add a separator and replies
        if (directReplies.length > 0) {
            const separator = document.createElement('div');
            separator.className = 'replies-separator';
            separator.innerHTML = `<h4>Direct Replies (${directReplies.length})</h4>`;
            container.appendChild(separator);

            // Then render all direct replies (no indentation, full width)
            directReplies.forEach(replyComment => {
                const replyElement = renderLemmyComment(replyComment, state, actions, postAuthorId);
                replyElement.classList.add('direct-reply-comment');
                
                // Override the "View replies" button for replies too
                overrideViewRepliesButtons(replyElement, replyComment, actions, postView, allComments);
                
                container.appendChild(replyElement);
            });
        } else {
            const noReplies = document.createElement('div');
            noReplies.className = 'no-replies';
            noReplies.innerHTML = '<p class="no-comments">No direct replies to this comment.</p>';
            container.appendChild(noReplies);
        }
        
    } catch (error) {
        console.error('Error loading comment thread:', error);
        throw error;
    }
}

function overrideViewRepliesButtons(commentElement, commentView, actions, postView, allComments = null) {
    // Find and override any "View X replies" buttons in this comment
    const viewRepliesBtn = commentElement.querySelector('.view-replies-btn');
    if (viewRepliesBtn) {
        // Remove the old event listener by cloning the node
        const newBtn = viewRepliesBtn.cloneNode(true);
        viewRepliesBtn.parentNode.replaceChild(newBtn, viewRepliesBtn);
        
        // Simple button that navigates to the replies thread
        newBtn.addEventListener('click', () => {
            console.log('Opening replies thread for comment:', commentView.comment.id);
            actions.showLemmyCommentThread(postView, commentView.comment.id);
        });
    }
    
    // Also override any "Read more comments" buttons that might exist
    const readMoreBtns = commentElement.querySelectorAll('.read-more-comments');
    readMoreBtns.forEach(btn => {
        const newBtn = btn.cloneNode(true);
        btn.parentNode.replaceChild(newBtn, btn);
        
        newBtn.addEventListener('click', () => {
            console.log('Opening replies thread for comment:', commentView.comment.id);
            actions.showLemmyCommentThread(postView, commentView.comment.id);
        });
    });
}

// Main export function - Simple threaded comment view
export async function renderLemmyCommentThreadPage(state, actions, postView, rootCommentId) {
    console.log('renderLemmyCommentThreadPage called with:', postView, rootCommentId);
    
    const view = document.getElementById('lemmy-comments-view');
    
    // Simple layout for threaded view
    view.innerHTML = `
        <div class="comment-thread-header">
            <button id="back-to-post-btn" class="nav-button">
                ${ICONS.reply} Back to Post
            </button>
            <h3>Comment Thread</h3>
        </div>
        <div class="comment-thread-container">
            <div class="original-post-preview">
                <div class="post-preview-header">
                    <img src="${postView.community.icon || './images/php.png'}" alt="Community icon" class="avatar">
                    <div>
                        <div class="post-title">${postView.post.name}</div>
                        <div class="post-meta">by ${postView.creator.name} in ${postView.community.name}</div>
                    </div>
                </div>
            </div>
            <div class="comment-thread-list">
                <div class="loading-comments">Loading comment thread...</div>
            </div>
        </div>
    `;

    // Back button functionality
    document.getElementById('back-to-post-btn').addEventListener('click', () => {
        actions.showLemmyPostDetail(postView);
    });

    const threadListContainer = view.querySelector('.comment-thread-list');
    
    try {
        await loadCommentThread(state, actions, postView.post.id, rootCommentId, 
            threadListContainer, postView.creator.id, postView);
    } catch (error) {
        console.error('Failed to load comment thread:', error);
        threadListContainer.innerHTML = '<p class="error-message">Failed to load comment thread.</p>';
    }
}
