import { apiFetch } from './api.js';
import { renderStatus } from './Post.js';
import { ICONS } from './icons.js';
import { formatTimestamp } from './utils.js';

// --- Lemmy Profile ---
export async function renderLemmyProfilePage(state, userAcct, actions) {
    const container = document.getElementById('profile-page-view');
    container.innerHTML = `<p>Loading Lemmy profile...</p>`;

    try {
        const [username, instance] = userAcct.split('@');
        const userResponse = await apiFetch(instance, null, `/api/v3/user?username=${username}`);
        const user = userResponse.data;

        const combinedFeed = [...user.posts, ...user.comments].sort((a, b) => {
            const dateA = new Date(a.post?.published || a.comment?.published);
            const dateB = new Date(b.post?.published || b.comment?.published);
            return dateB - dateA;
        });

        container.innerHTML = `
            <div class="profile-card">
                <div class="profile-header">
                     <img class="banner" src="${user.person_view.person.banner || ''}" alt="${user.person_view.person.display_name || user.person_view.person.name} banner">
                     <img class="avatar" src="${user.person_view.person.avatar || ''}" alt="${user.person_view.person.display_name || user.person_view.person.name} avatar">
                </div>
                 <div class="profile-info">
                    <h2 class="display-name">${user.person_view.person.display_name || user.person_view.person.name}</h2>
                    <p class="acct">@${user.person_view.person.name}@${instance}</p>
                    <div class="note">${user.person_view.person.bio || ''}</div>
                </div>
                <div class="profile-tabs">
                    <button class="tab-button active" data-tab="lemmy">Lemmy</button>
                    <button class="tab-button" data-tab="mastodon">Mastodon</button>
                </div>
            </div>
            <div class="profile-feed"></div>
        `;

        const feedContainer = container.querySelector('.profile-feed');
        if(combinedFeed.length > 0) {
            combinedFeed.forEach(item => {
                if(item.post) { // It's a post
                    // We can create a more compact "post summary" card here later
                    const postCard = document.createElement('div');
                    postCard.className = 'status';
                    postCard.innerHTML = `<div class="status-body-content">Posted in <a href="#" class="lemmy-community-link" data-community="${item.community.name}@${new URL(item.community.actor_id).hostname}">${item.community.name}</a>: <strong>${item.post.name}</strong></div>`;
                    feedContainer.appendChild(postCard);
                } else { // It's a comment
                    const commentCard = document.createElement('div');
                    commentCard.className = 'status';
                    commentCard.innerHTML = `<div class="status-body-content">Commented on <strong>${item.post.name}</strong> in <a href="#" class="lemmy-community-link" data-community="${item.community.name}@${new URL(item.community.actor_id).hostname}">${item.community.name}</a>: <p>${item.comment.content}</p></div>`;
                    feedContainer.appendChild(commentCard);
                }
            });
        } else {
            feedContainer.innerHTML = '<p>This user has no Lemmy activity.</p>';
        }

    } catch (err) {
        console.error('Could not load Lemmy profile:', err);
        container.innerHTML = '<p>Could not load Lemmy profile.</p>';
    }
}


// --- Mastodon Profile ---
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
                     <div class="profile-tabs">
                        <button class="tab-button" data-tab="lemmy">Lemmy</button>
                        <button class="tab-button active" data-tab="mastodon">Mastodon</button>
                    </div>
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
        } else {
            feedContainer.innerHTML = '<p>This user has not posted anything yet.</p>';
        }

        if (!isOwnProfile) {
            container.querySelector('.follow-btn').addEventListener('click', async () => {
                // Follow/unfollow logic
            });
            container.querySelector('.block-btn').addEventListener('click', async () => {
                // Block/unblock logic
            });
             container.querySelector('.mute-btn').addEventListener('click', async () => {
                // Mute/unmute logic
            });
        }

    } catch(err) {
        console.error('Could not load profile:', err);
        container.innerHTML = '<p>Could not load profile.</p>';
    }
}
