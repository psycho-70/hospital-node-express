import { db } from '../config/turso-database.js';

class Visit {
  constructor(data) {
    this.id = data.id;
    this.patientId = data.patientId || data.patient;
    this.visitNumber = data.visitNumber;
    this.isFreeVisit = data.isFreeVisit !== undefined ? Boolean(data.isFreeVisit) : true;
    this.charges = data.charges || 0;
    this.paid = data.paid !== undefined ? Boolean(data.paid) : false;
    this.notes = data.notes || '';
    this.createdBy = data.createdBy;
    this.createdAt = data.createdAt;
    this.updatedAt = data.updatedAt;
    // Populated fields
    this.createdByUser = data.createdByUser;
  }

  // Create a new visit
  static async create(visitData) {
    const { patientId, visitNumber, isFreeVisit = true, charges = 0, paid = false, notes = '', createdBy } = visitData;

    const result = await db.execute({
      sql: `INSERT INTO visits (patientId, visitNumber, isFreeVisit, charges, paid, notes, createdBy) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      args: [patientId, visitNumber, isFreeVisit ? 1 : 0, charges, paid ? 1 : 0, notes, createdBy]
    });

    return Visit.findById(Number(result.lastInsertRowid));
  }

  // Find visit by ID
  static async findById(id) {
    const result = await db.execute({
      sql: `
        SELECT v.*, u.username as createdByUsername
        FROM visits v
        LEFT JOIN users u ON v.createdBy = u.id
        WHERE v.id = ?
      `,
      args: [id]
    });
    
    const row = result.rows[0];
    if (!row) return null;
    
    const visit = new Visit(row);
    if (row.createdByUsername) {
      visit.createdByUser = {
        username: row.createdByUsername
      };
    }
    return visit;
  }

  // Find visits by patient ID
  static async findByPatientId(patientId, sortBy = 'visitNumber', order = 'ASC') {
    const validSortBy = ['visitNumber', 'createdAt'];
    const validOrder = ['ASC', 'DESC'];
    const sortColumn = validSortBy.includes(sortBy) ? sortBy : 'visitNumber';
    const sortOrder = validOrder.includes(order.toUpperCase()) ? order.toUpperCase() : 'ASC';

    const result = await db.execute({
      sql: `
        SELECT v.*, u.username as createdByUsername
        FROM visits v
        LEFT JOIN users u ON v.createdBy = u.id
        WHERE v.patientId = ?
        ORDER BY v.${sortColumn} ${sortOrder}
      `,
      args: [patientId]
    });

    return result.rows.map(row => {
      const visit = new Visit(row);
      if (row.createdByUsername) {
        visit.createdByUser = {
          username: row.createdByUsername
        };
      }
      return visit;
    });
  }

  // Update visit
  async update(updates) {
    const { paid, charges, notes } = updates;
    const updatesList = [];
    const args = [];

    if (paid !== undefined) {
      updatesList.push('paid = ?');
      args.push(paid ? 1 : 0);
    }
    if (charges !== undefined) {
      updatesList.push('charges = ?');
      args.push(charges);
    }
    if (notes !== undefined) {
      updatesList.push('notes = ?');
      args.push(notes);
    }

    if (updatesList.length === 0) {
      return this;
    }

    args.push(this.id);
    await db.execute({
      sql: `UPDATE visits SET ${updatesList.join(', ')} WHERE id = ?`,
      args: args
    });

    return Visit.findById(this.id);
  }

  // Save visit
  async save() {
    await db.execute({
      sql: `UPDATE visits SET paid = ?, charges = ?, notes = ? WHERE id = ?`,
      args: [this.paid ? 1 : 0, this.charges, this.notes, this.id]
    });
    
    return Visit.findById(this.id);
  }

  // Delete visits by patient ID
  static async deleteByPatientId(patientId) {
    await db.execute({
      sql: 'DELETE FROM visits WHERE patientId = ?',
      args: [patientId]
    });
  }

  // Get count of visits for current month
  static async countCurrentMonthVisits(patientId) {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfNextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    
    const result = await db.execute({
      sql: `
        SELECT COUNT(*) as count 
        FROM visits 
        WHERE patientId = ? 
        AND datetime(createdAt) >= datetime(?)
        AND datetime(createdAt) < datetime(?)
      `,
      args: [patientId, startOfMonth.toISOString(), startOfNextMonth.toISOString()]
    });
    
    return result.rows[0] ? Number(result.rows[0].count) : 0;
  }

  // Get visits for current month
  static async findCurrentMonthVisits(patientId) {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfNextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    
    const result = await db.execute({
      sql: `
        SELECT v.*, u.username as createdByUsername
        FROM visits v
        LEFT JOIN users u ON v.createdBy = u.id
        WHERE v.patientId = ? 
        AND datetime(v.createdAt) >= datetime(?)
        AND datetime(v.createdAt) < datetime(?)
        ORDER BY v.createdAt ASC
      `,
      args: [patientId, startOfMonth.toISOString(), startOfNextMonth.toISOString()]
    });
    
    return result.rows.map(row => {
      const visit = new Visit(row);
      if (row.createdByUsername) {
        visit.createdByUser = {
          username: row.createdByUsername
        };
      }
      return visit;
    });
  }

  // Delete visits older than specified months
  static async deleteOldVisits(monthsOld = 1) {
    const cutoffDate = new Date();
    cutoffDate.setMonth(cutoffDate.getMonth() - monthsOld);
    
    const result = await db.execute({
      sql: 'DELETE FROM visits WHERE datetime(createdAt) < datetime(?)',
      args: [cutoffDate.toISOString()]
    });
    
    return Number(result.rowsAffected || 0);
  }

  // Convert to JSON
  toJSON() {
    const json = { ...this };
    if (json.createdByUser) {
      json.createdBy = json.createdByUser;
    }
    delete json.createdByUser;
    // Map patientId to patient for consistency with Mongoose version
    json.patient = json.patientId;
    return json;
  }
}

export default Visit;
