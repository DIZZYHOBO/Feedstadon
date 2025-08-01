import { apiFetch, apiUpdateCredentials } from './api.js';

export async function renderSettingsPage(state) {
    const container = document.getElementById('settings-view');
    container.innerHTML = '<p>Loading settings...</p>';

    try {
        const account = state.currentUser; // We already have this from login

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
                        </div>
                        <div class="form-group">
                            <label for="header-input">Header (Banner Image)</label>
                            <input type="file" id="header-input" accept="image/*">
                        </div>
                    </div>
                    
                    <button type="submit" class="settings-save-button">Save Settings</button>
                </form>
            </div>
        `;
        
        // Convert bio HTML to plain text for textarea
        const bioTextarea = container.querySelector('#bio-textarea');
        const plainTextBio = account.note.replace(/<br\s*\/?>/gi, "\n").replace(/<\/p>/gi, "\n\n").replace(/<[^>]*>/g, "").trim();
        bioTextarea.value = plainTextBio;
        
        // Add form submission listener
        const settingsForm = container.querySelector('#settings-form');
        settingsForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const saveButton = settingsForm.querySelector('.settings-save-button');
            saveButton.disabled = true;
            saveButton.textContent = 'Saving...';

            try {
                const formData = new FormData();
                formData.append('display_name', document.getElementById('display-name-input').value);
                formData.append('note', document.getElementById('bio-textarea').value);
                
                const avatarFile = document.getElementById('avatar-input').files[0];
                if (avatarFile) {
                    formData.append('avatar', avatarFile);
                }
                
                const headerFile = document.getElementById('header-input').files[0];
                if (headerFile) {
                    formData.append('header', headerFile);
                }

                const updatedAccount = await apiUpdateCredentials(state, formData);
                state.currentUser = updatedAccount; // Update state with new user info
                
                alert('Settings saved successfully!');
                // Update the user display name in the nav bar
                document.getElementById('user-display-btn').textContent = updatedAccount.display_name;

            } catch (error) {
                console.error('Failed to save settings:', error);
                alert('Could not save settings.');
            } finally {
                saveButton.disabled = false;
                saveButton.textContent = 'Save Settings';
            }
        });

    } catch (error) {
        console.error('Failed to render settings page:', error);
        container.innerHTML = '<p>Could not load settings.</p>';
    }
}
