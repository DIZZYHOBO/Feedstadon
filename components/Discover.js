import { apiFetch } from './api.js';
import { ICONS } from './icons.js';

async function renderLemmyCommunities(state, actions, container, loadMore = false) {
    if (!localStorage.getItem('lemmy_jwt')) {
        container.innerHTML = `<p>Log in to your Lemmy account to discover communities.</p>`;
        return;
    }

    try {
        const lemmyInstance = localStorage.getItem('lemmy_instance');
        const response = await apiFetch(lemmyInstance, null, '/api/v3/community/list', {}, 'lemmy', {
            sort: 'TopDay',
            limit: 20,
            page: state.lemmyDiscoverPage
        });

        if (!loadMore) container.innerHTML = '';

        response.data.communities.forEach(communityView => {
            const item = document.createElement('div');
            item.className = 'discover-list-item';
            item.innerHTML = `
                <img src="${communityView.community.icon}" class="avatar" onerror="this.onerror=null;this.src='./images/logo.png';">
                <div>
                    <div class="discover-item-title">${communityView.community.name}</div>
                    <div class="discover-item-subtitle">${communityView.counts.subscribers} subscribers</div>
                </div>
                <button class="button follow-btn ${communityView.subscribed === 'Subscribed' ? 'subscribed' : ''}" data-community-id="${communityView.community.id}">
                    ${communityView.subscribed === 'Subscribed' ? 'Following' : 'Follow'}
                </button>
            `;
            item.querySelector('.follow-btn').addEventListener('click', async (e) => {
                const button = e.currentTarget;
                const isSubscribed = button.classList.contains('subscribed');
                const success = await actions.lemmyFollowCommunity(communityView.community.id, !isSubscribed);
                if (success) {
                    button.classList.toggle('subscribed');
                    button.textContent = isSubscribed ? 'Follow' : 'Following';
                }
            });
            container.appendChild(item);
        });
        state.lemmyDiscoverHasMore = response.data.communities.length > 0;
    } catch (err) {
        container.innerHTML = `<p>Could not load Lemmy communities.</p>`;
    }
}

async function renderMastodonTrendingPosts(state, actions, container, loadMore = false) {
    if (!state.instanceUrl) {
        container.innerHTML = `<p>Log in to your Mastodon account to see trending posts.</p>`;
        return;
    }

    try {
        const { data, next } = await apiFetch(state.instanceUrl, state.accessToken, `/api/v1/trends/statuses`, {
            params: { limit: 20, offset: (state.mastodonTrendingPage - 1) * 20 }
        });

        if (!loadMore) container.innerHTML = '';

        data.forEach(status => {
            // Re-use status rendering logic if available, or create a simplified version
            const postCard = document.createElement('div');
            postCard.className = 'status'; // Use status for consistent styling
            postCard.innerHTML = `<div class="status-body-content">${status.content}</div>`;
            container.appendChild(postCard);
        });
        state.mastodonTrendingHasMore = data.length > 0;
    } catch (err) {
        container.innerHTML = `<p>Could not load trending posts.</p>`;
    }
}


export async function renderDiscoverPage(state, actions) {
    const view = document.getElementById('discover-view');
    view.innerHTML = `
        <div class="discover-sub-nav">
            <button class="discover-sub-nav-btn active" data-tab="lemmy">Communities</button>
            <button class="discover-sub-nav-btn" data-tab="mastodon-trending">Trending</button>
        </div>
        <div id="lemmy-discover-content" class="discover-tab-content active"></div>
        <div id="mastodon-trending-content" class="discover-tab-content"></div>
    `;

    const lemmyContainer = view.querySelector('#lemmy-discover-content');
    const mastodonContainer = view.querySelector('#mastodon-trending-content');

    view.querySelectorAll('.discover-sub-nav-btn').forEach(button => {
        button.addEventListener('click', () => {
            view.querySelector('.discover-sub-nav-btn.active').classList.remove('active');
            button.classList.add('active');
            
            state.currentDiscoverTab = button.dataset.tab;

            view.querySelector('.discover-tab-content.active').classList.remove('active');
            view.querySelector(`#${state.currentDiscoverTab}-content`).classList.add('active');
        });
    });

    await renderLemmyCommunities(state, actions, lemmyContainer);
    await renderMastodonTrendingPosts(state, actions, mastodonContainer);
}


export async function loadMoreLemmyCommunities(state, actions) {
    if (state.isLoadingMore) return;
    state.isLoadingMore = true;
    state.lemmyDiscoverPage++;
    const container = document.getElementById('lemmy-discover-content');
    await renderLemmyCommunities(state, actions, container, true);
    state.isLoadingMore = false;
}

export async function loadMoreMastodonTrendingPosts(state, actions) {
    if (state.isLoadingMore) return;
    state.isLoadingMore = true;
    state.mastodonTrendingPage++;
    const container = document.getElementById('mastodon-trending-content');
    await renderMastodonTrendingPosts(state, actions, container, true);
    state.isLoadingMore = false;
}
