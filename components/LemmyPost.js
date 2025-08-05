import { apiFetch } from './api.js';
import { ICONS } from './icons.js';
import { formatTimestamp } from './utils.js';

function showReplyBox(commentWrapper, comment, actions) {
    const existingReplyBox = commentWrapper.querySelector('.lemmy-reply-box');
    if (existingReplyBox) {
        existingReplyBox.remove();
        return;
    }

    const replyBox = document.createElement('div');
    replyBox.className = 'lemmy-reply-box';
    replyBox.innerHTML = `
        <textarea class="reply-textarea" placeholder="Write your reply..."></textarea>
        <div class="reply-actions">
            <button class="cancel-reply-btn button-secondary">Cancel</button>
            <button class="submit-reply-btn">Reply</button>
        </div>
    `;

    commentWrapper.querySelector('.status-body-content').appendChild(replyBox);

    replyBox.querySelector('.cancel-reply-btn').addEventListener('click', (e) => {
        e.stopPropagation();
        replyBox.remove();
    });

    replyBox.querySelector('.submit-reply-btn').addEventListener('click', async (e) => {
        e.stopPropagation();
        const textarea = replyBox.querySelector('.reply-textarea');
        const content = textarea.value.trim();
        if (!content) return;

        try {
            const newComment = await actions.lemmyPostComment({
                content: content,
                post_id: comment.post.id,
                parent_id: comment.comment.id
            });

            const newCommentEl = renderCommentNode(newComment.comment_view, actions);
            let repliesContainer = commentWrapper.querySelector('.comment-replies-container');
            if (!repliesContainer) {
                repliesContainer = document.createElement('div');
                repliesContainer.className = 'comment-replies-container';
                commentWrapper.appendChild(repliesContainer);
            }
            repliesContainer.prepend(newCommentEl);
            replyBox.remove();

        } catch (err) {
            alert('Failed to post reply.');
        }
    });
}

function buildCommentTree(comments) {
    const commentMap = new Map();
    const rootComments = [];

    comments.forEach(commentView => {
        commentView.children = [];
        commentMap.set(commentView.comment.id, commentView);
    });

    comments.forEach(commentView => {
        const pathParts = commentView.comment.path.split('.');
        if (pathParts.length === 2) {
            rootComments.push(commentView);
        } else {
            const parentId = parseInt(pathParts[pathParts.length - 2], 10);
            if (commentMap.has(parentId)) {
                const parent = commentMap.get(parentId);
                parent.children.push(commentView);
            }
        }
    });
    return rootComments;
}

function renderCommentTree(comments, container, actions) {
    comments.forEach(commentView => {
        const commentElement = renderCommentNode(commentView, actions);
        container.appendChild(commentElement);

        if (commentView.children && commentView.children.length > 0) {
            const repliesContainer = document.createElement('div');
            repliesContainer.className = 'comment-replies-container';
            commentElement.appendChild(repliesContainer);
            renderCommentTree(commentView.children, repliesContainer, actions);
        }
    });
}

async function fetchAndRenderComments(state, postId, container, actions) {
    container.innerHTML = `<p>Loading comments...</p>`;
    try {
        const lemmyInstance = localStorage.getItem('lemmy_instance') || state.lemmyInstances[0];
        const params = { post_id: postId, max_depth: 15, sort: 'New', type_: 'All' };
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
    commentWrapper.className = 'status lemmy-comment';
    commentWrapper.id = `comment-wrapper-${comment.id}`;
    
    if (comment.path.split('.').length === 2) {
        commentWrapper.classList.add('top-level-comment');
    }

    let optionsMenuHTML = `
        <div class="post-options-container">
            <button class="post-options-btn">${ICONS.more}</button>
            <div class="post-options-menu">
                <button data-action="edit-comment">${ICONS.edit} Edit</button>
                <button data-action="delete-comment">${ICONS.delete} Delete</button>
            </div>
        </div>
    `;

    commentWrapper.innerHTML = `
        <div class="status-body-content">
            <div class="status-header">
                <div class="status-header-main">
                    <img class="avatar" src="${creator.avatar}" alt="${creator.name} avatar" onerror="this.onerror=null;this.src='./images/php.png';">
                    <div>
                        <span class="display-name">${creator.display_name || creator.name}</span>
                        <span class="acct">@${creator.name}</span>
                        <span class="timestamp">· ${formatTimestamp(comment.published)}</span>
                    </div>
                </div>
                <div class="status-header-side">
                    ${optionsMenuHTML}
                </div>
            </div>
            <div class="status-content">${comment.content}</div>
            <div class="status-footer">
                <div class="lemmy-vote-cluster">
                    <button class="status-action lemmy-vote-btn" data-action="upvote" data-score="1">${ICONS.lemmyUpvote}</button>
                    <span class="lemmy-score">${counts.score}</span>
                    <button class="status-action lemmy-vote-btn" data-action="downvote" data-score="-1">${ICONS.lemmyDownvote}</button>
                </div>
                <button class="status-action" data-action="reply">${ICONS.reply}</button>
            </div>
        </div>
    `;
    
    // Event listeners
    commentWrapper.querySelectorAll('.status-action').forEach(button => {
        button.addEventListener('click', (e) => {
            e.stopPropagation();
            const action = e.currentTarget.dataset.action;
            switch(action) {
                case 'upvote': case 'downvote':
                    const score = parseInt(e.currentTarget.dataset.score, 10);
                    actions.lemmyCommentVote(comment.id, score, commentWrapper);
                    break;
                case 'reply':
                    showReplyBox(commentWrapper, commentView, actions);
                    break;
            }
        });
    });

    const optionsBtn = commentWrapper.querySelector('.post-options-btn');
    if (optionsBtn) {
        const menu = commentWrapper.querySelector('.post-options-menu');
        optionsBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            menu.style.display = menu.style.display === 'block' ? 'none' : 'block';
        });
        menu.addEventListener('click', (e) => e.stopPropagation());
    }

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
                     <div class="status-header-main">
                        <img src="${post.community.icon}" alt="${post.community.name} icon" class="avatar">
                        <div>
                            <span class="display-name">${post.community.name}</span>
                            <span class="acct">posted by ${post.creator.name} · ${formatTimestamp(post.post.published)}</span>
                        </div>
                    </div>
                    <div class="status-header-side">
                        <div class="lemmy-icon-indicator">${ICONS.lemmy}</div>
                    </div>
                </div>
                <div class="status-content">
                    <h3 class="lemmy-title">${post.post.name}</h3>
                    <p>${post.post.body || ''}</p>
                </div>
                ${thumbnailHTML}
                <div class="status-footer">
                    <div class="lemmy-vote-cluster">
                        <button class="status-action lemmy-vote-btn" data-action="upvote" data-score="1">${ICONS.lemmyUpvote}</button>
                        <span class="lemmy-score">${post.counts.score}</span>
                        <button class="status-action lemmy-vote-btn" data-action="downvote" data-score="-1">${ICONS.lemmyDownvote}</button>
                    </div>
                    <button class="status-action" data-action="view-comments">${ICONS.comments} ${post.counts.comments}</button>
                    <button class="status-action" data-action="save">${ICONS.bookmark}</button>
                </div>
            </div>
        </div>
        <button id="reply-to-post-btn" class="button-primary">Reply to Post</button>
        <div id="reply-to-post-container">
            <div class="lemmy-comment-box-container">
                <textarea id="lemmy-new-comment" placeholder="Add a comment..."></textarea>
                <button id="submit-new-lemmy-comment" class="button-primary">Post</button>
            </div>
        </div>
        <div class="lemmy-comment-thread"></div>
    `;

    container.innerHTML = postHTML;

    const replyBtn = document.getElementById('reply-to-post-btn');
    const replyContainer = document.getElementById('reply-to-post-container');
    replyBtn.addEventListener('click', () => {
        replyContainer.classList.toggle('visible');
    });

    document.getElementById('submit-new-lemmy-comment').addEventListener('click', async () => {
        const textarea = document.getElementById('lemmy-new-comment');
        const content = textarea.value.trim();
        if (!content) return;

        try {
            const newComment = await actions.lemmyPostComment({ content: content, post_id: validatedPostId });
            const newCommentEl = renderCommentNode(newComment.comment_view, actions);
            document.querySelector('.lemmy-comment-thread').prepend(newCommentEl);
            textarea.value = '';
            replyContainer.classList.remove('visible');
        } catch (err) {
            alert('Failed to post comment.');
        }
    });

    const threadContainer = container.querySelector('.lemmy-comment-thread');
    fetchAndRenderComments(state, validatedPostId, threadContainer, actions);
}
