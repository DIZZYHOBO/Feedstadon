import { apiFetch } from './api.js';

export async function renderSettingsPage(state) {
    const container = document.getElementById('settings-view');
    container.innerHTML = `
        <div class="view-header">Settings</div>
        <div class="settings-container">
            <div class="settings-section">
                <h3>Theme</h3>
                <div class="form-group">
                    <label for="theme-select">Select a theme for the app</label>
                    <select id="theme-select">
                        <option value="feedstodon">Feedstodon (Default)</option>
                        <option value="purple">Purple</option>
                        <option value="tube">Tube</option>
                        <option value="readit">Readit</option>
                        <option value="git">Git</option>
                    </select>
                </div>
            </div>
            
            <div class="settings-section" id="lemmy-auth-section">
                <h3>Lemmy Login</h3>
                <form id="lemmy-login-form" class="lemmy-login-form">
                    <div class="form-group">
                        <label for="lemmy-instance-input">Lemmy Instance</label>
                        <input type="text" id="lemmy-instance-input" placeholder="lemina.space" value="lemina.space">
                    </div>
                    <div class="form-group">
                        <label for="lemmy-username-input">Username</label>
                        <input type="text" id="lemmy-username-input" placeholder="Your Lemmy Username">
                    </div>
                    <div class="form-group">
                        <label for="lemmy-password-input">Password</label>
                        <input type="password" id="lemmy-password-input" placeholder="Your Lemmy Password">
                    </div>
                    <button type="submit" class="settings-save-button">Login to Lemmy</button>
                </form>
            </div>

            <div class="settings-section">
                <h3>Muted Users</h3>
                <ul id="muted-users-list"><p>Loading muted users...</p></ul>
            </div>
        </div>
    `;

    // --- Theme Settings ---
    const themeSelect = container.querySelector('#theme-select');
    themeSelect.value = localStorage.getItem('feedstodon-theme') || 'feedstodon';
    themeSelect.addEventListener('change', () => {
        document.documentElement.dataset.theme = themeSelect.value;
        localStorage.setItem('feedstodon-theme', themeSelect.value);
    });

    // --- Lemmy Login ---
    const lemmyAuthSection = container.querySelector('#lemmy-auth-section');

    const updateLemmyAuthView = () => {
        const jwt = localStorage.getItem('lemmy_jwt');
        const username = localStorage.getItem('lemmy_username');
        const instance = localStorage.getItem('lemmy_instance');

        if (jwt && username && instance) {
            lemmyAuthSection.innerHTML = `
                <h3>Lemmy Login</h3>
                <p>Logged in as ${username}@${instance}</p>
                <button id="lemmy-logout-btn" class="button-danger">Logout</button>
            `;
            lemmyAuthSection.querySelector('#lemmy-logout-btn').addEventListener('click', () => {
                localStorage.removeItem('lemmy_jwt');
                localStorage.removeItem('lemmy_username');
                localStorage.removeItem('lemmy_instance');
                renderSettingsPage(state);
            });
        }
    };

    updateLemmyAuthView();

    const lemmyLoginForm = container.querySelector('#lemmy-login-form');
    if (lemmyLoginForm) {
        lemmyLoginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const instance = document.getElementById('lemmy-instance-input').value.trim();
            const username = document.getElementById('lemmy-username-input').value.trim();
            const password = document.getElementById('lemmy-password-input').value.trim();

            if (!instance || !username || !password) {
                alert('Please fill in all Lemmy login fields.');
                return;
            }

            try {
                const response = await apiFetch(instance, null, '/api/v3/user/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        username_or_email: username,
                        password: password
                    })
                });

                if (response.data.jwt) {
                    localStorage.setItem('lemmy_jwt', response.data.jwt);
                    localStorage.setItem('lemmy_username', username);
                    localStorage.setItem('lemmy_instance', instance);
                    alert('Lemmy login successful!');
                    updateLemmyAuthView();
                } else {
                    alert('Lemmy login failed. Please check your credentials.');
                }
            } catch (error) {
                console.error('Lemmy login error:', error);
                alert('An error occurred during Lemmy login.');
            }
        });
    }


    // --- Muted Users ---
    const mutedUsersList = container.querySelector('#muted-users-list');
    try {
        const muted = (await apiFetch(state.instanceUrl, state.accessToken, '/api/v1/mutes')).data;
        mutedUsersList.innerHTML = '';
        if (muted.length === 0) {
            mutedUsersList.innerHTML = '<p>You haven\'t muted anyone.</p>';
        }
        muted.forEach(account => {
            const item = document.createElement('li');
            item.className = 'muted-user-item';
            item.innerHTML = `
                <img src="${account.avatar_static}" alt="${account.acct} avatar">
                <div class="info">
                    <span class="display-name">${account.display_name}</span>
                    <div class="acct">@${account.acct}</div>
                </div>
                <button class="unmute-btn" data-id="${account.id}">Unmute</button>
            `;
            mutedUsersList.appendChild(item);
        });

        mutedUsersList.querySelectorAll('.unmute-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const accountId = e.target.dataset.id;
                try {
                    await apiFetch(state.instanceUrl, state.accessToken, `/api/v1/accounts/${accountId}/unmute`, { method: 'POST' });
                    e.target.closest('.muted-user-item').remove();
                } catch (err) {
                    alert('Failed to unmute user.');
                }
            });
        });

    } catch (err) {
        mutedUsersList.innerHTML = '<p>Could not load muted users.</p>';
    }
}
