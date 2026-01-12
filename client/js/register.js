// Redirect if already authenticated
app.requireGuest();

const registerForm = document.getElementById('registerForm');

registerForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const formData = {
        fullName: document.getElementById('fullName').value.trim(),
        username: document.getElementById('username').value.trim(),
        email: document.getElementById('email').value.trim(),
        password: document.getElementById('password').value,
        confirmPassword: document.getElementById('confirmPassword').value
    };

    // Validate passwords match
    if (formData.password !== formData.confirmPassword) {
        app.showAlert('Passwords do not match');
        return;
    }

    const submitBtn = e.target.querySelector('button[type="submit"]');
    app.showLoading(submitBtn);

    try {
        const response = await fetch(`${app.API_URL}/auth/register`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                fullName: formData.fullName,
                username: formData.username,
                email: formData.email,
                password: formData.password
            })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || 'Registration failed');
        }

        // Save auth data
        app.saveAuthData(data.token, data.user);

        // Show success message
        app.showAlert('Account created successfully!', 'success');

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
