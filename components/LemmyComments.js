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
        await loadCommentThread(state, actions, postView.post.id, rootCommentId, threadListContainer, postView.creator.id, postView);
    } catch (error) {
        console.error('Failed to load comment thread:', error);
        threadListContainer.innerHTML = '<p class="error-message">Failed to load comment thread.</p>';
    }
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

        // Find direct replies using multiple methods for better compatibility
        let directReplies = [];
        
        // Method 1: Check parent_id directly
        const repliesByParentId = allComments.filter(comment => 
            comment.comment.parent_id === parseInt(rootCommentId)
        );
        
        // Method 2: Check by path if available
        let repliesByPath = [];
        if (rootComment.comment.path) {
            const rootPath = rootComment.comment.path;
            repliesByPath = allComments.filter(comment => {
                if (!comment.comment.path) return false;
                // Check if this comment's path indicates it's a direct child
                const commentPath = comment.comment.path;
                const pathParts = commentPath.split('.');
                const rootPathParts = rootPath.split('.');
                
                // Direct child should have one more level than parent
                return pathParts.length === rootPathParts.length + 1 && 
                       commentPath.startsWith(rootPath + '.');
            });
        }
        
        // Combine both methods and remove duplicates
        const combinedReplies = [...repliesByParentId, ...repliesByPath];
        directReplies = combinedReplies.filter((comment, index, self) => 
            index === self.findIndex(c => c.comment.id === comment.comment.id)
        );
        
        console.log('Found direct replies by parent_id:', repliesByParentId.length);
        console.log('Found direct replies by path:', repliesByPath.length);
        console.log('Total unique direct replies:', directReplies.length);
        console.log('Direct replies:', directReplies.map(r => ({
            id: r.comment.id, 
            parent_id: r.comment.parent_id,
            path: r.comment.path,
            content: r.comment.content.substring(0, 50)
        })));

        // Sort replies by creation time
        directReplies.sort((a, b) => new Date(a.comment.published) - new Date(b.comment.published));

        container.innerHTML = '';
        
        // First, render the root comment (the one that was clicked)
        const rootCommentElement = renderLemmyComment(rootComment, state, actions, postAuthorId);
        rootCommentElement.classList.add('thread-root-comment');
        
        // Override the "View replies" button functionality for this context
        overrideViewRepliesButtons(rootCommentElement, rootComment, actions, postView);
        
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
                overrideViewRepliesButtons(replyElement, replyComment, actions, postView);
                
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

function overrideViewRepliesButtons(commentElement, commentView, actions, postView) {
    // Find and override any "View X replies" buttons in this comment
    const viewRepliesBtn = commentElement.querySelector('.view-replies-btn');
    if (viewRepliesBtn) {
        // Remove the old event listener by cloning the node
        const newBtn = viewRepliesBtn.cloneNode(true);
        viewRepliesBtn.parentNode.replaceChild(newBtn, viewRepliesBtn);
        
        // Add new event listener that opens a new thread page
        newBtn.addEventListener('click', () => {
            console.log('Opening new thread for comment:', commentView.comment.id);
            actions.showLemmyCommentThread(postView, commentView.comment.id);
        });
    }
    
    // Also override any "Read more comments" buttons that might exist
    const readMoreBtns = commentElement.querySelectorAll('.read-more-comments');
    readMoreBtns.forEach(btn => {
        const newBtn = btn.cloneNode(true);
        btn.parentNode.replaceChild(newBtn, btn);
        
        newBtn.addEventListener('click', () => {
            console.log('Opening new thread for comment:', commentView.comment.id);
            actions.showLemmyCommentThread(postView, commentView.comment.id);
        });
    });
}
