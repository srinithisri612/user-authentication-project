const { query } = require('../config/database');

const UserModel = {
  /**
   * Find user by email (case-insensitive due to COLLATE NOCASE)
   * Includes password for internal authentication check
   */
  async findByEmail(email) {
    const normalizedEmail = email.trim().toLowerCase();
    const row = await query.get(
      'SELECT id, name, email, password, created_at, updated_at FROM users WHERE email = ?',
      [normalizedEmail]
    );
    return row || null;
  },

  /**
   * Find user by ID (excludes password for safety)
   */
  async findById(id) {
    const row = await query.get(
      'SELECT id, name, email, created_at, updated_at FROM users WHERE id = ?',
      [id]
    );
    return row || null;
  },

  /**
   * Create a new user with pre-hashed password
   */
  async create({ name, email, hashedPassword }) {
    const trimmedName = name.trim();
    const normalizedEmail = email.trim().toLowerCase();
    
    const result = await query.run(
      'INSERT INTO users (name, email, password) VALUES (?, ?, ?)',
      [trimmedName, normalizedEmail, hashedPassword]
    );

    return {
      id: result.lastID,
      name: trimmedName,
      email: normalizedEmail,
    };
  },

  /**
   * Count total registered users
   */
  async count() {
    const row = await query.get('SELECT COUNT(*) AS total FROM users');
    return row ? row.total : 0;
  },
};

module.exports = UserModel;
