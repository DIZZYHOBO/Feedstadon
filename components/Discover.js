import { apiFetch } from './api.js';
import { renderStatus } from './Post.js';
import { ICONS } from './icons.js';

// --- Mastodon Discover Section ---

export async function loadMoreMastodonTrendingPosts(state, actions) {
    const container = document.querySelector('#mastodon-discover-content');
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
        <div id="mastodon-discover-content" class="discover-content-area"></div>
    `;

    const contentArea = container.querySelector('#mastodon-discover-content');
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

function renderCommunityList(communities, actions, container) {
    if (communities.length === 0) {
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
            <img src="${community.icon}" class="avatar" onerror="this.src='./images/logo.png'"/>
            <div>
                <div class="discover-item-title">${community.name}</div>
                <div class="discover-item-subtitle">${community.actor_id.split('/')[2]}</div>
            </div>
            <button class="button-secondary follow-btn">${isSubscribed ? 'Unfollow' : 'Follow'}</button>
        `;

        communityEl.addEventListener('click', () => {
            const instance = new URL(community.actor_id).hostname;
            actions.showLemmyCommunity(`${community.name}@${instance}`);
        });

        communityEl.querySelector('.follow-btn').addEventListener('click', async (e) => {
            e.stopPropagation();
            const currentlySubscribed = e.target.textContent === 'Unfollow';
            const success = await actions.lemmyFollowCommunity(community.id, !currentlySubscribed);
            if (success) {
                e.target.textContent = currentlySubscribed ? 'Follow' : 'Unfollow';
            }
        });

        container.appendChild(communityEl);
    });
}

export async function loadMoreLemmyCommunities(state, actions) {
    await renderLemmyDiscover(state, actions, null, true);
}

async function renderLemmyDiscover(state, actions, container, loadMore = false) {
    if (state.isLoadingMore) return;
    state.isLoadingMore = true;
    
    const contentArea = document.querySelector('#lemmy-discover-content-area');
    
    try {
        const lemmyInstance = localStorage.getItem('lemmy_instance') || state.lemmyInstances[0];
        
        if (!loadMore) {
            container.innerHTML = `
                <form id="lemmy-community-search-form">
                    <input type="search" id="lemmy-community-search" placeholder="Search for Lemmy communities...">
                </form>
                <div id="lemmy-search-results-container" style="display: none;"></div>
                <div id="lemmy-discover-content-area" class="discover-content-area"></div>
            `;
            
            const searchForm = container.querySelector('#lemmy-community-search-form');
            const searchInput = container.querySelector('#lemmy-community-search');
            const searchResultsContainer = container.querySelector('#lemmy-search-results-container');

            searchForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                const query = searchInput.value.trim();
                if (query.length > 0) {
                    const { data } = await apiFetch(lemmyInstance, null, '/api/v3/search', {}, 'lemmy', { q: query, type_: 'Communities', sort: 'TopAll' });
                    renderCommunityList(data.communities, actions, searchResultsContainer);
                    searchResultsContainer.style.display = 'block';
                } else {
                    searchResultsContainer.style.display = 'none';
                }
            });
        }
        
        const communityContainer = container ? container.querySelector('#lemmy-discover-content-area') : contentArea;
        const { data } = await apiFetch(lemmyInstance, null, '/api/v3/community/list', {}, 'lemmy', { 
            sort: 'TopDay',
            page: loadMore ? state.lemmyDiscoverPage : 1
        });
        
        if (data.communities.length > 0) {
            if (!loadMore) communityContainer.innerHTML = '';
            renderCommunityList(data.communities, actions, communityContainer);
            state.lemmyDiscoverPage++;
            state.lemmyDiscoverHasMore = true;
        } else {
            state.lemmyDiscoverHasMore = false;
        }
    } catch (error) {
        if (!loadMore) container.innerHTML = `<p>Could not load Lemmy communities.</p>`;
    } finally {
        state.isLoadingMore = false;
    }
}

async function renderSubscribedLemmy(state, actions, container) {
    if (state.isLoadingMore) return;
    state.isLoadingMore = true;

    try {
        const lemmyInstance = localStorage.getItem('lemmy_instance') || state.lemmyInstances[0];
        const { data } = await apiFetch(lemmyInstance, null, '/api/v3/community/list', {}, 'lemmy', {
            type_: 'Subscribed',
            sort: 'TopDay',
            limit: 50
        });
        renderCommunityList(data.communities, actions, container);
    } catch (error) {
        container.innerHTML = `<p>Could not load subscribed communities.</p>`;
    } finally {
        state.isLoadingMore = false;
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
        <div id="lemmy-discover-content" class="discover-tab-content"></div>
        <div id="mastodon-discover-content" class="discover-tab-content"></div>
    `;

    const tabs = view.querySelectorAll('.profile-tabs .tab-button');
    const subscribedContent = view.querySelector('#subscribed-discover-content');
    const lemmyContent = view.querySelector('#lemmy-discover-content');
    const mastodonContent = view.querySelector('#mastodon-discover-content');

    function switchTab(platform) {
        tabs.forEach(t => t.classList.remove('active'));
        subscribedContent.classList.remove('active');
        lemmyContent.classList.remove('active');
        mastodonContent.classList.remove('active');

        view.querySelector(`[data-discover-tab="${platform}"]`).classList.add('active');
        state.currentDiscoverTab = platform;

        if (platform === 'subscribed') {
            subscribedContent.classList.add('active');
            renderSubscribedLemmy(state, actions, subscribedContent);
        } else if (platform === 'lemmy') {
            lemmyContent.classList.add('active');
            state.lemmyDiscoverPage = 1;
            renderLemmyDiscover(state, actions, lemmyContent);
        } else {
            mastodonContent.classList.add('active');
            renderMastodonDiscover(state, actions, mastodonContent);
        }
    }

    tabs.forEach(tab => {
        tab.addEventListener('click', () => switchTab(tab.dataset.discoverTab));
    });

    // Initial load
    switchTab('subscribed');
}
// Add this to your components/Discover.js file to integrate Loops discovery:

/**
 * Fetch trending Loops creators
 */
async function fetchLoopsTrending(state, actions, container) {
    try {
        container.innerHTML = '<p>Loading trending Loops creators...</p>';
        
        // Note: These endpoints are estimates - adjust based on actual Loops API
        const response = await fetch('https://loops.video/api/v1/trending/creators');
        
        if (!response.ok) {
            throw new Error('Failed to fetch trending creators');
        }
        
        const creators = await response.json();
        container.innerHTML = '';
        
        if (creators && creators.length > 0) {
            creators.forEach(creator => {
                const creatorEl = document.createElement('div');
                creatorEl.className = 'discover-list-item loops-creator-item';
                creatorEl.innerHTML = `
                    <img src="${creator.avatar || './images/php.png'}" class="avatar" onerror="this.onerror=null;this.src='./images/php.png';">
                    <div>
                        <div class="discover-item-title">${creator.display_name || creator.username}</div>
                        <div class="discover-item-subtitle">@${creator.username}@loops.video</div>
                        <div class="discover-item-stats">
                            ${creator.videos_count || 0} videos · ${creator.followers_count || 0} followers
                        </div>
                    </div>
                    <span class="platform-badge loops">Loops</span>
                `;
                
                creatorEl.addEventListener('click', () => {
                    actions.showLoopsProfile(creator.username, 'loops.video');
                });
                
                container.appendChild(creatorEl);
            });
        } else {
            // Fallback: Show some example Loops instances
            container.innerHTML = `
                <div class="discover-section-info">
                    <h4>Loops - Federated Short Videos</h4>
                    <p>Loops is a new federated platform for short-form videos. Search for Loops users with @username@loops.video</p>
                    <div class="loops-instances-list">
                        <h5>Known Loops Instances:</h5>
                        <ul>
                            <li><a href="https://loops.video" target="_blank">loops.video</a> (Main instance)</li>
                        </ul>
                    </div>
                </div>
            `;
        }
    } catch (error) {
        console.error('Failed to fetch Loops trending:', error);
        container.innerHTML = `
            <div class="discover-section-info">
                <h4>Loops Integration</h4>
                <p>Loops profiles can be viewed by searching for users in the format: @username@loops.video</p>
                <p class="error-notice">Could not fetch trending creators. The Loops API may not be publicly available yet.</p>
            </div>
        `;
    }
}

// Update your renderDiscoverPage function to include a Loops tab:
// Add this to the existing tab structure in renderDiscoverPage

// In the HTML template section, add:
`<button class="tab-button" data-discover-tab="loops">Loops</button>`
`<div id="loops-discover-content" class="discover-tab-content"></div>`

// In the switchTab function, add:
else if (platform === 'loops') {
    loopsContent.classList.add('active');
    fetchLoopsTrending(state, actions, loopsContent);
}
