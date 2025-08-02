import { apiFetch } from './api.js';
import { renderStatus, renderPollHTML } from './Post.js';

export async function renderProfilePage(state, accountId) {
    const container = document.getElementById('profile-page-view');
    
    try {
        const [accountResponse, relationshipsResponse, statusesResponse] = await Promise.all([
            apiFetch(state.instanceUrl, state.accessToken, `/api/v1/accounts/${accountId}`),
            apiFetch(state.instanceUrl, state.accessToken, `/api/v1/accounts/relationships?id[]=${accountId}`),
            apiFetch(state.instanceUrl, state.accessToken, `/api/v1/accounts/${accountId}/statuses?limit=20`)
        ]);

        const account = accountResponse.data;
        const relationship = relationshipsResponse.data[0];
        const statuses = statusesResponse.data;
        
        const isOwnProfile = state.currentUser && accountId === state.currentUser.id;
        
        let actionsHTML = '';
        if (!isOwnProfile) {
            actionsHTML = `
                <button class="mute-btn button-secondary">${relationship.muting ? 'Unmute' : 'Mute'}</button>
                <button class="block-btn">${relationship.blocking ? 'Unblock' : 'Block'}</button>
                <button class="follow-btn">${relationship.following ? 'Unfollow' : 'Follow'}</button>
            `;
        }

        container.innerHTML = `
            <div class="profile-card">
                <div class="profile-header">
                    <img class="banner" src="${account.header_static}" alt="${account.display_name} banner">
                    <img class="avatar" src="${account.avatar_static}" alt="${account.display_name} avatar">
                </div>
                <div class="profile-actions">
                    ${actionsHTML}
                </div>
                <div class="profile-info">
                    <h2 class="display-name">${account.display_name}</h2>
                    <p class="acct">@${account.acct}</p>
                    <div class="note">${account.note}</div>
                </div>
            </div>
            <div class="profile-feed"></div>
        `;

        const feedContainer = container.querySelector('.profile-feed');
        if (statuses.length > 0) {
            statuses.forEach(status => {
                const statusEl = renderStatus(status, state, state.actions);
                if (statusEl) feedContainer.appendChild(statusEl);
            });
            state.setNextPageUrl(statusesResponse.linkHeader);
            state.checkAndLoadMore();
        } else {
            feedContainer.innerHTML = '<p>This user has not posted anything yet.</p>';
            state.setNextPageUrl(null);
        }

        if (!isOwnProfile) {
            const followBtn = container.querySelector('.follow-btn');
            followBtn.addEventListener('click', async () => {
                const isFollowing = followBtn.textContent === 'Unfollow';
                const endpoint = `/api/v1/accounts/${accountId}/${isFollowing ? 'unfollow' : 'follow'}`;
                try {
                    await apiFetch(state.instanceUrl, state.accessToken, endpoint, { method: 'POST' });
                    followBtn.textContent = isFollowing ? 'Follow' : 'Unfollow';
                } catch (err) { alert('Action failed.'); }
            });
            
            const blockBtn = container.querySelector('.block-btn');
            blockBtn.addEventListener('click', async () => {
                const isBlocking = blockBtn.textContent === 'Unblock';
                const endpoint = `/api/v1/accounts/${accountId}/${isBlocking ? 'unblock' : 'block'}`;
                try {
                    await apiFetch(state.instanceUrl, state.accessToken, endpoint, { method: 'POST' });
                    blockBtn.textContent = isBlocking ? 'Block' : 'Unblock';
                } catch (err) { alert('Action failed.'); }
            });
            
            const muteBtn = container.querySelector('.mute-btn');
            muteBtn.addEventListener('click', async () => {
                const isMuting = muteBtn.textContent === 'Mute';
                const endpoint = `/api/v1/accounts/${accountId}/${isMuting ? 'mute' : 'unmute'}`;
                try {
                    await apiFetch(state.instanceUrl, state.accessToken, endpoint, { method: 'POST' });
                    muteBtn.textContent = isMuting ? 'Unmute' : 'Mute';
                } catch (err) { alert('Action failed.'); }
            });
        }

    } catch(err) {
        console.error('Could not load profile:', err);
        container.innerHTML = '<p>Could not load profile.</p>';
    }
}
