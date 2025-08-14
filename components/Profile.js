import { ICONS } from './icons.js';
import { apiFetch, lemmyImageUpload } from './api.js';
import { renderStatus } from './Post.js';
import { renderLemmyCard } from './Lemmy.js';
import { timeAgo, formatTimestamp } from './utils.js';
import { showToast } from './ui.js';
import { renderLemmyComment as renderBaseLemmyComment } from './LemmyPost.js';

// --- Helper Functions to Fetch Profile Data ---
async function getMastodonProfile(state, accountId) {
    if (!state.instanceUrl || !state.accessToken || !accountId) {
        return null;
    }
    try {
        const [account, statuses] = await Promise.all([
            apiFetch(state.instanceUrl, state.accessToken, `/api/v1/accounts/${accountId}`),
            apiFetch(state.instanceUrl, state.accessToken, `/api/v1/accounts/${accountId}/statuses`)
        ]);
        return { account: account.data, statuses: statuses.data };
    } catch (error) {
        console.error("Failed to fetch Mastodon profile:", error);
        return null;
    }
}

async function getLemmyProfile(userAcct, page = 1) {
    // NEW FIX: Handle case where only username is provided (for logged-in user)
    if (!userAcct.includes('@')) {
        const localInstance = localStorage.getItem('lemmy_instance');
        if (localInstance) {
            userAcct = `${userAcct}@${localInstance}`;
            console.log(`No instance provided, using local: ${userAcct}`);
        } else {
            console.error('No instance found for username:', userAcct);
            return null;
        }
    }
    
    // Parse the user account to get username and instance
    const parts = userAcct.split('@');
    if (parts.length < 2) {
        console.error('Invalid user account format:', userAcct);
        return null;
    }
    
    const [username, userInstance] = parts;
    
    // IMPORTANT: Use the user's home instance, not our logged-in instance
    let targetInstance = userInstance;
    let response = null;
    
    try {
        // First, try to fetch from the user's actual instance
        console.log(`Fetching profile for ${username} from their home instance: ${targetInstance}`);
        
        // Use the correct instance URL - add https:// if not present
        const instanceUrl = targetInstance.startsWith('http') ? targetInstance : `https://${targetInstance}`;
        const apiUrl = `${instanceUrl}/api/v3/user?username=${username}&sort=New&limit=50&page=${page}`;
        
        console.log(`API URL: ${apiUrl}`);
        
        // Fetch directly without using apiFetch since we're querying a different instance
        const fetchResponse = await fetch(apiUrl);
        
        if (!fetchResponse.ok) {
            throw new Error(`HTTP ${fetchResponse.status}`);
        }
        
        response = await fetchResponse.json();
        console.log(`Successfully fetched profile from ${targetInstance}`);
        return response;
        
    } catch (error) {
        console.log(`Failed to fetch from user's home instance ${targetInstance}:`, error.message);
        
        // Fallback: Try to fetch from our logged-in instance (might have federated data)
        const localInstance = localStorage.getItem('lemmy_instance');
        if (localInstance && localInstance !== targetInstance) {
            try {
                console.log(`Trying fallback: fetching ${username}@${userInstance} from local instance: ${localInstance}`);
                
                // When fetching from local instance, use the full username@instance format
                const fallbackUrl = `https://${localInstance}/api/v3/user?username=${username}@${userInstance}&sort=New&limit=50&page=${page}`;
                console.log(`Fallback URL: ${fallbackUrl}`);
                
                const fallbackResponse = await fetch(fallbackUrl);
                
                if (!fallbackResponse.ok) {
                    throw new Error(`Fallback HTTP ${fallbackResponse.status}`);
                }
                
                response = await fallbackResponse.json();
                console.log(`Successfully fetched federated profile from local instance ${localInstance}`);
                return response;
                
            } catch (fallbackError) {
                console.log(`Fallback also failed:`, fallbackError.message);
            }
        }
        
        // If both attempts fail, return null
        console.error(`Failed to fetch Lemmy profile for ${userAcct} from any instance`);
        return null;
    }
}

function renderLemmyCommentOnProfile(commentView, state, actions) {
    // Use the base renderer to create the main card
    const commentCard = renderBaseLemmyComment(commentView, state, actions);

    // Truncate post title to 4 words
    const postTitle = commentView.post.name;
    const truncatedTitle = postTitle.split(' ').slice(0, 4).join(' ') + (postTitle.split(' ').length > 4 ? '...' : '');

    // Create the context bar HTML
    const contextHTML = `
        <div class="comment-context">
            <span>Commented on:</span>
            <a href="#" class="post-link">${truncatedTitle}</a>
            <span>in</span>
            <a href="#" class="community-link">${commentView.community.name}</a>
        </div>
    `;
    
    // Prepend the context bar to the comment's body
    const contentDiv = commentCard.querySelector('.status-body');
    if (contentDiv) {
        contentDiv.insertAdjacentHTML('afterbegin', contextHTML);
    }
    commentCard.classList.add('lemmy-comment-on-profile');

    // Add event listeners for the new links
    const postLink = commentCard.querySelector('.post-link');
    if (postLink) {
        postLink.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            actions.showLemmyPostDetail(commentView);
        });
    }

    const communityLink = commentCard.querySelector('.community-link');
    if (communityLink) {
        communityLink.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            actions.showLemmyCommunity(commentView.community.name);
        });
    }
    
    // Add double-click event listener to navigate to the post
    commentCard.addEventListener('dblclick', () => {
        actions.showLemmyPostDetail(commentView);
    });

    return commentCard;
}


export async function loadMoreLemmyProfile(state, actions) {
    if (state.isLoadingMore || !state.lemmyProfileHasMore) return;
    state.isLoadingMore = true;
    state.scrollLoader.style.display = 'block';

    state.lemmyProfilePage++;
    const newContent = await getLemmyProfile(state.currentProfileUserAcct, state.lemmyProfilePage);
    
    const profileFeed = document.querySelector('#profile-page-view .profile-feed-content');

    if (newContent) {
        const currentFilter = document.querySelector('#lemmy-profile-controls .dropdown-label').textContent.toLowerCase();
        const itemsToRender = currentFilter === 'comments' ? newContent.comments : newContent.posts;

        if (itemsToRender && itemsToRender.length > 0) {
            itemsToRender.forEach(item => {
                if (currentFilter === 'comments') {
                    profileFeed.appendChild(renderLemmyCommentOnProfile(item, state, actions));
                } else {
                    profileFeed.appendChild(renderLemmyCard(item, actions));
                }
            });
        } else {
            state.lemmyProfileHasMore = false;
        }
    } else {
        state.lemmyProfileHasMore = false;
    }

    state.isLoadingMore = false;
    state.scrollLoader.style.display = 'none';
}


// --- Main Page Rendering ---
export async function renderProfilePage(state, actions, platform, accountId, userAcct) {
    state.currentProfileUserAcct = userAcct;
    const view = document.getElementById('profile-page-view');
    view.innerHTML = `
        <div class="profile-page-header">
            <div class="profile-card">
                <div class="profile-header">
                    <img class="banner" src="" alt="Profile banner" onerror="this.onerror=null;this.src='images/404.png';">
                    <label class="edit-icon banner-edit-icon" style="display:none;">${ICONS.edit}<input type="file" class="edit-image-input" data-type="banner" accept="image/*"></label>
                    
                    <img class="avatar" src="" alt="Profile avatar" onerror="this.onerror=null;this.src='images/pfp.png';">
                    <label class="edit-icon avatar-edit-icon" style="display:none;">${ICONS.edit}<input type="file" class="edit-image-input" data-type="avatar" accept="image/*"></label>
                </div>
                <div class="profile-actions">
                         <button class="button edit-profile-btn" style="display:none;">Edit Profile</button>
                </div>
                <div class="profile-info">
                    <h2 class="display-name">Loading...</h2>
                    <p class="acct"></p>
                    <div class="note"></div>
                    <div class="bio-edit-container" style="display:none;">
                        <textarea class="bio-textarea"></textarea>
                        <div class="bio-edit-actions">
                            <button class="button-secondary cancel-bio-btn">Cancel</button>
                            <button class="button-primary save-bio-btn">Save</button>
                        </div>
                    </div>
                    <div class="stats"></div>
                </div>
            </div>
            <div class="profile-tabs">
                <button class="tab-button" data-tab="lemmy">Lemmy</button>
                <button class="tab-button" data-tab="mastodon">Mastodon</button>
            </div>
            <div id="lemmy-profile-controls" style="display: none;">
                <div class="custom-dropdown" style="position: relative;">
                    <button class="dropdown-toggle" style="background: transparent; border: 1px solid var(--border); color: var(--text-color); padding: 8px 12px; border-radius: 5px; cursor: pointer; display: flex; align-items: center; justify-content: space-between; min-width: 110px;">
                        <span class="dropdown-label">Comments</span>
                        <span class="icon" style="margin-left: 8px; display: inline-flex;">${ICONS.lemmyDownvote}</span>
                    </button>
                    <div class="dropdown-menu" style="display: none; position: absolute; top: 100%; left: 0; background: var(--bg-color, white); border: 1px solid var(--border); border-radius: 5px; z-index: 10; box-shadow: 0 4px 6px rgba(0,0,0,0.1); margin-top: 4px; width: 100%;">
                        <a href="#" data-value="comments" style="display: block; padding: 8px 12px; color: var(--text-color); text-decoration: none; white-space: nowrap;">Comments</a>
                        <a href="#" data-value="posts" style="display: block; padding: 8px 12px; color: var(--text-color); text-decoration: none; white-space: nowrap;">Posts</a>
                    </div>
                </div>
            </div>
        </div>
        <div class="profile-feed-content"></div>
    `;

    const bannerImg = view.querySelector('.banner');
    const avatarImg = view.querySelector('.avatar');
    const displayNameEl = view.querySelector('.display-name');
    const acctEl = view.querySelector('.acct');
    const noteEl = view.querySelector('.note');
    const statsEl = view.querySelector('.stats');
    const feedContainer = view.querySelector('.profile-feed-content');
    const lemmyControls = view.querySelector('#lemmy-profile-controls');

    let currentLemmyProfile = null;

    const renderLemmyFeed = (filter) => {
        feedContainer.innerHTML = '';
        if (!currentLemmyProfile) return;

        const itemsToRender = filter === 'comments' ? currentLemmyProfile.comments : currentLemmyProfile.posts;
        const emptyMessage = filter === 'comments' ? 'No comments to display.' : 'No posts to display.';

        if (itemsToRender && itemsToRender.length > 0) {
            itemsToRender.forEach(item => {
                if (filter === 'comments') {
                    feedContainer.appendChild(renderLemmyCommentOnProfile(item, state, actions));
                } else {
                    feedContainer.appendChild(renderLemmyCard(item, actions));
                }
            });
        } else {
            feedContainer.innerHTML = `<p class="empty-feed-message">${emptyMessage}</p>`;
        }
    };

    const dropdown = lemmyControls.querySelector('.custom-dropdown');
    const toggleBtn = dropdown.querySelector('.dropdown-toggle');
    const dropdownLabel = dropdown.querySelector('.dropdown-label');
    const dropdownMenu = dropdown.querySelector('.dropdown-menu');

    toggleBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        dropdownMenu.style.display = dropdownMenu.style.display === 'block' ? 'none' : 'block';
    });

    document.addEventListener('click', (e) => {
        if (!dropdown.contains(e.target)) {
            dropdownMenu.style.display = 'none';
        }
    });

    dropdownMenu.querySelectorAll('a').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const newValue = e.target.dataset.value;
            dropdownLabel.textContent = newValue.charAt(0).toUpperCase() + newValue.slice(1);
            renderLemmyFeed(newValue);
            dropdownMenu.style.display = 'none';
        });
    });

    const switchTab = async (targetTab) => {
        state.currentProfileTab = targetTab;
        view.querySelectorAll('.tab-button').forEach(b => b.classList.remove('active'));
        view.querySelector(`[data-tab="${targetTab}"]`).classList.add('active');
        feedContainer.innerHTML = 'Loading feed...';
        lemmyControls.style.display = 'none';

        if (targetTab === 'mastodon') {
            const mastodonProfile = await getMastodonProfile(state, accountId);
            if (mastodonProfile) {
                const account = mastodonProfile.account;
                bannerImg.src = account.header_static || 'images/404.png';
                avatarImg.src = account.avatar_static || 'images/php.png';
                displayNameEl.textContent = account.display_name;
                acctEl.textContent = `@${account.acct}`;
                noteEl.innerHTML = account.note;
                statsEl.innerHTML = `<span><strong>${account.followers_count}</strong> Followers</span><span><strong>${account.following_count}</strong> Following</span>`;

                feedContainer.innerHTML = '';
                mastodonProfile.statuses.forEach(status => {
                    feedContainer.appendChild(renderStatus(status, state.currentUser, actions, state.settings));
                });
            } else {
                feedContainer.innerHTML = '<p>Could not load Mastodon feed.</p>';
            }
        } else if (targetTab === 'lemmy') {
            state.lemmyProfilePage = 1;
            state.lemmyProfileHasMore = true;
            currentLemmyProfile = await getLemmyProfile(userAcct, state.lemmyProfilePage);
            
            if (currentLemmyProfile) {
                const person = currentLemmyProfile.person_view.person;
                const counts = currentLemmyProfile.person_view.counts;
                
                bannerImg.src = person.banner || 'images/404.png';
                avatarImg.src = person.avatar || 'images/php.png';
                displayNameEl.textContent = person.display_name || person.name;
                acctEl.textContent = `@${person.name}@${new URL(person.actor_id).hostname}`;
                noteEl.innerHTML = new showdown.Converter().makeHtml(person.bio || '');
                statsEl.innerHTML = `<span><strong>${counts.post_count}</strong> Posts</span><span><strong>${counts.comment_count}</strong> Comments</span>`;

                lemmyControls.style.display = 'flex';
                dropdownLabel.textContent = 'Comments'; 
                renderLemmyFeed('comments');

                if (state.lemmyUsername && person.name === state.lemmyUsername) {
                    setupLemmyProfileEditing(person, actions);
                }
            } else {
                feedContainer.innerHTML = '<p>Could not load Lemmy profile. This user might be from an instance that doesn\'t allow external API access.</p>';
            }
        }
    };

    view.querySelectorAll('.tab-button').forEach(button => {
        button.addEventListener('click', () => switchTab(button.dataset.tab));
    });
    
    await switchTab(platform === 'mastodon' ? 'mastodon' : 'lemmy');
}

function setupLemmyProfileEditing(person, actions) {
    const editProfileBtn = document.querySelector('.edit-profile-btn');
    const profileCard = document.querySelector('.profile-card');
    const noteEl = document.querySelector('.note');
    const bioEditContainer = document.querySelector('.bio-edit-container');
    const bioTextarea = document.querySelector('.bio-textarea');
    const saveBioBtn = document.querySelector('.save-bio-btn');
    const cancelBioBtn = document.querySelector('.cancel-bio-btn');
    const bannerEditIcon = document.querySelector('.banner-edit-icon');
    const avatarEditIcon = document.querySelector('.avatar-edit-icon');
    
    let newAvatarFile = null;
    let newBannerFile = null;

    editProfileBtn.style.display = 'block';

    editProfileBtn.addEventListener('click', (e) => {
        e.preventDefault();
        profileCard.classList.toggle('edit-mode');
        const isEditing = profileCard.classList.contains('edit-mode');

        if (isEditing) {
            editProfileBtn.textContent = 'Finish Editing';
            noteEl.style.display = 'none';
            bioEditContainer.style.display = 'block';
            bioTextarea.value = person.bio || '';
            bannerEditIcon.style.display = 'flex';
            avatarEditIcon.style.display = 'flex';
        } else {
            editProfileBtn.textContent = 'Edit Profile';
            noteEl.style.display = 'block';
            bioEditContainer.style.display = 'none';
            bannerEditIcon.style.display = 'none';
            avatarEditIcon.style.display = 'none';
        }
    });

    cancelBioBtn.addEventListener('click', () => {
        profileCard.classList.remove('edit-mode');
        editProfileBtn.textContent = 'Edit Profile';
        noteEl.style.display = 'block';
        bioEditContainer.style.display = 'none';
        bannerEditIcon.style.display = 'none';
        avatarEditIcon.style.display = 'none';
    });

    saveBioBtn.addEventListener('click', async () => {
        const newBio = bioTextarea.value;
        await actions.saveLemmyProfile({
            bio: newBio,
            avatar: newAvatarFile,
            banner: newBannerFile
        });
        newAvatarFile = null;
        newBannerFile = null;
    });

    document.querySelectorAll('.edit-image-input').forEach(input => {
        input.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (!file) return;

            const type = e.target.dataset.type;
            if (type === 'avatar') {
                newAvatarFile = file;
                document.querySelector('.avatar').src = URL.createObjectURL(file);
            } else if (type === 'banner') {
                newBannerFile = file;
                document.querySelector('.banner').src = URL.createObjectURL(file);
            }
        });
    });
}


export function renderEditProfilePage(state, actions) {
    const view = document.getElementById('edit-profile-view');
    view.innerHTML = `
        <div class="edit-profile-container">
            <h2>Edit Profile</h2>
            <p>This feature is not yet implemented.</p>
        </div>
    `;
}
