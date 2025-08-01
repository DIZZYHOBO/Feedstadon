import { apiFetch } from './api.js';
import { showModal } from './ui.js';
import { renderStatus } from './Post.js';

export async function showProfile(state, accountId) {
    const container = document.createElement('div');
    showModal(container);
    container.innerHTML = `<p>Loading profile...</p>`;
    try {
        const account = await apiFetch(state.instanceUrl, state.accessToken, `/api/v1/accounts/${accountId}`);
        container.innerHTML = `<h2>${account.display_name}</h2><p>@${account.acct}</p><div>${account.note}</div>`;
    } catch(err) { container.innerHTML = '<p>Could not load profile.</p>'; }
}
