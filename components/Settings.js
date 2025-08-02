import { apiFetch, apiUpdateCredentials } from './api.js';

function renderFilterList(container, filters) {
    const list = container.querySelector('#filter-list');
    list.innerHTML = '';

    if (!filters || filters.length === 0) {
        list.innerHTML = '<li>No filters set.</li>';
        return;
    }

    filters.forEach(filter => {
        const item = document.createElement('li');
        item.className = 'filter-item';
        item.innerHTML = `
            <span>${filter.phrase}</span>
            <button data-id="${filter.id}" title="Delete filter">&times;</button>
        `;
        list.appendChild(item);
    });
}

function renderMutedList(container, mutedAccounts) {
    const list = container.querySelector('#muted-users-list');
    list.innerHTML = '';

    if (!mutedAccounts || mutedAccounts.length === 0) {
        list.innerHTML = '<li>You haven\'t muted anyone.</li>';
        return;
    }

    mutedAccounts.forEach(account => {
        const item = document.createElement('li');
        item.className = 'muted-user-item';
        item.innerHTML = `
            <img src="${account.avatar_static}" alt="${account.acct} avatar">
            <div class="info">
                <div class="display-name">${account.display_name}</div>
                <div class="acct">@${account.acct}</div>
            </div>
            <button class="unmute-btn" data-id="${account.id}">Unmute</button>
        `;
        list.appendChild(item);
    });
}

export async function renderSettingsPage(state) {
    const container = document.getElementById('settings-view');
    container.innerHTML = '<p>Loading settings...</p>';

    try {
        const [account, filtersResponse, mutesResponse] = await Promise.all([
            state.currentUser,
            apiFetch(state.instanceUrl, state.accessToken, '/api/v1/filters'),
            apiFetch(state.instanceUrl, state.accessToken, '/api/v1/mutes')
        ]);

        const filters = filtersResponse.data;
        const mutedAccounts = mutesResponse.data;

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
                    
                    <button type="submit" class="settings-save-button">Save Profile Settings</button>
                </form>

                <div class="settings-section">
                    <h3>Keyword Filters</h3>
                    <div class="form-group">
                        <div class="filter-input-group">
                            <input type="text" id="add-filter-input" placeholder="e.g., politics, spoilers">
                            <button type="button" id="add-filter-btn" class="nav-button">Add</button>
                        </div>
                    </div>
                    <ul id="filter-list"></ul>
                </div>

                <div class="settings-section">
                    <h3>Muted Users</h3>
                    <ul id="muted-users-list"></ul>
                </div>
            </div>
        `;
        
        const bioTextarea = container.querySelector('#bio-textarea');
        const plainTextBio = account.note.replace(/<br\s*\/?>/gi, "\n").replace(/<\/p>/gi, "\n\n").replace(/<[^>]*>/g, "").trim();
        bioTextarea.value = plainTextBio;
        
        let currentFilters = filters;
        renderFilterList(container, currentFilters);

        let currentMutes = mutedAccounts;
        renderMutedList(container, currentMutes);

        // --- Event Listeners ---
        const settingsForm = container.querySelector('#settings-form');
        const addFilterBtn = container.querySelector('#add-filter-btn');
        const filterList = container.querySelector('#filter-list');
        const mutedList = container.querySelector('#muted-users-list');
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
            // ... (profile saving logic is unchanged)
        });

        addFilterBtn.addEventListener('click', async () => {
            // ... (add filter logic is unchanged)
        });

        filterList.addEventListener('click', async (e) => {
            if (e.target.dataset.id) {
                const filterId = e.target.dataset.id;
                // ... (delete filter logic is unchanged)
            }
        });
        
        mutedList.addEventListener('click', async (e) => {
            if (e.target.classList.contains('unmute-btn')) {
                const accountId = e.target.dataset.id;
                try {
                    await apiFetch(state.instanceUrl, state.accessToken, `/api/v1/accounts/${accountId}/unmute`, {
                        method: 'POST'
                    });
                    // Remove the user from the list visually
                    e.target.closest('.muted-user-item').remove();
                } catch (error) {
                    console.error('Failed to unmute user:', error);
                    alert('Could not unmute user.');
                }
            }
        });

    } catch (error) {
        console.error('Failed to render settings page:', error);
        container.innerHTML = '<p>Could not load settings.</p>';
    }
}
