import { apiFetch } from './api.js';
import { renderStatus } from './Post.js';

// --- REWRITTEN: This function now builds a full profile page ---
export async function renderProfilePage(state, accountId) {
    const container = document.getElementById('profile-page-view');
    container.innerHTML = `<p>Loading profile...</p>`;

    try {
        // Fetch account details, relationship, and statuses in parallel
        const [account, relationships, statuses] = await Promise.all([
            apiFetch(state.instanceUrl, state.accessToken, `/api/v1/accounts/${accountId}`),
            apiFetch(state.instanceUrl, state.accessToken, `/api/v1/accounts/relationships?id[]=${accountId}`),
            apiFetch(state.instanceUrl, state.accessToken, `/api/v1/accounts/${accountId}/statuses?limit=20`)
        ]);

        const relationship = relationships[0];
        
        // Build the Profile Page HTML
        container.innerHTML = `
            <div class="profile-card">
                <div class="profile-header">
                    <img class="banner" src="${account.header_static}" alt="${account.display_name} banner">
                    <img class="avatar" src="${account.avatar_static}" alt="${account.display_name} avatar">
                </div>
                <div class="profile-actions">
                    <button class="block-btn">${relationship.blocking ? 'Unblock' : 'Block'}</button>
                    <button class="follow-btn">${relationship.following ? 'Unfollow' : 'Follow'}</button>
                </div>
                <div class="profile-info">
                    <h2 class="display-name">${account.display_name}</h2>
                    <p class="acct">@${account.acct}</p>
                    <div class="note">${account.note}</div>
                </div>
            </div>
            <div class="profile-feed"></div>
        `;

        // Render the user's posts into the feed container
        const feedContainer = container.querySelector('.profile-feed');
        if (statuses.length > 0) {
            statuses.forEach(status => {
                const statusEl = renderStatus(status, state.settings, state.actions);
                if (statusEl) feedContainer.appendChild(statusEl);
            });
        } else {
            feedContainer.innerHTML = '<p>This user has not posted anything yet.</p>';
        }

        // Add event listeners for the new buttons
        const followBtn = container.querySelector('.follow-btn');
        followBtn.addEventListener('click', async () => {
            const isFollowing = followBtn.textContent === 'Unfollow';
            const endpoint = `/api/v1/accounts/${accountId}/${isFollowing ? 'unfollow' : 'follow'}`;
            try {
                await apiFetch(state.instanceUrl, state.accessToken, endpoint, { method: 'POST' });
                followBtn.textContent = isFollowing ? 'Follow' : 'Unfollow';
            } catch (err) {
                alert('Action failed.');
            }
        });
        
        const blockBtn = container.querySelector('.block-btn');
        blockBtn.addEventListener('click', async () => {
            const isBlocking = blockBtn.textContent === 'Unblock';
            const endpoint = `/api/v1/accounts/${accountId}/${isBlocking ? 'unblock' : 'block'}`;
            try {
                await apiFetch(state.instanceUrl, state.accessToken, endpoint, { method: 'POST' });
                blockBtn.textContent = isBlocking ? 'Block' : 'Unblock';
            } catch (err) {
                alert('Action failed.');
            }
        });

    } catch(err) {
        console.error('Could not load profile:', err);
        container.innerHTML = '<p>Could not load profile.</p>';
    }
}

