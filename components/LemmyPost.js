import { apiFetch } from './api.js';
import { ICONS } from './icons.js';
import { formatTimestamp } from './utils.js';
import { renderLoginPrompt } from './Timeline.js'; 

export function renderLemmyCard(post, actions) {
    const card = document.createElement('div');
    card.className = 'status lemmy-card';
    card.dataset.id = post.post.id;

    let thumbnailHTML = '';
    if (post.post.thumbnail_url) {
        thumbnailHTML = `<div class="status-media"><img src="${post.post.thumbnail_url}" alt="${post.post.name}" loading="lazy"></div>`;
    }

    let optionsMenuHTML = `
        <div class="post-options-container">
            <button class="post-options-btn">${ICONS.more}</button>
            <div class="post-options-menu">
                <button data-action="block-community">Block Community</button>
            </div>
        </div>
    `;

    card.innerHTML = `
        <div class="status-body-content">
            <div class="status-header">
                <div class="status-header-main">
                    <img src="${post.community.icon}" alt="${post.community.name} icon" class="avatar" data-action="view-community">
                    <div>
                        <a href="#" class="display-name" data-action="view-community">${post.community.name}</a>
                        <span class="acct">posted by <a href="#" data-action="view-creator">${post.creator.name}</a> · ${formatTimestamp(post.post.published)}</span>
                    </div>
                </div>
                <div class="status-header-side">
                    ${optionsMenuHTML}
                    <div class="lemmy-icon-indicator">${ICONS.lemmy}</div>
                </div>
            </div>
            <div class="status-content">
                <h3 class="lemmy-title">${post.post.name}</h3>
                ${thumbnailHTML}
            </div>
        </div>
        <div class="status-footer">
            <div class="lemmy-vote-cluster">
                <button class="status-action lemmy-vote-btn" data-action="upvote" data-score="1">${ICONS.lemmyUpvote}</button>
                <span class="lemmy-score">${post.counts.score}</span>
                <button class="status-action lemmy-vote-btn" data-action="downvote" data-score="-1">${ICONS.lemmyDownvote}</button>
            </div>
            <button class="status-action" data-action="quick-reply">${ICONS.reply}</button>
            <button class="status-action" data-action="view-post">${ICONS.comments} ${post.counts.comments}</button>
            <button class="status-action" data-action="save">${ICONS.bookmark}</button>
        </div>
        <div class="quick-reply-container">
            <div class="quick-reply-box">
                <textarea placeholder="Add a comment..."></textarea>
                <button class="button-primary">Post</button>
            </div>
        </div>
    `;

    // Dedicated listener for opening the post detail view
    card.querySelector('.status-body-content').addEventListener('click', (e) => {
        e.stopPropagation();
        const actionTarget = e.target.closest('[data-action]');
        const action = actionTarget ? actionTarget.dataset.action : 'view-post';

        switch (action) {
            case 'view-community':
                actions.showLemmyCommunity(`${post.community.name}@${new URL(post.community.actor_id).hostname}`);
                break;
            case 'view-creator':
                actions.showLemmyProfile(`${post.creator.name}@${new URL(post.creator.actor_id).hostname}`);
                break;
            default:
                actions.showLemmyPostDetail(post);
                break;
        }
    });
    
    // Listeners for the action buttons in the footer
    card.querySelectorAll('.status-footer .status-action').forEach(button => {
        button.addEventListener('click', e => {
            e.stopPropagation();
            const action = e.currentTarget.dataset.action;
            switch(action) {
                case 'upvote':
                case 'downvote':
                    const score = parseInt(e.currentTarget.dataset.score, 10);
                    actions.lemmyVote(post.post.id, score, card);
                    break;
                case 'save':
                    actions.lemmySave(post.post.id, e.currentTarget);
                    break;
                case 'quick-reply':
                    const replyContainer = card.querySelector('.quick-reply-container');
                    const isVisible = replyContainer.style.display === 'block';

                    document.querySelectorAll('.quick-reply-container').forEach(container => {
                        container.style.display = 'none';
                    });

                    replyContainer.style.display = isVisible ? 'none' : 'block';
                    if (!isVisible) {
                        replyContainer.querySelector('textarea').focus();
                    }
                    break;
                case 'view-post':
                     actions.showLemmyPostDetail(post);
                    break;
            }
        });
    });
    
    card.querySelector('.quick-reply-box button').addEventListener('click', async (e) => {
        e.stopPropagation();
        const textarea = card.querySelector('.quick-reply-box textarea');
        const content = textarea.value.trim();
        if(!content) return;

        try {
            await actions.lemmyPostComment({ content: content, post_id: post.post.id });
            textarea.value = '';
            card.querySelector('.quick-reply-container').style.display = 'none';
        } catch(err) {
            alert('Failed to post comment.');
        }
    });
    
    card.querySelector('.quick-reply-box textarea').addEventListener('click', (e) => e.stopPropagation());


    const optionsBtn = card.querySelector('.post-options-btn');
    if (optionsBtn) {
        const menu = card.querySelector('.post-options-menu');
        optionsBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            menu.style.display = menu.style.display === 'block' ? 'none' : 'block';
        });
        menu.addEventListener('click', (e) => e.stopPropagation());
    }

    return card;
}

export async function fetchLemmyFeed(state, actions, loadMore = false, onLemmySuccess) {
    if (!localStorage.getItem('lemmy_jwt') && !loadMore) {
        renderLoginPrompt(state.timelineDiv, 'lemmy', null, onLemmySuccess);
        return;
    }

    if (state.isLoadingMore) return;

    if (!loadMore) {
        window.scrollTo(0, 0);
    }
    
    state.isLoadingMore = true;
    if (loadMore) state.scrollLoader.classList.add('loading');
    else document.getElementById('refresh-btn').classList.add('loading');


    try {
        const lemmyInstance = localStorage.getItem('lemmy_instance');
        if (!lemmyInstance) {
            throw new Error("Lemmy instance not found. Please log in.");
        }

        const params = {
            sort: state.currentLemmySort,
            page: loadMore ? state.lemmyPage + 1 : 1,
            limit: 20
        };
        if (state.currentLemmyFeed !== 'All') {
            params.type_ = state.currentLemmyFeed;
        }
        
        const response = await apiFetch(lemmyInstance, null, '/api/v3/post/list', {}, 'lemmy', params);
        const posts = response.data.posts;

        if (!loadMore) {
            state.timelineDiv.innerHTML = '';
        }

        if (posts && posts.length > 0) {
            if (loadMore) {
                state.lemmyPage++;
            } else {
                state.lemmyPage = 1;
            }
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
        actions.showToast(`Could not load Lemmy feed: ${error.message}`);
        state.timelineDiv.innerHTML = `<p>Error loading feed.</p>`;
    } finally {
        state.isLoadingMore = false;
        if (loadMore) state.scrollLoader.classList.remove('loading');
        else document.getElementById('refresh-btn').classList.remove('loading');
    }
}
