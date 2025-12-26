import { db } from '../config/database.js';

class Patient {
  constructor(data) {
    this.id = data.id;
    this.idCard = data.idCard;
    this.name = data.name;
    this.dateOfBirth = data.dateOfBirth || null;
    this.type = data.type || null;
    this.charges = data.charges || 0;
    this.visitCount = data.visitCount || 0;
    this.isActive = data.isActive !== undefined ? Boolean(data.isActive) : true;
    this.createdBy = data.createdBy;
    this.createdAt = data.createdAt;
    this.updatedAt = data.updatedAt;
    // Populated fields
    this.createdByUser = data.createdByUser;
  }

  // Create a new patient
  static create(patientData) {
    const { idCard, name, dateOfBirth = null, type = null, charges = 0, createdBy, visitCount = 0 } = patientData;

    const stmt = db.prepare(`
      INSERT INTO patients (idCard, name, dateOfBirth, type, charges, visitCount, createdBy)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    const result = stmt.run(idCard.toUpperCase(), name, dateOfBirth, type, charges, visitCount, createdBy);
    return Patient.findById(result.lastInsertRowid);
  }

  // Find patient by ID
  static findById(id) {
    const stmt = db.prepare(`
      SELECT p.*, u.username as createdByUsername, u.email as createdByEmail
      FROM patients p
      LEFT JOIN users u ON p.createdBy = u.id
      WHERE p.id = ?
    `);
    const row = stmt.get(id);
    if (!row) return null;
    
    const patient = new Patient(row);
    if (row.createdByUsername) {
      patient.createdByUser = {
        username: row.createdByUsername,
        email: row.createdByEmail
      };
    }
    return patient;
  }

  // Find patient by ID card
  static findByIdCard(idCard) {
    const stmt = db.prepare('SELECT * FROM patients WHERE idCard = ?');
    const row = stmt.get(idCard.toUpperCase());
    return row ? new Patient(row) : null;
  }

  // Find all patients with pagination and search
  static findAll(options = {}) {
    const { page = 1, limit = 10, search = '' } = options;
    const skip = (page - 1) * limit;

    let query = `
      SELECT p.*, u.username as createdByUsername, u.email as createdByEmail
      FROM patients p
      LEFT JOIN users u ON p.createdBy = u.id
    `;
    const params = [];

    if (search) {
      query += ' WHERE p.idCard LIKE ? OR p.name LIKE ?';
      const searchPattern = `%${search}%`;
      params.push(searchPattern, searchPattern);
    }

    query += ' ORDER BY p.createdAt DESC LIMIT ? OFFSET ?';
    params.push(limit, skip);

    const stmt = db.prepare(query);
    const rows = stmt.all(...params);

    const patients = rows.map(row => {
      const patient = new Patient(row);
      if (row.createdByUsername) {
        patient.createdByUser = {
          username: row.createdByUsername,
          email: row.createdByEmail
        };
      }
      return patient;
    });

    // Get total count
    let countQuery = 'SELECT COUNT(*) as total FROM patients';
    const countParams = [];
    if (search) {
      countQuery += ' WHERE idCard LIKE ? OR name LIKE ?';
      const searchPattern = `%${search}%`;
      countParams.push(searchPattern, searchPattern);
    }
    const countStmt = db.prepare(countQuery);
    const countResult = countStmt.get(...countParams);

    return {
      patients,
      total: countResult.total,
      page,
      limit,
      pages: Math.ceil(countResult.total / limit)
    };
  }

  // Update patient
  update(updates) {
    const { name, dateOfBirth, type, charges } = updates;
    const updatesList = [];
    const params = [];

    if (name !== undefined) {
      updatesList.push('name = ?');
      params.push(name);
    }
    if (dateOfBirth !== undefined) {
      updatesList.push('dateOfBirth = ?');
      params.push(dateOfBirth);
    }
    if (type !== undefined) {
      updatesList.push('type = ?');
      params.push(type);
    }
    if (charges !== undefined) {
      updatesList.push('charges = ?');
      params.push(charges);
    }

    if (updatesList.length === 0) {
      return this;
    }

    params.push(this.id);
    const stmt = db.prepare(`UPDATE patients SET ${updatesList.join(', ')} WHERE id = ?`);
    stmt.run(...params);

    return Patient.findById(this.id);
  }

  // Save patient (for visitCount updates)
  save() {
    const stmt = db.prepare(`
      UPDATE patients 
      SET visitCount = ?, isActive = ?
      WHERE id = ?
    `);
    stmt.run(this.visitCount, this.isActive ? 1 : 0, this.id);
    return Patient.findById(this.id);
  }

  // Delete patient
  static deleteById(id) {
    const stmt = db.prepare('DELETE FROM patients WHERE id = ?');
    stmt.run(id);
  }

  // Convert to JSON
  toJSON() {
    const json = { ...this };
    if (json.createdByUser) {
      json.createdBy = json.createdByUser;
    }
    delete json.createdByUser;
    return json;
  }
}

export default Patient;
