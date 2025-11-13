# Stage 4 Implementation Guide
## AI-Driven Productivity Analysis, Anomaly Detection & Automated Alerting

### Overview
Stage 4 adds intelligent AI-powered features to the HR Time Tracking System:
- **AI Productivity Scoring**: Calculates daily scores (0-100) using weighted algorithm
- **Anomaly Detection**: Identifies 6 types of productivity anomalies using 7-day baseline
- **Automated Alerting**: Sends Slack/email notifications for critical anomalies
- **Cron Job Automation**: Daily midnight analysis with automatic score calculation and alert dispatch

---

## 📋 Implementation Summary

### Backend Components Created (8 files)
1. **`src/models/ProductivitySummary.js`** - MongoDB model for AI-calculated daily scores
2. **`src/models/Anomaly.js`** - MongoDB model for detected anomalies
3. **`src/services/aiProductivityService.js`** - Scoring engine with algorithm
4. **`src/services/anomalyDetectionService.js`** - 7-day baseline anomaly detection
5. **`src/services/cronJobManager.js`** - Daily analysis automation
6. **`src/utils/alertManager.js`** - Slack/email alert dispatcher
7. **`src/controllers/aiController.js`** - AI endpoints controller
8. **`src/routes/aiRoutes.js`** - AI API routes

### Frontend Components Created (4 files)
1. **`src/components/cards/ScoreCard.jsx`** - AI score display with color coding
2. **`src/components/charts/ScoreTrendChart.jsx`** - 7-day score trend line chart
3. **`src/components/tables/AnomalyTable.jsx`** - Anomaly list with resolve button
4. **`src/lib/api.js`** - Enhanced with AI API methods

### Configuration Updates
- **Backend `.env.example`** - Added email/Slack config variables
- **Backend `index.js`** - Integrated AI routes and cron job
- **Backend `package.json`** - Added `nodemailer` and `node-cron` dependencies

---

## 🧠 AI Scoring Algorithm

### Formula
```javascript
score = (activeTime / totalTime) * 70 + (mouseKeyboardEvents / expectedEvents) * 30
```

### Weights
- **Time Ratio (70%)**: Active vs idle time efficiency
- **Activity Events (30%)**: Mouse/keyboard interaction intensity

### Categories
| Score Range | Category | Color | Description |
|-------------|----------|-------|-------------|
| 80-100 | Excellent | Green | Outstanding productivity |
| 60-79 | Good | Blue | Satisfactory performance |
| 40-59 | Needs Improvement | Orange | Below expectations |
| 0-39 | Inactive | Red | Minimal activity detected |

---

## 🔍 Anomaly Detection System

### 6 Anomaly Types

#### 1. **Low Activity** ⚠️
- **Trigger**: Score drops ≥40% below 7-day baseline
- **Example**: Baseline score 75 → Actual score 40 (53% deviation)
- **Severity**: Based on deviation % (Critical ≥70%, High ≥50%, Medium ≥30%, Low <30%)

#### 2. **Idle Spike** 💤
- **Trigger**: Idle time increases ≥40% above 7-day baseline
- **Example**: Baseline idle 2h → Actual idle 3.5h (75% deviation)
- **Severity**: Based on deviation %

#### 3. **No Data** 📵
- **Trigger**: Zero activity logs for entire day
- **Example**: Employee forgot to run tracker, system offline
- **Severity**: Always Critical (100% deviation)

#### 4. **Late Start** ⏰
- **Trigger**: Work start ≥2 hours later than 7-day average
- **Example**: Usual start 9:00 → Actual start 11:30 (2.5h late)
- **Severity**: Based on hour difference

#### 5. **Early End** 🏁
- **Trigger**: Work end ≥2 hours earlier than 7-day average
- **Example**: Usual end 17:00 → Actual end 14:30 (2.5h early)
- **Severity**: Based on hour difference

#### 6. **Extended Idle** 💤
- **Trigger**: Continuous idle period ≥120 minutes (2 hours)
- **Example**: Employee idle from 14:00-16:30 (150 min)
- **Severity**: Based on deviation from baseline average idle

### Baseline Calculation
- **Period**: Previous 7 days (excluding target date)
- **Metrics Averaged**: Score, active time, idle time, mouse/keyboard events, work hours
- **Minimum Data**: At least 1 day of historical data required
- **Update Frequency**: Recalculated daily

### Severity Thresholds
```javascript
if (deviationPercent >= 70) => Critical 🚨
if (deviationPercent >= 50) => High ⚠️
if (deviationPercent >= 30) => Medium ⚡
if (deviationPercent < 30) => Low ℹ️
```

---

## 📧 Automated Alerting System

### Alert Channels

#### 1. **Slack Webhook**
**Configuration:**
```env
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/YOUR/WEBHOOK/URL
```

**Alert Format:**
- Rich card with color-coded severity
- Employee details (name, ID, department)
- Anomaly type, severity, deviation %
- Actual vs expected values
- Timestamp footer

**Example Slack Message:**
```
🚨 Productivity Anomaly Alert

Employee: John Doe (EMP001)
Department: Engineering
Date: Monday, January 13, 2025

Anomaly Type: Low Activity
Severity: 🚨 Critical
Deviation: 72%

Actual Score: 22
Expected Score: 78

Description: Productivity score (22) is 72% below baseline (78) for John Doe
```

#### 2. **Email (Nodemailer)**
**Configuration:**
```env
EMAIL_SERVICE=gmail
ALERT_EMAIL_FROM=your-email@gmail.com
ALERT_EMAIL_PASS=your-app-password
ALERT_EMAIL_TO=hr@vihi.ai
```

**Email Template:**
- Professional HTML layout with gradient header
- Color-coded severity badges
- Detailed anomaly breakdown table
- "View Dashboard" CTA button
- Footer with company branding

**Subject Line Format:**
```
🚨 Productivity Anomaly Alert - John Doe (Critical)
```

### Alert Dispatch Logic
1. Anomaly detected during daily analysis
2. Check if alert already sent (prevent duplicates)
3. Send to both Slack and email channels
4. Record alert dispatch in `Anomaly` model:
   - `alertSent: true`
   - `alertSentAt: timestamp`
   - `alertChannels: ['slack', 'email']`
5. Only send for **Medium** severity and above (configurable)

---

## ⏰ Cron Job Automation

### Schedule
```javascript
cron.schedule('0 0 * * *', runDailyAnalysis);
// Runs at 00:00 (midnight) every day
```

### Daily Analysis Workflow
```
12:00 AM (Midnight) - Cron Job Triggered
  ↓
Step 1: Calculate Productivity Scores
  ├─ Fetch all active employees
  ├─ For each employee:
  │   ├─ Aggregate previous day's ActivityLog data
  │   ├─ Calculate score using AI algorithm
  │   └─ Store in ProductivitySummary collection
  └─ Log: "✅ Scores calculated: 45/45"
  ↓
Step 2: Detect Anomalies
  ├─ For each employee:
  │   ├─ Calculate 7-day baseline
  │   ├─ Compare yesterday vs baseline
  │   ├─ Detect 6 anomaly types
  │   └─ Store anomalies in Anomaly collection
  └─ Log: "🔍 Total anomalies detected: 8"
  ↓
Step 3: Send Alerts
  ├─ Filter unresolved anomalies (Medium+ severity)
  ├─ For each anomaly:
  │   ├─ Send Slack webhook POST
  │   ├─ Send email via nodemailer
  │   └─ Record alert in database
  └─ Log: "📧 Alerts sent: 8"
  ↓
Completion
  └─ Log summary: Duration, scores, anomalies, alerts
```

### Console Output Example
```
============================================================
🤖 DAILY AI ANALYSIS STARTED
📅 Analyzing date: Monday, January 13, 2025
⏰ Started at: 1/14/2025, 12:00:05 AM
============================================================

👥 Found 45 active employees

📊 STEP 1/3: Calculating Productivity Scores
------------------------------------------------------------
  ✅ EMP001 - John Doe
  ✅ EMP002 - Jane Smith
  ...
  ✅ EMP045 - Alex Johnson

✅ Scores calculated: 45/45

🔍 STEP 2/3: Detecting Anomalies
------------------------------------------------------------
  ⚠️  EMP001 - 2 anomaly(ies) detected
  ✅ EMP002 - No anomalies
  ...
  ⚠️  EMP012 - 1 anomaly(ies) detected

🔍 Total anomalies detected: 8

📧 STEP 3/3: Sending Alerts
------------------------------------------------------------
  ✅ Alerts sent: 8

============================================================
✅ DAILY ANALYSIS COMPLETED
⏱️  Duration: 23.45s
📊 Scores: 45/45
🔍 Anomalies: 8
📧 Alerts: 8
⏰ Finished at: 1/14/2025, 12:00:28 AM
============================================================
```

### Manual Trigger (Admin)
```bash
POST /api/ai/analysis/run
Body: { "date": "2025-01-13" }
```

---

## 🌐 API Endpoints

### Productivity Scoring
| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| GET | `/api/ai/score/:employeeId/:date` | Get employee score for date | Employee/Admin |
| GET | `/api/ai/score/:employeeId/trend/:days` | Get score trend (last N days) | Employee/Admin |
| GET | `/api/ai/team/scores/:date` | Get team scores for date | Admin only |
| GET | `/api/ai/performance/distribution` | Get performance distribution | Admin only |
| POST | `/api/ai/recalculate/:date` | Recalculate scores for date | Admin only |

### Anomaly Detection
| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| GET | `/api/ai/anomalies/:employeeId` | Get employee anomalies | Employee/Admin |
| GET | `/api/ai/anomalies` | Get all unresolved anomalies | Admin only |
| GET | `/api/ai/anomalies/stats` | Get anomaly statistics | Admin only |
| POST | `/api/ai/anomalies/detect/:employeeId/:date` | Detect anomalies | Admin only |
| PATCH | `/api/ai/anomalies/:anomalyId/resolve` | Resolve anomaly | Admin only |

### Alerting
| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| POST | `/api/ai/alerts/send/:anomalyId` | Send alert for anomaly | Admin only |
| POST | `/api/ai/alerts/test` | Test alert system | Admin only |

### Cron Jobs
| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| POST | `/api/ai/analysis/run` | Run manual analysis | Admin only |
| GET | `/api/ai/cron/status` | Get cron job status | Admin only |

---

## 🎨 Frontend Integration

### Employee Dashboard Enhancements
```jsx
import ScoreCard from '@/components/cards/ScoreCard';
import ScoreTrendChart from '@/components/charts/ScoreTrendChart';
import AnomalyTable from '@/components/tables/AnomalyTable';
import { aiAPI } from '@/lib/api';

// Fetch AI score
const { data: scoreData } = useSWR(
  `/ai/score/${employeeId}/${today}`,
  () => aiAPI.getEmployeeScore(employeeId, today)
);

// Fetch score trend
const { data: trendData } = useSWR(
  `/ai/trend/${employeeId}/7`,
  () => aiAPI.getScoreTrend(employeeId, 7)
);

// Fetch anomalies
const { data: anomaliesData } = useSWR(
  `/ai/anomalies/${employeeId}`,
  () => aiAPI.getEmployeeAnomalies(employeeId, 7)
);

// Render
<Grid container spacing={3}>
  <Grid item xs={12} md={4}>
    <ScoreCard 
      score={scoreData?.data?.score} 
      category={scoreData?.data?.category}
      date={today}
    />
  </Grid>
  <Grid item xs={12} md={8}>
    <ScoreTrendChart data={trendData?.data} />
  </Grid>
  <Grid item xs={12}>
    <AnomalyTable 
      anomalies={anomaliesData?.data} 
      isAdmin={false}
    />
  </Grid>
</Grid>
```

### Admin Dashboard Enhancements
```jsx
// Fetch team scores
const { data: teamScores } = useSWR(
  `/ai/team/scores/${today}`,
  () => aiAPI.getTeamScores(today)
);

// Fetch all anomalies
const { data: allAnomalies } = useSWR(
  '/ai/anomalies',
  () => aiAPI.getAllAnomalies()
);

// Resolve anomaly
const handleResolve = async (anomalyId, notes) => {
  await aiAPI.resolveAnomaly(anomalyId, notes);
  mutate(); // Refresh data
};

// Render
<AnomalyTable 
  anomalies={allAnomalies?.data} 
  onResolve={handleResolve}
  isAdmin={true}
/>
```

---

## 🧪 Testing Guide

### 1. Test Scoring Algorithm
```bash
# Start backend
cd VIHI-HRM-Backend
npm start

# Create test activity logs (via Python tracker or API)
# Wait for cron job at midnight OR trigger manually:

curl -X POST http://localhost:5000/api/ai/analysis/run \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"date": "2025-01-13"}'
```

### 2. Test Anomaly Detection
```bash
# Create varied activity patterns:
# - Day 1-7: Normal activity (8h active, 1h idle, score 75)
# - Day 8: Low activity (3h active, 5h idle, score 30) → Should trigger anomaly

# Check anomalies
curl http://localhost:5000/api/ai/anomalies/EMP001?days=7 \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 3. Test Alert System
```bash
# Test Slack/Email configuration
curl -X POST http://localhost:5000/api/ai/alerts/test \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"

# Expected response:
{
  "success": true,
  "data": {
    "slack": { "configured": true, "tested": true, "success": true },
    "email": { "configured": true, "tested": true, "success": true }
  }
}
```

### 4. Verify Cron Job
```bash
# Check cron status
curl http://localhost:5000/api/ai/cron/status \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"

# Expected response:
{
  "scheduled": true,
  "cronExpression": "0 0 * * *",
  "description": "Daily AI analysis at midnight",
  "timezone": "Asia/Colombo",
  "nextRun": "Midnight (00:00) every day"
}
```

---

## 🔧 Configuration

### Required Environment Variables
```env
# Backend (.env)
MONGODB_URI=mongodb+srv://...
JWT_SECRET=your-secret
ACTIVITY_API_KEY=your-api-key
FRONTEND_URL=http://localhost:3000

# Stage 4 Variables
EMAIL_SERVICE=gmail
ALERT_EMAIL_FROM=alerts@vihi.ai
ALERT_EMAIL_PASS=your-app-password
ALERT_EMAIL_TO=hr@vihi.ai
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/...
CRON_TIMEZONE=Asia/Colombo
```

### Gmail App Password Setup
1. Enable 2FA on Gmail account
2. Go to: https://myaccount.google.com/apppasswords
3. Generate app password for "Mail"
4. Use generated password in `ALERT_EMAIL_PASS`

### Slack Webhook Setup
1. Go to: https://api.slack.com/apps
2. Create new app → "Incoming Webhooks"
3. Activate webhooks → Add New Webhook
4. Select channel → Copy webhook URL
5. Paste URL in `SLACK_WEBHOOK_URL`

---

## 📊 Database Schema

### ProductivitySummary Collection
```javascript
{
  user: ObjectId (ref: User),
  employeeId: String,
  date: Date,
  score: Number, // 0-100
  category: String, // Excellent/Good/Needs Improvement/Inactive
  activeTime: Number, // seconds
  idleTime: Number, // seconds
  totalTime: Number, // seconds
  totalMouseMoves: Number,
  totalKeyPresses: Number,
  totalActivityLogs: Number,
  timeRatioScore: Number, // 0-70
  activityScore: Number, // 0-30
  workHoursStart: Number, // 0-23
  workHoursEnd: Number, // 0-23
  peakProductivityHour: Number, // 0-23
  createdAt: Date,
  updatedAt: Date
}
```

### Anomaly Collection
```javascript
{
  user: ObjectId (ref: User),
  employeeId: String,
  date: Date,
  type: String, // Low Activity, Idle Spike, No Data, Late Start, Early End, Extended Idle
  severity: String, // Critical/High/Medium/Low
  actualValue: Number,
  expectedValue: Number,
  deviationPercent: Number,
  description: String,
  resolved: Boolean,
  resolvedBy: ObjectId (ref: User),
  resolvedAt: Date,
  resolvedNotes: String,
  alertSent: Boolean,
  alertSentAt: Date,
  alertChannels: [String], // ['slack', 'email']
  createdAt: Date,
  updatedAt: Date
}
```

---

## 🚀 Deployment Notes

### Backend Deployment
1. Set all environment variables in hosting platform
2. Ensure timezone is correct for cron job (`CRON_TIMEZONE`)
3. Verify MongoDB connection string
4. Test Slack/email configuration before production

### Cron Job Considerations
- **Heroku**: Uses `cron.schedule()` - runs automatically
- **Vercel**: Not supported (use Vercel Cron or external service)
- **AWS/Azure**: Configure timezone in app settings
- **Alternative**: Use external cron service (cron-job.org) to hit `/api/ai/analysis/run` endpoint

### Email Deliverability
- Use authenticated SMTP (Gmail App Password)
- Configure SPF/DKIM records for custom domain
- Monitor spam folder initially
- Consider using SendGrid/Mailgun for production

### Slack Rate Limits
- Webhooks: 1 message per second
- Current implementation: Sequential alerts (no batching)
- For >10 alerts/day: Implement batching or daily digest

---

## 📈 Performance Optimization

### Database Indexes (Already Implemented)
```javascript
// ProductivitySummary
{ employeeId: 1, date: -1 } // Unique compound index
{ date: -1, score: -1 } // Sorting queries

// Anomaly
{ employeeId: 1, date: -1 } // Employee queries
{ resolved: 1, createdAt: -1 } // Admin dashboard
{ severity: 1, resolved: 1 } // Alert filtering
```

### Caching Strategy
- **Frontend**: SWR with 30s revalidation
- **Backend**: Consider Redis for frequently accessed scores
- **Reports**: Cache daily summaries after midnight analysis

---

## 🐛 Troubleshooting

### Cron Job Not Running
1. Check console output: Should see "⏰ Daily AI analysis cron job initialized"
2. Verify timezone: Set `CRON_TIMEZONE` correctly
3. Test manually: `POST /api/ai/analysis/run`
4. Check server logs at midnight

### Alerts Not Sending
1. Test configuration: `POST /api/ai/alerts/test`
2. **Slack**: Verify webhook URL is valid
3. **Email**: Check app password, enable 2FA
4. Check `alertSent` flag in database (prevent duplicates)

### Low Score Issues
1. Verify ActivityLog data exists for date
2. Check formula: `(activeTime/totalTime)*70 + (events/expectedEvents)*30`
3. Ensure tracker is sending mouse/keyboard events
4. Review expected values: 6h work, 120 events/hour

### No Anomalies Detected
1. Minimum 7 days baseline required
2. Check 40% deviation threshold
3. Verify ProductivitySummary data exists for past 7 days
4. Review baseline calculation logic

---

## 📚 Related Documentation
- **STAGE1-IMPLEMENTATION.md** - Backend setup, JWT auth
- **STAGE2-IMPLEMENTATION.md** - ActivityLog model, Python tracker
- **STAGE3-IMPLEMENTATION.md** - Analytics service, Socket.io, Reports
- **STAGE4-QUICK-START.md** - 5-minute setup guide
- **API-REFERENCE.md** - Complete API documentation

---

## 🎯 Next Steps (Future Enhancements)
1. **Machine Learning Model**: Replace formula with TensorFlow.js model
2. **Predictive Analytics**: Forecast productivity trends
3. **Sentiment Analysis**: Integrate Slack/email sentiment
4. **Team Collaboration Metrics**: Analyze meeting attendance, response times
5. **Mobile Alerts**: Push notifications via FCM
6. **Custom Thresholds**: Per-employee anomaly sensitivity
7. **Weekly Digest**: Consolidated weekly report emails
8. **A/B Testing**: Compare scoring algorithms

---

*Implementation completed: January 2025*  
*VIHI IT Solutions - HR Time Tracking System Stage 4*
