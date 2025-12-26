import { db } from '../config/database.js';

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
  static create(visitData) {
    const { patientId, visitNumber, isFreeVisit = true, charges = 0, paid = false, notes = '', createdBy } = visitData;

    const stmt = db.prepare(`
      INSERT INTO visits (patientId, visitNumber, isFreeVisit, charges, paid, notes, createdBy)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    const result = stmt.run(
      patientId,
      visitNumber,
      isFreeVisit ? 1 : 0,
      charges,
      paid ? 1 : 0,
      notes,
      createdBy
    );
    return Visit.findById(result.lastInsertRowid);
  }

  // Find visit by ID
  static findById(id) {
    const stmt = db.prepare(`
      SELECT v.*, u.username as createdByUsername
      FROM visits v
      LEFT JOIN users u ON v.createdBy = u.id
      WHERE v.id = ?
    `);
    const row = stmt.get(id);
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
  static findByPatientId(patientId, sortBy = 'visitNumber', order = 'ASC') {
    const validSortBy = ['visitNumber', 'createdAt'];
    const validOrder = ['ASC', 'DESC'];
    const sortColumn = validSortBy.includes(sortBy) ? sortBy : 'visitNumber';
    const sortOrder = validOrder.includes(order.toUpperCase()) ? order.toUpperCase() : 'ASC';

    const stmt = db.prepare(`
      SELECT v.*, u.username as createdByUsername
      FROM visits v
      LEFT JOIN users u ON v.createdBy = u.id
      WHERE v.patientId = ?
      ORDER BY v.${sortColumn} ${sortOrder}
    `);
    const rows = stmt.all(patientId);

    return rows.map(row => {
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
  update(updates) {
    const { paid, charges, notes } = updates;
    const updatesList = [];
    const params = [];

    if (paid !== undefined) {
      updatesList.push('paid = ?');
      params.push(paid ? 1 : 0);
    }
    if (charges !== undefined) {
      updatesList.push('charges = ?');
      params.push(charges);
    }
    if (notes !== undefined) {
      updatesList.push('notes = ?');
      params.push(notes);
    }

    if (updatesList.length === 0) {
      return this;
    }

    params.push(this.id);
    const stmt = db.prepare(`UPDATE visits SET ${updatesList.join(', ')} WHERE id = ?`);
    stmt.run(...params);

    return Visit.findById(this.id);
  }

  // Save visit
  save() {
    const stmt = db.prepare(`
      UPDATE visits 
      SET paid = ?, charges = ?, notes = ?
      WHERE id = ?
    `);
    stmt.run(this.paid ? 1 : 0, this.charges, this.notes, this.id);
    return Visit.findById(this.id);
  }

  // Delete visits by patient ID
  static deleteByPatientId(patientId) {
    const stmt = db.prepare('DELETE FROM visits WHERE patientId = ?');
    stmt.run(patientId);
  }

  // Get count of visits for current month
  static countCurrentMonthVisits(patientId) {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfNextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    
    const stmt = db.prepare(`
      SELECT COUNT(*) as count 
      FROM visits 
      WHERE patientId = ? 
      AND datetime(createdAt) >= datetime(?)
      AND datetime(createdAt) < datetime(?)
    `);
    
    const result = stmt.get(patientId, startOfMonth.toISOString(), startOfNextMonth.toISOString());
    return result ? result.count : 0;
  }

  // Get visits for current month
  static findCurrentMonthVisits(patientId) {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfNextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    
    const stmt = db.prepare(`
      SELECT v.*, u.username as createdByUsername
      FROM visits v
      LEFT JOIN users u ON v.createdBy = u.id
      WHERE v.patientId = ? 
      AND datetime(v.createdAt) >= datetime(?)
      AND datetime(v.createdAt) < datetime(?)
      ORDER BY v.createdAt ASC
    `);
    
    const rows = stmt.all(patientId, startOfMonth.toISOString(), startOfNextMonth.toISOString());
    
    return rows.map(row => {
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
  static deleteOldVisits(monthsOld = 1) {
    const cutoffDate = new Date();
    cutoffDate.setMonth(cutoffDate.getMonth() - monthsOld);
    
    const stmt = db.prepare('DELETE FROM visits WHERE datetime(createdAt) < datetime(?)');
    const result = stmt.run(cutoffDate.toISOString());
    return result.changes;
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
