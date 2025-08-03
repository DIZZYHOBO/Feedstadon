import { apiFetch } from './api.js';
import { ICONS } from './icons.js';
import { formatTimestamp } from './utils.js';

function renderLemmyComment(comment, level = 0) {
    const commentDiv = document.createElement('div');
    commentDiv.className = 'lemmy-comment';
    commentDiv.style.marginLeft = `${level * 20}px`;

    const timestamp = formatTimestamp(comment.comment.published);

    commentDiv.innerHTML = `
        <div class="comment-header">
            <span class="lemmy-user">${comment.creator.name}</span>
            <span class="timestamp">· ${timestamp}</span>
        </div>
        <div class="comment-content">${comment.comment.content}</div>
    `;

    if (comment.replies && comment.replies.length > 0) {
        const repliesContainer = document.createElement('div');
        repliesContainer.className = 'lemmy-replies';
        comment.replies.forEach(reply => {
            repliesContainer.appendChild(renderLemmyComment(reply, level + 1));
        });
        commentDiv.appendChild(repliesContainer);
    }

    return commentDiv;
}

export async function renderLemmyPostPage(state, post, switchView) {
    const container = document.getElementById('lemmy-post-view');
    switchView('lemmy-post');
    container.innerHTML = `<p>Loading post...</p>`;

    const communityLink = `!${post.community.name}@${new URL(post.community.actor_id).hostname}`;
    const timestamp = formatTimestamp(post.post.published);

    let mediaHTML = '';
    if (post.post.url && post.post.thumbnail_url) {
        mediaHTML = `<div class="lemmy-thumbnail"><a href="${post.post.url}" target="_blank" rel="noopener noreferrer"><img src="${post.post.thumbnail_url}" alt="${post.post.name}" loading="lazy"></a></div>`;
    }

    const postHTML = `
        <div class="status lemmy-post">
            <div class="status-body-content">
                <h3 class="lemmy-title"><a href="${post.post.ap_id}" target="_blank" rel="noopener noreferrer">${post.post.name}</a></h3>
                ${mediaHTML}
                <div class="lemmy-post-footer">
                    <span class="community-link" data-community-acct="${post.community.name}@${new URL(post.community.actor_id).hostname}">${communityLink}</span> · 
                    <span class="lemmy-user">by ${post.creator.name}</span>
                    <span class="timestamp">· ${timestamp}</span>
                </div>
                <div class="status-footer">
                    <button class="status-action" data-action="reply">${ICONS.reply} ${post.counts.comments}</button>
                    <button class="status-action" data-action="boost">${ICONS.boost} ${post.counts.score}</button>
                </div>
            </div>
        </div>
        <div class="lemmy-comment-thread"></div>
    `;

    container.innerHTML = postHTML;

    const threadContainer = container.querySelector('.lemmy-comment-thread');
    threadContainer.innerHTML = `<p>Loading comments...</p>`;

    try {
        const communityHostname = new URL(post.community.actor_id).hostname;
        const response = await apiFetch(`https://${communityHostname}`, null, `/api/v3/post?id=${post.post.id}`);
        const comments = response.data.comments;

        threadContainer.innerHTML = '';
        if (comments && comments.length > 0) {
            comments.forEach(comment => {
                threadContainer.appendChild(renderLemmyComment(comment));
            });
        } else {
            threadContainer.innerHTML = '<p>No comments yet.</p>';
        }
    } catch (err) {
        console.error("Failed to load Lemmy comments:", err);
        threadContainer.innerHTML = '<p>Could not load comments.</p>';
    }
}
