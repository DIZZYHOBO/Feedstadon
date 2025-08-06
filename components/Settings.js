import { apiFetch, apiUpdateCredentials } from './api.js';

function getWordFilter() {
    return JSON.parse(localStorage.getItem('lemmy-word-filter') || '[]');
}

function saveWordFilter(words) {
    localStorage.setItem('lemmy-word-filter', JSON.stringify(words));
}

function renderWordFilterList(container) {
    const words = getWordFilter();
    container.innerHTML = '';
    if (words.length > 0) {
        words.forEach(word => {
            const li = document.createElement('li');
            li.textContent = word;
            const removeBtn = document.createElement('button');
            removeBtn.textContent = 'Remove';
            removeBtn.className = 'button-secondary';
            removeBtn.onclick = () => {
                const newWords = getWordFilter().filter(w => w !== word);
                saveWordFilter(newWords);
                renderWordFilterList(container);
            };
            li.appendChild(removeBtn);
            container.appendChild(li);
        });
    } else {
        container.innerHTML = '<li>No words filtered.</li>';
    }
}


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
            <div class="settings-section">
                <h3>Lemmy Word Filter</h3>
                <p>Hide posts from your Lemmy feeds that contain these words (case-insensitive). This filter is local to this device.</p>
                <form id="word-filter-form">
                    <div class="form-group">
                        <label for="word-filter-input">Word or phrase to filter</label>
                        <input type="text" id="word-filter-input" placeholder="e.g., politics">
                    </div>
                    <button type="submit">Add Filter</button>
                </form>
                <ul id="word-filter-list"></ul>
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
    
    const wordFilterForm = document.getElementById('word-filter-form');
    const wordFilterInput = document.getElementById('word-filter-input');
    const wordFilterListContainer = document.getElementById('word-filter-list');

    wordFilterForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const newWord = wordFilterInput.value.trim().toLowerCase();
        if (newWord) {
            const words = getWordFilter();
            if (!words.includes(newWord)) {
                words.push(newWord);
                saveWordFilter(words);
                renderWordFilterList(wordFilterListContainer);
            }
            wordFilterInput.value = '';
        }
    });

    renderWordFilterList(wordFilterListContainer);
}
