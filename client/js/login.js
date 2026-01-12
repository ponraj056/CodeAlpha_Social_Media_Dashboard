// Redirect if already authenticated
app.requireGuest();

const loginForm = document.getElementById('loginForm');

loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const formData = {
        email: document.getElementById('email').value.trim(),
        password: document.getElementById('password').value
    };

    const submitBtn = e.target.querySelector('button[type="submit"]');
    app.showLoading(submitBtn);

    try {
        const response = await fetch(`${app.API_URL}/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(formData)
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || 'Login failed');
        }

        // Save auth data
        app.saveAuthData(data.token, data.user);

        // Show success message
        app.showAlert('Login successful!', 'success');

        // Redirect to home
        setTimeout(() => {
            window.location.href = '/';
        }, 1000);

    } catch (error) {
        app.showAlert(error.message);
    } finally {
        app.hideLoading(submitBtn);
    }
});
