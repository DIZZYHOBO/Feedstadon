// components/Blog.js - Complete Blog API integration for Feedstodon
import { showToast, showSuccessToast, showErrorToast, showWarningToast } from './ui.js';
import { timeAgo } from './utils.js';

const BLOG_API_BASE = 'https://b.afsapp.lol/.netlify/functions';

// Blog API helper with authentication
export async function blogApiFetch(endpoint, options = {}) {
    const state = window.appState || {};
    const blogToken = state.blogToken || localStorage.getItem('blogToken');
    
    const headers = {
        'Content-Type': 'application/json',
        ...options.headers
    };
    
    if (blogToken && !endpoint.includes('auth-login')) {
        headers['Authorization'] = `Bearer ${blogToken}`;
    }
    
    try {
        const response = await fetch(`${BLOG_API_BASE}${endpoint}`, {
            ...options,
            headers
        });
        
        if (!response.ok) {
            if (response.status === 401) {
                // Token expired, clear it
                localStorage.removeItem('blogToken');
                delete state.blogToken;
                throw new Error('Authentication expired. Please login again.');
            }
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        return await response.json();
    } catch (error) {
        console.error('Blog API error:', error);
        throw error;
    }
}

// Blog authentication
export async function blogLogin(instance, username, password) {
    try {
        const response = await blogApiFetch('/api-auth-login', {
            method: 'POST',
            body: JSON.stringify({ instance, username, password })
        });
        
        if (response.success && response.data?.access_token) {
            const token = response.data.access_token;
            localStorage.setItem('blogToken', token);
            localStorage.setItem('blogUser', JSON.stringify(response.data.user));
            
            if (window.appState) {
                window.appState.blogToken = token;
                window.appState.blogUser = response.data.user;
            }
            
            showSuccessToast('Successfully logged into blog!');
            return response.data;
        } else {
            throw new Error(response.message || 'Login failed');
        }
    } catch (error) {
        showErrorToast(`Blog login failed: ${error.message}`);
        throw error;
    }
}

// Fetch blog posts
export async function fetchBlogPosts(params = {}) {
    const queryParams = new URLSearchParams({
        page: params.page || 1,
        limit: params.limit || 20,
        ...params
    });
    
    try {
        const response = await blogApiFetch(`/api-posts-db?${queryParams}`);
        return response;
    } catch (error) {
        console.error('Error fetching blog posts:', error);
        return { success: false, data: { posts: [], total: 0 } };
    }
}

// Fetch single blog post by slug
export async function fetchBlogPost(slug) {
    try {
        const response = await blogApiFetch(`/api-posts-slug-db?slug=${slug}`);
        return response;
    } catch (error) {
        console.error('Error fetching blog post:', error);
        return null;
    }
}

// Create blog post
export async function createBlogPost(postData) {
    try {
        const response = await blogApiFetch('/api-posts-db', {
            method: 'POST',
            body: JSON.stringify(postData)
        });
        
        if (response.success) {
            showSuccessToast('Blog post created successfully!');
            return response.data;
        } else {
            throw new Error(response.message || 'Failed to create post');
        }
    } catch (error) {
        showErrorToast(`Failed to create post: ${error.message}`);
        throw error;
    }
}

// Update blog post
export async function updateBlogPost(slug, postData) {
    try {
        const response = await blogApiFetch(`/api-posts-slug-db?slug=${slug}`, {
            method: 'PUT',
            body: JSON.stringify(postData)
        });
        
        if (response.success) {
            showSuccessToast('Blog post updated successfully!');
            return response.data;
        } else {
            throw new Error(response.message || 'Failed to update post');
        }
    } catch (error) {
        showErrorToast(`Failed to update post: ${error.message}`);
        throw error;
    }
}

// Delete blog post
export async function deleteBlogPost(slug) {
    try {
        const response = await blogApiFetch(`/api-posts-slug-db?slug=${slug}`, {
            method: 'DELETE'
        });
        
        if (response.success) {
            showSuccessToast('Blog post deleted successfully!');
            return true;
        } else {
            throw new Error(response.message || 'Failed to delete post');
        }
    } catch (error) {
        showErrorToast(`Failed to delete post: ${error.message}`);
        throw error;
    }
}

// Render blog card for feed
export function renderBlogCard(post, state, actions) {
    const card = document.createElement('article');
    card.className = 'status blog-post-card';
    card.dataset.postId = post.id;
    
    const converter = typeof showdown !== 'undefined' ? new showdown.Converter() : null;
    const excerptLength = 200;
    const excerpt = post.description || 
                   (post.content ? post.content.substring(0, excerptLength) + '...' : '');
    
    const isOwner = state.blogUser?.username === post.author;
    
    card.innerHTML = `
        <div class="blog-post-header">
            <div class="status-header">
                <img src="${post.authorAvatar || 'images/blog-avatar.png'}" alt="${post.author}" class="status-avatar" 
                     onerror="this.src='images/default-avatar.png'">
                <div class="status-meta">
                    <div class="status-author">${post.author}</div>
                    <div class="status-time">${timeAgo(new Date(post.createdAt))}</div>
                </div>
                ${isOwner ? `
                    <div class="post-actions-menu">
                        <button class="icon-button menu-toggle" data-post-id="${post.id}">
                            ${ICONS.more}
                        </button>
                        <div class="dropdown-menu" style="display: none;">
                            <button class="dropdown-item edit-post" data-slug="${post.slug}">Edit</button>
                            <button class="dropdown-item delete-post" data-slug="${post.slug}">Delete</button>
                        </div>
                    </div>
                ` : ''}
            </div>
        </div>
        
        <div class="blog-post-content">
            <h2 class="blog-post-title">${post.title}</h2>
            <div class="blog-post-excerpt">${converter ? converter.makeHtml(excerpt) : excerpt}</div>
            
            ${post.tags && post.tags.length > 0 ? `
                <div class="blog-post-tags">
                    ${post.tags.map(tag => `<span class="tag">#${tag}</span>`).join('')}
                </div>
            ` : ''}
        </div>
        
        <div class="status-actions blog-actions">
            <button class="icon-button read-more" data-slug="${post.slug}">
                ${ICONS.view} Read More
            </button>
            
            <button class="icon-button share-post" data-url="${window.location.origin}/blog/${post.slug}">
                ${ICONS.share} Share
            </button>
        </div>
    `;
    
    // Add event listeners
    const readMoreBtn = card.querySelector('.read-more');
    readMoreBtn?.addEventListener('click', () => {
        actions.navigateToBlogPost(post.slug);
    });
    
    const shareBtn = card.querySelector('.share-post');
    shareBtn?.addEventListener('click', async () => {
        const url = shareBtn.dataset.url;
        if (navigator.share) {
            try {
                await navigator.share({
                    title: post.title,
                    text: post.description || post.title,
                    url: url
                });
            } catch (err) {
                console.log('Share cancelled or failed', err);
            }
        } else {
            navigator.clipboard.writeText(url);
            showSuccessToast('Link copied to clipboard!');
        }
    });
    
    // Menu toggle for post owner
    if (isOwner) {
        const menuToggle = card.querySelector('.menu-toggle');
        const dropdownMenu = card.querySelector('.dropdown-menu');
        
        menuToggle?.addEventListener('click', (e) => {
            e.stopPropagation();
            dropdownMenu.style.display = dropdownMenu.style.display === 'none' ? 'block' : 'none';
        });
        
        const editBtn = card.querySelector('.edit-post');
        editBtn?.addEventListener('click', () => {
            actions.navigateToBlogEdit(post.slug);
        });
        
        const deleteBtn = card.querySelector('.delete-post');
        deleteBtn?.addEventListener('click', async () => {
            if (confirm('Are you sure you want to delete this post?')) {
                await deleteBlogPost(post.slug);
                card.remove();
            }
        });
    }
    
    return card;
}

// Render blog feed
export async function renderBlogFeed(state, actions) {
    const feedContainer = document.getElementById('blog-feed-view');
    if (!feedContainer) return;
    
    feedContainer.innerHTML = '<div class="loading-spinner">Loading blog posts...</div>';
    
    try {
        const response = await fetchBlogPosts({ page: state.blogPage || 1 });
        
        if (!response.success || !response.data?.posts) {
            feedContainer.innerHTML = '<div class="empty-state">No blog posts available</div>';
            return;
        }
        
        feedContainer.innerHTML = '';
        
        // Add create post button if logged in
        if (state.blogToken) {
            const createBtn = document.createElement('div');
            createBtn.className = 'blog-create-section';
            createBtn.innerHTML = `
                <button class="button-primary create-blog-post-btn">
                    ✍️ Write New Post
                </button>
            `;
            createBtn.querySelector('.create-blog-post-btn').addEventListener('click', () => {
                actions.navigateToBlogCompose();
            });
            feedContainer.appendChild(createBtn);
        }
        
        const posts = response.data.posts;
        if (posts.length === 0) {
            feedContainer.innerHTML += '<div class="empty-state">No blog posts yet. Be the first to write!</div>';
            return;
        }
        
        posts.forEach(post => {
            const card = renderBlogCard(post, state, actions);
            feedContainer.appendChild(card);
        });
        
        // Add pagination if needed
        if (response.data.total > posts.length) {
            const loadMoreBtn = document.createElement('button');
            loadMoreBtn.className = 'button-primary load-more';
            loadMoreBtn.textContent = 'Load More Posts';
            loadMoreBtn.addEventListener('click', async () => {
                state.blogPage = (state.blogPage || 1) + 1;
                const moreResponse = await fetchBlogPosts({ page: state.blogPage });
                if (moreResponse.success && moreResponse.data?.posts) {
                    moreResponse.data.posts.forEach(post => {
                        const card = renderBlogCard(post, state, actions);
                        feedContainer.insertBefore(card, loadMoreBtn);
                    });
                    
                    if (feedContainer.children.length - 1 >= moreResponse.data.total) {
                        loadMoreBtn.remove();
                    }
                }
            });
            feedContainer.appendChild(loadMoreBtn);
        }
    } catch (error) {
        feedContainer.innerHTML = `<div class="error-state">Error loading blog posts: ${error.message}</div>`;
    }
}

// Render blog post view
export async function renderBlogPostView(slug, state, actions) {
    const view = document.getElementById('blog-post-view');
    if (!view) return;
    
    view.innerHTML = '<div class="loading-spinner">Loading post...</div>';
    
    try {
        const response = await fetchBlogPost(slug);
        
        if (!response?.success || !response?.data) {
            view.innerHTML = '<div class="error-state">Post not found</div>';
            return;
        }
        
        const post = response.data;
        const converter = typeof showdown !== 'undefined' ? new showdown.Converter() : null;
        const isOwner = state.blogUser?.username === post.author;
        
        view.innerHTML = `
            <article class="blog-post-full">
                <div class="blog-post-header">
                    <button class="back-button" id="back-to-feed">
                        ${ICONS.reply} Back to Blog
                    </button>
                    
                    ${isOwner ? `
                        <div class="post-owner-actions">
                            <button class="button-secondary edit-post" data-slug="${post.slug}">Edit</button>
                            <button class="button-danger delete-post" data-slug="${post.slug}">Delete</button>
                        </div>
                    ` : ''}
                </div>
                
                <h1 class="blog-post-title">${post.title}</h1>
                
                <div class="blog-post-meta">
                    <img src="${post.authorAvatar || 'images/blog-avatar.png'}" alt="${post.author}" class="status-avatar">
                    <div>
                        <div class="post-author">${post.author}</div>
                        <div class="post-date">${new Date(post.createdAt).toLocaleDateString('en-US', { 
                            year: 'numeric', 
                            month: 'long', 
                            day: 'numeric' 
                        })}</div>
                    </div>
                </div>
                
                ${post.tags && post.tags.length > 0 ? `
                    <div class="blog-post-tags">
                        ${post.tags.map(tag => `<span class="tag">#${tag}</span>`).join('')}
                    </div>
                ` : ''}
                
                <div class="blog-post-body">
                    ${converter ? converter.makeHtml(post.content) : post.content}
                </div>
                
                <div class="blog-post-footer">
                    <button class="icon-button share-post">
                        ${ICONS.share} Share
                    </button>
                </div>
            </article>
        `;
        
        // Add event listeners
        document.getElementById('back-to-feed')?.addEventListener('click', () => {
            actions.navigateTo('blog');
        });
        
        view.querySelector('.share-post')?.addEventListener('click', async () => {
            const url = `${window.location.origin}/blog/${post.slug}`;
            if (navigator.share) {
                try {
                    await navigator.share({
                        title: post.title,
                        text: post.description || post.title,
                        url: url
                    });
                } catch (err) {
                    console.log('Share cancelled or failed', err);
                }
            } else {
                navigator.clipboard.writeText(url);
                showSuccessToast('Link copied to clipboard!');
            }
        });
        
        if (isOwner) {
            view.querySelector('.edit-post')?.addEventListener('click', () => {
                actions.navigateToBlogEdit(post.slug);
            });
            
            view.querySelector('.delete-post')?.addEventListener('click', async () => {
                if (confirm('Are you sure you want to delete this post?')) {
                    await deleteBlogPost(post.slug);
                    actions.navigateTo('blog');
                }
            });
        }
    } catch (error) {
        view.innerHTML = `<div class="error-state">Error loading post: ${error.message}</div>`;
    }
}

// Render blog composer
export function renderBlogComposer(state, actions, editSlug = null) {
    const composer = document.getElementById('blog-composer-view');
    if (!composer) return;
    
    let postData = {
        title: '',
        content: '',
        description: '',
        tags: [],
        isDraft: false
    };
    
    if (editSlug) {
        composer.innerHTML = '<div class="loading-spinner">Loading post...</div>';
        fetchBlogPost(editSlug).then(response => {
            if (response?.success && response?.data) {
                postData = response.data;
                renderComposerForm();
            }
        });
    } else {
        renderComposerForm();
    }
    
    function renderComposerForm() {
        const converter = typeof showdown !== 'undefined' ? new showdown.Converter() : null;
        
        composer.innerHTML = `
            <div class="blog-composer-container">
                <div class="composer-header">
                    <button class="back-button" id="cancel-compose">
                        ${ICONS.delete} Cancel
                    </button>
                    <h2>${editSlug ? 'Edit Post' : 'New Blog Post'}</h2>
                </div>
                
                <div class="composer-form">
                    <div class="form-group">
                        <label for="post-title">Title</label>
                        <input type="text" id="post-title" class="form-input" 
                               placeholder="Enter your post title" 
                               value="${postData.title}" required>
                    </div>
                    
                    <div class="form-group">
                        <label for="post-description">Description (optional)</label>
                        <textarea id="post-description" class="form-textarea" rows="2" 
                                  placeholder="Brief description for preview">${postData.description || ''}</textarea>
                    </div>
                    
                    <div class="form-group">
                        <label for="post-content">Content (Markdown supported)</label>
                        <div class="editor-toolbar">
                            <button type="button" class="toolbar-btn" data-action="bold" title="Bold">B</button>
                            <button type="button" class="toolbar-btn" data-action="italic" title="Italic">I</button>
                            <button type="button" class="toolbar-btn" data-action="heading" title="Heading">H</button>
                            <button type="button" class="toolbar-btn" data-action="link" title="Link">🔗</button>
                            <button type="button" class="toolbar-btn" data-action="image" title="Image">🖼️</button>
                            <button type="button" class="toolbar-btn" data-action="list" title="List">☰</button>
                            <button type="button" class="toolbar-btn" data-action="code" title="Code">&lt;/&gt;</button>
                            <button type="button" class="toolbar-btn" data-action="quote" title="Quote">❝</button>
                        </div>
                        <textarea id="post-content" class="form-textarea" rows="15" 
                                  placeholder="Write your post content here...">${postData.content}</textarea>
                    </div>
                    
                    <div class="form-group">
                        <label for="post-tags">Tags (comma separated)</label>
                        <input type="text" id="post-tags" class="form-input" 
                               placeholder="e.g., technology, fediverse, tutorial" 
                               value="${Array.isArray(postData.tags) ? postData.tags.join(', ') : ''}">
                    </div>
                    
                    <div class="form-group">
                        <label class="checkbox-label">
                            <input type="checkbox" id="post-draft" ${postData.isDraft ? 'checked' : ''}>
                            Save as draft
                        </label>
                    </div>
                    
                    <div class="form-actions">
                        <button class="button-secondary" id="preview-post">Preview</button>
                        <button class="button-primary" id="save-post">
                            ${editSlug ? 'Update Post' : 'Publish Post'}
                        </button>
                    </div>
                </div>
                
                <div id="preview-container" class="preview-container" style="display: none;">
                    <div class="preview-header">
                        <h3>Preview</h3>
                        <button class="close-preview-btn">&times;</button>
                    </div>
                    <div id="preview-content"></div>
                </div>
            </div>
        `;
        
        // Toolbar actions
        composer.querySelectorAll('.toolbar-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const textarea = document.getElementById('post-content');
                const action = btn.dataset.action;
                const start = textarea.selectionStart;
                const end = textarea.selectionEnd;
                const selectedText = textarea.value.substring(start, end);
                let replacement = '';
                
                switch(action) {
                    case 'bold':
                        replacement = `**${selectedText || 'bold text'}**`;
                        break;
                    case 'italic':
                        replacement = `*${selectedText || 'italic text'}*`;
                        break;
                    case 'heading':
                        replacement = `\n## ${selectedText || 'Heading'}\n`;
                        break;
                    case 'link':
                        replacement = `[${selectedText || 'link text'}](url)`;
                        break;
                    case 'image':
                        replacement = `![${selectedText || 'alt text'}](image-url)`;
                        break;
                    case 'list':
                        replacement = `\n- ${selectedText || 'List item'}\n`;
                        break;
                    case 'code':
                        if (selectedText.includes('\n')) {
                            replacement = `\`\`\`\n${selectedText || 'code'}\n\`\`\``;
                        } else {
                            replacement = `\`${selectedText || 'code'}\``;
                        }
                        break;
                    case 'quote':
                        replacement = `\n> ${selectedText || 'Quote'}\n`;
                        break;
                }
                
                textarea.value = textarea.value.substring(0, start) + replacement + textarea.value.substring(end);
                textarea.focus();
                textarea.setSelectionRange(start + replacement.length, start + replacement.length);
            });
        });
        
        // Cancel button
        document.getElementById('cancel-compose')?.addEventListener('click', () => {
            if (confirm('Are you sure? Any unsaved changes will be lost.')) {
                actions.navigateTo('blog');
            }
        });
        
        // Preview button
        document.getElementById('preview-post')?.addEventListener('click', () => {
            const previewContainer = document.getElementById('preview-container');
            const previewContent = document.getElementById('preview-content');
            
            const title = document.getElementById('post-title').value;
            const content = document.getElementById('post-content').value;
            
            previewContent.innerHTML = `
                <h1>${title || 'Untitled'}</h1>
                <div class="preview-body">${converter ? converter.makeHtml(content || '*No content*') : content}</div>
            `;
            
            previewContainer.style.display = 'block';
        });
        
        // Close preview
        composer.querySelector('.close-preview-btn')?.addEventListener('click', () => {
            document.getElementById('preview-container').style.display = 'none';
        });
        
        // Save/Update button
        document.getElementById('save-post')?.addEventListener('click', async () => {
            const title = document.getElementById('post-title').value.trim();
            const content = document.getElementById('post-content').value.trim();
            const description = document.getElementById('post-description').value.trim();
            const tagsInput = document.getElementById('post-tags').value.trim();
            const isDraft = document.getElementById('post-draft').checked;
            
            if (!title || !content) {
                showWarningToast('Title and content are required');
                return;
            }
            
            const tags = tagsInput ? tagsInput.split(',').map(t => t.trim()).filter(t => t) : [];
            
            const postPayload = {
                title,
                content,
                description,
                tags,
                isDraft
            };
            
            try {
                if (editSlug) {
                    await updateBlogPost(editSlug, postPayload);
                    actions.navigateToBlogPost(editSlug);
                } else {
                    const newPost = await createBlogPost(postPayload);
                    if (newPost?.slug) {
                        actions.navigateToBlogPost(newPost.slug);
                    } else {
                        actions.navigateTo('blog');
                    }
                }
            } catch (error) {
                console.error('Error saving post:', error);
            }
        });
    }
}

// Blog login modal
export function showBlogLoginModal(state, actions) {
    const modal = document.createElement('div');
    modal.className = 'modal-overlay visible';
    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h2>Login to Blog</h2>
                <button class="close-modal">&times;</button>
            </div>
            <div class="modal-body">
                <p>Login with your Lemmy account to access blog features</p>
                <div class="form-group">
                    <label for="blog-instance">Lemmy Instance</label>
                    <input type="text" id="blog-instance" class="form-input" 
                           placeholder="e.g., lemmy.world" value="${localStorage.getItem('lemmy_instance') || ''}">
                </div>
                <div class="form-group">
                    <label for="blog-username">Username</label>
                    <input type="text" id="blog-username" class="form-input" 
                           placeholder="Your username" value="${localStorage.getItem('lemmy_username') || ''}">
                </div>
                <div class="form-group">
                    <label for="blog-password">Password</label>
                    <input type="password" id="blog-password" class="form-input" 
                           placeholder="Your password">
                </div>
                <div class="form-actions">
                    <button class="button-secondary close-modal">Cancel</button>
                    <button class="button-primary" id="blog-login-btn">Login</button>
                </div>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    modal.querySelectorAll('.close-modal').forEach(btn => {
        btn.addEventListener('click', () => modal.remove());
    });
    
    document.getElementById('blog-login-btn')?.addEventListener('click', async () => {
        const instance = document.getElementById('blog-instance').value.trim();
        const username = document.getElementById('blog-username').value.trim();
        const password = document.getElementById('blog-password').value;
        
        if (!instance || !username || !password) {
            showWarningToast('Please fill in all fields');
            return;
        }
        
        try {
            await blogLogin(instance, username, password);
            modal.remove();
            actions.navigateTo('blog');
        } catch (error) {
            console.error('Blog login error:', error);
        }
    });
}

// Initialize blog component
export function initBlog(state, actions) {
    // Check for stored blog token
    const storedToken = localStorage.getItem('blogToken');
    const storedUser = localStorage.getItem('blogUser');
    
    if (storedToken) {
        state.blogToken = storedToken;
        if (storedUser) {
            try {
                state.blogUser = JSON.parse(storedUser);
            } catch (e) {
                console.error('Error parsing stored blog user:', e);
            }
        }
    }
    
    // Add blog navigation actions
    actions.navigateTo = (view, params = {}) => {
        if (view === 'blog') {
            actions.showBlogFeed();
        } else if (view === 'blog-post') {
            actions.showBlogPost(params.slug);
        } else if (view === 'blog-compose') {
            actions.showBlogCompose(params.slug);
        }
    };
    
    actions.showBlogFeed = () => {
        switchView('blog');
        renderBlogFeed(state, actions);
    };
    
    actions.showBlogPost = (slug) => {
        switchView('blog-post');
        renderBlogPostView(slug, state, actions);
    };
    
    actions.showBlogCompose = (editSlug = null) => {
        if (!state.blogToken) {
            showBlogLoginModal(state, actions);
        } else {
            switchView('blog-compose');
            renderBlogComposer(state, actions, editSlug);
        }
    };
    
    actions.navigateToBlog = () => {
        actions.navigateTo('blog');
    };
    
    actions.navigateToBlogPost = (slug) => {
        actions.navigateTo('blog-post', { slug });
    };
    
    actions.navigateToBlogEdit = (slug) => {
        actions.navigateTo('blog-compose', { slug });
    };
    
    actions.navigateToBlogCompose = () => {
        actions.showBlogCompose();
    };
    
    // Helper function for view switching
    function switchView(viewName) {
        document.querySelectorAll('.view-container').forEach(view => {
            view.style.display = 'none';
        });
        
        const viewElement = document.getElementById(`${viewName}-view`);
        if (viewElement) {
            viewElement.style.display = 'flex';
        }
    }
}
