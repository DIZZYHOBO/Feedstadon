import { apiFetch } from './api.js';

export async function fetchLemmyFeed(state, actions, loadMore = false, onLoginSuccess) {
    state.isLoadingMore = true;
    state.scrollLoader.style.display = 'flex';

    if (!loadMore) {
        state.timelineDiv.innerHTML = '';
        state.lemmyPage = 1;
        state.lemmyHasMore = true;
    }

    const lemmyInstance = localStorage.getItem('lemmy_instance') || state.lemmyInstances[0];
    const feedType = state.currentLemmyFeed || 'All';
    const sortType = state.currentLemmySort || 'Hot';

    try {
        const { data } = await apiFetch(lemmyInstance, null, '/api/v3/post/list', {
            params: {
                type_: feedType,
                sort: sortType,
                page: state.lemmyPage,
                limit: 20
            }
        }, 'lemmy');

        if (data.posts.length > 0) {
            data.posts.forEach(post => {
                const card = renderLemmyCard(post, state, actions);
                state.timelineDiv.appendChild(card);
            });
            state.lemmyPage++;
            state.lemmyHasMore = true;
        } else {
            state.lemmyHasMore = false;
        }

    } catch (error) {
        if (error.message.includes('not_logged_in') && onLoginSuccess) {
            renderLoginPrompt(state.timelineDiv, 'lemmy', onLoginSuccess);
        } else {
            console.error('Error fetching Lemmy feed:', error);
            state.timelineDiv.innerHTML = `<p class="error">Could not load Lemmy feed from ${lemmyInstance}.</p>`;
        }
    } finally {
        state.isLoadingMore = false;
        state.scrollLoader.style.display = 'none';
    }
}

export function renderLemmyCard(post, state, actions) {
    const card = document.createElement('div');
    card.className = 'status lemmy-post';
    card.dataset.id = post.post.id;

    const postUrl = post.post.url ? new URL(post.post.url) : null;
    const isImage = post.post.url && /\.(jpg|jpeg|png|gif)$/i.test(post.post.url);
    const isVideo = post.post.url && /\.(mp4|webm)$/i.test(post.post.url);

    const postBodyHtml = post.post.body ? new showdown.Converter().makeHtml(post.post.body) : '';
    
    // Note: This part requires moment.js, which was causing errors. 
    // We'll use the native Date object for now to avoid crashes.
    const postedDate = new Date(post.post.published + 'Z');

    card.innerHTML = `
        <div class="status-header">
            <img src="${post.creator.avatar || 'https://lemmy.world/pictrs/image/e2d72a73-690b-4158-bf89-3224b1509f61.png'}" class="avatar" alt="${post.creator.name}'s avatar">
            <div class="status-author">
                <a href="#" class="user-link" data-user-acct="${post.creator.actor_id}">${post.creator.name}</a>
                <span class="community-link"> to <a href="#" data-community-name="${post.community.name}">${post.community.name}</a></span>
                <span class="instance-host">@${new URL(post.creator.actor_id).hostname}</span>
            </div>
             <div class="status-meta">
                <a href="#lemmy-post/${post.post.id}" class="timestamp" title="${postedDate.toLocaleString()}">${postedDate.toLocaleString()}</a>
            </div>
        </div>
        <h3 class="lemmy-post-title">${post.post.name}</h3>
        ${isImage ? `<img src="${post.post.url}" class="lemmy-post-image" alt="Post image" data-full-image="${post.post.url}">` : ''}
        ${isVideo ? `<video src="${post.post.url}" class="lemmy-post-video" controls></video>` : ''}
        ${post.post.body ? `<div class="lemmy-post-body">${postBodyHtml}</div>` : ''}
        ${postUrl && !isImage && !isVideo ? `<a href="${post.post.url}" target="_blank" rel="noopener noreferrer" class="lemmy-post-link">${postUrl.hostname}</a>` : ''}
        <div class="status-actions">
            <button data-action="upvote" class="${post.my_vote === 1 ? 'active' : ''}">️🔼 <span class="lemmy-score">${post.counts.score}</span></button>
            <button data-action="downvote" class="${post.my_vote === -1 ? 'active' : ''}">🔽</button>
            <button data-action="reply">💬 ${post.counts.comments}</button>
            <button data-action="save" class="${post.saved ? 'active' : ''}">🔖</button>
        </div>
        <div class="lemmy-reply-container" style="display: none;">
            <textarea class="lemmy-reply-textarea" placeholder="Write a comment..."></textarea>
            <button class="button-primary lemmy-send-reply-btn">Post</button>
        </div>
    `;

    card.querySelector('.user-link').addEventListener('click', (e) => {
        e.preventDefault();
        actions.showLemmyProfile(e.target.dataset.userAcct);
    });

    card.querySelector('.community-link a').addEventListener('click', (e) => {
        e.preventDefault();
        actions.showLemmyCommunity(e.target.dataset.communityName);
    });

    card.querySelector('[data-action="upvote"]').addEventListener('click', (e) => {
        e.stopPropagation();
        actions.lemmyVote(post.post.id, 1, card);
    });
    
    card.querySelector('[data-action="downvote"]').addEventListener('click', (e) => {
        e.stopPropagation();
        actions.lemmyVote(post.post.id, -1, card);
    });
    
    card.querySelector('[data-action="save"]').addEventListener('click', (e) => {
        e.stopPropagation();
        actions.lemmySave(post.post.id, e.currentTarget);
    });
    
    const replyBtn = card.querySelector('[data-action="reply"]');
    if (replyBtn) {
        replyBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            const replyContainer = card.querySelector('.lemmy-reply-container');
            replyContainer.style.display = replyContainer.style.display === 'none' ? 'block' : 'none';
            if (replyContainer.style.display === 'block') {
                replyContainer.querySelector('.lemmy-reply-textarea').focus();
            }
        });
    }

    card.querySelector('.lemmy-send-reply-btn').addEventListener('click', async (e) => {
        e.stopPropagation();
        const textarea = card.querySelector('.lemmy-reply-textarea');
        const content = textarea.value.trim();
        if (content) {
            try {
                await actions.lemmyPostComment({ content, post_id: post.post.id });
                textarea.value = '';
                card.querySelector('.lemmy-reply-container').style.display = 'none';
            } catch (err) {
                // Error toast is shown by the action
            }
        }
    });

    card.addEventListener('click', () => {
        actions.showLemmyPostDetail(post);
    });
    
    const image = card.querySelector('.lemmy-post-image');
    if (image) {
        image.addEventListener('click', (e) => {
            e.stopPropagation();
            const imageModal = document.getElementById('image-modal');
            const modalImage = document.getElementById('modal-image');
            modalImage.src = image.dataset.fullImage;
            imageModal.classList.add('visible');
        });
    }

    return card;
}
