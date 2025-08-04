import { apiFetch } from './api.js';
import { ICONS } from './icons.js';
import { formatTimestamp } from './utils.js';

// --- Helper function to show the reply box ---
function showReplyBox(commentDiv, comment, actions, level) {
    // Prevent multiple reply boxes
    const existingReplyBox = commentDiv.querySelector('.lemmy-reply-box');
    if (existingReplyBox) {
        existingReplyBox.remove();
        return;
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
    const repliesContainer = commentDiv.querySelector('.lemmy-replies');
    commentDiv.insertBefore(replyBox, repliesContainer);
    
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
            
            // Replace the reply box with the new comment
            const newCommentEl = renderLemmyComment(newComment.comment_view, actions, level);
            repliesContainer.prepend(newCommentEl);
            replyBox.remove();

        } catch (err) {
            alert('Failed to post reply.');
        }
    });
}


function renderLemmyComment(comment, actions, level = 0) {
    const commentDiv = document.createElement('div');
    commentDiv.className = 'lemmy-comment';
    commentDiv.style.marginLeft = `${level * 25}px`; // Increased indent for clarity
    commentDiv.dataset.commentId = comment.comment.id;

    const timestamp = formatTimestamp(comment.comment.published);
    const isOwnComment = localStorage.getItem('lemmy_username') === comment.creator.name;

    let userActionsHTML = '';
    if (isOwnComment) {
        userActionsHTML = `
            <button class="status-action" data-action="edit-comment">${ICONS.edit}</button>
            <button class="status-action" data-action="delete-comment">${ICONS.delete}</button>
        `;
    }

    commentDiv.innerHTML = `
        <div class="comment-header">
            <span class="lemmy-user">${comment.creator.name}</span>
            <span class="timestamp">· ${timestamp}</span>
        </div>
        <div class="comment-content">${comment.comment.content}</div>
        <div class="comment-footer">
            <button class="status-action lemmy-comment-vote-btn" data-action="upvote" data-score="1">${ICONS.lemmyUpvote}</button>
            <span class="lemmy-score">${comment.counts.score}</span>
            <button class="status-action lemmy-comment-vote-btn" data-action="downvote" data-score="-1">${ICONS.lemmyDownvote}</button>
            <button class="status-action reply-to-comment-btn" data-action="reply">${ICONS.reply}</button>
            ${userActionsHTML}
        </div>
        <div class="lemmy-replies"></div> 
    `;
    
    // Set initial vote status
    const upvoteBtn = commentDiv.querySelector('[data-action="upvote"]');
    const downvoteBtn = commentDiv.querySelector('[data-action="downvote"]');
    if (comment.my_vote === 1) {
        upvoteBtn.classList.add('active');
    } else if (comment.my_vote === -1) {
        downvoteBtn.classList.add('active');
    }

    // Add event listeners for comment voting and replying
    commentDiv.querySelectorAll('.status-action').forEach(button => {
        button.addEventListener('click', (e) => {
            e.stopPropagation();
            const action = e.currentTarget.dataset.action;
            switch(action) {
                case 'upvote':
                case 'downvote':
                    const score = parseInt(e.currentTarget.dataset.score, 10);
                    actions.lemmyCommentVote(comment.comment.id, score, commentDiv);
                    break;
                case 'reply':
                    showReplyBox(commentDiv, comment, actions, level + 1);
                    break;
                case 'edit-comment':
                    alert('Editing comments coming soon!');
                    break;
                case 'delete-comment':
                    alert('Deleting comments coming soon!');
                    break;
            }
        });
    });

    const repliesContainer = commentDiv.querySelector('.lemmy-replies');
    if (comment.replies && comment.replies.length > 0) {
        comment.replies.forEach(reply => {
            // The 'reply' object is the full comment_view, so we pass it directly
            repliesContainer.appendChild(renderLemmyComment(reply, actions, level + 1));
        });
    }

    return commentDiv;
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
        <div class="lemmy-comment-thread"></div>
    `;

    container.innerHTML = postHTML;
    const postCard = container.querySelector('.lemmy-card');

    // Re-attach event listeners for the main post card on this page
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
                case 'edit-post':
                    alert('Editing posts coming soon!');
                    break;
                case 'delete-post':
                    alert('Deleting posts coming soon!');
                    break;
            }
        });
    });

    // Handle new top-level comments
    document.getElementById('submit-new-lemmy-comment').addEventListener('click', async () => {
        const textarea = document.getElementById('lemmy-new-comment');
        const content = textarea.value.trim();
        if (!content) return;

        try {
            const newComment = await actions.lemmyPostComment({
                content: content,
                post_id: post.post.id,
            });
            const newCommentEl = renderLemmyComment(newComment.comment_view, actions, 0);
            document.querySelector('.lemmy-comment-thread').prepend(newCommentEl);
            textarea.value = '';
        } catch (err) {
            alert('Failed to post comment.');
        }
    });

    const threadContainer = container.querySelector('.lemmy-comment-thread');
    threadContainer.innerHTML = `<p>Loading comments...</p>`;

    try {
        const lemmyInstance = localStorage.getItem('lemmy_instance') || state.lemmyInstances[0];
        const jwt = localStorage.getItem('lemmy_jwt');
        const response = await apiFetch(lemmyInstance, jwt, `/api/v3/comment/list?post_id=${post.post.id}&max_depth=8`);
        const comments = response.data.comments;

        threadContainer.innerHTML = '';
        if (comments && comments.length > 0) {
            comments.forEach(comment => {
                threadContainer.appendChild(renderLemmyComment(comment, actions));
            });
        } else {
            threadContainer.innerHTML = '<div class="status-body-content"><p>No comments yet.</p></div>';
        }
    } catch (err) {
        console.error("Failed to load Lemmy comments:", err);
        threadContainer.innerHTML = '<p>Could not load comments.</p>';
    }
}
