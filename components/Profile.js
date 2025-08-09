import { ICONS } from './icons.js';
import { apiFetch } from './api.js';
import { renderStatus } from './Post.js';
import { renderLemmyCard } from './Lemmy.js';
import { timeAgo } from './utils.js';
import { showToast } from './ui.js';

async function fetchLemmyProfile(state, actions, userAcct) {
    const lemmyInstance = localStorage.getItem('lemmy_instance');
    if (!lemmyInstance) return null;

    try {
        const response = await apiFetch(lemmyInstance, null, `/api/v3/user?username=${userAcct}`, { method: 'GET' }, 'lemmy');
        return response.data;
    } catch (error) {
        console.error(`Failed to fetch Lemmy profile for ${userAcct}:`, error);
        return null;
    }
}

async function fetchLemmyProfileContent(state, actions, userId, page = 1) {
    const lemmyInstance = localStorage.getItem('lemmy_instance');
    if (!lemmyInstance) return [];

    try {
        const response = await apiFetch(lemmyInstance, null, `/api/v3/user?person_id=${userId}&page=${page}&limit=20&sort=New`, { method: 'GET' }, 'lemmy');
        return response.data;
    } catch (error) {
        console.error('Failed to fetch Lemmy profile content:', error);
        return [];
    }
}

function renderLemmyComment(commentView, state, actions) {
    const commentDiv = document.createElement('div');
    commentDiv.className = 'status lemmy-comment-on-profile';
    const converter = new showdown.Converter();
    const htmlContent = converter.makeHtml(commentView.comment.content);

    commentDiv.innerHTML = `
        <div class="status-body-content">
            <div class="comment-context">
                <span>Commented on:</span>
                <a href="#" class="post-title">${commentView.post.name}</a>
                <span>in</span>
                <a href="#" class="community-link">${commentView.community.name}</a>
            </div>
            <div class="status-content">${htmlContent}</div>
            <div class="status-footer">
                <div class="lemmy-vote-cluster">
                    <button class="status-action lemmy-vote-btn" data-action="upvote">${ICONS.lemmyUpvote}</button>
                    <span class="lemmy-score">${commentView.counts.score}</span>
                    <button class="status-action lemmy-vote-btn" data-action="downvote">${ICONS.lemmyDownvote}</button>
                </div>
                <button class="status-action view-replies-btn">
                    ${ICONS.comments}
                    <span class="reply-count">${commentView.counts.child_count}</span>
                </button>
            </div>
            <div class="lemmy-replies-container" style="display: none;"></div>
        </div>
    `;

    const repliesContainer = commentDiv.querySelector('.lemmy-replies-container');
    const viewRepliesBtn = commentDiv.querySelector('.view-replies-btn');

    viewRepliesBtn.addEventListener('click', () => {
        toggleLemmyReplies(commentView.comment.id, repliesContainer, state, actions);
    });

    return commentDiv;
}

async function toggleLemmyReplies(commentId, container, state, actions) {
    const isVisible = container.style.display === 'block';
    if (isVisible) {
        container.style.display = 'none';
        return;
    }

    container.style.display = 'block';
    container.innerHTML = 'Loading replies...';

    const lemmyInstance = localStorage.getItem('lemmy_instance');
    if (!lemmyInstance) {
        container.innerHTML = 'Could not load replies.';
        return;
    }

    try {
        const response = await apiFetch(lemmyInstance, null, `/api/v3/comment?id=${commentId}`, { method: 'GET' }, 'lemmy');
        const replies = response.data.replies;
        container.innerHTML = '';

        if (replies.length === 0) {
            container.innerHTML = 'No replies found.';
            return;
        }

        replies.forEach(reply => {
            container.appendChild(renderLemmyComment(reply.comment_view, state, actions));
        });
    } catch (error) {
        console.error('Failed to fetch replies:', error);
        container.innerHTML = 'Failed to load replies.';
    }
}

export async function loadMoreLemmyProfile(state, actions) {
    if (state.isLoadingMore || !state.lemmyProfileHasMore) return;
    state.isLoadingMore = true;
    state.scrollLoader.style.display = 'block';

    state.lemmyProfilePage++;
    const lemmyProfile = await fetchLemmyProfile(state, actions, state.currentProfileUserAcct);
    const content = await fetchLemmyProfileContent(state, actions, lemmyProfile.person_view.person.id, state.lemmyProfilePage);
    
    const profileFeed = document.getElementById('lemmy-profile-feed');

    if (content.comments.length > 0) {
        content.comments.forEach(comment => {
            profileFeed.appendChild(renderLemmyComment(comment, state, actions));
        });
    } else {
        state.lemmyProfileHasMore = false;
    }

    state.isLoadingMore = false;
    state.scrollLoader.style.display = 'none';
}

export async function renderProfilePage(state, actions, platform, accountId = null, userAcct = null) {
    const view = document.getElementById('profile-page-view');
    view.innerHTML = ''; // Clear previous content

    if (!accountId && !userAcct) {
        if (platform === 'mastodon' && state.currentUser) {
            accountId = state.currentUser.id;
        } else if (platform === 'lemmy') {
            userAcct = localStorage.getItem('lemmy_username');
        }
    }
    
    state.currentProfileUserAcct = userAcct;

    view.innerHTML = `
        <div class="profile-card">
            <div class="profile-header">
                <img class="banner" src="" alt="Profile banner">
                <img class="avatar" src="" alt="Profile avatar">
            </div>
            <div class="profile-actions"></div>
            <div class="profile-info">
                <h2 class="display-name"></h2>
                <p class="acct"></p>
                <div class="note"></div>
                <div class="stats"></div>
            </div>
        </div>
        <div class="profile-tabs">
            <button class="tab-button active" data-tab="mastodon">Mastodon</button>
            <button class="tab-button" data-tab="lemmy">Lemmy</button>
        </div>
        <div class="profile-tab-content active" id="mastodon-profile-content">
            <div class="profile-feed" id="mastodon-profile-feed"></div>
        </div>
        <div class="profile-tab-content" id="lemmy-profile-content">
            <div class="profile-feed" id="lemmy-profile-feed"></div>
        </div>
    `;

    const bannerImg = view.querySelector('.banner');
    const avatarImg = view.querySelector('.avatar');
    const displayNameEl = view.querySelector('.display-name');
    const acctEl = view.querySelector('.acct');
    const noteEl = view.querySelector('.note');
    const statsEl = view.querySelector('.stats');
    const actionsContainer = view.querySelector('.profile-actions');

    const mastodonTab = view.querySelector('[data-tab="mastodon"]');
    const lemmyTab = view.querySelector('[data-tab="lemmy"]');
    const mastodonContent = view.getElementById('mastodon-profile-content');
    const lemmyContent = view.getElementById('lemmy-profile-content');
    
    const switchTab = (targetTab) => {
        state.currentProfileTab = targetTab;
        mastodonTab.classList.toggle('active', targetTab === 'mastodon');
        lemmyTab.classList.toggle('active', targetTab === 'lemmy');
        mastodonContent.classList.toggle('active', targetTab === 'mastodon');
        lemmyContent.classList.toggle('active', targetTab === 'lemmy');
    };

    mastodonTab.addEventListener('click', () => switchTab('mastodon'));
    lemmyTab.addEventListener('click', () => switchTab('lemmy'));

    if (platform === 'mastodon') {
        switchTab('mastodon');
        const { data: account } = await apiFetch(state.instanceUrl, state.accessToken, `/api/v1/accounts/${accountId}`);
        const { data: statuses } = await apiFetch(state.instanceUrl, state.accessToken, `/api/v1/accounts/${accountId}/statuses`);

        bannerImg.src = account.header;
        avatarImg.src = account.avatar;
        displayNameEl.textContent = account.display_name;
        acctEl.textContent = `@${account.acct}`;
        noteEl.innerHTML = account.note;
        statsEl.innerHTML = `
            <span><strong>${account.statuses_count}</strong> Posts</span>
            <span><strong>${account.followers_count}</strong> Followers</span>
            <span><strong>${account.following_count}</strong> Following</span>
        `;
        
        const profileFeed = view.querySelector('#mastodon-profile-feed');
        statuses.forEach(status => {
            profileFeed.appendChild(renderStatus(status, state.currentUser, actions, state.settings));
        });

        if (state.currentUser && account.id !== state.currentUser.id) {
            const { data: relationship } = await apiFetch(state.instanceUrl, state.accessToken, `/api/v1/accounts/relationships?id[]=${account.id}`);
            const followBtn = document.createElement('button');
            followBtn.textContent = relationship[0].following ? 'Unfollow' : 'Follow';
            followBtn.className = 'button';
            followBtn.addEventListener('click', async () => {
                const success = await actions.mastodonFollow(account.id, !relationship[0].following);
                if (success) {
                    relationship[0].following = !relationship[0].following;
                    followBtn.textContent = relationship[0].following ? 'Unfollow' : 'Follow';
                }
            });
            actionsContainer.appendChild(followBtn);
        } else if (state.currentUser && account.id === state.currentUser.id) {
            const editBtn = document.createElement('button');
            editBtn.textContent = 'Edit Profile';
            editBtn.className = 'button';
            editBtn.addEventListener('click', () => actions.showEditProfile());
            actionsContainer.appendChild(editBtn);
        }

    } else if (platform === 'lemmy') {
        switchTab('lemmy');
        const lemmyProfile = await fetchLemmyProfile(state, actions, userAcct);
        if (lemmyProfile) {
            const personView = lemmyProfile.person_view;
            bannerImg.src = personView.person.banner || '';
            avatarImg.src = personView.person.avatar || '';
            displayNameEl.textContent = personView.person.display_name || personView.person.name;
            acctEl.textContent = `@${personView.person.name}`;
            noteEl.innerHTML = new showdown.Converter().makeHtml(personView.person.bio || '');
            statsEl.innerHTML = `
                <span><strong>${personView.counts.post_count}</strong> Posts</span>
                <span><strong>${personView.counts.comment_count}</strong> Comments</span>
            `;
            
            const content = await fetchLemmyProfileContent(state, actions, personView.person.id);
            const profileFeed = view.querySelector('#lemmy-profile-feed');
            
            if (content.comments) {
                content.comments.forEach(comment => {
                    profileFeed.appendChild(renderLemmyComment(comment, state, actions));
                });
            }
            
            const isOwnProfile = userAcct === localStorage.getItem('lemmy_username');
            if (!isOwnProfile) {
                const blockBtn = document.createElement('button');
                blockBtn.textContent = personView.person.banned ? 'Unblock' : 'Block';
                blockBtn.className = 'button';
                blockBtn.addEventListener('click', () => {
                    actions.lemmyBlockUser(personView.person.id, !personView.person.banned);
                });
                actionsContainer.appendChild(blockBtn);
            }
        } else {
            view.innerHTML = `<p>Could not load Lemmy profile.</p>`;
        }
    }
}

export async function renderEditProfilePage(state, actions) {
    const view = document.getElementById('edit-profile-view');
    view.innerHTML = `
        <div class="edit-profile-container">
            <div class="edit-profile-header">
                <h2>Edit Profile</h2>
                <div>
                    <button class="button-secondary" id="cancel-edit-profile">Cancel</button>
                    <button class="button" id="save-profile-btn">Save</button>
                </div>
            </div>
            <div class="profile-image-previews">
                <div>
                    <label>Avatar</label>
                    <img id="avatar-preview" src="${state.currentUser.avatar}">
                    <input type="file" id="avatar-upload" accept="image/*">
                </div>
                <div>
                    <label>Banner</label>
                    <img id="banner-preview" src="${state.currentUser.header}">
                    <input type="file" id="banner-upload" accept="image/*">
                </div>
            </div>
            <div class="form-group">
                <label for="display-name-input">Display Name</label>
                <input type="text" id="display-name-input" value="${state.currentUser.display_name}">
            </div>
            <div class="form-group">
                <label for="bio-textarea">Bio</label>
                <textarea id="bio-textarea">${state.currentUser.note}</textarea>
            </div>
        </div>
    `;

    const saveBtn = view.querySelector('#save-profile-btn');
    saveBtn.addEventListener('click', async () => {
        const displayName = view.querySelector('#display-name-input').value;
        const bio = view.querySelector('#bio-textarea').value;
        const avatarFile = view.querySelector('#avatar-upload').files[0];
        const bannerFile = view.querySelector('#banner-upload').files[0];

        const formData = new FormData();
        formData.append('display_name', displayName);
        formData.append('note', bio);
        if (avatarFile) formData.append('avatar', avatarFile);
        if (bannerFile) formData.append('header', bannerFile);

        try {
            await apiFetch(state.instanceUrl, state.accessToken, '/api/v1/accounts/update_credentials', {
                method: 'PATCH',
                body: formData,
                isFormData: true
            });
            showToast('Profile updated successfully!');
            actions.showProfilePage('mastodon', state.currentUser.id);
        } catch (error) {
            showToast('Failed to update profile.');
        }
    });
    
    view.querySelector('#cancel-edit-profile').addEventListener('click', () => {
        actions.showProfilePage('mastodon', state.currentUser.id);
    });
}
