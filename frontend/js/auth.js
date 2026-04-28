/**
 * SkySafe Authentication Module
 * Handles both Login and Registration in one file
 * Auto-detects page type based on form elements present
 * API Base URL: http://localhost:5000/api
 */

const API_BASE_URL = 'http://localhost:5000/api';

// ==================== UTILITY FUNCTIONS ====================

function showMessage(elementId, message, type = 'error') {
    const msgElement = document.getElementById(elementId);
    if (!msgElement) {
        console.warn(`Message element #${elementId} not found`);
        return;
    }
    
    msgElement.textContent = message;
    msgElement.style.display = 'block';
    msgElement.className = 'msg-box';
    
    if (type === 'success') {
        msgElement.style.color = '#28a745';
        msgElement.style.backgroundColor = 'rgba(40, 167, 69, 0.1)';
        msgElement.style.border = '1px solid #28a745';
    } else if (type === 'error') {
        msgElement.style.color = '#dc3545';
        msgElement.style.backgroundColor = 'rgba(220, 53, 69, 0.1)';
        msgElement.style.border = '1px solid #dc3545';
    } else {
        msgElement.style.color = '#17a2b8';
        msgElement.style.backgroundColor = 'rgba(23, 162, 184, 0.1)';
        msgElement.style.border = '1px solid #17a2b8';
    }
    
    setTimeout(() => {
        msgElement.textContent = '';
        msgElement.style.display = 'none';
    }, 5000);
}

function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

function checkPasswordStrength(password) {
    let score = 0;
    if (password.length >= 6) score++;
    if (password.length >= 8) score++;
    if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[^A-Za-z0-9]/.test(password)) score++;
    
    const levels = [
        { label: 'Very Weak', color: '#ff4444' },
        { label: 'Weak', color: '#ff8844' },
        { label: 'Fair', color: '#ffaa44' },
        { label: 'Good', color: '#44aa44' },
        { label: 'Strong', color: '#44ff44' }
    ];
    
    const index = Math.max(0, Math.min(score - 1, 4));
    return {
        score: score,
        label: levels[index].label,
        color: levels[index].color,
        percent: (score / 5) * 100
    };
}

function updateStrengthUI(password, fillId, labelId) {
    const fillEl = document.getElementById(fillId);
    const labelEl = document.getElementById(labelId);
    if (!fillEl) return;
    
    const strength = checkPasswordStrength(password);
    if (password.length === 0) {
        fillEl.style.width = '0%';
        if (labelEl) labelEl.textContent = '';
    } else {
        fillEl.style.width = `${strength.percent}%`;
        fillEl.style.backgroundColor = strength.color;
        if (labelEl) {
            labelEl.textContent = strength.label;
            labelEl.style.color = strength.color;
        }
    }
}

function togglePasswordVisibility(inputId, iconId) {
    const input = document.getElementById(inputId);
    const icon = document.getElementById(iconId);
    if (!input || !icon) return;
    
    if (input.type === 'password') {
        input.type = 'text';
        icon.classList.remove('fa-eye');
        icon.classList.add('fa-eye-slash');
    } else {
        input.type = 'password';
        icon.classList.remove('fa-eye-slash');
        icon.classList.add('fa-eye');
    }
}

// ==================== API CALLS ====================

async function registerUser(fullName, email, password) {
    try {
        const response = await fetch(`${API_BASE_URL}/auth/register`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify({
                full_name: fullName,
                email: email,
                password: password
            })
        });
        return await response.json();
    } catch (error) {
        console.error('Registration API Error:', error);
        return {
            success: false,
            message: 'Network error. Please check if server is running on port 5000.'
        };
    }
}

async function loginUser(email, password) {
    try {
        const response = await fetch(`${API_BASE_URL}/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify({
                email: email,
                password: password
            })
        });
        return await response.json();
    } catch (error) {
        console.error('Login API Error:', error);
        return {
            success: false,
            message: 'Network error. Please check if server is running on port 5000.'
        };
    }
}

// ==================== SESSION MANAGEMENT ====================

function saveUserSession(userData, token) {
    localStorage.setItem('skysafe_user', JSON.stringify(userData));
    if (token) localStorage.setItem('skysafe_token', token);
    localStorage.setItem('skysafe_logged_in', 'true');
    localStorage.setItem('skysafe_login_time', new Date().toISOString());
}

function getCurrentUser() {
    const user = localStorage.getItem('skysafe_user');
    return user ? JSON.parse(user) : null;
}

function isLoggedIn() {
    const loggedInFlag = localStorage.getItem('skysafe_logged_in') === 'true';
    const hasToken = !!localStorage.getItem('skysafe_token');
    const hasUser = !!localStorage.getItem('skysafe_user');
    return loggedInFlag || (hasToken && hasUser);
}

function logout(redirectUrl = 'login.html') {
    localStorage.removeItem('skysafe_user');
    localStorage.removeItem('skysafe_token');
    localStorage.removeItem('skysafe_logged_in');
    localStorage.removeItem('skysafe_login_time');
    window.location.href = redirectUrl;
}

function requireAuth(loginPage = 'login.html') {
    if (!isLoggedIn()) {
        window.location.href = loginPage;
        return false;
    }
    return true;
}

function redirectIfAuth(dashboardPage = 'forecast.html') {
    if (isLoggedIn()) {
        window.location.href = dashboardPage;
        return true;
    }
    return false;
}

// ==================== PAGE INITIALIZATION ====================

function initRegistrationPage() {
    console.log('Initializing Registration Page...');
    const form = document.getElementById('form');
    if (!form) return;
    
    const fnameInput = document.getElementById('fname');
    const emailInput = document.getElementById('email');
    const p1Input = document.getElementById('p1');
    const p2Input = document.getElementById('p2');
    
    if (!fnameInput || !emailInput || !p1Input || !p2Input) {
        console.error('Some registration fields are missing');
        return;
    }
    
    p1Input.addEventListener('input', function() {
        updateStrengthUI(this.value, 'strengthFill', 'strengthLbl');
    });
    
    const eyeBtn1 = document.getElementById('eyeBtn1');
    const eyeBtn2 = document.getElementById('eyeBtn2');
    if (eyeBtn1) eyeBtn1.addEventListener('click', () => togglePasswordVisibility('p1', 'eyeIc1'));
    if (eyeBtn2) eyeBtn2.addEventListener('click', () => togglePasswordVisibility('p2', 'eyeIc2'));
    
    form.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const fullName = fnameInput.value.trim();
        const email = emailInput.value.trim();
        const password = p1Input.value;
        const confirmPassword = p2Input.value;
        
        if (!fullName || !email || !password || !confirmPassword) {
            showMessage('msg', 'Please fill in all fields', 'error');
            return;
        }
        if (fullName.length < 2) {
            showMessage('msg', 'Name must be at least 2 characters', 'error');
            return;
        }
        if (!isValidEmail(email)) {
            showMessage('msg', 'Please enter a valid email address', 'error');
            return;
        }
        if (password.length < 6) {
            showMessage('msg', 'Password must be at least 6 characters', 'error');
            return;
        }
        if (password !== confirmPassword) {
            showMessage('msg', 'Passwords do not match', 'error');
            return;
        }
        
        const submitBtn = form.querySelector('button[type="submit"]');
        const originalHTML = submitBtn.innerHTML;
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<span>Creating Account...</span> <i class="fas fa-spinner fa-spin"></i>';
        
        const result = await registerUser(fullName, email, password);
        
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalHTML;
        
        if (result.success) {
            showMessage('msg', 'Account created! Redirecting...', 'success');
            saveUserSession(result.user, result.token);
            setTimeout(() => {
                if (result.user && result.user.role === 'admin') {
                    window.location.href = 'dashboard.html';
                } else {
                    window.location.href = 'forecast.html';
                }
            }, 1500);
        } else {
            showMessage('msg', result.message || 'Registration failed', 'error');
        }
    });
}

function initLoginPage() {
    console.log('Initializing Login Page...');
    const form = document.getElementById('form');
    if (!form) return;
    
    const emailInput = document.getElementById('Email') || document.getElementById('email');
    const passwordInput = document.getElementById('password') || document.getElementById('p1');
    
    if (!emailInput || !passwordInput) {
        console.error('Login fields not found');
        return;
    }
    
    if (document.getElementById('strengthFill')) {
        passwordInput.addEventListener('input', function() {
            updateStrengthUI(this.value, 'strengthFill', 'strengthLabel');
        });
    }
    
    const toggleBtn = document.getElementById('toggleP1');
    if (toggleBtn) toggleBtn.addEventListener('click', () => togglePasswordVisibility('password', 'eyeIcon1'));
    
    form.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const email = emailInput.value.trim();
        const password = passwordInput.value;
        
        if (!email || !password) {
            showMessage('msg', 'Please enter both email and password', 'error');
            return;
        }
        if (!isValidEmail(email)) {
            showMessage('msg', 'Please enter a valid email address', 'error');
            return;
        }
        
        const submitBtn = document.getElementById('n') || form.querySelector('button[type="submit"]');
        const originalHTML = submitBtn.innerHTML;
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<span class="btn-text">Logging in...</span> <i class="fas fa-spinner fa-spin"></i>';
        
        const result = await loginUser(email, password);
        
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalHTML;
        
        if (result.success) {
            showMessage('msg', 'Login successful! Redirecting...', 'success');
            saveUserSession(result.user, result.token);
            setTimeout(() => {
                if (result.user && result.user.role === 'admin') {
                    window.location.href = 'dashboard.html';
                } else {
                    window.location.href = 'forecast.html';
                }
            }, 1000);
        } else {
            showMessage('msg', result.message || 'Invalid credentials', 'error');
        }
    });
}

function initSession() {
    const user = getCurrentUser();
    if (user) {
        document.querySelectorAll('.user-name').forEach(el => el.textContent = user.full_name);
        document.querySelectorAll('.user-email').forEach(el => el.textContent = user.email);
    }
}

function initSkySafeAuth() {
    console.log('SkySafe Auth Initializing...');
    
    const hasFname = document.getElementById('fname');
    const hasConfirmPassword = document.getElementById('p2');
    const hasEmailField = document.getElementById('email') || document.getElementById('Email');
    
    if (hasFname && hasConfirmPassword) {
        console.log('Detected: Registration Page');
        if (isLoggedIn()) {
            window.location.href = 'forecast.html';
            return;
        }
        initRegistrationPage();
    } else if (hasEmailField && !hasFname) {
        console.log('Detected: Login Page');
        if (isLoggedIn()) {
            window.location.href = 'forecast.html';
            return;
        }
        initLoginPage();
    }
    
    initSession();
}

// ==================== START ON DOM READY ====================

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initSkySafeAuth);
} else {
    initSkySafeAuth();
}

// ==================== LOGOUT BUTTON HANDLER (ALL PAGES) ====================

document.addEventListener('DOMContentLoaded', function() {
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', function(e) {
            e.preventDefault();
            console.log('Logout clicked');
            logout();
        });
    }
});

// ==================== GLOBAL ACCESS ====================

window.SkySafeAuth = {
    login: loginUser,
    register: registerUser,
    logout: logout,
    isLoggedIn: isLoggedIn,
    getUser: getCurrentUser,
    requireAuth: requireAuth,
    redirectIfAuth: redirectIfAuth,
    showMessage: showMessage
};