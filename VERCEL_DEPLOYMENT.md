# Vercel Deployment Guide

## Important Notes About SQLite on Vercel

⚠️ **Critical**: Vercel's serverless functions have a **read-only file system**. This means SQLite databases won't work properly in production on Vercel because:
- The database file cannot be written to
- Each function invocation is isolated
- Data won't persist between requests

## Recommended Solutions

### Option 1: Use Vercel Postgres (Recommended)
Vercel offers a managed PostgreSQL database that works perfectly with serverless functions.

1. Install Vercel Postgres:
```bash
npm install @vercel/postgres
```

2. Add Vercel Postgres to your project through Vercel Dashboard
3. Update your code to use PostgreSQL instead of SQLite

### Option 2: Use Turso (SQLite Alternative)
Turso provides a serverless SQLite-compatible database that works with Vercel.

1. Sign up at https://turso.tech
2. Install Turso SDK:
```bash
npm install @libsql/client
```

3. Update your database configuration to use Turso

### Option 3: Deploy to a Different Platform
Consider platforms that support persistent file systems:
- Railway.app
- Render.com
- DigitalOcean App Platform
- Fly.io

## Deployment Steps for Vercel (After Fixing Database)

### 1. Prerequisites
- GitHub account
- Vercel account (sign up at https://vercel.com)
- Your code pushed to a GitHub repository

### 2. Environment Variables
Set these in Vercel Dashboard (Settings → Environment Variables):

```
JWT_SECRET=your_production_jwt_secret_here
NODE_ENV=production
DB_PATH=your_database_connection_string (if using external DB)
```

### 3. Deploy via Vercel Dashboard

1. Go to https://vercel.com/new
2. Import your GitHub repository
3. Configure project:
   - **Framework Preset**: Other
   - **Root Directory**: ./
   - **Build Command**: (leave empty)
   - **Output Directory**: (leave empty)
4. Add environment variables
5. Click "Deploy"

### 4. Deploy via Vercel CLI

```bash
# Install Vercel CLI
npm install -g vercel

# Login to Vercel
vercel login

# Deploy to production
vercel --prod
```

## Current Configuration Files

### vercel.json
```json
{
  "version": 2,
  "builds": [
    {
      "src": "server.js",
      "use": "@vercel/node"
    }
  ],
  "routes": [
    {
      "src": "/(.*)",
      "dest": "server.js"
    }
  ],
  "env": {
    "NODE_ENV": "production"
  }
}
```

### Modified server.js
The server has been updated to:
- Export the Express app for Vercel
- Only start the server in non-production environments
- Work with Vercel's serverless architecture

## Testing Locally

Before deploying, test your application:

```bash
# Install dependencies
npm install

# Run locally
npm start

# Or with nodemon for development
npm run dev
```

## Troubleshooting

### Error: FUNCTION_INVOCATION_FAILED
This usually means:
1. **Database issue**: SQLite won't work on Vercel (most common)
2. **Missing environment variables**: Check Vercel dashboard
3. **Module import errors**: Ensure all dependencies are in package.json
4. **Timeout**: Function took too long (10s limit on free tier)

### Check Vercel Logs
1. Go to your Vercel dashboard
2. Select your project
3. Click on the failed deployment
4. View "Functions" tab for error logs

### Common Fixes
- Ensure `"type": "module"` is in package.json (already set)
- All dependencies must be in `dependencies`, not `devDependencies`
- Environment variables must be set in Vercel dashboard
- Replace SQLite with a serverless-compatible database

## Next Steps

1. **Choose a database solution** (Vercel Postgres or Turso recommended)
2. **Update your database configuration**
3. **Test locally with the new database**
4. **Deploy to Vercel**
5. **Set environment variables in Vercel dashboard**
6. **Test your deployed API**

## Support Resources

- [Vercel Documentation](https://vercel.com/docs)
- [Vercel Postgres](https://vercel.com/docs/storage/vercel-postgres)
- [Turso Documentation](https://docs.turso.tech/)
- [Vercel Serverless Functions](https://vercel.com/docs/functions/serverless-functions)

