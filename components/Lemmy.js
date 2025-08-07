import { apiFetch } from './api.js';
import { ICONS } from './icons.js';
import { formatTimestamp } from './utils.js';
import { showContextMenu } from './ui.js';

export function renderLemmyCard(post, state, actions) {
    const postDiv = document.createElement('div');
    postDiv.className = 'status lemmy-card';
    postDiv.dataset.id = post.post.id;

    const community = post.community;
    const creator = post.creator;
    const counts = post.counts;
    const myVote = post.my_vote;

    postDiv.innerHTML = `
        <div class="status-body-content">
            <div class="status-header">
                <div class="status-header-main">
                    <img src="${community.icon}" alt="${community.name}'s icon" class="avatar">
                    <div>
                        <a href="#" class="display-name" data-community-id="${community.id}">${community.name}</a>
                        <div class="acct">posted by <a href="#" data-user-id="${creator.id}">@${creator.name}</a></div>
                    </div>
                </div>
                <div class="status-header-side">
                    <div class="lemmy-icon-indicator">${ICONS.lemmy}</div>
                    <div class="timestamp" title="${new Date(post.post.published).toLocaleString()}">${formatTimestamp(post.post.published)}</div>
                </div>
            </div>
            <h3 class="lemmy-title">${post.post.name}</h3>
            ${post.post.body ? `<div class="status-content lemmy-body">${post.post.body}</div>` : ''}
            ${post.post.url ? `<a href="${post.post.url}" target="_blank" class="lemmy-link-preview">${post.post.url}</a>` : ''}
            ${post.post.thumbnail_url ? `<div class="status-media"><img src="${post.post.thumbnail_url}" alt="thumbnail" class="status-media-attachment"></div>` : ''}
        </div>
        <div class="status-footer">
            <div class="lemmy-vote-cluster">
                <button class="status-action lemmy-vote-btn upvote ${myVote === 1 ? 'active' : ''}">${ICONS.lemmyUpvote}</button>
                <span class="lemmy-score">${counts.score}</span>
                <button class="status-action lemmy-vote-btn downvote ${myVote === -1 ? 'active' : ''}">${ICONS.lemmyDownvote}</button>
            </div>
            <button class="status-action comments-btn">${ICONS.comments} <span>${counts.comments}</span></button>
        </div>
    `;

    // Event Listeners
    postDiv.querySelector('.upvote').addEventListener('click', (e) => {
        e.stopPropagation();
        // Add upvote logic here
    });

    postDiv.querySelector('.downvote').addEventListener('click', (e) => {
        e.stopPropagation();
        // Add downvote logic here
    });

    return postDiv;
}
