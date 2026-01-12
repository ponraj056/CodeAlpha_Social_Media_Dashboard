// Require authentication
if (!app.requireAuth()) {
    throw new Error('Not authenticated');
}

// Update navbar
app.updateNavbar();

const createPostForm = document.getElementById('createPostForm');
const feedContainer = document.getElementById('feedContainer');
const postImage = document.getElementById('postImage');
const imagePreview = document.getElementById('imagePreview');
const imagePreviewContainer = document.getElementById('imagePreviewContainer');
const removeImageBtn = document.getElementById('removeImageBtn');

let selectedFile = null;

// Image preview handling
postImage.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
        selectedFile = file;
        const reader = new FileReader();
        reader.onload = (e) => {
            imagePreview.src = e.target.result;
            imagePreviewContainer.classList.remove('hidden');
        };
        reader.readAsDataURL(file);
    }
});

removeImageBtn.addEventListener('click', () => {
    selectedFile = null;
    postImage.value = '';
    imagePreview.src = '';
    imagePreviewContainer.classList.add('hidden');
});

// Create post
createPostForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const content = document.getElementById('postContent').value.trim();

    if (!content) {
        app.showAlert('Please enter some content');
        return;
    }

    const submitBtn = e.target.querySelector('button[type="submit"]');
    app.showLoading(submitBtn);

    try {
        const formData = new FormData();
        formData.append('content', content);
        if (selectedFile) {
            formData.append('image', selectedFile);
        }

        const response = await fetch(`${app.API_URL}/posts`, {
            method: 'POST',
            headers: app.getAuthHeaders(),
            body: formData
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || 'Failed to create post');
        }

        // Reset form
        createPostForm.reset();
        selectedFile = null;
        imagePreview.src = '';
        imagePreviewContainer.classList.add('hidden');

        // Reload feed
        loadFeed();

        app.showAlert('Post created successfully!', 'success');

    } catch (error) {
        app.showAlert(error.message);
    } finally {
        app.hideLoading(submitBtn);
    }
});

// Load feed
async function loadFeed() {
    try {
        const data = await app.apiRequest('/posts/feed');

        if (data.posts.length === 0) {
            feedContainer.innerHTML = `
        <div class="empty-state">
          <h3>No posts yet</h3>
          <p class="text-muted">Start by creating your first post or follow some users!</p>
        </div>
      `;
            return;
        }

        feedContainer.innerHTML = data.posts.map(post => createPostHTML(post)).join('');

        // Add event listeners
        attachPostEventListeners();

    } catch (error) {
        feedContainer.innerHTML = `
      <div class="empty-state">
        <div class="alert alert-error">
          Error loading feed: ${error.message}
        </div>
      </div>
    `;
    }
}

// Create post HTML
function createPostHTML(post) {
    const currentUser = app.getCurrentUser();
    const isLiked = post.likes.includes(currentUser._id);
    const likesCount = post.likes.length;
    const commentsCount = post.comments.length;

    return `
    <div class="card post" data-post-id="${post._id}">
      <div class="post-header">
        <img 
          src="${post.author.profilePicture || 'https://via.placeholder.com/48'}" 
          alt="${post.author.fullName}"
          class="avatar avatar-md"
        >
        <div class="post-author-info">
          <div class="post-author-name">
            <a href="/profile/${post.author.username}">${post.author.fullName}</a>
          </div>
          <div class="post-date">${app.formatDate(post.createdAt)}</div>
        </div>
        ${post.author._id === currentUser._id ? `
          <button class="btn btn-sm btn-danger delete-post-btn" data-post-id="${post._id}">
            Delete
          </button>
        ` : ''}
      </div>

      <div class="post-content">${escapeHTML(post.content)}</div>

      ${post.image ? `
        <img src="${post.image}" alt="Post image" class="post-image">
      ` : ''}

      <div class="post-actions">
        <button class="post-action-btn like-btn ${isLiked ? 'liked' : ''}" data-post-id="${post._id}">
          ${isLiked ? '❤️' : '🤍'} ${likesCount} ${likesCount === 1 ? 'Like' : 'Likes'}
        </button>
        <button class="post-action-btn comment-toggle-btn" data-post-id="${post._id}">
          💬 ${commentsCount} ${commentsCount === 1 ? 'Comment' : 'Comments'}
        </button>
      </div>

      <div class="comments-section hidden" data-comments-section="${post._id}">
        <div class="comments-list">
          ${post.comments.map(comment => createCommentHTML(comment)).join('')}
        </div>
        <form class="comment-form" data-post-id="${post._id}">
          <input 
            type="text" 
            class="form-control comment-input" 
            placeholder="Write a comment..."
            maxlength="300"
            required
          >
          <button type="submit" class="btn btn-sm btn-primary">Post</button>
        </form>
      </div>
    </div>
  `;
}

// Create comment HTML
function createCommentHTML(comment) {
    return `
    <div class="comment">
      <img 
        src="${comment.user.profilePicture || 'https://via.placeholder.com/32'}" 
        alt="${comment.user.fullName}"
        class="avatar avatar-sm"
      >
      <div class="comment-content">
        <div class="comment-author">
          <a href="/profile/${comment.user.username}">${comment.user.fullName}</a>
        </div>
        <div class="comment-text">${escapeHTML(comment.text)}</div>
        <div class="post-date">${app.formatDate(comment.createdAt)}</div>
      </div>
    </div>
  `;
}

// Attach event listeners to posts
function attachPostEventListeners() {
    // Like buttons
    document.querySelectorAll('.like-btn').forEach(btn => {
        btn.addEventListener('click', handleLike);
    });

    // Comment toggle buttons
    document.querySelectorAll('.comment-toggle-btn').forEach(btn => {
        btn.addEventListener('click', toggleComments);
    });

    // Comment forms
    document.querySelectorAll('.comment-form').forEach(form => {
        form.addEventListener('submit', handleComment);
    });

    // Delete buttons
    document.querySelectorAll('.delete-post-btn').forEach(btn => {
        btn.addEventListener('click', handleDeletePost);
    });
}

// Handle like
async function handleLike(e) {
    const postId = e.currentTarget.dataset.postId;

    try {
        const data = await app.apiRequest(`/posts/${postId}/like`, {
            method: 'PUT'
        });

        // Update UI
        loadFeed();

    } catch (error) {
        app.showAlert(error.message);
    }
}

// Toggle comments
function toggleComments(e) {
    const postId = e.currentTarget.dataset.postId;
    const commentsSection = document.querySelector(`[data-comments-section="${postId}"]`);
    commentsSection.classList.toggle('hidden');
}

// Handle comment
async function handleComment(e) {
    e.preventDefault();

    const form = e.target;
    const postId = form.dataset.postId;
    const input = form.querySelector('.comment-input');
    const text = input.value.trim();

    if (!text) return;

    try {
        const data = await app.apiRequest(`/posts/${postId}/comment`, {
            method: 'POST',
            body: JSON.stringify({ text })
        });

        // Reset input
        input.value = '';

        // Reload feed
        loadFeed();

    } catch (error) {
        app.showAlert(error.message);
    }
}

// Handle delete post
async function handleDeletePost(e) {
    const postId = e.currentTarget.dataset.postId;

    if (!confirm('Are you sure you want to delete this post?')) {
        return;
    }

    try {
        await app.apiRequest(`/posts/${postId}`, {
            method: 'DELETE'
        });

        app.showAlert('Post deleted successfully', 'success');
        loadFeed();

    } catch (error) {
        app.showAlert(error.message);
    }
}

// Escape HTML to prevent XSS
function escapeHTML(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Initial load
loadFeed();
