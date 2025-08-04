import { apiFetch } from './api.js';
import { ICONS } from './icons.js';
import { formatTimestamp } from './utils.js';

export function renderLemmyCard(post, actions) {
    const card = document.createElement('div');
    card.className = 'status lemmy-card';
    card.dataset.id = post.post.id;

    let thumbnailHTML = '';
    if (post.post.thumbnail_url) {
        thumbnailHTML = `<div class="status-media"><img src="${post.post.thumbnail_url}" alt="${post.post.name}" loading="lazy"></div>`;
    }

    card.innerHTML = `
        <div class="status-body-content" data-action="view-post">
            <div class="status-header">
                <img src="${post.community.icon}" alt="${post.community.name} icon" class="avatar" data-action="view-community">
                <div>
                    <a href="#" class="display-name" data-action="view-community">${post.community.name}</a>
                    <span class="acct">posted by <a href="#" data-action="view-creator">${post.creator.name}</a> · ${formatTimestamp(post.post.published)}</span>
                </div>
            </div>
            <div class="status-content">
                <h3 class="lemmy-title">${post.post.name}</h3>
                ${thumbnailHTML}
            </div>
        </div>
        <div class="status-footer">
            <button class="status-action lemmy-vote-btn" data-action="upvote" data-score="1">${ICONS.lemmyUpvote}</button>
            <span class="lemmy-score">${post.counts.score}</span>
            <button class="status-action lemmy-vote-btn" data-action="downvote" data-score="-1">${ICONS.lemmyDownvote}</button>
            <button class="status-action" data-action="view-post">${ICONS.reply} ${post.counts.comments}</button>
            <button class="status-action" data-action="save">${ICONS.bookmark}</button>
        </div>
    `;

    // --- Event Listeners for the Card ---
    card.addEventListener('click', (e) => {
        e.stopPropagation();
        const action = e.target.closest('[data-action]')?.dataset.action;

        switch (action) {
            case 'view-post':
                actions.showLemmyPostDetail(post);
                break;
            case 'view-community':
                actions.showLemmyCommunity(`${post.community.name}@${new URL(post.community.actor_id).hostname}`);
                break;
            case 'view-creator':
                actions.showLemmyProfile(`${post.creator.name}@${new URL(post.creator.actor_id).hostname}`);
                break;
            case 'upvote':
            case 'downvote':
                const score = parseInt(e.target.closest('[data-score]').dataset.score, 10);
                actions.lemmyVote(post.post.id, score, card);
                break;
            case 'save':
                actions.lemmySave(post.post.id, e.target.closest('button'));
                break;
        }
    });

    return card;
}

export async function fetchLemmyFeed(state, actions, loadMore = false) {
    if (state.isLoadingMore) return;

    let endpoint;
    const lemmyInstance = localStorage.getItem('lemmy_instance') || state.lemmyInstances[0];

    if (!loadMore) {
        state.lemmyPage = 1;
        state.timelineDiv.innerHTML = '<p>Loading...</p>';
        window.scrollTo(0, 0);
    }

    state.isLoadingMore = true;
    if (loadMore) state.scrollLoader.classList.add('loading');

    try {
        endpoint = `/api/v3/post/list?sort=${state.currentLemmySort}&page=${state.lemmyPage}&limit=20`;
        if (state.currentLemmyFeed !== 'All') {
            endpoint += `&type_=${state.currentLemmyFeed}`;
        }

        const response = await apiFetch(lemmyInstance, null, endpoint, {}, 'lemmy');
        const posts = response.data.posts;

        if (!loadMore) {
            state.timelineDiv.innerHTML = '';
        }

        if (posts && posts.length > 0) {
            posts.forEach(post_view => {
                const postCard = renderLemmyCard(post_view, actions);
                state.timelineDiv.appendChild(postCard);
            });
            state.lemmyHasMore = true;
        } else {
            if (!loadMore) {
                state.timelineDiv.innerHTML = '<p>Nothing to see here.</p>';
            }
            state.lemmyHasMore = false;
        }

        if (!state.lemmyHasMore) {
            state.scrollLoader.innerHTML = '<p>No more posts.</p>';
        } else {
             state.scrollLoader.innerHTML = '<p>Loading more...</p>';
        }

    } catch (error) {
        console.error('Failed to fetch Lemmy feed:', error);
        if (!loadMore) {
            state.timelineDiv.innerHTML = `<p>Could not load Lemmy feed. Please try refreshing.</p>`;
        }
    } finally {
        state.isLoadingMore = false;
        if (loadMore) state.scrollLoader.classList.remove('loading');
    }
}

export async function renderSubscribedFeed(state, actions) {
    const container = document.getElementById('subscribed-feed');
    container.innerHTML = '<h2>Subscribed Lemmy Communities</h2>';
    // Implementation to fetch and render subscribed Lemmy communities
}

export async function renderUnifiedFeed(state, actions, loadMore = false) {
    const container = document.getElementById('unified-feed');
    if (!loadMore) {
        container.innerHTML = '<h2>Unified Feed</h2>';
    }
    // Implementation for the unified feed
}

export async function renderLemmyDiscoverPage(state, actions) {
    const container = document.getElementById('lemmy-discover-view');
    container.innerHTML = '<h2>Discover Lemmy Communities</h2>';
    // Implementation to discover and render Lemmy communities
}

export async function renderLemmyCommunityPage(state, communityAcct, actions) {
    const container = document.getElementById('lemmy-community-view');
    container.innerHTML = `<h2>Lemmy Community: ${communityAcct}</h2>`;
    // Implementation for rendering a specific Lemmy community page
}
