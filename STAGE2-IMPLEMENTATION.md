# 📊 VIHI IT Solutions - HR Time Tracking System
## Stage 2 Implementation Complete

---

## ✅ What Was Implemented

### 🗄️ **Backend Enhancements**

#### **1. New ActivityLog Model** (`/backend/src/models/ActivityLog.js`)
Granular activity tracking with:
- Real-time event logging (every 60 seconds)
- Fields: `employeeId`, `timestamp`, `activeWindow`, `mouseMoves`, `keyboardPresses`, `idle`, `duration`
- Auto-categorization (productive/neutral/unproductive)
- Device information tracking
- Indexed for fast queries

#### **2. ActivityLog Controller** (`/backend/src/controllers/activityLogController.js`)
6 new endpoints:
- `POST /api/activity/log` - Create log entry (Python client)
- `GET /api/activity/log/:employeeId` - Get employee logs (paginated)
- `GET /api/activity/log/summary/:employeeId` - Get summary statistics
- `GET /api/activity/log/recent/:employeeId` - Get recent logs (live dashboard)
- `GET /api/activity/log/all` - Get all logs (Admin only)
- `DELETE /api/activity/log/cleanup` - Delete old logs (Admin only)

#### **3. API Key Middleware** (`/backend/src/middleware/apiKeyMiddleware.js`)
- Validates `X-API-Key` header for Python client
- Falls back to JWT authentication
- Secure access control for tracker clients

#### **4. Updated Routes** (`/backend/src/routes/activityLogRoutes.js`)
- Separate routes for activity logs
- Protected with API key or JWT
- Role-based authorization (Admin/Manager)

---

### 🐍 **Python Desktop Tracker**

#### **Complete Tracker Client** (`/backend/tracker_client.py`)

**Features:**
- ✅ Monitors active window title (using win32gui)
- ✅ Tracks mouse movements (using pynput)
- ✅ Counts keyboard presses (using pynput)
- ✅ Detects idle time (5-minute threshold)
- ✅ Sends data to API every 60 seconds
- ✅ Uses API key authentication
- ✅ Collects device info (hostname, OS, IP)
- ✅ Runs continuously in background
- ✅ Graceful shutdown with Ctrl+C

**Configuration File:** `.env.tracker.example`
```env
API_URL=http://localhost:5000/api/activity/log
ACTIVITY_API_KEY=your-api-key-here
EMPLOYEE_ID=EMP001
TRACKING_INTERVAL=60
IDLE_THRESHOLD=300
```

**Installation:**
```bash
cd backend
pip install -r requirements.txt
```

**Run Tracker:**
```bash
python tracker_client.py
```

**Example Output:**
```
🖥️  Device: LAPTOP-VIHI-01
💻 OS: Windows 11
👤 Employee ID: EMP001
📡 API URL: http://localhost:5000/api/activity/log
==================================================
✅ ACTIVE | Window: Visual Studio Code - tracker_client.py
🖱️  Mouse: 210 | ⌨️  Keyboard: 103
✅ [14:30:15] Activity sent successfully
```

---

### 🎨 **Frontend Enhancements**

#### **1. Chart Components** (`/src/components/charts/ActivityChart.jsx`)

**5 Reusable Chart Components:**
- `ProductivityBarChart` - Active vs Idle time comparison
- `ProductivityScoreChart` - Productivity trend over time
- `TopAppsChart` - Pie chart of most-used applications
- `HourlyActivityChart` - Activity distribution by hour
- `CategoryBreakdownChart` - Productive/Neutral/Unproductive split

**Built with Recharts:**
- Responsive design
- Interactive tooltips
- Color-coded categories
- MUI Paper wrapper

#### **2. Table Components** (`/src/components/tables/ActivityTable.jsx`)

**2 Table Components:**
- `ActivityTable` - Daily activity summaries with productivity scores
- `ActivityLogTable` - Real-time granular logs with window details

**Features:**
- Sortable columns
- Color-coded status chips
- Delete actions (Admin)
- Pagination support
- Sticky headers

#### **3. Employee Dashboard** (`/src/app/dashboard/employee/page.jsx`)

**Complete employee self-service dashboard:**
- ✅ 4 stat cards (Active Time, Idle Time, Avg Productivity, Days Tracked)
- ✅ 4 interactive charts (Bar, Line, Pie charts)
- ✅ Tabbed interface (Activity Summary & Recent Logs)
- ✅ Real-time data with SWR (refreshes every minute)
- ✅ JWT authentication required
- ✅ Auto-redirect if not logged in
- ✅ Responsive design (mobile-friendly)

**Screenshots:**
- Total active/idle time last 30 days
- Productivity score trend
- Top 5 applications used
- Activity category breakdown
- Recent activity logs

#### **4. Admin Dashboard** (`/src/app/dashboard/admin/page.jsx`)

**Comprehensive team management dashboard:**
- ✅ Team statistics (Total employees, Active time, Avg productivity, Low performers)
- ✅ Department filter
- ✅ 3 tabs (Team Overview, All Activities, Employee List)
- ✅ Team activity charts
- ✅ Employee cards with quick actions
- ✅ Activity management (view, delete)
- ✅ Role-based access (Admin/Manager only)

**Admin Features:**
- View all employee activities
- Delete activity records
- Filter by department
- Monitor low performers
- Track team productivity trends

#### **5. Updated API Client** (`/src/lib/api.js`)

**New activityLogAPI methods:**
```javascript
activityLogAPI.createLog()
activityLogAPI.getLogs()
activityLogAPI.getSummary()
activityLogAPI.getRecent()
activityLogAPI.getAllLogs()
activityLogAPI.cleanup()
```

#### **6. New Dependencies** (`package.json`)
- ✅ `recharts` (^2.15.0) - Data visualization
- ✅ `swr` (^2.2.5) - Data fetching with cache
- ✅ `date-fns` (for date formatting)

---

## 📁 Complete File Structure

```
VIHI-HRM-Backend/
├── src/
│   ├── models/
│   │   ├── User.js                     ✅ Existing
│   │   ├── Activity.js                 ✅ Existing
│   │   └── ActivityLog.js              ✨ NEW - Granular tracking
│   ├── controllers/
│   │   ├── userController.js           ✅ Existing
│   │   ├── activityController.js       ✅ Existing
│   │   └── activityLogController.js    ✨ NEW - 6 endpoints
│   ├── routes/
│   │   ├── userRoutes.js               ✅ Existing
│   │   ├── activityRoutes.js           ✅ Existing
│   │   └── activityLogRoutes.js        ✨ NEW - Activity log routes
│   ├── middleware/
│   │   ├── authMiddleware.js           ✅ Existing
│   │   ├── errorHandler.js             ✅ Existing
│   │   ├── asyncHandler.js             ✅ Existing
│   │   ├── notFound.js                 ✅ Existing
│   │   └── apiKeyMiddleware.js         ✨ NEW - API key validation
│   └── index.js                        ✅ Updated - Added new routes
├── tracker_client.py                   ✨ NEW - Python tracker
├── requirements.txt                    ✨ NEW - Python dependencies
├── .env.tracker.example                ✨ NEW - Tracker config
└── .env.example                        ✅ Updated - Added ACTIVITY_API_KEY

company-web/
├── src/
│   ├── app/
│   │   └── dashboard/
│   │       ├── employee/
│   │       │   └── page.jsx            ✨ NEW - Employee dashboard
│   │       └── admin/
│   │           └── page.jsx            ✨ NEW - Admin dashboard
│   ├── components/
│   │   ├── charts/
│   │   │   └── ActivityChart.jsx       ✨ NEW - 5 chart components
│   │   └── tables/
│   │       └── ActivityTable.jsx       ✨ NEW - 2 table components
│   └── lib/
│       └── api.js                      ✅ Updated - Added activityLogAPI
└── package.json                        ✅ Updated - Added recharts, swr
```

---

## 🚀 Setup & Testing Instructions

### **Step 1: Backend Setup**

```bash
cd VIHI-HRM-Backend

# Install dependencies (if not already done)
npm install

# Update .env file
cp .env.example .env
nano .env  # Add ACTIVITY_API_KEY

# Start backend server
npm run dev
```

**Verify:** http://localhost:5000/api/health

### **Step 2: Frontend Setup**

```bash
cd company-web

# Install new dependencies
npm install

# Start frontend
npm run dev
```

**Verify:** http://localhost:3000

### **Step 3: Python Tracker Setup**

```bash
cd VIHI-HRM-Backend

# Install Python dependencies
pip install -r requirements.txt

# Configure tracker
cp .env.tracker.example .env
nano .env  # Set EMPLOYEE_ID and ACTIVITY_API_KEY

# Run tracker
python tracker_client.py
```

**Expected Output:**
```
🚀 Starting activity tracker...
✅ [14:30:15] Activity sent successfully
```

### **Step 4: Test Dashboards**

1. **Register/Login:**
   - Visit: http://localhost:3000/test-api
   - Register a test user
   - Login and copy JWT token

2. **Employee Dashboard:**
   - Visit: http://localhost:3000/dashboard/employee
   - Must be logged in
   - View your personal activity stats

3. **Admin Dashboard:**
   - Visit: http://localhost:3000/dashboard/admin
   - Must be Admin or Manager role
   - View team statistics

---

## 📡 API Endpoints Summary

### **Activity Log Endpoints**

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/api/activity/log` | Create log entry | API Key or JWT |
| GET | `/api/activity/log/:employeeId` | Get employee logs | JWT |
| GET | `/api/activity/log/summary/:employeeId` | Get summary | JWT |
| GET | `/api/activity/log/recent/:employeeId` | Get recent logs | JWT |
| GET | `/api/activity/log/all` | Get all logs | Admin/Manager |
| DELETE | `/api/activity/log/cleanup` | Delete old logs | Admin |

### **Example API Call (Python Tracker)**

```python
import requests

headers = {
    'X-API-Key': 'your-api-key-here',
    'Content-Type': 'application/json'
}

payload = {
    'employeeId': 'EMP001',
    'activeWindow': 'VS Code - tracker_client.py',
    'mouseMoves': 210,
    'keyboardPresses': 103,
    'idle': False,
    'duration': 60,
    'deviceInfo': {
        'hostname': 'LAPTOP-01',
        'os': 'Windows 11',
        'ipAddress': '192.168.1.100'
    }
}

response = requests.post(
    'http://localhost:5000/api/activity/log',
    json=payload,
    headers=headers
)

print(response.json())
```

**Response:**
```json
{
  "success": true,
  "message": "Activity log created successfully",
  "data": {
    "_id": "...",
    "employeeId": "EMP001",
    "activeWindow": "VS Code - tracker_client.py",
    "windowCategory": "productive",
    "mouseMoves": 210,
    "keyboardPresses": 103,
    "idle": false,
    "duration": 60,
    "timestamp": "2025-11-13T14:30:15.000Z"
  }
}
```

---

## 🧪 Testing Checklist

### **Backend Tests:**
- ✅ POST /api/activity/log with API key → 201 Created
- ✅ POST /api/activity/log without auth → 401 Unauthorized
- ✅ GET /api/activity/log/:employeeId → Returns logs
- ✅ GET /api/activity/log/summary/:employeeId → Returns summary
- ✅ ActivityLog auto-categorizes windows correctly
- ✅ Old logs cleanup endpoint works (Admin only)

### **Python Tracker Tests:**
- ✅ Tracker starts and connects to API
- ✅ Mouse and keyboard events are counted
- ✅ Active window title is captured
- ✅ Idle detection works (5-minute threshold)
- ✅ Data is sent every 60 seconds
- ✅ Graceful shutdown with Ctrl+C

### **Frontend Tests:**
- ✅ Employee dashboard loads with auth
- ✅ Charts render with real data
- ✅ Tables display activities
- ✅ SWR auto-refreshes data
- ✅ Admin dashboard requires admin/manager role
- ✅ Department filter works
- ✅ Activity delete function works (Admin)

---

## 🚢 Deployment Guide

### **Backend (Render.com)**

1. **Add Environment Variables:**
   ```
   NODE_ENV=production
   PORT=5000
   MONGODB_URI=<your-mongodb-atlas-uri>
   JWT_SECRET=<strong-secret>
   JWT_EXPIRE=30d
   FRONTEND_URL=https://your-app.vercel.app
   ACTIVITY_API_KEY=<secure-random-key>
   ```

2. **Deploy:**
   - Push code to GitHub
   - Connect Render to your repo
   - Set root directory: `VIHI-HRM-Backend`
   - Deploy

### **Frontend (Vercel)**

1. **Install Dependencies:**
   ```bash
   npm install
   ```

2. **Add Environment Variable:**
   ```
   NEXT_PUBLIC_API_URL=https://your-backend.onrender.com
   ```

3. **Deploy:**
   ```bash
   vercel --prod
   ```

### **Python Tracker (Employee PCs)**

1. **Package as executable (optional):**
   ```bash
   pip install pyinstaller
   pyinstaller --onefile --windowed tracker_client.py
   ```

2. **Distribute:**
   - Share `.exe` file with employees
   - Include `.env` template
   - Each employee sets their `EMPLOYEE_ID`

3. **Auto-start on boot (Windows):**
   - Create shortcut in `shell:startup` folder
   - Or use Task Scheduler

---

## 🎯 Key Features Delivered

### ✅ **Backend:**
1. Granular activity logging (every 60 seconds)
2. ActivityLog model with auto-categorization
3. API key authentication for Python clients
4. 6 new endpoints for activity logs
5. Summary and statistics calculations
6. Cleanup endpoint for old logs

### ✅ **Python Tracker:**
1. Complete desktop monitoring solution
2. Window, mouse, keyboard tracking
3. Idle time detection
4. Configurable intervals
5. Secure API key authentication
6. Cross-platform compatible (Windows)

### ✅ **Frontend:**
1. Employee dashboard with 4 stats & 4 charts
2. Admin dashboard with team overview
3. Real-time data with SWR
4. Interactive charts with Recharts
5. Responsive design (mobile-friendly)
6. Role-based access control

---

## 📊 Data Flow

```
┌─────────────────────┐
│  Employee PC        │
│  Python Tracker     │
│  (Background)       │
└──────────┬──────────┘
           │ Every 60s
           │ POST /api/activity/log
           │ (X-API-Key)
           ▼
┌─────────────────────┐
│  Express Backend    │
│  ActivityLog Model  │
│  MongoDB Atlas      │
└──────────┬──────────┘
           │
           │ GET /api/activity/log/:id
           │ (JWT Token)
           ▼
┌─────────────────────┐
│  Next.js Frontend   │
│  Employee Dashboard │
│  Admin Dashboard    │
└─────────────────────┘
```

---

## 🔐 Security Features

1. ✅ **API Key Authentication** - Python tracker uses separate API key
2. ✅ **JWT Authentication** - Web dashboard uses JWT tokens
3. ✅ **Role-Based Access** - Admin/Manager/Employee permissions
4. ✅ **Password Hashing** - bcrypt with 10 rounds
5. ✅ **CORS Configuration** - Restricted to frontend URL
6. ✅ **Input Validation** - Mongoose schema validation
7. ✅ **MongoDB Injection Protection** - Mongoose sanitization

---

## 📈 Next Steps (Optional Enhancements)

### **Phase 3: Real-Time Features**
- [ ] WebSocket (Socket.io) for live updates
- [ ] Real-time activity feed
- [ ] Push notifications for low productivity
- [ ] Live employee status indicators

### **Phase 4: Analytics & Reporting**
- [ ] Weekly/monthly email reports
- [ ] Export reports to PDF/Excel
- [ ] Advanced productivity insights
- [ ] Team performance comparisons
- [ ] Goal setting and tracking

### **Phase 5: Advanced Features**
- [ ] Screenshot capture (optional, privacy-aware)
- [ ] Custom productivity categories
- [ ] Break time tracking
- [ ] Project time allocation
- [ ] Burnout detection

---

## 📞 Support

**VIHI IT Solutions**
- 📧 Email: support@vihiit.com
- 🌐 Website: https://vihiit.com
- 📂 Repository: https://github.com/VihiThejan/company-web

---

## ✨ Implementation Status

**🎉 STAGE 2 COMPLETE!**

All requested features have been implemented:
- ✅ ActivityLog model with all fields
- ✅ Controller and routes for activity logs
- ✅ Python tracker client (complete & tested)
- ✅ Employee dashboard with charts
- ✅ Admin dashboard with team overview
- ✅ Chart components (Recharts)
- ✅ Table components
- ✅ API key middleware
- ✅ Environment variables configured
- ✅ Complete documentation

**Ready for production deployment! 🚀**

---

© 2025 VIHI IT Solutions. All rights reserved.
