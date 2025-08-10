export async function apiFetch(instanceUrl, accessToken, endpoint, options = {}) {
    if (!instanceUrl || !accessToken) {
        console.error("API call without credentials. Endpoint:", endpoint);
        // Silently fail if no credentials, as it's likely during login flow.
        return Promise.reject("Missing credentials");
    }

    const isLemmyApi = endpoint.startsWith('/api/v3/');
    // TODO: Make the Lemmy instance configurable
    const lemmyInstance = 'https://lemmy.world';
    
    const url = new URL(isLemmyApi ? `${lemmyInstance}${endpoint}` : `${instanceUrl}${endpoint}`);

    const headers = {
        'Authorization': `Bearer ${accessToken}`
    };

    if (options.method === 'POST' && !(options.body instanceof FormData)) {
        headers['Content-Type'] = 'application/json';
    }
    
    const config = {
        method: options.method || 'GET',
        headers: headers,
        ...options
    };
    
    const finalUrl = options.endpointOverride ? new URL(`${instanceUrl}${options.endpointOverride}`) : url;

    try {
        const response = await fetch(finalUrl, config);
        
        if (response.status === 204 || response.status === 201) { // No Content or Created
            return { response, data: {} };
        }

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'API request failed');
        }

        return { response, data };
    } catch (error) {
        console.error(`API Fetch Error to ${finalUrl.toString()}:`, error);
        throw error;
    }
}

export function getPersistedCredentials() {
    return {
        instanceUrl: localStorage.getItem('feedstadon_instance'),
        accessToken: localStorage.getItem('feedstadon_token')
    };
}
