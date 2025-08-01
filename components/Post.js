/**
 * Renders a single status (post) into a DOM element.
 * @param {object} status - The status object from the Mastodon API.
 * @param {object} settings - The user's settings object.
 * @param {object} actions - The global actions object containing showProfile, etc.
 * @returns {HTMLElement} The rendered status element.
 */
export function renderStatus(status, settings, actions) {
    const originalPost = status.reblog || status;

    // Filter based on user settings (example)
    if (settings.hideNsfw && originalPost.sensitive) {
        return null; // Or return a placeholder
    }
    
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
            </div>
    `;

    // MODIFIED: Add click event listeners to the avatar and display name
    const avatar = statusDiv.querySelector('.avatar');
    const displayName = statusDiv.querySelector('.display-name');

    if (avatar) {
        avatar.onclick = () => actions.showProfile(originalPost.account.id);
    }
    if (displayName) {
        displayName.onclick = () => actions.showProfile(originalPost.account.id);
    }

    return statusDiv;
}
