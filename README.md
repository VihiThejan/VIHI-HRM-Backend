# 🚀 VIHI IT Solutions - HR Time Tracking System Backend

## 📋 Overview

This is the Node.js + Express backend API for the VIHI IT Solutions HR Time Tracking System. It provides RESTful endpoints for employee management, activity tracking, and authentication.

## 🛠️ Tech Stack

- **Runtime**: Node.js (v18+)
- **Framework**: Express.js
- **Database**: MongoDB Atlas with Mongoose ODM
- **Authentication**: JWT (JSON Web Tokens)
- **Security**: Helmet, CORS, bcryptjs
- **Logger**: Morgan

## 📁 Project Structure

```
backend/
├── src/
│   ├── controllers/       # Request handlers
│   │   ├── userController.js
│   │   └── activityController.js
│   ├── models/           # Mongoose schemas
│   │   ├── User.js
│   │   └── Activity.js
│   ├── routes/           # API routes
│   │   ├── userRoutes.js
│   │   └── activityRoutes.js
│   ├── middleware/       # Custom middleware
│   │   ├── authMiddleware.js
│   │   ├── errorHandler.js
│   │   ├── asyncHandler.js
│   │   └── notFound.js
│   ├── utils/           # Helper functions
│   │   └── jwtUtils.js
│   ├── config/          # Configuration files
│   │   └── db.js
│   └── index.js         # Entry point
├── .env.example         # Environment variables template
├── .gitignore
├── package.json
└── README.md
```

## 🚀 Getting Started

### Prerequisites

- Node.js (v18 or higher)
- MongoDB Atlas account
- npm or yarn

### Installation

1. **Navigate to backend folder**
   ```bash
   cd backend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment variables**
   ```bash
   cp .env.example .env
   ```

   Edit `.env` with your values:
   ```env
   NODE_ENV=development
   PORT=5000
   MONGODB_URI=mongodb+srv://your-username:password@cluster.mongodb.net/vihi-hr-system
   JWT_SECRET=your-super-secret-key
   JWT_EXPIRE=30d
   FRONTEND_URL=http://localhost:3000
   ```

4. **Start development server**
   ```bash
   npm run dev
   ```

   For production:
   ```bash
   npm start
   ```

5. **Verify server is running**
   ```
   Open: http://localhost:5000/api/health
   ```

   Expected response:
   ```json
   {
     "success": true,
     "message": "VIHI IT Solutions HR System API is running",
     "timestamp": "2025-11-13T...",
     "environment": "development"
   }
   ```

## 📚 API Endpoints

### Authentication

| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| POST | `/api/users/register` | Register new user | Public |
| POST | `/api/users/login` | Login user | Public |

### Users

| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| GET | `/api/users` | Get all users | Admin |
| GET | `/api/users/:id` | Get user by ID | Private |
| GET | `/api/users/profile` | Get current user | Private |
| PUT | `/api/users/:id` | Update user | Admin |
| DELETE | `/api/users/:id` | Delete user | Admin |

### Activity Tracking

| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| POST | `/api/activity` | Create activity record | Private |
| GET | `/api/activity` | Get all activities | Admin |
| GET | `/api/activity/user/:employeeId` | Get user activities | Private |
| GET | `/api/activity/stats/:employeeId` | Get activity statistics | Private |
| DELETE | `/api/activity/:id` | Delete activity | Admin |

## 🔐 Authentication

All protected routes require a JWT token in the Authorization header:

```http
Authorization: Bearer <your-jwt-token>
```

### Example Request

```javascript
fetch('http://localhost:5000/api/users/profile', {
  headers: {
    'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
    'Content-Type': 'application/json'
  }
})
```

## 🧪 Testing API with Postman/Thunder Client

### 1. Register a User

```http
POST http://localhost:5000/api/users/register
Content-Type: application/json

{
  "name": "John Doe",
  "email": "john@vihi.com",
  "password": "password123",
  "employeeId": "VIHI001",
  "role": "employee",
  "department": "Technology",
  "position": "Software Engineer"
}
```

### 2. Login

```http
POST http://localhost:5000/api/users/login
Content-Type: application/json

{
  "email": "john@vihi.com",
  "password": "password123"
}
```

Response includes token - use it for subsequent requests.

### 3. Create Activity Record

```http
POST http://localhost:5000/api/activity
Authorization: Bearer <your-token>
Content-Type: application/json

{
  "employeeId": "VIHI001",
  "date": "2025-11-13",
  "activeTime": 28800,
  "idleTime": 3600,
  "applications": [
    {
      "name": "VS Code",
      "duration": 14400,
      "category": "productive"
    },
    {
      "name": "Chrome",
      "duration": 10800,
      "category": "neutral"
    }
  ],
  "websites": [
    {
      "url": "https://github.com",
      "domain": "github.com",
      "duration": 7200,
      "category": "productive"
    }
  ],
  "deviceInfo": {
    "hostname": "VIHI-LAPTOP-01",
    "os": "Windows 11",
    "ipAddress": "192.168.1.100"
  }
}
```

## 🐍 Python Client Integration

The Python time tracking agent will POST activity data to the `/api/activity` endpoint.

### Python Example

```python
import requests
import json

API_URL = "http://localhost:5000/api/activity"
TOKEN = "your-jwt-token"

headers = {
    "Authorization": f"Bearer {TOKEN}",
    "Content-Type": "application/json"
}

activity_data = {
    "employeeId": "VIHI001",
    "date": "2025-11-13",
    "activeTime": 28800,
    "idleTime": 3600,
    "applications": [...],
    "websites": [...],
    "deviceInfo": {...}
}

response = requests.post(API_URL, json=activity_data, headers=headers)
print(response.json())
```

## 🌐 MongoDB Atlas Setup

1. Create MongoDB Atlas account at https://www.mongodb.com/cloud/atlas
2. Create a new cluster (free tier available)
3. Create database user with password
4. Whitelist your IP address (or use 0.0.0.0/0 for development)
5. Get connection string and add to `.env`

## 🚢 Deployment

### Deploy to Render.com

1. Push code to GitHub
2. Go to https://render.com
3. Create new Web Service
4. Connect your GitHub repo
5. Configure:
   - **Root Directory**: `backend`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
6. Add environment variables from `.env`
7. Deploy!

### Environment Variables for Production

```env
NODE_ENV=production
PORT=5000
MONGODB_URI=<your-mongodb-atlas-uri>
JWT_SECRET=<strong-secret-key>
JWT_EXPIRE=30d
FRONTEND_URL=https://your-app.vercel.app
```

## 🔒 Security Best Practices

- ✅ JWT tokens expire after 30 days
- ✅ Passwords hashed with bcrypt (10 rounds)
- ✅ Helmet.js for security headers
- ✅ CORS configured for frontend only
- ✅ MongoDB injection protection via Mongoose
- ✅ Input validation on all routes
- ✅ Role-based access control (RBAC)

## 📊 Database Models

### User Schema
- name, email, password (hashed)
- role: admin | employee | manager
- employeeId (unique)
- department, position
- isActive, lastLogin

### Activity Schema
- user (ref to User)
- employeeId, date
- activeTime, idleTime, totalTime
- applications[] (name, duration, category)
- websites[] (url, domain, duration, category)
- productivity (score, status)
- deviceInfo

## 🐛 Troubleshooting

### MongoDB Connection Failed
- Check your connection string
- Verify IP whitelist in MongoDB Atlas
- Ensure network access is configured

### JWT Token Invalid
- Check JWT_SECRET in .env matches
- Verify token hasn't expired
- Include "Bearer " prefix

### CORS Error
- Check FRONTEND_URL in .env
- Verify CORS origin in index.js

## 📝 License

© 2025 VIHI IT Solutions. All rights reserved.

## 👥 Support

For issues or questions, contact: support@vihiit.com
