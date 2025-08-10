import { ICONS } from './icons.js';
import { timeSince } from './utils.js';

export function renderStatus(status, currentUser, app) {
    const card = document.createElement('div');
    card.className = 'status-card';
    card.dataset.id = status.id;

    const reblog = status.reblog;
    const author = reblog ? reblog.account : status.account;

    card.innerHTML = `
        ${reblog ? `<div class="reblog-indicator">${ICONS.reblog} Reblogged by ${status.account.display_name}</div>` : ''}
        <div class="status-header">
            <img src="${author.avatar}" alt="${author.display_name}" class="avatar">
            <div class="status-author">
                <strong>${author.display_name}</strong>
                <span>@${author.acct} &middot; ${timeSince(new Date(reblog ? reblog.created_at : status.created_at))}</span>
            </div>
        </div>
        <div class="status-content">${reblog ? reblog.content : status.content}</div>
        <div class="status-actions">
            <button class="action-btn reply-btn">${ICONS.reply} <span>${reblog ? reblog.replies_count : status.replies_count}</span></button>
            <button class="action-btn reblog-btn ${reblog?.reblogged ? 'active' : ''}">${ICONS.reblog} <span>${reblog ? reblog.reblogs_count : status.reblogs_count}</span></button>
            <button class="action-btn favourite-btn ${reblog?.favourited ? 'active' : ''}">${ICONS.favourite} <span>${reblog ? reblog.favourites_count : status.favourites_count}</span></button>
            <button class="action-btn bookmark-btn ${reblog?.bookmarked ? 'active' : ''}">${ICONS.bookmark}</button>
        </div>
    `;

    // Event Listeners
    card.querySelector('.favourite-btn').addEventListener('click', (e) => {
        e.stopPropagation();
        app.actions.toggleAction('favourite', reblog || status, e.currentTarget);
    });
    
    card.querySelector('.reblog-btn').addEventListener('click', (e) => {
        e.stopPropagation();
        app.actions.toggleAction('reblog', reblog || status, e.currentTarget);
    });

    card.querySelector('.bookmark-btn').addEventListener('click', (e) => {
        e.stopPropagation();
        app.actions.toggleAction('bookmark', reblog || status, e.currentTarget);
    });

    card.querySelector('.status-header').addEventListener('click', () => {
        const profileId = `mastodon-${author.id}-${author.acct}`;
        window.location.hash = `profile/${profileId}`;
    });

    return card;
}
