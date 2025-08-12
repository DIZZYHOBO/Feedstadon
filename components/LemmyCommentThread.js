import { apiFetch } from './api.js';
import { renderLemmyComment } from './LemmyPost.js';

// Helper function to flatten the comment tree into a sorted list
function flattenAndSortComments(commentTree) {
    const flatList = [];

    function traverse(comments) {
        if (!comments) return;
        comments.forEach(comment => {
            flatList.push(comment);
            // The API response for a single thread might not have a nested 'replies' structure,
            // so we'll rely on the flat list returned by the API.
        });
    }

    traverse(commentTree);

    // Sort by oldest first
    return flatList.sort((a, b) => new Date(a.comment.published) - new Date(b.comment.published));
}

export async function renderLemmyCommentThreadPage(state, actions, postId, commentId) {
    const view = document.getElementById('lemmy-comment-thread-view');
    view.innerHTML = `
        <div class="comment-thread-container">
            <h2>Comment Thread</h2>
            <div class="comment-thread-list">Loading thread...</div>
        </div>
    `;

    const threadListContainer = view.querySelector('.comment-thread-list');
    const lemmyInstance = localStorage.getItem('lemmy_instance');

    try {
        // Fetch the specific comment and its context
        const response = await apiFetch(lemmyInstance, null, `/api/v3/comment?id=${commentId}`, {}, 'lemmy');
        const parentComment = response.data.comment_view;
        
        // Fetch all replies to this specific comment
        const repliesResponse = await apiFetch(lemmyInstance, null, `/api/v3/comment/list?post_id=${postId}&parent_id=${commentId}&max_depth=8&sort=Old`, {}, 'lemmy');
        const replies = repliesResponse.data.comments;

        // Combine the parent and its replies
        const fullThread = [parentComment, ...replies];
        
        // Flatten and sort the thread chronologically
        const sortedThread = flattenAndSortComments(fullThread);

        threadListContainer.innerHTML = '';
        if (sortedThread.length > 0) {
            sortedThread.forEach(commentView => {
                // Use a special class to style the parent comment differently
                const isParent = commentView.comment.id === commentId;
                const commentNode = renderLemmyComment(commentView, state, actions, null, 0, true); // Pass a flag to disable further nesting
                if (isParent) {
                    commentNode.classList.add('thread-parent-comment');
                }
                threadListContainer.appendChild(commentNode);
            });
        } else {
            threadListContainer.innerHTML = '<p>Could not load comment thread.</p>';
        }

    } catch (error) {
        console.error('Failed to render comment thread:', error);
        threadListContainer.innerHTML = '<p>Failed to load comment thread.</p>';
    }
}
