import { apiFetch } from './api.js';

export async function renderSettingsPage(state) {
    const container = document.getElementById('settings-view');
    container.innerHTML = `
        <div class="view-header">Settings</div>
        <div class="settings-container">
            <div class="settings-section">
                <h3>Theme</h3>
                <div class="form-group">
                    <label for="theme-select">Select a theme for the app</label>
                    <select id="theme-select">
                        <option value="feedstodon">Feedstodon (Default)</option>
                        <option value="purple">Purple</option>
                        <option value="tube">Tube</option>
                        <option value="readit">Readit</option>
                        <option value="git">Git</option>
                    </select>
                </div>
            </div>

            <div class="settings-section">
                <h3>Muted Users</h3>
                <ul id="muted-users-list"><p>Loading muted users...</p></ul>
            </div>
        </div>
    `;

    // --- Theme Settings ---
    const themeSelect = container.querySelector('#theme-select');
    themeSelect.value = localStorage.getItem('feedstodon-theme') || 'feedstodon';
    themeSelect.addEventListener('change', () => {
        document.documentElement.dataset.theme = themeSelect.value;
        localStorage.setItem('feedstodon-theme', themeSelect.value);
    });

    // --- Muted Users ---
    const mutedUsersList = container.querySelector('#muted-users-list');
    try {
        const muted = (await apiFetch(state.instanceUrl, state.accessToken, '/api/v1/mutes')).data;
        mutedUsersList.innerHTML = '';
        if (muted.length === 0) {
            mutedUsersList.innerHTML = '<p>You haven\'t muted anyone.</p>';
        }
        muted.forEach(account => {
            const item = document.createElement('li');
            item.className = 'muted-user-item';
            item.innerHTML = `
                <img src="${account.avatar_static}" alt="${account.acct} avatar">
                <div class="info">
                    <span class="display-name">${account.display_name}</span>
                    <div class="acct">@${account.acct}</div>
                </div>
                <button class="unmute-btn" data-id="${account.id}">Unmute</button>
            `;
            mutedUsersList.appendChild(item);
        });

        mutedUsersList.querySelectorAll('.unmute-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const accountId = e.target.dataset.id;
                try {
                    await apiFetch(state.instanceUrl, state.accessToken, `/api/v1/accounts/${accountId}/unmute`, { method: 'POST' });
                    e.target.closest('.muted-user-item').remove();
                } catch (err) {
                    alert('Failed to unmute user.');
                }
            });
        });

    } catch (err) {
        mutedUsersList.innerHTML = '<p>Could not load muted users.</p>';
    }
}
