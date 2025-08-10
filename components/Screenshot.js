import { ICONS } from './icons.js';
import { apiFetch } from './api.js';

let currentPostView = null;
let currentCommentView = null;
let previousComments = [];

async function captureScreenshot(state) {
    const content = document.getElementById('screenshot-content');
    try {
        const canvas = await html2canvas(content, {
            backgroundColor: getComputedStyle(document.body).getPropertyValue('--bg-color'),
            useCORS: true,
            scale: 2 // Higher scale for better resolution
        });
        const dataUrl = canvas.toDataURL('image/png');
        
        // Create a link and trigger download
        const link = document.createElement('a');
        link.download = `feedstadon-screenshot-${Date.now()}.png`;
        link.href = dataUrl;
        link.click();
    } catch (error) {
        console.error("Failed to capture screenshot:", error);
        alert("Sorry, something went wrong while creating the screenshot.");
    }
}

function togglePreviousComments(show) {
    const container = document.getElementById('previous-comments-container');
    if (!container) return;

    if (show) {
        container.style.display = 'block';
        document.getElementById('show-previous-btn').style.display = 'none';
        document.getElementById('hide-previous-btn').style.display = 'inline-block';
    } else {
        container.style.display = 'none';
        document.getElementById('show-previous-btn').style.display = 'inline-block';
        document.getElementById('hide-previous-btn').style.display = 'none';
    }
}

export async function renderScreenshotPage(state, commentView, postView, prevComments, actions) {
    const view = document.getElementById('screenshot-view');
    view.innerHTML = `
        <div id="screenshot-content">
            <div id="previous-comments-container" style="display: none;"></div>
            <div id="screenshot-comment-area"></div>
        </div>
        <div id="screenshot-controls-container"></div>
    `;

    currentPostView = postView;
    currentCommentView = commentView;
    previousComments = prevComments || [];

    const commentArea = view.querySelector('#screenshot-comment-area');
    commentArea.innerHTML = '';
    
    // **FIX:** Clone nodes to prevent "parameter is not of type 'Node'" error
    if (currentPostView instanceof HTMLElement) {
        commentArea.appendChild(currentPostView.cloneNode(true));
    }
    if (currentCommentView instanceof HTMLElement) {
        commentArea.appendChild(currentCommentView.cloneNode(true));
    }
    
    // Render previous comments if they exist
    const prevCommentsContainer = view.querySelector('#previous-comments-container');
    if (previousComments.length > 0) {
        // Render oldest to newest
        previousComments.forEach(comment => {
            prevCommentsContainer.appendChild(comment.cloneNode(true));
        });
    }

    const controlsContainer = view.querySelector('#screenshot-controls-container');
    controlsContainer.innerHTML = ''; // Clear previous controls
    const controlsTemplate = document.getElementById('screenshot-controls-template').content.cloneNode(true);
    controlsContainer.appendChild(controlsTemplate);
    
    view.querySelector('#capture-btn').addEventListener('click', () => captureScreenshot(state));
    
    const showBtn = view.querySelector('#show-previous-btn');
    const hideBtn = view.querySelector('#hide-previous-btn');

    if (previousComments.length > 0) {
        showBtn.style.display = 'inline-block';
        showBtn.addEventListener('click', () => togglePreviousComments(true));
        hideBtn.addEventListener('click', () => togglePreviousComments(false));
    } else {
        showBtn.style.display = 'none';
        hideBtn.style.display = 'none';
    }
}
