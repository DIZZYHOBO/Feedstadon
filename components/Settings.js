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
