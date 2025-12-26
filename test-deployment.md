# Test Your Deployment Locally

Before deploying, make sure everything works locally!

## 1. Test Local Server

```bash
# Install dependencies
npm install

# Start the server
npm start
```

Expected output:
```
SQLite Connected: E:\New folder (2)\Backend\data\clinic.db
Server is running on port 5000
```

## 2. Test API Endpoints

Open another terminal and test these endpoints:

### Test Root Endpoint
```bash
curl http://localhost:5000/
```

Expected response:
```json
{
  "message": "Clinic Management System API",
  "version": "1.0.0",
  "endpoints": {
    "auth": "/api/auth",
    "patients": "/api/patients"
  }
}
```

### Test Registration (Create a test user)
```bash
curl -X POST http://localhost:5000/api/auth/register ^
  -H "Content-Type: application/json" ^
  -d "{\"username\":\"testuser\",\"email\":\"test@example.com\",\"password\":\"Test123456\",\"role\":\"admin\"}"
```

### Test Login
```bash
curl -X POST http://localhost:5000/api/auth/login ^
  -H "Content-Type: application/json" ^
  -d "{\"email\":\"test@example.com\",\"password\":\"Test123456\"}"
```

Save the token from the response!

### Test Protected Route
```bash
curl http://localhost:5000/api/patients ^
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

## 3. Check for Errors

If you see any errors:
- ✅ Check that `data/clinic.db` was created
- ✅ Check that all dependencies are installed
- ✅ Check that `.env` file exists with `JWT_SECRET`
- ✅ Check console for error messages

## 4. Environment Variables Check

Create a `.env` file if you don't have one:

```env
PORT=5000
NODE_ENV=development
JWT_SECRET=your_super_secret_jwt_key_change_this_in_production
JWT_EXPIRE=7d
```

## 5. Verify Package.json

Make sure your `package.json` has:

```json
{
  "type": "module",
  "main": "server.js",
  "scripts": {
    "start": "node server.js",
    "dev": "nodemon server.js"
  }
}
```

## 6. Common Local Issues

### Port Already in Use
```
Error: listen EADDRINUSE: address already in use :::5000
```

**Fix**: Change PORT in `.env` to 5001 or kill the process using port 5000

### Module Not Found
```
Error: Cannot find module 'express'
```

**Fix**: Run `npm install`

### Database Error
```
Error: unable to open database file
```

**Fix**: Make sure `data/` folder exists or create it:
```bash
mkdir data
```

## 7. Ready to Deploy?

If all tests pass:
- ✅ Root endpoint works
- ✅ Registration works
- ✅ Login returns a token
- ✅ Protected routes work with token
- ✅ No console errors

**You're ready to deploy!** 🚀

Choose your deployment platform:
- **Railway**: See `QUICK_DEPLOY.md` Option A
- **Vercel + Turso**: See `MIGRATE_TO_TURSO.md`

## 8. Windows PowerShell Alternative

If `curl` doesn't work, use PowerShell:

```powershell
# Test root endpoint
Invoke-RestMethod -Uri http://localhost:5000/ -Method Get

# Test registration
$body = @{
    username = "testuser"
    email = "test@example.com"
    password = "Test123456"
    role = "admin"
} | ConvertTo-Json

Invoke-RestMethod -Uri http://localhost:5000/api/auth/register -Method Post -Body $body -ContentType "application/json"

# Test login
$loginBody = @{
    email = "test@example.com"
    password = "Test123456"
} | ConvertTo-Json

$response = Invoke-RestMethod -Uri http://localhost:5000/api/auth/login -Method Post -Body $loginBody -ContentType "application/json"
$token = $response.token

# Test protected route
$headers = @{
    Authorization = "Bearer $token"
}
Invoke-RestMethod -Uri http://localhost:5000/api/patients -Method Get -Headers $headers
```

