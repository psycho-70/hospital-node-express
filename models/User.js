import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { db } from '../config/turso-database.js';

class User {
  constructor(data) {
    this.id = data.id;
    this.username = data.username;
    this.email = data.email;
    this.password = data.password;
    this.role = data.role || 'staff';
    this.resetPasswordToken = data.resetPasswordToken;
    this.resetPasswordExpires = data.resetPasswordExpires;
    this.createdAt = data.createdAt;
    this.updatedAt = data.updatedAt;
  }

  // Hash password before saving
  static async hashPassword(password) {
    const salt = await bcrypt.genSalt(10);
    return await bcrypt.hash(password, salt);
  }

  // Compare password
  async comparePassword(candidatePassword) {
    return await bcrypt.compare(candidatePassword, this.password);
  }

  // Create a new user
  static async create(userData) {
    const { username, email, password, role = 'staff' } = userData;
    
    // Hash password
    const hashedPassword = await User.hashPassword(password);

    const result = await db.execute({
      sql: `INSERT INTO users (username, email, password, role) VALUES (?, ?, ?, ?)`,
      args: [username, email, hashedPassword, role]
    });

    return User.findById(Number(result.lastInsertRowid));
  }

  // Find user by ID
  static async findById(id) {
    const result = await db.execute({
      sql: 'SELECT * FROM users WHERE id = ?',
      args: [id]
    });
    
    const row = result.rows[0];
    return row ? new User(row) : null;
  }

  // Find user by email
  static async findByEmail(email) {
    const result = await db.execute({
      sql: 'SELECT * FROM users WHERE email = ?',
      args: [email]
    });
    
    const row = result.rows[0];
    return row ? new User(row) : null;
  }

  // Find user by username
  static async findByUsername(username) {
    const result = await db.execute({
      sql: 'SELECT * FROM users WHERE username = ?',
      args: [username]
    });
    
    const row = result.rows[0];
    return row ? new User(row) : null;
  }

  // Find user by email or username
  static async findByEmailOrUsername(email, username) {
    const result = await db.execute({
      sql: 'SELECT * FROM users WHERE email = ? OR username = ?',
      args: [email, username]
    });
    
    const row = result.rows[0];
    return row ? new User(row) : null;
  }

  // Convert to JSON (exclude password)
  toJSON() {
    const { password, ...user } = this;
    return user;
  }

  // Get user without password
  static async findByIdWithoutPassword(id) {
    const result = await db.execute({
      sql: 'SELECT id, username, email, role, createdAt, updatedAt FROM users WHERE id = ?',
      args: [id]
    });
    
    const row = result.rows[0];
    return row ? new User(row) : null;
  }

  // Generate password reset token
  async generatePasswordResetToken() {
    // Generate random token
    const resetToken = crypto.randomBytes(32).toString('hex');
    
    // Hash token before saving to database
    const hashedToken = crypto.createHash('sha256').update(resetToken).digest('hex');
    
    // Set token expiry (1 hour from now)
    const expires = Date.now() + 60 * 60 * 1000; // 1 hour
    
    // Save to database
    await db.execute({
      sql: `UPDATE users SET resetPasswordToken = ?, resetPasswordExpires = ? WHERE id = ?`,
      args: [hashedToken, expires, this.id]
    });
    
    // Return unhashed token (to send in email)
    return resetToken;
  }

  // Find user by reset token
  static async findByResetToken(token) {
    // Hash the token to compare with database
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
    
    const result = await db.execute({
      sql: `SELECT * FROM users WHERE resetPasswordToken = ? AND resetPasswordExpires > ?`,
      args: [hashedToken, Date.now()]
    });
    
    const row = result.rows[0];
    return row ? new User(row) : null;
  }

  // Reset password with new password
  async resetPassword(newPassword) {
    const hashedPassword = await User.hashPassword(newPassword);
    
    await db.execute({
      sql: `UPDATE users SET password = ?, resetPasswordToken = NULL, resetPasswordExpires = NULL WHERE id = ?`,
      args: [hashedPassword, this.id]
    });
    
    return User.findById(this.id);
  }

  // Clear reset token
  async clearResetToken() {
    await db.execute({
      sql: `UPDATE users SET resetPasswordToken = NULL, resetPasswordExpires = NULL WHERE id = ?`,
      args: [this.id]
    });
  }
}

export default User;
