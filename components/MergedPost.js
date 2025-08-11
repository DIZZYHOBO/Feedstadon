import { ICONS } from './icons.js';
import { apiFetch } from './api.js';
import { renderLemmyComment } from './LemmyPost.js'; // Corrected import
import { renderStatus } from './Post.js';
import { timeAgo } from './utils.js';

export async function renderMergedPostPage(state, post, actions) {
    const view = document.getElementById('merged-post-view');
    view.innerHTML = `
        <div class="merged-post-container">
            <div class="main-post-area"></div>
            <div class="comments-area">
                <h3>Comments</h3>
                <div class="comments-tabs">
                    <button class="tab-button active" data-platform="lemmy">Lemmy</button>
                    <button class="tab-button" data-platform="mastodon">Mastodon</button>
                </div>
                <div id="lemmy-comments" class="comments-feed"></div>
                <div id="mastodon-comments" class="comments-feed" style="display:none;"></div>
            </div>
        </div>
    `;

    const mainPostArea = view.querySelector('.main-post-area');
    const lemmyCommentsContainer = view.querySelector('#lemmy-comments');
    const mastodonCommentsContainer = view.querySelector('#mastodon-comments');

    // For now, let's assume the merged post is based on a Lemmy post
    // This logic will need to be more robust in the future
    if (post.lemmy) {
        const lemmyCard = document.createElement('div');
        lemmyCard.innerHTML = `
             <div class="status lemmy-post" data-id="${post.lemmy.post.id}">
                <h3>${post.lemmy.post.name}</h3>
                <p>by ${post.lemmy.creator.name} in ${post.lemmy.community.name}</p>
                 ${post.lemmy.post.body ? `<div class="lemmy-post-body">${new showdown.Converter().makeHtml(post.lemmy.post.body)}</div>` : ''}
            </div>
        `;
        mainPostArea.appendChild(lemmyCard);

        // Fetch and render Lemmy comments
        const lemmyInstance = localStorage.getItem('lemmy_instance');
        try {
            const lemmyComments = await apiFetch(lemmyInstance, null, `/api/v3/comment/list?post_id=${post.lemmy.post.id}&sort=New`, {}, 'lemmy');
            lemmyCommentsContainer.innerHTML = '';
            lemmyComments.data.comments.forEach(comment => {
                lemmyCommentsContainer.appendChild(renderLemmyComment(comment, state, actions, post.lemmy.creator.id));
            });
        } catch (err) {
            lemmyCommentsContainer.innerHTML = 'Could not load Lemmy comments.';
        }
    }
    
    // Fetch and render Mastodon comments (if a corresponding status exists)
    // This is a placeholder for future logic to link Lemmy and Mastodon posts
    mastodonCommentsContainer.innerHTML = 'Mastodon comments are not yet supported for merged posts.';


    // Tab switching logic
    view.querySelectorAll('.tab-button').forEach(button => {
        button.addEventListener('click', () => {
            const platform = button.dataset.platform;
            view.querySelectorAll('.tab-button').forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');

            if (platform === 'lemmy') {
                lemmyCommentsContainer.style.display = 'block';
                mastodonCommentsContainer.style.display = 'none';
            } else {
                lemmyCommentsContainer.style.display = 'none';
                mastodonCommentsContainer.style.display = 'block';
            }
        });
    });
}
