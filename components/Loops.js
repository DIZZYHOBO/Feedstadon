// components/Loops.js
import { ICONS } from './icons.js';
import { timeAgo } from './utils.js';
import { showImageModal, showToast } from './ui.js';

/**
 * Fetch a Loops user profile
 * @param {string} username - Username (with or without instance)
 * @param {string} instance - Loops instance (e.g., loops.video)
 */
export async function getLoopsProfile(username, instance = 'loops.video') {
    try {
        // Clean up the username if it includes an instance
        if (username.includes('@')) {
            const parts = username.split('@');
            username = parts[0];
            instance = parts[1] || instance;
        }

        // Loops API endpoints (these are estimates - adjust based on actual Loops API)
        const profileUrl = `https://${instance}/api/v1/accounts/${username}`;
        const videosUrl = `https://${instance}/api/v1/accounts/${username}/videos`;

        console.log(`Fetching Loops profile from: ${profileUrl}`);

        // Fetch profile data
        const profileResponse = await fetch(profileUrl);
        if (!profileResponse.ok) {
            throw new Error(`Failed to fetch Loops profile: ${profileResponse.status}`);
        }
        const profile = await profileResponse.json();

        // Fetch user's videos
        const videosResponse = await fetch(videosUrl);
        let videos = [];
        if (videosResponse.ok) {
            videos = await videosResponse.json();
        }

        return {
            profile,
            videos: Array.isArray(videos) ? videos : videos.data || []
        };
    } catch (error) {
        console.error('Error fetching Loops profile:', error);
        
        // Try ActivityPub fallback
        try {
            const actorUrl = `https://${instance}/users/${username}`;
            const response = await fetch(actorUrl, {
                headers: {
                    'Accept': 'application/activity+json'
                }
            });
            
            if (response.ok) {
                const actorData = await response.json();
                return {
                    profile: {
                        username: actorData.preferredUsername || username,
                        display_name: actorData.name || username,
                        bio: actorData.summary || '',
                        avatar: actorData.icon?.url || '',
                        banner: actorData.image?.url || '',
                        followers_count: actorData.followers?.totalItems || 0,
                        following_count: actorData.following?.totalItems || 0,
                        videos_count: actorData.outbox?.totalItems || 0,
                        url: actorData.url || `https://${instance}/@${username}`
                    },
                    videos: []
                };
            }
        } catch (apError) {
            console.error('ActivityPub fallback failed:', apError);
        }
        
        return null;
    }
}

/**
 * Render a single Loops video card
 */
export function renderLoopsVideo(video, actions) {
    const card = document.createElement('div');
    card.className = 'loops-video-card';
    card.dataset.videoId = video.id;

    const thumbnailUrl = video.thumbnail || video.preview_url || './images/404.png';
    const videoUrl = video.url || video.video_url;
    const viewCount = video.views_count || video.views || 0;
    const likeCount = video.likes_count || video.favourites_count || 0;
    const commentCount = video.comments_count || video.replies_count || 0;
    const duration = video.duration ? formatDuration(video.duration) : '';

    card.innerHTML = `
        <div class="loops-video-thumbnail" data-video-url="${videoUrl}">
            <img src="${thumbnailUrl}" alt="${video.caption || 'Video thumbnail'}" onerror="this.onerror=null;this.src='./images/404.png';">
            <div class="loops-video-overlay">
                <div class="loops-play-button">${ICONS.play || '▶'}</div>
                ${duration ? `<div class="loops-duration">${duration}</div>` : ''}
            </div>
        </div>
        <div class="loops-video-info">
            <p class="loops-video-caption">${video.caption || video.description || 'No caption'}</p>
            <div class="loops-video-stats">
                <span>${ICONS.view || '👁'} ${formatCount(viewCount)}</span>
                <span>${ICONS.favorite || '❤'} ${formatCount(likeCount)}</span>
                <span>${ICONS.comments || '💬'} ${formatCount(commentCount)}</span>
            </div>
            <div class="loops-video-date">${timeAgo(video.created_at || video.published)}</div>
        </div>
    `;

    // Add click handler to play video
    const thumbnail = card.querySelector('.loops-video-thumbnail');
    thumbnail.addEventListener('click', (e) => {
        e.stopPropagation();
        if (videoUrl) {
            showLoopsVideoModal(videoUrl, video);
        } else {
            showToast('Video URL not available', 'error');
        }
    });

    return card;
}

/**
 * Show video in a modal player
 */
function showLoopsVideoModal(videoUrl, videoData) {
    // Check if modal already exists
    let modal = document.getElementById('loops-video-modal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'loops-video-modal';
        modal.className = 'modal-overlay';
        modal.innerHTML = `
            <div class="loops-video-modal-content">
                <button class="close-video-btn">&times;</button>
                <video id="loops-video-player" controls autoplay></video>
                <div class="loops-video-details">
                    <p class="loops-video-modal-caption"></p>
                    <div class="loops-video-modal-stats"></div>
                </div>
            </div>
        `;
        document.body.appendChild(modal);

        // Close modal handlers
        const closeBtn = modal.querySelector('.close-video-btn');
        closeBtn.addEventListener('click', () => {
            const video = modal.querySelector('#loops-video-player');
            video.pause();
            video.src = '';
            modal.classList.remove('visible');
        });

        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                const video = modal.querySelector('#loops-video-player');
                video.pause();
                video.src = '';
                modal.classList.remove('visible');
            }
        });
    }

    // Update video content
    const video = modal.querySelector('#loops-video-player');
    const caption = modal.querySelector('.loops-video-modal-caption');
    const stats = modal.querySelector('.loops-video-modal-stats');

    video.src = videoUrl;
    caption.textContent = videoData.caption || videoData.description || '';
    stats.innerHTML = `
        <span>${ICONS.view || '👁'} ${formatCount(videoData.views_count || 0)} views</span>
        <span>${ICONS.favorite || '❤'} ${formatCount(videoData.likes_count || 0)} likes</span>
    `;

    modal.classList.add('visible');
}

/**
 * Render the Loops profile page
 */
export async function renderLoopsProfilePage(state, actions, username, instance = 'loops.video') {
    const view = document.getElementById('profile-page-view');
    
    // Show loading state
    view.innerHTML = `
        <div class="profile-page-header">
            <div class="profile-card">
                <div class="loading-spinner">Loading Loops profile...</div>
            </div>
        </div>
    `;

    try {
        const loopsData = await getLoopsProfile(username, instance);
        
        if (!loopsData || !loopsData.profile) {
            throw new Error('Could not load Loops profile');
        }

        const profile = loopsData.profile;
        const videos = loopsData.videos;

        view.innerHTML = `
            <div class="profile-page-header">
                <div class="profile-card loops-profile-card">
                    <div class="profile-header">
                        <img class="banner" src="${profile.banner || ''}" alt="Profile banner" onerror="this.onerror=null;this.src='./images/404.png';">
                        <img class="avatar" src="${profile.avatar || './images/php.png'}" alt="${profile.username}'s avatar" onerror="this.onerror=null;this.src='./images/php.png';">
                    </div>
                    <div class="profile-actions">
                        ${profile.url ? `<a href="${profile.url}" target="_blank" class="button">View on Loops</a>` : ''}
                    </div>
                    <div class="profile-info">
                        <h2 class="display-name">${profile.display_name || profile.username}</h2>
                        <p class="acct">@${profile.username}@${instance} <span class="platform-badge loops">Loops</span></p>
                        <div class="note">${profile.bio || ''}</div>
                        <div class="stats">
                            <span><strong>${formatCount(profile.videos_count || 0)}</strong> Videos</span>
                            <span><strong>${formatCount(profile.followers_count || 0)}</strong> Followers</span>
                            <span><strong>${formatCount(profile.following_count || 0)}</strong> Following</span>
                        </div>
                    </div>
                </div>
                <div class="loops-videos-header">
                    <h3>Videos</h3>
                    <div class="loops-sort-options">
                        <select id="loops-sort-select">
                            <option value="recent">Most Recent</option>
                            <option value="popular">Most Popular</option>
                            <option value="viewed">Most Viewed</option>
                        </select>
                    </div>
                </div>
            </div>
            <div class="loops-videos-grid"></div>
        `;

        const videosGrid = view.querySelector('.loops-videos-grid');
        
        if (videos && videos.length > 0) {
            videos.forEach(video => {
                videosGrid.appendChild(renderLoopsVideo(video, actions));
            });
        } else {
            videosGrid.innerHTML = '<p class="empty-message">No videos found or this profile is private.</p>';
        }

        // Add sort functionality
        const sortSelect = view.querySelector('#loops-sort-select');
        if (sortSelect) {
            sortSelect.addEventListener('change', () => {
                // Re-sort videos based on selection
                const sortedVideos = sortVideos(videos, sortSelect.value);
                videosGrid.innerHTML = '';
                sortedVideos.forEach(video => {
                    videosGrid.appendChild(renderLoopsVideo(video, actions));
                });
            });
        }

    } catch (error) {
        console.error('Failed to render Loops profile:', error);
        view.innerHTML = `
            <div class="error-container">
                <h3>Could not load Loops profile</h3>
                <p>${error.message}</p>
                <p>Loops profiles may require authentication or the instance may not have a public API.</p>
                <button onclick="window.history.back()" class="button-secondary">Go Back</button>
            </div>
        `;
    }
}

// Helper functions
function formatDuration(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function formatCount(count) {
    if (count >= 1000000) {
        return (count / 1000000).toFixed(1) + 'M';
    } else if (count >= 1000) {
        return (count / 1000).toFixed(1) + 'K';
    }
    return count.toString();
}

function sortVideos(videos, sortBy) {
    const sorted = [...videos];
    switch (sortBy) {
        case 'popular':
            return sorted.sort((a, b) => (b.likes_count || 0) - (a.likes_count || 0));
        case 'viewed':
            return sorted.sort((a, b) => (b.views_count || 0) - (a.views_count || 0));
        case 'recent':
        default:
            return sorted.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    }
}
