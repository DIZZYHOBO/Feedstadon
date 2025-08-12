import { ICONS } from './icons.js';
import { apiFetch } from './api.js';
import { timeAgo } from './utils.js';
import { showToast } from './ui.js';

// ... Any other existing helper function code (such as renderLemmyComment) ...

// Ensure this function exists and is exported!
export async function renderLemmyPostPage(state, postView, actions) {
    const view = document.getElementById('lemmy-post-view');
    view.innerHTML = `
        <div class="lemmy-post-view-container">
            <div class="lemmy-post-full"></div>
            <div class="lemmy-comments-section">
                <h3>Comments</h3>
                <div class="lemmy-post-reply-box">
                     <textarea class="lemmy-main-reply-textarea" placeholder="Write a comment..."></textarea>
                     <button class="button-primary send-main-reply-btn">Comment</button>
                </div>
                <div class="lemmy-comments-container">Loading comments...</div>
            </div>
        </div>
    `;

    const postContainer = view.querySelector('.lemmy-post-full');
    const commentsContainer = view.querySelector('.lemmy-comments-container');
    
    // Render main post card
    const postCard = document.createElement('div');
    const post = postView.post;
    const isImageUrl = post.url && /\.(jpg|jpeg|png|gif|webp)$/i.test(post.url);
    
    const converter = new showdown.Converter();
    let bodyHtml = post.body ? converter.makeHtml(post.body) : '';

    // Add error handling for images in post body
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = bodyHtml;
    tempDiv.querySelectorAll('img').forEach(img => {
        img.onerror = function() {
            this.onerror=null;
            this.src='images/404.png';
            this.classList.add('broken-image-fallback');
        };
    });
    bodyHtml = tempDiv.innerHTML;

    postCard.innerHTML = `
        <div class="status lemmy-post" data-id="${post.id}">
            <div class="status-header">
                <img src="${postView.community.icon || 'images/pfp.png'}" class="avatar" alt="${postView.community.name}" onerror="this.onerror=null;this.src='images/pfp.png';">
                <div class="user-info">
                    <a href="#" class="community-link user-info-line1">${postView.community.name}</a>
                    <div class="user-info-line2">
                        <span>posted by </span>
                        <a href="#" class="user-link">${postView.creator.name}</a>
                        <span class="time-ago">· ${timeAgo(post.published)}</span>
                    </div>
                </div>
            </div>
            <h3>${post.name}</h3>
            <div class="lemmy-post-body">
                ${bodyHtml}
                ${isImageUrl 
                    ? `<div class="lemmy-card-image-container"><img src="${post.url}" alt="${post.name}" class="lemmy-card-image" onerror="this.onerror=null;this.src='images/404.png';"></div>` 
                    : (post.url ? `<a href="${post.url}" target="_blank" rel="noopener noreferrer" class="post-link-preview">${post.url}</a>` : '')
                }
            </div>
             <div class="status-footer">
                <div class="lemmy-vote-cluster">
                    <button class="status-action lemmy-vote-btn" data-action="upvote">${ICONS.lemmyUpvote}</button>
                    <span class="lemmy-score">${postView.counts.score}</span>
                    <button class="status-action lemmy-vote-btn" data-action="downvote">${ICONS.lemmyDownvote}</button>
                </div>
                <button class="status-action">
                    ${ICONS.comments}
                    <span>${postView.counts.comments}</span>
                </button>
                <button class="status-action lemmy-save-btn">${ICONS.bookmark}</button>
            </div>
        </div>
    `;
    postContainer.appendChild(postCard);

    // Fetch and render comments
    const lemmyInstance = localStorage.getItem('lemmy_instance') || state.lemmyInstances[0];
    try {
        const response = await apiFetch(lemmyInstance, null, `/api/v3/comment/list?post_id=${post.id}&max_depth=8&sort=New`, { method: 'GET' }, 'lemmy');
        const comments = response?.data?.comments;
        commentsContainer.innerHTML = '';
        if (comments && comments.length > 0) {
            comments.forEach(commentView => {
                commentsContainer.appendChild(renderLemmyComment(commentView, state, actions, postView.creator.id));
            });
        } else {
            commentsContainer.innerHTML = 'No comments yet.';
        }
    } catch (error) {
        commentsContainer.innerHTML = 'Failed to load comments.';
    }

    // Main reply box logic
    const mainReplyTextarea = view.querySelector('.lemmy-main-reply-textarea');
    const mainReplyBtn = view.querySelector('.send-main-reply-btn');
    mainReplyBtn.addEventListener('click', async () => {
        const content = mainReplyTextarea.value.trim();
        if (!content) return;
        try {
            await actions.lemmyPostComment({
                content: content,
                post_id: post.id
            });
            showToast('Comment posted! Refreshing...');
            // Refresh comments after posting
            actions.showLemmyPostDetail(postView);
        } catch (error) {
            showToast('Failed to post comment.');
        }
    });
}
