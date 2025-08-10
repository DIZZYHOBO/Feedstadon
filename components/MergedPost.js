import { renderStatus } from './Post.js';
import { renderLemmyCard } from './Lemmy.js';
import { renderCommentNode } from './LemmyPost.js';
import { ICONS } from './icons.js';

function renderComments(comments, currentUser, actions, state, isLemmy) {
    if (isLemmy) {
        return comments.map(comment => renderCommentNode(comment, actions, state).outerHTML).join('');
    } else {
        const userComments = [];
        const otherComments = [];

        if (currentUser) {
            comments.forEach(reply => {
                if (reply.account.id === currentUser.id) {
                    userComments.push(reply);
                } else {
                    otherComments.push(reply);
                }
            });
        } else {
            otherComments.push(...comments);
        }

        let commentsHtml = otherComments.map(reply => renderStatus(reply, currentUser, actions, state.settings).outerHTML).join('');
        
        if (userComments.length > 0) {
            commentsHtml += `
                <div class="user-comments-box">
                    <h3>Your Comments</h3>
                    ${userComments.map(reply => renderStatus(reply, currentUser, actions, state.settings).outerHTML).join('')}
                </div>
            `;
        }
        return commentsHtml;
    }
}


export function renderMergedPost(post, state, actions) {
    const view = document.getElementById('merged-post-view');
    view.innerHTML = `<div class="loading-spinner">${ICONS.refresh}</div>`;
    view.style.display = 'block';

    const isLemmyPost = !!post.post; 
    
    let mainPostHtml;
    let comments = [];

    if (isLemmyPost) {
        mainPostHtml = renderLemmyCard(post, actions).outerHTML;
        // You would fetch Lemmy comments here, for now we assume they are part of the object
        comments = post.comments || [];
    } else {
        mainPostHtml = renderStatus(post, state.currentUser, actions, state.settings).outerHTML;
        // You would fetch Mastodon replies here
        comments = post.replies || [];
    }
    
    view.innerHTML = `
        <div class="full-post-container">
            <button class="close-btn">${ICONS.close}</button>
            <div class="post-main">
                ${mainPostHtml}
            </div>
            <div class="post-replies">
                ${renderComments(comments, state.currentUser, actions, state, isLemmyPost)}
            </div>
        </div>
    `;

    view.querySelector('.close-btn').addEventListener('click', () => view.style.display = 'none');
}
