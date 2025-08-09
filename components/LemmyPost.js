import { apiFetch } from './api.js';
import { ICONS } from './icons.js';
import { formatTimestamp } from './utils.js';
import { renderLemmyCard } from './Lemmy.js'; // We can reuse the card from the timeline

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
            const body = commentElement.querySelector('.status-body-content');
            if (body) {
                body.appendChild(repliesContainer);
                renderCommentTree(commentView.children, repliesContainer, actions);
            }
        }
    });
}

async function fetchAndRenderComments(state, postId, container, actions) {
    container.innerHTML = ``;
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

export function renderCommentNode(commentView, actions) {
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
                <div class="status-header-main" data-action="view-creator">
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
            <div class="status-content"></div>
            <div class="status-footer">
                <div class="lemmy-vote-cluster">
                    <button class="status-action lemmy-vote-btn ${commentView.my_vote === 1 ? 'active' : ''}" data-action="upvote" data-score="1">${ICONS.lemmyUpvote}</button>
                    <span class="lemmy-score">${counts.score}</span>
                    <button class="status-action lemmy-vote-btn ${commentView.my_vote === -1 ? 'active' : ''}" data-action="downvote" data-score="-1">${ICONS.lemmyDownvote}</button>
                </div>
                <button class="status-action" data-action="reply">${ICONS.reply}</button>
            </div>
        </div>
    `;
    
    const contentDiv = commentWrapper.querySelector('.status-content');
    if (contentDiv) {
        contentDiv.innerHTML = new showdown.Converter().makeHtml(comment.content);
    }

    commentWrapper.querySelector('[data-action="view-creator"]').addEventListener('click', (e) => {
        e.stopPropagation();
        actions.showLemmyProfile(`${creator.name}@${new URL(creator.actor_id).hostname}`);
    });

    let pressTimer;
    commentWrapper.addEventListener('touchstart', (e) => {
        pressTimer = setTimeout(() => {
            const isOwn = commentView.creator.name === localStorage.getItem('lemmy_username');
            let menuItems = [
                { label: `${ICONS.delete} Block @${commentView.creator.name}`, action: () => {
                    if (confirm('Are you sure you want to block this user?')) {
                        actions.lemmyBlockUser(commentView.creator.id, true);
                    }
                }},
            ];
            if (isOwn) {
                 menuItems.push(
                    { label: `${ICONS.edit} Edit`, action: () => {
                        showReplyBox(commentWrapper, commentView, actions);
                        const replyBox = commentWrapper.querySelector('.lemmy-reply-box');
                        const textarea = replyBox.querySelector('textarea');
                        textarea.value = comment.content;
                        const button = replyBox.querySelector('.submit-reply-btn');
                        button.textContent = 'Save';
                        button.onclick = async (e) => {
                            e.stopPropagation();
                            const newContent = textarea.value.trim();
                            if (newContent) {
                                await actions.lemmyEditComment(comment.id, newContent);
                                replyBox.remove();
                            }
                        };
                    }},
                    { label: `${ICONS.delete} Delete`, action: () => {
                        if (confirm('Are you sure you want to delete this comment?')) {
                            actions.lemmyDeleteComment(comment.id);
                        }
                    }}
                );
            }
            actions.showContextMenu(e, menuItems);
        }, 500);
    });

    commentWrapper.addEventListener('touchend', () => {
        clearTimeout(pressTimer);
    });

    commentWrapper.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        const isOwn = commentView.creator.name === localStorage.getItem('lemmy_username');
        let menuItems = [
            { label: `${ICONS.delete} Block @${commentView.creator.name}`, action: () => {
                if (confirm('Are you sure you want to block this user?')) {
                    actions.lemmyBlockUser(commentView.creator.id, true);
                }
            }},
        ];
        if (isOwn) {
             menuItems.push(
                { label: `${ICONS.edit} Edit`, action: () => {
                    showReplyBox(commentWrapper, commentView, actions);
                    const replyBox = commentWrapper.querySelector('.lemmy-reply-box');
                    const textarea = replyBox.querySelector('textarea');
                    textarea.value = comment.content;
                    const button = replyBox.querySelector('.submit-reply-btn');
                    button.textContent = 'Save';
                    button.onclick = async (e) => {
                        e.stopPropagation();
                        const newContent = textarea.value.trim();
                        if (newContent) {
                            await actions.lemmyEditComment(comment.id, newContent);
                            replyBox.remove();
                        }
                    };
                }},
                { label: `${ICONS.delete} Delete`, action: () => {
                    if (confirm('Are you sure you want to delete this comment?')) {
                        actions.lemmyDeleteComment(comment.id);
                    }
                }}
            );
        }
        actions.showContextMenu(e, menuItems);
    });
    
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
    container.innerHTML = '';

    try {
        const lemmyInstance = localStorage.getItem('lemmy_instance');
        const { data } = await apiFetch(lemmyInstance, null, `/api/v3/post?id=${post.post.id}`, {}, 'lemmy');
        const postView = data.post_view;

        container.innerHTML = ''; // Clear loading message

        // Render the main post using the standard Lemmy card
        const mainPostCard = renderLemmyCard(postView, actions);
        mainPostCard.classList.add('main-thread-post');
        container.appendChild(mainPostCard);

        // Add a dedicated container for the comments
        const threadContainer = document.createElement('div');
        threadContainer.className = 'lemmy-comment-thread';
        container.appendChild(threadContainer);
        
        fetchAndRenderComments(state, postView.post.id, threadContainer, actions);
        
    } catch (error) {
        console.error("Failed to load Lemmy post detail:", error);
        container.innerHTML = `<p>Could not load post. ${error.message}</p>`;
    }
}
