/**
 * A helper function to make authenticated JSON API requests.
 * It can handle both full URLs (for pagination) and API endpoints.
 * It now handles different authentication types.
 */
export async function apiFetch(instanceUrl, token, endpointOrUrl, options = {}, authType = 'mastodon', isPaginated = false) {
    let url;

    // If it's a paginated call, the full URL is provided in endpointOrUrl
    if (isPaginated && (endpointOrUrl.startsWith('http://') || endpointOrUrl.startsWith('https://'))) {
        url = endpointOrUrl;
    } else {
        // Otherwise, construct the URL from the instance and endpoint
        const cleanInstanceUrl = instanceUrl.replace(/^https?:\/\//, '').replace(/\/$/, '');
        url = `https://${cleanInstanceUrl}${endpointOrUrl}`;
    }
    
    const headers = {
        ...options.headers
    };

    let authToken = token;
    if (authType === 'lemmy') {
        authToken = localStorage.getItem('lemmy_jwt');
    }

    // Only add the auth header if a token exists for the specified auth type
    if (authToken && authType !== 'none') {
        headers['Authorization'] = `Bearer ${authToken}`;
    }

    const response = await fetch(url, { ...options, headers });

    if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
    }

    // Extract the 'Link' header for pagination
    const linkHeader = response.headers.get('Link');

    if (response.status === 204 || response.status === 202) {
        return { data: {}, linkHeader: linkHeader };
    }

    const data = await response.json();
    return { data, linkHeader };
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
