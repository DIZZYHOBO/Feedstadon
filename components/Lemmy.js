import { apiFetch } from './api.js';
import { ICONS } from './icons.js';
import { renderLoginPrompt } from './ui.js';
import { renderStatus } from './Post.js'; // Assuming Lemmy posts will use a similar render function

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
                // NOTE: Using renderLemmyCard, which you already have.
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
    card.className = 'lemmy-card status'; // Added 'status' class for consistent styling
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


export async function renderLemmyPostPage(postData, state, actions) {
    const view = document.getElementById('lemmy-post-view');
    view.innerHTML = `<div class="loading-spinner">${ICONS.refresh}</div>`;
    view.style.display = 'block';

    try {
        const lemmyInstance = localStorage.getItem('lemmy_instance') || state.lemmyInstances[0];
        const { data } = await apiFetch(lemmyInstance, null, `/api/v3/post`, {}, 'lemmy', { id: postData.post.id });
        const { data: commentsResponse } = await apiFetch(lemmyInstance, null, '/api/v3/comment/list', {}, 'lemmy', { post_id: postData.post.id, sort: 'Hot', max_depth: 8 });
        
        const post = data.post_view;
        const allComments = commentsResponse.comments || [];
        const currentUserPersonId = state.lemmyUser ? state.lemmyUser.person_view.person.id : null;

        const userComments = [];
        const otherComments = [];

        if (currentUserPersonId) {
            allComments.forEach(comment => {
                if (comment.creator.id === currentUserPersonId) {
                    userComments.push(comment);
                } else {
                    otherComments.push(comment);
                }
            });
        } else {
            otherComments.push(...allComments);
        }

        let commentsHtml = otherComments.map(comment => renderLemmyComment(comment)).join('');
        
        if (userComments.length > 0) {
            commentsHtml += `
                <div class="user-comments-box">
                    <h3>Your Comments</h3>
                    ${userComments.map(comment => renderLemmyComment(comment)).join('')}
                </div>
            `;
        }

        view.innerHTML = `
            <div class="lemmy-post-full">
                <button class="close-btn">${ICONS.close}</button>
                <h2>${post.post.name}</h2>
                <div class="post-body">
                    ${post.post.body ? new showdown.Converter().makeHtml(post.post.body) : ''}
                    ${post.post.url ? `<a href="${post.post.url}" target="_blank" rel="noopener noreferrer">${post.post.url}</a>` : ''}
                </div>
                <div class="lemmy-comments-section">
                    <h4>Comments</h4>
                    ${commentsHtml}
                </div>
            </div>
        `;
        
        view.querySelector('.close-btn').addEventListener('click', () => actions.navigateTo('home'));

    } catch (error) {
        view.innerHTML = `<p>Error loading post. <button class="close-btn">${ICONS.close}</button></p>`;
        view.querySelector('.close-btn').addEventListener('click', () => actions.navigateTo('home'));
    }
}

function renderLemmyComment(commentData) {
    const comment = commentData.comment;
    const creator = commentData.creator;
    const counts = commentData.counts;

    const replies = commentData.replies?.map(reply => renderLemmyComment(reply)).join('') || '';

    return `
        <div class="lemmy-comment" data-comment-id="${comment.id}">
            <div class="comment-header">
                <img src="${creator.avatar}" class="avatar" alt="${creator.name}'s avatar">
                <span class="display-name">${creator.name}</span>
                <span class="acct">@${creator.actor_id.split('/')[2]}</span>
            </div>
            <div class="comment-body">${new showdown.Converter().makeHtml(comment.content)}</div>
            <div class="comment-actions">
                <span>${counts.score} ${ICONS.upvote}</span>
                <button class="action-btn">${ICONS.reply}</button>
            </div>
            <div class="comment-replies">${replies}</div>
        </div>
    `;
}
