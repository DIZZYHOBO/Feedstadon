import { showToast } from './ui.js';

export async function apiFetch(instanceUrl, accessToken, endpoint, options = {}, platform = 'mastodon') {
    const defaultHeaders = {
        'Content-Type': 'application/json',
    };

    if (platform === 'mastodon') {
        if (accessToken) {
            defaultHeaders['Authorization'] = `Bearer ${accessToken}`;
        }
    }
    
    const config = {
        method: options.method || 'GET',
        headers: { ...defaultHeaders, ...options.headers },
    };

    if (options.body) {
        config.body = JSON.stringify(options.body);
    }
    
    if (platform === 'lemmy') {
        const jwt = localStorage.getItem('lemmy_jwt');
        if (jwt) {
             // Lemmy uses a different auth method for some requests
            if (config.body) {
                const body = JSON.parse(config.body);
                body.auth = jwt;
                config.body = JSON.stringify(body);
            }
        }
    }

    try {
        const response = await fetch(`https://${instanceUrl}${endpoint}`, config);

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ message: 'Unknown error' }));
            throw new Error(`HTTP error! status: ${response.status}, message: ${errorData.message}`);
        }

        const data = await response.json();
        return { data, headers: response.headers };

    } catch (error) {
        console.error('API Fetch Error:', error);
        showToast(`API Request Failed: ${error.message}`);
        throw error;
    }
}

export async function lemmyImageUpload(file) {
    const lemmyInstance = localStorage.getItem('lemmy_instance');
    if (!lemmyInstance) {
        showToast("Lemmy instance not found.");
        return null;
    }

    const formData = new FormData();
    formData.append('images[]', file);

    try {
        const response = await fetch(`https://${lemmyInstance}/pictrs/image`, {
            method: 'POST',
            body: formData,
            // Note: Don't set Content-Type header, the browser does it for FormData
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.msg || 'Image upload failed');
        }

        const result = await response.json();
        if (result.files && result.files.length > 0) {
            // The URL is constructed using the instance and the returned file key
            return `https://${lemmyInstance}/pictrs/image/${result.files[0].file}`;
        } else {
            throw new Error('Image upload returned no files.');
        }
    } catch (error) {
        console.error('Lemmy Image Upload Error:', error);
        showToast(`Image Upload Failed: ${error.message}`);
        return null;
    }
}
