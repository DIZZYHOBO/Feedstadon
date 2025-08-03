import { apiFetch } from './api.js';
import { ICONS } from './icons.js';
import { formatTimestamp } from './utils.js';
import { renderLemmyPostPage } from './LemmyPost.js';
import { renderStatus } from './Post.js';

function renderLemmyPost(post, state, actions) {
    const postDiv = document.createElement('div');
    postDiv.className = 'status lemmy-post';
    postDiv.dataset.id = post.post.ap_id;

    const communityLink = `!${post.community.name}@${new URL(post.community.actor_id).hostname}`;
    const timestamp = formatTimestamp(post.post.published);

    let mediaHTML = '';
    if (post.post.url && post.post.thumbnail_url) {
        mediaHTML = `<div class="lemmy-thumbnail"><a href="${post.post.url}" target="_blank" rel="noopener noreferrer"><img src="${post.post.thumbnail_url}" alt="${post.post.name}" loading="lazy"></a></div>`;
    }

    postDiv.innerHTML = `
        <div class="status-body-content">
            <h3 class="lemmy-title">${post.post.name}</h3>
            ${mediaHTML}
            <div class="lemmy-post-footer">
                <span class="community-link" data-community-acct="${post.community.name}@${new URL(post.community.actor_id).hostname}">${communityLink}</span> · 
                <span class="lemmy-user">by ${post.creator.name}</span>
                <span class="timestamp">· ${timestamp}</span>
            </div>
            <div class="status-footer">
                <button class="status-action" data-action="view-comments">${ICONS.reply} ${post.counts.comments}</button>
                <button class="status-action" data-action="boost">${ICONS.boost} ${post.counts.score}</button>
            </div>
        </div>
    `;

    postDiv.querySelector('.community-link').addEventListener('click', (e) => {
        e.stopPropagation();
        actions.showLemmyCommunity(e.target.dataset.communityAcct);
    });

    postDiv.querySelector('.lemmy-title').addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        actions.showLemmyPostDetail(post);
    });
    
    postDiv.querySelectorAll('.status-action').forEach(button => {
        button.addEventListener('click', (e) => {
            e.stopPropagation();
            const action = button.dataset.action;
            if (action === 'view-comments') {
                actions.showLemmyPostDetail(post);
            } else {
                actions.toggleAction(action, { id: post.post.ap_id }, button);
            }
        });
    });

    return postDiv;
}

async function renderLemmyCommunityPage(state, communityAcct, switchView) {
    const container = document.getElementById('lemmy-community-view');
    switchView('lemmy-community');
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
                    <details>
                        <summary>Sidebar</summary>
                        <p>${community.community.description}</p>
                        <button class="subscribe-btn" data-community-id="${community.community.actor_id}">Subscribe</button>
                    </details>
                </div>
                <div class="lemmy-post-list"></div>
            </div>
        `;

        const postList = container.querySelector('.lemmy-post-list');
        topLevelPosts.forEach(post => {
            postList.appendChild(renderLemmyPost(post, state, state.actions));
        });

    } catch (err) {
        console.error("Failed to load Lemmy community:", err);
        container.innerHTML = `<p>Could not load community.</p>`;
    }
}

async function renderLemmyDiscoverPage(state, switchView) {
    const container = document.getElementById('lemmy-discover-view');
    switchView('lemmy-discover');
    container.innerHTML = `<div class="view-header">Discover Lemmy Communities</div>`;
    
    const communityList = document.createElement('div');
    container.appendChild(communityList);

    state.lemmyInstances.forEach(async (instanceUrl) => {
        try {
            const response = await apiFetch(instanceUrl, null, '/api/v3/community/list');
            if (!response.data || !response.data.communities) {
                 console.warn(`Could not fetch communities from ${instanceUrl}, it may be blocking requests.`);
                 return;
            }
            const communities = response.data.communities;

            communities.forEach(item => {
                const community = item.community;
                const communityDiv = document.createElement('div');
                communityDiv.className = 'search-result-item';
                communityDiv.innerHTML = `
                    <img src="${community.icon}" alt="${community.name} icon">
                    <div>
                        <div class="display-name">${community.name}</div>
                        <div class="acct">${community.actor_id.split('/c/')[1]}</div>
                    </div>
                    <button class="subscribe-btn" data-community-id="${community.actor_id}">Subscribe</button>
                `;
                communityList.appendChild(communityDiv);
            });
        } catch (err) {
            console.warn(`Could not fetch communities from ${instanceUrl}:`, err);
        }
    });
}

async function renderSubscribedFeed(state, switchView) {
    const container = document.getElementById('subscribed-feed');
    switchView('subscribed-feed');
    container.innerHTML = `<p>Loading subscribed feed...</p>`;

    try {
        const lemmyInstance = localStorage.getItem('lemmy_instance') || state.lemmyInstances[0];
        if (!lemmyInstance) {
            container.innerHTML = `<p>No Lemmy instance configured.</p>`;
            return;
        }

        const jwt = localStorage.getItem('lemmy_jwt');
        if (!jwt) {
            container.innerHTML = `<p>You are not logged into Lemmy. Please login in the settings.</p>`;
            return;
        }

        const response = await apiFetch(lemmyInstance, jwt, '/api/v3/post/list?listing_type=Subscribed');
        const posts = response.data.posts;

        container.innerHTML = '';
        if (posts && posts.length > 0) {
            posts.forEach(post => {
                const card = document.createElement('div');
                card.className = 'lemmy-card';
                card.dataset.postId = post.post.id;
                card.innerHTML = `
                    <div class="vote-sidebar">
                        <span>${ICONS.boost}</span>
                        <span>${post.counts.score}</span>
                    </div>
                    <div class="post-content">
                        <h3 class="lemmy-title">${post.post.name}</h3>
                        <div class="lemmy-post-footer">
                            <span class="community-link" data-community-acct="${post.community.name}@${new URL(post.community.actor_id).hostname}">!${post.community.name}</span> · 
                            <span class="lemmy-user">by ${post.creator.name}</span>
                            <span class="timestamp">· ${formatTimestamp(post.post.published)}</span>
                        </div>
                    </div>
                `;

                card.addEventListener('click', () => {
                    state.actions.showLemmyPostDetail(post);
                });

                container.appendChild(card);
            });
        } else {
            container.innerHTML = '<p>No posts in your subscribed communities.</p>';
        }
    } catch (err) {
        console.error("Failed to load subscribed Lemmy feed:", err);
        container.innerHTML = '<p>Could not load subscribed feed.</p>';
    }
}

async function renderUnifiedFeed(state, switchView) {
    const container = document.getElementById('unified-feed');
    switchView('unified-feed');
    container.innerHTML = `<p>Loading home feed...</p>`;

    try {
        const lemmyInstance = localStorage.getItem('lemmy_instance') || state.lemmyInstances[0];
        const lemmyJwt = localStorage.getItem('lemmy_jwt');

        const [mastodonResponse, lemmyResponse] = await Promise.all([
            apiFetch(state.instanceUrl, state.accessToken, '/api/v1/timelines/home'),
            lemmyJwt ? apiFetch(lemmyInstance, lemmyJwt, '/api/v3/post/list?listing_type=All') : Promise.resolve({ data: { posts: [] } })
        ]);

        const mastodonPosts = mastodonResponse.data;
        const lemmyPosts = lemmyResponse.data.posts;

        const unified = [...mastodonPosts, ...lemmyPosts].sort((a, b) => {
            const dateA = new Date(a.created_at || a.post.published);
            const dateB = new Date(b.created_at || b.post.published);
            return dateB - dateA;
        });

        container.innerHTML = '';
        unified.forEach(item => {
            if (item.post) { // It's a Lemmy post
                const card = document.createElement('div');
                card.className = 'lemmy-card';
                card.dataset.postId = item.post.id;
                card.innerHTML = `
                    <div class="vote-sidebar">
                        <span>${ICONS.boost}</span>
                        <span>${item.counts.score}</span>
                    </div>
                    <div class="post-content">
                        <h3 class="lemmy-title">${item.post.name}</h3>
                        <div class="lemmy-post-footer">
                            <span class="community-link" data-community-acct="${item.community.name}@${new URL(item.community.actor_id).hostname}">!${item.community.name}</span> · 
                            <span class="lemmy-user">by ${item.creator.name}</span>
                            <span class="timestamp">· ${formatTimestamp(item.post.published)}</span>
                        </div>
                    </div>
                `;

                card.addEventListener('click', () => {
                    state.actions.showLemmyPostDetail(item);
                });
                container.appendChild(card);
            } else { // It's a Mastodon post
                container.appendChild(renderStatus(item, state, state.actions));
            }
        });

    } catch (err) {
        console.error("Failed to load unified feed:", err);
        container.innerHTML = '<p>Could not load unified feed.</p>';
    }
}

export { renderLemmyDiscoverPage, renderLemmyCommunityPage, renderLemmyPostPage, renderSubscribedFeed, renderUnifiedFeed };
