/**
 * A helper function to make authenticated JSON API requests.
 */
export async function apiFetch(instanceUrl, accessToken, endpoint, options = {}) {
    const cleanInstanceUrl = instanceUrl.replace(/^https?:\/\//, '').replace(/\/$/, '');
    const url = `https://${cleanInstanceUrl}${endpoint}`;
    
    const headers = {
        'Authorization': `Bearer ${accessToken}`,
        ...options.headers
    };

    const response = await fetch(url, { ...options, headers });

    if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
    }

    if (response.status === 204 || response.status === 202) {
        return {};
    }

    return response.json();
}


/**
 * A helper function to upload media files.
 * @returns {Promise<object>} The JSON response containing the media ID.
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
