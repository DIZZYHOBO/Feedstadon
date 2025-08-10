// dizzyhobo/feedstadon/Feedstadon-6ccd4f649f7f6474a63329d3357b817688251173/components/Settings.js
import { getWordFilter, saveWordFilter } from './utils.js';

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

    settingsView.innerHTML = `
        <div class="settings-container">
            <div class="settings-section">
                <h3>Theme</h3>
                <div class="form-group">
                    <label for="theme-select">Select Theme</label>
                    <select id="theme-select">
                        <option value="feedstodon">Feedstodon (Default)</option>
                        <option value="readit">Readit</option>
                        <option value="git">Git</option>
                        <option value="voyage">Voyage</option>
                    </select>
                </div>
            </div>
            <div class="settings-section">
                <h3>Filters</h3>
                <div class="form-group">
                    <label for="nsfw-toggle" style="display: flex; align-items: center; justify-content: space-between;">
                        Hide NSFW Content
                        <input type="checkbox" id="nsfw-toggle">
                    </label>
                </div>
            </div>
            <div class="settings-section">
                <h3>Default Start Page</h3>
                <p>Changes will be applied after refreshing the app.</p>
                <div class="form-group">
                    <label for="start-page-select">Choose your default start page</label>
                    <select id="start-page-select">
                        <option value="lemmy">Lemmy</option>
                        <option value="mastodon">Mastodon</option>
                    </select>
                </div>
                 <div class="form-group">
                    <label for="feed-type-select">Default Feed Type</label>
                    <select id="feed-type-select">
                        <option value="Subscribed">Subscribed</option>
                        <option value="Local">Local</option>
                        <option value="All">All</option>
                    </select>
                </div>
                <div class="form-group" id="lemmy-sort-settings">
                    <label for="lemmy-sort-select">Default Lemmy Feed Sort</label>
                    <select id="lemmy-sort-select">
                        <option value="New">New</option>
                        <option value="Active">Active</option>
                        <option value="Hot">Hot</option>
                        <option value="TopHour">Top Hour</option>
                        <option value="TopSixHour">Top Six Hour</option>
                        <option value="TopTwelveHour">Top Twelve Hour</option>
                        <option value="TopDay">Top Day</option>
                    </select>
                </div>
                <button id="save-settings-btn" class="button-primary">Save and Refresh</button>
            </div>
            <div class="settings-section">
                <h3>Word Filter</h3>
                <p>Hide posts from your feeds that contain these words (case-insensitive). This filter is local to this device.</p>
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

    const nsfwToggle = document.getElementById('nsfw-toggle');
    nsfwToggle.checked = state.settings.hideNsfw;
    nsfwToggle.addEventListener('change', () => {
        const isChecked = nsfwToggle.checked;
        state.settings.hideNsfw = isChecked;
        localStorage.setItem('hideNsfw', isChecked);
    });
    
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
    
    // New settings logic
    const startPageSelect = document.getElementById('start-page-select');
    const feedTypeSelect = document.getElementById('feed-type-select');
    const lemmySortSelect = document.getElementById('lemmy-sort-select');
    const lemmySortSettings = document.getElementById('lemmy-sort-settings');
    const saveButton = document.getElementById('save-settings-btn');

    startPageSelect.value = localStorage.getItem('defaultStartPage') || 'lemmy';
    feedTypeSelect.value = localStorage.getItem('defaultFeedType') || 'Subscribed';
    lemmySortSelect.value = localStorage.getItem('lemmySortType') || 'Hot';

    lemmySortSettings.style.display = startPageSelect.value === 'lemmy' ? 'block' : 'none';

    startPageSelect.addEventListener('change', (e) => {
        localStorage.setItem('defaultStartPage', e.target.value);
        lemmySortSettings.style.display = e.target.value === 'lemmy' ? 'block' : 'none';
    });

    feedTypeSelect.addEventListener('change', (e) => {
        localStorage.setItem('defaultFeedType', e.target.value);
    });

    lemmySortSelect.addEventListener('change', (e) => {
        localStorage.setItem('lemmySortType', e.target.value);
    });

    saveButton.addEventListener('click', () => {
        // Navigate to the root of the app, which will trigger a reload
        // and cause the app to read the new default settings on startup.
        window.location.href = window.location.pathname;
    });
}
