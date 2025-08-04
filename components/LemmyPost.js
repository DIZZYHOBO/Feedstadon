import { apiFetch } from './api.js';
import { ICONS } from './icons.js';
import { formatTimestamp } from './utils.js';

// --- Helper function to show the reply box ---
function showReplyBox(commentDiv, comment, actions) {
    // Prevent multiple reply boxes by removing any that might already be open
    const existingReplyBox = document.querySelector('.lemmy-reply-box');
    if (existingReplyBox) {
        existingReplyBox.remove();
    }

    const replyBox = document.createElement('div');
    replyBox.className = 'lemmy-reply-box';
    replyBox.innerHTML = `
        <textarea class="reply-textarea" placeholder="Write your reply..."></textarea>
        <div class="reply-actions">
            <button class="cancel-reply-btn button-secondary">Cancel</button>
            <button class="submit-reply-btn">Reply</button>
        </div>
    `;

    // Append it after the comment's content but before any nested replies
    const mainCommentContainer = commentDiv.querySelector('.comment-main');
    mainCommentContainer.insertAdjacentElement('afterend', replyBox);

    replyBox.querySelector('.cancel-reply-btn').addEventListener('click', () => {
        replyBox.remove();
    });

    replyBox.querySelector('.submit-reply-btn').addEventListener('click', async () => {
        const textarea = replyBox.querySelector('.reply-textarea');
        const content = textarea.value.trim();
        if (!content) return;

        try {
            const newComment = await actions.lemmyPostComment({
                content: content,
                post_id: comment.post.id,
                parent_id: comment.comment.id
            });

            // Add the new comment to the replies container
            const newCommentEl = renderCommentNode(newComment.comment_view, actions);
            commentDiv.querySelector('.lemmy-replies').prepend(newCommentEl);
            replyBox.remove();

        } catch (err) {
            alert('Failed to post reply.');
        }
    });
}


function renderCommentNode(commentView, actions) {
    const comment = commentView.comment;
    const creator = commentView.creator;
    const counts = commentView.counts;

    const commentWrapper = document.createElement('div');
    commentWrapper.className = 'lemmy-comment-wrapper';
    // Add a unique ID to the wrapper for easy DOM manipulation
    commentWrapper.id = `comment-wrapper-${comment.id}`;


    let userActionsHTML = '';
    const isOwnComment = localStorage.getItem('lemmy_username') === creator.name;
    if (isOwnComment) {
        userActionsHTML = `
            <button class="status-action" data-action="edit-comment">${ICONS.edit}</button>
            <button class="status-action" data-action="delete-comment">${ICONS.delete}</button>
        `;
    }

    commentWrapper.innerHTML = `
        <div class="lemmy-comment" data-comment-id="${comment.id}">
            <div class="comment-main">
                <div class="comment-header">
                    <span class="lemmy-user">${creator.name}</span>
                    <span class="timestamp">· ${formatTimestamp(comment.published)}</span>
                </div>
                <div class="comment-content">${comment.content}</div>
                <div class="comment-footer">
                    <button class="status-action lemmy-comment-vote-btn" data-action="upvote" data-score="1">${ICONS.lemmyUpvote}</button>
                    <span class="lemmy-score">${counts.score}</span>
                    <button class="status-action lemmy-comment-vote-btn" data-action="downvote" data-score="-1">${ICONS.lemmyDownvote}</button>
                    <button class="status-action reply-to-comment-btn" data-action="reply">${ICONS.reply}</button>
                    ${userActionsHTML}
                </div>
            </div>
        </div>
        <div class="lemmy-replies"></div>
    `;

    const commentDiv = commentWrapper.querySelector('.lemmy-comment');

    // Set initial vote status
    const upvoteBtn = commentDiv.querySelector('[data-action="upvote"]');
    const downvoteBtn = commentDiv.querySelector('[data-action="downvote"]');
    if (commentView.my_vote === 1) upvoteBtn.classList.add('active');
    if (commentView.my_vote === -1) downvoteBtn.classList.add('active');

    // Add event listeners
    commentDiv.querySelectorAll('.status-action').forEach(button => {
        button.addEventListener('click', (e) => {
            e.stopPropagation();
            const action = e.currentTarget.dataset.action;
            switch(action) {
                case 'upvote':
                case 'downvote':
                    const score = parseInt(e.currentTarget.dataset.score, 10);
                    actions.lemmyCommentVote(comment.id, score, commentDiv);
                    break;
                case 'reply':
                    showReplyBox(commentDiv, commentView, actions);
                    break;
                case 'edit-comment':
                case 'delete-comment':
                    alert('Coming soon!');
                    break;
            }
        });
    });

    return commentWrapper;
}

async function fetchAndRenderComments(state, postId, sortType, container, actions) {
    container.innerHTML = `<p>Loading comments...</p>`;
    try {
        const lemmyInstance = localStorage.getItem('lemmy_instance') || state.lemmyInstances[0];
        // Increase the limit to get more comments, increasing the chance parents are included
        const response = await apiFetch(lemmyInstance, null, `/api/v3/comment/list?post_id=${postId}&sort_type=${sortType}&limit=100`, {}, 'lemmy');
        const commentsData = response.data.comments;

        container.innerHTML = '';
        if (commentsData && commentsData.length > 0) {
            // Render all comments first
            commentsData.forEach(commentView => {
                const commentElement = renderCommentNode(commentView, actions);
                container.appendChild(commentElement);
            });

            // Then, iterate again to move replies to their parents
            commentsData.forEach(commentView => {
                const parentId = commentView.comment.parent_id;
                if (parentId) {
                    const parentWrapper = document.getElementById(`comment-wrapper-${parentId}`);
                    if (parentWrapper) {
                        const replyContainer = parentWrapper.querySelector('.lemmy-replies');
                        const commentWrapper = document.getElementById(`comment-wrapper-${commentView.comment.id}`);
                        if (replyContainer && commentWrapper) {
                            replyContainer.appendChild(commentWrapper);
                        }
                    }
                }
            });

        } else {
            container.innerHTML = '<div class="status-body-content"><p>No comments yet.</p></div>';
        }
    } catch (err) {
        console.error("Failed to load Lemmy comments:", err);
        container.innerHTML = '<p>Could not load comments.</p>';
    }
}


export async function renderLemmyPostPage(state, post, actions) {
    const container = document.getElementById('lemmy-post-view');
    container.innerHTML = `<p>Loading post...</p>`;

    let thumbnailHTML = '';
    if (post.post.thumbnail_url) {
        thumbnailHTML = `<div class="status-media"><img src="${post.post.thumbnail_url}" alt="${post.post.name}" loading="lazy"></div>`;
    }

    const isOwnPost = localStorage.getItem('lemmy_username') === post.creator.name;
    let userActionsHTML = '';
    if(isOwnPost) {
        userActionsHTML = `
            <button class="status-action" data-action="edit-post">${ICONS.edit}</button>
            <button class="status-action" data-action="delete-post">${ICONS.delete}</button>
        `;
    }

    const postHTML = `
        <div class="status lemmy-card" data-post-id="${post.post.id}">
            <div class="status-body-content">
                <div class="status-header">
                    <img src="${post.community.icon}" alt="${post.community.name} icon" class="avatar">
                    <div>
                        <span class="display-name">${post.community.name}</span>
                        <span class="acct">posted by ${post.creator.name} · ${formatTimestamp(post.post.published)}</span>
                    </div>
                </div>
                <div class="status-content">
                    <h3 class="lemmy-title">${post.post.name}</h3>
                    <p>${post.post.body || ''}</p>
                </div>
                ${thumbnailHTML}
                <div class="status-footer">
                    <button class="status-action lemmy-vote-btn" data-action="upvote" data-score="1">${ICONS.lemmyUpvote}</button>
                    <span class="lemmy-score">${post.counts.score}</span>
                    <button class="status-action lemmy-vote-btn" data-action="downvote" data-score="-1">${ICONS.lemmyDownvote}</button>
                    <button class="status-action" data-action="view-comments">${ICONS.reply} ${post.counts.comments}</button>
                    <button class="status-action" data-action="save">${ICONS.bookmark}</button>
                    ${userActionsHTML}
                </div>
            </div>
        </div>
        <div class="lemmy-comment-box-container">
            <textarea id="lemmy-new-comment" placeholder="Add a comment..."></textarea>
            <button id="submit-new-lemmy-comment" class="button-primary">Post</button>
        </div>
        <div class="filter-bar lemmy-comment-filter-bar">
             <select class="lemmy-comment-sort-select">
                <option value="Old">Oldest First</option>
                <option value="New">Newest First</option>
                <option value="Hot">Hot</option>
                <option value="Top">Top</option>
            </select>
        </div>
        <div class="lemmy-comment-thread"></div>
    `;

    container.innerHTML = postHTML;
    const postCard = container.querySelector('.lemmy-card');

    postCard.querySelectorAll('.status-action').forEach(button => {
        button.addEventListener('click', (e) => {
            e.stopPropagation();
            const action = e.currentTarget.dataset.action;
            switch(action) {
                case 'upvote':
                case 'downvote':
                     const score = parseInt(e.currentTarget.dataset.score, 10);
                     actions.lemmyVote(post.post.id, score, postCard);
                     break;
                case 'save':
                     actions.lemmySave(post.post.id, e.currentTarget);
                     break;
            }
        });
    });

    document.getElementById('submit-new-lemmy-comment').addEventListener('click', async () => {
        const textarea = document.getElementById('lemmy-new-comment');
        const content = textarea.value.trim();
        if (!content) return;

        try {
            const newComment = await actions.lemmyPostComment({ content: content, post_id: post.post.id });
            const newCommentEl = renderCommentNode(newComment.comment_view, actions);
            document.querySelector('.lemmy-comment-thread').prepend(newCommentEl);
            textarea.value = '';
        } catch (err) {
            alert('Failed to post comment.');
        }
    });

    const threadContainer = container.querySelector('.lemmy-comment-thread');
    const sortSelect = container.querySelector('.lemmy-comment-sort-select');

    sortSelect.addEventListener('change', () => {
        fetchAndRenderComments(state, post.post.id, sortSelect.value, threadContainer, actions);
    });

    // Initial comment load
    fetchAndRenderComments(state, post.post.id, sortSelect.value, threadContainer, actions);
}
