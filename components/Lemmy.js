import { apiFetch } from './api.js';
import { ICONS } from './icons.js';
import { formatTimestamp } from './utils.js';
import { renderLemmyPostPage } from './LemmyPost.js';
import { renderStatus } from './Post.js';

function renderLemmyCard(post, actions) {
    const card = document.createElement('div');
    // Use the same .status class as Mastodon posts for consistent styling
    card.className = 'status lemmy-card'; 
    card.dataset.postId = post.post.id;

    let thumbnailHTML = '';
    if (post.post.thumbnail_url) {
        // Use the same .status-media class for consistency
        thumbnailHTML = `<div class="status-media"><img src="${post.post.thumbnail_url}" alt="${post.post.name}" loading="lazy"></div>`;
    }

    card.innerHTML = `
        <div class="status-body-content">
            <div class="status-header">
                <img src="${post.community.icon}" alt="${post.community.name} icon" class="avatar">
                <div>
                    <span class="display-name">${post.community.name}</span>
                    <span class="acct">posted by ${post.creator.name} · ${formatTimestamp(post.post.published)}</span>
                </div>
            </div>
            <div class="status-content">
                <h3 class="lemmy-title">${post.post.name}</h3>
            </div>
            ${thumbnailHTML}
            <div class="status-footer">
                <button class="status-action lemmy-vote-btn" data-action="upvote" data-score="1">▲</button>
                <span class="lemmy-score">${post.counts.score}</span>
                <button class="status-action lemmy-vote-btn" data-action="downvote" data-score="-1">▼</button>
                <button class="status-action" data-action="view-comments">${ICONS.reply} ${post.counts.comments}</button>
                <button class="status-action" data-action="save">${ICONS.bookmark}</button>
            </div>
        </div>
    `;

    card.querySelectorAll('.lemmy-vote-btn').forEach(button => {
        button.addEventListener('click', (e) => {
            e.stopPropagation();
            const score = parseInt(e.currentTarget.dataset.score, 10);
            actions.lemmyVote(post.post.id, score, card);
        });
    });

    card.querySelector('[data-action="save"]').addEventListener('click', (e) => {
        e.stopPropagation();
        actions.lemmySave(post.post.id, e.currentTarget);
    });
    
    card.addEventListener('click', () => {
        actions.showLemmyPostDetail(post);
    });

    return card;
}


export async function renderLemmyCommunityPage(state, communityAcct, actions) {
    const container = document.getElementById('lemmy-community-view');
    container.innerHTML = `<p>Loading community...</p>`;

    try {
        const [communityName, communityHostname] = communityAcct.split('@');
        const communityResponse = await apiFetch(communityHostname, null, `/api/v3/community?name=${communityName}`);
        const community = communityResponse.data.community_view;
        
        const postsResponse = await apiFetch(communityHostname, null, `/api/v3/post/list?community_id=${community.community.id}`);
        const topLevelPosts = postsResponse.data.posts.filter(p => p.post.name && p.post.name.trim() !== '');

        container.innerHTML = `
            <div class="lemmy-community-header" style="background-image: url(${community.community.banner || ''})">
                <img src="${community.community.icon}" alt="${community.community.name} icon">
                <h2>${community.community.name}</h2>
            </div>
            <div class="lemmy-community-body">
                <div class="lemmy-sidebar">
                    <details open>
                        <summary>Sidebar</summary>
                        <p>${community.community.description || 'No description available.'}</p>
                    </details>
                </div>
                <div class="lemmy-post-list"></div>
            </div>
        `;

        const postList = container.querySelector('.lemmy-post-list');
        if (topLevelPosts.length > 0) {
            topLevelPosts.forEach(post => {
                postList.appendChild(renderLemmyCard(post, actions));
            });
        } else {
            postList.innerHTML = '<p>No posts in this community yet.</p>';
        }

    } catch (err) {
        console.error("Failed to load Lemmy community:", err);
        container.innerHTML = `<div class="view-header">Error</div><p>Could not load data for ${communityAcct}. The instance may be down or blocking requests (CORS).</p>`;
    }
}

export async function renderLemmyDiscoverPage(state, actions) {
    const container = document.getElementById('lemmy-discover-view');
    container.innerHTML = `<div class="view-header">Discover Lemmy Communities</div><div class="community-list-container"></div>`;
    const listContainer = container.querySelector('.community-list-container');
    listContainer.innerHTML = `<p>Fetching communities from multiple instances...</p>`;

    const promises = state.lemmyInstances.map(instanceUrl => 
        apiFetch(instanceUrl, null, '/api/v3/community/list').catch(err => ({ error: err, instance: instanceUrl }))
    );

    const results = await Promise.allSettled(promises);
    let hasContent = false;
    listContainer.innerHTML = '';

    results.forEach(result => {
        if (result.status === 'fulfilled' && result.value.data && result.value.data.communities) {
            const communities = result.value.data.communities;
            if (communities.length > 0) hasContent = true;

            communities.forEach(item => {
                const community = item.community;
                const fullAcct = `${community.name}@${new URL(community.actor_id).hostname}`;

                const communityDiv = document.createElement('div');
                communityDiv.className = 'search-result-item';
                communityDiv.innerHTML = `
                    <img src="${community.icon}" alt="${community.name} icon" style="width: 40px; height: 40px; border-radius: 8px;">
                    <div>
                        <div class="display-name">${community.name}</div>
                        <div class="acct">${new URL(community.actor_id).hostname}</div>
                    </div>
                `;
                communityDiv.addEventListener('click', () => actions.showLemmyCommunity(fullAcct));
                listContainer.appendChild(communityDiv);
            });
        } else {
            const instance = result.reason ? result.reason.instance : (result.value ? result.value.instance : 'Unknown');
            console.warn(`Failed to fetch from a Lemmy instance: ${instance}`);
        }
    });

    if (!hasContent) {
        listContainer.innerHTML = `<div class="status-body-content"><p>Could not fetch communities from any Lemmy instance. This might be due to network issues or Cross-Origin Resource Sharing (CORS) policies on the Lemmy servers, which this app cannot control. Please try again later.</p></div>`;
    }
}

export async function renderSubscribedFeed(state, actions) {
    const container = document.getElementById('subscribed-feed');

    const lemmyInstance = localStorage.getItem('lemmy_instance');
    const jwt = localStorage.getItem('lemmy_jwt');

    if (!jwt || !lemmyInstance) {
        container.innerHTML = `
            <div class="view-header">Not Logged In to Lemmy</div>
            <div class="status-body-content">
                <p>To see your subscribed Lemmy communities, you need to log in to your Lemmy account.</p>
                <p>Please go to <strong>Settings</strong> and enter your Lemmy credentials.</p>
            </div>
        `;
        return;
    }

    container.innerHTML = `<p>Loading subscribed feed...</p>`;

    try {
        const response = await apiFetch(lemmyInstance, jwt, '/api/v3/post/list?listing_type=Subscribed');
        const posts = response.data.posts;

        container.innerHTML = '';
        if (posts && posts.length > 0) {
            posts.forEach(post => {
                container.appendChild(renderLemmyCard(post, actions));
            });
        } else {
            container.innerHTML = '<div class="status-body-content"><p>No posts in your subscribed Lemmy communities yet.</p></div>';
        }
    } catch (err) {
        console.error("Failed to load subscribed Lemmy feed:", err);
        container.innerHTML = `
            <div class="view-header">Error</div>
            <div class="status-body-content">
                <p>Could not load your subscribed Lemmy feed.</p>
                <p>Please check your Lemmy login details in settings and ensure the instance is reachable.</p>
            </div>
        `;
    }
}

export async function renderUnifiedFeed(state, actions) {
    const container = document.getElementById('unified-feed');
    container.innerHTML = `<p>Loading home feed...</p>`;

    try {
        const lemmyInstance = localStorage.getItem('lemmy_instance');
        const lemmyJwt = localStorage.getItem('lemmy_jwt');

        const promises = [
            apiFetch(state.instanceUrl, state.accessToken, '/api/v1/timelines/home'),
        ];

        if (lemmyJwt && lemmyInstance) {
            promises.push(apiFetch(lemmyInstance, lemmyJwt, '/api/v3/post/list?listing_type=All'));
        }

        const [mastodonResponse, lemmyResponse] = await Promise.all(promises);

        const mastodonPosts = mastodonResponse.data;
        const lemmyPosts = lemmyResponse ? lemmyResponse.data.posts : [];

        const unified = [...mastodonPosts, ...lemmyPosts].sort((a, b) => {
            const dateA = new Date(a.created_at || a.post.published);
            const dateB = new Date(b.created_at || b.post.published);
            return dateB - dateA;
        });

        container.innerHTML = '';
        if (unified.length > 0) {
            unified.forEach(item => {
                if (item.post) {
                    container.appendChild(renderLemmyCard(item, actions));
                } else {
                    container.appendChild(renderStatus(item, state, actions));
                }
            });
        } else {
            container.innerHTML = '<p>Nothing to see in your unified feed.</p>';
        }

    } catch (err) {
        console.error("Failed to load unified feed:", err);
        container.innerHTML = '<p>Could not load unified feed.</p>';
    }
}
