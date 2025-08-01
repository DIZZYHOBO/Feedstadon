import { ICONS } from './icons.js';

/**
 * Renders a single status (post) into a DOM element.
 * @param {object} status - The status object from the Mastodon API.
 * @param {object} settings - The user's settings object.
 * @param {object} actions - The global actions object.
 * @returns {HTMLElement} The rendered status element.
 */
export function renderStatus(status, settings, actions) {
    const originalPost = status.reblog || status;

    if (settings.hideNsfw && originalPost.sensitive) return null;
    
    const statusDiv = document.createElement('div');
    statusDiv.className = 'status';
    statusDiv.dataset.id = originalPost.id;

    const boosterInfo = status.reblog ? `<div class="booster-info">Boosted by ${status.account.display_name}</div>` : '';

    // --- ADDED: Logic to render media ---
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
    // --- End of added logic ---

    // MODIFIED: Added the mediaHTML variable to the template
    statusDiv.innerHTML = `
        ${boosterInfo}
        <div class="status-header">
            <img class="avatar" src="${originalPost.account.avatar_static}" alt="${originalPost.account.display_name} avatar">
            <div>
                <span class="display-name">${originalPost.account.display_name}</span>
                <span class="acct">@${originalPost.account.acct}</span>
            </div>
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

    // Add click listeners
    const avatar = statusDiv.querySelector('.avatar');
    const displayName = statusDiv.querySelector('.display-name');
    if (avatar) avatar.onclick = () => actions.showProfile(originalPost.account.id);
    if (displayName) displayName.onclick = () => actions.showProfile(originalPost.account.id);

    // Add listeners for the action buttons
    statusDiv.querySelectorAll('.status-action').forEach(button => {
        button.addEventListener('click', (e) => {
            e.stopPropagation();
            const action = button.dataset.action;
            actions.toggleAction(action, originalPost.id, button);
        });
    });

    return statusDiv;
}
