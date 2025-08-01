import { ICONS } from './ui.js';

export function renderStatus(status, settings, actions) {
    const originalPost = status.reblog || status;
    if (settings.hideNsfw && originalPost.sensitive) return null;
    
    // Filter posts based on words in content
    if (settings.filteredWords && settings.filteredWords.length > 0) {
        const content_lower = originalPost.content.toLowerCase();
        if (settings.filteredWords.some(word => content_lower.includes(word))) {
            return null;
        }
    }

    let mediaHTML = '';
    if(originalPost.media_attachments && originalPost.media_attachments.length > 0) {
        mediaHTML = originalPost.media_attachments.map(media => {
            if (media.type === 'image') return `<a href="${media.url}" target="_blank" rel="noopener noreferrer"><img src="${media.preview_url}"></a>`;
            if (media.type === 'video') return `<video src="${media.url}" controls></video>`;
            return '';
        }).join('');
    }

    const statusDiv = document.createElement('div');
    statusDiv.className = 'status';
    statusDiv.innerHTML = `
        <div class="status-header">
            <img src="${originalPost.account.avatar_static}">
            <div style="display: flex; flex-direction: column;">
                <span class="display-name">${originalPost.account.display_name}</span>
                <span class="acct" style="color: var(--font-color-muted);">@${originalPost.account.acct}</span>
            </div>
        </div>
        <div class="status-content">${originalPost.content}</div>
        <div class="status-media">${mediaHTML}</div>
        <div class="status-footer">
            <span class="status-action reply">${ICONS.reply} ${originalPost.replies_count}</span>
            <span class="status-action boost ${originalPost.reblogged ? 'active' : ''}">${ICONS.boost} ${originalPost.reblogs_count}</span>
            <span class="status-action favorite ${originalPost.favourited ? 'active' : ''}">${ICONS.favorite} ${originalPost.favourites_count}</span>
            <span class="status-action bookmark ${originalPost.bookmarked ? 'active' : ''}">${ICONS.bookmark}</span>
        </div>
    `;

    statusDiv.querySelector('.reply').onclick = (e) => { e.stopPropagation(); actions.toggleCommentThread(originalPost, statusDiv); };
    statusDiv.querySelector('.boost').onclick = (e) => { e.stopPropagation(); actions.toggleAction('boost', originalPost.id, e.currentTarget); };
    statusDiv.querySelector('.favorite').onclick = (e) => { e.stopPropagation(); actions.toggleAction('favorite', originalPost.id, e.currentTarget); };
    statusDiv.querySelector('.bookmark').onclick = (e) => { e.stopPropagation(); actions.toggleAction('bookmark', originalPost.id, e.currentTarget); };
    
    return statusDiv;
}
