import { apiFetch, apiUpdateCredentials } from './api.js';

export function renderSettingsPage(state) {
    const settingsView = document.getElementById('settings-view');
    
    // Check if the Mastodon user is logged in
    const isMastodonLoggedIn = state.currentUser && state.currentUser.id;

    const profileSettingsHTML = isMastodonLoggedIn ? `
        <div class="settings-section">
            <h3>Profile Settings (Mastodon)</h3>
            <form id="profile-settings-form">
                <div class="form-group">
                    <label for="display-name">Display Name</label>
                    <input type="text" id="display-name" name="display_name" value="${state.currentUser.display_name}">
                </div>
                <div class="form-group">
                    <label for="bio">Bio</label>
                    <textarea id="bio" name="note">${state.currentUser.note}</textarea>
                </div>
                <div class="form-group">
                    <label for="avatar">Avatar</label>
                    <input type="file" id="avatar-upload" name="avatar" accept="image/*">
                    <span class="file-status"></span>
                </div>
                 <div class="form-group">
                    <label for="banner">Header Banner</label>
                    <input type="file" id="banner-upload" name="header" accept="image/*">
                    <span class="file-status"></span>
                </div>
                <button type="submit" class="settings-save-button">Save Profile</button>
            </form>
        </div>
    ` : `
        <div class="settings-section">
            <h3>Profile Settings (Mastodon)</h3>
            <p>You must be logged into Mastodon to edit your profile.</p>
        </div>
    `;

    settingsView.innerHTML = `
        <div class="settings-container">
            ${profileSettingsHTML}
            <div class="settings-section">
                <h3>Theme</h3>
                <div class="form-group">
                    <label for="theme-select">Select Theme</label>
                    <select id="theme-select">
                        <option value="feedstodon">Feedstodon (Default)</option>
                        <option value="purple">Purple</option>
                        <option value="tube">Tube</option>
                        <option value="readit">Readit</option>
                        <option value="git">Git</option>
                    </select>
                </div>
            </div>
        </div>
    `;

    const themeSelect = document.getElementById('theme-select');
    const currentTheme = localStorage.getItem('feedstodon-theme') || 'feedstodon';
    themeSelect.value = currentTheme;

    themeSelect.addEventListener('change', (e) => {
        const selectedTheme = e.target.value;
        document.body.dataset.theme = selectedTheme;
        localStorage.setItem('feedstodon-theme', selectedTheme);
    });
    
    if (isMastodonLoggedIn) {
        const profileForm = document.getElementById('profile-settings-form');
        profileForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const saveButton = profileForm.querySelector('.settings-save-button');
            saveButton.disabled = true;
            saveButton.textContent = 'Saving...';
            
            try {
                const formData = new FormData(e.target);
                await apiUpdateCredentials(state, formData);
                alert("Profile updated successfully!");
                // Optionally refresh profile data
            } catch (error) {
                console.error("Failed to update profile", error);
                alert("Failed to update profile.");
            } finally {
                saveButton.disabled = false;
                saveButton.textContent = 'Save Profile';
            }
        });
    }
}
