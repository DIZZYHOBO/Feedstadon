export function initLogin(onMastodonSuccess, onLemmySuccess, onEnter) {
    const mastodonForm = document.getElementById('mastodon-login-form');
    const lemmyForm = document.getElementById('lemmy-login-form');
    const enterBtn = document.getElementById('enter-app-btn');

    mastodonForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const instanceUrl = document.getElementById('instance-url').value.trim();
        const accessToken = document.getElementById('access-token').value.trim();
        if (!instanceUrl || !accessToken) {
            alert('Please provide both Mastodon instance URL and access token.');
            return;
        }
        onMastodonSuccess(instanceUrl, accessToken, () => {
            document.getElementById('mastodon-login-section').style.display = 'none';
            enterBtn.style.display = 'block';
        });
    });

    lemmyForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const instance = document.getElementById('lemmy-instance-input').value.trim();
        const username = document.getElementById('lemmy-username-input').value.trim();
        const password = document.getElementById('lemmy-password-input').value.trim();
        if (!instance || !username || !password) {
            alert('Please fill in all Lemmy login fields.');
            return;
        }
        onLemmySuccess(instance, username, password, () => {
            document.getElementById('lemmy-login-section').style.display = 'none';
            enterBtn.style.display = 'block';
        });
    });

    enterBtn.addEventListener('click', onEnter);
}
