import { showLoadingBar, hideLoadingBar, showToast, showSuccessToast, showErrorToast, showWarningToast } from './ui.js';
import { ICONS } from './icons.js';
import { formatTimestamp } from './utils.js';

// Blog API base URL - using your Netlify Functions
const BLOG_API_BASE = 'https://b.afsapp.lol';

// Utility function to make blog API requests with better CORS handling
async function blogApiRequest(endpoint, options = {}) {
    const url = `${BLOG_API_BASE}${endpoint}`;
    const config = {
        method: options.method || 'GET',
        mode: 'cors',
        credentials: 'omit',
        headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'Origin': window.location.origin,
            ...options.headers
        },
        ...options
    };
    
    // Remove body if it's a GET request
    if (config.method === 'GET') {
        delete config.body;
    }
    
    try {
        console.log(`Making blog API request to: ${url}`);
        const response = await fetch(url, config);
        
        if (!response.ok) {
            let errorMessage;
            try {
                const errorData = await response.json();
                errorMessage = errorData.message || `HTTP ${response.status}: ${response.statusText}`;
            } catch (e) {
                errorMessage = `HTTP ${response.status}: ${response.statusText}`;
            }
            throw new Error(errorMessage);
        }
        
        const data = await response.json();
        console.log('Blog API response:', data);
        return data;
    } catch (error) {
        console.error('Blog API request failed:', error);
        
        // Check if it's a CORS error
        if (error.message.includes('Failed to fetch') || error.message.includes('CORS')) {
            throw new Error('Unable to connect to blog service. Please check your internet connection or try again later.');
        }
        
        throw error;
    }
}

// Alternative blog API request using different endpoints
async function fallbackBlogApiRequest(endpoint, options = {}) {
    // Try different endpoint patterns that might work better
    const alternativeEndpoints = [
        `${BLOG_API_BASE}${endpoint}`,
        `${BLOG_API_BASE}/.netlify/functions${endpoint}`,
        `${BLOG_API_BASE}/api${endpoint}`
    ];
    
    for (const url of alternativeEndpoints) {
        try {
            console.log(`Trying fallback blog API request to: ${url}`);
            const config = {
                method: options.method || 'GET',
                mode: 'cors',
                credentials: 'omit',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    ...options.headers
                },
                ...options
            };
            
            if (config.method === 'GET') {
                delete config.body;
            }
            
            const response = await fetch(url, config);
            
            if (response.ok) {
                const data = await response.json();
                console.log('Fallback blog API response:', data);
                return data;
            }
        } catch (error) {
            console.warn(`Fallback attempt failed for ${url}:`, error);
            continue;
        }
    }
    
    throw new Error('All blog API endpoints failed. Service may be temporarily unavailable.');
}

// Render a blog post card in Lemmy style
function renderBlogPostCard(post, state, actions) {
    const card = document.createElement('div');
    card.className = 'status lemmy-card blog-post-card';
    card.dataset.id = post.slug || post.id;

    const isOwner = state.blogUsername && post.author && post.author.includes(state.blogUsername);
    const isLoggedIn = state.blogAuth;
    
    // Create a blog icon similar to how Lemmy shows community icons
    const blogIcon = '📚'; // You can replace this with a proper blog icon
    
    // Process summary/description with markdown if needed
    const summary = post.description || post.content_preview || post.content?.substring(0, 200) + '...' || '';
    let summaryHTML = summary;
    
    // Simple markdown processing for summary
    if (summary.includes('*') || summary.includes('#')) {
        summaryHTML = summary
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*(.*?)\*/g, '<em>$1</em>')
            .replace(/`(.*?)`/g, '<code>$1</code>');
    }

    card.innerHTML = `
        <div class="status-body-content">
            <div class="status-header">
                <div class="status-header-main">
                    <div class="blog-icon-wrapper" style="width: 40px; height: 40px; display: flex; align-items: center; justify-content: center; background-color: var(--accent-color); border-radius: var(--border-radius); color: white; font-size: 20px;">
                        ${blogIcon}
                    </div>
                    <div>
                        <span class="display-name">Blog</span>
                        <span class="acct">posted by ${post.author || 'Unknown'} · ${formatTimestamp(post.published || post.created_at)}</span>
                    </div>
                </div>
                <div class="status-header-side">
                    ${isOwner ? `<button class="post-options-btn" title="More options">${ICONS.lemmyDownvote}</button>` : ''}
                    <div class="blog-icon-indicator">📚</div>
                </div>
            </div>
            <div class="status-content">
                <h3 class="lemmy-title blog-title">${post.title}</h3>
                <div class="lemmy-post-body blog-summary">${summaryHTML}</div>
            </div>
        </div>
        <div class="status-footer">
            <button class="status-action" data-action="view-post" title="Read full post">${ICONS.comments || '💬'} Read</button>
            <button class="status-action" data-action="share" title="Share post">${ICONS.share || '🔗'} Share</button>
            ${isLoggedIn && isOwner ? `
                <button class="status-action" data-action="edit" title="Edit post">${ICONS.edit || '✏️'} Edit</button>
                <button class="status-action" data-action="delete" title="Delete post">${ICONS.delete || '🗑️'} Delete</button>
            ` : ''}
        </div>
    `;

    // Add click handler to title for navigation
    const titleEl = card.querySelector('.blog-title');
    titleEl.addEventListener('click', (e) => {
        e.stopPropagation();
        actions.showBlogPost(post.slug || post.id);
    });

    // Add double-click handler to card body for navigation
    card.querySelector('.status-body-content').addEventListener('dblclick', () => {
        actions.showBlogPost(post.slug || post.id);
    });

    // Add options menu functionality for post owner
    if (isOwner) {
        const optionsBtn = card.querySelector('.post-options-btn');
        if (optionsBtn) {
            optionsBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                
                const existingMenu = document.querySelector('.post-dropdown-menu');
                if (existingMenu) existingMenu.remove();
                
                const menu = document.createElement('div');
                menu.className = 'post-dropdown-menu';
                menu.style.position = 'absolute';
                menu.style.zIndex = '1000';
                
                const menuItems = [
                    { label: 'Edit Post', action: () => actions.showEditBlogPost(post.slug || post.id) },
                    { label: 'Delete Post', action: () => actions.blogDeletePost(post.slug || post.id) },
                    { label: 'Share Post', action: () => {
                        if (navigator.share) {
                            navigator.share({
                                title: post.title,
                                text: post.description || post.title,
                                url: window.location.href
                            });
                        } else {
                            navigator.clipboard.writeText(window.location.href);
                            showSuccessToast('Link copied to clipboard!');
                        }
                    }}
                ];
                
                menuItems.forEach(item => {
                    const button = document.createElement('button');
                    button.innerHTML = item.label;
                    button.onclick = (event) => {
                        event.stopPropagation();
                        item.action();
                        menu.remove();
                    };
                    menu.appendChild(button);
                });
                
                card.appendChild(menu);
                
                const btnRect = optionsBtn.getBoundingClientRect();
                const cardRect = card.getBoundingClientRect();
                
                const relativeTop = btnRect.bottom - cardRect.top;
                const relativeLeft = btnRect.left - cardRect.left;
                
                menu.style.top = `${relativeTop}px`;
                menu.style.left = `${relativeLeft}px`;
                
                setTimeout(() => {
                    const menuRect = menu.getBoundingClientRect();
                    
                    if (menuRect.bottom > window.innerHeight) {
                        const adjustedTop = btnRect.top - cardRect.top - menu.offsetHeight;
                        menu.style.top = `${adjustedTop}px`;
                    }
                    
                    if (menuRect.right > window.innerWidth) {
                        const adjustedLeft = btnRect.right - cardRect.left - menu.offsetWidth;
                        menu.style.left = `${adjustedLeft}px`;
                    }
                }, 0);
                
                setTimeout(() => {
                    document.addEventListener('click', function closeMenu(e) {
                        if (!menu.contains(e.target)) {
                            menu.remove();
                            document.removeEventListener('click', closeMenu);
                        }
                    });
                }, 0);
            });
        }
    }

    // Add footer action handlers
    card.querySelectorAll('.status-footer .status-action').forEach(button => {
        button.addEventListener('click', e => {
            e.stopPropagation();
            const action = e.currentTarget.dataset.action;
            
            switch(action) {
                case 'view-post':
                    actions.showBlogPost(post.slug || post.id);
                    break;
                case 'share':
                    if (navigator.share) {
                        navigator.share({
                            title: post.title,
                            text: post.description || post.title,
                            url: window.location.href
                        });
                    } else {
                        navigator.clipboard.writeText(window.location.href);
                        showSuccessToast('Link copied to clipboard!');
                    }
                    break;
                case 'edit':
                    actions.showEditBlogPost(post.slug || post.id);
                    break;
                case 'delete':
                    actions.blogDeletePost(post.slug || post.id);
                    break;
            }
        });
    });

    return card;
}

// Render blog authentication form
function renderBlogAuth(state, actions) {
    return `
        <div class="blog-auth-container">
            <div class="blog-auth-tabs">
                <button class="blog-auth-tab active" data-tab="login">Login with Lemmy</button>
            </div>
            
            <div class="blog-auth-form" id="blog-login-form">
                <h3>Login with your Lemmy Account</h3>
                <p style="color: var(--font-color-muted); font-size: 0.9rem; margin-bottom: 15px;">
                    Use your existing Lemmy account to create and manage blog posts.
                </p>
                <input type="text" id="blog-login-instance" placeholder="Lemmy instance (e.g., lemmy.world)" required>
                <input type="text" id="blog-login-username" placeholder="Username" required>
                <input type="password" id="blog-login-password" placeholder="Password" required>
                <button class="button-primary" id="blog-login-submit">Login</button>
            </div>
        </div>
    `;
}

// Initialize blog authentication handlers
function initBlogAuth(state, actions) {
    document.getElementById('blog-login-submit').addEventListener('click', async () => {
        const instance = document.getElementById('blog-login-instance').value.trim();
        const username = document.getElementById('blog-login-username').value.trim();
        const password = document.getElementById('blog-login-password').value;
        
        if (!instance || !username || !password) {
            showWarningToast('Please fill in all fields');
            return;
        }
        
        // Clean up instance URL (remove https:// if present)
        const cleanInstance = instance.replace(/^https?:\/\//, '');
        
        const success = await actions.blogLogin(username, password, cleanInstance);
        if (success) {
            actions.showBlogFeed();
        }
    });
}

// Render blog feed
export async function renderBlogFeed(state, actions, loadMore = false) {
    const blogView = document.getElementById('blog-feed-view');
    
    if (!loadMore) {
        state.blogPage = 1;
        blogView.innerHTML = `
            <div class="blog-header">
                <h1>Blog</h1>
                ${state.blogAuth ? `
                    <div class="blog-user-info">
                        <span>Welcome, ${state.blogUsername}</span>
                        <button class="button-primary" id="new-blog-post-btn">New Post</button>
                        <button class="button-secondary" id="blog-logout-btn">Logout</button>
                    </div>
                ` : ''}
            </div>
            <div class="blog-content">
                ${!state.blogAuth ? renderBlogAuth(state, actions) : ''}
                <div class="blog-posts-container">
                    <div class="loading">Loading posts...</div>
                </div>
            </div>
        `;
        
        if (!state.blogAuth) {
            initBlogAuth(state, actions);
        } else {
            // Add event listeners for authenticated user buttons
            const newPostBtn = blogView.querySelector('#new-blog-post-btn');
            if (newPostBtn) {
                newPostBtn.addEventListener('click', () => actions.showCreateBlogPost());
            }
            
            const logoutBtn = blogView.querySelector('#blog-logout-btn');
            if (logoutBtn) {
                logoutBtn.addEventListener('click', () => actions.blogLogout());
            }
        }
    }
    
    try {
        const postsContainer = blogView.querySelector('.blog-posts-container');
        
        // Try the main API endpoint first, then fallback
        let data;
        try {
            data = await blogApiRequest(`/.netlify/functions/api-posts-db?page=${state.blogPage}&limit=10`);
        } catch (error) {
            console.warn('Main API endpoint failed, trying fallback:', error);
            data = await fallbackBlogApiRequest(`/api-posts-db?page=${state.blogPage}&limit=10`);
        }
        
        if (!loadMore) {
            postsContainer.innerHTML = '';
        } else {
            postsContainer.querySelector('.loading')?.remove();
        }
        
        if (data.success && data.data && data.data.posts && data.data.posts.length > 0) {
            data.data.posts.forEach(post => {
                postsContainer.appendChild(renderBlogPostCard(post, state, actions));
            });
            
            state.blogHasMore = data.data.pagination && data.data.pagination.has_next;
            if (state.blogHasMore) {
                state.blogPage++;
                postsContainer.innerHTML += '<div class="loading">Loading more...</div>';
            }
        } else if (!loadMore) {
            postsContainer.innerHTML = '<div class="empty-state">No blog posts yet.</div>';
        }
        
    } catch (error) {
        console.error('Failed to load blog posts:', error);
        const postsContainer = blogView.querySelector('.blog-posts-container');
        if (!loadMore) {
            postsContainer.innerHTML = `
                <div class="error-state">
                    <h3>Unable to Load Blog Posts</h3>
                    <p>${error.message}</p>
                    <p style="font-size: 0.9em; color: var(--font-color-muted); margin-top: 10px;">
                        The blog service may be temporarily unavailable. Please try again later.
                    </p>
                    <button class="button-primary" id="retry-blog-btn">Retry</button>
                </div>
            `;
            
            // Add retry button event listener
            const retryBtn = postsContainer.querySelector('#retry-blog-btn');
            if (retryBtn) {
                retryBtn.addEventListener('click', () => actions.showBlogFeed());
            }
        }
    }
}

// Render individual blog post page
export async function renderBlogPostPage(state, actions, postId) {
    const blogPostView = document.getElementById('blog-post-view');
    
    blogPostView.innerHTML = '<div class="loading">Loading post...</div>';
    
    try {
        // Try different API endpoint patterns
        let response;
        try {
            response = await blogApiRequest(`/.netlify/functions/api-posts-slug-db?slug=${postId}`);
        } catch (error) {
            console.warn('Main endpoint failed, trying fallback:', error);
            response = await fallbackBlogApiRequest(`/api-posts-slug-db?slug=${postId}`);
        }
        
        if (!response.success) {
            throw new Error(response.message || 'Failed to load post');
        }
        
        const post = response.data.post;
        
        if (!post) {
            throw new Error('Post not found');
        }
        
        const formattedDate = new Date(post.created_at || post.date).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
        
        const isOwner = state.blogUsername && post.author && post.author.includes(state.blogUsername);
        
        // Convert markdown to HTML for content
        let content = post.content || '';
        if (content.includes('#') || content.includes('*') || content.includes('`')) {
            content = content
                .replace(/^### (.*$)/gim, '<h3>$1</h3>')
                .replace(/^## (.*$)/gim, '<h2>$1</h2>')
                .replace(/^# (.*$)/gim, '<h1>$1</h1>')
                .replace(/\*\*(.*?)\*\*/gim, '<strong>$1</strong>')
                .replace(/\*(.*?)\*/gim, '<em>$1</em>')
                .replace(/!\[([^\]]*)\]\(([^\)]+)\)/gim, '<img alt="$1" src="$2" style="max-width: 100%; height: auto;">')
                .replace(/\[([^\]]+)\]\(([^\)]+)\)/gim, '<a href="$2" target="_blank">$1</a>')
                .replace(/`([^`]+)`/gim, '<code style="background: var(--bg-color); padding: 2px 4px; border-radius: 3px; border: 1px solid var(--border-color);">$1</code>')
                .replace(/```(\w+)?\n([\s\S]*?)\n```/gim, '<pre style="background: var(--bg-color); padding: 15px; border-radius: 8px; overflow-x: auto; border: 1px solid var(--border-color);"><code>$2</code></pre>')
                .replace(/^> (.*$)/gim, '<blockquote style="border-left: 4px solid var(--border-color); padding-left: 15px; margin: 15px 0; color: var(--font-color-muted);">$1</blockquote>')
                .replace(/\n\n/gim, '</p><p>')
                .replace(/\n/gim, '<br>')
                .replace(/^(.+)$/gm, '<p>$1</p>');
        }
        
        blogPostView.innerHTML = `
            <article class="blog-post-full">
                <header class="blog-post-full-header">
                    <h1 class="blog-post-full-title">${post.title}</h1>
                    <div class="blog-post-full-meta">
                        <span class="blog-post-author">by ${post.author || 'Unknown'}</span>
                        <span class="blog-post-date">${formattedDate}</span>
                        ${isOwner ? `
                            <div class="blog-post-actions">
                                <button class="button-secondary blog-edit-btn">
                                    ${ICONS.edit || '✏️'} Edit
                                </button>
                                <button class="button-danger blog-delete-btn">
                                    ${ICONS.delete || '🗑️'} Delete
                                </button>
                            </div>
                        ` : ''}
                    </div>
                </header>
                
                <div class="blog-post-full-content">
                    ${content}
                </div>
                
                <footer class="blog-post-full-footer">
                    <button class="button-secondary" id="back-to-blog-btn">
                        ← Back to Blog
                    </button>
                </footer>
            </article>
        `;
        
        // Add event handlers for edit/delete buttons
        const editBtn = blogPostView.querySelector('.blog-edit-btn');
        if (editBtn) {
            editBtn.addEventListener('click', () => actions.showEditBlogPost(postId));
        }
        
        const deleteBtn = blogPostView.querySelector('.blog-delete-btn');
        if (deleteBtn) {
            deleteBtn.addEventListener('click', () => actions.blogDeletePost(postId));
        }
        
        // Add back button event listener
        const backBtn = blogPostView.querySelector('#back-to-blog-btn');
        if (backBtn) {
            backBtn.addEventListener('click', () => actions.showBlogFeed());
        }
        
        // Store current post in state
        state.currentBlogPost = post;
        
    } catch (error) {
        console.error('Failed to load blog post:', error);
        blogPostView.innerHTML = `
            <div class="error-state">
                <h2>Unable to Load Post</h2>
                <p>${error.message}</p>
                <p style="font-size: 0.9em; color: var(--font-color-muted); margin-top: 10px;">
                    The blog service may be temporarily unavailable, or this post may not exist.
                </p>
                <button class="button-primary" id="back-to-blog-error-btn">Back to Blog</button>
            </div>
        `;
        
        // Add back button event listener for error state
        const backBtn = blogPostView.querySelector('#back-to-blog-error-btn');
        if (backBtn) {
            backBtn.addEventListener('click', () => actions.showBlogFeed());
        }
    }
}

// Render create blog post page
export async function renderCreateBlogPostPage(state, actions) {
    if (!state.blogAuth) {
        showWarningToast('Please login to create a post');
        actions.showBlogFeed();
        return;
    }
    
    const createBlogPostView = document.getElementById('blog-composer-view');
    
    createBlogPostView.innerHTML = `
        <div class="blog-editor">
            <header class="blog-editor-header">
                <h1>Create New Post</h1>
                <div class="blog-editor-actions">
                    <button class="button-secondary" onclick="actions.showBlogFeed()">Cancel</button>
                    <button class="button-primary" id="blog-save-post">Publish</button>
                </div>
            </header>
            
            <div class="blog-editor-form">
                <input type="text" id="blog-post-title" placeholder="Post Title" required>
                <textarea id="blog-post-summary" placeholder="Brief summary (optional)" rows="2"></textarea>
                <div class="blog-editor-toolbar">
                    <button type="button" class="editor-btn" data-action="bold"><strong>B</strong></button>
                    <button type="button" class="editor-btn" data-action="italic"><em>I</em></button>
                    <button type="button" class="editor-btn" data-action="heading">H1</button>
                    <button type="button" class="editor-btn" data-action="link">🔗</button>
                    <button type="button" class="editor-btn" data-action="image">🖼️</button>
                    <button type="button" class="editor-btn" data-action="code">Code</button>
                </div>
                <textarea id="blog-post-content" placeholder="Write your post content here... (Markdown supported)" rows="20" required></textarea>
                <div class="blog-editor-preview">
                    <h3>Preview</h3>
                    <div id="blog-preview-content">Start typing to see preview...</div>
                </div>
            </div>
        </div>
    `;
    
    initBlogEditor(state, actions, 'create');
}

// Render edit blog post page
export async function renderEditBlogPostPage(state, actions, postId) {
    if (!state.blogAuth) {
        showWarningToast('Please login to edit posts');
        actions.showBlogFeed();
        return;
    }
    
    const editBlogPostView = document.getElementById('blog-composer-view');
    
    editBlogPostView.innerHTML = '<div class="loading">Loading post for editing...</div>';
    
    try {
        let post;
        try {
            const response = await blogApiRequest(`/.netlify/functions/api-posts-slug-db?slug=${postId}`);
            post = response.data.post;
        } catch (error) {
            console.warn('Main endpoint failed, trying fallback:', error);
            const response = await fallbackBlogApiRequest(`/api-posts-slug-db?slug=${postId}`);
            post = response.data.post;
        }
        
        if (!post) {
            throw new Error('Post not found');
        }
        
        // Check if user owns this post
        const isOwner = state.blogUsername && post.author && (post.author.username === state.blogUsername || post.author === state.blogUsername);
        if (!isOwner) {
            showErrorToast('You can only edit your own posts');
            actions.showBlogFeed();
            return;
        }
        
        editBlogPostView.innerHTML = `
            <div class="blog-editor">
                <header class="blog-editor-header">
                    <h1>Edit Post</h1>
                    <div class="blog-editor-actions">
                        <button class="button-secondary" id="cancel-edit-btn">Cancel</button>
                        <button class="button-primary" id="blog-update-post">Update</button>
                    </div>
                </header>
                
                <div class="blog-editor-form">
                    <input type="text" id="blog-post-title" value="${post.title}" required>
                    <textarea id="blog-post-summary" placeholder="Brief summary (optional)" rows="2">${post.description || post.summary || ''}</textarea>
                    <div class="blog-editor-toolbar">
                        <button type="button" class="editor-btn" data-action="bold"><strong>B</strong></button>
                        <button type="button" class="editor-btn" data-action="italic"><em>I</em></button>
                        <button type="button" class="editor-btn" data-action="heading">H1</button>
                        <button type="button" class="editor-btn" data-action="link">🔗</button>
                        <button type="button" class="editor-btn" data-action="image">🖼️</button>
                        <button type="button" class="editor-btn" data-action="code">Code</button>
                    </div>
                    <textarea id="blog-post-content" rows="20" required>${post.content || ''}</textarea>
                    <div class="blog-editor-preview">
                        <h3>Preview</h3>
                        <div id="blog-preview-content"></div>
                    </div>
                </div>
            </div>
        `;
        
        // Add cancel button event listener
        const cancelBtn = editBlogPostView.querySelector('#cancel-edit-btn');
        if (cancelBtn) {
            cancelBtn.addEventListener('click', () => actions.showBlogPost(postId));
        }
        
        initBlogEditor(state, actions, 'edit', postId);
        
        // Update preview with existing content
        updatePreview();
        
    } catch (error) {
        console.error('Failed to load post for editing:', error);
        editBlogPostView.innerHTML = `
            <div class="error-state">
                <h2>Unable to Load Post</h2>
                <p>${error.message}</p>
                <p style="font-size: 0.9em; color: var(--font-color-muted); margin-top: 10px;">
                    The blog service may be temporarily unavailable.
                </p>
                <button class="button-primary" id="back-to-blog-edit-error-btn">Back to Blog</button>
            </div>
        `;
        
        // Add back button event listener for error state
        const backBtn = editBlogPostView.querySelector('#back-to-blog-edit-error-btn');
        if (backBtn) {
            backBtn.addEventListener('click', () => actions.showBlogFeed());
        }
    }
}

// Initialize blog editor functionality
function initBlogEditor(state, actions, mode, postId = null) {
    const titleInput = document.getElementById('blog-post-title');
    const summaryInput = document.getElementById('blog-post-summary');
    const contentTextarea = document.getElementById('blog-post-content');
    const previewDiv = document.getElementById('blog-preview-content');
    const saveBtn = document.getElementById('blog-save-post') || document.getElementById('blog-update-post');
    
    // Simple markdown to HTML converter
    function markdownToHtml(markdown) {
        return markdown
            .replace(/^### (.*$)/gim, '<h3>$1</h3>')
            .replace(/^## (.*$)/gim, '<h2>$1</h2>')
            .replace(/^# (.*$)/gim, '<h1>$1</h1>')
            .replace(/\*\*(.*)\*\*/gim, '<strong>$1</strong>')
            .replace(/\*(.*)\*/gim, '<em>$1</em>')
            .replace(/!\[([^\]]*)\]\(([^\)]+)\)/gim, '<img alt="$1" src="$2">')
            .replace(/\[([^\]]+)\]\(([^\)]+)\)/gim, '<a href="$2">$1</a>')
            .replace(/`([^`]+)`/gim, '<code>$1</code>')
            .replace(/\n\n/gim, '</p><p>')
            .replace(/^\s*[\r\n]/gm, '<br>')
            .replace(/^(.+)$/gm, '<p>$1</p>');
    }
    
    // Update preview function
    window.updatePreview = function() {
        const content = contentTextarea.value;
        if (content.trim()) {
            previewDiv.innerHTML = markdownToHtml(content);
        } else {
            previewDiv.innerHTML = 'Start typing to see preview...';
        }
    };
    
    // Live preview updates
    contentTextarea.addEventListener('input', updatePreview);
    
    // Editor toolbar functionality
    document.querySelectorAll('.editor-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const action = btn.dataset.action;
            const textarea = contentTextarea;
            const start = textarea.selectionStart;
            const end = textarea.selectionEnd;
            const selectedText = textarea.value.substring(start, end);
            let replacement = selectedText;
            
            switch (action) {
                case 'bold':
                    replacement = `**${selectedText}**`;
                    break;
                case 'italic':
                    replacement = `*${selectedText}*`;
                    break;
                case 'heading':
                    replacement = `# ${selectedText}`;
                    break;
                case 'link':
                    const url = prompt('Enter URL:', 'https://');
                    if (url) {
                        replacement = `[${selectedText || 'Link text'}](${url})`;
                    }
                    break;
                case 'image':
                    const imgUrl = prompt('Enter image URL:', 'https://');
                    if (imgUrl) {
                        replacement = `![${selectedText || 'Alt text'}](${imgUrl})`;
                    }
                    break;
                case 'code':
                    replacement = `\`${selectedText}\``;
                    break;
            }
            
            textarea.setRangeText(replacement, start, end);
            textarea.focus();
            updatePreview();
        });
    });
    
    // Save/Update button functionality
    saveBtn.addEventListener('click', async () => {
        const title = titleInput.value.trim();
        const summary = summaryInput.value.trim();
        const content = contentTextarea.value.trim();
        
        if (!title || !content) {
            showWarningToast('Title and content are required');
            return;
        }
        
        showLoadingBar();
        
        let success;
        if (mode === 'create') {
            success = await actions.blogCreatePost(title, content, summary);
        } else {
            success = await actions.blogUpdatePost(postId, title, content, summary);
        }
        
        hideLoadingBar();
    });
}
