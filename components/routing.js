let currentRoutes = {};

/**
 * Converts a route path string (e.g., '/profile/:id') into a regular expression
 * for matching against the current URL hash.
 * @param {string} path - The route path.
 * @returns {RegExp}
 */
function pathToRegex(path) {
    const regexPath = path.replace(/:(\w+)/g, '([^/]+)');
    return new RegExp(`^${regexPath}$`);
}

/**
 * The main router function. It checks the current URL hash against the list
 * of registered routes and calls the handler for the first match.
 */
function router() {
    const path = window.location.hash.slice(1) || '/';

    for (const route in currentRoutes) {
        const regex = pathToRegex(route);
        const match = path.match(regex);

        if (match) {
            const params = match.slice(1);
            const handler = currentRoutes[route];
            handler(...params); // Call the route handler with URL parameters
            return;
        }
    }

    // Optional: Handle 404 or redirect to a default route if no match is found
    if (currentRoutes['/']) {
        // Default fallback to the home route
        currentRoutes['/']();
    }
}

/**
 * Sets up the router by saving the routes object and adding a listener
 * for hash changes in the URL.
 * @param {object} routes - An object mapping route paths to handler functions.
 * @param {object} state - The main application state (not directly used here but good practice).
 */
export function setupRouting(routes, state) {
    currentRoutes = routes;
    window.addEventListener('hashchange', router);
    document.addEventListener('DOMContentLoaded', router); // Handle initial page load
}

/**
 * Programmatically navigates to a new path by changing the URL hash.
 * @param {string} path - The new path to navigate to (e.g., '/settings').
 */
export function navigate(path) {
    window.location.hash = path;
}
