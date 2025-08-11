import { apiFetch } from './api.js';
import { renderStatus } from './Post.js';
import { ICONS } from './icons.js';

// --- Utility Functions ---
// Debounce function to limit the rate at which a function gets called.
function debounce(func, delay) {
    let timeout;
    return function(...args) {
        const context = this;
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(context, args), delay);
    };
}


// --- Mastodon Discover Section (Existing Code) ---

export async function loadMoreMastodonTrendingPosts(state, actions) {
    const container = document.querySelector('#mastodon-discover-content .discover-content-area');
    await fetchMastodonTrendingPosts(state, actions, container, true);
}

async function fetchMastodonTrendingPosts(state, actions, container, loadMore = false) {
    if (state.isLoadingMore) return;
    state.isLoadingMore = true;
    
    try {
        const { data } = await apiFetch(state.instanceUrl, state.accessToken, '/api/v1/trends/statuses', {
            params: { offset: loadMore ? state.mastodonTrendingPage * 20 : 0 }
        });

        if (!loadMore) container.innerHTML = '';
        
        if (data.length > 0) {
            data.forEach(status => {
                container.appendChild(renderStatus(status, state.currentUser, actions, state.settings));
            });
            state.mastodonTrendingPage++;
            state.mastodonTrendingHasMore = true;
        } else {
            state.mastodonTrendingHasMore = false;
        }
    } catch (error) {
        container.innerHTML = `<p>Could not load trending posts.</p>`;
    } finally {
        state.isLoadingMore = false;
    }
}

async function fetchMastodonTrendingHashtags(state, actions, container) {
    try {
        const { data } = await apiFetch(state.instanceUrl, state.accessToken, '/api/v1/trends/tags');
        container.innerHTML = '';
        data.forEach(tag => {
            const tagEl = document.createElement('div');
            tagEl.className = 'discover-list-item';
            tagEl.innerHTML = `
                <div>
                    <div class="discover-item-title">#${tag.name}</div>
                    <div class="discover-item-subtitle">${tag.history[0].uses} posts this week</div>
                </div>
            `;
            tagEl.addEventListener('click', () => actions.showHashtagTimeline(tag.name));
            container.appendChild(tagEl);
        });
    } catch (error) {
        container.innerHTML = `<p>Could not load trending hashtags.</p>`;
    }
}

async function fetchMastodonSuggestedFollows(state, actions, container) {
    try {
        const { data } = await apiFetch(state.instanceUrl, state.accessToken, '/api/v1/suggestions');
        container.innerHTML = '';
        data.forEach(account => {
            const accountEl = document.createElement('div');
            accountEl.className = 'discover-list-item';
            accountEl.innerHTML = `
                <img src="${account.avatar}" class="avatar" />
                <div>
                    <div class="discover-item-title">${account.display_name}</div>
                    <div class="discover-item-subtitle">@${account.acct}</div>
                </div>
                <button class="button-secondary follow-btn">Follow</button>
            `;
            accountEl.querySelector('.follow-btn').addEventListener('click', async (e) => {
                e.stopPropagation();
                const success = await actions.mastodonFollow(account.id, true);
                if (success) {
                    e.target.textContent = 'Followed';
                    e.target.disabled = true;
                }
            });
            container.appendChild(accountEl);
        });
    } catch (error) {
        container.innerHTML = `<p>Could not load suggested follows.</p>`;
    }
}

async function fetchMastodonTrendingNews(state, actions, container) {
     try {
        const { data } = await apiFetch(state.instanceUrl, state.accessToken, '/api/v1/trends/links');
        container.innerHTML = '';
        data.forEach(link => {
            const linkEl = document.createElement('div');
            linkEl.className = 'discover-list-item news-item';
            linkEl.innerHTML = `
                <div class="news-item-content">
                    <div class="discover-item-title">${link.title}</div>
                    <div class="discover-item-subtitle">${link.provider_name}</div>
                </div>
                ${link.image ? `<img src="${link.image}" class="news-item-thumbnail" />` : ''}
            `;
            linkEl.addEventListener('click', () => window.open(link.url, '_blank'));
            container.appendChild(linkEl);
        });
    } catch (error) {
        container.innerHTML = `<p>Could not load trending news.</p>`;
    }
}


function renderMastodonDiscover(state, actions, container) {
    container.innerHTML = `
        <div class="discover-sub-nav">
            <button class="discover-sub-nav-btn active" data-tab="trending">Trending</button>
            <button class="discover-sub-nav-btn" data-tab="hashtags">Hashtags</button>
            <button class="discover-sub-nav-btn" data-tab="people">People</button>
            <button class="discover-sub-nav-btn" data-tab="news">News</button>
        </div>
        <div class="discover-content-area"></div>
    `;

    const contentArea = container.querySelector('.discover-content-area');
    const tabs = container.querySelectorAll('.discover-sub-nav-btn');

    const switchTab = (tabName) => {
        contentArea.innerHTML = `<p>Loading...</p>`;
        tabs.forEach(t => t.classList.remove('active'));
        container.querySelector(`.discover-sub-nav-btn[data-tab="${tabName}"]`).classList.add('active');
        state.currentDiscoverTab = `mastodon-${tabName}`;
        
        switch(tabName) {
            case 'trending': 
                state.mastodonTrendingPage = 1;
                fetchMastodonTrendingPosts(state, actions, contentArea); 
                break;
            case 'hashtags': fetchMastodonTrendingHashtags(state, actions, contentArea); break;
            case 'people': fetchMastodonSuggestedFollows(state, actions, contentArea); break;
            case 'news': fetchMastodonTrendingNews(state, actions, contentArea); break;
        }
    };

    tabs.forEach(tab => {
        tab.addEventListener('click', () => switchTab(tab.dataset.tab));
    });

    // Load initial tab
    fetchMastodonTrendingPosts(state, actions, contentArea);
}


// --- Lemmy Discover Section (Corrected Implementation) ---

function renderCommunityListItem(communityView, actions) {
    const item = document.createElement('div');
    item.className = 'community-list-item';
    const community = communityView.community;

    item.innerHTML = `
        <div class="community-list-item-avatar">
            <img src="${community.icon || 'images/pfp.png'}" alt="${community.name}" class="avatar" onerror="this.onerror=null;this.src='images/pfp.png';">
        </div>
        <div class="community-list-item-info">
            <a href="#/lemmy/community/${community.name}" class="community-name">${community.title}</a>
            <p class="community-acct">!${community.name}@${new URL(community.actor_id).hostname}</p>
            <p class="community-description">${community.description || ''}</p>
            <div class="community-stats">
                <span>${communityView.counts.subscribers} Subscribers</span>
            </div>
        </div>
        <div class="community-list-item-actions">
            <button class="button-primary subscribe-btn" data-community-id="${community.id}">${communityView.subscribed === 'Subscribed' ? 'Subscribed' : 'Subscribe'}</button>
        </div>
    `;

    item.querySelector('.community-name').addEventListener('click', (e) => {
        e.preventDefault();
        actions.showLemmyCommunity(community.name);
    });

    const subscribeBtn = item.querySelector('.subscribe-btn');
    subscribeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const isSubscribed = communityView.subscribed === 'Subscribed';
        actions.lemmySubscribeCommunity(community.id, !isSubscribed)
            .then(updatedView => {
                communityView.subscribed = updatedView.community_view.subscribed; // Update state
                subscribeBtn.textContent = updatedView.community_view.subscribed === 'Subscribed' ? 'Subscribed' : 'Subscribe';
            });
    });

    return item;
}

async function loadSubscribedCommunities(container, actions) {
    container.innerHTML = '<div class="loading">Loading subscribed communities...</div>';
    const lemmyInstance = localStorage.getItem('lemmy_instance');
    const lemmyAuthToken = localStorage.getItem('lemmy_auth_token');

    if (!lemmyInstance || !lemmyAuthToken) {
        container.innerHTML = '<div class="error">You must be logged in to see subscribed communities.</div>';
        return;
    }

    try {
        const response = await apiFetch(lemmyInstance, lemmyAuthToken, '/api/v3/community/list?type_=Subscribed&limit=50', { method: 'GET' }, 'lemmy');
        const communities = response?.data?.communities;

        container.innerHTML = '';
        if (communities && communities.length > 0) {
            communities.forEach(communityView => {
                container.appendChild(renderCommunityListItem(communityView, actions));
            });
        } else {
            container.innerHTML = '<div class="empty">You have not subscribed to any communities yet.</div>';
        }
    } catch (error) {
        console.error('Failed to load subscribed communities:', error);
        container.innerHTML = '<div class="error">Failed to load subscribed communities.</div>';
    }
}

async function searchCommunities(query, container, actions) {
    container.innerHTML = '<div class="loading">Searching for communities...</div>';
    const lemmyInstance = localStorage.getItem('lemmy_instance');
    if (!lemmyInstance) {
        container.innerHTML = '<div class="error">Lemmy instance not set.</div>';
        return;
    }

    try {
        const endpoint = query ? `/api/v3/community/list?q=${encodeURIComponent(query)}&limit=50` : '/api/v3/community/list?sort=TopDay&limit=50';
        const response = await apiFetch(lemmyInstance, localStorage.getItem('lemmy_auth_token'), endpoint, { method: 'GET' }, 'lemmy');
        const communities = response?.data?.communities;

        container.innerHTML = '';
        if (communities && communities.length > 0) {
            communities.forEach(communityView => {
                container.appendChild(renderCommunityListItem(communityView, actions));
            });
        } else {
            container.innerHTML = `<div class="empty">No communities found for "${query}".</div>`;
        }
    } catch (error) {
        console.error('Failed to search communities:', error);
        container.innerHTML = '<div class="error">Failed to search for communities.</div>';
    }
}

function renderLemmyDiscover(state, actions, container) {
     container.innerHTML = `
        <div class="search-bar-container">
            <input type="search" id="lemmy-community-search" class="search-input" placeholder="Search for Lemmy communities...">
            <span class="search-icon">${ICONS.search}</span>
        </div>
        <div class="lemmy-communities-list content-container"></div>
    `;
    
    const communitiesListContainer = container.querySelector('.lemmy-communities-list');
    const searchInput = container.querySelector('#lemmy-community-search');

    const debouncedSearch = debounce((query) => {
        searchCommunities(query, communitiesListContainer, actions);
    }, 300);

    searchInput.addEventListener('input', (e) => {
        debouncedSearch(e.target.value);
    });

    // Initial load for communities tab
    searchCommunities('', communitiesListContainer, actions);
}


// --- Main Discover Page ---

export function renderDiscoverPage(state, actions) {
    const view = document.getElementById('discover-view');
    view.innerHTML = `
        <div class="profile-tabs">
            <button class="tab-button active" data-discover-tab="subscribed">Subbed</button>
            <button class="tab-button" data-discover-tab="lemmy">Lemmy</button>
            <button class="tab-button" data-discover-tab="mastodon">Mastodon</button>
        </div>
        <div id="subscribed-discover-content" class="discover-tab-content active"></div>
        <div id="lemmy-discover-content" class="discover-tab-content" style="display: none;"></div>
        <div id="mastodon-discover-content" class="discover-tab-content" style="display: none;"></div>
    `;

    const tabs = view.querySelectorAll('.profile-tabs .tab-button');
    const subscribedContent = view.querySelector('#subscribed-discover-content');
    const lemmyContent = view.querySelector('#lemmy-discover-content');
    const mastodonContent = view.querySelector('#mastodon-discover-content');

    function switchTab(platform) {
        tabs.forEach(t => t.classList.remove('active'));
        subscribedContent.style.display = 'none';
        lemmyContent.style.display = 'none';
        mastodonContent.style.display = 'none';

        view.querySelector(`[data-discover-tab="${platform}"]`).classList.add('active');
        state.currentDiscoverTab = platform;

        if (platform === 'subscribed') {
            subscribedContent.style.display = 'block';
            loadSubscribedCommunities(subscribedContent, actions);
        } else if (platform === 'lemmy') {
            lemmyContent.style.display = 'block';
            renderLemmyDiscover(state, actions, lemmyContent);
        } else {
            mastodonContent.style.display = 'block';
            renderMastodonDiscover(state, actions, mastodonContent);
        }
    }

    tabs.forEach(tab => {
        tab.addEventListener('click', () => switchTab(tab.dataset.discoverTab));
    });

    // Initial load
    switchTab('subscribed');
}
