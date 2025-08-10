import { apiFetch } from './api.js';
import { ICONS } from './icons.js';
import { formatTimestamp, processSpoilers } from './utils.js';

export function renderCommentNode(comment, actions, state) {
    const creator = comment.creator;
    const counts = comment.counts;
    const isOwn = state.lemmyUser && comment.creator.id === state.lemmyUser.person_view.person.id;

    const commentNode = document.createElement('div');
    commentNode.className = 'lemmy-comment';
    commentNode.dataset.commentId = comment.comment.id;

    let menuItems = [
        {
            label: `${ICONS.delete} Block @${creator.name}`,
            action: () => {
                if (confirm(`Are you sure you want to block this user?`)) {
                    actions.lemmyBlockUser(creator.id, true);
                }
            }
        }
    ];

    if (isOwn) {
        menuItems.push(
            {
                label: `${ICONS.edit} Edit`,
                action: () => {
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
                }
            },
            {
                label: `${ICONS.delete} Delete`,
                action: () => {
                    if (confirm('Are you sure you want to delete this comment?')) {
                        actions.lemmyDeleteComment(comment.comment.id, true);
                        commentNode.remove();
                    }
                }
            }
        );
    }

    commentNode.innerHTML = `
        <div class="comment-header">
            <a href="#" data-action="view-creator">
                <img src="${creator.avatar}" class="avatar" alt="${creator.name}'s avatar" onerror="this.src='./images/logo.png'">
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

    commentNode.querySelector('[data-action="reply"]').addEventListener('click', (e) => {
        e.stopPropagation();
        const replyContainer = commentNode.querySelector('.quick-reply-container');
        replyContainer.style.display = replyContainer.style.display === 'block' ? 'none' : 'block';
        if (replyContainer.style.display === 'block') {
            replyContainer.querySelector('textarea').focus();
        }
    });
    
    commentNode.querySelector('.quick-reply-box button').addEventListener('click', async (e) => {
        e.stopPropagation();
        const textarea = commentNode.querySelector('.quick-reply-box textarea');
        const content = textarea.value.trim();
        if(!content) return;

        try {
            await actions.lemmyPostComment({ content: content, post_id: comment.post.id, parent_id: comment.comment.id });
            textarea.value = '';
            commentNode.querySelector('.quick-reply-container').style.display = 'none';
        } catch(err) {
            alert('Failed to post comment.');
        }
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
    const lemmyInstance = localStorage.getItem('lemmy_instance');

    const { data: { comments } } = await apiFetch(
        lemmyInstance,
        null,
        `/api/v3/comment/list`,
        {},
        'lemmy',
        { post_id: post.post.id, sort: 'Hot', max_depth: 8 }
    );

    const processedBody = processSpoilers(post.post.body || '');
    const bodyHtml = new showdown.Converter().makeHtml(processedBody);

    view.innerHTML = `
        <div class="lemmy-post-full view-container">
            <div class="post-header-bar">
                 <button class="back-btn">${ICONS.back}</button>
                 <h3>${community.name}</h3>
            </div>
            <div class="post-main-content">
                <h2>${post.post.name}</h2>
                <div class="post-body">${bodyHtml}</div>
                 <div class="status-footer">
                <div class="lemmy-vote-cluster">
                    <button class="status-action lemmy-vote-btn ${post.my_vote === 1 ? 'active' : ''}" data-action="upvote" data-score="1">${ICONS.lemmyUpvote}</button>
                    <span class="lemmy-score">${post.counts.score}</span>
                    <button class="status-action lemmy-vote-btn ${post.my_vote === -1 ? 'active' : ''}" data-action="downvote" data-score="-1">${ICONS.lemmyDownvote}</button>
                </div>
                <button class="status-action" data-action="quick-reply">${ICONS.reply}</button>
                <button class="status-action" data-action="view-post">${ICONS.comments} ${post.counts.comments}</button>
                <button class="status-action ${post.saved ? 'active' : ''}" data-action="save">${ICONS.bookmark}</button>
            </div>
            </div>
            <div class="lemmy-comments-section"></div>
        </div>
    `;

    const commentsContainer = view.querySelector('.lemmy-comments-section');
    const userComments = [];
    const otherComments = [];

    const currentUserPersonId = state.lemmyUser ? state.lemmyUser.person_view.person.id : null;

    if (currentUserPersonId) {
        comments.forEach(comment => {
            if (comment.creator.id === currentUserPersonId) {
                userComments.push(comment);
            } else {
                otherComments.push(comment);
            }
        });
    } else {
        otherComments.push(...comments);
    }
    
    otherComments.forEach(comment => {
        commentsContainer.appendChild(renderCommentNode(comment, actions, state));
    });

    if (userComments.length > 0) {
        const userCommentsBox = document.createElement('div');
        userCommentsBox.className = 'user-comments-box';
        userCommentsBox.innerHTML = '<h3>Your Comments</h3>';
        userComments.forEach(comment => {
            userCommentsBox.appendChild(renderCommentNode(comment, actions, state));
        });
        commentsContainer.appendChild(userCommentsBox);
    }

    view.querySelector('.back-btn').addEventListener('click', () => actions.navigateToPreviousView());
}
