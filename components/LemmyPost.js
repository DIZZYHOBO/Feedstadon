// components/LemmyPost.js

// Assuming apiFetch is available globally 

// ====================================================================
// Main Post Rendering
// ====================================================================

/**
 * Main function to render the entire Post Page (Post details + comments).
 * This function is likely called by app.js (showLemmyPostDetail).
 */
async function renderLemmyPostPage(postId, instanceUrl) {
    // Assuming 'app-content' is your main container, adjust if necessary
    const container = document.getElementById('app-content') || document.body; 
    container.innerHTML = '<p>Loading post and comments...</p>';

    // --- FIX FOR HTTP 400: Validate postId early ---
    const postIdInt = parseInt(postId, 10);
    if (isNaN(postIdInt) || !instanceUrl) {
        container.innerHTML = `<p class="error">Invalid Post ID or Instance URL.</p>`;
        return;
    }
    // -----------------------------------------------

    // 1. Fetch the Post Details
    try {
        // Endpoint: /api/v3/post/get
        const postResponse = await apiFetch('/api/v3/post/get', { id: postIdInt }, instanceUrl);
        const postView = postResponse.post_view;

        if (!postView) {
            container.innerHTML = '<p class="error">Post not found.</p>';
            return;
        }

        // 2. Render Post Details (Customize this HTML to fit your existing style)
        container.innerHTML = `
            <div class="lemmy-post-detail">
                <h1>${escapeHtml(postView.post.name)}</h1>
                <div class="post-meta">
                    Posted by ${escapeHtml(postView.creator.display_name || postView.creator.name)} 
                    in !${escapeHtml(postView.community.name)} • Score: ${postView.counts.score}
                </div>
                <div class="post-body">
                    ${postView.post.body ? escapeHtml(postView.post.body) : ''}
                </div>
                <hr>
                <h2>Comments</h2>
                <!-- Container required for the comment rendering logic -->
                <div id="lemmy-comments-section">
                    <p>Loading comments...</p>
                </div>
            </div>
        `;

        // 3. Fetch and Render Comments
        // We pass the validated integer ID
        fetchAndRenderComments(postIdInt, instanceUrl);

    } catch (error) {
        console.error("Error rendering Lemmy post page:", error);
        container.innerHTML = `<p class="error">Failed to load post details. ${error.message}</p>`;
    }
}

// ====================================================================
// Comment Fetching and Rendering
// ====================================================================

/**
 * Fetches comments for a given post and initiates the rendering process.
 */
async function fetchAndRenderComments(postIdInt, instanceUrl) {
    // postIdInt is already validated by renderLemmyPostPage
    const commentsContainer = document.getElementById('lemmy-comments-section');

    if (!commentsContainer) {
        console.error("Comments container not found in the DOM.");
        return;
    }

    try {
        // Correct parameters for GET /api/v3/comment/list
        const response = await apiFetch('/api/v3/comment/list', {
            post_id: postIdInt, // This is required, fixing the HTTP 400
            sort: 'Hot',        // Adjust sorting as needed (Hot, Top, New)
            max_depth: 10       // Crucial for fetching nested comments
        }, instanceUrl);

        const comments = response.comments;

        if (!comments || comments.length === 0) {
            commentsContainer.innerHTML = '<p>No comments yet.</p>';
            return;
        }

        // Transform the flat list into a hierarchical structure
        const commentTree = buildCommentTree(comments);
        
        // Render the tree
        commentsContainer.innerHTML = ''; // Clear "Loading comments..."
        renderCommentTree(commentTree, commentsContainer);

    } catch (error) {
        // This catches the error thrown by the improved apiFetch
        console.error('Failed to load Lemmy comments:', error);
        if (commentsContainer) {
            commentsContainer.innerHTML = `<p class="error">Failed to load comments. Check console for details. Error: ${error.message}</p>`;
        }
    }
}

/**
 * Transforms Lemmy's flat list of CommentViews into a hierarchical tree using the 'path' property.
 */
function buildCommentTree(comments) {
    const map = {};
    const roots = [];

    // 1. Initialize map and 'children' property for all comments.
    comments.forEach(commentView => {
        // Add a 'children' array to the object structure
        commentView.children = []; 
        map[commentView.comment.id] = commentView;
    });

    // 2. Build the hierarchy based on the 'path' property.
    comments.forEach(commentView => {
        // Path format: "0.id1.id2.id3" (0 is the root, followed by comment IDs)
        const pathIds = commentView.comment.path.split('.');
        
        // Path "0.id" means it's a top-level comment (replying directly to the post).
        if (pathIds.length <= 2) {
            roots.push(commentView);
        } else {
            // The parent is the second to last ID in the path.
            // Example: Path 0.100.150. Comment 150's parent is 100.
            const parentId = pathIds[pathIds.length - 2];
            const parent = map[parentId];

            if (parent) {
                parent.children.push(commentView);
            } else {
                // This might happen if the parent was deleted or not included in the API response
                console.warn("Orphan comment detected (parent not found):", commentView.comment.id);
            }
        }
    });

    return roots;
}

/**
 * Recursively renders the comment tree into the specified container.
 */
function renderCommentTree(comments, container) {
    comments.forEach(commentView => {
        const commentElement = createCommentElement(commentView);
        container.appendChild(commentElement);

        // Check if this comment has replies (children)
        if (commentView.children && commentView.children.length > 0) {
            // Create a container for the replies
            const repliesContainer = document.createElement('div');
            // This class is crucial for the nested styling (indentation)
            repliesContainer.className = 'comment-replies-container'; 
            commentElement.appendChild(repliesContainer);
            
            // Recursive call to render the children into the replies container
            renderCommentTree(commentView.children, repliesContainer);
        }
    });
}

/**
 * Creates the HTML element for a single comment.
 * IMPORTANT: Customize this HTML structure to match your application's existing style/theme.
 */
function createCommentElement(commentView) {
    const commentDiv = document.createElement('div');
    commentDiv.className = 'lemmy-comment';
    commentDiv.id = `comment-${commentView.comment.id}`;

    const author = commentView.creator.display_name || commentView.creator.name;
    const content = commentView.comment.content; 
    const score = commentView.counts.score;
    const published = new Date(commentView.comment.published).toLocaleString();

    // Basic structure (Integrate your own styling/classes here)
    // We use escapeHtml for safety. A Markdown parser is recommended for production.
    commentDiv.innerHTML = `
        <div class="comment-header">
            <strong class="comment-author">${escapeHtml(author)}</strong>
            <span class="comment-meta">Score: ${score} • ${published}</span>
        </div>
        <div class="comment-body">
            ${escapeHtml(content)} 
        </div>
    `;

    return commentDiv;
}

// ====================================================================
// Utilities
// ====================================================================

/**
 * Utility function to prevent XSS when inserting user content.
 * If you integrate a Markdown parser later, use its sanitizer instead.
 */
function escapeHtml(unsafe) {
    if (!unsafe) return '';
    return unsafe
         .replace(/&/g, "&amp;")
         .replace(/</g, "&lt;")
         .replace(/>/g, "&gt;")
         .replace(/"/g, "&quot;")
         .replace(/'/g, "&#039;");
}
