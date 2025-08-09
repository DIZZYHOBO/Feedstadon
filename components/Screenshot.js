import { ICONS } from './icons.js';
import { apiFetch } from './api.js';

let currentPostView = null;
let currentCommentView = null;

async function captureScreenshot(state) {
    const content = document.getElementById('screenshot-content');
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
    commentArea.appendChild(currentPostView);
    commentArea.appendChild(currentCommentView);

    const controlsContainer = view.querySelector('#screenshot-controls-container');
    const controlsTemplate = document.getElementById('screenshot-controls-template').content.cloneNode(true);
    controlsContainer.appendChild(controlsTemplate);
    
    view.querySelector('#capture-btn').addEventListener('click', () => captureScreenshot(state));
}
