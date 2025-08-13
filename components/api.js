import { showToast } from './ui.js';

/**
 * A generic fetch wrapper for making API calls to Mastodon or Lemmy instances.
 * @param {string} instanceUrl - The base URL of the instance.
 * @param {string} accessToken - The user's access token (for Mastodon).
 * @param {string} endpoint - The API endpoint to call (e.g., '/api/v1/timelines/home').
 * @param {object} options - Standard fetch options (method, body, headers).
 * @param {string} platform - The platform ('mastodon' or 'lemmy').
 * @param {object} params - A key-value object of URL query parameters.
 * @returns {Promise<object>} - A promise that resolves to the JSON response data and headers.
 */
export async function apiFetch(instanceUrl, accessToken, endpoint, options = {}, platform = 'mastodon', params = {}) {
    const defaultHeaders = {
        'Content-Type': 'application/json',
    };

    // Handle authentication based on the platform
    if (platform === 'mastodon' && accessToken) {
        defaultHeaders['Authorization'] = `Bearer ${accessToken}`;
    } else if (platform === 'lemmy' || platform === 'piefed') {  // ← ADD "|| platform === 'piefed'" here
        const jwt = localStorage.getItem('lemmy_jwt') || localStorage.getItem('piefed_jwt');  // ← ADD "|| localStorage.getItem('piefed_jwt')" here
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

    // ADD this new section to handle different API endpoints for PieFed vs Lemmy
    let finalEndpoint = endpoint;
    if (platform === 'piefed') {
        finalEndpoint = convertLemmyToPieFedEndpoint(endpoint);
    }

    // Construct the URL and append any query parameters
    const url = new URL(`https://${instanceUrl}${finalEndpoint}`);  // ← Change "endpoint" to "finalEndpoint"
    if (params) {
        Object.keys(params).forEach(key => {
            if (params[key] !== undefined && params[key] !== null) {
                url.searchParams.append(key, params[key]);
            }
        });
    }

    // Rest of your existing apiFetch function remains the same...
    try {
        const response = await fetch(url.toString(), config);

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
    const jwt = localStorage.getItem('lemmy_jwt');
    if (!lemmyInstance || !jwt) {
        showToast("You must be logged in to upload images.");
        return null;
    }

    const formData = new FormData();
    formData.append('images[]', file);

    try {
        const response = await fetch(`https://${lemmyInstance}/pictrs/image`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${jwt}`
            },
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
// ADD these functions to your existing components/api.js file
// Do NOT replace the entire file - just add these functions

/**
 * Detect if an instance is PieFed vs Lemmy
 */
export async function detectInstanceType(instanceUrl) {
    try {
        // Try PieFed's nodeinfo endpoint first
        const piefedResponse = await fetch(`https://${instanceUrl}/nodeinfo/2.0.json`);
        if (piefedResponse.ok) {
            const nodeinfo = await piefedResponse.json();
            if (nodeinfo.software && nodeinfo.software.name === 'piefed') {
                return 'piefed';
            }
        }
        
        // Try Lemmy's site info endpoint
        const lemmyResponse = await fetch(`https://${instanceUrl}/api/v3/site`);
        if (lemmyResponse.ok) {
            const siteInfo = await lemmyResponse.json();
            if (siteInfo.site_view) {
                return 'lemmy';
            }
        }
        
        // Default to lemmy if we can't determine
        return 'lemmy';
    } catch (error) {
        console.warn('Could not detect instance type:', error);
        return 'lemmy'; // Default fallback
    }
}

/**
 * Convert Lemmy API endpoints to PieFed equivalents
 */
function convertLemmyToPieFedEndpoint(lemmyEndpoint) {
    // Map common Lemmy endpoints to PieFed equivalents
    const endpointMap = {
        '/api/v3/post/list': '/api/posts',
        '/api/v3/community': '/api/community',
        '/api/v3/user': '/api/user',
        '/api/v3/comment/list': '/api/comments',
        '/api/v3/site': '/api/site',
        '/api/v3/user/login': '/api/login',
    };

    // Check if we have a direct mapping
    for (const [lemmy, piefed] of Object.entries(endpointMap)) {
        if (lemmyEndpoint.startsWith(lemmy)) {
            return lemmyEndpoint.replace(lemmy, piefed);
        }
    }

    // If no mapping found, return original (might work or might not)
    console.warn(`No PieFed mapping found for Lemmy endpoint: ${lemmyEndpoint}`);
    return lemmyEndpoint;
}
