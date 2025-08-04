import { apiFetch } from './api.js';
import { ICONS } from './icons.js';
import { formatTimestamp } from './utils.js';

// ... (buildCommentTree and other functions remain the same)

async function fetchAndRenderComments(state, postId, container, actions) {
    container.innerHTML = `<p>Loading comments...</p>`;
    try {
        const lemmyInstance = localStorage.getItem('lemmy_instance') || state.lemmyInstances[0];
        
        const params = {
            post_id: postId,
            max_depth: 15,
            sort: 'Hot',
            type_: 'All'
        };

        const response = await apiFetch(lemmyInstance, null, '/api/v3/comment/list', {}, 'lemmy', params);
        const commentsData = response.data.comments;

        container.innerHTML = '';
        if (commentsData && commentsData.length > 0) {
            const commentTree = buildCommentTree(commentsData);
            renderCommentTree(commentTree, container, actions);
        } else {
            container.innerHTML = '<div class="status-body-content"><p>No comments yet.</p></div>';
        }
    } catch (err) {
        console.error("Failed to load Lemmy comments:", err);
        container.innerHTML = `<p>Could not load comments. ${err.message}</p>`;
    }
}

export async function renderLemmyPostPage(state, post, actions) {
    const container = document.getElementById('lemmy-post-view');
    
    const validatedPostId = parseInt(post.post.id, 10);
    if (isNaN(validatedPostId)) {
        container.innerHTML = `<p>Error: Invalid Post ID. Cannot load details.</p>`;
        return;
    }

    container.innerHTML = `<p>Loading post...</p>`;

    let thumbnailHTML = '';
    if (post.post.thumbnail_url) {
        thumbnailHTML = `<div class="status-media"><img src="${post.post.thumbnail_url}" alt="${post.post.name}" loading="lazy"></div>`;
    }

    const postHTML = `
        <div class="status lemmy-card" data-post-id="${validatedPostId}">
            // ... (rest of postHTML remains the same)
        </div>
        <button id="reply-to-post-btn" class="button-primary">Reply to Post</button>
        <div id="reply-to-post-container">
            <div class="lemmy-comment-box-container">
                <textarea id="lemmy-new-comment" placeholder="Add a comment..."></textarea>
                <button id="submit-new-lemmy-comment" class="button-primary">Post</button>
            </div>
        </div>
        <div class="lemmy-comment-thread"></div>
    `;

    container.innerHTML = postHTML;

    // --- Event listener for the new slide-down reply box ---
    const replyBtn = document.getElementById('reply-to-post-btn');
    const replyContainer = document.getElementById('reply-to-post-container');
    replyBtn.addEventListener('click', () => {
        replyContainer.classList.toggle('visible');
    });

    document.getElementById('submit-new-lemmy-comment').addEventListener('click', async () => {
        const textarea = document.getElementById('lemmy-new-comment');
        const content = textarea.value.trim();
        if (!content) return;

        try {
            const newComment = await actions.lemmyPostComment({ content: content, post_id: validatedPostId });
            const newCommentEl = renderCommentNode(newComment.comment_view, actions);
            document.querySelector('.lemmy-comment-thread').prepend(newCommentEl);
            textarea.value = '';
            replyContainer.classList.remove('visible'); // Hide after posting
        } catch (err) {
            alert('Failed to post comment.');
        }
    });

    const threadContainer = container.querySelector('.lemmy-comment-thread');
    fetchAndRenderComments(state, validatedPostId, threadContainer, actions);
}
