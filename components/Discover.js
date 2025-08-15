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

async function fetchMastodonTrendingPosts(state, actions) {
    showLoadingBar();
    const postsList = document.getElementById('mastodon-trending-posts-list');
    const loader = document.getElementById('mastodon-trending-posts-loader');
    loader.style.display = 'block';

    try {
        const { data, nextPageUrl } = await fetchTimeline(state, `trends/statuses?page=${state.mastodonTrendingPage}`);
        state.nextPageUrl = nextPageUrl;

        if (data && data.length > 0) {
            data.forEach(status => {
                postsList.appendChild(renderStatus(status, state.currentUser, actions, state.settings));
            });
            state.mastodonTrendingPage++;
        } else {
            state.mastodonTrendingHasMore = false;
        }
    } catch (error) {
        console.error('Failed to fetch Mastodon trending posts:', error);
    } finally {
        loader.style.display = 'none';
        hideLoadingBar();
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
                    <img src="${account.header_static}" class="profile-suggestion-header">
                    <div class="profile-suggestion-content">
                        <img src="${account.avatar}" class="profile-suggestion-avatar">
                        <strong>${account.display_name}</strong>
                        <p>@${account.acct}</p>
                        <button class="button-primary follow-suggestion-btn" data-id="${account.id}">Follow</button>
                    </div>
                `;
                profileCard.addEventListener('click', () => actions.showProfilePage('mastodon', account.id, account.acct));
                container.appendChild(profileCard);
            });
        } else {
            container.innerHTML = 'No suggestions available.';
        }
    } catch (error) {
        container.innerHTML = 'Could not load suggestions.';
    }
}


// --- Timeline.js Functions (Refactored) ---
// Note: These functions are now part of Discover.js due to tight coupling with discover features
async function fetchTimeline(state, endpoint, append = false) {
    state.isLoadingMore = true;
    showLoadingBar();
    const loader = document.getElementById('mastodon-trending-posts-loader');
    if (loader) loader.style.display = 'block';

    let url = endpoint;
    if (append && state.nextPageUrl) {
        url = state.nextPageUrl.split(state.instanceUrl)[1];
    } else {
        // Construct initial URL
        url = `/api/v1/timelines/${endpoint}`;
    }
    
    // Special case for trending posts which is not under timelines
    if (endpoint.startsWith('trends/statuses')) {
        url = `/api/v1/${endpoint}`;
    }

    try {
        const response = await apiFetch(state.instanceUrl, state.accessToken, url);
        if (response.error) {
            throw new Error(response.error);
        }

        let nextPageUrl = null;
        if (response.headers && response.headers.get('Link')) {
            const linkHeader = response.headers.get('Link');
            const links = linkHeader.split(',').reduce((acc, link) => {
                const parts = link.split(';');
                const url = parts[0].replace(/<|>/g, '').trim();
                const rel = parts[1].match(/rel="([^"]+)"/)[1];
                acc[rel] = url;
                return acc;
            }, {});
            nextPageUrl = links.next;
        }

        return { data: response.data, nextPageUrl: nextPageUrl };
    } catch (error) {
        console.error('Error fetching timeline:', error);
        return { data: [], nextPageUrl: null };
    } finally {
        state.isLoadingMore = false;
        hideLoadingBar();
        if (loader) loader.style.display = 'none';
    }
}

// -- refactor fetchLemmyFeed to be part of Discover.js
export async function fetchLemmyFeed(state, actions, append = false, onLoginSuccess) {
    if (!localStorage.getItem('lemmy_jwt')) {
        renderLoginPrompt('lemmy', onLoginSuccess);
        return;
    }

    state.isLoadingMore = true;
    showLoadingBar();
    const loader = document.getElementById('scroll-loader');
    if (loader) loader.style.display = 'block';

    const timelineDiv = document.getElementById('timeline');
    if (!append) {
        timelineDiv.innerHTML = '';
        state.lemmyPage = 1;
        state.lemmyHasMore = true;
    }

    const lemmyInstance = localStorage.getItem('lemmy_instance') || state.lemmyInstances[0];
    const endpoint = `/api/v3/post/list?type_=${state.currentLemmyFeed}&sort=${state.currentLemmySort}&page=${state.lemmyPage}`;

    try {
        const response = await apiFetch(lemmyInstance, null, endpoint, {}, 'lemmy');
        if (response.data.posts && response.data.posts.length > 0) {
            response.data.posts.forEach(postView => {
                timelineDiv.appendChild(renderLemmyCard(postView, state, actions));
            });
            state.lemmyPage++;
        } else {
            state.lemmyHasMore = false;
            if (!append) {
                timelineDiv.innerHTML = '<p>No posts found.</p>';
            }
        }
    } catch (error) {
        console.error('Error fetching Lemmy feed:', error);
        timelineDiv.innerHTML = '<p>Error fetching posts. Please check your connection and login status.</p>';
    } finally {
        state.isLoadingMore = false;
        hideLoadingBar();
        if (loader) loader.style.display = 'none';
    }
}


export async function renderMastodonTrendingPosts(state, actions) {
    const postsList = document.getElementById('mastodon-trending-posts-list');
    postsList.innerHTML = ''; // Clear previous content
    state.mastodonTrendingPage = 1;
    state.mastodonTrendingHasMore = true;

    await fetchMastodonTrendingPosts(state, actions);
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
        const endpoint = `/api/v1/trends/statuses?page=${state.mastodonTrendingPage}`;
        const { data: posts, nextPageUrl } = await apiFetch(state.instanceUrl, state.accessToken, endpoint, { withHeaders: true });

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
async function fetchMoreData() {
    if (state.isLoadingMore) return;
    
    const nearBottom = window.innerHeight + window.scrollY >= document.body.offsetHeight - 500;
    if (!nearBottom) return;

    if (state.currentView === 'discover') {
        if (state.currentDiscoverTab === 'lemmy' && lemmyCommunitiesHasMore) {
            await loadMoreLemmyCommunities(state, actions);
        } else if (state.currentDiscoverTab === 'mastodon-trending' && state.mastodonTrendingHasMore) {
            await loadMoreMastodonTrendingPosts(state, actions);
        }
    }
}

window.addEventListener('scroll', fetchMoreData);
// -- Begin of refactored functions --

export async function fetchAndDisplayLemmyCommunities(state, actions) {
    const container = document.getElementById('lemmy-communities-list');
    if (!container) return; // Exit if the container is not on the page

    container.innerHTML = ''; // Clear existing content
    lemmyCommunitiesPage = 1; // Reset page count
    lemmyCommunitiesHasMore = true; // Reset flag

    await loadMoreLemmyCommunities(state, actions);
}

export async function fetchAndDisplayMastodonTrending(state, actions) {
    const container = document.getElementById('mastodon-trending-posts-list');
    if (!container) return;

    if (state.mastodonTrendingPage === 1) {
        container.innerHTML = ''; // Clear only on first load
        // **FIX:** Missing closing brace `}` for the `if` statement was here.
    } else {
        await loadMoreMastodonTrendingPosts(state, actions);
    }
}

export async function fetchAndDisplayMastodonProfiles(state, actions) {
    if (!state.instanceUrl) return;

    const container = document.getElementById('mastodon-suggested-profiles');
    if (!container) return;

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
                
                // Add event listener to the whole card for navigation
                profileCard.addEventListener('click', (e) => {
                    // Prevent navigation if the follow button was clicked
                    if (e.target.classList.contains('follow-suggestion-btn')) return;
                    actions.showProfilePage('mastodon', account.id, account.acct);
                });
                
                // Add event listener specifically to the follow button
                const followButton = profileCard.querySelector('.follow-suggestion-btn');
                followButton.addEventListener('click', async (e) => {
                    e.stopPropagation(); // Prevent card click event from firing
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
