import { ICONS } from './icons.js';
import { apiFetch } from './api.js';
import { renderLemmyPost } from './LemmyPost.js';
import { timeAgo } from './utils.js';

export async function renderLemmyFeed(state, actions, feedType, targetElementId) {
    const lemmyInstance = localStorage.getItem('lemmy_instance') || state.lemmyInstances[0];
    const targetElement = document.getElementById(targetElementId);
    if (!targetElement) return;

    targetElement.innerHTML = '<div class="loading-spinner"></div>';

    let sortType = localStorage.getItem('lemmy_sort_type') || 'Hot';
    let url = `/api/v3/post/list?sort=${sortType}&limit=20`;
    if (feedType === 'subscribed') {
        url += '&type_=Subscribed';
    }

    try {
        const response = await apiFetch(lemmyInstance, state.lemmyAuthToken, url, { method: 'GET' }, 'lemmy');
        const posts = response?.data?.posts;

        targetElement.innerHTML = '';
        if (posts && posts.length > 0) {
            posts.forEach(postView => {
                const postElement = renderLemmyPost(postView, state, actions);
                targetElement.appendChild(postElement);
            });
        } else {
            targetElement.innerHTML = `<p class="empty-feed-message">No posts found on ${lemmyInstance}.</p>`;
        }
    } catch (error) {
        console.error('Failed to fetch Lemmy feed:', error);
        targetElement.innerHTML = `<p class="error-message">Failed to load posts from ${lemmyInstance}.</p>`;
    }
}

export function renderLemmyPost(postView, state, actions) {
    const post = postView.post;
    const community = postView.community;
    const creator = postView.creator;
    const counts = postView.counts;

    const postDiv = document.createElement('div');
    postDiv.className = 'status lemmy-post';
    postDiv.dataset.id = post.id;

    const isImageUrl = post.url && /\.(jpg|jpeg|png|gif|webp)$/i.test(post.url);

    const converter = new showdown.Converter();
    const bodyHtml = post.body ? converter.makeHtml(post.body) : '';

    postDiv.innerHTML = `
        <div class="status-header">
            <img src="${community.icon || 'images/pfp.png'}" class="avatar community-icon" alt="${community.name}" data-community-name="${community.name}">
            <div class="user-info">
                <a href="#" class="community-link" data-community-name="${community.name}">${community.name}</a>
                <div class="user-info-line2">
                    <span>posted by </span>
                    <a href="#" class="user-link" data-user-id="${creator.id}">${creator.name}</a>
                    <span class="time-ago">· ${timeAgo(post.published)}</span>
                </div>
            </div>
        </div>
        <div class="lemmy-post-content" data-post-id="${post.id}">
            <h3>${post.name}</h3>
            ${bodyHtml}
            ${isImageUrl 
                ? `<div class="lemmy-card-image-container"><img src="${post.url}" alt="${post.name}" class="lemmy-card-image" onerror="this.onerror=null;this.src='images/404.png';"></div>` 
                : (post.url ? `<a href="${post.url}" target="_blank" rel="noopener noreferrer" class="post-link-preview">${post.url}</a>` : '')
            }
        </div>
        <div class="status-footer">
            <div class="lemmy-vote-cluster">
                <button class="status-action lemmy-vote-btn" data-action="upvote" title="Upvote">${ICONS.lemmyUpvote}</button>
                <span class="lemmy-score">${counts.score}</span>
                <button class="status-action lemmy-vote-btn" data-action="downvote" title="Downvote">${ICONS.lemmyDownvote}</button>
            </div>
            <button class="status-action view-comments-btn" title="Comments">
                ${ICONS.comments}
                <span>${counts.comments}</span>
            </button>
            <button class="status-action lemmy-save-btn" title="Save">${ICONS.bookmark}</button>
        </div>
    `;

    // Event listeners
    const upvoteBtn = postDiv.querySelector('.lemmy-vote-btn[data-action="upvote"]');
    const downvoteBtn = postDiv.querySelector('.lemmy-vote-btn[data-action="downvote"]');

    if (postView.my_vote === 1) upvoteBtn.classList.add('active');
    if (postView.my_vote === -1) downvoteBtn.classList.add('active');

    upvoteBtn.addEventListener('click', () => actions.lemmyVote(post.id, 1, postDiv));
    downvoteBtn.addEventListener('click', () => actions.lemmyVote(post.id, -1, postDiv));

    const saveBtn = postDiv.querySelector('.lemmy-save-btn');
    if (postView.saved) saveBtn.classList.add('active');
    saveBtn.addEventListener('click', () => actions.lemmySave(post.id, !postView.saved, saveBtn));

    postDiv.querySelector('.view-comments-btn').addEventListener('click', () => actions.showLemmyPostDetail(postView));
    postDiv.querySelector('.lemmy-post-content').addEventListener('click', () => actions.showLemmyPostDetail(postView));

    postDiv.querySelector('.community-link').addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        actions.showLemmyCommunity(e.currentTarget.dataset.communityName);
    });

    postDiv.querySelector('.community-icon').addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        actions.showLemmyCommunity(e.currentTarget.dataset.communityName);
    });

    return postDiv;
}
