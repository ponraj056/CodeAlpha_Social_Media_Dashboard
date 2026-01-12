const API_URL = 'http://localhost:5000/api';

// Check if user is authenticated
function isAuthenticated() {
    return !!localStorage.getItem('token');
}

// Get current user from token
function getCurrentUser() {
    const user = localStorage.getItem('user');
    return user ? JSON.parse(user) : null;
}

// Save auth data
function saveAuthData(token, user) {
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(user));
}

// Clear auth data
function clearAuthData() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
}

// Get auth headers
function getAuthHeaders() {
    const token = localStorage.getItem('token');
    return {
        'Authorization': `Bearer ${token}`
    };
}

// Make API request
async function apiRequest(endpoint, options = {}) {
    const url = `${API_URL}${endpoint}`;
    const config = {
        headers: {
            'Content-Type': 'application/json',
            ...options.headers
        },
        ...options
    };

    if (isAuthenticated() && !options.skipAuth) {
        config.headers = {
            ...config.headers,
            ...getAuthHeaders()
        };
    }

    try {
        const response = await fetch(url, config);
        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || 'Something went wrong');
        }

        return data;
    } catch (error) {
        console.error('API Error:', error);
        throw error;
    }
}

// Format date
function formatDate(date) {
    const now = new Date();
    const postDate = new Date(date);
    const diffMs = now - postDate;
    const diffSecs = Math.floor(diffMs / 1000);
    const diffMins = Math.floor(diffSecs / 60);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffSecs < 60) return 'just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;

    return postDate.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: postDate.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
    });
}

// Show alert
function showAlert(message, type = 'error') {
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${type}`;
    alertDiv.textContent = message;

    const container = document.querySelector('.container') || document.body;
    container.insertBefore(alertDiv, container.firstChild);

    setTimeout(() => alertDiv.remove(), 5000);
}

// Show loading
function showLoading(button) {
    button.disabled = true;
    button.dataset.originalText = button.innerHTML;
    button.innerHTML = '<span class="loader"></span>';
}

// Hide loading
function hideLoading(button) {
    button.disabled = false;
    button.innerHTML = button.dataset.originalText;
}

// Redirect if not authenticated
function requireAuth() {
    if (!isAuthenticated()) {
        window.location.href = '/login';
        return false;
    }
    return true;
}

// Redirect if authenticated
function requireGuest() {
    if (isAuthenticated()) {
        window.location.href = '/';
        return false;
    }
    return true;
}

// Update navbar
function updateNavbar() {
    const user = getCurrentUser();
    const navMenu = document.querySelector('.navbar-menu');

    if (!navMenu) return;

    if (user) {
        navMenu.innerHTML = `
      <li><a href="/">Feed</a></li>
      <li><a href="/profile/${user.username}">Profile</a></li>
      <li><a href="#" id="logoutBtn">Logout</a></li>
    `;

        document.getElementById('logoutBtn')?.addEventListener('click', (e) => {
            e.preventDefault();
            clearAuthData();
            window.location.href = '/login';
        });
    } else {
        navMenu.innerHTML = `
      <li><a href="/login">Login</a></li>
      <li><a href="/register" class="btn btn-primary btn-sm">Sign Up</a></li>
    `;
    }
}

// File preview
function previewFile(input, previewElement) {
    const file = input.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            if (previewElement.tagName === 'IMG') {
                previewElement.src = e.target.result;
                previewElement.classList.remove('hidden');
            }
        };
        reader.readAsDataURL(file);
    }
}

// Export for use in other scripts
window.app = {
    API_URL,
    isAuthenticated,
    getCurrentUser,
    saveAuthData,
    clearAuthData,
    getAuthHeaders,
    apiRequest,
    formatDate,
    showAlert,
    showLoading,
    hideLoading,
    requireAuth,
    requireGuest,
    updateNavbar,
    previewFile
};
