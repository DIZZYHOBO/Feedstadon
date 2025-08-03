import { apiFetch } from './api.js';
import { ICONS } from './icons.js';
import { renderStatus } from './Post.js';
import { formatTimestamp } from './utils.js';

function renderLemmyPost(post, state, actions) {
    const postDiv = document.createElement('div');
    postDiv.className = 'status lemmy-post'; // Added a special class for Lemmy posts
    postDiv.dataset.id = post.post.ap_id;

    const communityLink = `!${post.community.name}@${new URL(post.community.actor_id).hostname}`;

    let mediaHTML = '';
    if (post.post.url && post.post.thumbnail_url) {
        mediaHTML = `<div class="lemmy-thumbnail"><img src="${post.post.thumbnail_url}" alt="${post.post.name}" loading="lazy"></div>`;
    }

    const timestamp = formatTimestamp(post.post.published);

    postDiv.innerHTML = `
        <div classs="lemmy-header">
             <span class="community-link" data-community-id="${post.community.actor_id}">${communityLink}</span> · 
             <span class="lemmy-user">by ${post.creator.name}</span>
        </div>
        <div class="lemmy-content">
            ${mediaHTML}
            <div class="lemmy-post-details">
                <h3 class="lemmy-title">${post.post.name}</h3>
                <div class="status-footer">
                    <button class="status-action" data-action="reply">${ICONS.reply} ${post.counts.comments}</button>
                    <button class="status-action" data-action="boost">${ICONS.boost} ${post.counts.score}</button>
                </div>
            </div>
        </div>
    `;

    postDiv.querySelector('.community-link').addEventListener('click', (e) => {
        e.stopPropagation();
        actions.showLemmyCommunity(post.community.actor_id);
    });
    
    postDiv.querySelectorAll('.status-action').forEach(button => {
        button.addEventListener('click', (e) => {
            e.stopPropagation();
            const action = button.dataset.action;
            actions.toggleAction(action, { id: post.post.ap_id }, button);
        });
    });

    return postDiv;
}

export async function renderLemmyCommunityPage(state, communityId) {
    const container = document.getElementById('lemmy-community-view');
    switchView('lemmy-community');
    container.innerHTML = `<p>Loading community...</p>`;

    try {
        const community = await apiFetch(communityId, null, '/api/v3/community');
        const posts = (await apiFetch(communityId, null, `/api/v3/post/list?community_id=${community.community_view.community.id}`)).posts;

        container.innerHTML = `
            <div class="lemmy-community-header" style="background-image: url(${community.community_view.community.banner || ''})">
                <img src="${community.community_view.community.icon}" alt="${community.community_view.community.name} icon">
                <h2>${community.community_view.community.name}</h2>
            </div>
            <div class="lemmy-community-body">
                <div class="lemmy-sidebar">
                    <h3>About</h3>
                    <p>${community.community_view.community.description}</p>
                    <button class="subscribe-btn" data-community-id="${community.community_view.community.actor_id}">Subscribe</button>
                </div>
                <div class="lemmy-post-list"></div>
            </div>
        `;

        const postList = container.querySelector('.lemmy-post-list');
        posts.forEach(post => {
            postList.appendChild(renderLemmyPost(post, state, state.actions));
        });

    } catch (err) {
        console.error("Failed to load Lemmy community:", err);
        container.innerHTML = `<p>Could not load community.</p>`;
    }
}

export async function renderLemmyDiscoverPage(state) {
    const container = document.getElementById('lemmy-discover-view');
    switchView('lemmy-discover');
    container.innerHTML = `<div class="view-header">Discover Lemmy Communities</div>`;
    
    const communityList = document.createElement('div');
    container.appendChild(communityList);

    state.lemmyInstances.forEach(async (instanceUrl) => {
        try {
            const response = await apiFetch(`https://${instanceUrl}`, null, '/api/v3/community/list');
            const communities = response.communities;

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
            console.warn(`Could not fetch communities from ${instanceUrl}`);
        }
    });
}
