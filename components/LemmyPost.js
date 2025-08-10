import { ICONS } from './icons.js';
import { timeSince } from './utils.js';
import { renderLoginPrompt } from './ui.js';

export function renderLemmyPost(postData, actions, settings) {
    const post = postData.post;
    const community = postData.community;
    const creator = postData.creator;
    const counts = postData.counts;

    const card = document.createElement('div');
    card.className = 'status lemmy-card';
    card.dataset.id = post.id;

    const thumbnailHTML = post.thumbnail_url ? `<img src="${post.thumbnail_url}" class="lemmy-thumbnail" alt="thumbnail">` : '';

    card.innerHTML = `
        <div class="lemmy-vote-sidebar">
            <button class="lemmy-vote-btn upvote">${ICONS.upvote}</button>
            <span class="lemmy-score">${counts.score}</span>
            <button class="lemmy-vote-btn downvote">${ICONS.downvote}</button>
        </div>
        <div class="status-body-content">
            <div class="status-header">
                <div class="status-header-main">
                    <img src="${community.icon}" alt="${community.name}" class="avatar">
                    <div>
                        <a href="${community.actor_id}" target="_blank" class="lemmy-community-link">${community.name}</a>
                        <div class="acct">Posted by <a href="${creator.actor_id}" target="_blank">@${creator.name}</a></div>
                    </div>
                </div>
                <div class="status-header-side">
                    <span class="timestamp">${timeSince(new Date(post.published))}</span>
                </div>
            </div>
            <h3 class="lemmy-title"><a href="${post.ap_id}" target="_blank">${post.name}</a></h3>
            ${thumbnailHTML}
            <div class="status-footer">
                <button class="status-action comments-btn">${ICONS.comments} <span>${counts.comments}</span></button>
            </div>
        </div>
    `;

    const handleVote = (value) => {
        if (!actions.state.lemmy) {
            renderLoginPrompt();
            return;
        }
        actions.voteLemmyPost(post.id, value);
    };

    card.querySelector('.upvote').addEventListener('click', () => handleVote(1));
    card.querySelector('.downvote').addEventListener('click', () => handleVote(-1));

    return card;
}
