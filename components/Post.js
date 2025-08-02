import { ICONS } from './icons.js';
import { formatTimestamp } from './utils.js';

export function renderStatus(status, state, actions) {
    const originalPost = status.reblog || status;

    if (state.settings.hideNsfw && originalPost.sensitive) {
        return null;
    }
    
    const statusDiv = document.createElement('div');
    statusDiv.className = 'status';
    statusDiv.dataset.id = originalPost.id;

    const boosterInfo = status.reblog ? `<div class="booster-info">Boosted by ${status.account.display_name}</div>` : '';

    let optionsMenuHTML = '';
    if (state.currentUser && originalPost.account.id === state.currentUser.id) {
        optionsMenuHTML = `
            <button class="post-options-btn">${ICONS.more}</button>
            <div class="post-options-menu">
                <button data-action="edit">Edit</button>
                <button data-action="delete">Delete</button>
            </div>
        `;
    }

    let mediaHTML = '';
    if (originalPost.media_attachments && originalPost.media_attachments.length > 0) {
        mediaHTML += '<div class="status-media">';
        originalPost.media_attachments.forEach(attachment => {
            if (attachment.type === 'image') {
                mediaHTML += `<img src="${attachment.url}" alt="${attachment.description || 'Post image'}" loading="lazy">`;
            } else if (attachment.type === 'video' || attachment.type === 'gifv') {
                mediaHTML += `<video src="${attachment.url}" controls loop muted playsinline></video>`;
            }
        });
        mediaHTML += '</div>';
    }

    const timestamp = formatTimestamp(originalPost.created_at);

    statusDiv.innerHTML = `
        <div class="status-header">
            <img class="avatar" src="${originalPost.account.avatar_static}" alt="${originalPost.account.display_name} avatar">
            <div>
                <span class="display-name">${originalPost.account.display_name}</span>
                <span class="acct">@${originalPost.account.acct}</span>
                <span class="timestamp">· ${timestamp}</span>
            </div>
            ${optionsMenuHTML}
        </div>
        <div class="status-content">${originalPost.content}</div>
        ${mediaHTML}
        <div class="status-footer">
            <button class="status-action" data-action="reply">${ICONS.reply} ${originalPost.replies_count}</button>
            <button class="status-action ${originalPost.reblogged ? 'active' : ''}" data-action="boost">${ICONS.boost} ${originalPost.reblogs_count}</button>
            <button class="status-action ${originalPost.favourited ? 'active' : ''}" data-action="favorite">${ICONS.favorite} ${originalPost.favourites_count}</button>
            <button class="status-action ${originalPost.bookmarked ? 'active' : ''}" data-action="bookmark">${ICONS.bookmark}</button>
        </div>
    `;

    // --- Event Listeners ---
    
    // This listener intercepts clicks on hashtag links
    statusDiv.addEventListener('click', (e) => {
        const link = e.target.closest('a');
        if (!link) return;

        // Check if it's a hashtag link
        if (link.classList.contains('hashtag')) {
            e.preventDefault(); // Stop the browser from navigating
            const href = link.getAttribute('href');
            const tagName = href.split('/tags/')[1];
            if (tagName) {
                // Call our in-app function instead
                actions.showHashtagTimeline(tagName);
            }
        }
    });

    const avatar = statusDiv.querySelector('.avatar');
    const displayName = statusDiv.querySelector('.display-name');
    if (avatar) avatar.onclick = () => actions.showProfile(originalPost.account.id);
    if (displayName) displayName.onclick = () => actions.showProfile(originalPost.account.id);

    statusDiv.querySelectorAll('.status-action').forEach(button => {
        button.addEventListener('click', (e) => {
            e.stopPropagation();
            const action = button.dataset.action;
            actions.toggleAction(action, originalPost.id, button);
        });
    });

    const optionsBtn = statusDiv.querySelector('.post-options-btn');
    if (optionsBtn) {
        const menu = statusDiv.querySelector('.post-options-menu');
        optionsBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            document.querySelectorAll('.post-options-menu').forEach(m => {
                if (m !== menu) m.style.display = 'none';
            });
            menu.style.display = menu.style.display === 'block' ? 'none' : 'block';
        });

        menu.querySelector('[data-action="edit"]').addEventListener('click', (e) => {
            e.stopPropagation();
            menu.style.display = 'none';
            actions.showEditModal(originalPost);
        });

        menu.querySelector('[data-action="delete"]').addEventListener('click', (e) => {
            e.stopPropagation();
            menu.style.display = 'none';
            actions.showDeleteModal(originalPost.id);
        });
    }

    return statusDiv;
}
