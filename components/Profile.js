import { apiFetch } from './api.js';
import { ICONS } from './icons.js';
import { renderStatus } from './Post.js';
import { renderLemmyCard } from './Lemmy.js';
import { renderCommentNode } from './LemmyPost.js';

async function renderMastodonProfile(state, actions, accountId = null) {
    const profileContainer = document.getElementById('profile-content');
    profileContainer.innerHTML = 'Loading profile...';

    const idToFetch = accountId || state.currentUser.id;

    try {
        const { data: account } = await apiFetch(state.instanceUrl, state.accessToken, `/api/v1/accounts/${idToFetch}`);
        const { data: statuses } = await apiFetch(state.instanceUrl, state.accessToken, `/api/v1/accounts/${idToFetch}/statuses`);

        const isOwnProfile = account.id === state.currentUser.id;

        const headerHtml = `
            <div class="profile-header">
                <img src="${account.header_static}" class="profile-banner">
                <div class="profile-details">
                    <img src="${account.avatar}" class="profile-avatar">
                    <div class="profile-actions">
                        ${isOwnProfile ? '<button id="edit-profile-btn">Edit Profile</button>' : '<button id="follow-btn">Follow</button>'}
                    </div>
                    <div class="profile-name">${account.display_name}</div>
                    <div class="profile-handle">@${account.acct}</div>
                    <div class="profile-stats">
                        <span><strong>${account.statuses_count}</strong> Posts</span>
                        <span><strong>${account.following_count}</strong> Following</span>
                        <span><strong>${account.followers_count}</strong> Followers</span>
                    </div>
                    <div class="profile-bio">${account.note}</div>
                </div>
            </div>
        `;

        profileContainer.innerHTML = headerHtml;
        const postsContainer = document.createElement('div');
        postsContainer.className = 'profile-posts';
        statuses.forEach(status => {
            postsContainer.appendChild(renderStatus(status, state.currentUser, actions, state.settings));
        });
        profileContainer.appendChild(postsContainer);

        if (isOwnProfile) {
            document.getElementById('edit-profile-btn').addEventListener('click', () => {
                actions.showEditProfile();
            });
        } else {
            // Add follow/unfollow logic here
        }

    } catch (err) {
        profileContainer.innerHTML = `<p>Error loading profile: ${err.message}</p>`;
    }
}


async function renderLemmyProfile(state, actions, userAcct) {
    const profileContainer = document.getElementById('profile-content');
    profileContainer.innerHTML = 'Loading profile...';

    const [username, instance] = userAcct.split('@');
    const lemmyInstance = instance || localStorage.getItem('lemmy_instance');

    if (!lemmyInstance) {
        profileContainer.innerHTML = `<p>Lemmy instance not found.</p>`;
        return;
    }
    
    state.lemmyProfilePage = 1;
    state.lemmyProfileHasMore = true;

    try {
        const params = { username: username, sort: 'New', page: 1, limit: 20 };
        const response = await apiFetch(lemmyInstance, null, '/api/v3/user', {}, 'lemmy', params);
        
        const personView = response.data.person_view;
        const comments = response.data.comments;
        const posts = response.data.posts;

        const allContent = [...comments.map(c => ({...c, type: 'comment'})), ...posts.map(p => ({...p, type: 'post'}))]
                            .sort((a, b) => new Date(b[b.type].published) - new Date(a[a.type].published));

        const headerHtml = `
            <div class="profile-header lemmy-profile-header">
                ${personView.person.banner ? `<img src="${personView.person.banner}" class="profile-banner">` : '<div class="profile-banner-placeholder"></div>'}
                <div class="profile-details">
                    <img src="${personView.person.avatar}" class="profile-avatar">
                    <div class="profile-name">${personView.person.display_name || personView.person.name}</div>
                    <div class="profile-handle">@${personView.person.name}@${new URL(personView.person.actor_id).hostname}</div>
                    <div class="profile-stats">
                        <span><strong>${personView.counts.post_count}</strong> Posts</span>
                        <span><strong>${personView.counts.comment_count}</strong> Comments</span>
                    </div>
                    <div class="profile-bio">${personView.person.bio || ''}</div>
                </div>
            </div>
        `;
        
        profileContainer.innerHTML = headerHtml;
        const postsContainer = document.createElement('div');
        postsContainer.className = 'profile-posts';
        profileContainer.appendChild(postsContainer);
        
        renderLemmyProfileContent(allContent, postsContainer, state, actions);

    } catch (err) {
        console.error(err);
        profileContainer.innerHTML = `<p>Error loading Lemmy profile: ${err.message}</p>`;
    }
}

export async function loadMoreLemmyProfile(state, actions) {
    if (state.isLoadingMore || !state.lemmyProfileHasMore) return;
    
    state.isLoadingMore = true;
    state.scrollLoader.classList.add('loading');

    try {
        const userAcct = state.history[state.history.length - 1]?.userAcct; // A bit fragile, might need improvement
        if (!userAcct) throw new Error("Could not determine current user for profile loading.");

        const [username, instance] = userAcct.split('@');
        const lemmyInstance = instance || localStorage.getItem('lemmy_instance');
        
        state.lemmyProfilePage++;
        const params = { username: username, sort: 'New', page: state.lemmyProfilePage, limit: 20 };
        const response = await apiFetch(lemmyInstance, null, '/api/v3/user', {}, 'lemmy', params);

        const comments = response.data.comments;
        const posts = response.data.posts;

        const allContent = [...comments.map(c => ({...c, type: 'comment'})), ...posts.map(p => ({...p, type: 'post'}))]
                            .sort((a, b) => new Date(b[b.type].published) - new Date(a[a.type].published));

        if (allContent.length > 0) {
            const postsContainer = document.querySelector('#profile-content .profile-posts');
            renderLemmyProfileContent(allContent, postsContainer, state, actions);
        } else {
            state.lemmyProfileHasMore = false;
        }

    } catch (err) {
        console.error("Failed to load more content:", err);
    } finally {
        state.isLoadingMore = false;
        state.scrollLoader.classList.remove('loading');
    }
}

function renderLemmyProfileContent(content, container, state, actions) {
    content.forEach(item => {
        let element;
        if (item.type === 'comment') {
            element = renderCommentNode(item, actions);
            
            const screenshotBtn = document.createElement('button');
            screenshotBtn.innerHTML = ICONS.camera;
            screenshotBtn.title = 'Screenshot this comment';
            screenshotBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                actions.showScreenshotPage(item, item.post_view);
            });
             if(element.querySelector('.status-header-side')) {
                element.querySelector('.status-header-side').prepend(screenshotBtn);
            }
            
        } else { // post
            element = renderLemmyCard(item, actions);
        }
        container.appendChild(element);
    });
}

export function renderEditProfilePage(state, actions) {
    const container = document.getElementById('edit-profile-view');
    // Logic for rendering the edit profile form would go here
    container.innerHTML = `<h2>Edit Profile</h2><p>Editing is not yet implemented.</p>`;
}

export function renderProfilePage(state, actions, platform, accountId = null, userAcct = null) {
    const container = document.getElementById('profile-page-view');
    container.innerHTML = `
        <div class="profile-tabs">
            <button class="profile-tab-btn" data-platform="mastodon">Mastodon</button>
            <button class="profile-tab-btn" data-platform="lemmy">Lemmy</button>
        </div>
        <div id="profile-content"></div>
    `;

    const tabButtons = container.querySelectorAll('.profile-tab-btn');
    
    function switchTab(targetPlatform) {
        state.currentProfileTab = targetPlatform;
        tabButtons.forEach(btn => {
            btn.classList.toggle('active', btn.dataset.platform === targetPlatform);
        });

        if (targetPlatform === 'mastodon') {
            if (state.currentUser) {
                renderMastodonProfile(state, actions, accountId);
            } else {
                document.getElementById('profile-content').innerHTML = `<p>Please log in to your Mastodon account to see profiles.</p>`;
            }
        } else if (targetPlatform === 'lemmy') {
            const lemmyUsername = userAcct || localStorage.getItem('lemmy_username');
            if (lemmyUsername) {
                renderLemmyProfile(state, actions, lemmyUsername);
            } else {
                document.getElementById('profile-content').innerHTML = `<p>Please log in to your Lemmy account to see profiles.</p>`;
            }
        }
    }

    tabButtons.forEach(button => {
        button.addEventListener('click', () => switchTab(button.dataset.platform));
    });
    
    switchTab(platform || state.currentProfileTab);
}
