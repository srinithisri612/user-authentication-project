/**
 * Automated Verification & Test Suite
 * Tests all 13+ Authentication & Authorization Scenarios
 */

process.env.NODE_ENV = 'test';
process.env.PORT = '5099'; // Test port
process.env.JWT_SECRET = 'super_secret_test_key_for_automated_testing_12345!';
process.env.JWT_EXPIRES_IN = '1h';
process.env.DB_PATH = './data/test_database.sqlite';

const fs = require('fs');
const path = require('path');
const jwt = require('jsonwebtoken');
const app = require('../src/app');
const { initDatabase, db, query } = require('../src/config/database');

// Clean up previous test database if present
const testDbPath = path.resolve(__dirname, '../data/test_database.sqlite');
if (fs.existsSync(testDbPath)) {
  try {
    fs.unlinkSync(testDbPath);
  } catch (e) {
    // ignore
  }
}

let server;
const BASE_URL = `http://127.0.0.1:5099`;

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

function assert(condition, message) {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`  ✅ PASS: ${message}`);
  } else {
    failedTests++;
    console.error(`  ❌ FAIL: ${message}`);
  }
}

// Helper to make HTTP requests
async function makeRequest(endpoint, options = {}) {
  const url = `${BASE_URL}${endpoint}`;
  const headers = options.headers || {};
  if (options.body && typeof options.body === 'object') {
    options.body = JSON.stringify(options.body);
    headers['Content-Type'] = 'application/json';
  }
  options.headers = headers;

  const res = await fetch(url, options);
  let json = null;
  const rawText = await res.text();
  try {
    json = JSON.parse(rawText);
  } catch (e) {
    json = { raw: rawText };
  }

  // Extract cookies
  const setCookie = res.headers.get('set-cookie');
  return {
    status: res.status,
    headers: res.headers,
    cookie: setCookie,
    body: json,
  };
}

async function runTests() {
  console.log('====================================================');
  console.log('🧪 Starting User Authentication Test Suite');
  console.log('====================================================\n');

  await initDatabase();

  server = app.listen(5099);

  let userCookie = null;
  let testUser = {
    name: 'Jane Doe',
    email: 'jane.doe@example.com',
    password: 'SecurePassword123!',
  };

  try {
    // ----------------------------------------------------
    // Scenario 1: Register a new user successfully
    // ----------------------------------------------------
    console.log('Scenario 1: Register a new user successfully');
    const regRes = await makeRequest('/api/auth/register', {
      method: 'POST',
      body: testUser,
    });
    assert(regRes.status === 201, `Status is 201 Created (got ${regRes.status})`);
    assert(regRes.body.success === true, 'Response contains success: true');
    assert(regRes.body.user && regRes.body.user.email === testUser.email, 'Returns created user profile');
    assert(regRes.body.user.password === undefined, 'Never exposes password hash in response');

    // ----------------------------------------------------
    // Scenario 2: Prevent duplicate registration with same email
    // ----------------------------------------------------
    console.log('\nScenario 2: Prevent duplicate registration with same email');
    const dupRes = await makeRequest('/api/auth/register', {
      method: 'POST',
      body: testUser,
    });
    assert(dupRes.status === 409, `Duplicate email returns 409 Conflict (got ${dupRes.status})`);
    assert(dupRes.body.success === false, 'Response has success: false');
    assert(dupRes.body.message.includes('already exists'), 'Returns meaningful duplicate email error');

    // ----------------------------------------------------
    // Scenario 3: Validation on invalid inputs
    // ----------------------------------------------------
    console.log('\nScenario 3: Validation on invalid input (empty, bad email, weak password)');
    // 3a. Missing name
    const invRes1 = await makeRequest('/api/auth/register', {
      method: 'POST',
      body: { name: '', email: 'valid@example.com', password: 'Password123!' },
    });
    assert(invRes1.status === 400, 'Empty name rejected with 400 Bad Request');

    // 3b. Invalid email format
    const invRes2 = await makeRequest('/api/auth/register', {
      method: 'POST',
      body: { name: 'Test', email: 'not-an-email', password: 'Password123!' },
    });
    assert(invRes2.status === 400, 'Invalid email format rejected with 400 Bad Request');

    // 3c. Weak password (no number/special character)
    const invRes3 = await makeRequest('/api/auth/register', {
      method: 'POST',
      body: { name: 'Test', email: 'valid2@example.com', password: 'weakpassword' },
    });
    assert(invRes3.status === 400, 'Weak password rejected with 400 Bad Request');
    assert(Array.isArray(invRes3.body.errors), 'Returns detailed list of password validation rules violated');

    // ----------------------------------------------------
    // Scenario 4: Login with valid credentials
    // ----------------------------------------------------
    console.log('\nScenario 4: Login using valid credentials');
    const loginRes = await makeRequest('/api/auth/login', {
      method: 'POST',
      body: {
        email: testUser.email,
        password: testUser.password,
      },
    });
    assert(loginRes.status === 200, `Login returns 200 OK (got ${loginRes.status})`);
    assert(loginRes.body.success === true, 'Login successful flag is true');
    assert(loginRes.cookie && loginRes.cookie.includes('token='), 'HTTP-only Set-Cookie header is present');
    assert(loginRes.cookie.toLowerCase().includes('httponly'), 'Cookie has HttpOnly flag set');
    assert(loginRes.cookie.toLowerCase().includes('samesite'), 'Cookie has SameSite flag set');
    assert(loginRes.body.user.password === undefined, 'User object in login response omits password');

    // Save cookie for authenticated calls
    userCookie = loginRes.cookie.split(';')[0]; // e.g. "token=eyJhbG..."

    // ----------------------------------------------------
    // Scenario 5: Login with incorrect password
    // ----------------------------------------------------
    console.log('\nScenario 5: Login with incorrect password');
    const wrongPassRes = await makeRequest('/api/auth/login', {
      method: 'POST',
      body: {
        email: testUser.email,
        password: 'WrongPassword999!',
      },
    });
    assert(wrongPassRes.status === 401, `Incorrect password returns 401 Unauthorized (got ${wrongPassRes.status})`);
    assert(wrongPassRes.body.message === 'Invalid email or password.', 'Generic error message returned for security');

    // ----------------------------------------------------
    // Scenario 6: Login with non-existent email
    // ----------------------------------------------------
    console.log('\nScenario 6: Login with non-existent email');
    const nonExistentRes = await makeRequest('/api/auth/login', {
      method: 'POST',
      body: {
        email: 'nobody@example.com',
        password: 'SomePassword123!',
      },
    });
    assert(nonExistentRes.status === 401, `Non-existent user returns 401 Unauthorized (got ${nonExistentRes.status})`);
    assert(nonExistentRes.body.message === 'Invalid email or password.', 'Identical generic message prevents email enumeration');

    // ----------------------------------------------------
    // Scenario 7: Access /api/auth/me without token
    // ----------------------------------------------------
    console.log('\nScenario 7: Access /api/auth/me without token');
    const unauthRes = await makeRequest('/api/auth/me', {
      method: 'GET',
    });
    assert(unauthRes.status === 401, `Unauthenticated request returns 401 Unauthorized (got ${unauthRes.status})`);
    assert(unauthRes.body.success === false, 'Success is false');

    // ----------------------------------------------------
    // Scenario 8: Access /api/auth/me with valid token cookie
    // ----------------------------------------------------
    console.log('\nScenario 8: Access /api/auth/me with valid token cookie');
    const authMeRes = await makeRequest('/api/auth/me', {
      method: 'GET',
      headers: {
        Cookie: userCookie,
      },
    });
    assert(authMeRes.status === 200, `Protected profile returns 200 OK (got ${authMeRes.status})`);
    assert(authMeRes.body.success === true, 'Success is true');
    assert(authMeRes.body.user.email === testUser.email, 'Authenticated user email matches');
    assert(authMeRes.body.user.name === testUser.name, 'Authenticated user name matches');
    assert(authMeRes.body.user.password === undefined, 'Password hash is NOT exposed');

    // ----------------------------------------------------
    // Scenario 9: Access /api/auth/me with invalid token
    // ----------------------------------------------------
    console.log('\nScenario 9: Access /api/auth/me with invalid/tampered token');
    const invalidTokenRes = await makeRequest('/api/auth/me', {
      method: 'GET',
      headers: {
        Cookie: 'token=invalid.tampered.token_signature',
      },
    });
    assert(invalidTokenRes.status === 401, `Invalid token returns 401 Unauthorized (got ${invalidTokenRes.status})`);

    // ----------------------------------------------------
    // Scenario 10: Access /api/auth/me with expired token
    // ----------------------------------------------------
    console.log('\nScenario 10: Access /api/auth/me with expired token');
    const expiredToken = jwt.sign(
      { id: 1 },
      process.env.JWT_SECRET,
      { expiresIn: '-1s' } // Expired 1 second ago
    );
    const expiredRes = await makeRequest('/api/auth/me', {
      method: 'GET',
      headers: {
        Cookie: `token=${expiredToken}`,
      },
    });
    assert(expiredRes.status === 401, `Expired token returns 401 Unauthorized (got ${expiredRes.status})`);
    assert(expiredRes.body.message.includes('expired'), 'Response informs client token has expired');

    // ----------------------------------------------------
    // Scenario 11: Reusable middleware on additional route
    // ----------------------------------------------------
    console.log('\nScenario 11: Reusable middleware on /api/auth/dashboard-stats');
    const statsRes = await makeRequest('/api/auth/dashboard-stats', {
      method: 'GET',
      headers: {
        Cookie: userCookie,
      },
    });
    assert(statsRes.status === 200, `Additional protected route returns 200 OK (got ${statsRes.status})`);
    assert(statsRes.body.accessedBy === testUser.email, 'Correct user context attached by middleware');

    // ----------------------------------------------------
    // Scenario 12: Logout successfully
    // ----------------------------------------------------
    console.log('\nScenario 12: Logout successfully');
    const logoutRes = await makeRequest('/api/auth/logout', {
      method: 'POST',
      headers: {
        Cookie: userCookie,
      },
    });
    assert(logoutRes.status === 200, `Logout returns 200 OK (got ${logoutRes.status})`);
    assert(logoutRes.cookie && (logoutRes.cookie.includes('token=;') || logoutRes.cookie.includes('Max-Age=0') || logoutRes.cookie.includes('Expires=')), 'Cookie cleared in response');

    // ----------------------------------------------------
    // Scenario 13: Access protected route after logout (cleared cookie)
    // ----------------------------------------------------
    console.log('\nScenario 13: Attempt to access protected route after logout');
    const postLogoutRes = await makeRequest('/api/auth/me', {
      method: 'GET',
      headers: {
        Cookie: 'token=',
      },
    });
    assert(postLogoutRes.status === 401, `Access after logout returns 401 Unauthorized (got ${postLogoutRes.status})`);

    // ----------------------------------------------------
    // Scenario 14: Verify bcrypt hashing in database
    // ----------------------------------------------------
    console.log('\nScenario 14: Verify password in database is bcrypt hash and NOT plain text');
    const dbUser = await query.get('SELECT * FROM users WHERE email = ?', [testUser.email]);
    assert(dbUser !== undefined, 'User found in database');
    assert(dbUser.password !== testUser.password, 'Password in database is NOT plain text');
    const isBcrypt = dbUser.password.startsWith('$2a$') || dbUser.password.startsWith('$2b$');
    assert(isBcrypt, `Stored password is a genuine bcrypt hash (${dbUser.password.substring(0, 10)}...)`);

    // Summary
    console.log('\n====================================================');
    console.log(`🏁 Test Summary: ${passedTests}/${totalTests} Passed (${failedTests} Failed)`);
    console.log('====================================================');

    if (failedTests > 0) {
      process.exitCode = 1;
    }
  } catch (err) {
    console.error('Fatal test error:', err);
    process.exitCode = 1;
  } finally {
    if (server) server.close();
    db.close();
  }
}

runTests();
