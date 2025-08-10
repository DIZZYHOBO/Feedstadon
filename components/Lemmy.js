import { apiFetch } from './api.js';
import { ICONS } from './icons.js';

function getBestThumbnail(post) {
    if (post.post.thumbnail_url) return post.post.thumbnail_url;
    if (post.post.url && post.post.url.match(/\.(jpeg|jpg|gif|png)$/)) return post.post.url;
    return '';
}

export function renderLemmyCard(post, actions) {
    const card = document.createElement('div');
    card.className = 'lemmy-card';
    card.dataset.postId = post.post.id;
    const thumbnailUrl = getBestThumbnail(post);

    card.innerHTML = `
        <div class="card-thumbnail" style="${thumbnailUrl ? `background-image: url(${thumbnailUrl})` : ''}"></div>
        <div class="card-content">
            <h3 class="card-title">${post.post.name}</h3>
            <div class="card-meta">
                <span>${post.community.name}</span> | <span>${post.counts.upvotes} ${ICONS.upvote}</span> | <span>${post.counts.comments} ${ICONS.reply}</span>
            </div>
        </div>
    `;

    card.addEventListener('click', () => actions.showLemmyPost(post.post.id));
    return card;
}


export async function renderLemmyPostPage(postId, state, actions) {
    const view = document.getElementById('lemmy-post-view');
    view.innerHTML = `<div class="loading-spinner">${ICONS.refresh}</div>`;
    view.style.display = 'block';

    try {
        const lemmyInstance = localStorage.getItem('lemmy_instance') || state.lemmyInstances[0];
        const { data } = await apiFetch(lemmyInstance, null, `/api/v3/post`, {}, 'lemmy', { id: postId });
        const { data: commentsResponse } = await apiFetch(lemmyInstance, null, '/api/v3/comment/list', {}, 'lemmy', { post_id: postId, sort: 'Hot', max_depth: 8 });
        
        const post = data.post_view;
        const allComments = commentsResponse.comments || [];
        const currentUserPersonId = state.lemmyUser ? state.lemmyUser.person_view.person.id : null;

        const userComments = [];
        const otherComments = [];

        if (currentUserPersonId) {
            allComments.forEach(comment => {
                if (comment.creator.id === currentUserPersonId) {
                    userComments.push(comment);
                } else {
                    otherComments.push(comment);
                }
            });
        } else {
            otherComments.push(...allComments);
        }

        let commentsHtml = otherComments.map(comment => renderLemmyComment(comment)).join('');
        
        if (userComments.length > 0) {
            commentsHtml += `
                <div class="user-comments-box">
                    <h3>Your Comments</h3>
                    ${userComments.map(comment => renderLemmyComment(comment)).join('')}
                </div>
            `;
        }

        view.innerHTML = `
            <div class="lemmy-post-full">
                <button class="close-btn">${ICONS.close}</button>
                <h2>${post.post.name}</h2>
                <div class="post-body">
                    ${post.post.body ? new showdown.Converter().makeHtml(post.post.body) : ''}
                    ${post.post.url ? `<a href="${post.post.url}" target="_blank" rel="noopener noreferrer">${post.post.url}</a>` : ''}
                </div>
                <div class="lemmy-comments-section">
                    <h4>Comments</h4>
                    ${commentsHtml}
                </div>
            </div>
        `;
        
        view.querySelector('.close-btn').addEventListener('click', () => view.style.display = 'none');

    } catch (error) {
        view.innerHTML = `<p>Error loading post. <button class="close-btn">${ICONS.close}</button></p>`;
        view.querySelector('.close-btn').addEventListener('click', () => view.style.display = 'none');
    }
}

function renderLemmyComment(commentData) {
    const comment = commentData.comment;
    const creator = commentData.creator;
    const counts = commentData.counts;

    const replies = commentData.replies?.map(reply => renderLemmyComment(reply)).join('') || '';

    return `
        <div class="lemmy-comment" data-comment-id="${comment.id}">
            <div class="comment-header">
                <img src="${creator.avatar}" class="avatar" alt="${creator.name}'s avatar">
                <span class="display-name">${creator.name}</span>
                <span class="acct">@${creator.actor_id.split('/')[2]}</span>
            </div>
            <div class="comment-body">${new showdown.Converter().makeHtml(comment.content)}</div>
            <div class="comment-actions">
                <span>${counts.score} ${ICONS.upvote}</span>
                <button class="action-btn">${ICONS.reply}</button>
            </div>
            <div class="comment-replies">${replies}</div>
        </div>
    `;
}
