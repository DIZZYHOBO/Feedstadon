import { apiFetch } from './api.js';
import { ICONS } from './icons.js';
import { formatTimestamp } from './utils.js';

/**
 * Transforms a flat list of comments into a nested tree structure using the 'path' property.
 * @param {Array} comments - The flat array of comment objects from the Lemmy API.
 * @returns {Array} An array of root-level comment objects, with children nested inside.
 */
function buildCommentTree(comments) {
    const commentMap = new Map();
    const rootComments = [];

    // First pass: create a map and initialize a children array for each comment.
    comments.forEach(commentView => {
        commentView.children = [];
        commentMap.set(commentView.comment.id, commentView);
    });

    // Second pass: build the tree.
    comments.forEach(commentView => {
        const pathParts = commentView.comment.path.split('.');
        
        // Root comments have a path like "0.12345"
        if (pathParts.length === 2) {
            rootComments.push(commentView);
        } else {
            // It's a reply. The parent ID is the second to last part of the path.
            const parentId = parseInt(pathParts[pathParts.length - 2], 10);
            if (commentMap.has(parentId)) {
                const parent = commentMap.get(parentId);
                parent.children.push(commentView);
            }
        }
    });

    return rootComments;
}

/**
 * Recursively renders the comment tree into the DOM.
 * @param {Array} comments - An array of comment objects (root or children).
 * @param {HTMLElement} container - The DOM element to append the comments to.
 * @param {object} actions - The global actions object for event listeners.
 */
function renderCommentTree(comments, container, actions) {
    comments.forEach(commentView => {
        const commentElement = renderCommentNode(commentView, actions);
        container.appendChild(commentElement);

        if (commentView.children && commentView.children.length > 0) {
            const repliesContainer = document.createElement('div');
            repliesContainer.className = 'comment-replies-container';
            commentElement.appendChild(repliesContainer);
            // Recursive call for the children
            renderCommentTree(commentView.children, repliesContainer, actions);
        }
    });
}

async function fetchAndRenderComments(state, postId, container, actions) {
    container.innerHTML = `<p>Loading comments...</p>`;
    try {
        const lemmyInstance = localStorage.getItem('lemmy_instance') || state.lemmyInstances[0];
        
        const params = {
            post_id: postId,
            max_depth: 15, // Fetch nested replies
            sort: 'Hot',   // Default sort, can be changed later
            type_: 'All'
        };

        const response = await apiFetch(lemmyInstance, null, '/api/v3/comment/list', {}, 'lemmy', params);
        const commentsData = response.data.comments;

        container.innerHTML = '';
        if (commentsData && commentsData.length > 0) {
            const commentTree = buildCommentTree(commentsData);
            renderCommentTree(commentTree, container, actions);
        } else {
            container.innerHTML = '<div class="status-body-content"><p>No comments yet.</p></div>';
        }
    } catch (err) {
        console.error("Failed to load Lemmy comments:", err);
        container.innerHTML = `<p>Could not load comments. ${err.message}</p>`;
    }
}

function renderCommentNode(commentView, actions) {
    const comment = commentView.comment;
    const creator = commentView.creator;
    const counts = commentView.counts;

    const commentWrapper = document.createElement('div');
    commentWrapper.className = 'lemmy-comment-wrapper';
    commentWrapper.id = `comment-wrapper-${comment.id}`;

    let userActionsHTML = '';
    const isOwnComment = localStorage.getItem('lemmy_username') === creator.name;
    if (isOwnComment) {
        userActionsHTML = `<button class="status-action" data-action="edit-comment">${ICONS.edit}</button><button class="status-action" data-action="delete-comment">${ICONS.delete}</button>`;
    }

    commentWrapper.innerHTML = `
        <div class="lemmy-comment" data-comment-id="${comment.id}">
            <div class="comment-main">
                <div class="comment-header">
                    <span class="lemmy-user">${creator.name}</span>
                    <span class="timestamp">· ${formatTimestamp(comment.published)}</span>
                </div>
                <div class="comment-content">${comment.content}</div>
                <div class="comment-footer">
                    <button class="status-action lemmy-comment-vote-btn" data-action="upvote" data-score="1">${ICONS.lemmyUpvote}</button>
                    <span class="lemmy-score">${counts.score}</span>
                    <button class="status-action lemmy-comment-vote-btn" data-action="downvote" data-score="-1">${ICONS.lemmyDownvote}</button>
                    <button class="status-action reply-to-comment-btn" data-action="reply">${ICONS.reply}</button>
                    ${userActionsHTML}
                </div>
            </div>
        </div>
    `;
    
    return commentWrapper;
}

export async function renderLemmyPostPage(state, post, actions) {
    const container = document.getElementById('lemmy-post-view');
    
    const validatedPostId = parseInt(post.post.id, 10);
    if (isNaN(validatedPostId)) {
        container.innerHTML = `<p>Error: Invalid Post ID. Cannot load details.</p>`;
        return;
    }

    container.innerHTML = `<p>Loading post...</p>`;

    let thumbnailHTML = '';
    if (post.post.thumbnail_url) {
        thumbnailHTML = `<div class="status-media"><img src="${post.post.thumbnail_url}" alt="${post.post.name}" loading="lazy"></div>`;
    }

    const postHTML = `
        <div class="status lemmy-card" data-post-id="${validatedPostId}">
            <div class="status-body-content">
                <div class="status-header">
                    <img src="${post.community.icon}" alt="${post.community.name} icon" class="avatar">
                    <div>
                        <span class="display-name">${post.community.name}</span>
                        <span class="acct">posted by ${post.creator.name} · ${formatTimestamp(post.post.published)}</span>
                    </div>
                </div>
                <div class="status-content">
                    <h3 class="lemmy-title">${post.post.name}</h3>
                    <p>${post.post.body || ''}</p>
                </div>
                ${thumbnailHTML}
                <div class="status-footer">
                    <button class="status-action lemmy-vote-btn" data-action="upvote" data-score="1">${ICONS.lemmyUpvote}</button>
                    <span class="lemmy-score">${post.counts.score}</span>
                    <button class="status-action lemmy-vote-btn" data-action="downvote" data-score="-1">${ICONS.lemmyDownvote}</button>
                    <button class="status-action" data-action="view-comments">${ICONS.reply} ${post.counts.comments}</button>
                    <button class="status-action" data-action="save">${ICONS.bookmark}</button>
                </div>
            </div>
        </div>
        <div class="lemmy-comment-box-container">
            <textarea id="lemmy-new-comment" placeholder="Add a comment..."></textarea>
            <button id="submit-new-lemmy-comment" class="button-primary">Post</button>
        </div>
        <div class="lemmy-comment-thread"></div>
    `;

    container.innerHTML = postHTML;

    const threadContainer = container.querySelector('.lemmy-comment-thread');
    fetchAndRenderComments(state, validatedPostId, threadContainer, actions);
}
