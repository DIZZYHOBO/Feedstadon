import { apiFetch } from './api.js';
import { ICONS } from './icons.js';
import { formatTimestamp } from './utils.js';
import { showImageModal } from './ui.js';

export function renderStatus(status, state, actions) {
    if (!status || !status.account) return null;

    const statusDiv = document.createElement('div');
    statusDiv.className = 'status';
    statusDiv.dataset.id = status.id;

    let mediaAttachmentsHTML = '';
    if (status.media_attachments && status.media_attachments.length > 0) {
        mediaAttachmentsHTML = status.media_attachments.map(media => {
            if (media.type === 'image') {
                return `<img src="${media.preview_url || './images/logo.png'}" alt="${media.description || 'Image attachment'}" data-full-src="${media.url}" class="status-media-attachment">`;
            } else if (media.type === 'video') {
                return `<video src="${media.url}" controls class="status-media-attachment"></video>`;
            }
            return '';
        }).join('');
    }

    statusDiv.innerHTML = `
        <div class="status-body-content">
            <div class="status-header">
                <div class="status-header-main">
                    <img src="${status.account.avatar_static || './images/logo.png'}" alt="${status.account.display_name}'s avatar" class="avatar">
                    <div>
                        <div class="display-name">${status.account.display_name}</div>
                        <div class="acct">@${status.account.acct}</div>
                    </div>
                </div>
                <div class="status-header-side">
                    <div class="timestamp">${formatTimestamp(status.created_at)}</div>
                    <div class="post-options-container"></div>
                </div>
            </div>
            <div class="status-content">${status.content}</div>
            <div class="status-media">${mediaAttachmentsHTML}</div>
        </div>
        <div class="status-footer">
            <button class="status-action reply-btn">${ICONS.reply} <span>${status.replies_count}</span></button>
            <button class="status-action boost-btn ${status.reblogged ? 'active' : ''}">${ICONS.boost} <span>${status.reblogs_count}</span></button>
            <button class="status-action favorite-btn ${status.favourited ? 'active' : ''}">${ICONS.favorite} <span>${status.favourites_count}</span></button>
            <button class="status-action bookmark-btn ${status.bookmarked ? 'active' : ''}">${ICONS.bookmark}</button>
        </div>
    `;

    // Add event listener for image modal
    statusDiv.querySelectorAll('.status-media-attachment[data-full-src]').forEach(img => {
        img.addEventListener('click', (e) => {
            e.stopPropagation();
            showImageModal(img.dataset.fullSrc);
        });
    });
    
    return statusDiv;
}
