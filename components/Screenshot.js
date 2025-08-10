import { ICONS } from './icons.js';
import { apiFetch } from './api.js';

let currentPostView = null;
let currentCommentView = null;

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

export async function renderScreenshotPage(state, commentView, postView, actions) {
    const view = document.getElementById('screenshot-view');
    view.innerHTML = `
        <div id="screenshot-content">
            <div id="screenshot-comment-area"></div>
            <div id="screenshot-watermark">
                ${ICONS.watermark}
            </div>
        </div>
        <div id="screenshot-controls-container"></div>
    `;

    currentPostView = postView;
    currentCommentView = commentView;

    const commentArea = view.querySelector('#screenshot-comment-area');
    
    // Clear previous content
    commentArea.innerHTML = '';
    
    // **FIX:** Check if views are valid HTML Elements and clone them before appending.
    // This prevents the "parameter is not of type 'Node'" error.
    if (currentPostView instanceof HTMLElement) {
        commentArea.appendChild(currentPostView.cloneNode(true));
    }
    if (currentCommentView instanceof HTMLElement) {
        commentArea.appendChild(currentCommentView.cloneNode(true));
    }

    const controlsContainer = view.querySelector('#screenshot-controls-container');
    // Clear previous controls
    controlsContainer.innerHTML = '';
    const controlsTemplate = document.getElementById('screenshot-controls-template').content.cloneNode(true);
    controlsContainer.appendChild(controlsTemplate);
    
    view.querySelector('#capture-btn').addEventListener('click', () => captureScreenshot(state));
}
