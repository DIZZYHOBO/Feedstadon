import { apiFetch } from './api.js';
import { renderLemmyComment } from './LemmyPost.js';
import { ICONS } from './icons.js';

export async function renderLemmyCommentThreadPage(state, actions, postView, rootCommentId) {
    const view = document.getElementById('lemmy-comments-view');
    
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
        await loadCommentThread(state, actions, postView.post.id, rootCommentId, threadListContainer, postView.creator.id);
    } catch (error) {
        console.error('Failed to load comment thread:', error);
        threadListContainer.innerHTML = '<p class="error-message">Failed to load comment thread.</p>';
    }
}

async function loadCommentThread(state, actions, postId, rootCommentId, container, postAuthorId) {
    const lemmyInstance = localStorage.getItem('lemmy_instance') || state.lemmyInstances[0];
    
    try {
        // Get all comments for the post
        const response = await apiFetch(lemmyInstance, null, `/api/v3/comment/list?post_id=${postId}&max_depth=8&sort=Old`, {}, 'lemmy');
        const allComments = response?.data?.comments || [];
        
        if (allComments.length === 0) {
            container.innerHTML = '<p class="no-comments">No comments found.</p>';
            return;
        }

        // Find the root comment and build the thread
        const rootComment = allComments.find(c => c.comment.id === parseInt(rootCommentId));
        
        if (!rootComment) {
            container.innerHTML = '<p class="error-message">Root comment not found.</p>';
            return;
        }

        // Build the comment thread in chronological order
        const threadComments = buildCommentThread(allComments, rootCommentId);
        
        container.innerHTML = '';
        
        if (threadComments.length > 0) {
            threadComments.forEach((commentView, index) => {
                const commentElement = renderLemmyComment(commentView, state, actions, postAuthorId);
                
                // Add thread styling
                commentElement.classList.add('thread-comment');
                
                // Add depth indicator
                const depth = getCommentDepth(commentView, rootCommentId, allComments);
                if (depth > 0) {
                    commentElement.style.borderLeft = `3px solid var(--accent-color)`;
                    commentElement.style.marginLeft = `${Math.min(depth * 15, 45)}px`;
                    commentElement.style.paddingLeft = '15px';
                }
                
                // Add thread position indicator
                if (index === 0) {
                    commentElement.classList.add('thread-root');
                }
                
                container.appendChild(commentElement);
            });
        } else {
            container.innerHTML = '<p class="no-comments">No comments in this thread.</p>';
        }
        
    } catch (error) {
        console.error('Error loading comment thread:', error);
        throw error;
    }
}

function buildCommentThread(allComments, rootCommentId) {
    const rootId = parseInt(rootCommentId);
    const threadComments = [];
    
    // Find the root comment
    const rootComment = allComments.find(c => c.comment.id === rootId);
    if (!rootComment) return [];
    
    // Add the root comment first
    threadComments.push(rootComment);
    
    // Function to recursively find children
    function findChildren(parentId, depth = 0) {
        const children = allComments
            .filter(c => c.comment.parent_id === parentId)
            .sort((a, b) => new Date(a.comment.published) - new Date(b.comment.published));
        
        children.forEach(child => {
            threadComments.push(child);
            // Recursively find children of this child
            findChildren(child.comment.id, depth + 1);
        });
    }
    
    // Find all descendants of the root comment
    findChildren(rootId);
    
    return threadComments;
}

function getCommentDepth(commentView, rootCommentId, allComments) {
    let depth = 0;
    let currentComment = commentView;
    const rootId = parseInt(rootCommentId);
    
    // Trace back to the root comment, counting levels
    while (currentComment && currentComment.comment.parent_id && currentComment.comment.id !== rootId) {
        const parentId = currentComment.comment.parent_id;
        currentComment = allComments.find(c => c.comment.id === parentId);
        depth++;
        
        // Safety check to prevent infinite loops
        if (depth > 20) break;
    }
    
    return depth;
}
