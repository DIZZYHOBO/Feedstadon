import { apiFetch, apiUpdateCredentials } from './api.js';
import { renderStatus } from './Post.js';
import { renderLemmyCard } from './Lemmy.js';
import { ICONS } from './icons.js';

async function renderMastodonProfile(state, actions, container, accountId) {
    container.innerHTML = ``;

    try {
        const idToFetch = accountId || state.currentUser?.id;
        if (!idToFetch) {
            container.innerHTML = `<p>Could not find Mastodon user ID.</p>`;
            return;
        }
        
        const { data: account } = await apiFetch(state.instanceUrl, state.accessToken, `/api/v1/accounts/${idToFetch}`);
        const { data: statuses } = await apiFetch(state.instanceUrl, state.accessToken, `/api/v1/accounts/${idToFetch}/statuses`);

        const isOwnProfile = account.id === state.currentUser?.id;
        const editButtonHTML = isOwnProfile ? `<button class="button-secondary" id="edit-profile-btn">${ICONS.edit} Edit Profile</button>` : '';

        const banner = account.header_static || '';
        const displayName = account.display_name;
        const username = account.username;
        const avatar = account.avatar_static;
        const note = account.note;
        const followers = account.followers_count;
        const following = account.following_count;

        container.innerHTML = `
            <div class="profile-card">
                <div class="profile-header">
                    <img class="banner" src="${banner}" alt="${displayName}'s banner" onerror="this.style.display='none'">
                    <img class="avatar" src="${avatar}" alt="${displayName}'s avatar" onerror="this.src='./images/logo.png'">
                </div>
                <div class="profile-actions">
                    ${editButtonHTML}
                    <button class="follow-btn">Follow</button>
                    <button class="block-btn">Block</button>
                </div>
                <div class="profile-info">
                    <h2 class="display-name">${displayName}</h2>
                    <p class="acct">@${username}</p>
                    <div class="note">${note}</div>
                    <div class="stats">
                        <span><strong>${following}</strong> Following</span>
                        <span><strong>${followers}</strong> Followers</span>
                    </div>
                </div>
            </div>
            <div class="profile-feed"></div>
        `;

        const feed = container.querySelector('.profile-feed');
        if (statuses.length === 0) {
            feed.innerHTML = '<p>No posts yet.</p>';
        } else {
            statuses.forEach(status => {
                feed.appendChild(renderStatus(status, state.currentUser, actions, state.settings));
            });
        }
        
        if (isOwnProfile) {
            container.querySelector('#edit-profile-btn').addEventListener('click', () => {
                actions.showEditProfile();
            });
        }

    } catch (error) {
        container.innerHTML = `<p>Error loading Mastodon profile: ${error.message}</p>`;
    }
}

export async function loadMoreLemmyProfile(state, actions) {
    await renderLemmyProfile(state, actions, null, null, true);
}

async function renderLemmyProfile(state, actions, container, userAcct, loadMore = false) {
    if (state.isLoadingMore) return;
    
    let username, instance;

    if (userAcct) { // Initial load for a specific profile
        [username, instance] = userAcct.split('@');
        state.currentLemmyProfileUser = { username, instance };
    } else if (loadMore && state.currentLemmyProfileUser) { // Infinite scroll
        username = state.currentLemmyProfileUser.username;
        instance = state.currentLemmyProfileUser.instance;
    } else if (!loadMore) { // Initial load for the logged-in user's own profile
        username = localStorage.getItem('lemmy_username');
        instance = localStorage.getItem('lemmy_instance');
        if (username && instance) {
            state.currentLemmyProfileUser = { username, instance };
        }
    } else {
        console.error("Cannot load more profile content without a user context.");
        return; // Safeguard against errors
    }
    
    if (!username || !instance) {
        if (!loadMore) container.innerHTML = `<p>Lemmy user not found or not logged in.</p>`;
        return;
    }
    
    state.isLoadingMore = true;
    const feedContainer = document.querySelector('#lemmy-profile-content .profile-feed');
    
    try {
        const { data: userData } = await apiFetch(instance, null, `/api/v3/user`, {}, 'lemmy', { 
            username: username, 
            limit: 15,
            page: loadMore ? state.lemmyProfilePage : 1,
            sort: 'New'
        });
        const { person_view, posts, comments } = userData;

        if (!loadMore) {
            container.innerHTML = `
                <div class="profile-card">
                     <div class="profile-header">
                        <img class="banner" src="${person_view.person.banner || ''}" alt="${person_view.person.display_name || person_view.person.name}'s banner" onerror="this.style.display='none'">
                        <img class="avatar" src="${person_view.person.avatar || './images/logo.png'}" alt="${person_view.person.display_name || person_view.person.name}'s avatar" onerror="this.src='./images/logo.png'">
                    </div>
                     <div class="profile-actions">
                        <button class="button-secondary" id="lemmy-follow-btn">Follow</button>
                        <button class="button-danger" id="lemmy-block-btn">Block</button>
                    </div>
                    <div class="profile-info">
                        <h2 class="display-name">${person_view.person.display_name || person_view.person.name}</h2>
                        <p class="acct">@${person_view.person.name}@${instance}</p>
                        <div class="note">${person_view.person.bio || ''}</div>
                    </div>
                </div>
                <div class="profile-feed"></div>
            `;
            
            container.querySelector('#lemmy-follow-btn').addEventListener('click', () => {
                alert('Following users is not a standard feature on all Lemmy instances.');
            });
            
            container.querySelector('#lemmy-block-btn').addEventListener('click', () => {
                if (confirm(`Are you sure you want to block ${person_view.person.name}?`)) {
                    actions.lemmyBlockUser(person_view.person.id, true);
                }
            });
        }

        const feed = container ? container.querySelector('.profile-feed') : feedContainer;
        const combinedFeed = [
            ...posts.map(p => ({ ...p, type: 'post', date: p.post.published })),
            ...comments.map(c => ({ ...c, type: 'comment', date: c.comment.published }))
        ].sort((a, b) => new Date(b.date) - new Date(a.date));

        if (combinedFeed.length === 0) {
            if (!loadMore) feed.innerHTML = '<p>No activity yet.</p>';
            state.lemmyProfileHasMore = false;
        } else {
            combinedFeed.forEach(item => {
                if (item.type === 'post') {
                    feed.appendChild(renderLemmyCard(item, actions));
                } else {
                    const commentCard = document.createElement('div');
                    commentCard.className = 'status lemmy-comment-on-profile';
                    
                    commentCard.innerHTML = `
                        <div class="status-body-content">
                            <div class="comment-context">
                                <span class="display-name">${item.creator.name}</span> commented on:
                            </div>
                            <h4 class="post-title">${item.post.name}</h4>
                            <div class="status-content">${item.comment.content}</div>
                            <div class="status-footer">
                                <div class="lemmy-vote-cluster">
                                    <button class="status-action lemmy-vote-btn" data-action="upvote" data-score="1">${ICONS.lemmyUpvote}</button>
                                    <span class="lemmy-score">${item.counts.score}</span>
                                    <button class="status-action lemmy-vote-btn" data-action="downvote" data-score="-1">${ICONS.lemmyDownvote}</button>
                                </div>
                                <button class="status-action screenshot-btn">${ICONS.screenshot}</button>
                            </div>
                        </div>`;

                    commentCard.addEventListener('click', () => actions.showLemmyPostDetail(item));
                    
                    commentCard.querySelectorAll('.lemmy-vote-btn').forEach(button => {
                        button.addEventListener('click', (e) => {
                            e.stopPropagation();
                            const score = parseInt(e.currentTarget.dataset.score, 10);
                            actions.lemmyCommentVote(item.comment.id, score, commentCard);
                        });
                    });
                    
                    commentCard.querySelector('.screenshot-btn').addEventListener('click', (e) => {
                        e.stopPropagation();
                        actions.showScreenshotPage(item, item); 
                    });

                    feed.appendChild(commentCard);
                }
            });
            state.lemmyProfilePage++;
            state.lemmyProfileHasMore = true;
        }

    } catch (error) {
        console.error("Failed to load Lemmy profile:", error);
        if (!loadMore) container.innerHTML = `<p>Error loading Lemmy profile: ${error.message}</p>`;
    } finally {
        state.isLoadingMore = false;
    }
}

export function renderProfilePage(state, actions, platform, accountId, userAcct) {
    const view = document.getElementById('profile-page-view');
    const tabs = view.querySelectorAll('.profile-tabs .tab-button');
    const mastodonContent = view.querySelector('#mastodon-profile-content');
    const lemmyContent = view.querySelector('#lemmy-profile-content');
    
    function switchTab(targetPlatform) {
        tabs.forEach(t => t.classList.remove('active'));
        mastodonContent.classList.remove('active');
        lemmyContent.classList.remove('active');
        state.currentProfileTab = targetPlatform;
        
        const activeTab = view.querySelector(`.tab-button[data-profile-tab="${targetPlatform}"]`);
        if (activeTab) {
            activeTab.classList.add('active');
        }

        if (targetPlatform === 'mastodon') {
            mastodonContent.classList.add('active');
            if (state.currentUser) {
                renderMastodonProfile(state, actions, mastodonContent, accountId);
            } else {
                mastodonContent.innerHTML = `<p>Not logged into Mastodon.</p>`;
            }
        } else if (targetPlatform === 'lemmy') {
            lemmyContent.classList.add('active');
            state.lemmyProfilePage = 1;
            state.lemmyProfileHasMore = true;
            renderLemmyProfile(state, actions, lemmyContent, userAcct);
        }
    }

    tabs.forEach(tab => {
        tab.addEventListener('click', (e) => {
            const targetPlatform = e.target.dataset.profileTab;
            switchTab(targetPlatform);
        });
    });

    // Set initial tab
    switchTab(platform);
}

export function renderEditProfilePage(state, actions) {
    const view = document.getElementById('edit-profile-view');
    view.innerHTML = '';
    
    if (!state.currentUser) {
        view.innerHTML = `<p>You must be logged in to edit your profile.</p>`;
        return;
    }
    
    const container = document.createElement('div');
    container.className = 'edit-profile-container';
    
    container.innerHTML = `
        <div class="edit-profile-header">
            <h2>Edit Mastodon Profile</h2>
            <button class="button-secondary" id="cancel-edit-profile-btn">Cancel</button>
        </div>
        <form id="edit-profile-form">
            <div class="profile-image-previews">
                <img id="avatar-preview" src="${state.currentUser.avatar_static}" alt="Avatar preview">
                <img id="header-preview" src="${state.currentUser.header_static}" alt="Header preview">
            </div>
            <div class="form-group">
                <label for="avatar-upload">Upload new avatar</label>
                <input type="file" id="avatar-upload" name="avatar" accept="image/*">
            </div>
            <div class="form-group">
                <label for="header-upload">Upload new header</label>
                <input type="file" id="header-upload" name="header" accept="image/*">
            </div>
            <div class="form-group">
                <label for="display-name">Display Name</label>
                <input type="text" id="display-name" name="display_name" value="${state.currentUser.display_name}">
            </div>
            <div class="form-group">
                <label for="bio">Bio</label>
                <textarea id="bio" name="note" rows="4">${state.currentUser.note}</textarea>
            </div>
            <button type="submit" class="button-primary">Save Changes</button>
        </form>
    `;
    
    view.appendChild(container);
    
    const form = view.querySelector('#edit-profile-form');
    const avatarInput = view.querySelector('#avatar-upload');
    const headerInput = view.querySelector('#header-upload');
    const avatarPreview = view.querySelector('#avatar-preview');
    const headerPreview = view.querySelector('#header-preview');
    
    avatarInput.addEventListener('change', () => {
        if (avatarInput.files[0]) {
            avatarPreview.src = URL.createObjectURL(avatarInput.files[0]);
        }
    });
    
    headerInput.addEventListener('change', () => {
        if (headerInput.files[0]) {
            headerPreview.src = URL.createObjectURL(headerInput.files[0]);
        }
    });

    view.querySelector('#cancel-edit-profile-btn').addEventListener('click', () => {
        actions.showProfilePage('mastodon');
    });

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const saveButton = form.querySelector('button[type="submit"]');
        saveButton.disabled = true;
        saveButton.textContent = 'Saving...';

        try {
            const formData = new FormData(e.target);
            await apiUpdateCredentials(state, formData);
            alert("Profile updated successfully!");
            // Refresh the user state after update
            const { data: account } = await apiFetch(state.instanceUrl, state.accessToken, '/api/v1/accounts/verify_credentials');
            state.currentUser = account;
            actions.showProfilePage('mastodon');
        } catch (error) {
            console.error("Failed to update profile", error);
            alert("Failed to update profile.");
        } finally {
            saveButton.disabled = false;
            saveButton.textContent = 'Save Changes';
        }
    });
}
