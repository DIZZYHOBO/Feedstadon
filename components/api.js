import { showToast } from './ui.js';

export async function apiFetch(instanceUrl, accessToken, endpoint, options = {}, platform = 'mastodon') {
    const defaultHeaders = {
        'Content-Type': 'application/json',
    };

    // Handle authentication based on the platform
    if (platform === 'mastodon' && accessToken) {
        defaultHeaders['Authorization'] = `Bearer ${accessToken}`;
    } else if (platform === 'lemmy') {
        const jwt = localStorage.getItem('lemmy_jwt');
        if (jwt) {
            defaultHeaders['Authorization'] = `Bearer ${jwt}`;
        }
    }
    
    const config = {
        method: options.method || 'GET',
        headers: { ...defaultHeaders, ...options.headers },
    };

    if (options.body) {
        config.body = JSON.stringify(options.body);
    }

    try {
        const response = await fetch(`https://${instanceUrl}${endpoint}`, config);

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ message: 'Unknown error' }));
            throw new Error(`HTTP error! status: ${response.status}, message: ${errorData.error || errorData.message || 'Unknown error'}`);
        }

        const data = await response.json();
        return { data, headers: response.headers };

    } catch (error) {
        console.error('API Fetch Error:', error);
        showToast(`API Request Failed: ${error.message}`);
        throw error;
    }
}

export async function apiUploadMedia(instanceUrl, accessToken, file) {
    const formData = new FormData();
    formData.append('file', file);

    try {
        const response = await fetch(`https://${instanceUrl}/api/v2/media`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
            },
            body: formData,
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Media upload failed');
        }

        const data = await response.json();
        return data; // This object should contain the media attachment ID
    } catch (error) {
        console.error('API Media Upload Error:', error);
        showToast(`Media Upload Failed: ${error.message}`);
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
        // The CORS issue prevents us from sending credentials to this endpoint from a different origin.
        // We must upload anonymously.
        const response = await fetch(`https://${lemmyInstance}/pictrs/image`, {
            method: 'POST',
            body: formData,
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.msg || 'Image upload failed');
        }

        const result = await response.json();
        if (result.files && result.files.length > 0) {
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
