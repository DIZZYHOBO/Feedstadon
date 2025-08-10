import { ICONS } from './icons.js';
import { formatTimestamp, timeAgo } from './utils.js';
import { showToast } from './ui.js';

export function renderLemmyCard(post, actions) {
    const lemmyCard = document.createElement('div');
    lemmyCard.className = 'status lemmy-card';
    lemmyCard.dataset.postId = post.post.id;

    const isVideo = post.post.url && (post.post.url.endsWith('.mp4') || post.post.url.includes('streamable.com'));
    const isImage = post.post.url && (post.post.url.endsWith('.jpg') || post.post.url.endsWith('.png') || post.post.url.endsWith('.gif'));
    const isYoutube = post.post.url && (post.post.url.includes('youtube.com') || post.post.url.includes('youtu.be'));
    const hasEmbed = isVideo || isImage || isYoutube || post.post.embed_video_url;

    lemmyCard.innerHTML = `
        <div class="crosspost-tag" style="display: none;">Crosspost</div>
        <div class="status-body-content">
            <div class="status-header">
                <a href="#" class="status-header-main" data-action="view-community">
                    <img class="avatar" src="${post.community.icon}" alt="${post.community.name} icon" onerror="this.onerror=null;this.src='./images/php.png';">
                    <div>
                        <span class="display-name">${post.community.name}</span>
                        <span class="acct">by @${post.creator.name}</span>
                    </div>
                </a>
                <div class="status-header-side">
                    <span class="timestamp">${timeAgo(post.post.published)}</span>
                </div>
            </div>
            <h3 class="lemmy-title">${post.post.name}</h3>
            ${post.post.url ? `<a href="${post.post.url}" target="_blank" class="lemmy-url-link">${post.post.url}</a>` : ''}
            <div class="lemmy-post-body" style="${post.post.body ? 'max-height: 200px; overflow: hidden;' : ''}">
                ${post.post.body ? new showdown.Converter().makeHtml(post.post.body) : ''}
            </div>
            ${post.post.body && post.post.body.length > 800 ? '<a href="#" class="read-more-link">Read more...</a>' : ''}
            ${hasEmbed ? `
                <div class="lemmy-embed-container" style="display: ${post.post.thumbnail_url ? 'block' : 'none'};">
                    ${post.post.thumbnail_url ? `<img src="${post.post.thumbnail_url}" class="lemmy-thumbnail" alt="thumbnail">` : ''}
                </div>` : ''}
        </div>
        <div class="status-footer">
            <div class="lemmy-vote-cluster">
                <button class="status-action lemmy-vote-btn ${post.my_vote === 1 ? 'active' : ''}" data-action="upvote" data-score="1">${ICONS.lemmyUpvote}</button>
                <span class="lemmy-score">${post.counts.score}</span>
                <button class="status-action lemmy-vote-btn ${post.my_vote === -1 ? 'active' : ''}" data-action="downvote" data-score="-1">${ICONS.lemmyDownvote}</button>
            </div>
            <button class="status-action" data-action="view-comments">
                ${ICONS.comments}
                <span>${post.counts.comments}</span>
            </button>
            <button class="status-action" data-action="share">${ICONS.share}</button>
        </div>
    `;

    lemmyCard.addEventListener('dblclick', () => actions.showLemmyPostDetail(post));

    const statusBody = lemmyCard.querySelector('.status-body-content');
    const readMoreLink = lemmyCard.querySelector('.read-more-link');
    const embedContainer = lemmyCard.querySelector('.lemmy-embed-container');
    const postBody = lemmyCard.querySelector('.lemmy-post-body');

    // Single click to view post details
    statusBody.addEventListener('click', (e) => {
        // Prevent post navigation when clicking on links or buttons inside the body
        if (e.target.tagName === 'A' || e.target.closest('a') || e.target.tagName === 'BUTTON' || e.target.closest('button')) {
            return;
        }
        actions.showLemmyPostDetail(post);
    });

    if (readMoreLink) {
        readMoreLink.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            postBody.style.maxHeight = 'none';
            readMoreLink.style.display = 'none';
        });
    }

    if (embedContainer) {
        embedContainer.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            embedContainer.innerHTML = getVideoPlayer(post.post.url) || getYoutubePlayer(post.post.url) || `<img src="${post.post.url}" style="max-width: 100%; border-radius: 8px;" alt="full image"/>`;
        });
    }

    lemmyCard.querySelector('[data-action="view-community"]').addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        actions.showLemmyCommunityPage(post.community.name);
    });

    lemmyCard.querySelectorAll('.lemmy-vote-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const score = parseInt(btn.dataset.score, 10);
            actions.lemmyPostVote(post.post.id, score, lemmyCard);
        });
    });

    lemmyCard.querySelector('[data-action="view-comments"]').addEventListener('click', (e) => {
        e.stopPropagation();
        actions.showLemmyPostDetail(post);
    });
    
    lemmyCard.querySelector('[data-action="share"]').addEventListener('click', (e) => {
        e.stopPropagation();
        const shareUrl = post.post.ap_id;
        if (navigator.share) {
            navigator.share({
                title: post.post.name,
                url: shareUrl,
            }).catch(console.error);
        } else {
            navigator.clipboard.writeText(shareUrl).then(() => {
                showToast("Post URL copied to clipboard");
            });
        }
    });

    return lemmyCard;
}

function getVideoPlayer(url) {
    if (url.includes('streamable.com')) {
        const videoId = url.split('/').pop();
        return `<iframe src="https://streamable.com/e/${videoId}" frameborder="0" allowfullscreen style="width:100%; aspect-ratio: 16/9;"></iframe>`;
    }
    if (url.endsWith('.mp4')) {
        return `<video controls autoplay style="width:100%; border-radius: 8px;"><source src="${url}" type="video/mp4"></video>`;
    }
    return null;
}

function getYoutubePlayer(url) {
    let videoId;
    if (url.includes('youtu.be')) {
        videoId = new URL(url).pathname.substring(1);
    } else {
        videoId = new URL(url).searchParams.get('v');
    }
    if (videoId) {
        return `<iframe src="https://www.youtube.com/embed/${videoId}" frameborder="0" allowfullscreen style="width:100%; aspect-ratio: 16/9;"></iframe>`;
    }
    return null;
}
