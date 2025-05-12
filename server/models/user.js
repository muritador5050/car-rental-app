const { pool } = require('../config/db');

class User {
  // Find a user by email
  static async findByEmail(email) {
    try {
      const [rows] = await pool.query('SELECT * FROM users WHERE email = ?', [
        email,
      ]);
      return rows[0];
    } catch (error) {
      console.error('Error finding user by email:', error);
      throw error;
    }
  }

  // Find a user by ID
  static async findById(id) {
    try {
      const [rows] = await pool.query('SELECT * FROM users WHERE id = ?', [id]);
      return rows[0];
    } catch (error) {
      console.error('Error finding user by ID:', error);
      throw error;
    }
  }

  // Create a new user (customer)
  static async create(userData) {
    const {
      name,
      email,
      password,
      phone,
      address,
      driver_license_number,
      role = 'customer',
    } = userData;

    try {
      const [result] = await pool.query(
        `INSERT INTO users 
        (name, email, password, phone, address, driver_license_number, role)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          name,
          email,
          password,
          phone || null,
          address || null,
          driver_license_number || null,
          role,
        ]
      );
      return result.insertId;
    } catch (error) {
      console.error('Error creating user:', error);
      throw error;
    }
  }

  // Create an admin user specifically
  static async createAdmin(userData) {
    const adminData = { ...userData, role: 'admin' };
    return this.create(adminData);
  }

  // Update user profile
  static async updateProfile(id, userData) {
    const { name, phone, address, driver_license_number } = userData;

    try {
      const [result] = await pool.query(
        'UPDATE users SET name = ?, phone = ?, address = ?, driver_license_number = ? WHERE id = ?',
        [name, phone, address, driver_license_number, id]
      );
      return result.affectedRows > 0;
    } catch (error) {
      console.error('Error updating user profile:', error);
      throw error;
    }
  }

  // Get user profile (excluding password)
  static async getProfile(id) {
    try {
      const [rows] = await pool.query(
        'SELECT id, name, email, phone, address, driver_license_number, role, created_at FROM users WHERE id = ?',
        [id]
      );
      return rows[0];
    } catch (error) {
      console.error('Error getting user profile:', error);
      throw error;
    }
  }

  // Check if user is admin
  static async isAdmin(id) {
    try {
      const [rows] = await pool.query('SELECT role FROM users WHERE id = ?', [
        id,
      ]);
      return rows[0].role === 'admin';
    } catch (error) {
      console.error('Error checking if user is admin:', error);
      throw error;
    }
  }

  //Forget password
  static async forgetPassword(data) {
    const { token, expiry, email } = data;
    await pool.query(
      'UPDATE users SET reset_token = ?, reset_token_expiry = ? WHERE email = ?',
      [token, expiry, email]
    );
  }

  //Reset password
  static async resetPassword(token, hashedPassword) {
    const [rows] = await pool.query(
      'SELECT * FROM users WHERE reset_token = ? AND reset_token_expiry > NOW()',
      [token]
    );
    const user = rows[0];
    if (!user) return null;

    await pool.query(
      'UPDATE users SET password = ?, reset_token = NULL, reset_token_expiry = NULL WHERE id = ?',
      [hashedPassword, user.id]
    );
    return user;
  }
}

module.exports = User;
