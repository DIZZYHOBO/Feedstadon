import { apiFetch } from './api.js';
import { ICONS } from './icons.js';
import { renderStatus } from './Post.js'; // Assuming renderStatus is in Post.js

async function renderSubscribedCommunities(state, actions, container) {
    if (!localStorage.getItem('lemmy_jwt')) {
        container.innerHTML = `<p>Log in to your Lemmy account to see your subscribed communities.</p>`;
        return;
    }

    try {
        const lemmyInstance = localStorage.getItem('lemmy_instance');
        const response = await apiFetch(lemmyInstance, null, '/api/v3/community/list', {}, 'lemmy', {
            type_: 'Subscribed',
            sort: 'TopDay'
        });

        container.innerHTML = '';

        if (response.data.communities.length === 0) {
            container.innerHTML = `<p>You are not subscribed to any communities yet.</p>`;
            return;
        }

        response.data.communities.forEach(communityView => {
            const item = document.createElement('div');
            item.className = 'discover-list-item';
            item.innerHTML = `
                <img src="${communityView.community.icon}" class="avatar" onerror="this.onerror=null;this.src='./images/logo.png';">
                <div>
                    <div class="discover-item-title">${communityView.community.name}</div>
                    <div class="discover-item-subtitle">${communityView.counts.subscribers} subscribers</div>
                </div>
                <button class="button follow-btn subscribed" data-community-id="${communityView.community.id}">Following</button>
            `;
            item.addEventListener('click', () => actions.showLemmyCommunity(`${communityView.community.name}@${new URL(communityView.community.actor_id).hostname}`));
            item.querySelector('.follow-btn').addEventListener('click', async (e) => {
                e.stopPropagation();
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
    } catch (err) {
        container.innerHTML = `<p>Could not load subscribed communities.</p>`;
    }
}


async function renderLemmyCommunities(state, actions, container, loadMore = false) {
    if (!localStorage.getItem('lemmy_jwt')) {
        container.innerHTML = `<p>Log in to your Lemmy account to discover communities.</p>`;
        return;
    }
    
    if (!loadMore) {
        container.innerHTML = `
            <form id="lemmy-community-search-form">
                <input type="search" id="lemmy-community-search-input" placeholder="Search for communities...">
            </form>
            <div id="lemmy-community-list" class="discover-list"></div>
        `;
    }

    const searchInput = container.querySelector('#lemmy-community-search-input');
    const listContainer = container.querySelector('#lemmy-community-list');

    async function searchCommunities(query) {
        const lemmyInstance = localStorage.getItem('lemmy_instance');
        const response = await apiFetch(lemmyInstance, null, '/api/v3/community/list', {}, 'lemmy', {
            q: query,
            sort: 'TopDay',
            limit: 50
        });
        return response.data.communities;
    }

    async function listCommunities(page = 1) {
        const lemmyInstance = localStorage.getItem('lemmy_instance');
        const response = await apiFetch(lemmyInstance, null, '/api/v3/community/list', {}, 'lemmy', {
            sort: 'TopDay',
            limit: 20,
            page: page
        });
        return response.data.communities;
    }

    function renderList(communities, append = false) {
        if (!append) listContainer.innerHTML = '';
        communities.forEach(communityView => {
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
            item.addEventListener('click', () => actions.showLemmyCommunity(`${communityView.community.name}@${new URL(communityView.community.actor_id).hostname}`));
            item.querySelector('.follow-btn').addEventListener('click', async (e) => {
                e.stopPropagation();
                const button = e.currentTarget;
                const isSubscribed = button.classList.contains('subscribed');
                const success = await actions.lemmyFollowCommunity(communityView.community.id, !isSubscribed);
                if (success) {
                    button.classList.toggle('subscribed');
                    button.textContent = isSubscribed ? 'Follow' : 'Following';
                }
            });
            listContainer.appendChild(item);
        });
    }
    
    if (searchInput) {
        searchInput.addEventListener('input', async () => {
            const query = searchInput.value.trim();
            if (query.length > 2) {
                const communities = await searchCommunities(query);
                renderList(communities);
            } else if (query.length === 0) {
                const communities = await listCommunities();
                renderList(communities);
            }
        });
    }

    if (!loadMore) {
        const initialCommunities = await listCommunities();
        renderList(initialCommunities);
    } else {
        const communities = await listCommunities(state.lemmyDiscoverPage);
        renderList(communities, true);
        state.lemmyDiscoverHasMore = communities.length > 0;
    }
}

async function renderMastodonTrending(state, actions, container) {
    if (!state.instanceUrl) {
        container.innerHTML = `<p>Log in to your Mastodon account to see trending content.</p>`;
        return;
    }
    
    container.innerHTML = `
        <div class="discover-sub-nav">
            <button class="discover-sub-nav-btn active" data-trending-tab="posts">Posts</button>
            <button class="discover-sub-nav-btn" data-trending-tab="hashtags">Hashtags</button>
            <button class="discover-sub-nav-btn" data-trending-tab="news">News</button>
        </div>
        <div id="trending-posts-content" class="discover-tab-content active"></div>
        <div id="trending-hashtags-content" class="discover-tab-content"></div>
        <div id="trending-news-content" class="discover-tab-content"></div>
    `;

    const postsContainer = container.querySelector('#trending-posts-content');
    const hashtagsContainer = container.querySelector('#trending-hashtags-content');
    const newsContainer = container.querySelector('#trending-news-content');
    
    const loadedTabs = { posts: false, hashtags: false, news: false };

    async function loadTrendingData(tabName) {
        if (loadedTabs[tabName]) return;

        switch(tabName) {
            case 'posts':
                postsContainer.innerHTML = 'Loading...';
                const { data: posts } = await apiFetch(state.instanceUrl, state.accessToken, '/api/v1/trends/statuses');
                postsContainer.innerHTML = '';
                posts.forEach(status => postsContainer.appendChild(renderStatus(status, state.currentUser, actions, state.settings)));
                break;
            case 'hashtags':
                hashtagsContainer.innerHTML = 'Loading...';
                const { data: tags } = await apiFetch(state.instanceUrl, state.accessToken, '/api/v1/trends/tags');
                hashtagsContainer.innerHTML = '';
                tags.forEach(tag => {
                    const tagEl = document.createElement('a');
                    tagEl.href = '#';
                    tagEl.className = 'discover-list-item';
                    tagEl.textContent = `#${tag.name}`;
                    tagEl.addEventListener('click', (e) => {
                        e.preventDefault();
                        actions.showHashtagTimeline(tag.name);
                    });
                    hashtagsContainer.appendChild(tagEl);
                });
                break;
            case 'news':
                newsContainer.innerHTML = '<p>News feature is not yet available.</p>';
                break;
        }
        loadedTabs[tabName] = true;
    }

    container.querySelectorAll('.discover-sub-nav-btn').forEach(button => {
        button.addEventListener('click', () => {
            container.querySelector('.discover-sub-nav-btn.active').classList.remove('active');
            container.querySelector('.discover-tab-content.active').classList.remove('active');
            button.classList.add('active');
            container.querySelector(`#trending-${button.dataset.trendingTab}-content`).classList.add('active');
            loadTrendingData(button.dataset.trendingTab);
        });
    });

    loadTrendingData('posts');
}


export async function renderDiscoverPage(state, actions) {
    const view = document.getElementById('discover-view');
    view.innerHTML = `
        <div class="discover-sub-nav">
            <button class="discover-sub-nav-btn active" data-tab="subscribed">Subscribed</button>
            <button class="discover-sub-nav-btn" data-tab="lemmy">Communities</button>
            <button class="discover-sub-nav-btn" data-tab="mastodon-trending">Trending</button>
        </div>
        <div id="subscribed-content" class="discover-tab-content active"></div>
        <div id="lemmy-discover-content" class="discover-tab-content"></div>
        <div id="mastodon-trending-content" class="discover-tab-content"></div>
    `;

    const subscribedContainer = view.querySelector('#subscribed-content');
    const lemmyContainer = view.querySelector('#lemmy-discover-content');
    const mastodonContainer = view.querySelector('#mastodon-trending-content');

    const loadedTabs = {
        subscribed: false,
        lemmy: false,
        'mastodon-trending': false
    };

    async function loadTabData(tabName) {
        if (loadedTabs[tabName]) return;

        switch (tabName) {
            case 'subscribed':
                subscribedContainer.innerHTML = 'Loading...';
                await renderSubscribedCommunities(state, actions, subscribedContainer);
                break;
            case 'lemmy':
                lemmyContainer.innerHTML = 'Loading...';
                await renderLemmyCommunities(state, actions, lemmyContainer);
                break;
            case 'mastodon-trending':
                mastodonContainer.innerHTML = 'Loading...';
                await renderMastodonTrending(state, actions, mastodonContainer);
                break;
        }
        loadedTabs[tabName] = true;
    }

    view.querySelectorAll('.discover-sub-nav-btn').forEach(button => {
        button.addEventListener('click', () => {
            const newTab = button.dataset.tab;
            if (state.currentDiscoverTab === newTab) return;

            view.querySelector('.discover-sub-nav-btn.active').classList.remove('active');
            view.querySelector('.discover-tab-content.active').classList.remove('active');
            
            button.classList.add('active');
            const newContent = view.querySelector(`#${newTab}-content`);
            if (newContent) newContent.classList.add('active');
            
            state.currentDiscoverTab = newTab;
            loadTabData(newTab);
        });
    });

    await loadTabData('subscribed');
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
    await renderMastodonTrending(state, actions, container, true);
    state.isLoadingMore = false;
}
