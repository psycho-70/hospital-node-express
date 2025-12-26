import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { db } from '../config/database.js';

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

    const stmt = db.prepare(`
      INSERT INTO users (username, email, password, role)
      VALUES (?, ?, ?, ?)
    `);

    const result = stmt.run(username, email, hashedPassword, role);
    return User.findById(result.lastInsertRowid);
  }

  // Find user by ID
  static findById(id) {
    const stmt = db.prepare('SELECT * FROM users WHERE id = ?');
    const row = stmt.get(id);
    return row ? new User(row) : null;
  }

  // Find user by email
  static findByEmail(email) {
    const stmt = db.prepare('SELECT * FROM users WHERE email = ?');
    const row = stmt.get(email);
    return row ? new User(row) : null;
  }

  // Find user by username
  static findByUsername(username) {
    const stmt = db.prepare('SELECT * FROM users WHERE username = ?');
    const row = stmt.get(username);
    return row ? new User(row) : null;
  }

  // Find user by email or username
  static findByEmailOrUsername(email, username) {
    const stmt = db.prepare('SELECT * FROM users WHERE email = ? OR username = ?');
    const row = stmt.get(email, username);
    return row ? new User(row) : null;
  }

  // Convert to JSON (exclude password)
  toJSON() {
    const { password, ...user } = this;
    return user;
  }

  // Get user without password
  static findByIdWithoutPassword(id) {
    const stmt = db.prepare('SELECT id, username, email, role, createdAt, updatedAt FROM users WHERE id = ?');
    const row = stmt.get(id);
    return row ? new User(row) : null;
  }

  // Generate password reset token
  generatePasswordResetToken() {
    // Generate random token
    const resetToken = crypto.randomBytes(32).toString('hex');
    
    // Hash token before saving to database
    const hashedToken = crypto.createHash('sha256').update(resetToken).digest('hex');
    
    // Set token expiry (1 hour from now)
    const expires = Date.now() + 60 * 60 * 1000; // 1 hour
    
    // Save to database
    const stmt = db.prepare(`
      UPDATE users 
      SET resetPasswordToken = ?, resetPasswordExpires = ?
      WHERE id = ?
    `);
    stmt.run(hashedToken, expires, this.id);
    
    // Return unhashed token (to send in email)
    return resetToken;
  }

  // Find user by reset token
  static findByResetToken(token) {
    // Hash the token to compare with database
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
    
    const stmt = db.prepare(`
      SELECT * FROM users 
      WHERE resetPasswordToken = ? 
      AND resetPasswordExpires > ?
    `);
    const row = stmt.get(hashedToken, Date.now());
    return row ? new User(row) : null;
  }

  // Reset password with new password
  async resetPassword(newPassword) {
    const hashedPassword = await User.hashPassword(newPassword);
    
    const stmt = db.prepare(`
      UPDATE users 
      SET password = ?, resetPasswordToken = NULL, resetPasswordExpires = NULL
      WHERE id = ?
    `);
    stmt.run(hashedPassword, this.id);
    
    return User.findById(this.id);
  }

  // Clear reset token
  clearResetToken() {
    const stmt = db.prepare(`
      UPDATE users 
      SET resetPasswordToken = NULL, resetPasswordExpires = NULL
      WHERE id = ?
    `);
    stmt.run(this.id);
  }
}

export default User;
