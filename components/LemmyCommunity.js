import { apiFetch } from './api.js';
import { renderLemmyCard } from './Lemmy.js';
import { ICONS } from './icons.js';

export async function renderLemmyCommunityPage(state, actions, communityName) {
    const view = document.getElementById('lemmy-community-view');
    view.innerHTML = `<div class="loading-spinner">${ICONS.refresh}</div>`;

    try {
        const [name, instance] = communityName.split('@');
        const lemmyInstance = instance || localStorage.getItem('lemmy_instance');
        if (!lemmyInstance) throw new Error("Lemmy instance not found.");

        const { data } = await apiFetch(lemmyInstance, null, '/api/v3/community', {}, 'lemmy', { name: name });
        const communityView = data.community_view;
        const postsResponse = await apiFetch(lemmyInstance, null, '/api/v3/post/list', {}, 'lemmy', { community_name: name, sort: 'New' });
        const posts = postsResponse.data.posts;

        const community = communityView.community;

        let followButton = '';
        if (localStorage.getItem('lemmy_jwt')) {
            followButton = `<button class="button follow-btn ${communityView.subscribed === 'Subscribed' ? 'subscribed' : ''}">${communityView.subscribed === 'Subscribed' ? 'Following' : 'Follow'}</button>`;
        }

        view.innerHTML = `
            <div class="profile-card lemmy-community-card">
                <div class="profile-header">
                    <div class="banner" style="background-image: url('${community.banner || ''}'); background-color: var(--primary-color);"></div>
                    <img class="avatar" src="${community.icon || './images/logo.png'}" alt="${community.name} avatar" onerror="this.onerror=null;this.src='./images/logo.png';">
                </div>
                <div class="profile-actions">
                    ${followButton}
                </div>
                <div class="profile-info">
                    <h2 class="display-name">${community.name}</h2>
                    <div class="acct">${community.actor_id.split('/')[2]}</div>
                    <div class="note">${new showdown.Converter().makeHtml(community.description || '')}</div>
                    <div class="stats">
                        <span><strong>${communityView.counts.subscribers}</strong> Subscribers</span>
                        <span><strong>${communityView.counts.users_active_day}</strong> Active Today</span>
                    </div>
                </div>
            </div>
            <div class="profile-feed"></div>
        `;
        
        const feedContainer = view.querySelector('.profile-feed');
        if (posts && posts.length > 0) {
            posts.forEach(post => {
                feedContainer.appendChild(renderLemmyCard(post, actions));
            });
        } else {
            feedContainer.innerHTML = '<p>No posts in this community yet.</p>';
        }

        const followBtn = view.querySelector('.follow-btn');
        if (followBtn) {
            followBtn.addEventListener('click', async () => {
                const isSubscribed = followBtn.classList.contains('subscribed');
                const success = await actions.lemmyFollowCommunity(community.id, !isSubscribed);
                if (success) {
                    followBtn.classList.toggle('subscribed');
                    followBtn.textContent = isSubscribed ? 'Follow' : 'Following';
                }
            });
        }

    } catch (error) {
        console.error("Failed to load Lemmy community:", error);
        view.innerHTML = `<p>Could not load community. ${error.message}</p>`;
    }
}
