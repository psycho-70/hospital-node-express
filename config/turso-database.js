import { createClient } from '@libsql/client';
import dotenv from 'dotenv';

dotenv.config();

// Create Turso client
const client = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

// Initialize tables
const initializeDB = async () => {
  try {
    console.log('Initializing Turso database...');

    // Users table
    await client.execute(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT NOT NULL UNIQUE,
        email TEXT NOT NULL UNIQUE,
        password TEXT NOT NULL,
        role TEXT NOT NULL DEFAULT 'staff' CHECK(role IN ('admin', 'staff')),
        resetPasswordToken TEXT,
        resetPasswordExpires INTEGER,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await client.execute(`CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);`);
    await client.execute(`CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);`);
    await client.execute(`CREATE INDEX IF NOT EXISTS idx_users_resetToken ON users(resetPasswordToken);`);

    // Patients table
    await client.execute(`
      CREATE TABLE IF NOT EXISTS patients (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        idCard TEXT NOT NULL UNIQUE,
        name TEXT NOT NULL,
        dateOfBirth TEXT,
        type TEXT CHECK(type IN ('child', 'man', 'woman')),
        charges REAL DEFAULT 0,
        visitCount INTEGER DEFAULT 0,
        isActive INTEGER DEFAULT 1,
        createdBy INTEGER NOT NULL,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (createdBy) REFERENCES users(id)
      );
    `);

    await client.execute(`CREATE INDEX IF NOT EXISTS idx_patients_idCard ON patients(idCard);`);
    await client.execute(`CREATE INDEX IF NOT EXISTS idx_patients_createdAt ON patients(createdAt DESC);`);

    // Visits table
    await client.execute(`
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
    `);

    await client.execute(`CREATE INDEX IF NOT EXISTS idx_visits_patient ON visits(patientId, visitNumber);`);
    await client.execute(`CREATE INDEX IF NOT EXISTS idx_visits_createdAt ON visits(createdAt DESC);`);

    // Triggers
    await client.execute(`
      CREATE TRIGGER IF NOT EXISTS update_users_timestamp 
      AFTER UPDATE ON users
      BEGIN
        UPDATE users SET updatedAt = CURRENT_TIMESTAMP WHERE id = NEW.id;
      END;
    `);

    await client.execute(`
      CREATE TRIGGER IF NOT EXISTS update_patients_timestamp 
      AFTER UPDATE ON patients
      BEGIN
        UPDATE patients SET updatedAt = CURRENT_TIMESTAMP WHERE id = NEW.id;
      END;
    `);

    await client.execute(`
      CREATE TRIGGER IF NOT EXISTS update_visits_timestamp 
      AFTER UPDATE ON visits
      BEGIN
        UPDATE visits SET updatedAt = CURRENT_TIMESTAMP WHERE id = NEW.id;
      END;
    `);

    console.log('Turso database initialized successfully');
  } catch (error) {
    console.error('Error initializing Turso database:', error);
    throw error;
  }
};

const connectDB = async () => {
  try {
    await initializeDB();
    console.log(`Turso Connected: ${process.env.TURSO_DATABASE_URL}`);
    return client;
  } catch (error) {
    console.error(`Error connecting to Turso: ${error.message}`);
    process.exit(1);
  }
};

export default connectDB;
export { client as db };

