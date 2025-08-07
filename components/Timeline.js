import { apiFetch } from './api.js';
import { renderStatus } from './Post.js';
import { renderLemmyCard } from './Lemmy.js';
import { showModal, hideModal } from './ui.js';

export async function renderTimeline(state, actions) {
    const timeline = document.getElementById('timeline');
    const scrollLoader = document.getElementById('scroll-loader');
    timeline.innerHTML = '<p>Loading...</p>';
    
    try {
        let statuses = [];
        if (state.accessToken) {
            const mastodonResponse = await apiFetch(state.instanceUrl, state.accessToken, `/api/v1/timelines/home`);
            statuses = mastodonResponse.data;
        }

        let lemmyPosts = [];
        if (state.lemmyToken) {
            const lemmyResponse = await apiFetch(state.lemmyInstance, null, '/api/v3/post/list', { sort: 'Hot' }, 'lemmy');
            lemmyPosts = lemmyResponse.data.posts;
        }

        const combinedFeed = [
            ...statuses.map(s => ({ ...s, type: 'mastodon', created_at: new Date(s.created_at) })),
            ...lemmyPosts.map(p => ({ ...p, type: 'lemmy', created_at: new Date(p.post.published) }))
        ];

        combinedFeed.sort((a, b) => b.created_at - a.created_at);

        timeline.innerHTML = '';
        if (combinedFeed.length === 0) {
            timeline.innerHTML = '<p>No posts to show.</p>';
            return;
        }

        combinedFeed.forEach(item => {
            if (item.type === 'mastodon') {
                const statusDiv = renderStatus(item, state, actions);
                if (statusDiv) timeline.appendChild(statusDiv);
            } else if (item.type === 'lemmy') {
                const lemmyCard = renderLemmyCard(item, state, actions);
                if (lemmyCard) timeline.appendChild(lemmyCard);
            }
        });
    } catch (error) {
        console.error('Failed to render timeline:', error);
        timeline.innerHTML = `<p>Error loading timeline: ${error.message}</p>`;
    }
}

export async function renderStatusDetail(state, actions, statusId) {
    const detailView = document.getElementById('status-detail-view');
    detailView.innerHTML = '<p>Loading status...</p>';
    try {
        const response = await apiFetch(state.instanceUrl, state.accessToken, `/api/v1/statuses/${statusId}/context`);
        const context = response.data;
        
        detailView.innerHTML = '';
        
        const statusList = document.createElement('div');
        statusList.className = 'status-list';

        context.ancestors.forEach(status => {
            const statusDiv = renderStatus(status, state, actions);
            if (statusDiv) statusList.appendChild(statusDiv);
        });

        const mainStatusDiv = renderStatus(context.descendants.find(s => s.id === statusId) || context.ancestors[context.ancestors.length-1], state, actions);
        mainStatusDiv.classList.add('main-thread-post');
        statusList.appendChild(mainStatusDiv);

        const repliesContainer = document.createElement('div');
        repliesContainer.className = 'comment-replies-container';
        context.descendants.forEach(status => {
            if(status.in_reply_to_id === statusId) {
                const statusDiv = renderStatus(status, state, actions);
                if (statusDiv) repliesContainer.appendChild(statusDiv);
            }
        });
        
        statusList.appendChild(repliesContainer);
        detailView.appendChild(statusList);

    } catch (error) {
        console.error('Failed to render status detail:', error);
        detailView.innerHTML = `<p>Error loading status: ${error.message}</p>`;
    }
}
