import { apiFetch } from './api.js';
import { ICONS } from './icons.js';
import { timeAgo } from './utils.js';
import { renderLemmyCard } from './Lemmy.js';

export async function renderLemmyCommunityPage(communityName, state, actions) {
    const view = document.getElementById('lemmy-community-view');
    view.innerHTML = '<div class="loading">Loading community...</div>';

    const lemmyInstance = localStorage.getItem('lemmy_instance');
    if (!lemmyInstance) {
        view.innerHTML = '<div class="error">Lemmy instance not set.</div>';
        return;
    }

    if (!communityName) {
        console.error("No community name provided to renderLemmyCommunityPage");
        view.innerHTML = '<div class="error">Error: No community specified.</div>';
        return;
    }

    try {
        // Fetch community details
        const communityResponse = await apiFetch(lemmyInstance, null, `/api/v3/community?name=${communityName}`, { method: 'GET' }, 'lemmy');
        const communityView = communityResponse?.data?.community_view;

        if (!communityView) {
            throw new Error('Community not found.');
        }

        // Fetch posts from the community
        const postsResponse = await apiFetch(lemmyInstance, null, `/api/v3/post/list?community_name=${communityName}&sort=New`, { method: 'GET' }, 'lemmy');
        const posts = postsResponse?.data?.posts;

        const community = communityView.community;

        let headerImageUrl = community.banner || community.icon;

        view.innerHTML = `
            <div class="lemmy-community-header" style="background-image: url('${headerImageUrl || ''}')">
                <div class="lemmy-community-header-overlay">
                    <div class="lemmy-community-info">
                        <img src="${community.icon || 'images/pfp.png'}" alt="${community.name}" class="lemmy-community-avatar" onerror="this.onerror=null;this.src='images/pfp.png';">
                        <div class="lemmy-community-details">
                            <h2>${community.title}</h2>
                            <p>!${community.name}@${new URL(community.actor_id).hostname}</p>
                            <div class="lemmy-community-stats">
                                <span>${communityView.counts.subscribers} Subscribers</span>
                                <span>${communityView.counts.users_active_day} Active Today</span>
                            </div>
                        </div>
                    </div>
                    <div class="lemmy-community-actions">
                        <button class="button-primary subscribe-btn">${communityView.subscribed === "Subscribed" ? 'Subscribed' : 'Subscribe'}</button>
                    </div>
                </div>
            </div>
            <div class="lemmy-community-description">
                ${community.description ? new showdown.Converter().makeHtml(community.description) : ''}
            </div>
            <div class="lemmy-community-posts-container"></div>
        `;

        const postsContainer = view.querySelector('.lemmy-community-posts-container');
        if (posts && posts.length > 0) {
            posts.forEach(postView => {
                // Use renderLemmyCard to display each post in the community feed
                postsContainer.appendChild(renderLemmyCard(postView, actions));
            });
        } else {
            postsContainer.innerHTML = '<div class="empty">No posts in this community yet.</div>';
        }

        const subscribeBtn = view.querySelector('.subscribe-btn');
        subscribeBtn.addEventListener('click', () => {
            const isSubscribed = communityView.subscribed === "Subscribed";
            actions.lemmySubscribeCommunity(community.id, !isSubscribed)
                .then(updatedCommunityView => {
                    communityView.subscribed = updatedCommunityView.subscribed;
                    subscribeBtn.textContent = updatedCommunityView.subscribed === "Subscribed" ? 'Subscribed' : 'Subscribe';
                });
        });

    } catch (error) {
        console.error('Failed to load Lemmy community:', error);
        view.innerHTML = `<div class="error">Failed to load community: ${error.message}</div>`;
    }
}
 
