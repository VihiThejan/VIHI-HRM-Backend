# Test Login Endpoint

Test the login functionality with the created admin user.

## Request

```http
POST http://localhost:5000/api/auth/login
Content-Type: application/json

{
  "email": "admin@vihi.com",
  "password": "admin123"
}
```

## Expected Response

```json
{
  "status": "success",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": "...",
      "name": "System Admin",
      "email": "admin@vihi.com",
      "role": "admin",
      "department": "IT",
      "position": "System Administrator"
    }
  }
}
```

## Test with PowerShell

```powershell
$body = @{
    email = "admin@vihi.com"
    password = "admin123"
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:5000/api/auth/login" -Method POST -Body $body -ContentType "application/json"
```

## Test with cURL

```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@vihi.com","password":"admin123"}'
```

## Common Issues Fixed

1. ✅ Added validation error handling middleware
2. ✅ Created admin user in database
3. ✅ Password hashing working correctly
4. ✅ JWT token generation configured
5. ✅ Rate limiting applied to login endpoint
