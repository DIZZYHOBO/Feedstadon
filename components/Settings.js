import { apiFetch, apiUpdateCredentials } from './api.js';

function renderFilterList(container, filters) {
    const list = container.querySelector('#filter-list');
    list.innerHTML = ''; // Clear current list

    if (filters.length === 0) {
        list.innerHTML = '<p>No filters set.</p>';
        return;
    }

    filters.forEach(filter => {
        const item = document.createElement('li');
        item.className = 'filter-item';
        item.innerHTML = `
            <span>${filter.phrase}</span>
            <button data-id="${filter.id}">&times;</button>
        `;
        list.appendChild(item);
    });
}

export async function renderSettingsPage(state) {
    const container = document.getElementById('settings-view');
    container.innerHTML = '<p>Loading settings...</p>';

    try {
        const [account, filters] = await Promise.all([
            state.currentUser,
            apiFetch(state.instanceUrl, state.accessToken, '/api/v1/filters')
        ]);

        container.innerHTML = `
            <div class="settings-container">
                <form id="settings-form">
                    <div class="settings-section">
                        <h3>Profile</h3>
                        <div class="form-group">
                            <label for="display-name-input">Display Name</label>
                            <input type="text" id="display-name-input" value="${account.display_name}">
                        </div>
                        <div class="form-group">
                            <label for="bio-textarea">Bio / Note</label>
                            <textarea id="bio-textarea" rows="4"></textarea>
                        </div>
                        <div class="form-group">
                            <label for="avatar-input">Avatar (Profile Picture)</label>
                            <input type="file" id="avatar-input" accept="image/*">
                            <span class="file-status" id="avatar-status"></span>
                        </div>
                        <div class="form-group">
                            <label for="header-input">Header (Banner Image)</label>
                            <input type="file" id="header-input" accept="image/*">
                            <span class="file-status" id="header-status"></span>
                        </div>
                    </div>
                    
                    <div class="settings-section">
                        <h3>Keyword Filters</h3>
                        <p>Hide posts from your timelines that contain these words or phrases.</p>
                        <div class="form-group">
                            <label for="add-filter-input">New Filter</label>
                            <div class="filter-input-group">
                                <input type="text" id="add-filter-input" placeholder="e.g., politics, spoilers">
                                <button type="button" id="add-filter-btn" class="nav-button">Add</button>
                            </div>
                        </div>
                        <ul id="filter-list"></ul>
                    </div>
                    
                    <button type="submit" class="settings-save-button">Save Settings</button>
                </form>
            </div>
        `;
        
        const bioTextarea = container.querySelector('#bio-textarea');
        const plainTextBio = account.note.replace(/<br\s*\/?>/gi, "\n").replace(/<\/p>/gi, "\n\n").replace(/<[^>]*>/g, "").trim();
        bioTextarea.value = plainTextBio;
        
        let currentFilters = filters;
        renderFilterList(container, currentFilters);

        // --- Event Listeners ---
        const settingsForm = container.querySelector('#settings-form');
        const addFilterBtn = container.querySelector('#add-filter-btn');
        const filterList = container.querySelector('#filter-list');
        const avatarInput = container.querySelector('#avatar-input');
        const headerInput = container.querySelector('#header-input');
        const avatarStatus = container.querySelector('#avatar-status');
        const headerStatus = container.querySelector('#header-status');

        avatarInput.addEventListener('change', () => {
            avatarStatus.textContent = avatarInput.files.length > 0 ? avatarInput.files[0].name : '';
        });

        headerInput.addEventListener('change', () => {
            headerStatus.textContent = headerInput.files.length > 0 ? headerInput.files[0].name : '';
        });

        settingsForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const saveButton = settingsForm.querySelector('.settings-save-button');
            saveButton.disabled = true;
            saveButton.textContent = 'Saving...';

            const avatarFile = avatarInput.files[0];
            const headerFile = headerInput.files[0];

            if (avatarFile) avatarStatus.textContent = 'Uploading avatar...';
            if (headerFile) headerStatus.textContent = 'Uploading header...';

            try {
                const formData = new FormData();
                formData.append('display_name', document.getElementById('display-name-input').value);
                formData.append('note', document.getElementById('bio-textarea').value);
                
                if (avatarFile) formData.append('avatar', avatarFile);
                if (headerFile) formData.append('header', headerFile);

                const updatedAccount = await apiUpdateCredentials(state, formData);
                state.currentUser = updatedAccount;
                
                alert('Settings saved successfully!');
                document.getElementById('user-display-btn').textContent = updatedAccount.display_name;
                avatarStatus.textContent = '';
                headerStatus.textContent = '';
                avatarInput.value = '';
                headerInput.value = '';

            } catch (error) {
                console.error('Failed to save settings:', error);
                alert('Could not save settings.');
                if (avatarFile) avatarStatus.textContent = 'Upload failed.';
                if (headerFile) headerStatus.textContent = 'Upload failed.';
            } finally {
                saveButton.disabled = false;
                saveButton.textContent = 'Save Settings';
            }
        });

        addFilterBtn.addEventListener('click', async () => {
            const input = container.querySelector('#add-filter-input');
            const phrase = input.value.trim();
            if (!phrase) return;

            try {
                const newFilter = await apiFetch(state.instanceUrl, state.accessToken, '/api/v1/filters', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        phrase: phrase,
                        context: ['home', 'public']
                    })
                });
                input.value = '';
                currentFilters.push(newFilter);
                renderFilterList(container, currentFilters);
            } catch (error) {
                console.error('Failed to add filter:', error);
                alert('Could not add filter.');
            }
        });

        filterList.addEventListener('click', async (e) => {
            if (e.target.tagName === 'BUTTON') {
                const filterId = e.target.dataset.id;
                try {
                    await apiFetch(state.instanceUrl, state.accessToken, `/api/v1/filters/${filterId}`, {
                        method: 'DELETE'
                    });
                    currentFilters = currentFilters.filter(f => f.id !== filterId);
                    renderFilterList(container, currentFilters);
                } catch (error) {
                    console.error('Failed to delete filter:', error);
                    alert('Could not delete filter.');
                }
            }
        });

    } catch (error) {
        console.error('Failed to render settings page:', error);
        container.innerHTML = '<p>Could not load settings.</p>';
    }
}
