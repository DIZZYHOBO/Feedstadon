import { renderStatus } from './Post.js';

export function renderProfile(account, statuses, app) {
    const profileContainer = document.createElement('div');
    profileContainer.className = 'profile-container';

    profileContainer.innerHTML = `
        <div class="profile-header" style="background-image: url('${account.header}');">
            <img src="${account.avatar}" alt="${account.display_name}" class="profile-avatar">
        </div>
        <div class="profile-info">
            <h3>${account.display_name}</h3>
            <p>@${account.acct}</p>
            <div class="profile-bio">${account.note}</div>
            <div class="profile-stats">
                <span><strong>${account.statuses_count}</strong> Posts</span>
                <span><strong>${account.following_count}</strong> Following</span>
                <span><strong>${account.followers_count}</strong> Followers</span>
            </div>
        </div>
        <div class="profile-timeline">
            <h4>Posts</h4>
        </div>
    `;

    const timeline = profileContainer.querySelector('.profile-timeline');
    if (statuses && statuses.length > 0) {
        statuses.forEach(status => {
            timeline.appendChild(renderStatus(status, app.state.currentUser, app));
        });
    } else {
        timeline.innerHTML += '<p>No posts to show.</p>';
    }

    return profileContainer;
}

export function renderLemmyProfile(personData, posts, comments, app) {
    // Lemmy profile rendering logic will go here when implemented
    const profileContainer = document.createElement('div');
    profileContainer.innerHTML = `<p>Lemmy profiles are a work in progress.</p>`;
    return profileContainer;
}
