/**
 * A helper function to make authenticated JSON API requests.
 */
export async function apiFetch(instanceUrl, accessToken, endpoint, options = {}) {
    const cleanInstanceUrl = instanceUrl.replace(/^https?:\/\//, '').replace(/\/$/, '');
    const url = `https://${cleanInstanceUrl}${endpoint}`;
    
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
