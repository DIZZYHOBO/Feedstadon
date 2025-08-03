import { apiFetch } from './api.js';
import { ICONS } from './icons.js';
import { formatTimestamp } from './utils.js';

function renderLemmyComment(comment, state, level = 0) {
    const commentDiv = document.createElement('div');
    commentDiv.className = 'lemmy-comment';
    commentDiv.style.marginLeft = `${level * 20}px`;
    commentDiv.dataset.commentId = comment.comment.id;

    const timestamp = formatTimestamp(comment.comment.published);

    commentDiv.innerHTML = `
        <div class="comment-header">
            <span class="lemmy-user">${comment.creator.name}</span>
            <span class="timestamp">· ${timestamp}</span>
        </div>
        <div class="comment-content">${comment.comment.content}</div>
        <div class="comment-footer">
            <button class="status-action lemmy-comment-vote-btn" data-action="upvote" data-score="1">▲</button>
            <span class="lemmy-score">${comment.counts.score}</span>
            <button class="status-action lemmy-comment-vote-btn" data-action="downvote" data-score="-1">▼</button>
        </div>
    `;

    // Add event listeners for comment voting
    commentDiv.querySelectorAll('.lemmy-comment-vote-btn').forEach(button => {
        button.addEventListener('click', (e) => {
            e.stopPropagation();
            const score = parseInt(e.currentTarget.dataset.score, 10);
            state.actions.lemmyCommentVote(comment.comment.id, score, commentDiv);
        });
    });

    if (comment.replies && comment.replies.length > 0) {
        const repliesContainer = document.createElement('div');
        repliesContainer.className = 'lemmy-replies';
        comment.replies.forEach(reply => {
            repliesContainer.appendChild(renderLemmyComment(reply, state, level + 1));
        });
        commentDiv.appendChild(repliesContainer);
    }

    return commentDiv;
}

export async function renderLemmyPostPage(state, post, switchView) {
    const container = document.getElementById('lemmy-post-view');
    switchView('lemmy-post');
    container.innerHTML = `<p>Loading post...</p>`;

    let thumbnailHTML = '';
    if (post.post.thumbnail_url) {
        thumbnailHTML = `<div class="lemmy-thumbnail"><img src="${post.post.thumbnail_url}" alt="${post.post.name}" loading="lazy"></div>`;
    }

    const postHTML = `
        <div class="status lemmy-card" data-post-id="${post.post.id}">
            <div class="status-body-content">
                <div class="status-header">
                    <img src="${post.community.icon}" alt="${post.community.name} icon" class="lemmy-community-icon">
                    <div>
                        <span class="display-name">${post.community.name}</span>
                        <span class="acct">posted by ${post.creator.name} · ${formatTimestamp(post.post.published)}</span>
                    </div>
                </div>
                <div class="status-content">
                    <h3 class="lemmy-title">${post.post.name}</h3>
                    ${thumbnailHTML}
                </div>
                <div class="status-footer">
                    <button class="status-action lemmy-vote-btn" data-action="upvote" data-score="1">▲</button>
                    <span class="lemmy-score">${post.counts.score}</span>
                    <button class="status-action lemmy-vote-btn" data-action="downvote" data-score="-1">▼</button>
                    <button class="status-action" data-action="view-comments">${ICONS.reply} ${post.counts.comments}</button>
                    <button class="status-action" data-action="save">${ICONS.bookmark}</button>
                </div>
            </div>
        </div>
        <div class="lemmy-comment-thread"></div>
    `;

    container.innerHTML = postHTML;
    const postCard = container.querySelector('.lemmy-card');

    // Re-attach event listeners for the main post card on this page
    postCard.querySelectorAll('.lemmy-vote-btn').forEach(button => {
        button.addEventListener('click', (e) => {
            e.stopPropagation();
            const score = parseInt(e.currentTarget.dataset.score, 10);
            state.actions.lemmyVote(post.post.id, score, postCard);
        });
    });

    postCard.querySelector('[data-action="save"]').addEventListener('click', (e) => {
        e.stopPropagation();
        state.actions.lemmySave(post.post.id, e.currentTarget);
    });

    const threadContainer = container.querySelector('.lemmy-comment-thread');
    threadContainer.innerHTML = `<p>Loading comments...</p>`;

    try {
        const lemmyInstance = localStorage.getItem('lemmy_instance') || state.lemmyInstances[0];
        const jwt = localStorage.getItem('lemmy_jwt');
        const response = await apiFetch(lemmyInstance, jwt, `/api/v3/post?id=${post.post.id}`);
        const comments = response.data.comments;

        threadContainer.innerHTML = '';
        if (comments && comments.length > 0) {
            comments.forEach(comment => {
                threadContainer.appendChild(renderLemmyComment(comment, state));
            });
        } else {
            threadContainer.innerHTML = '<p>No comments yet.</p>';
        }
    } catch (err) {
        console.error("Failed to load Lemmy comments:", err);
        threadContainer.innerHTML = '<p>Could not load comments.</p>';
    }
}
