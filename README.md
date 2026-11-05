# Secure User Authentication & JWT-Based Authorization System

A production-grade, secure User Authentication and Authorization system built with **Node.js**, **Express**, **SQLite**, **Bcrypt**, and **JSON Web Tokens (JWT)** stored in **HTTP-only cookies**.

---

## 🌟 Key Features

- **Robust User Registration (`POST /api/auth/register`)**:
  - Comprehensive input validation & sanitization (RFC-compliant email validation, name boundaries).
  - Strong password policy enforcement (minimum 8 characters, at least 1 uppercase letter, 1 lowercase letter, 1 number, and 1 special symbol).
  - High-grade password hashing with **bcryptjs** (12 salt rounds). Plain-text passwords are never stored.
  - Duplicate email detection returning `409 Conflict`.
- **Secure Authentication & Login (`POST /api/auth/login`)**:
  - Secure bcrypt hash comparison via `bcrypt.compare()`.
  - Generic error messages (`Invalid email or password.`) to prevent email enumeration attacks.
  - Rate limiting on login attempts to mitigate brute-force and credential-stuffing attacks.
  - JWT token signed with secret key and configurable expiration (e.g., 1 hour).
  - Automatic session assignment via **HTTP-only, SameSite, Secure cookies** (mitigating XSS and CSRF).
- **Reusable JWT Authorization Middleware**:
  - Extracts JWT from HTTP-only cookie (with fallback support for `Authorization: Bearer <token>` for API tools).
  - Verifies token signature and checks expiration.
  - Confirms user existence in the database.
  - Reusable across any protected API route.
- **Protected Profile & Resource Endpoints**:
  - `GET /api/auth/me`: Retrieves current user profile (never exposes password hash).
  - `GET /api/auth/dashboard-stats`: Demonstrates middleware reusability across multiple routes.
- **Graceful Logout (`POST /api/auth/logout`)**:
  - Invalidate session by clearing the HTTP-only cookie using matching cookie options.
- **Interactive Responsive Frontend**:
  - Single-page interface serving login, registration, and protected dashboard.
  - Real-time password strength meter and validation checklist.
  - Uses `credentials: 'include'` for all fetch requests.
  - Persists authentication across page refreshes by probing `/api/auth/me`.
  - Zero token leakage: **No JWTs stored in `localStorage` or `sessionStorage`**.
- **Automated Test Suite**:
  - Standalone automated test runner verifying 14 distinct scenarios with 39 assertion checkpoints.

---

## 🏗️ Architecture Diagram

```
+-------------------------------------------------------------------------+
|                              CLIENT BROWSER                             |
|                                                                         |
|  +------------------+   credentials: 'include'   +--------------------+ |
|  | Register / Login | -------------------------> |  Navbar & Session  | |
|  |    HTML/CSS/JS   |                            | Persistence (/me)  | |
|  +------------------+                            +--------------------+ |
+-------------------------------------------------------------------------+
                                   ▲   │
                       Set-Cookie  │   │  HTTP-Only Cookie (token)
                    (HttpOnly;     │   │  (No JS access - Anti-XSS)
                     SameSite=Lax) │   ▼
+-------------------------------------------------------------------------+
|                             EXPRESS BACKEND                             |
|                                                                         |
|  +-------------------+    +--------------------+    +----------------+  |
|  |   Rate Limiter    | -> | Input Validation   | -> | AuthController |  |
|  |   (Brute-Force)   |    | (Email & Password) |    +----------------+  |
|  +-------------------+    +--------------------+             │          |
|                                                              ▼          |
|  +-------------------+    +--------------------+    +----------------+  |
|  | Protected Routes  | <- |  JWT Auth Service  | <- |   Bcrypt.js    |  |
|  | (/me, /stats)     |    | (Verify & Decode)  |    | (12 Salt Rnd)  |  |
|  +-------------------+    +--------------------+    +----------------+  |
+-------------------------------------------------------------------------+
                                       │
                                       ▼
+-------------------------------------------------------------------------+
|                             SQLITE DATABASE                             |
|                                                                         |
|  TABLE: users (id, name, email UNIQUE, password [bcrypt hash], ...)     |
|  INDEX: idx_users_email (COLLATE NOCASE)                                |
+-------------------------------------------------------------------------+
```

---

## 🛠️ Technologies & Packages Used

| Package / Tool | Version | Purpose |
| :--- | :--- | :--- |
| **Node.js** | `>= 18` | JavaScript runtime environment |
| **Express** | `^5.3.0` | Fast, minimalist backend web framework |
| **sqlite3** | `^6.0.1` | Self-contained, zero-configuration SQL database |
| **bcryptjs** | `^3.0.3` | Password hashing algorithm with 12 salt rounds |
| **jsonwebtoken** | `^9.0.3` | Implementation of RFC 7519 JSON Web Tokens |
| **cookie-parser** | `^1.4.7` | Middleware to parse HTTP cookie headers |
| **cors** | `^2.8.6` | Cross-Origin Resource Sharing with credential support |
| **express-rate-limit** | `^8.7.3` | Rate limiting for brute-force login attack protection |
| **dotenv** | `^18.0.9` | Loads environment variables from `.env` file |

---

## 📁 Project Structure

```
user-authentication-project/
├── .env                       # Local environment variables (git-ignored)
├── .env.example               # Template for environment variables
├── .gitignore                 # Git ignore rules
├── package.json               # Dependencies and npm scripts
├── postman_collection.json    # Ready-to-import Postman API test collection
├── README.md                  # Project documentation & guides
├── data/                      # SQLite database storage directory
│   └── database.sqlite        # SQLite data file (auto-generated)
├── public/                    # Frontend client assets
│   ├── index.html             # Single-page UI (Login, Register, Dashboard)
│   ├── css/
│   │   └── styles.css         # Modern, responsive styles
│   └── js/
│       └── app.js             # Client state, form validation, and API fetch calls
├── src/                       # Backend server source code
│   ├── app.js                 # Express application & global middleware
│   ├── server.js              # Server bootstrapper & database initialization
│   ├── config/
│   │   ├── database.js        # SQLite connection, schema definition & query helper
│   │   └── env.js             # Environment variable parser & validator
│   ├── controllers/
│   │   └── authController.js  # Register, Login, Me, Logout handlers
│   ├── middleware/
│   │   ├── authMiddleware.js  # JWT verification middleware
│   │   ├── rateLimiter.js     # Rate limiting against brute-force attacks
│   │   └── validation.js      # Input & password strength validation
│   ├── models/
│   │   └── userModel.js       # SQLite User data queries
│   └── routes/
│       └── authRoutes.js      # Express auth route definitions
└── tests/
    └── auth.test.js           # Automated end-to-end test suite
```

---

## ⚙️ Environment Configuration

Create a `.env` file in the root directory (a `.env.example` file is provided for reference):

```bash
cp .env.example .env
```

### Environment Variables Reference

| Variable | Default Value | Description |
| :--- | :--- | :--- |
| `PORT` | `5000` | Port on which the Express server listens |
| `NODE_ENV` | `development` | Environment mode (`development`, `production`, `test`) |
| `JWT_SECRET` | *(Required)* | Secret key used to sign and verify JWT tokens |
| `JWT_EXPIRES_IN` | `1h` | Expiration time for JWT (e.g. `15m`, `1h`, `7d`) |
| `COOKIE_MAX_AGE_HOURS` | `1` | Cookie max age in hours (should match JWT expiration) |
| `CLIENT_URL` | `http://localhost:5000` | Allowed client origin for CORS credentials |
| `DB_PATH` | `./data/database.sqlite` | Filepath for the SQLite database |

> [!IMPORTANT]
> Always use a strong, cryptographically random string for `JWT_SECRET` in production environments. Never commit your `.env` file to version control.

---

## 🚀 Installation & Running

### 1. Prerequisites
- **Node.js** v18+ (tested on Node v24)
- **npm** v9+

### 2. Install Dependencies
```bash
npm install
```

### 3. Run the Application

#### Production Mode
```bash
npm start
```

#### Development Mode (with auto-reload)
```bash
npm run dev
```

The application will start and display:
```
====================================================
🚀 Authentication Server running in [development] mode
🌐 Server URL: http://localhost:5000
🔒 Health Check: http://localhost:5000/api/health
====================================================
```

Open your browser at **`http://localhost:5000`** to access the interactive web application!

---

## 🧪 Running Automated Tests

A comprehensive test suite is included in `tests/auth.test.js`. It runs completely independently with an isolated test database and asserts all 14 scenarios:

```bash
npm test
```

### Scenarios Verified:
1. User registration with valid data returns `201 Created`.
2. Duplicate registration attempt returns `409 Conflict`.
3. Input validation rejects empty fields, invalid email format, and weak passwords with `400 Bad Request`.
4. Successful login returns `200 OK` and sets an `HttpOnly`, `SameSite` cookie.
5. Login with incorrect password returns `401 Unauthorized` with generic message.
6. Login with non-existent email returns `401 Unauthorized` with generic message (anti-enumeration).
7. Requesting protected `/api/auth/me` without a token returns `401 Unauthorized`.
8. Requesting `/api/auth/me` with valid token returns `200 OK` and user profile without password hash.
9. Requesting `/api/auth/me` with tampered token returns `401 Unauthorized`.
10. Requesting `/api/auth/me` with expired token returns `401 Unauthorized`.
11. Additional protected route `/api/auth/dashboard-stats` authorizes correctly.
12. Logout via `POST /api/auth/logout` returns `200 OK` and clears the cookie.
13. Accessing protected route after logout returns `401 Unauthorized`.
14. Database password inspection confirms passwords are stored exclusively as bcrypt hashes (`$2b$12$...`).

---

## 📖 API Documentation

### 1. User Registration
- **Endpoint**: `POST /api/auth/register`
- **Access**: Public
- **Rate Limit**: 20 requests / hour per IP
- **Request Body**:
```json
{
  "name": "Jane Doe",
  "email": "jane.doe@example.com",
  "password": "SecurePassword123!"
}
```
- **Password Strength Rules**:
  - Minimum 8 characters
  - At least 1 uppercase letter (`A-Z`)
  - At least 1 lowercase letter (`a-z`)
  - At least 1 numeric digit (`0-9`)
  - At least 1 special character (`!@#$%^&*()_+-=[]{};':"|,.<>/?`)
- **Success Response (`201 Created`)**:
```json
{
  "success": true,
  "message": "User registered successfully. You can now log in.",
  "user": {
    "id": 1,
    "name": "Jane Doe",
    "email": "jane.doe@example.com"
  }
}
```
- **Error Responses**:
  - `400 Bad Request`: Validation failure (missing fields, invalid email, weak password).
  - `409 Conflict`: Email already exists.

---

### 2. User Login
- **Endpoint**: `POST /api/auth/login`
- **Access**: Public
- **Rate Limit**: 10 attempts / 15 minutes per IP
- **Request Body**:
```json
{
  "email": "jane.doe@example.com",
  "password": "SecurePassword123!"
}
```
- **Success Response (`200 OK`)**:
  - Sets HTTP response header: `Set-Cookie: token=<jwt>; Path=/; HttpOnly; SameSite=Lax`
```json
{
  "success": true,
  "message": "Login successful.",
  "user": {
    "id": 1,
    "name": "Jane Doe",
    "email": "jane.doe@example.com",
    "createdAt": "2026-11-05 15:30:00"
  },
  "token": "eyJhbGciOi..."
}
```
- **Error Responses**:
  - `400 Bad Request`: Missing email or password.
  - `401 Unauthorized`: `{"success": false, "message": "Invalid email or password."}` (generic error prevents email enumeration).
  - `429 Too Many Requests`: Exceeded 10 failed login attempts.

---

### 3. Get Current Authenticated User (Protected)
- **Endpoint**: `GET /api/auth/me`
- **Access**: Protected (Requires valid JWT in HTTP-only cookie or `Authorization: Bearer <token>`)
- **Success Response (`200 OK`)**:
```json
{
  "success": true,
  "user": {
    "id": 1,
    "name": "Jane Doe",
    "email": "jane.doe@example.com",
    "createdAt": "2026-11-05 15:30:00"
  }
}
```
- **Error Responses**:
  - `401 Unauthorized`: No token provided, invalid token signature, or token expired.

---

### 4. Additional Protected Route (Dashboard Stats)
- **Endpoint**: `GET /api/auth/dashboard-stats`
- **Access**: Protected (Demonstrates reusable `authenticateToken` middleware)
- **Success Response (`200 OK`)**:
```json
{
  "success": true,
  "message": "Access granted to protected dashboard resources.",
  "accessedBy": "jane.doe@example.com",
  "serverTime": "2026-11-05T15:32:00.000Z"
}
```

---

### 5. Logout
- **Endpoint**: `POST /api/auth/logout`
- **Access**: Public
- **Effect**: Clears the `token` cookie on the client with matching options (`Path=/`, `HttpOnly`).
- **Success Response (`200 OK`)**:
```json
{
  "success": true,
  "message": "Logged out successfully."
}
```

---

## 📮 Postman Testing Instructions

1. Open **Postman**.
2. Click **Import** in the top left corner.
3. Select the file `postman_collection.json` located in the root of this project.
4. The imported collection contains 3 organized folders:
   - `1. Public Endpoints` (Health Check, Register User, Register Duplicate, Register Weak, Login User, Login Wrong Password)
   - `2. Protected Endpoints` (Get Current User Profile, Get Dashboard Stats, Access Without Token)
   - `3. Logout Endpoint` (Logout User)
5. **Testing Workflow**:
   - Send `Register User` &rarr; verify `201 Created`.
   - Send `Login User` &rarr; verify `200 OK` (Postman automatically stores the HTTP-only cookie in its Cookie Jar and saves the token variable).
   - Send `Get Current User Profile` &rarr; verify `200 OK` and inspect profile info.
   - Send `Get Dashboard Stats` &rarr; verify protected resource access.
   - Send `Logout User` &rarr; verify `200 OK` and session clearance.
   - Send `Access Without Token` &rarr; verify `401 Unauthorized`.

---

## 🛡️ Security Best Practices Implemented

1. **Bcrypt Password Hashing**: Passwords are saved only as bcrypt hashes with 12 salt rounds.
2. **HTTP-Only Cookies**: Prevents client-side scripts from reading the JWT token, neutralizing XSS token theft.
3. **SameSite & Secure Flags**: Prevents CSRF attacks via `SameSite=Lax` (or `Strict` in production) and ensures transmission over HTTPS in production.
4. **Anti-Enumeration Responses**: Login failures return an identical generic error message whether the email exists or not.
5. **Brute-Force Rate Limiting**: `express-rate-limit` prevents rapid password guessing and bot account spamming.
6. **SQL Injection Prevention**: SQLite queries strictly use parameterized queries (`?` place markers).
7. **Zero LocalStorage Leakage**: JWTs are strictly omitted from web storage (localStorage / sessionStorage).
8. **Sensitive Data Sanitization**: Password hashes are stripped before any user profile is returned in an HTTP response.
