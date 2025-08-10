import { apiFetch } from './api.js';
import { ICONS } from './icons.js';
import { renderLoginPrompt } from './ui.js';
import { renderStatus } from './Post.js'; 

export async function fetchLemmyFeed(state, actions, loadMore = false) {
    const timelineContainer = document.getElementById('timeline');
    if (!localStorage.getItem('lemmy_jwt') && !loadMore) {
        renderLoginPrompt(timelineContainer, 'lemmy', actions);
        return;
    }

    if (state.isLoadingMore) return;

    if (!loadMore) {
        window.scrollTo(0, 0);
    }
    
    state.isLoadingMore = true;
    const scrollLoader = document.getElementById('scroll-loader');
    if (loadMore) scrollLoader.classList.add('loading');
    else document.getElementById('refresh-btn')?.classList.add('loading');

    try {
        const lemmyInstance = localStorage.getItem('lemmy_instance');
        if (!lemmyInstance) {
            throw new Error("Lemmy instance not found. Please log in.");
        }

        const params = {
            sort: state.currentLemmySort || 'Active',
            page: loadMore ? (state.lemmyPage || 1) + 1 : 1,
            limit: 20
        };
        
        const {data: {posts}} = await apiFetch(lemmyInstance, localStorage.getItem('lemmy_jwt'), '/api/v3/post/list', {}, 'lemmy', params);

        if (!loadMore) {
            timelineContainer.innerHTML = '';
        }

        if (posts && posts.length > 0) {
            state.lemmyPage = params.page;
            posts.forEach(post_view => {
                const postCard = renderLemmyCard(post_view, actions);
                timelineContainer.appendChild(postCard);
            });
            state.lemmyHasMore = true;
        } else {
            if (!loadMore) {
                timelineContainer.innerHTML = '<p>Nothing to see here.</p>';
            }
            state.lemmyHasMore = false;
        }

        if (!state.lemmyHasMore) {
            scrollLoader.innerHTML = '<p>No more posts.</p>';
        } else {
             scrollLoader.innerHTML = '';
        }

    } catch (error) {
        console.error('Failed to fetch Lemmy feed:', error);
        timelineContainer.innerHTML = `<p>Error loading Lemmy feed.</p>`;
    } finally {
        state.isLoadingMore = false;
        if (loadMore) scrollLoader.classList.remove('loading');
        else document.getElementById('refresh-btn')?.classList.remove('loading');
    }
}


function getBestThumbnail(post) {
    if (post.post.thumbnail_url) return post.post.thumbnail_url;
    if (post.post.url && post.post.url.match(/\.(jpeg|jpg|gif|png)$/)) return post.post.url;
    return '';
}

export function renderLemmyCard(post, actions) {
    const card = document.createElement('div');
    card.className = 'lemmy-card status'; 
    card.dataset.postId = post.post.id;
    const thumbnailUrl = getBestThumbnail(post);

    card.innerHTML = `
        <div class="card-thumbnail" style="${thumbnailUrl ? `background-image: url(${thumbnailUrl})` : ''}"></div>
        <div class="card-content">
            <h3 class="card-title">${post.post.name}</h3>
            <div class="card-meta">
                <span>${post.community.name}</span> | <span>${post.counts.upvotes} ${ICONS.upvote}</span> | <span>${post.counts.comments} ${ICONS.reply}</span>
            </div>
        </div>
    `;

    card.addEventListener('click', () => actions.showLemmyPostDetail(post));
    return card;
}
