// A simple in-memory cache to store API responses
const apiCache = new Map();
const CACHE_DURATION_MS = 5 * 60 * 1000; // 5 minutes

/**
 * A helper function to make authenticated JSON API requests with caching.
 * It can handle both full URLs (for pagination) and API endpoints.
 */
export async function apiFetch(instanceUrl, accessToken, endpointOrUrl, options = {}, isPaginated = false) {
    let url;

    // If it's a paginated call, the full URL is provided in endpointOrUrl
    if (isPaginated && (endpointOrUrl.startsWith('http://') || endpointOrUrl.startsWith('https://'))) {
        url = endpointOrUrl;
    } else {
        // Otherwise, construct the URL from the instance and endpoint
        const cleanInstanceUrl = instanceUrl.replace(/^https?:\/\//, '').replace(/\/$/, '');
        url = `https://${cleanInstanceUrl}${endpointOrUrl}`;
    }

    // --- Caching Logic ---
    // Only cache GET requests (which are for fetching data)
    if (!options.method || options.method === 'GET') {
        const cachedResponse = apiCache.get(url);
        if (cachedResponse && (Date.now() - cachedResponse.timestamp < CACHE_DURATION_MS)) {
            // Return a clone of the cached data
            return { ...cachedResponse.data }; 
        }
    }
    
    const headers = {
        ...options.headers
    };

    if (accessToken) {
        headers['Authorization'] = `Bearer ${accessToken}`;
    }

    const response = await fetch(url, { ...options, headers });

    if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
    }

    const linkHeader = response.headers.get('Link');

    if (response.status === 204 || response.status === 202) {
        return { data: {}, linkHeader: linkHeader };
    }

    const data = await response.json();
    const responsePayload = { data, linkHeader };

    // --- Caching Logic ---
    // Store the new response in the cache
    if (!options.method || options.method === 'GET') {
        apiCache.set(url, {
            data: { ...responsePayload }, // Store a clone
            timestamp: Date.now()
        });
    }

    return responsePayload;
}


/**
 * A helper function to upload media files for posts.
 */
export async function apiUploadMedia(state, file) {
    const cleanInstanceUrl = state.instanceUrl.replace(/^https?:\/\//, '').replace(/\/$/, '');
    const url = `https://${cleanInstanceUrl}/api/v2/media`;

    const formData = new FormData();
    formData.append('file', file);

    const headers = {
        'Authorization': `Bearer ${state.accessToken}`
    };

    const response = await fetch(url, {
        method: 'POST',
        body: formData,
        headers: headers
    });

    if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
    }

    return response.json();
}


/**
 * A helper function to update user profile credentials.
 */
export async function apiUpdateCredentials(state, formData) {
    const cleanInstanceUrl = state.instanceUrl.replace(/^https?:\/\//, '').replace(/\/$/, '');
    const url = `https://${cleanInstanceUrl}/api/v1/accounts/update_credentials`;

    const headers = {
        'Authorization': `Bearer ${state.accessToken}`
    };

    const response = await fetch(url, {
        method: 'PATCH',
        body: formData,
        headers: headers
    });

    if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
    }

    return response.json();
}
