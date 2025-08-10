import { apiFetch } from './api.js';
import { ICONS } from './icons.js';

function renderActionButtons(post, currentUser, actions, settings) {
    if (!currentUser) return '';
    return `
        <div class="post-actions">
            <button class="action-btn reply-btn">${ICONS.reply}</button>
            <button class="action-btn boost-btn ${post.reblogged ? 'active' : ''}">${ICONS.boost}</button>
            <button class="action-btn favorite-btn ${post.favourited ? 'active' : ''}">${ICONS.favorite}</button>
            <button class="action-btn bookmark-btn ${post.bookmarked ? 'active' : ''}">${ICONS.bookmark}</button>
        </div>
    `;
}

export function renderStatus(post, currentUser, actions, settings) {
    const postContainer = document.createElement('div');
    postContainer.className = 'post';
    postContainer.dataset.postId = post.id;

    const postContent = `
        <div class="post-header">
            <img src="${post.account.avatar}" class="avatar" alt="${post.account.display_name}'s avatar">
            <div class="post-author">
                <span class="display-name">${post.account.display_name}</span>
                <span class="acct">@${post.account.acct}</span>
            </div>
            <div class="post-timestamp">${new Date(post.created_at).toLocaleString()}</div>
        </div>
        <div class="post-body">${post.content}</div>
        ${renderActionButtons(post, currentUser, actions, settings)}
    `;

    postContainer.innerHTML = postContent;

    if (currentUser) {
        postContainer.querySelector('.reply-btn').addEventListener('click', () => actions.replyToPost(post));
        postContainer.querySelector('.boost-btn').addEventListener('click', () => actions.boostPost(post.id, !post.reblogged));
        postContainer.querySelector('.favorite-btn').addEventListener('click', () => actions.favoritePost(post.id, !post.favourited));
        postContainer.querySelector('.bookmark-btn').addEventListener('click', () => actions.bookmarkPost(post.id, !post.bookmarked));
    }

    postContainer.addEventListener('click', (e) => {
        if (!e.target.closest('.action-btn, a, .post-author')) {
            actions.showFullPost(post.id);
        }
    });

    return postContainer;
}

export async function renderFullPost(postId, state, actions) {
    const { instanceUrl, accessToken, currentUser } = state;
    const postView = document.getElementById('full-post-view');
    postView.innerHTML = `<div class="loading-spinner">${ICONS.refresh}</div>`;
    postView.style.display = 'block';

    try {
        const { data: post } = await apiFetch(instanceUrl, accessToken, `/api/v1/statuses/${postId}`);
        const { data: context } = await apiFetch(instanceUrl, accessToken, `/api/v1/statuses/${postId}/context`);
        
        const replies = context.descendants || [];
        const userComments = [];
        const otherComments = [];

        if (currentUser) {
            replies.forEach(reply => {
                if (reply.account.id === currentUser.id) {
                    userComments.push(reply);
                } else {
                    otherComments.push(reply);
                }
            });
        } else {
            otherComments.push(...replies);
        }

        let commentsHtml = otherComments.map(reply => renderStatus(reply, currentUser, actions, state.settings).outerHTML).join('');
        
        if (userComments.length > 0) {
            commentsHtml += `
                <div class="user-comments-box">
                    <h3>Your Comments</h3>
                    ${userComments.map(reply => renderStatus(reply, currentUser, actions, state.settings).outerHTML).join('')}
                </div>
            `;
        }

        postView.innerHTML = `
            <div class="full-post-container">
                <button class="close-btn">${ICONS.close}</button>
                <div class="post-main">
                    ${renderStatus(post, currentUser, actions, state.settings).outerHTML}
                </div>
                <div class="post-replies">
                    ${commentsHtml}
                </div>
            </div>
        `;

        postView.querySelector('.close-btn').addEventListener('click', () => postView.style.display = 'none');
        
        // Re-attach event listeners for dynamically added elements
        postView.querySelectorAll('.post').forEach(postEl => {
            const id = postEl.dataset.postId;
            if (id !== postId) { // Don't re-add listeners to the main post
                 const replyPost = replies.find(r => r.id === id);
                 if(replyPost) {
                    postEl.querySelector('.reply-btn')?.addEventListener('click', () => actions.replyToPost(replyPost));
                    postEl.querySelector('.boost-btn')?.addEventListener('click', () => actions.boostPost(id, !replyPost.reblogged));
                    postEl.querySelector('.favorite-btn')?.addEventListener('click', () => actions.favoritePost(id, !replyPost.favourited));
                    postEl.querySelector('.bookmark-btn')?.addEventListener('click', () => actions.bookmarkPost(id, !replyPost.bookmarked));
                 }
            }
        });

    } catch (error) {
        postView.innerHTML = `<p>Error loading post. <button class="close-btn">${ICONS.close}</button></p>`;
        postView.querySelector('.close-btn').addEventListener('click', () => postView.style.display = 'none');
    }
}
