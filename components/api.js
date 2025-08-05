/**
 * A helper function to make authenticated JSON API requests.
 * It now filters out null/undefined params and provides detailed error messages.
 */
export async function apiFetch(instanceUrl, token, endpoint, options = {}, authType = 'mastodon', params = null) {
    if (!instanceUrl) {
        throw new Error("Instance URL is not provided.");
    }
    
    let url;
    const cleanInstanceUrl = instanceUrl.replace(/^https?:\/\//, '').replace(/\/$/, '');
    
    // Check if the endpoint is already a full URL (for pagination)
    if (endpoint.startsWith('http')) {
        url = new URL(endpoint);
    } else {
        url = new URL(`https://${cleanInstanceUrl}${endpoint}`);
    }

    // Append valid parameters to the URL from the params object
    if (params) {
        for (const key in params) {
            if (params[key] !== null && params[key] !== undefined) {
                url.searchParams.append(key, params[key]);
            }
        }
    }
    
    const headers = {
        ...options.headers
    };

    let authToken = token;
    if (authType === 'lemmy') {
        authToken = localStorage.getItem('lemmy_jwt');
    }

    if (authToken && authType !== 'none') {
        headers['Authorization'] = `Bearer ${authToken}`;
    }

    const response = await fetch(url.toString(), { ...options, headers });

    if (!response.ok) {
        let errorBody = 'Could not read error response body.';
        try {
            // Try to parse the error response as JSON, otherwise read as text
            const errorData = await response.json();
            errorBody = JSON.stringify(errorData);
        } catch (e) {
            try {
                errorBody = await response.text();
            } catch (e2) {
                // Ignore if text also fails
            }
        }
        throw new Error(`HTTP ${response.status}: ${errorBody}`);
    }

    if (response.status === 204 || response.status === 202) {
        return { data: {} };
    }

    const data = await response.json();
    return { data };
}


/**
 * A helper function to upload media files for posts.
 */
export async function apiUploadMedia(state, file) {
    if (!state.instanceUrl) throw new Error("Instance URL not configured.");
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

export async function apiUploadLemmyImage(instanceUrl, token, file) {
    const cleanInstanceUrl = instanceUrl.replace(/^https?:\/\//, '').replace(/\/$/, '');
    const url = `https://${cleanInstanceUrl}/pictrs/image`;
    
    const formData = new FormData();
    formData.append('images[]', file);

    const response = await fetch(url, {
        method: 'POST',
        body: formData,
        headers: { 'Authorization': `Bearer ${token}` }
    });

    if (!response.ok) {
        throw new Error(`Lemmy image upload failed: HTTP ${response.status}`);
    }

    return response.json();
}


/**
 * A helper function to update user profile credentials.
 */
export async function apiUpdateCredentials(state, formData) {
    if (!state.instanceUrl) throw new Error("Instance URL not configured.");
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
