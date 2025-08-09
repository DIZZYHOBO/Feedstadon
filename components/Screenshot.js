import { renderLemmyCard } from './Lemmy.js';
import { renderCommentNode } from './LemmyPost.js';
import { apiFetch } from './api.js';

export async function renderScreenshotPage(state, commentView, postView, actions) {
    const container = document.getElementById('screenshot-view');
    if (!container) {
        console.error("Screenshot view container not found!");
        return;
    }

    container.innerHTML = ''; 

    const controlsTemplate = document.getElementById('screenshot-controls-template');
    container.appendChild(controlsTemplate.content.cloneNode(true));

    const previewArea = container.querySelector('#screenshot-preview-area');
    const allComments = [];
    let parentCount = 0;
    let replyCount = 0;
    let includeReplies = false;

    // Fetch all comments for the post
    try {
        const lemmyInstance = localStorage.getItem('lemmy_instance') || state.lemmyInstances[0];
        const params = { post_id: postView.post.id, max_depth: 15, sort: 'New', type_: 'All' };
        const response = await apiFetch(lemmyInstance, null, '/api/v3/comment/list', {}, 'lemmy', params);
        allComments.push(...response.data.comments);
    } catch (err) {
        console.error("Failed to load Lemmy comments for screenshot:", err);
        previewArea.innerHTML = `<p>Could not load comments. ${err.message}</p>`;
        return;
    }
    
    const targetCommentIndex = allComments.findIndex(c => c.comment.id === commentView.comment.id);
    const targetComment = allComments[targetCommentIndex];
    const targetCommentPathParts = targetComment.comment.path.split('.');
    
    const getParents = (comment) => {
        const parents = [];
        const pathParts = comment.comment.path.split('.');
        if (pathParts.length <= 2) return parents;

        for (let i = 1; i < pathParts.length - 1; i++) {
            const parentId = parseInt(pathParts[i], 10);
            const parentComment = allComments.find(c => c.comment.id === parentId);
            if(parentComment) parents.push(parentComment);
        }
        return parents;
    };
    
    const getReplies = (comment) => {
        return allComments.filter(c => {
             const pathParts = c.comment.path.split('.');
             const parentId = parseInt(pathParts[pathParts.length - 2], 10);
             return parentId === comment.comment.id;
        });
    };

    const allParents = getParents(targetComment);
    const allReplies = getReplies(targetComment);


    function updatePreview() {
        previewArea.innerHTML = '';
        
        // Render the main post card
        previewArea.appendChild(renderLemmyCard(postView, actions));

        // Render parent comments
        const parentsToShow = allParents.slice(allParents.length - parentCount);
        parentsToShow.forEach(parent => {
            previewArea.appendChild(renderCommentNode(parent, actions));
        });
        
        // Render the target comment
        previewArea.appendChild(renderCommentNode(commentView, actions));
        
        // Render replies if toggled
        if (includeReplies) {
            const repliesToShow = allReplies.slice(0, replyCount);
            repliesToShow.forEach(reply => {
                const replyNode = renderCommentNode(reply, actions);
                replyNode.style.marginLeft = '20px'; // Indent replies
                previewArea.appendChild(replyNode);
            });
        }
    }

    // Initial render
    updatePreview();

    // --- Event Listeners for Controls ---
    container.querySelector('[data-action="parents-up"]').addEventListener('click', () => {
        if (parentCount < allParents.length) {
            parentCount++;
            updatePreview();
        }
    });

    container.querySelector('[data-action="parents-down"]').addEventListener('click', () => {
        if (parentCount > 0) {
            parentCount--;
            updatePreview();
        }
    });
    
    const repliesCheckbox = container.querySelector('#include-replies-checkbox');
    const repliesControls = container.querySelector('#replies-controls');

    repliesCheckbox.addEventListener('change', (e) => {
        includeReplies = e.target.checked;
        repliesControls.style.display = includeReplies ? 'block' : 'none';
        if (!includeReplies) {
            replyCount = 0; // Reset reply count when hiding
        }
        updatePreview();
    });

    container.querySelector('[data-action="replies-up"]').addEventListener('click', () => {
        if (replyCount < allReplies.length) {
            replyCount++;
            updatePreview();
        }
    });
    
    container.querySelector('[data-action="replies-down"]').addEventListener('click', () => {
        if (replyCount > 0) {
            replyCount--;
            updatePreview();
        }
    });
    
    container.querySelector('#capture-btn').addEventListener('click', () => {
        html2canvas(previewArea).then(canvas => {
            const image = canvas.toDataURL('image/png');
            const link = document.createElement('a');
            link.href = image;
            link.download = 'feedstodon-screenshot.png';
            link.click();
        });
    });
}
