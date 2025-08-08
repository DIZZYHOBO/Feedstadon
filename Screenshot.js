import { apiFetch } from './api.js';
import { renderLemmyCard } from './Lemmy.js'; 
import { ICONS } from './icons.js';

function captureAndSave() {
    const captureTarget = document.getElementById('screenshot-content');
    html2canvas(captureTarget, {
        backgroundColor: getComputedStyle(document.body).getPropertyValue('--bg-color'),
        useCORS: true 
    }).then(canvas => {
        const link = document.createElement('a');
        link.download = 'feedstodon-screenshot.png';
        link.href = canvas.toDataURL('image/png');
        link.click();
    });
}

export async function renderScreenshotPage(state, commentView, postView, actions) {
    const view = document.getElementById('screenshot-view');
    const controlsContainer = view.querySelector('.screenshot-controls');
    const contentArea = view.querySelector('#screenshot-content');
    const watermark = view.querySelector('#screenshot-watermark');

    // Reset view
    contentArea.innerHTML = '';
    watermark.style.display = 'none';
    watermark.innerHTML = ICONS.watermark;
    
    controlsContainer.innerHTML = `
        <button id="toggle-comments-btn">Toggle Comments</button>
        <button id="toggle-image-btn">Toggle Image</button>
        <button id="toggle-body-btn">Toggle Body</button>
        <button id="toggle-watermark-btn">Toggle Watermark</button>
        <button id="save-screenshot-btn">${ICONS.save}</button>
    `;
    
    // Render the main post
    const mainPostCard = renderLemmyCard(postView, actions);
    contentArea.appendChild(mainPostCard);
    
    // Fetch context and render comments
    try {
        const lemmyInstance = localStorage.getItem('lemmy_instance');
        const { data } = await apiFetch(lemmyInstance, null, `/api/v3/comment`, {}, 'lemmy', { id: commentView.comment.id });
        
        if (data && data.context && Array.isArray(data.context)) {
            const context = data.comment_view.comment.path.split('.').slice(1, -1).map(id => parseInt(id));
            const allComments = [ ...data.context, data.comment_view ];

            context.forEach(parentId => {
                const parentComment = allComments.find(c => c.comment.id === parentId);
                if (parentComment) {
                     const commentEl = document.createElement('div');
                     commentEl.className = 'status lemmy-comment screenshot-comment';
                     commentEl.innerHTML = `<div class="status-body-content"><div class="status-header"><span class="display-name">${parentComment.creator.name}</span></div><div class="status-content">${parentComment.comment.content}</div></div>`;
                     contentArea.appendChild(commentEl);
                }
            });
        }

        const finalComment = document.createElement('div');
        finalComment.className = 'status lemmy-comment screenshot-comment';
        finalComment.innerHTML = `<div class="status-body-content"><div class="status-header"><span class="display-name">${commentView.creator.name}</span></div><div class="status-content">${commentView.comment.content}</div></div>`;
        contentArea.appendChild(finalComment);
        contentArea.appendChild(watermark);

    } catch(err) {
        console.error("Failed to get comment context for screenshot", err);
    }
    
    // Add control listeners
    controlsContainer.querySelector('#save-screenshot-btn').addEventListener('click', captureAndSave);
    
    let commentsVisible = true;
    controlsContainer.querySelector('#toggle-comments-btn').addEventListener('click', () => {
        commentsVisible = !commentsVisible;
        contentArea.querySelectorAll('.screenshot-comment').forEach(el => {
            el.style.display = commentsVisible ? 'block' : 'none';
        });
    });
    
    let imageVisible = true;
    controlsContainer.querySelector('#toggle-image-btn').addEventListener('click', () => {
        imageVisible = !imageVisible;
        const image = contentArea.querySelector('.status-media');
        if (image) image.style.display = imageVisible ? 'flex' : 'none';
    });

    let bodyVisible = true;
    controlsContainer.querySelector('#toggle-body-btn').addEventListener('click', () => {
        bodyVisible = !bodyVisible;
        const body = contentArea.querySelector('.lemmy-card .status-content > *:not(h3)');
        if (body) body.style.display = bodyVisible ? 'block' : 'none';
    });

    let watermarkVisible = false;
    controlsContainer.querySelector('#toggle-watermark-btn').addEventListener('click', () => {
        watermarkVisible = !watermarkVisible;
        watermark.style.display = watermarkVisible ? 'flex' : 'none';
    });
}
