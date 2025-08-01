document.addEventListener('DOMContentLoaded', () => {
    // --- DOM Elements ---
    const loginView = document.getElementById('login-view');
    const appView = document.getElementById('app-view');
    const instanceUrlInput = document.getElementById('instance-url');
    const accessTokenInput = document.getElementById('access-token');
    const connectBtn = document.getElementById('connect-btn');
    const userDisplayBtn = document.getElementById('user-display-btn');
    const timelineDiv = document.getElementById('timeline');
    const modal = document.getElementById('modal');
    const modalBody = document.getElementById('modal-body');
    const notificationsDropdown = document.getElementById('notifications-dropdown');
    const notificationsBtn = document.getElementById('notifications-btn');
    const notificationsList = document.getElementById('notifications-list');
    const userDropdown = document.getElementById('user-dropdown');
    const feedsDropdown = document.getElementById('feeds-dropdown');
    const logoutBtn = document.getElementById('logout-btn');
    const profileLink = document.getElementById('profile-link');
    const settingsLink = document.getElementById('settings-link');
    const navPostBtn = document.getElementById('nav-post-btn');
    const searchContainer = document.getElementById('search-container');
    const searchToggleBtn = document.getElementById('search-toggle-btn');
    const searchForm = document.getElementById('search-form');
    const searchInput = document.getElementById('search-input');
    const searchResults = document.getElementById('search-results');
    const composeTemplate = document.getElementById('compose-template');
    const settingsTemplate = document.getElementById('settings-template');
    const scrollLoader = document.getElementById('scroll-loader');
    
    // --- App State & Icons ---
    let instanceUrl = '', accessToken = '', currentUser = null, attachedMediaId = null;
    let settings = { hideNsfw: false, filteredWords: [] };
    let currentTimeline = 'home';
    let lastPostId = null;
    let isLoadingMore = false;
    let searchDebounce = null;
    const ICONS = {
        notification: `<svg class="icon" viewBox="0 0 24 24" style="width:24px; height:24px; fill:currentColor;"><path d="M12 22c1.1 0 2-.9 2-2h-4c0 1.1.9 2 2 2zm6-6v-5c0-3.07-1.63-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.64 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2z"/></svg>`,
        reply: `<svg class="icon" viewBox="0 0 24 24"><path d="M10 9V5l-7 7 7 7v-4.1c5 0 8.5 1.6 11 5.1-1-5-4-10-11-11z"/></svg>`,
        boost: `<svg class="icon" viewBox="0 0 24 24"><path d="M7 7h10v3l4-4-4-4v3H5v6h2V7zm10 10H7v-3l-4 4 4 4v-3h12v-6h-2v4z"/></svg>`,
        favorite: `<svg class="icon" viewBox="0 0 24 24"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>`,
        bookmark: `<svg class="icon" viewBox="0 0 24 24"><path d="M17 3H7c-1.1 0-1.99.9-1.99 2L5 21l7-3 7 3V5c0-1.1-.9-2-2-2z"/></svg>`
    };
    notificationsBtn.innerHTML = ICONS.notification;

    // --- API Helper & Modal ---
    async function apiFetch(endpoint, options = {}) {
        const url = `https://${instanceUrl}${endpoint}`;
        const headers = { 'Authorization': `Bearer ${accessToken}`, ...options.headers };
        if (options.body instanceof FormData) delete headers['Content-Type'];
        const response = await fetch(url, { ...options, headers });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return response.json();
    }
    function showModal(contentNode) { modalBody.innerHTML = ''; modalBody.appendChild(contentNode); modal.classList.add('visible'); }
    function hideModal() { modal.classList.remove('visible'); }
    modal.addEventListener('click', (e) => { if (e.target === modal) hideModal(); });

    // --- Rendering ---
    function renderStatus(status) {
        const originalPost = status.reblog || status;
        if (settings.hideNsfw && originalPost.sensitive) return null;
        const lowerContent = originalPost.content.toLowerCase();
        for (const word of settings.filteredWords) {
            if (word && lowerContent.includes(word.toLowerCase())) return null;
        }
        
        let mediaHTML = '';
        if(originalPost.media_attachments && originalPost.media_attachments.length > 0) {
            mediaHTML = originalPost.media_attachments.map(media => {
                if (media.type === 'image') return `<a href="${media.url}" target="_blank" rel="noopener noreferrer"><img src="${media.preview_url}"></a>`;
                if (media.type === 'video') return `<video src="${media.url}" controls></video>`;
                return '';
            }).join('');
        }

        const statusDiv = document.createElement('div');
        statusDiv.className = 'status';
        statusDiv.innerHTML = `
            <div class="status-header">
                <img src="${originalPost.account.avatar_static}">
                <div><span class="display-name">${originalPost.account.display_name}</span></div>
            </div>
            <div class="status-content">${originalPost.content}</div>
            <div class="status-media">${mediaHTML}</div>
            <div class="status-footer">
                <span class="status-action reply">${ICONS.reply} ${originalPost.replies_count}</span>
                <span class="status-action boost ${originalPost.reblogged ? 'active' : ''}">${ICONS.boost} ${originalPost.reblogs_count}</span>
                <span class="status-action favorite ${originalPost.favourited ? 'active' : ''}">${ICONS.favorite} ${originalPost.favourites_count}</span>
                <span class="status-action bookmark ${originalPost.bookmarked ? 'active' : ''}">${ICONS.bookmark}</span>
            </div>
        `;

        statusDiv.querySelector('.reply').onclick = (e) => { e.stopPropagation(); toggleCommentThread(originalPost, statusDiv); };
        statusDiv.querySelector('.boost').onclick = (e) => { e.stopPropagation(); toggleAction('boost', originalPost.id, e.currentTarget); };
        statusDiv.querySelector('.favorite').onclick = (e) => { e.stopPropagation(); toggleAction('favorite', originalPost.id, e.currentTarget); };
        statusDiv.querySelector('.bookmark').onclick = (e) => { e.stopPropagation(); toggleAction('bookmark', originalPost.id, e.currentTarget); };

        return statusDiv;
    }

    // --- Feature Functions ---
    async function toggleCommentThread(status, statusElement) {
        const existingThread = statusElement.querySelector('.comment-thread');
        if (existingThread) { existingThread.remove(); return; }

        const threadContainer = document.createElement('div');
        threadContainer.className = 'comment-thread';
        threadContainer.innerHTML = `<p>Loading replies...</p>`;
        statusElement.appendChild(threadContainer);
        requestAnimationFrame(() => threadContainer.classList.add('visible'));
        
        try {
            const context = await apiFetch(`/api/v1/statuses/${status.id}/context`);
            threadContainer.innerHTML = '';
            if (context.descendants && context.descendants.length > 0) {
                context.descendants.forEach(reply => threadContainer.appendChild(renderStatus(reply)));
            }
            const replyForm = document.createElement('div');
            replyForm.className = 'comment-reply-form';
            replyForm.innerHTML = `<textarea></textarea><button>Reply</button>`;
            const textarea = replyForm.querySelector('textarea');
            textarea.value = `@${status.account.acct} `;
            replyForm.querySelector('button').onclick = async () => {
                if (!textarea.value) return;
                await apiFetch('/api/v1/statuses', {
                    method: 'POST', headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ status: textarea.value, in_reply_to_id: status.id })
                });
                toggleCommentThread(status, statusElement);
            };
            threadContainer.appendChild(replyForm);
        } catch (error) { threadContainer.innerHTML = `<p class="error">Could not load replies.</p>`; }
    }

    async function toggleAction(action, id, button) {
        const actionMap = { boost: 'reblog', favorite: 'favourite', bookmark: 'bookmark' };
        const verb = actionMap[action];
        const isDone = button.classList.contains('active');
        const endpoint = `/api/v1/statuses/${id}/${isDone ? `un${verb}` : verb}`;
        try {
            const updatedStatus = await apiFetch(endpoint, { method: 'POST' });
            button.classList.toggle('active');
            // This part is tricky without a full framework, but we can update counts if needed
        } catch(err) { alert('Action failed.'); }
    }

    async function fetchTimeline(type, loadMore = false) {
        if (isLoadingMore) return;
        if (!loadMore) {
            timelineDiv.innerHTML = '<p>Loading...</p>';
            currentTimeline = type;
            lastPostId = null;
            window.scrollTo(0, 0);
        }

        isLoadingMore = true;
        if (loadMore) scrollLoader.style.display = 'block';

        try {
            let endpoint = `/api/v1/timelines/`;
            const params = new URLSearchParams();
            if (type.includes('?')) {
                const [path, query] = type.split('?');
                endpoint += path;
                new URLSearchParams(query).forEach((val, key) => params.append(key, val));
            } else {
                endpoint += type;
            }
            if (loadMore && lastPostId) params.append('max_id', lastPostId);
            const queryString = params.toString();
            if (queryString) endpoint += `?${queryString}`;

            const statuses = await apiFetch(endpoint);
            if (!loadMore) timelineDiv.innerHTML = '';
            if (statuses.length > 0) {
                statuses.forEach(status => {
                    const statusEl = renderStatus(status);
                    if (statusEl) timelineDiv.appendChild(statusEl);
                });
                lastPostId = statuses[statuses.length - 1].id;
            } else {
                if (loadMore) scrollLoader.innerHTML = '<p>No more posts.</p>';
                else timelineDiv.innerHTML = '<p>Nothing to see here.</p>';
            }
        } catch (error) {
            if (!loadMore) timelineDiv.innerHTML = `<p>Could not load timeline.</p>`;
        } finally {
            isLoadingMore = false;
            if (loadMore) scrollLoader.style.display = 'none';
        }
    }
    
    function showComposeModal() {
        const composeContent = composeTemplate.content.cloneNode(true);
        const form = composeContent.querySelector('form');
        const textarea = composeContent.querySelector('textarea');
        const mediaBtn = composeContent.querySelector('#media-btn');
        const mediaInput = composeContent.querySelector('#media-input');
        const mediaPreview = composeContent.querySelector('#media-preview');
        const nsfwCheckbox = composeContent.querySelector('#nsfw-checkbox');
        
        mediaBtn.onclick = () => mediaInput.click();
        mediaInput.onchange = async () => {
            const file = mediaInput.files[0];
            if (!file) return;
            mediaPreview.textContent = 'Uploading...';
            const formData = new FormData();
            formData.append('file', file);
            try {
                const result = await apiFetch('/api/v2/media', { method: 'POST', body: formData });
                attachedMediaId = result.id;
                mediaPreview.textContent = `✅ Attached`;
            } catch (err) { mediaPreview.textContent = 'Upload failed!'; }
        };

        form.onsubmit = async (e) => {
            e.preventDefault();
            if (!textarea.value.trim() && !attachedMediaId) return;
            try {
                const body = { 
                    status: textarea.value,
                    sensitive: nsfwCheckbox.checked 
                };
                if (attachedMediaId) body.media_ids = [attachedMediaId];
                await apiFetch('/api/v1/statuses', {
                    method: 'POST', headers: {'Content-Type': 'application/json'},
                    body: JSON.stringify(body)
                });
                hideModal();
                attachedMediaId = null;
                fetchTimeline('home');
            } catch(err) { alert('Failed to post.'); }
        };
        showModal(composeContent);
        textarea.focus();
    }

    function showSettingsModal() {
        const settingsContent = settingsTemplate.content.cloneNode(true);
        const nsfwToggle = settingsContent.querySelector('#nsfw-toggle');
        const filterInput = settingsContent.querySelector('#word-filter-input');
        const addFilterBtn = settingsContent.querySelector('#add-filter-word-btn');
        const filterList = settingsContent.querySelector('#word-filter-list');
        
        nsfwToggle.checked = settings.hideNsfw;
        const renderFilterList = () => {
            filterList.innerHTML = '';
            settings.filteredWords.forEach(word => {
                const li = document.createElement('li');
                li.textContent = word;
                const removeBtn = document.createElement('button');
                removeBtn.textContent = '×';
                removeBtn.style.padding = '2px 8px';
                removeBtn.onclick = () => {
                    settings.filteredWords = settings.filteredWords.filter(w => w !== word);
                    saveSettings();
                    renderFilterList();
                };
                li.appendChild(removeBtn);
                filterList.appendChild(li);
            });
        };
        renderFilterList();

        nsfwToggle.onchange = () => {
            settings.hideNsfw = nsfwToggle.checked;
            saveSettings();
        };
        addFilterBtn.onclick = () => {
            const word = filterInput.value.trim();
            if (word && !settings.filteredWords.includes(word)) {
                settings.filteredWords.push(word);
                filterInput.value = '';
                saveSettings();
                renderFilterList();
            }
        };
        showModal(settingsContent);
    }
    function saveSettings() {
        localStorage.setItem('fediverse-settings', JSON.stringify(settings));
        fetchTimeline(currentTimeline);
    }
    function loadSettings() {
        const saved = localStorage.getItem('fediverse-settings');
        if (saved) settings = JSON.parse(saved);
    }

    async function performSearch(query) {
        if (!query || query.length < 2) {
            searchResults.style.display = 'none';
            return;
        }
        try {
            const results = await apiFetch(`/api/v2/search?q=${encodeURIComponent(query)}&resolve=false&limit=10`);
            searchResults.innerHTML = '';
            if (results.accounts.length > 0) {
                results.accounts.slice(0, 4).forEach(acc => {
                    const item = document.createElement('a');
                    item.href = '#';
                    item.innerHTML = `<strong>${acc.display_name}</strong><br><small>@${acc.acct}</small>`;
                    item.onclick = (e) => { e.preventDefault(); showProfile(acc.id); };
                    searchResults.appendChild(item);
                });
            }
            searchResults.style.display = 'block';
        } catch(err) {
            searchResults.style.display = 'none';
        }
    }

    async function initializeApp() {
        try {
            loadSettings();
            currentUser = await apiFetch('/api/v1/accounts/verify_credentials');
            loginView.style.display = 'none';
            appView.style.display = 'block';
            document.querySelector('.top-nav').style.display = 'flex';
            userDisplayBtn.textContent = currentUser.display_name;
            fetchTimeline('home');
        } catch (error) {
            alert('Connection failed. Please check URL and token.');
            localStorage.clear();
            window.location.reload();
        }
    }
    
    // --- Event Listeners ---
    connectBtn.addEventListener('click', () => {
        instanceUrl = instanceUrlInput.value.trim();
        accessToken = accessTokenInput.value.trim();
        if (instanceUrl && accessToken) {
            localStorage.setItem('fediverse-instance', instanceUrl);
            localStorage.setItem('fediverse-token', accessToken);
            initializeApp();
        }
    });
    
    window.addEventListener('click', (e) => {
        if (!e.target.closest('.dropdown')) {
            document.querySelectorAll('.dropdown.active').forEach(d => d.classList.remove('active'));
        }
        if (!searchContainer.contains(e.target)) {
            searchForm.classList.remove('active');
            searchToggleBtn.style.display = 'inline-block';
        }
    });
    [userDropdown, feedsDropdown, notificationsDropdown].forEach(dd => {
        dd.addEventListener('click', (e) => {
            e.stopPropagation();
            document.querySelectorAll('.dropdown').forEach(d => { if(d !== dd) d.classList.remove('active'); });
            dd.classList.toggle('active');
        });
    });
    feedsDropdown.querySelectorAll('a').forEach(link => {
        link.addEventListener('click', (e) => { e.preventDefault(); fetchTimeline(e.target.dataset.timeline); });
    });
    navPostBtn.addEventListener('click', showComposeModal);
    logoutBtn.addEventListener('click', (e) => { e.preventDefault(); localStorage.clear(); window.location.reload(); });
    profileLink.addEventListener('click', (e) => { e.preventDefault(); alert('Profile coming soon'); });
    settingsLink.addEventListener('click', (e) => { e.preventDefault(); showSettingsModal(); });

    searchToggleBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        searchForm.classList.add('active');
        searchInput.focus();
        searchToggleBtn.style.display = 'none';
    });
    searchInput.addEventListener('input', () => {
        clearTimeout(searchDebounce);
        searchDebounce = setTimeout(() => performSearch(searchInput.value.trim()), 300);
    });
    
    window.addEventListener('scroll', () => {
        if (isLoadingMore || !currentUser) return;
        const { scrollTop, scrollHeight, clientHeight } = document.documentElement;
        if (scrollTop + clientHeight >= scrollHeight - 400) {
            fetchTimeline(currentTimeline, true);
        }
    });

    // --- Initial Page Load ---
    const savedInstance = localStorage.getItem('fediverse-instance');
    const savedToken = localStorage.getItem('fediverse-token');
    if (savedInstance && savedToken) {
        instanceUrlInput.value = savedInstance;
        accessTokenInput.value = savedToken;
        instanceUrl = savedInstance;
        accessToken = savedToken;
        initializeApp();
    } else {
         document.querySelector('.top-nav').style.display = 'none';
    }
});
</script>
</body>
</html>
