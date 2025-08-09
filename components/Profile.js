import { ICONS } from './icons.js';
import { apiFetch } from './api.js';
import { renderStatus } from './Post.js';
import { renderLemmyCard } from './Lemmy.js';
import { timeAgo } from './utils.js';
import { showToast } from './ui.js';

// --- Helper Functions to Fetch Profile Data ---
async function getMastodonProfile(state, accountId) {
    try {
        const [account, statuses] = await Promise.all([
            apiFetch(state.instanceUrl, state.accessToken, `/api/v1/accounts/${accountId}`),
            apiFetch(state.instanceUrl, state.accessToken, `/api/v1/accounts/${accountId}/statuses`)
        ]);
        return { account: account.data, statuses: statuses.data };
    } catch (error) {
        console.error("Failed to fetch Mastodon profile:", error);
        return null;
    }
}

async function getLemmyProfile(userAcct) {
    const lemmyInstance = localStorage.getItem('lemmy_instance');
    if (!lemmyInstance) return null;
    try {
        const [name] = userAcct.split('@');
        const response = await apiFetch(lemmyInstance, null, `/api/v3/user?username=${name}`, {}, 'lemmy');
        return response.data;
    } catch (error) {
        console.error(`Failed to fetch Lemmy profile for ${userAcct}:`, error);
        return null;
    }
}

// --- Main Page Rendering ---
export async function renderProfilePage(state, actions, platform, accountId, userAcct) {
    const view = document.getElementById('profile-page-view');
    view.innerHTML = `
        <div class="profile-page-header">
            <div class="profile-card">
                <div class="profile-header">
                    <img class="banner" src="" alt="Profile banner">
                    <img class="avatar" src="" alt="Profile avatar">
                </div>
                <div class="profile-info">
                    <h2 class="display-name">Loading...</h2>
                    <p class="acct"></p>
                    <div class="note"></div>
                    <div class="stats"></div>
                </div>
            </div>
            <div class="profile-tabs">
                <button class="tab-button" data-tab="mastodon">Mastodon</button>
                <button class="tab-button" data-tab="lemmy">Lemmy</button>
            </div>
        </div>
        <div class="profile-feed-content"></div>
    `;

    const bannerImg = view.querySelector('.banner');
    const avatarImg = view.querySelector('.avatar');
    const displayNameEl = view.querySelector('.display-name');
    const acctEl = view.querySelector('.acct');
    const noteEl = view.querySelector('.note');
    const statsEl = view.querySelector('.stats');
    const feedContainer = view.querySelector('.profile-feed-content');

    const switchTab = async (targetTab) => {
        view.querySelectorAll('.tab-button').forEach(b => b.classList.remove('active'));
        view.querySelector(`[data-tab="${targetTab}"]`).classList.add('active');
        feedContainer.innerHTML = 'Loading feed...';

        if (targetTab === 'mastodon') {
            const mastodonProfile = await getMastodonProfile(state, accountId);
            if (mastodonProfile) {
                feedContainer.innerHTML = '';
                mastodonProfile.statuses.forEach(status => {
                    feedContainer.appendChild(renderStatus(status, state.currentUser, actions, state.settings));
                });
            } else {
                feedContainer.innerHTML = '<p>Could not load Mastodon feed.</p>';
            }
        } else if (targetTab === 'lemmy') {
            const lemmyProfile = await getLemmyProfile(userAcct);
            if (lemmyProfile) {
                feedContainer.innerHTML = '';
                lemmyProfile.posts.forEach(post => {
                    feedContainer.appendChild(renderLemmyCard(post, actions));
                });
                lemmyProfile.comments.forEach(comment => {
                    // This is a simplified comment view for the profile page
                    const commentEl = document.createElement('div');
                    commentEl.className = 'status lemmy-comment-on-profile';
                    commentEl.innerHTML = `<div class="status-body-content"><div class="comment-context">Commented on: <strong>${comment.post.name}</strong></div><div class="status-content">${new showdown.Converter().makeHtml(comment.comment.content)}</div></div>`;
                    feedContainer.appendChild(commentEl);
                });
            } else {
                feedContainer.innerHTML = '<p>Could not load Lemmy feed.</p>';
            }
        }
    };

    view.querySelectorAll('.tab-button').forEach(button => {
        button.addEventListener('click', () => switchTab(button.dataset.tab));
    });

    // Initial load of the profile header and the selected tab
    if (platform === 'mastodon') {
        const mastodonProfile = await getMastodonProfile(state, accountId);
        if (mastodonProfile) {
            const account = mastodonProfile.account;
            bannerImg.src = account.header_static;
            avatarImg.src = account.avatar_static;
            displayNameEl.textContent = account.display_name;
            acctEl.textContent = `@${account.acct}`;
            noteEl.innerHTML = account.note;
            statsEl.innerHTML = `<span><strong>${account.followers_count}</strong> Followers</span><span><strong>${account.following_count}</strong> Following</span>`;
        }
    } else if (platform === 'lemmy') {
        const lemmyProfile = await getLemmyProfile(userAcct);
        if (lemmyProfile) {
            const person = lemmyProfile.person_view.person;
            const counts = lemmyProfile.person_view.counts;
            bannerImg.src = person.banner || '';
            avatarImg.src = person.avatar || '';
            displayNameEl.textContent = person.display_name || person.name;
            acctEl.textContent = `@${person.name}`;
            noteEl.innerHTML = new showdown.Converter().makeHtml(person.bio || '');
            statsEl.innerHTML = `<span><strong>${counts.post_count}</strong> Posts</span><span><strong>${counts.comment_count}</strong> Comments</span>`;
        }
    }
    
    // Trigger the initial tab load
    switchTab(platform);
}
