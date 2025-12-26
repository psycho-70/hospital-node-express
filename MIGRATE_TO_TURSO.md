# Migrate from SQLite to Turso for Vercel Deployment

Turso is a serverless SQLite-compatible database that works perfectly with Vercel.

## Step 1: Install Turso CLI and Create Database

```bash
# Install Turso CLI (Windows - PowerShell)
irm get.tur.so/install.ps1 | iex

# Or download from: https://github.com/tursodatabase/turso-cli/releases

# Login to Turso
turso auth login

# Create a new database
turso db create clinic-management

# Get your database URL
turso db show clinic-management

# Create an auth token
turso db tokens create clinic-management
```

Save the **Database URL** and **Auth Token** - you'll need these!

## Step 2: Install Turso SDK

```bash
npm install @libsql/client
```

## Step 3: Update package.json

Add the dependency (already done if you ran the command above):

```json
{
  "dependencies": {
    "@libsql/client": "^0.5.0",
    ...other dependencies
  }
}
```

## Step 4: Create New Database Configuration

Create a new file: `config/turso-database.js`

```javascript
import { createClient } from '@libsql/client';
import dotenv from 'dotenv';

dotenv.config();

const client = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

// Initialize tables
const initializeDB = async () => {
  try {
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
  }
};

const connectDB = async () => {
  try {
    await initializeDB();
    console.log('Connected to Turso database');
    return client;
  } catch (error) {
    console.error(`Error connecting to Turso: ${error.message}`);
    process.exit(1);
  }
};

export default connectDB;
export { client as db };
```

## Step 5: Update Environment Variables

Add to your `.env` file:

```env
TURSO_DATABASE_URL=libsql://your-database-url.turso.io
TURSO_AUTH_TOKEN=your_auth_token_here
```

## Step 6: Update Models to Use Turso

The models need to be updated to use async/await with Turso. Here's an example for User model:

**Before (better-sqlite3):**
```javascript
const stmt = db.prepare('SELECT * FROM users WHERE email = ?');
const user = stmt.get(email);
```

**After (Turso):**
```javascript
const result = await db.execute({
  sql: 'SELECT * FROM users WHERE email = ?',
  args: [email]
});
const user = result.rows[0];
```

## Step 7: Update server.js

```javascript
// Change from synchronous to asynchronous
await connectDB();
```

## Step 8: Deploy to Vercel

1. Push your changes to GitHub
2. In Vercel Dashboard, add environment variables:
   - `TURSO_DATABASE_URL`
   - `TURSO_AUTH_TOKEN`
   - `JWT_SECRET`
   - `NODE_ENV=production`
3. Deploy!

## Step 9: Migrate Existing Data (Optional)

If you have existing data in SQLite:

```bash
# Export from SQLite
sqlite3 data/clinic.db .dump > backup.sql

# Import to Turso
turso db shell clinic-management < backup.sql
```

## Benefits of Turso

✅ SQLite-compatible (minimal code changes)
✅ Works with Vercel serverless functions
✅ Automatic backups
✅ Edge replication for low latency
✅ Generous free tier
✅ No cold starts

## Alternative: Quick Fix with Vercel Postgres

If you prefer PostgreSQL, I can also help you migrate to Vercel Postgres instead.

