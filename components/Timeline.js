import { apiFetch } from './api.js';
import { renderStatus } from './Post.js';

// Helper function to parse the Link header for the 'next' page URL
function parseLinkHeader(header) {
    if (!header) return null;
    const links = header.split(',');
    const nextLink = links.find(link => link.includes('rel="next"'));
    if (!nextLink) return null;
    // Extract the URL from <...>
    return nextLink.split(';')[0].replace(/<|>/g, '').trim();
}

export async function fetchTimeline(state, type, loadMore = false) {
    if (state.isLoadingMore) return;

    let endpoint;
    let isPaginated = false;

    if (loadMore && state.nextPageUrl) {
        endpoint = state.nextPageUrl;
        isPaginated = true;
    } else {
        endpoint = `/api/v1/timelines/${type}`;
        state.nextPageUrl = null; 
    }
    
    if (!loadMore) {
        state.timelineDiv.innerHTML = '<p>Loading...</p>';
        state.currentTimeline = type;
        window.scrollTo(0, 0);
    }

    state.isLoadingMore = true;
    if (loadMore) state.scrollLoader.classList.add('loading');

    try {
        const { data: statuses, linkHeader } = await apiFetch(state.instanceUrl, state.accessToken, endpoint, {}, isPaginated);

        if (!loadMore) {
            state.timelineDiv.innerHTML = '';
        }

        if (statuses && statuses.length > 0) {
            statuses.forEach(status => {
                const statusEl = renderStatus(status, state, state.actions);
                if (statusEl) {
                    state.timelineDiv.appendChild(statusEl);
                }
            });
            state.nextPageUrl = parseLinkHeader(linkHeader);
        } else {
            if (!loadMore) {
                state.timelineDiv.innerHTML = '<p>Nothing to see here.</p>';
            }
        }
        
        if (!state.nextPageUrl) {
            state.scrollLoader.innerHTML = '<p>No more posts.</p>';
        } else {
             state.scrollLoader.innerHTML = '<p>Loading more...</p>';
        }

    } catch (error) {
        console.error('Failed to fetch timeline:', error);
        if (!loadMore) {
            state.timelineDiv.innerHTML = `<p>Could not load timeline. Please try refreshing.</p>`;
        }
    } finally {
        state.isLoadingMore = false;
        if (loadMore) state.scrollLoader.classList.remove('loading');
    }
}
