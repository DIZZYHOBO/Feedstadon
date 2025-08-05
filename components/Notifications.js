/**
 * Parses a raw Lemmy notification object into a standardized format for rendering.
 * This makes the code resilient to different notification structures.
 * @param {object} notification - The raw notification object from the Lemmy API.
 * @returns {object|null} A standardized object with details for rendering, or null if the notification is unknown or malformed.
 */
function parseNotification(notification) {
    // You can enable this log to inspect the exact structure of any new or failing notifications.
    // console.log("Processing notification object:", notification);

    try {
        if (notification.comment_reply) {
            const data = notification.comment_reply;
            return {
                actor: data.creator, // The user who replied
                actionText: 'replied to your comment on',
                post: data.post,
                community: data.community,
                link: data.comment_reply.ap_id, // Link to the new comment
                type: 'CommentReply'
            };
        }

        if (notification.post_like) {
            const data = notification.post_like;
            return {
                actor: data.creator, // The user who liked the post
                actionText: 'liked your post',
                post: data.post,
                community: data.community,
                link: data.post.ap_id,
                type: 'PostLike'
            };
        }
        
        if (notification.comment_like) {
            const data = notification.comment_like;
            return {
                actor: data.creator, // The user who liked the comment
                actionText: 'liked your comment on',
                post: data.post,
                community: data.community,
                link: data.comment.ap_id, // Link to the liked comment
                type: 'CommentLike'
            };
        }
        
        if (notification.person_mention) {
            const data = notification.person_mention;
            return {
                actor: data.creator, // The user who mentioned you
                actionText: 'mentioned you in a comment on',
                post: data.post,
                community: data.community,
                link: data.comment.ap_id,
                type: 'Mention'
            };
        }

        // --- ADD OTHER NOTIFICATION TYPES HERE ---
        // e.g., if (notification.new_post_subscriber) { ... }

        // If notification type is not recognized, return null
        return null;

    } catch (error) {
        // This catch block will grab any unexpected errors during parsing
        console.error("Failed to parse a notification due to an unexpected error:", error);
        console.error("The problematic notification object was:", notification);
        return null;
    }
}

/**
 * Fetches notifications and renders them to the page.
 */
async function renderNotificationsPage() {
    // Assuming you have a function like this to get notifications from your backend/API
    const response = await fetch('/api/lemmy/notifications'); // Replace with your actual API endpoint
    const notifications = await response.json();

    const notificationContainer = document.getElementById('notifications-container'); // Assuming a container element exists
    if (!notificationContainer) {
        console.error("Notifications container not found!");
        return;
    }
    notificationContainer.innerHTML = ''; // Clear previous notifications

    if (!notifications || notifications.length === 0) {
        notificationContainer.innerHTML = '<p>No new notifications.</p>';
        return;
    }

    // This loop now uses the robust parser function
    for (const rawNotification of notifications) {
        const parsedData = parseNotification(rawNotification);

        if (parsedData) {
            // --- THIS FIXES THE 'GET .../undefined' ERROR ---
            // Because we correctly parse the data, `parsedData.actor.id` will now be a valid number,
            // not `undefined`. Any subsequent fetch that uses this ID will now work correctly.
            const actorId = parsedData.actor?.id; 
            const actorAvatarUrl = parsedData.actor?.avatar ?? 'default_avatar.png';
            const actorName = parsedData.actor?.name ?? 'An unknown user';
            const postName = parsedData.post?.name ?? 'a post';
            
            // Example of a subsequent fetch that would have failed before
            // Note: This is just for demonstration. You might build your HTML directly.
            if (!actorId) {
                console.warn("Could not make subsequent fetch because actor ID is missing.", parsedData);
            } else {
                // This URL will now be valid, e.g., "https://feedstodon.afsapp.lol/user/12345"
                // const userDetails = await fetch(`https://feedstodon.afsapp.lol/user/${actorId}`);
            }

            // Create and append the notification element
            const notificationElement = document.createElement('div');
            notificationElement.className = 'notification-item';
            notificationElement.innerHTML = `
                <img src="${actorAvatarUrl}" class="avatar" alt="${actorName}'s avatar">
                <div class="notification-content">
                    <strong>${actorName}</strong> ${parsedData.actionText} <strong><a href="${parsedData.link}">${postName}</a></strong>.
                </div>
            `;
            notificationContainer.appendChild(notificationElement);

        } else {
            // This is the new, intentional "skipping" message for unhandled types.
            console.log('Skipping unhandled or malformed Lemmy notification:', rawNotification);
        }
    }
}

// You would call this function from your app's main logic, for example in app.js
// renderNotificationsPage();
