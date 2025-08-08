import { apiFetch } from './api.js';
import { ICONS } from './icons.js';
import { formatTimestamp } from './utils.js';
import { renderLemmyCard } from './Lemmy.js';

export function renderComment(commentView, postView, actions) {
    const commentEl = document.createElement('div');
    commentEl.className = 'lemmy-comment';
    commentEl.dataset.id = commentView.comment.id;

    commentEl.innerHTML = `
        <div class="comment-header">
            <img src="${commentView.creator.avatar}" class="avatar" onerror="this.src='./images/logo.png'">
            <span class="display-name">${commentView.creator.name}</span>
            <span class="acct">@${commentView.creator.name}</span>
            <span class="timestamp">· ${formatTimestamp(commentView.comment.published)}</span>
        </div>
        <div class="comment-body">${new showdown.Converter().makeHtml(commentView.comment.content)}</div>
        <div class="status-footer">
            <div class="lemmy-vote-cluster">
                <button class="status-action lemmy-vote-btn ${commentView.my_vote === 1 ? 'active' : ''}" data-action="upvote" data-score="1">${ICONS.lemmyUpvote}</button>
                <span class="lemmy-score">${commentView.counts.score}</span>
                <button class="status-action lemmy-vote-btn ${commentView.my_vote === -1 ? 'active' : ''}" data-action="downvote" data-score="-1">${ICONS.lemmyDownvote}</button>
            </div>
            <button class="status-action" data-action="reply">${ICONS.reply}</button>
        </div>
        <div class="comment-replies-container"></div>
    `;

    commentEl.querySelectorAll('.lemmy-vote-btn').forEach(button => {
        button.addEventListener('click', e => {
            e.stopPropagation();
            const score = parseInt(e.currentTarget.dataset.score, 10);
            actions.lemmyCommentVote(commentView.comment.id, score, commentEl);
        });
    });

    if (commentView.replies) {
        const repliesContainer = commentEl.querySelector('.comment-replies-container');
        commentView.replies.forEach(reply => {
            repliesContainer.appendChild(renderComment(reply, postView, actions));
        });
    }

    return commentEl;
}

export async function renderLemmyPostPage(state, post, actions) {
    const view = document.getElementById('lemmy-post-view');
    view.innerHTML = ''; // Clear previous content

    // Render the main post card first
    const postCard = renderLemmyCard(post, actions);
    view.appendChild(postCard);

    const commentsContainer = document.createElement('div');
    commentsContainer.className = 'lemmy-comments-section';
    view.appendChild(commentsContainer);
    commentsContainer.innerHTML = `<p>Loading comments...</p>`;

    try {
        // Make a dedicated request for the comments
        const lemmyInstance = localStorage.getItem('lemmy_instance') || new URL(post.community.actor_id).hostname;
        const { data } = await apiFetch(lemmyInstance, null, '/api/v3/comment/list', {}, 'lemmy', { 
            post_id: post.post.id,
            sort: 'New',
            max_depth: 8
        });
        
        commentsContainer.innerHTML = ''; // Clear "Loading..." message

        if (data.comments && data.comments.length > 0) {
            data.comments.forEach(comment => {
                commentsContainer.appendChild(renderComment(comment, post, actions));
            });
        } else {
            commentsContainer.innerHTML = `<p>There are no comments yet.</p>`;
        }
    } catch (error) {
        console.error("Failed to load comments:", error);
        commentsContainer.innerHTML = `<p>Could not load comments.</p>`;
    }
}import { apiFetch } from './api.js';
import { ICONS } from './icons.js';
import { formatTimestamp } from './utils.js';
import { renderLemmyCard } from './Lemmy.js';

export function renderComment(commentView, postView, actions) {
    const commentEl = document.createElement('div');
    commentEl.className = 'lemmy-comment';
    commentEl.dataset.id = commentView.comment.id;

    commentEl.innerHTML = `
        <div class="comment-header">
            <img src="${commentView.creator.avatar}" class="avatar" onerror="this.src='./images/logo.png'">
            <span class="display-name">${commentView.creator.name}</span>
            <span class="acct">@${commentView.creator.name}</span>
            <span class="timestamp">· ${formatTimestamp(commentView.comment.published)}</span>
        </div>
        <div class="comment-body">${new showdown.Converter().makeHtml(commentView.comment.content)}</div>
        <div class="status-footer">
            <div class="lemmy-vote-cluster">
                <button class="status-action lemmy-vote-btn ${commentView.my_vote === 1 ? 'active' : ''}" data-action="upvote" data-score="1">${ICONS.lemmyUpvote}</button>
                <span class="lemmy-score">${commentView.counts.score}</span>
                <button class="status-action lemmy-vote-btn ${commentView.my_vote === -1 ? 'active' : ''}" data-action="downvote" data-score="-1">${ICONS.lemmyDownvote}</button>
            </div>
            <button class="status-action" data-action="reply">${ICONS.reply}</button>
        </div>
        <div class="comment-replies-container"></div>
    `;

    commentEl.querySelectorAll('.lemmy-vote-btn').forEach(button => {
        button.addEventListener('click', e => {
            e.stopPropagation();
            const score = parseInt(e.currentTarget.dataset.score, 10);
            actions.lemmyCommentVote(commentView.comment.id, score, commentEl);
        });
    });

    if (commentView.replies) {
        const repliesContainer = commentEl.querySelector('.comment-replies-container');
        commentView.replies.forEach(reply => {
            repliesContainer.appendChild(renderComment(reply, postView, actions));
        });
    }

    return commentEl;
}

export async function renderLemmyPostPage(state, post, actions) {
    const view = document.getElementById('lemmy-post-view');
    view.innerHTML = ''; // Clear previous content

    const postCard = renderLemmyCard(post, actions);
    view.appendChild(postCard);

    const commentsContainer = document.createElement('div');
    commentsContainer.className = 'lemmy-comments-section';
    view.appendChild(commentsContainer);

    try {
        const lemmyInstance = localStorage.getItem('lemmy_instance') || new URL(post.community.actor_id).hostname;
        const { data } = await apiFetch(lemmyInstance, null, '/api/v3/post', {}, 'lemmy', { id: post.post.id });
        
        // --- DEBUGGING LINE ---
        console.log("Data received for post comments:", data); 
        // --- END DEBUGGING LINE ---

        if (data.comments) {
            data.comments.forEach(comment => {
                commentsContainer.appendChild(renderComment(comment, post, actions));
            });
        }
    } catch (error) {
        commentsContainer.innerHTML = `<p>Could not load comments.</p>`;
    }
}
