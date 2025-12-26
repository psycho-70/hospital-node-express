import { db } from '../config/turso-database.js';

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
  static async create(patientData) {
    const { idCard, name, dateOfBirth = null, type = null, charges = 0, createdBy, visitCount = 0 } = patientData;

    const result = await db.execute({
      sql: `INSERT INTO patients (idCard, name, dateOfBirth, type, charges, visitCount, createdBy) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      args: [idCard.toUpperCase(), name, dateOfBirth, type, charges, visitCount, createdBy]
    });

    return Patient.findById(Number(result.lastInsertRowid));
  }

  // Find patient by ID
  static async findById(id) {
    const result = await db.execute({
      sql: `
        SELECT p.*, u.username as createdByUsername, u.email as createdByEmail
        FROM patients p
        LEFT JOIN users u ON p.createdBy = u.id
        WHERE p.id = ?
      `,
      args: [id]
    });
    
    const row = result.rows[0];
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
  static async findByIdCard(idCard) {
    const result = await db.execute({
      sql: 'SELECT * FROM patients WHERE idCard = ?',
      args: [idCard.toUpperCase()]
    });
    
    const row = result.rows[0];
    return row ? new Patient(row) : null;
  }

  // Find all patients with pagination and search
  static async findAll(options = {}) {
    const { page = 1, limit = 10, search = '' } = options;
    const skip = (page - 1) * limit;

    let query = `
      SELECT p.*, u.username as createdByUsername, u.email as createdByEmail
      FROM patients p
      LEFT JOIN users u ON p.createdBy = u.id
    `;
    const args = [];

    if (search) {
      query += ' WHERE p.idCard LIKE ? OR p.name LIKE ?';
      const searchPattern = `%${search}%`;
      args.push(searchPattern, searchPattern);
    }

    query += ' ORDER BY p.createdAt DESC LIMIT ? OFFSET ?';
    args.push(limit, skip);

    const result = await db.execute({
      sql: query,
      args: args
    });

    const patients = result.rows.map(row => {
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
    const countArgs = [];
    if (search) {
      countQuery += ' WHERE idCard LIKE ? OR name LIKE ?';
      const searchPattern = `%${search}%`;
      countArgs.push(searchPattern, searchPattern);
    }
    
    const countResult = await db.execute({
      sql: countQuery,
      args: countArgs
    });

    const total = Number(countResult.rows[0].total);

    return {
      patients,
      total,
      page,
      limit,
      pages: Math.ceil(total / limit)
    };
  }

  // Update patient
  async update(updates) {
    const { name, dateOfBirth, type, charges } = updates;
    const updatesList = [];
    const args = [];

    if (name !== undefined) {
      updatesList.push('name = ?');
      args.push(name);
    }
    if (dateOfBirth !== undefined) {
      updatesList.push('dateOfBirth = ?');
      args.push(dateOfBirth);
    }
    if (type !== undefined) {
      updatesList.push('type = ?');
      args.push(type);
    }
    if (charges !== undefined) {
      updatesList.push('charges = ?');
      args.push(charges);
    }

    if (updatesList.length === 0) {
      return this;
    }

    args.push(this.id);
    await db.execute({
      sql: `UPDATE patients SET ${updatesList.join(', ')} WHERE id = ?`,
      args: args
    });

    return Patient.findById(this.id);
  }

  // Save patient (for visitCount updates)
  async save() {
    await db.execute({
      sql: `UPDATE patients SET visitCount = ?, isActive = ? WHERE id = ?`,
      args: [this.visitCount, this.isActive ? 1 : 0, this.id]
    });
    
    return Patient.findById(this.id);
  }

  // Delete patient
  static async deleteById(id) {
    await db.execute({
      sql: 'DELETE FROM patients WHERE id = ?',
      args: [id]
    });
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
