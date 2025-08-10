export async function apiFetch(instance, token, endpoint, options = {}, isLemmy = false) {
    const headers = {
        'Content-Type': 'application/json',
    };

    if (!isLemmy && token) {
        headers['Authorization'] = `Bearer ${token}`;
    }
    
    // For Lemmy, authentication is handled differently (e.g., JWT in body or headers)
    // This is a placeholder for where you'd add Lemmy auth logic
    if (isLemmy && options.jwt) {
        // headers['Authorization'] = `Bearer ${options.jwt}`;
    }

    const config = {
        method: 'GET',
        ...options,
        headers: {
            ...headers,
            ...options.headers,
        },
    };

    const response = await fetch(`https://${instance}${endpoint}`, config);

    if (!response.ok) {
        const error = await response.json().catch(() => ({ message: response.statusText }));
        throw new Error(error.error || error.message || 'API request failed');
    }
    
    if (response.status === 204) { // No Content
        return null;
    }

    return response.json();
}

export function getPersistedCredentials() {
    const instanceUrl = localStorage.getItem('feedstadon_instance');
    const accessToken = localStorage.getItem('feedstadon_token');
    return { instanceUrl, accessToken };
}
