import { apiFetch } from './api.js';
import { renderStatus } from './Post.js';
import { renderLemmyCard } from './Lemmy.js';
import { showLoadingBar, hideLoadingBar } from './ui.js';

let lemmyCommunitiesPage = 1;
let lemmyCommunitiesHasMore = true;

async function fetchLemmyCommunities(state, actions) {
    showLoadingBar();
    const communityList = document.getElementById('lemmy-communities-list');
    const loader = document.getElementById('lemmy-communities-loader');
    loader.style.display = 'block';

    try {
        const lemmyInstance = localStorage.getItem('lemmy_instance') || state.lemmyInstances[0];
        const response = await apiFetch(lemmyInstance, null, `/api/v3/community/list?sort=TopDay&page=${lemmyCommunitiesPage}`, {}, 'lemmy');
        
        if (response.data.communities.length > 0) {
            response.data.communities.forEach(communityView => {
                const communityCard = document.createElement('div');
                communityCard.className = 'lemmy-community-card';
                communityCard.innerHTML = `
                    <div class="community-card-header">
                        <img src="${communityView.community.icon}" alt="Community Icon" class="community-card-icon">
                        <div class="community-card-info">
                            <a href="#" class="community-card-name">${communityView.community.name}</a>
                            <p class="community-card-instance">${new URL(communityView.community.actor_id).hostname}</p>
                        </div>
                    </div>
                    <div class="community-card-stats">
                        <span>${communityView.counts.subscribers} subscribers</span>
                    </div>
                `;
                communityCard.querySelector('.community-card-name').addEventListener('click', (e) => {
                    e.preventDefault();
                    actions.showLemmyCommunity(communityView.community.name);
                });
                communityList.appendChild(communityCard);
            });
            lemmyCommunitiesPage++;
        } else {
            lemmyCommunitiesHasMore = false;
        }
    } catch (error) {
        console.error('Failed to fetch Lemmy communities:', error);
    } finally {
        loader.style.display = 'none';
        hideLoadingBar();
    }
}

export async function loadMoreLemmyCommunities(state, actions) {
    if (lemmyCommunitiesHasMore) {
        await fetchLemmyCommunities(state, actions);
    }
}

export async function loadMoreMastodonTrendingPosts(state, actions) {
    if (state.mastodonTrendingHasMore) {
        await fetchMastodonTrendingPosts(state, actions);
    }
}

function switchDiscoverTab(tabName, state) {
    state.currentDiscoverTab = tabName;
    document.querySelectorAll('.discover-tab-content').forEach(tab => {
        tab.style.display = 'none';
    });
    document.querySelectorAll('.discover-tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });

    document.getElementById(`${tabName}-discover`).style.display = 'block';
    document.querySelector(`.discover-tab-btn[data-tab="${tabName}"]`).classList.add('active');
}

export async function renderDiscoverPage(state, actions) {
    const discoverView = document.getElementById('discover-view');
    discoverView.innerHTML = `
        <div class="discover-header">
            <div class="discover-tabs">
                <button class="discover-tab-btn active" data-tab="lemmy">Lemmy</button>
                <button class="discover-tab-btn" data-tab="mastodon-trending">Mastodon Trending</button>
                 <button class="discover-tab-btn" data-tab="mastodon-profiles">Mastodon Profiles</button>
            </div>
        </div>
        
        <div id="lemmy-discover" class="discover-tab-content">
            <h3>Trending Communities on Lemmy</h3>
            <div id="lemmy-communities-list"></div>
            <div id="lemmy-communities-loader" class="scroll-loader" style="display: none;"></div>
        </div>
        
        <div id="mastodon-trending-discover" class="discover-tab-content" style="display: none;">
            <h3>Trending Posts on Mastodon</h3>
            <div id="mastodon-trending-posts-list"></div>
            <div id="mastodon-trending-posts-loader" class="scroll-loader" style="display: none;"></div>
        </div>
        
        <div id="mastodon-profiles-discover" class="discover-tab-content" style="display: none;">
            <h3>Suggested Profiles on Mastodon</h3>
            <div id="mastodon-suggested-profiles"></div>
        </div>
    `;

    document.querySelectorAll('.discover-tab-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            switchDiscoverTab(e.target.dataset.tab, state);
        });
    });

    // Initial load
    switchDiscoverTab(state.currentDiscoverTab, state);
    
    // Reset pages for fresh load
    lemmyCommunitiesPage = 1;
    lemmyCommunitiesHasMore = true;
    state.mastodonTrendingPage = 1;
    state.mastodonTrendingHasMore = true;

    document.getElementById('lemmy-communities-list').innerHTML = '';
    document.getElementById('mastodon-trending-posts-list').innerHTML = '';

    await fetchLemmyCommunities(state, actions);
    await fetchMastodonTrendingPosts(state, actions);
    await fetchSuggestedProfiles(state, actions);
}

async function fetchSuggestedProfiles(state, actions) {
    if (!state.instanceUrl) return;
    const container = document.getElementById('mastodon-suggested-profiles');
    container.innerHTML = 'Loading suggested profiles...';
    try {
        const { data: suggestions } = await apiFetch(state.instanceUrl, state.accessToken, '/api/v1/suggestions');
        container.innerHTML = '';
        if (suggestions && suggestions.length > 0) {
            suggestions.forEach(account => {
                const profileCard = document.createElement('div');
                profileCard.className = 'profile-suggestion-card';
                profileCard.innerHTML = `
                    <img src="${account.header_static}" class="profile-suggestion-header" onerror="this.style.display='none'">
                    <div class="profile-suggestion-content">
                        <img src="${account.avatar}" class="profile-suggestion-avatar">
                        <div class="profile-suggestion-names">
                            <strong>${account.display_name}</strong>
                            <span>@${account.acct}</span>
                        </div>
                        <button class="button-primary follow-suggestion-btn" data-id="${account.id}">Follow</button>
                    </div>
                `;
                
                profileCard.addEventListener('click', (e) => {
                    if (e.target.classList.contains('follow-suggestion-btn')) return;
                    actions.showProfilePage('mastodon', account.id, account.acct);
                });
                
                const followButton = profileCard.querySelector('.follow-suggestion-btn');
                followButton.addEventListener('click', async (e) => {
                    e.stopPropagation();
                    const success = await actions.mastodonFollow(account.id, true);
                    if (success) {
                        followButton.textContent = 'Followed';
                        followButton.disabled = true;
                    }
                });

                container.appendChild(profileCard);
            });
        } else {
            container.innerHTML = '<p>No suggestions available.</p>';
        }
    } catch (error) {
        console.error("Error fetching suggestions: ", error);
        container.innerHTML = '<p>Could not load suggestions.</p>';
    }
}

export async function fetchMastodonTrendingPosts(state, actions, append = false) {
    if (!state.instanceUrl) return;
    
    state.isLoadingMore = true;
    showLoadingBar();
    const loader = document.getElementById('mastodon-trending-posts-loader');
    if(loader) loader.style.display = 'block';

    const listContainer = document.getElementById('mastodon-trending-posts-list');
    if (!append) {
        listContainer.innerHTML = '';
        state.mastodonTrendingPage = 1;
    }

    try {
        const { data: posts, nextPageUrl } = await apiFetch(state.instanceUrl, state.accessToken, `/api/v1/trends/statuses?page=${state.mastodonTrendingPage}`, { withHeaders: true });

        if (posts && posts.length > 0) {
            posts.forEach(status => {
                listContainer.appendChild(renderStatus(status, state.currentUser, actions, state.settings));
            });
            state.mastodonTrendingPage++;
            state.mastodonTrendingHasMore = !!nextPageUrl;
        } else {
            state.mastodonTrendingHasMore = false;
            if (!append) {
                listContainer.innerHTML = '<p>No trending posts found.</p>';
            }
        }
    } catch (error) {
        console.error('Failed to fetch Mastodon trending posts:', error);
        listContainer.innerHTML = '<p>Could not load trending posts.</p>';
    } finally {
        state.isLoadingMore = false;
        hideLoadingBar();
        if(loader) loader.style.display = 'none';
    }
}
