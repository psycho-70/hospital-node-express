import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Create data directory if it doesn't exist
const dataDir = path.join(__dirname, '..', 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = process.env.DB_PATH || path.join(dataDir, 'clinic.db');
const db = new Database(dbPath);

// Enable foreign keys
db.pragma('foreign_keys = ON');

// Initialize tables
const initializeDB = () => {
  // Users table
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL UNIQUE,
      email TEXT NOT NULL UNIQUE,
      password TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'staff' CHECK(role IN ('admin', 'staff')),
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
    CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
  `);

  // Add reset password columns if they don't exist (for existing databases)
  try {
    db.exec(`ALTER TABLE users ADD COLUMN resetPasswordToken TEXT;`);
  } catch (e) {
    // Column already exists, ignore error
  }
  
  try {
    db.exec(`ALTER TABLE users ADD COLUMN resetPasswordExpires INTEGER;`);
  } catch (e) {
    // Column already exists, ignore error
  }

  // Create index on resetPasswordToken if it doesn't exist
  try {
    db.exec(`CREATE INDEX IF NOT EXISTS idx_users_resetToken ON users(resetPasswordToken);`);
  } catch (e) {
    // Index might fail if column doesn't exist, ignore error
  }

  // Patients table
  db.exec(`
    CREATE TABLE IF NOT EXISTS patients (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      idCard TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      charges REAL DEFAULT 0,
      visitCount INTEGER DEFAULT 0,
      isActive INTEGER DEFAULT 1,
      createdBy INTEGER NOT NULL,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (createdBy) REFERENCES users(id)
    );

    CREATE INDEX IF NOT EXISTS idx_patients_idCard ON patients(idCard);
    CREATE INDEX IF NOT EXISTS idx_patients_createdAt ON patients(createdAt DESC);
  `);

  // Add DOB and type columns if they don't exist (for existing databases)
  try {
    db.exec(`ALTER TABLE patients ADD COLUMN dateOfBirth TEXT;`);
  } catch (e) {
    // Column already exists, ignore error
  }
  
  try {
    db.exec(`ALTER TABLE patients ADD COLUMN type TEXT CHECK(type IN ('child', 'man', 'woman'));`);
  } catch (e) {
    // Column already exists, ignore error
  }

  // Visits table
  db.exec(`
    CREATE TABLE IF NOT EXISTS visits (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      patientId INTEGER NOT NULL,
      visitNumber INTEGER NOT NULL,
      isFreeVisit INTEGER DEFAULT 1,
      charges REAL DEFAULT 0,
      paid INTEGER DEFAULT 0,
      notes TEXT,
      createdBy INTEGER NOT NULL,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (patientId) REFERENCES patients(id) ON DELETE CASCADE,
      FOREIGN KEY (createdBy) REFERENCES users(id),
      UNIQUE(patientId, visitNumber)
    );

    CREATE INDEX IF NOT EXISTS idx_visits_patient ON visits(patientId, visitNumber);
    CREATE INDEX IF NOT EXISTS idx_visits_createdAt ON visits(createdAt DESC);
  `);

  // Trigger to update updatedAt timestamp
  db.exec(`
    CREATE TRIGGER IF NOT EXISTS update_users_timestamp 
    AFTER UPDATE ON users
    BEGIN
      UPDATE users SET updatedAt = CURRENT_TIMESTAMP WHERE id = NEW.id;
    END;

    CREATE TRIGGER IF NOT EXISTS update_patients_timestamp 
    AFTER UPDATE ON patients
    BEGIN
      UPDATE patients SET updatedAt = CURRENT_TIMESTAMP WHERE id = NEW.id;
    END;

    CREATE TRIGGER IF NOT EXISTS update_visits_timestamp 
    AFTER UPDATE ON visits
    BEGIN
      UPDATE visits SET updatedAt = CURRENT_TIMESTAMP WHERE id = NEW.id;
    END;
  `);
};

// Initialize database
initializeDB();

const connectDB = () => {
  try {
    console.log(`SQLite Connected: ${dbPath}`);
    return db;
  } catch (error) {
    console.error(`Error connecting to SQLite: ${error.message}`);
    process.exit(1);
  }
};

export default connectDB;
export { db };
