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
        mediaHTML = `<div class="lemmy-thumbnail"><a href="${post.post.url}" target="_blank" rel="noopener noreferrer"><img src="${post.post.thumbnail_url}" alt="${post.post.name}" loading="lazy"></a></div>`;
    }

    const timestamp = formatTimestamp(post.post.published);

    postDiv.innerHTML = `
        <div class="status-body-content">
            <h3 class="lemmy-title"><a href="${post.post.ap_id}" target="_blank" rel="noopener noreferrer">${post.post.name}</a></h3>
            ${mediaHTML}
            <div class="lemmy-post-footer">
                <span class="community-link" data-community-acct="${post.community.name}@${new URL(post.community.actor_id).hostname}">${communityLink}</span> · 
                <span class="lemmy-user">by ${post.creator.name}</span>
                <span class="timestamp">· ${timestamp}</span>
            </div>
            <div class="status-footer">
                <button class="status-action" data-action="toggle-comments">${ICONS.reply} ${post.counts.comments}</button>
                <button class="status-action" data-action="boost">${ICONS.boost} ${post.counts.score}</button>
            </div>
        </div>
    `;

    postDiv.querySelector('.community-link').addEventListener('click', (e) => {
        e.stopPropagation();
        actions.showLemmyCommunity(e.target.dataset.communityAcct);
    });
    
    postDiv.querySelectorAll('.status-action').forEach(button => {
        button.addEventListener('click', (e) => {
            e.stopPropagation();
            const action = button.dataset.action;
            if (action === 'toggle-comments') {
                toggleLemmyCommentThread(post, postDiv, state);
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
                    <h3>About</h3>
                    <p>${community.community.description}</p>
                    <button class="subscribe-btn" data-community-id="${community.community.actor_id}">Subscribe</button>
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

async function toggleLemmyCommentThread(post, postDiv, state) {
    let threadContainer = postDiv.querySelector('.lemmy-comment-thread');
    if (threadContainer) {
        threadContainer.remove();
        return;
    }

    threadContainer = document.createElement('div');
    threadContainer.className = 'lemmy-comment-thread';
    threadContainer.innerHTML = `<p>Loading comments...</p>`;
    postDiv.appendChild(threadContainer);

    try {
        const communityHostname = new URL(post.community.actor_id).hostname;
        const response = await apiFetch(`https://${communityHostname}`, null, `/api/v3/post?id=${post.post.id}`);
        const comments = response.data.comments;

        threadContainer.innerHTML = '';
        if (comments.length > 0) {
            comments.forEach(comment => {
                threadContainer.appendChild(renderLemmyComment(comment));
            });
        } else {
            threadContainer.innerHTML = '<p>No comments yet.</p>';
        }
    } catch (err) {
        console.error("Failed to load Lemmy comments:", err);
        threadContainer.innerHTML = '<p>Could not load comments.</p>';
    }
}

function renderLemmyComment(comment, level = 0) {
    const commentDiv = document.createElement('div');
    commentDiv.className = 'lemmy-comment';
    commentDiv.style.marginLeft = `${level * 20}px`;

    const timestamp = formatTimestamp(comment.comment.published);

    commentDiv.innerHTML = `
        <div class="comment-header">
            <span class="lemmy-user">${comment.creator.name}</span>
            <span class="timestamp">· ${timestamp}</span>
        </div>
        <div class="comment-content">${comment.comment.content}</div>
    `;

    if (comment.replies && comment.replies.length > 0) {
        const repliesContainer = document.createElement('div');
        repliesContainer.className = 'lemmy-replies';
        comment.replies.forEach(reply => {
            repliesContainer.appendChild(renderLemmyComment(reply, level + 1));
        });
        commentDiv.appendChild(repliesContainer);
    }

    return commentDiv;
}

export { renderLemmyDiscoverPage, renderLemmyCommunityPage };
