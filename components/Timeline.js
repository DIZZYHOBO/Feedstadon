import { apiFetch } from './api.js';
import { renderStatus } from './Post.js';

export async function fetchTimeline(state, type, loadMore = false) {
    if (state.isLoadingMore) return;
    if (!loadMore) {
        state.timelineDiv.innerHTML = '<p>Loading...</p>';
        state.currentTimeline = type;
        state.lastPostId = null;
        window.scrollTo(0, 0);
    }
    state.isLoadingMore = true;
    if (loadMore) state.scrollLoader.style.display = 'block';

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
        if (loadMore && state.lastPostId) params.append('max_id', state.lastPostId);
        const queryString = params.toString();
        if (queryString) endpoint += `?${queryString}`;

        const statuses = await apiFetch(state.instanceUrl, state.accessToken, endpoint);
        if (!loadMore) state.timelineDiv.innerHTML = '';
        if (statuses.length > 0) {
            statuses.forEach(status => {
                const statusEl = renderStatus(status, state.settings, state.actions);
                if (statusEl) state.timelineDiv.appendChild(statusEl);
            });
            state.lastPostId = statuses[statuses.length - 1].id;
        } else {
            if (loadMore) state.scrollLoader.innerHTML = '<p>No more posts.</p>';
            else state.timelineDiv.innerHTML = '<p>Nothing to see here.</p>';
        }
    } catch (error) {
        if (!loadMore) state.timelineDiv.innerHTML = `<p>Could not load timeline.</p>`;
    } finally {
        state.isLoadingMore = false;
        if (loadMore) state.scrollLoader.style.display = 'none';
    }
}
