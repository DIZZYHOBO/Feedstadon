import { apiFetch } from './api.js';
import { ICONS } from './icons.js';
import { formatTimestamp } from './utils.js';

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

export async function renderLemmyCommunityPage(state, communityAcct, switchView) {
    const container = document.getElementById('lemmy-community-view');
    switchView('lemmy-community');
    container.innerHTML = `<p>Loading community...</p>`;

    try {
        const [communityName, communityHostname] = communityAcct.split('@');
        const communityResponse = await apiFetch(`https://${communityHostname}`, null, `/api/v3/community?name=${communityName}`);
        const community = communityResponse.data.community_view;
        
        const postsResponse = await apiFetch(`https://${communityHostname}`, null, `/api/v3/post/list?community_id=${community.community.id}`);
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

export async function renderLemmyDiscoverPage(state, switchView) {
    const container = document.getElementById('lemmy-discover-view');
    switchView('lemmy-discover');
    container.innerHTML = `<div class="view-header">Discover Lemmy Communities</div>`;
    
    const communityList = document.createElement('div');
    container.appendChild(communityList);

    state.lemmyInstances.forEach(async (instanceUrl) => {
        try {
            const response = await apiFetch(`https://${instanceUrl}`, null, '/api/v3/community/list');
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
