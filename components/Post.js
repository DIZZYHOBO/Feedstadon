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
        <div class="status-footer">
            <button class="status-action" data-action="reply">${ICONS.reply} ${originalPost.replies_count}</button>
            <button class="status-action ${originalPost.reblogged ? 'active' : ''}" data-action="boost">${ICONS.boost} ${originalPost.reblogs_count}</button>
            <button class="status-action ${originalPost.favourited ? 'active' : ''}" data-action="favorite">${ICONS.favorite} ${originalPost.favourites_count}</button>
            <button class="status-action ${originalPost.bookmarked ? 'active' : ''}" data-action="bookmark">${ICONS.bookmark}</button>
        </div>
    `;

    // Add click listeners
    const avatar = statusDiv.querySelector('.avatar');
    const displayName = statusDiv.querySelector('.display-name');
    if (avatar) avatar.onclick = () => actions.showProfile(originalPost.account.id);
    if (displayName) displayName.onclick = () => actions.showProfile(originalPost.account.id);

    // Add listeners for the new action buttons
    statusDiv.querySelectorAll('.status-action').forEach(button => {
        button.addEventListener('click', (e) => {
            e.stopPropagation();
            const action = button.dataset.action;
            actions.toggleAction(action, originalPost.id, button);
        });
    });

    return statusDiv;
}
