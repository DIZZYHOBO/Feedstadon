// A generic fetch wrapper with Mastodon and Lemmy authentication logic
export async function apiFetch(instance, token, endpoint, options = {}, authType = 'mastodon', params = {}) {
    const url = new URL(`https://${instance}${endpoint}`);
    
    // Add query parameters if any
    Object.keys(params).forEach(key => url.searchParams.append(key, params[key]));

    options.headers = options.headers || {};

    // Authentication logic
    if (authType === 'mastodon') {
        if (token) {
            options.headers['Authorization'] = `Bearer ${token}`;
        }
    } else if (authType === 'lemmy') {
        const lemmyToken = localStorage.getItem('lemmy_jwt');
        if (lemmyToken) {
            options.headers['Authorization'] = `Bearer ${lemmyToken}`;
            
            // Add 'auth' to the body for POST/PUT requests
            if (options.method === 'POST' || options.method === 'PUT') {
                if (options.body) {
                    options.body.auth = lemmyToken;
                } else {
                    options.body = { auth: lemmyToken };
                }
            }
        }
    }

    if (options.body && typeof options.body === 'object') {
        options.headers['Content-Type'] = 'application/json';
        options.body = JSON.stringify(options.body);
    }
    
    try {
        const response = await fetch(url, options);
        if (!response.ok) {
            let errorBody;
            try {
                errorBody = await response.json();
            } catch (e) {
                errorBody = { error: 'Could not read error response body.' };
            }
            throw new Error(`HTTP ${response.status}: ${JSON.stringify(errorBody)}`);
        }
        const data = await response.json();
        return { data, headers: response.headers };
    } catch (err) {
        console.error('API Fetch Error:', err);
        throw err;
    }
}

// Specific wrapper for updating credentials with multipart/form-data
export async function apiUpdateCredentials(state, formData) {
    const url = `https://${state.instanceUrl}/api/v1/accounts/update_credentials`;
    const options = {
        method: 'PATCH',
        headers: { 'Authorization': `Bearer ${state.accessToken}` },
        body: formData,
    };

    const response = await fetch(url, options);
    if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
    }
    return response.json();
}


// Wrapper for uploading media to Mastodon
export async function apiUploadMedia(state, file) {
    const url = `https://${state.instanceUrl}/api/v2/media`;
    const formData = new FormData();
    formData.append('file', file);

    const options = {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${state.accessToken}` },
        body: formData,
    };
    
    const response = await fetch(url, options);
    if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
    }
    return response.json();
}

// Wrapper for uploading an image to Lemmy's pictrs
export async function apiUploadLemmyImage(instance, token, file) {
    const url = `https://${instance}/pictrs/image`;
    const formData = new FormData();
    formData.append('images[]', file);

    const options = {
        method: 'POST',
        // Pictrs uses a cookie/jwt for auth, which should be handled by the browser's fetch automatically if logged in
        // but we'll include it in the headers just in case for some setups
        headers: token ? { 'Authorization': `Bearer ${token}` } : {},
        body: formData,
    };
    
    const response = await fetch(url, options);
    if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
    }
    return response.json();
}
