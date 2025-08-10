import { apiFetch } from './api.js';
import { ICONS } from './icons.js';
import { formatTimestamp, processSpoilers } from './utils.js';

export function renderCommentNode(comment, actions, state) {
    const creator = comment.creator;
    const post = comment.post;
    const counts = comment.counts;
    const isOwn = comment.creator.name === localStorage.getItem('lemmy_username');

    let menuItems = [
        { label: `${ICONS.delete} Block @${creator.name}`, action: () => {
            if (confirm(`Are you sure you want to block this user?`)) {
                actions.lemmyBlockUser(creator.id, true);
            }
        }}
    ];
    if (isOwn) {
        menuItems.push(
            { label: `${ICONS.edit} Edit`, action: () => {
                const commentBody = commentNode.querySelector('.comment-body');
                const replyContainer = commentNode.querySelector('.quick-reply-container');
                replyContainer.style.display = 'block';
                const textarea = replyContainer.querySelector('textarea');
                textarea.value = comment.comment.content;
                textarea.focus();
                const button = replyContainer.querySelector('button');
                button.textContent = 'Save';
                button.onclick = async (e) => {
                    e.stopPropagation();
                    const newContent = textarea.value.trim();
                    if (newContent) {
                        const updatedComment = await actions.lemmyEditComment(comment.comment.id, newContent);
                        if (updatedComment) {
                           commentBody.innerHTML = new showdown.Converter().makeHtml(updatedComment.comment_view.comment.content);
                        }
                        replyContainer.style.display = 'none';
                        button.textContent = 'Post';
                    }
                };
            }},
            { label: `${ICONS.delete} Delete`, action: () => {
                if (confirm('Are you sure you want to delete this comment?')) {
                    actions.lemmyDeleteComment(comment.comment.id, true);
                    commentNode.remove();
                }
            }}
        );
    }

    const commentNode = document.createElement('div');
    commentNode.className = 'lemmy-comment';
    commentNode.dataset.commentId = comment.comment.id;

    commentNode.innerHTML = `
        <div class="comment-header">
            <a href="#" data-action="view-creator">
                <img src="${creator.avatar}" class="avatar" alt="${creator.name}'s avatar">
            </a>
            <div class="comment-author">
                <a href="#" class="display-name" data-action="view-creator">${creator.name}</a>
                <span class="acct"> · ${formatTimestamp(comment.comment.published)}</span>
            </div>
            <div class="comment-options">
                <button class="post-options-btn">${ICONS.more}</button>
            </div>
        </div>
        <div class="comment-body">${new showdown.Converter().makeHtml(comment.comment.content)}</div>
        <div class="comment-footer">
            <div class="lemmy-vote-cluster">
                <button class="status-action lemmy-vote-btn ${comment.my_vote === 1 ? 'active' : ''}" data-action="upvote">${ICONS.lemmyUpvote}</button>
                <span class="lemmy-score">${counts.score}</span>
                <button class="status-action lemmy-vote-btn ${comment.my_vote === -1 ? 'active' : ''}" data-action="downvote">${ICONS.lemmyDownvote}</button>
            </div>
            <button class="status-action" data-action="reply">${ICONS.reply}</button>
            <button class="status-action ${comment.saved ? 'active' : ''}" data-action="save">${ICONS.bookmark}</button>
        </div>
        <div class="quick-reply-container" style="display: none;">
            <div class="quick-reply-box">
                <textarea placeholder="Add a comment..."></textarea>
                <button class="button-primary">Post</button>
            </div>
        </div>
        <div class="comment-replies"></div>
    `;

    commentNode.querySelector('.post-options-btn').addEventListener('click', (e) => {
        e.stopPropagation();
        actions.showContextMenu(e, menuItems);
    });
    
    commentNode.querySelector('[data-action="view-creator"]').addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        actions.showLemmyProfile(`${creator.name}@${new URL(creator.actor_id).hostname}`);
    });

    const repliesContainer = commentNode.querySelector('.comment-replies');
    if (comment.replies && comment.replies.length > 0) {
        comment.replies.forEach(reply => {
            repliesContainer.appendChild(renderCommentNode(reply, actions, state));
        });
    }

    return commentNode;
}


export async function renderLemmyPostDetail(postData, actions, state) {
    const view = document.getElementById('lemmy-post-view');
    view.innerHTML = `<div class="loading-spinner">${ICONS.refresh}</div>`;
    
    const post = postData.post_view || postData;
    const community = postData.community || post.community;

    const { data: commentsRes } = await apiFetch(
        localStorage.getItem('lemmy_instance'),
        null,
        `/api/v3/comment/list`,
        {},
        'lemmy',
        { post_id: post.post.id, sort: 'Hot', max_depth: 8 }
    );
    const comments = commentsRes.comments;

    const processedBody = processSpoilers(post.post.body || '');
    const bodyHtml = new showdown.Converter().makeHtml(processedBody);

    view.innerHTML = `
        <div class="lemmy-post-full">
            <div class="post-header-bar">
                 <button class="back-btn">${ICONS.back}</button>
                 <h3>${community.name}</h3>
            </div>
            <div class="post-main-content">
                <h2>${post.post.name}</h2>
                <div class="post-body">${bodyHtml}</div>
            </div>
            <div class="lemmy-comments-section"></div>
        </div>
    `;

    const commentsContainer = view.querySelector('.lemmy-comments-section');
    comments.forEach(comment => {
        commentsContainer.appendChild(renderCommentNode(comment, actions, state));
    });

    view.querySelector('.back-btn').addEventListener('click', () => actions.navigateToPreviousView());
}
