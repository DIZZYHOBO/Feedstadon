import { showLoadingBar, hideLoadingBar, showToast, showSuccessToast, showErrorToast, showWarningToast } from './ui.js';
import { ICONS } from './icons.js';

// Blog API base URL
const BLOG_API_BASE = 'https://b.afsapp.lol';

// Utility function to make blog API requests
async function blogApiRequest(endpoint, options = {}) {
    const url = `${BLOG_API_BASE}${endpoint}`;
    const config = {
        headers: {
            'Content-Type': 'application/json',
            ...options.headers
        },
        ...options
    };
    
    try {
        const response = await fetch(url, config);
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        return await response.json();
    } catch (error) {
        console.error('Blog API request failed:', error);
        throw error;
    }
}

// Render a blog post card
function renderBlogPostCard(post, state, actions) {
    const postElement = document.createElement('article');
    postElement.className = 'blog-post-card';
    
    const formattedDate = new Date(post.published || post.created_at).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
    
    const isOwner = state.blogUsername && post.author && (post.author.username === state.blogUsername || post.author === state.blogUsername);
    
    postElement.innerHTML = `
        <div class="blog-post-header">
            <h2 class="blog-post-title" onclick="actions.showBlogPost('${post.id}')">${post.title}</h2>
            <div class="blog-post-meta">
                <span class="blog-post-author">by ${post.author?.username || post.author || 'Unknown'}</span>
                <span class="blog-post-date">${formattedDate}</span>
                ${isOwner ? `
                    <div class="blog-post-actions">
                        <button class="blog-edit-btn" onclick="actions.showEditBlogPost('${post.id}')">
                            ${ICONS.edit || '✏️'} Edit
                        </button>
                        <button class="blog-delete-btn" onclick="actions.blogDeletePost('${post.id}')">
                            ${ICONS.delete || '🗑️'} Delete
                        </button>
                    </div>
                ` : ''}
            </div>
        </div>
        <div class="blog-post-summary">
            ${post.summary || post.content?.substring(0, 200) + '...' || ''}
        </div>
        <div class="blog-post-footer">
            <button class="blog-read-more-btn" onclick="actions.showBlogPost('${post.id}')">
                Read More →
            </button>
        </div>
    `;
    
    // Add click handlers for actions
    const editBtn = postElement.querySelector('.blog-edit-btn');
    if (editBtn) {
        editBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            actions.showEditBlogPost(post.id);
        });
    }
    
    const deleteBtn = postElement.querySelector('.blog-delete-btn');
    if (deleteBtn) {
        deleteBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            actions.blogDeletePost(post.id);
        });
    }
    
    const titleEl = postElement.querySelector('.blog-post-title');
    titleEl.addEventListener('click', () => actions.showBlogPost(post.id));
    
    const readMoreBtn = postElement.querySelector('.blog-read-more-btn');
    readMoreBtn.addEventListener('click', () => actions.showBlogPost(post.id));
    
    return postElement;
}

// Render blog authentication form
function renderBlogAuth(state, actions) {
    return `
        <div class="blog-auth-container">
            <div class="blog-auth-tabs">
                <button class="blog-auth-tab active" data-tab="login">Login</button>
                <button class="blog-auth-tab" data-tab="register">Register</button>
            </div>
            
            <div class="blog-auth-form" id="blog-login-form">
                <h3>Login to Blog</h3>
                <input type="text" id="blog-login-username" placeholder="Username" required>
                <input type="password" id="blog-login-password" placeholder="Password" required>
                <button class="button-primary" id="blog-login-submit">Login</button>
            </div>
            
            <div class="blog-auth-form hidden" id="blog-register-form">
                <h3>Register for Blog</h3>
                <input type="text" id="blog-register-username" placeholder="Username" required>
                <input type="email" id="blog-register-email" placeholder="Email" required>
                <input type="password" id="blog-register-password" placeholder="Password" required>
                <button class="button-primary" id="blog-register-submit">Register</button>
            </div>
        </div>
    `;
}

// Initialize blog authentication handlers
function initBlogAuth(state, actions) {
    const tabs = document.querySelectorAll('.blog-auth-tab');
    const loginForm = document.getElementById('blog-login-form');
    const registerForm = document.getElementById('blog-register-form');
    
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            tabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            
            if (tab.dataset.tab === 'login') {
                loginForm.classList.remove('hidden');
                registerForm.classList.add('hidden');
            } else {
                loginForm.classList.add('hidden');
                registerForm.classList.remove('hidden');
            }
        });
    });
    
    document.getElementById('blog-login-submit').addEventListener('click', async () => {
        const username = document.getElementById('blog-login-username').value;
        const password = document.getElementById('blog-login-password').value;
        
        if (!username || !password) {
            showWarningToast('Please fill in all fields');
            return;
        }
        
        const success = await actions.blogLogin(username, password);
        if (success) {
            actions.showBlogFeed();
        }
    });
    
    document.getElementById('blog-register-submit').addEventListener('click', async () => {
        const username = document.getElementById('blog-register-username').value;
        const email = document.getElementById('blog-register-email').value;
        const password = document.getElementById('blog-register-password').value;
        
        if (!username || !email || !password) {
            showWarningToast('Please fill in all fields');
            return;
        }
        
        const success = await actions.blogRegister(username, password, email);
        if (success) {
            // Switch to login tab
            tabs[0].click();
            document.getElementById('blog-login-username').value = username;
        }
    });
}

// Render blog feed
export async function renderBlogFeed(state, actions, loadMore = false) {
    const blogView = document.getElementById('blog-view');
    
    if (!loadMore) {
        state.blogPage = 1;
        blogView.innerHTML = `
            <div class="blog-header">
                <h1>Blog</h1>
                ${state.blogAuth ? `
                    <div class="blog-user-info">
                        <span>Welcome, ${state.blogUsername}</span>
                        <button class="button-primary" onclick="actions.showCreateBlogPost()">New Post</button>
                        <button class="button-secondary" onclick="actions.blogLogout()">Logout</button>
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
        }
    }
    
    try {
        const postsContainer = blogView.querySelector('.blog-posts-container');
        const data = await blogApiRequest(`/posts?page=${state.blogPage}&limit=10`);
        
        if (!loadMore) {
            postsContainer.innerHTML = '';
        } else {
            postsContainer.querySelector('.loading')?.remove();
        }
        
        if (data.posts && data.posts.length > 0) {
            data.posts.forEach(post => {
                postsContainer.appendChild(renderBlogPostCard(post, state, actions));
            });
            
            state.blogHasMore = data.posts.length === 10;
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
            postsContainer.innerHTML = '<div class="error-state">Failed to load blog posts.</div>';
        }
    }
}

// Render individual blog post page
export async function renderBlogPostPage(state, actions, postId) {
    const blogPostView = document.getElementById('blog-post-view');
    
    blogPostView.innerHTML = '<div class="loading">Loading post...</div>';
    
    try {
        const post = await blogApiRequest(`/posts/${postId}`);
        
        const formattedDate = new Date(post.published || post.created_at).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
        
        const isOwner = state.blogUsername && post.author && (post.author.username === state.blogUsername || post.author === state.blogUsername);
        
        blogPostView.innerHTML = `
            <article class="blog-post-full">
                <header class="blog-post-full-header">
                    <h1 class="blog-post-full-title">${post.title}</h1>
                    <div class="blog-post-full-meta">
                        <span class="blog-post-author">by ${post.author?.username || post.author || 'Unknown'}</span>
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
                    ${post.content || ''}
                </div>
                
                <footer class="blog-post-full-footer">
                    <button class="button-secondary" onclick="actions.showBlogFeed()">
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
        
        // Store current post in state
        state.currentBlogPost = post;
        
    } catch (error) {
        console.error('Failed to load blog post:', error);
        blogPostView.innerHTML = `
            <div class="error-state">
                <h2>Failed to load post</h2>
                <p>The blog post could not be loaded.</p>
                <button class="button-primary" onclick="actions.showBlogFeed()">Back to Blog</button>
            </div>
        `;
    }
}

// Render create blog post page
export async function renderCreateBlogPostPage(state, actions) {
    if (!state.blogAuth) {
        showWarningToast('Please login to create a post');
        actions.showBlogFeed();
        return;
    }
    
    const createBlogPostView = document.getElementById('create-blog-post-view');
    
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
    
    const editBlogPostView = document.getElementById('edit-blog-post-view');
    
    editBlogPostView.innerHTML = '<div class="loading">Loading post for editing...</div>';
    
    try {
        const post = await blogApiRequest(`/posts/${postId}`);
        
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
                        <button class="button-secondary" onclick="actions.showBlogPost('${postId}')">Cancel</button>
                        <button class="button-primary" id="blog-update-post">Update</button>
                    </div>
                </header>
                
                <div class="blog-editor-form">
                    <input type="text" id="blog-post-title" value="${post.title}" required>
                    <textarea id="blog-post-summary" placeholder="Brief summary (optional)" rows="2">${post.summary || ''}</textarea>
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
        
        initBlogEditor(state, actions, 'edit', postId);
        
        // Update preview with existing content
        updatePreview();
        
    } catch (error) {
        console.error('Failed to load post for editing:', error);
        editBlogPostView.innerHTML = `
            <div class="error-state">
                <h2>Failed to load post</h2>
                <p>Could not load the post for editing.</p>
                <button class="button-primary" onclick="actions.showBlogFeed()">Back to Blog</button>
            </div>
        `;
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
