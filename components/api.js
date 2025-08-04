// components/api.js

/**
 * Helper function to make API requests to the Lemmy instance.
 * @param {string} endpoint The API endpoint (e.g., '/api/v3/comment/list').
 * @param {object} params Optional query parameters.
 * @param {string} baseUrl The base URL of the Lemmy instance (e.g., 'https://lemmy.world').
 */
async function apiFetch(endpoint, params = {}, baseUrl) {
    if (!baseUrl) {
        console.error("apiFetch called without a baseUrl.");
        throw new Error("Instance URL not provided.");
    }

    // Ensure the endpoint starts with a slash
    if (!endpoint.startsWith('/')) {
        endpoint = '/' + endpoint;
    }

    // Ensure baseUrl does not have a trailing slash
    const cleanBaseUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;

    const url = new URL(cleanBaseUrl + endpoint);
    
    // Safely construct query parameters for GET requests
    const searchParams = new URLSearchParams();
    Object.keys(params).forEach(key => {
        const value = params[key];
        // Exclude null or undefined parameters, which can cause 400 errors in Lemmy API
        if (value !== undefined && value !== null) {
            searchParams.append(key, value.toString());
        }
    });

    url.search = searchParams.toString();

    // console.log("DEBUG API Fetch:", url.toString());

    const response = await fetch(url, {
        method: 'GET',
        headers: {
            'Accept': 'application/json',
        }
    });

    if (!response.ok) {
        // ENHANCED ERROR LOGGING: Read the response body for details on the 400 error
        let errorDetail = '';
        try {
            // Attempt to parse JSON first, as Lemmy often returns JSON errors, fallback to text
            const contentType = response.headers.get("content-type");
            if (contentType && contentType.indexOf("application/json") !== -1) {
                const errorBody = await response.json();
                // Lemmy often returns the specific error in the "error" field
                errorDetail = errorBody.error || JSON.stringify(errorBody);
            } else {
                errorDetail = await response.text();
            }
        } catch (e) {
            errorDetail = 'Could not read response body.';
        }
        
        console.error(`API Error Detail: HTTP ${response.status} - Request: ${url} - Detail: ${errorDetail}`);
        throw new Error(`HTTP ${response.status}: ${errorDetail}`);
    }

    return response.json();
}

// Ensure this function is globally available if not using modules
// window.apiFetch = apiFetch;
