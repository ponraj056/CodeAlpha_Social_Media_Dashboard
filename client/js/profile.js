// Get username from URL
const urlPath = window.location.pathname;
const username = urlPath.split('/').pop() || app.getCurrentUser()?.username;

if (!username) {
    window.location.href = '/login';
}

// Update navbar
app.updateNavbar();

const profileHeader = document.getElementById('profileHeader');
const postsContainer = document.getElementById('postsContainer');
const editProfileModal = document.getElementById('editProfileModal');
const editProfileForm = document.getElementById('editProfileForm');
const closeModalBtn = document.getElementById('closeModalBtn');
const cancelModalBtn = document.getElementById('cancelModalBtn');

let currentProfile = null;
let isOwnProfile = false;

// Close modal handlers
closeModalBtn?.addEventListener('click', closeModal);
cancelModalBtn?.addEventListener('click', closeModal);
editProfileModal?.addEventListener('click', (e) => {
    if (e.target === editProfileModal) closeModal();
});

function closeModal() {
    editProfileModal.classList.add('hidden');
}

// Load profile
async function loadProfile() {
    try {
        const data = await app.apiRequest(`/users/${username}`, { skipAuth: true });
        currentProfile = data.user;

        const currentUser = app.getCurrentUser();
        isOwnProfile = currentUser && currentUser.username === username;

        const isFollowing = currentUser && currentProfile.followers.some(
            follower => follower._id === currentUser._id
        );

        profileHeader.innerHTML = `
      <div class="profile-header">
        <div class="profile-info">
          <div class="profile-avatar-section">
            <img 
              src="${currentProfile.profilePicture || 'https://via.placeholder.com/120'}" 
              alt="${currentProfile.fullName}"
              class="avatar avatar-xl"
            >
          </div>
          <div class="profile-details">
            <h1 class="profile-name">${escapeHTML(currentProfile.fullName)}</h1>
            <p class="profile-username">@${currentProfile.username}</p>
            ${currentProfile.bio ? `<p class="profile-bio">${escapeHTML(currentProfile.bio)}</p>` : ''}
            
            <div class="profile-stats">
              <div class="profile-stat">
                <div class="profile-stat-value">${currentProfile.followersCount || 0}</div>
                <div class="profile-stat-label">Followers</div>
              </div>
              <div class="profile-stat">
                <div class="profile-stat-value">${currentProfile.followingCount || 0}</div>
                <div class="profile-stat-label">Following</div>
              </div>
            </div>

            <div class="profile-actions">
              ${isOwnProfile ? `
                <button class="btn btn-primary" id="editProfileBtn">Edit Profile</button>
              ` : currentUser ? `
                <button class="btn ${isFollowing ? 'btn-secondary' : 'btn-primary'}" id="followBtn">
                  ${isFollowing ? 'Unfollow' : 'Follow'}
                </button>
              ` : ''}
            </div>
          </div>
        </div>
      </div>
    `;

        // Add event listeners
        if (isOwnProfile) {
            document.getElementById('editProfileBtn')?.addEventListener('click', openEditModal);
        } else if (currentUser) {
            document.getElementById('followBtn')?.addEventListener('click', handleFollow);
        }

    } catch (error) {
        profileHeader.innerHTML = `
      <div class="alert alert-error">
        Error loading profile: ${error.message}
      </div>
    `;
    }
}

// Load user posts
async function loadPosts() {
    try {
        const data = await app.apiRequest(`/posts/user/${username}`, { skipAuth: true });

        if (data.posts.length === 0) {
            postsContainer.innerHTML = `
        <div class="empty-state">
          <h3>No posts yet</h3>
          <p class="text-muted">${isOwnProfile ? 'Start sharing your thoughts!' : 'This user hasn\'t posted anything yet.'}</p>
        </div>
      `;
            return;
        }

        postsContainer.innerHTML = data.posts.map(post => createPostHTML(post)).join('');

        // Add event listeners
        attachPostEventListeners();

    } catch (error) {
        postsContainer.innerHTML = `
      <div class="alert alert-error">
        Error loading posts: ${error.message}
      </div>
    `;
    }
}

// Create post HTML
function createPostHTML(post) {
    const currentUser = app.getCurrentUser();
    const isLiked = currentUser && post.likes.includes(currentUser._id);
    const likesCount = post.likes.length;

    return `
    <div class="card post" data-post-id="${post._id}">
      <div class="post-header">
        <img 
          src="${post.author.profilePicture || 'https://via.placeholder.com/48'}" 
          alt="${post.author.fullName}"
          class="avatar avatar-md"
        >
        <div class="post-author-info">
          <div class="post-author-name">${post.author.fullName}</div>
          <div class="post-date">${app.formatDate(post.createdAt)}</div>
        </div>
        ${isOwnProfile ? `
          <button class="btn btn-sm btn-danger delete-post-btn" data-post-id="${post._id}">
            Delete
          </button>
        ` : ''}
      </div>

      <div class="post-content">${escapeHTML(post.content)}</div>

      ${post.image ? `
        <img src="${post.image}" alt="Post image" class="post-image">
      ` : ''}

      ${currentUser ? `
        <div class="post-actions">
          <button class="post-action-btn like-btn ${isLiked ? 'liked' : ''}" data-post-id="${post._id}">
            ${isLiked ? '❤️' : '🤍'} ${likesCount} ${likesCount === 1 ? 'Like' : 'Likes'}
          </button>
        </div>
      ` : `
        <div class="post-actions">
          <span class="text-muted">❤️ ${likesCount} ${likesCount === 1 ? 'Like' : 'Likes'}</span>
        </div>
      `}
    </div>
  `;
}

// Attach event listeners
function attachPostEventListeners() {
    document.querySelectorAll('.like-btn').forEach(btn => {
        btn.addEventListener('click', handleLike);
    });

    document.querySelectorAll('.delete-post-btn').forEach(btn => {
        btn.addEventListener('click', handleDeletePost);
    });
}

// Handle like
async function handleLike(e) {
    if (!app.isAuthenticated()) {
        window.location.href = '/login';
        return;
    }

    const postId = e.currentTarget.dataset.postId;

    try {
        await app.apiRequest(`/posts/${postId}/like`, { method: 'PUT' });
        loadPosts();
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
        await app.apiRequest(`/posts/${postId}`, { method: 'DELETE' });
        app.showAlert('Post deleted successfully', 'success');
        loadPosts();
    } catch (error) {
        app.showAlert(error.message);
    }
}

// Handle follow
async function handleFollow() {
    if (!app.isAuthenticated()) {
        window.location.href = '/login';
        return;
    }

    try {
        const data = await app.apiRequest(`/users/${username}/follow`, { method: 'PUT' });

        // Reload profile to update follow status
        loadProfile();

        app.showAlert(
            data.following ? 'Successfully followed!' : 'Successfully unfollowed!',
            'success'
        );
    } catch (error) {
        app.showAlert(error.message);
    }
}

// Open edit modal
function openEditModal() {
    document.getElementById('editFullName').value = currentProfile.fullName;
    document.getElementById('editBio').value = currentProfile.bio || '';
    editProfileModal.classList.remove('hidden');
}

// Handle edit profile form
editProfileForm?.addEventListener('submit', async (e) => {
    e.preventDefault();

    const submitBtn = e.target.querySelector('button[type="submit"]');
    app.showLoading(submitBtn);

    try {
        const formData = new FormData();
        formData.append('fullName', document.getElementById('editFullName').value.trim());
        formData.append('bio', document.getElementById('editBio').value.trim());

        const profilePicture = document.getElementById('editProfilePicture').files[0];
        if (profilePicture) {
            formData.append('profilePicture', profilePicture);
        }

        const response = await fetch(`${app.API_URL}/users/profile`, {
            method: 'PUT',
            headers: app.getAuthHeaders(),
            body: formData
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || 'Failed to update profile');
        }

        // Update stored user data
        const currentUser = app.getCurrentUser();
        app.saveAuthData(localStorage.getItem('token'), data.user);

        closeModal();
        loadProfile();
        app.showAlert('Profile updated successfully!', 'success');

    } catch (error) {
        app.showAlert(error.message);
    } finally {
        app.hideLoading(submitBtn);
    }
});

// Escape HTML
function escapeHTML(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Initial load
loadProfile();
loadPosts();
