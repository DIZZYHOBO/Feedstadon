import { ICONS } from './icons.js';
import { formatTimestamp } from './utils.js';

export function renderStatus(status, currentUser, actions, settings) {
    const card = document.createElement('div');
    card.className = 'status';
    card.dataset.id = status.id;

    let mediaAttachmentsHTML = '';
    if (status.media_attachments && status.media_attachments.length > 0) {
        const gridClass = `media-grid-${status.media_attachments.length}`;
        mediaAttachmentsHTML += `<div class="media-grid ${gridClass}">`;
        status.media_attachments.forEach(attachment => {
            if (attachment.type === 'image') {
                mediaAttachmentsHTML += `<img src="${attachment.url}" alt="${attachment.description || 'Status media'}" class="media-attachment" loading="lazy">`;
            }
        });
        mediaAttachmentsHTML += `</div>`;
    }

    card.innerHTML = `
        <div class="status-body-content">
            <div class="status-header">
                <div class="status-header-main" data-account-id="${status.account.id}">
                    <img src="${status.account.avatar}" alt="${status.account.display_name}'s avatar" class="avatar">
                    <div>
                        <div class="display-name">${status.account.display_name}</div>
                        <div class="acct">@${status.account.acct}</div>
                    </div>
                </div>
                <div class="status-header-side">
                    <a href="#status/${status.id}" class="timestamp">${formatTimestamp(status.created_at)}</a>
                </div>
            </div>
            <div class="status-content">${status.content}</div>
            ${mediaAttachmentsHTML}
        </div>
        <div class="status-footer">
            <button class="status-action reply-btn">${ICONS.comments} <span>${status.replies_count}</span></button>
            <button class="status-action reblog-btn ${status.reblogged ? 'active' : ''}">${ICONS.boost} <span>${status.reblogs_count}</span></button>
            <button class="status-action favorite-btn ${status.favourited ? 'active' : ''}">${ICONS.favorite} <span>${status.favourites_count}</span></button>
            <button class="status-action bookmark-btn ${status.bookmarked ? 'active' : ''}">${ICONS.bookmark}</button>
        </div>
    `;
    
    card.querySelector('.status-header-main').addEventListener('click', (e) => {
        e.preventDefault();
        actions.showProfilePage('mastodon', status.account.id, status.account.acct);
    });

    card.querySelector('.reply-btn').addEventListener('click', () => actions.replyToStatus(status, card));
    card.querySelector('.reblog-btn').addEventListener('click', (e) => actions.toggleAction('reblog', status, e.currentTarget));
    card.querySelector('.favorite-btn').addEventListener('click', (e) => actions.toggleAction('favorite', status, e.currentTarget));
    card.querySelector('.bookmark-btn').addEventListener('click', (e) => actions.toggleAction('bookmark', status, e.currentTarget));

    return card;
}
