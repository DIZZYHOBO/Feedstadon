import { apiFetch } from './api.js';
import { renderStatus } from './Post.js';
import { ICONS } from './icons.js';

async function renderMastodonProfile(state, actions, container, accountId, userAcct) {
    if (!accountId && userAcct) {
        // Search for user to get their ID
        const { data: accounts } = await apiFetch(state.instanceUrl, state.accessToken, `/api/v1/accounts/search?q=${userAcct}&resolve=true&limit=1`);
        if (accounts.length > 0) {
            accountId = accounts[0].id;
        } else {
            container.innerHTML = `<p>Could not find user ${userAcct}.</p>`;
            return;
        }
    }
    
    if (!accountId) {
        container.innerHTML = '<p>No Mastodon user specified.</p>';
        return;
    }

    container.innerHTML = 'Loading Mastodon profile...';
    try {
        const { data: account } = await apiFetch(state.instanceUrl, state.accessToken, `/api/v1/accounts/${accountId}`);
        const { data: statuses } = await apiFetch(state.instanceUrl, state.accessToken, `/api/v1/accounts/${accountId}/statuses`);

        let followButtonHtml = '';
        if (state.currentUser && state.currentUser.id !== account.id) {
            const { data: relationship } = await apiFetch(state.instanceUrl, state.accessToken, `/api/v1/accounts/relationships?id[]=${accountId}`);
            const isFollowing = relationship[0] && relationship[0].following;
            followButtonHtml = `<button class="button-primary" id="follow-btn">${isFollowing ? 'Unfollow' : 'Follow'}</button>`;
        }

        container.innerHTML = `
            <div class="profile-header">
                <img src="${account.header_static}" class="profile-header-image">
                <div class="profile-avatar-container">
                     <img src="${account.avatar}" class="profile-avatar">
                </div>
                <div class="profile-info">
                    <h2>${account.display_name}</h2>
                    <p>@${account.acct}</p>
                    <div class="profile-stats">
                        <span><strong>${account.statuses_count}</strong> Posts</span>
                        <span><strong>${account.followers_count}</strong> Followers</span>
                        <span><strong>${account.following_count}</strong> Following</span>
                    </div>
                    ${followButtonHtml}
                </div>
            </div>
            <div class="profile-bio">${account.note}</div>
            <div class="profile-posts"></div>
        `;

        const postsContainer = container.querySelector('.profile-posts');
        if (statuses && statuses.length > 0) {
            statuses.forEach(status => {
                postsContainer.appendChild(renderStatus(status, state.currentUser, actions, state.settings, 'mastodon'));
            });
        } else {
            postsContainer.innerHTML = '<p>No posts to show.</p>';
        }

        if (followButtonHtml) {
            container.querySelector('#follow-btn').addEventListener('click', async (e) => {
                const button = e.target;
                const isFollowing = button.textContent === 'Unfollow';
                const success = await actions.mastodonFollow(accountId, !isFollowing, 'mastodon');
                if (success) {
                    button.textContent = isFollowing ? 'Follow' : 'Unfollow';
                }
            });
        }

    } catch (error) {
        container.innerHTML = `<p>Could not load Mastodon profile. ${error.message}</p>`;
    }
}

async function renderLemmyProfile(state, actions, container, userAcct) {
    if (!userAcct) {
        container.innerHTML = '<p>No Lemmy user specified.</p>';
        return;
    }

    container.innerHTML = 'Loading Lemmy profile...';
    try {
        const lemmyInstance = localStorage.getItem('lemmy_instance') || state.lemmyInstances[0];
        const { data: profile } = await apiFetch(lemmyInstance, null, `/api/v3/user?username=${userAcct}`, {}, 'lemmy', true);
        
        let followButtonHtml = ''; // Lemmy doesn't have a direct follow concept like Mastodon

        container.innerHTML = `
            <div class="profile-header">
                <img src="${profile.person_view.person.banner || './images/default_banner.png'}" class="profile-header-image">
                <div class="profile-avatar-container">
                     <img src="${profile.person_view.person.avatar || './images/default_avatar.png'}" class="profile-avatar">
                </div>
                <div class="profile-info">
                    <h2>${profile.person_view.person.display_name || profile.person_view.person.name}</h2>
                    <p>@${profile.person_view.person.name}@${new URL(profile.person_view.person.actor_id).hostname}</p>
                    <div class="profile-stats">
                        <span><strong>${profile.person_view.counts.post_count}</strong> Posts</span>
                        <span><strong>${profile.person_view.counts.comment_count}</strong> Comments</span>
                    </div>
                </div>
            </div>
            <div class="profile-bio">${profile.person_view.person.bio || ''}</div>
            <div class="profile-posts"></div>
        `;

        const postsContainer = container.querySelector('.profile-posts');
        const { data: posts } = await apiFetch(lemmyInstance, null, `/api/v3/user?username=${userAcct}&sort=New&page=1&limit=20`, {}, 'lemmy');
        
        if (posts.posts && posts.posts.length > 0) {
            posts.posts.forEach(post => {
                postsContainer.appendChild(renderLemmyCard(post, state, actions));
            });
        } else {
            postsContainer.innerHTML = '<p>No posts to show.</p>';
        }

    } catch (error) {
        container.innerHTML = `<p>Could not load Lemmy profile. ${error.message}</p>`;
    }
}

async function renderPixelfedProfile(state, actions, container, accountId) {
    if (!accountId) {
        container.innerHTML = '<p>No Pixelfed user specified.</p>';
        return;
    }

    container.innerHTML = 'Loading Pixelfed profile...';
    try {
        const { data: account } = await apiFetch(state.pixelfedInstanceUrl, state.pixelfedAccessToken, `/api/v1/accounts/${accountId}`);
        const { data: statuses } = await apiFetch(state.pixelfedInstanceUrl, state.pixelfedAccessToken, `/api/v1/accounts/${accountId}/statuses`);

        let followButtonHtml = '';
        if (state.currentUser && state.currentUser.id !== account.id) {
            const { data: relationship } = await apiFetch(state.pixelfedInstanceUrl, state.pixelfedAccessToken, `/api/v1/accounts/relationships?id[]=${accountId}`);
            const isFollowing = relationship[0] && relationship[0].following;
            followButtonHtml = `<button class="button-primary" id="follow-btn">${isFollowing ? 'Unfollow' : 'Follow'}</button>`;
        }

        container.innerHTML = `
            <div class="profile-header">
                <img src="${account.header_static}" class="profile-header-image">
                <div class="profile-avatar-container">
                     <img src="${account.avatar}" class="profile-avatar">
                </div>
                <div class="profile-info">
                    <h2>${account.display_name}</h2>
                    <p>@${account.acct}</p>
                    <div class="profile-stats">
                        <span><strong>${account.statuses_count}</strong> Posts</span>
                        <span><strong>${account.followers_count}</strong> Followers</span>
                        <span><strong>${account.following_count}</strong> Following</span>
                    </div>
                    ${followButtonHtml}
                </div>
            </div>
            <div class="profile-bio">${account.note}</div>
            <div class="profile-posts"></div>
        `;

        const postsContainer = container.querySelector('.profile-posts');
        if (statuses && statuses.length > 0) {
            statuses.forEach(status => {
                postsContainer.appendChild(renderStatus(status, state.currentUser, actions, state.settings, 'pixelfed'));
            });
        } else {
            postsContainer.innerHTML = '<p>No posts to show.</p>';
        }

        if (followButtonHtml) {
            container.querySelector('#follow-btn').addEventListener('click', async (e) => {
                const button = e.target;
                const isFollowing = button.textContent === 'Unfollow';
                const success = await actions.mastodonFollow(accountId, !isFollowing, 'pixelfed');
                if (success) {
                    button.textContent = isFollowing ? 'Follow' : 'Unfollow';
                }
            });
        }

    } catch (error) {
        container.innerHTML = `<p>Could not load Pixelfed profile. ${error.message}</p>`;
    }
}

export async function renderProfilePage(state, actions, platform, accountId = null, userAcct = null) {
    const profileView = document.getElementById('profile-page-view');
    profileView.innerHTML = ''; // Clear previous content

    let currentPlatform = platform || 'mastodon';

    const tabsHtml = `
        <div class="profile-tabs">
            <button data-platform="mastodon" class="${currentPlatform === 'mastodon' ? 'active' : ''}">Mastodon</button>
            <button data-platform="lemmy" class="${currentPlatform === 'lemmy' ? 'active' : ''}">Lemmy</button>
            <button data-platform="pixelfed" class="${currentPlatform === 'pixelfed' ? 'active' : ''}">Pixelfed</button>
        </div>
        <div id="profile-content"></div>
    `;
    profileView.innerHTML = tabsHtml;
    const contentContainer = document.getElementById('profile-content');

    const switchTab = async (targetPlatform) => {
        state.currentProfileTab = targetPlatform;
        document.querySelectorAll('.profile-tabs button').forEach(btn => btn.classList.remove('active'));
        document.querySelector(`.profile-tabs button[data-platform="${targetPlatform}"]`).classList.add('active');

        if (targetPlatform === 'mastodon') {
            await renderMastodonProfile(state, actions, contentContainer, accountId || (state.currentUser ? state.currentUser.id : null), userAcct);
        } else if (targetPlatform === 'lemmy') {
            await renderLemmyProfile(state, actions, contentContainer, userAcct || localStorage.getItem('lemmy_username'));
        } else if (targetPlatform === 'pixelfed') {
            if (accountId) {
                await renderPixelfedProfile(state, actions, contentContainer, accountId);
            } else if (state.pixelfedAccessToken) {
                const { data: account } = await apiFetch(state.pixelfedInstanceUrl, state.pixelfedAccessToken, '/api/v1/accounts/verify_credentials');
                await renderPixelfedProfile(state, actions, contentContainer, account.id);
            } else {
                contentContainer.innerHTML = '<p>Please log in to your Pixelfed account to view your profile.</p>';
            }
        }
    };

    profileView.querySelector('.profile-tabs').addEventListener('click', (e) => {
        if (e.target.tagName === 'BUTTON') {
            switchTab(e.target.dataset.platform);
        }
    });

    await switchTab(currentPlatform);
}

export async function renderEditProfilePage(state, actions) {
    // ... (existing code, no changes needed here for this feature)
}
