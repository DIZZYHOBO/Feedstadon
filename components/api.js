import { showLoadingBar, hideLoadingBar } from './ui.js';

export async function apiFetch(instance, token, endpoint, options = {}, authType = 'mastodon', params = null) {
    showLoadingBar();
    
    let url;
    if (instance.startsWith('http')) {
        url = new URL(instance);
        url.pathname = endpoint;
    } else {
        url = new URL(`https://${instance}${endpoint}`);
    }

    if (params) {
        Object.keys(params).forEach(key => url.searchParams.append(key, params[key]));
    }

    const headers = {};
    if (authType === 'mastodon' && token) {
        headers['Authorization'] = `Bearer ${token}`;
    } else if (authType === 'lemmy') {
        const jwt = localStorage.getItem('lemmy_jwt');
        if (jwt) {
            headers['Authorization'] = `Bearer ${jwt}`;
        }
    }

    let body;
    if (options.body) {
        // BUG FIX: The Lemmy API (v3) rejects requests if auth is present in both the header and the body.
        // This ensures the `auth` token from the body is removed for Lemmy requests,
        // relying solely on the correct Authorization header method.
        if (authType === 'lemmy' && options.body.auth) {
            delete options.body.auth;
        }
        
        if (options.body instanceof FormData) {
            body = options.body;
        } else {
            headers['Content-Type'] = 'application/json';
            body = JSON.stringify(options.body);
        }
    }

    try {
        const response = await fetch(url, {
            method: options.method || 'GET',
            headers: headers,
            body: body
        });

        if (!response.ok) {
            let errorMsg = `HTTP error! status: ${response.status}`;
            try {
                const errorBody = await response.json();
                errorMsg = errorBody.error || errorMsg;
            } catch (e) {
                // Ignore if response is not JSON
            }
            const error = new Error(errorMsg);
            error.response = response;
            throw error;
        }

        const responseData = await response.json();

        return { data: responseData, headers: response.headers };

    } catch (error) {
        console.error('API Fetch Error:', error);
        throw error;
    } finally {
        hideLoadingBar();
    }
}
