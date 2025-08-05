import { apiFetch } from './api.js';
import { renderStatus } from './Post.js';
import { renderLemmyCard } from './Lemmy.js';
import { ICONS } from './icons.js';

export async function renderProfilePage(state, accountId, actions) {
    const profileView = document.getElementById('profile-page-view');
    profileView.innerHTML = `<p>Loading profile...</p>`;

    try {
        const { data: account } = await apiFetch(state.instanceUrl, state.accessToken, `/api/v1/accounts/${accountId}`);
        const { data: statuses } = await apiFetch(state.instanceUrl, state.accessToken, `/api/v1/accounts/${accountId}/statuses`);

        const banner = account.header_static || '';
        const displayName = account.display_name;
        const username = account.username;
        const avatar = account.avatar_static;
        const note = account.note;
        const followers = account.followers_count;
        const following = account.following_count;
        const postCount = account.statuses_count;

        profileView.innerHTML = `
            <div class="profile-card">
                <div class="profile-header">
                    <img class="banner" src="${banner}" alt="${displayName}'s banner" onerror="this.style.display='none'">
                    <img class="avatar" src="${avatar}" alt="${displayName}'s avatar" onerror="this.src='./images/logo.png'">
                </div>
                <div class="profile-actions">
                    <button class="follow-btn">Follow</button>
                    <button class="block-btn">Block</button>
                </div>
                <div class="profile-info">
                    <h2 class="display-name">${displayName}</h2>
                    <p class="acct">@${username}</p>
                    <div class="note">${note}</div>
                    <div class="stats">
                        <span><strong>${following}</strong> Following</span>
                        <span><strong>${followers}</strong> Followers</span>
                    </div>
                </div>
            </div>
            <div class="profile-feed"></div>
        `;

        const feed = profileView.querySelector('.profile-feed');
        if (statuses.length === 0) {
            feed.innerHTML = '<p>No posts yet.</p>';
        } else {
            statuses.forEach(status => {
                feed.appendChild(renderStatus(status, state.currentUser, actions, state.settings));
            });
        }

    } catch (error) {
        profileView.innerHTML = `<p>Error loading profile: ${error.message}</p>`;
    }
}

export async function renderLemmyProfilePage(state, userAcct, actions, isOwnProfile) {
    const profileView = document.getElementById('profile-page-view');
    profileView.innerHTML = `<p>Loading Lemmy profile...</p>`;
    
    const [username, instance] = userAcct.split('@');
    
    try {
        const { data: userData } = await apiFetch(instance, null, `/api/v3/user?username=${username}`, {}, 'lemmy');
        const { person_view, posts, comments } = userData;

        const combinedFeed = [
            ...posts.map(p => ({ ...p, type: 'post', date: p.post.published })),
            ...comments.map(c => ({ ...c, type: 'comment', date: c.comment.published }))
        ].sort((a, b) => new Date(b.date) - new Date(a.date));

        profileView.innerHTML = `
            <div class="profile-card">
                 <div class="profile-header">
                    <img class="banner" src="${person_view.person.banner || ''}" alt="${person_view.person.display_name || person_view.person.name}'s banner" onerror="this.style.display='none'">
                    <img class="avatar" src="${person_view.person.avatar || './images/logo.png'}" alt="${person_view.person.display_name || person_view.person.name}'s avatar" onerror="this.src='./images/logo.png'">
                </div>
                <div class="profile-info">
                    <h2 class="display-name">${person_view.person.display_name || person_view.person.name}</h2>
                    <p class="acct">@${person_view.person.name}@${instance}</p>
                    <div class="note">${person_view.person.bio || ''}</div>
                </div>
            </div>
            <div class="profile-feed"></div>
        `;
        
        const feed = profileView.querySelector('.profile-feed');
        if (combinedFeed.length === 0) {
            feed.innerHTML = '<p>No activity yet.</p>';
            return;
        }

        combinedFeed.forEach(item => {
            if (item.type === 'post') {
                feed.appendChild(renderLemmyCard(item, actions));
            } else {
                const commentCard = document.createElement('div');
                commentCard.className = 'status lemmy-comment-on-profile';
                commentCard.innerHTML = `
                    <div class="status-body-content">
                        <div class="comment-context">
                            ${ICONS.reply} <strong>${item.creator.name}</strong> commented on <strong>${item.post.name}</strong> in ${item.community.name}
                        </div>
                        <div class="status-content">${item.comment.content}</div>
                    </div>`;
                feed.appendChild(commentCard);
            }
        });

    } catch (error) {
        console.error("Failed to load Lemmy profile:", error);
        profileView.innerHTML = `<p>Error loading Lemmy profile: ${error.message}</p>`;
    }
}
