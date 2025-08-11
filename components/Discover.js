import { apiFetch } from './api.js';
import { renderStatus } from './Post.js';
import { ICONS } from './icons.js';

// --- Utility Functions ---
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


// --- Lemmy Discover Section ---

export function loadMoreLemmyCommunities(state, actions) {
    // This function is kept for compatibility with app.js but is now deprecated.
    console.warn("loadMoreLemmyCommunities is deprecated.");
}

function renderCommunityList(communities, actions, container) {
    if (!communities || communities.length === 0) {
        container.innerHTML = '<p>No communities found.</p>';
        return;
    }

    container.innerHTML = '';
    communities.forEach(communityView => {
        const community = communityView.community;
        const communityEl = document.createElement('div');
        communityEl.className = 'discover-list-item';
        
        const isSubscribed = communityView.subscribed === "Subscribed";
        
        communityEl.innerHTML = `
            <img src="${community.icon || './images/logo.png'}" class="avatar" onerror="this.src='./images/logo.png'"/>
            <div>
                <div class="discover-item-title">${community.name}</div>
                <div class="discover-item-subtitle">${new URL(community.actor_id).hostname}</div>
            </div>
            <button class="button-secondary follow-btn">${isSubscribed ? 'Unfollow' : 'Follow'}</button>
        `;

        communityEl.addEventListener('click', () => {
             actions.showLemmyCommunity(community.name);
        });

        communityEl.querySelector('.follow-btn').addEventListener('click', async (e) => {
            e.stopPropagation();
            const currentlySubscribed = e.target.textContent === 'Unfollow';
            const success = await actions.lemmySubscribeCommunity(community.id, !currentlySubscribed);
            if (success) {
                e.target.textContent = currentlySubscribed ? 'Follow' : 'Unfollow';
            }
        });

        container.appendChild(communityEl);
    });
}

async function renderLemmyDiscover(state, actions, container) {
    container.innerHTML = `
        <form id="lemmy-community-search-form">
            <input type="search" id="lemmy-community-search" placeholder="Search for Lemmy communities...">
        </form>
        <div id="lemmy-discover-content-area" class="discover-content-area"></div>
    `;
    
    const searchInput = container.querySelector('#lemmy-community-search');
    const contentArea = container.querySelector('#lemmy-discover-content-area');

    const fetchAndRender = async (query = '') => {
        contentArea.innerHTML = '<p>Loading...</p>';
        const lemmyInstance = localStorage.getItem('lemmy_instance') || state.lemmyInstances[0];
        const endpoint = query 
            ? `/api/v3/community/list?q=${encodeURIComponent(query)}&limit=50`
            : '/api/v3/community/list?sort=TopDay&limit=50';
        
        try {
            const { data } = await apiFetch(lemmyInstance, state.lemmyAuthToken, endpoint, {}, 'lemmy');
            renderCommunityList(data.communities, actions, contentArea);
        } catch (error) {
            contentArea.innerHTML = `<p>Could not load communities.</p>`;
        }
    };

    const debouncedSearch = debounce(fetchAndRender, 300);

    searchInput.addEventListener('input', (e) => {
        debouncedSearch(e.target.value.trim());
    });
    
    // Initial load
    fetchAndRender();
}

async function renderSubscribedLemmy(state, actions, container) {
    container.innerHTML = '<p>Loading...</p>';
    const lemmyAuthToken = state.lemmyAuthToken || localStorage.getItem('lemmy_auth_token');
    if (!lemmyAuthToken) {
        container.innerHTML = `<p>You must be logged in to see subscribed communities.</p>`;
        return;
    }

    try {
        const lemmyInstance = localStorage.getItem('lemmy_instance') || state.lemmyInstances[0];
        const { data } = await apiFetch(lemmyInstance, lemmyAuthToken, '/api/v3/community/list', {}, 'lemmy', {
            type_: 'Subscribed',
            sort: 'TopDay',
            limit: 50
        });
        renderCommunityList(data.communities, actions, container);
    } catch (error) {
        console.error("Failed to fetch subscribed Lemmy communities:", error);
        container.innerHTML = `<p>Could not load subscribed communities.</p>`;
    }
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
            renderSubscribedLemmy(state, actions, subscribedContent);
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

