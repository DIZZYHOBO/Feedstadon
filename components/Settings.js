export function renderSettingsPage(state) {
    const container = document.getElementById('settings-view');
    
    container.innerHTML = `
        <div class="view-header">
            <h2>Settings</h2>
        </div>
        <div class="settings-container">
            <div class="settings-section">
                <h3>Appearance</h3>
                <div class="form-group">
                    <label for="theme-select">Theme</label>
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
                <h3>Content Filters</h3>
                 <div class="form-group">
                    <label>
                        <input type="checkbox" id="hide-nsfw-checkbox"> Hide NSFW Content
                    </label>
                </div>
            </div>
        </div>
    `;

    // Add event listeners for settings changes
    const themeSelect = document.getElementById('theme-select');
    themeSelect.value = localStorage.getItem('feedstodon-theme') || 'feedstodon';
    themeSelect.addEventListener('change', (e) => {
        document.documentElement.setAttribute('data-theme', e.target.value);
        localStorage.setItem('feedstodon-theme', e.target.value);
    });
}
