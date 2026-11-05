/**
 * Secure User Authentication Client-Side Application
 * - Strictly cookie-based (HTTP-only)
 * - Zero localStorage token leakage
 * - Automatic session recovery via GET /api/auth/me
 */

(function () {
  'use strict';

  // Base API URL (relative to support same-origin deployment)
  const API_BASE = '/api/auth';

  // State
  let currentUser = null;
  let isLoading = false;

  // DOM Elements
  const initialLoader = document.getElementById('initialLoader');
  const alertContainer = document.getElementById('alertContainer');
  const alertBox = document.getElementById('alertBox');
  const alertIcon = document.getElementById('alertIcon');
  const alertText = document.getElementById('alertText');
  const alertClose = document.getElementById('alertClose');

  const authSection = document.getElementById('authSection');
  const dashboardSection = document.getElementById('dashboardSection');
  const navLinks = document.getElementById('navLinks');

  const tabLogin = document.getElementById('tabLogin');
  const tabRegister = document.getElementById('tabRegister');
  const loginForm = document.getElementById('loginForm');
  const registerForm = document.getElementById('registerForm');
  const switchToRegister = document.getElementById('switchToRegister');
  const switchToLogin = document.getElementById('switchToLogin');

  const loginBtn = document.getElementById('loginBtn');
  const registerBtn = document.getElementById('registerBtn');

  // Registration inputs
  const regName = document.getElementById('regName');
  const regEmail = document.getElementById('regEmail');
  const regPassword = document.getElementById('regPassword');
  const strengthBar = document.getElementById('strengthBar');
  const strengthText = document.getElementById('strengthText');
  const ruleLength = document.getElementById('ruleLength');
  const ruleUpper = document.getElementById('ruleUpper');
  const ruleLower = document.getElementById('ruleLower');
  const ruleNumber = document.getElementById('ruleNumber');
  const ruleSpecial = document.getElementById('ruleSpecial');

  // Dashboard elements
  const dashUserName = document.getElementById('dashUserName');
  const dashUserId = document.getElementById('dashUserId');
  const dashProfileName = document.getElementById('dashProfileName');
  const dashProfileEmail = document.getElementById('dashProfileEmail');
  const dashMemberSince = document.getElementById('dashMemberSince');
  const dashLogoutBtn = document.getElementById('dashLogoutBtn');
  const btnFetchMe = document.getElementById('btnFetchMe');
  const btnFetchDashboardStats = document.getElementById('btnFetchDashboardStats');
  const apiResponseBox = document.getElementById('apiResponseBox');
  const responseStatusBadge = document.getElementById('responseStatusBadge');

  // ================= UI Helpers ================= //

  function showAlert(message, type = 'info', duration = 5000) {
    alertBox.className = `alert-box ${type}`;
    alertIcon.textContent = type === 'success' ? '✅' : type === 'error' ? '⚠️' : 'ℹ️';
    
    // Support string or array of errors
    if (Array.isArray(message)) {
      alertText.innerHTML = `<ul style="margin: 0; padding-left: 1.2rem;">${message
        .map((m) => `<li>${m}</li>`)
        .join('')}</ul>`;
    } else {
      alertText.textContent = message;
    }

    alertContainer.classList.remove('hidden');

    if (duration > 0) {
      setTimeout(() => {
        dismissAlert();
      }, duration);
    }
  }

  function dismissAlert() {
    alertContainer.classList.add('hidden');
  }

  alertClose.addEventListener('click', dismissAlert);

  function setButtonLoading(button, loading) {
    const textSpan = button.querySelector('.btn-text');
    const loaderSpan = button.querySelector('.btn-loader');
    button.disabled = loading;
    if (loading) {
      if (textSpan) textSpan.classList.add('hidden');
      if (loaderSpan) loaderSpan.classList.remove('hidden');
    } else {
      if (textSpan) textSpan.classList.remove('hidden');
      if (loaderSpan) loaderSpan.classList.add('hidden');
    }
  }

  // ================= Navigation & View Management ================= //

  function updateNavbar() {
    navLinks.innerHTML = '';
    if (currentUser) {
      const userBadge = document.createElement('div');
      userBadge.className = 'nav-user-pill';
      userBadge.innerHTML = `<span>👤</span><span>${currentUser.name}</span>`;

      const logoutNavBtn = document.createElement('button');
      logoutNavBtn.className = 'btn btn-outline';
      logoutNavBtn.style.padding = '0.4rem 0.8rem';
      logoutNavBtn.style.fontSize = '0.8rem';
      logoutNavBtn.textContent = 'Logout';
      logoutNavBtn.addEventListener('click', handleLogout);

      navLinks.appendChild(userBadge);
      navLinks.appendChild(logoutNavBtn);
    } else {
      const loginNavBtn = document.createElement('button');
      loginNavBtn.className = 'btn btn-outline';
      loginNavBtn.style.padding = '0.4rem 0.8rem';
      loginNavBtn.style.fontSize = '0.8rem';
      loginNavBtn.textContent = 'Sign In';
      loginNavBtn.addEventListener('click', () => showAuthView('login'));

      const regNavBtn = document.createElement('button');
      regNavBtn.className = 'btn btn-primary';
      regNavBtn.style.padding = '0.4rem 0.8rem';
      regNavBtn.style.fontSize = '0.8rem';
      regNavBtn.textContent = 'Register';
      regNavBtn.addEventListener('click', () => showAuthView('register'));

      navLinks.appendChild(loginNavBtn);
      navLinks.appendChild(regNavBtn);
    }
  }

  function showAuthView(tab = 'login') {
    authSection.classList.remove('hidden');
    dashboardSection.classList.add('hidden');

    if (tab === 'login') {
      tabLogin.classList.add('active');
      tabRegister.classList.remove('active');
      loginForm.classList.remove('hidden');
      registerForm.classList.add('hidden');
    } else {
      tabRegister.classList.add('active');
      tabLogin.classList.remove('active');
      registerForm.classList.remove('hidden');
      loginForm.classList.add('hidden');
    }
  }

  function showDashboardView(user) {
    authSection.classList.add('hidden');
    dashboardSection.classList.remove('hidden');

    dashUserName.textContent = user.name || 'User';
    dashUserId.textContent = user.id || '-';
    dashProfileName.textContent = user.name || '-';
    dashProfileEmail.textContent = user.email || '-';

    const createdDate = user.createdAt ? new Date(user.createdAt).toLocaleString() : 'Recent';
    dashMemberSince.textContent = createdDate;

    // Reset API tester box
    apiResponseBox.textContent = '// Authenticated session active. Click an endpoint above to test.';
    responseStatusBadge.textContent = '200 OK';
    responseStatusBadge.className = 'status-badge ok';
  }

  // Tab switcher events
  tabLogin.addEventListener('click', () => showAuthView('login'));
  tabRegister.addEventListener('click', () => showAuthView('register'));
  switchToRegister.addEventListener('click', () => showAuthView('register'));
  switchToLogin.addEventListener('click', () => showAuthView('login'));

  // Toggle password visibility
  document.querySelectorAll('.toggle-password').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      const targetId = btn.getAttribute('data-target');
      const input = document.getElementById(targetId);
      if (input.type === 'password') {
        input.type = 'text';
        btn.textContent = '🙈';
      } else {
        input.type = 'password';
        btn.textContent = '👁️';
      }
    });
  });

  // ================= Password Strength Evaluator ================= //

  function evaluatePasswordStrength(password) {
    const checks = {
      length: password.length >= 8,
      upper: /[A-Z]/.test(password),
      lower: /[a-z]/.test(password),
      number: /[0-9]/.test(password),
      special: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password),
    };

    ruleLength.className = checks.length ? 'valid' : 'invalid';
    ruleUpper.className = checks.upper ? 'valid' : 'invalid';
    ruleLower.className = checks.lower ? 'valid' : 'invalid';
    ruleNumber.className = checks.number ? 'valid' : 'invalid';
    ruleSpecial.className = checks.special ? 'valid' : 'invalid';

    const passedCount = Object.values(checks).filter(Boolean).length;
    let strengthPercent = (passedCount / 5) * 100;
    strengthBar.style.width = `${strengthPercent}%`;

    if (passedCount <= 2) {
      strengthBar.style.backgroundColor = 'var(--danger)';
      strengthText.textContent = 'Strength: Weak';
      strengthText.style.color = 'var(--danger)';
    } else if (passedCount <= 4) {
      strengthBar.style.backgroundColor = 'var(--warning)';
      strengthText.textContent = 'Strength: Moderate';
      strengthText.style.color = 'var(--warning)';
    } else {
      strengthBar.style.backgroundColor = 'var(--success)';
      strengthText.textContent = 'Strength: Strong (Secure)';
      strengthText.style.color = 'var(--success)';
    }

    return passedCount === 5;
  }

  regPassword.addEventListener('input', (e) => {
    evaluatePasswordStrength(e.target.value);
  });

  // ================= API Calls (credentials: 'include') ================= //

  /**
   * 1. Register API Call
   */
  registerForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    dismissAlert();

    const name = regName.value.trim();
    const email = regEmail.value.trim();
    const password = regPassword.value;

    if (!name || !email || !password) {
      showAlert('All fields are required.', 'error');
      return;
    }

    if (!evaluatePasswordStrength(password)) {
      showAlert('Please ensure your password meets all 5 strength requirements.', 'error');
      return;
    }

    setButtonLoading(registerBtn, true);

    try {
      const response = await fetch(`${API_BASE}/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include', // Include cookies if applicable
        body: JSON.stringify({ name, email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        const errorMsg = data.errors ? data.errors : data.message || 'Registration failed.';
        showAlert(errorMsg, 'error');
        return;
      }

      showAlert('Registration successful! Please sign in with your new account.', 'success');
      registerForm.reset();
      evaluatePasswordStrength('');
      // Switch to login tab and prefill email
      showAuthView('login');
      document.getElementById('loginEmail').value = email;
      document.getElementById('loginPassword').focus();
    } catch (err) {
      console.error('Registration fetch error:', err);
      showAlert('Network error: Unable to connect to server.', 'error');
    } finally {
      setButtonLoading(registerBtn, false);
    }
  });

  /**
   * 2. Login API Call
   */
  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    dismissAlert();

    const email = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPassword').value;

    if (!email || !password) {
      showAlert('Please enter both email and password.', 'error');
      return;
    }

    setButtonLoading(loginBtn, true);

    try {
      const response = await fetch(`${API_BASE}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include', // Crucial: allows browser to store HTTP-only Set-Cookie
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        showAlert(data.message || 'Invalid credentials.', 'error');
        return;
      }

      // Success
      currentUser = data.user;
      showAlert(`Welcome back, ${currentUser.name}!`, 'success', 3000);
      loginForm.reset();
      updateNavbar();
      showDashboardView(currentUser);
    } catch (err) {
      console.error('Login fetch error:', err);
      showAlert('Network error: Unable to connect to server.', 'error');
    } finally {
      setButtonLoading(loginBtn, false);
    }
  });

  /**
   * 3. Logout API Call
   */
  async function handleLogout() {
    dismissAlert();
    try {
      const response = await fetch(`${API_BASE}/logout`, {
        method: 'POST',
        credentials: 'include', // Clear cookie on server
      });

      if (response.ok) {
        currentUser = null;
        updateNavbar();
        showAuthView('login');
        showAlert('You have been logged out safely.', 'info');
      } else {
        showAlert('Logout request encountered an error.', 'error');
      }
    } catch (err) {
      console.error('Logout error:', err);
      currentUser = null;
      updateNavbar();
      showAuthView('login');
    }
  }

  dashLogoutBtn.addEventListener('click', handleLogout);

  /**
   * 4. Session Persistence Check on Page Load (GET /api/auth/me)
   */
  async function checkActiveSession() {
    try {
      const response = await fetch(`${API_BASE}/me`, {
        method: 'GET',
        credentials: 'include', // Send HTTP-only cookie automatically
      });

      if (response.ok) {
        const data = await response.json();
        currentUser = data.user;
        updateNavbar();
        showDashboardView(currentUser);
      } else {
        currentUser = null;
        updateNavbar();
        showAuthView('login');
      }
    } catch (err) {
      console.warn('Could not verify session:', err.message);
      currentUser = null;
      updateNavbar();
      showAuthView('login');
    } finally {
      initialLoader.classList.add('hidden');
    }
  }

  /**
   * 5. Interactive Protected Route Tester
   */
  async function testProtectedRoute(url, label) {
    responseStatusBadge.textContent = 'Calling...';
    responseStatusBadge.className = 'status-badge';
    apiResponseBox.textContent = `Sending GET request to ${url} with credentials: 'include'...`;

    try {
      const response = await fetch(url, {
        method: 'GET',
        credentials: 'include',
      });

      const data = await response.json();
      responseStatusBadge.textContent = `${response.status} ${response.statusText}`;
      responseStatusBadge.className = `status-badge ${response.ok ? 'ok' : 'error'}`;
      apiResponseBox.textContent = JSON.stringify(data, null, 2);

      // If token expired while user was in dashboard
      if (response.status === 401) {
        showAlert('Session expired. Please log in again.', 'error');
        currentUser = null;
        updateNavbar();
        showAuthView('login');
      }
    } catch (err) {
      responseStatusBadge.textContent = 'Error';
      responseStatusBadge.className = 'status-badge error';
      apiResponseBox.textContent = `Error: ${err.message}`;
    }
  }

  btnFetchMe.addEventListener('click', () => {
    testProtectedRoute(`${API_BASE}/me`, 'GET /api/auth/me');
  });

  btnFetchDashboardStats.addEventListener('click', () => {
    testProtectedRoute(`${API_BASE}/dashboard-stats`, 'GET /api/auth/dashboard-stats');
  });

  // Initialize
  checkActiveSession();
})();
