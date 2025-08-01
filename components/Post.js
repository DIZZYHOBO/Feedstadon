import { ICONS } from './icons.js';

export function renderStatus(status, state, actions) {
    const originalPost = status.reblog || status;

    if (state.settings.hideNsfw && originalPost.sensitive) {
        return null;
    }
    
    const statusDiv = document.createElement('div');
    statusDiv.className = 'status';
    statusDiv.dataset.id = originalPost.id;

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

    statusDiv.innerHTML = `
        <div class="status-header">
            <img class="avatar" src="${originalPost.account.avatar_static}" alt="${originalPost.account.display_name} avatar">
            <div>
                <span class="display-name">${originalPost.account.display_name}</span>
                <span class="acct">@${originalPost.account.acct}</span>
            </div>
            ${optionsMenuHTML}
        </div>
        <div class="status-content">${originalPost.content}</div>
        ${mediaHTML}
        <div class="status-footer">
            <button class="status-action" data-action="reply">${ICONS.reply}</button>
            <button class="status-action ${originalPost.reblogged ? 'active' : ''}" data-action="boost">${ICONS.boost}</button>
            <button class="status-action ${originalPost.favourited ? 'active' : ''}" data-action="favorite">${ICONS.favorite}</button>
            <button class="status-action ${originalPost.bookmarked ? 'active' : ''}" data-action="bookmark">${ICONS.bookmark}</button>
        </div>
    `;

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
            // Close other menus
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
