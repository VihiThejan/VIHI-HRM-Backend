# Stage 3 Quick Start Guide
## Analytics Dashboard & Live Tracking - 5 Minute Setup

**VIHI IT Solutions - HR Time Tracking System**

---

## 🚀 What's New in Stage 3?

✅ **Analytics Service** - Productivity metrics from raw logs  
✅ **Real-Time Tracking** - Live employee monitoring via Socket.io  
✅ **Report Generation** - Export CSV/PDF reports  
✅ **Enhanced Dashboards** - New charts and visualizations  

---

## ⚡ Quick Start (5 Minutes)

### Step 1: Install Backend Dependencies (1 min)
```bash
cd VIHI-HRM-Backend
npm install socket.io json2csv pdfkit
```

### Step 2: Install Frontend Dependencies (1 min)
```bash
cd company-web
npm install socket.io-client
```

### Step 3: Start Backend Server (1 min)
```bash
cd VIHI-HRM-Backend
npm start
```
**Expected Output:**
```
✅ MongoDB Connected Successfully
🚀 Server running on port 5000
📍 Health check: http://localhost:5000/api/health
⚡ Socket.io enabled for live tracking
```

### Step 4: Start Frontend Server (1 min)
```bash
cd company-web
npm run dev
```
**Expected Output:**
```
▲ Next.js 15.5.4
- Local: http://localhost:3000
- Ready in 2.5s
```

### Step 5: View Analytics Dashboard (1 min)
1. Open http://localhost:3000/dashboard/employee
2. See new charts:
   - 7-Day Productivity Trend
   - Top Apps Pie Chart
   - Activity Heatmap
   - Live Status Indicator

---

## 📊 New API Endpoints

### Analytics Endpoints
```
GET /api/analytics/summary?employeeId=EMP001&date=2025-01-15
GET /api/analytics/productivity-trend?employeeId=EMP001&days=7
GET /api/analytics/top-apps?employeeId=EMP001&limit=10
GET /api/analytics/team-summary (Admin only)
GET /api/analytics/online-employees (Admin only)
```

### Report Endpoints
```
GET /api/reports/daily/csv?employeeId=EMP001&date=2025-01-15
GET /api/reports/daily/pdf?employeeId=EMP001&date=2025-01-15
GET /api/reports/team/csv?startDate=2025-01-01&endDate=2025-01-15 (Admin)
GET /api/reports/team/pdf?startDate=2025-01-01&endDate=2025-01-15 (Admin)
```

---

## 🎯 Feature Testing Checklist

### Employee Dashboard
- [ ] Login as employee
- [ ] Check 7-day productivity trend chart loads
- [ ] Verify top apps pie chart displays
- [ ] See 30-day activity heatmap
- [ ] Check hourly distribution chart
- [ ] Look for green "Live tracking active" indicator
- [ ] Click export PDF button (if implemented)

### Admin Dashboard
- [ ] Login as admin
- [ ] Check online employees panel shows live users
- [ ] Verify team performance table displays
- [ ] See productivity color-coded chips (green/blue/orange/red)
- [ ] Click "Export CSV" button → downloads team report
- [ ] Click "Export PDF" button → downloads team PDF
- [ ] Check live employee count updates

### Real-Time Tracking
- [ ] Open browser console (F12)
- [ ] See "✅ Socket.io connected" log
- [ ] Run Python tracker → see "📊 Activity update received" logs
- [ ] Stop tracker → see employee go offline in admin dashboard

---

## 🔥 Quick Test Commands

### Test Analytics API (cURL)
```bash
# Replace YOUR_JWT_TOKEN with actual token from localStorage

# Get employee summary
curl -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  "http://localhost:5000/api/analytics/summary?employeeId=EMP001"

# Get online employees
curl -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  "http://localhost:5000/api/analytics/online-employees"
```

### Test Socket.io (Browser Console)
```javascript
// In dashboard page, open console (F12)
// You should see:
✅ Socket.io connected
📊 Activity update received: { employeeId: 'EMP001', timestamp: '...' }
```

### Test Report Download (Browser Console)
```javascript
// In dashboard page
import { reportsAPI } from '@/lib/api';
reportsAPI.downloadDailyPDF('EMP001', '2025-01-15');
// PDF download should start
```

---

## 📁 Files Created (Total: 15)

### Backend Files (7)
```
VIHI-HRM-Backend/
├── src/
│   ├── services/
│   │   └── analyticsService.js       ✅ NEW (311 lines)
│   ├── routes/
│   │   ├── analyticsRoutes.js        ✅ NEW (184 lines)
│   │   └── reportRoutes.js           ✅ NEW (121 lines)
│   ├── utils/
│   │   └── reportGenerator.js        ✅ NEW (359 lines)
│   ├── controllers/
│   │   └── activityLogController.js  🔄 UPDATED (Socket.io emit)
│   └── index.js                       🔄 UPDATED (Socket.io setup)
└── STAGE3-IMPLEMENTATION.md          ✅ NEW (Docs)
```

### Frontend Files (8)
```
company-web/
├── src/
│   ├── components/
│   │   └── charts/
│   │       ├── ProductivityTrendChart.jsx    ✅ NEW (67 lines)
│   │       ├── AppUsagePieChart.jsx          ✅ NEW (88 lines)
│   │       ├── ActivityHeatmap.jsx           ✅ NEW (146 lines)
│   │       └── HourlyActivityChart.jsx       ✅ NEW (56 lines)
│   ├── hooks/
│   │   └── useSocket.js                      ✅ NEW (98 lines)
│   ├── lib/
│   │   └── api.js                            🔄 UPDATED (Analytics/Reports API)
│   └── app/
│       └── dashboard/
│           ├── employee/page.jsx             🔄 UPDATED (New charts)
│           └── admin/page.jsx                🔄 UPDATED (Online panel, export)
```

---

## 🎨 Dashboard Preview

### Employee Dashboard Layout
```
┌─────────────────────────────────────────────────┐
│ My Dashboard                         [Logout]   │
├─────────────────────────────────────────────────┤
│ [Active Time] [Idle Time] [Productivity] [Days] │  ← Stats Cards
├─────────────────────────────────────────────────┤
│ 🟢 Live tracking active - Last update: 2:45 PM  │  ← Real-time indicator
├─────────────────────────────────────────────────┤
│ 7-Day Productivity Trend                        │  ← Line chart
│ [Chart with active/idle/score lines]            │
├──────────────────────────┬──────────────────────┤
│ Top Apps Pie Chart       │ Hourly Distribution  │  ← Split view
│ [Pie chart]              │ [Bar chart]          │
├──────────────────────────┴──────────────────────┤
│ Activity Heatmap (30 Days)                      │  ← Calendar heatmap
│ [Grid of colored cells]                         │
├─────────────────────────────────────────────────┤
│ [Activity Summary] [Recent Logs] ← Tabs         │
└─────────────────────────────────────────────────┘
```

### Admin Dashboard Layout
```
┌─────────────────────────────────────────────────┐
│ Admin Dashboard    [Export CSV] [Export PDF]    │
├─────────────────────────────────────────────────┤
│ 🟢 Live tracking - 5 employees online           │
├─────────────────────────────────────────────────┤
│ [Total Employees] [Active Time] [Avg Prod] [...] │
├─────────────────────────────────────────────────┤
│ 🟢 Online Employees (5)                         │
│ ┌────────┐ ┌────────┐ ┌────────┐               │
│ │ John D │ │ Sarah M│ │ Mike J │  ← Live cards │
│ │ EMP001 │ │ EMP002 │ │ EMP003 │               │
│ │ 🟢 Active│ │ 🟡 Idle │ │ 🟢 Active│             │
│ └────────┘ └────────┘ └────────┘               │
├─────────────────────────────────────────────────┤
│ Team Performance Summary                        │
│ ┌──────────┬────────┬─────────┬──────────┐     │
│ │ Employee │ Dept   │ Hours   │ Prod     │     │
│ ├──────────┼────────┼─────────┼──────────┤     │
│ │ John Doe │ Tech   │ 7.5h    │ 🟢 85%   │     │
│ │ Sarah M  │ Design │ 6.2h    │ 🔵 72%   │     │
│ └──────────┴────────┴─────────┴──────────┘     │
└─────────────────────────────────────────────────┘
```

---

## 🐛 Common Issues & Fixes

### Issue 1: Socket.io Not Connecting
**Symptom:** No "Live tracking" indicator  
**Fix:**
```bash
# Check backend logs for Socket.io initialization
# Verify NEXT_PUBLIC_API_URL in frontend .env.local
# Clear browser cache and reload
```

### Issue 2: Charts Not Displaying
**Symptom:** Empty chart components  
**Fix:**
```bash
# Ensure ActivityLog collection has data in MongoDB
# Run Python tracker for 5+ minutes to generate data
# Check browser console for API errors
```

### Issue 3: PDF Download Fails
**Symptom:** No download starts  
**Fix:**
```bash
# Verify pdfkit installed: npm list pdfkit
# Check JWT token in localStorage
# Disable popup blocker in browser
```

### Issue 4: "analyticsAPI is not defined"
**Symptom:** Frontend error in console  
**Fix:**
```javascript
// Check import statement in dashboard files:
import { analyticsAPI } from '@/lib/api';
// Ensure api.js exports analyticsAPI
```

---

## 📞 Need Help?

1. **Check Full Documentation:** `STAGE3-IMPLEMENTATION.md`
2. **Review Backend Logs:** Terminal where `npm start` is running
3. **Check Browser Console:** Press F12 in dashboard
4. **Verify MongoDB Data:** Use MongoDB Compass or Atlas
5. **Test API Directly:** Use Postman with JWT token

---

## ✅ Success Checklist

- [ ] Backend running on port 5000 with Socket.io
- [ ] Frontend running on port 3000
- [ ] Analytics endpoints return data
- [ ] Socket.io connects (check console logs)
- [ ] New charts render on employee dashboard
- [ ] Online employees panel shows on admin dashboard
- [ ] Export CSV/PDF buttons work
- [ ] Live status indicators update in real-time

---

**Stage 3 Complete! 🎉**  
Your HR Time Tracking System now has enterprise-grade analytics and real-time monitoring.

**Next:** Explore `STAGE3-IMPLEMENTATION.md` for advanced features and API details.
