import { apiFetch } from './api.js';
import { renderLemmyCard } from './Lemmy.js';
import { renderComment } from './LemmyPost.js';

async function fetchAndRenderComments(instance, postId, container, actions) {
    try {
        const { data } = await apiFetch(instance, null, '/api/v3/post', {}, 'lemmy', { id: postId });
        const postView = data.post_view;
        const comments = data.comments;

        const header = document.createElement('div');
        header.className = 'merged-section-header';
        header.innerHTML = `
            <img src="${postView.community.icon}" class="avatar" />
            <h3>${postView.community.name}</h3>
        `;
        container.appendChild(header);

        comments.forEach(comment => {
            container.appendChild(renderComment(comment, postView, actions));
        });
    } catch (error) {
        container.innerHTML += `<p>Could not load comments for post ${postId}.</p>`;
    }
}

export async function renderMergedPostPage(state, postView, actions) {
    const view = document.getElementById('merged-post-view');
    view.innerHTML = `
        <div id="merged-post-card"></div>
        <div class="merged-comments-container">
            <div id="original-post-comments" class="merged-comments-column"></div>
            <div id="crosspost-comments" class="merged-comments-column"></div>
        </div>
    `;

    const cardContainer = view.querySelector('#merged-post-card');
    const originalContainer = view.querySelector('#original-post-comments');
    const crosspostContainer = view.querySelector('#crosspost-comments');

    // Render the main card
    cardContainer.appendChild(renderLemmyCard(postView, actions));

    // Fetch and render comments for both posts
    const crosspostInstance = new URL(postView.post.ap_id).hostname;
    fetchAndRenderComments(crosspostInstance, postView.post.id, crosspostContainer, actions);

    if (postView.cross_post) {
        const originalInstance = new URL(postView.cross_post.ap_id).hostname;
        fetchAndRenderComments(originalInstance, postView.cross_post.id, originalContainer, actions);
    }
}
