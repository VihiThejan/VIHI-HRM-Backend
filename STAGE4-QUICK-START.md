# Stage 4 Quick Start Guide
## AI-Driven Productivity Analysis in 5 Minutes ⚡

### Prerequisites
✅ Stages 1-3 completed (Backend running, Python tracker active, ActivityLog data exists)  
✅ MongoDB Atlas connection working  
✅ At least 7 days of historical activity data for baseline

---

## 🚀 Step 1: Install Dependencies (1 minute)

```bash
cd VIHI-HRM-Backend
npm install nodemailer node-cron
```

**Verify installation:**
```bash
npm list nodemailer node-cron
# Should show:
# ├── nodemailer@6.9.x
# └── node-cron@3.0.x
```

---

## 🔐 Step 2: Configure Environment Variables (2 minutes)

Edit `VIHI-HRM-Backend/.env`:

```env
# ============================================
# AI & ALERTING CONFIGURATION (Stage 4)
# ============================================

# Email Alert Configuration (Gmail)
EMAIL_SERVICE=gmail
ALERT_EMAIL_FROM=your-email@gmail.com
ALERT_EMAIL_PASS=your-16-char-app-password
ALERT_EMAIL_TO=hr@vihi.ai

# Slack Webhook Configuration
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/YOUR/WEBHOOK/URL

# Cron Job Configuration
CRON_TIMEZONE=Asia/Colombo
```

### Quick Gmail Setup
1. Go to https://myaccount.google.com/apppasswords
2. Create app password for "Mail"
3. Copy 16-character password → Paste in `ALERT_EMAIL_PASS`

### Quick Slack Setup
1. Go to https://api.slack.com/apps → Create New App
2. Enable "Incoming Webhooks" → Add New Webhook
3. Copy webhook URL → Paste in `SLACK_WEBHOOK_URL`

---

## ✅ Step 3: Test Configuration (1 minute)

### Start Backend
```bash
cd VIHI-HRM-Backend
npm start
```

**Look for these console messages:**
```
✅ MongoDB Connected Successfully
✅ Email transporter initialized
⏰ Daily AI analysis cron job initialized
✅ Daily analysis cron job scheduled (00:00 every day)
🚀 Server running on port 5000
```

### Test Alerts
```bash
# Open new terminal
curl -X POST http://localhost:5000/api/ai/alerts/test \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json"
```

**Expected response:**
```json
{
  "success": true,
  "data": {
    "slack": { "configured": true, "tested": true, "success": true },
    "email": { "configured": true, "tested": true, "success": true }
  }
}
```

✅ Check Slack channel for test message  
✅ Check email inbox for test email

---

## 🧪 Step 4: Run Manual Analysis (1 minute)

### Trigger AI Analysis for Yesterday
```bash
# Calculate yesterday's date
$yesterday = (Get-Date).AddDays(-1).ToString("yyyy-MM-dd")

# Run analysis
curl -X POST http://localhost:5000/api/ai/analysis/run `
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" `
  -H "Content-Type: application/json" `
  -d "{\"date\": \"$yesterday\"}"
```

**Watch backend console for output:**
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

✅ Scores calculated: 45/45

🔍 STEP 2/3: Detecting Anomalies
------------------------------------------------------------
  ⚠️  EMP001 - 2 anomaly(ies) detected
  ✅ EMP002 - No anomalies
  ...

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
============================================================
```

---

## 🎨 Step 5: Verify Frontend Integration (Optional)

### Check AI Score
```bash
# Get employee score for yesterday
curl http://localhost:5000/api/ai/score/EMP001/$yesterday \
  -H "Authorization: Bearer YOUR_EMPLOYEE_TOKEN"
```

**Response:**
```json
{
  "success": true,
  "data": {
    "employeeId": "EMP001",
    "date": "2025-01-13",
    "score": 75,
    "category": "Good",
    "activeTime": 21600,
    "idleTime": 7200,
    "totalMouseMoves": 45000,
    "totalKeyPresses": 12000,
    "timeRatioScore": 52,
    "activityScore": 23,
    "workHoursStart": 9,
    "workHoursEnd": 17,
    "peakProductivityHour": 14
  }
}
```

### Check Anomalies
```bash
curl http://localhost:5000/api/ai/anomalies/EMP001?days=7 \
  -H "Authorization: Bearer YOUR_EMPLOYEE_TOKEN"
```

---

## ⏰ Step 6: Verify Cron Job (Final Check)

### Check Cron Status
```bash
curl http://localhost:5000/api/ai/cron/status \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

**Response:**
```json
{
  "success": true,
  "data": {
    "scheduled": true,
    "cronExpression": "0 0 * * *",
    "description": "Daily AI analysis at midnight",
    "timezone": "Asia/Colombo",
    "nextRun": "Midnight (00:00) every day"
  }
}
```

✅ Cron job will run automatically at midnight every day!

---

## 🎉 Success Checklist

- [x] **Dependencies installed**: nodemailer, node-cron
- [x] **Environment variables configured**: Email, Slack, Timezone
- [x] **Backend started**: Cron job initialized
- [x] **Test alerts sent**: Slack + Email received
- [x] **Manual analysis completed**: Scores calculated, anomalies detected
- [x] **API endpoints working**: Score, anomalies, cron status
- [x] **Cron job scheduled**: Will run at midnight automatically

---

## 🚨 Quick Troubleshooting

### Issue: "Email transporter not available"
**Fix:** Check `.env` has `ALERT_EMAIL_FROM` and `ALERT_EMAIL_PASS` set correctly

### Issue: "Slack webhook not configured"
**Fix:** Verify `SLACK_WEBHOOK_URL` starts with `https://hooks.slack.com/services/`

### Issue: "No baseline data"
**Fix:** Ensure at least 7 days of ActivityLog data exists. Run manual analysis for past dates:
```bash
curl -X POST http://localhost:5000/api/ai/analysis/run \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"date": "2025-01-06"}'
```

### Issue: Cron job not running at midnight
**Fix:** Check `CRON_TIMEZONE` matches your server timezone. Test manually first.

---

## 📊 Understanding Your First Results

### Score Interpretation
- **80-100 (Excellent)**: 🟢 Highly productive, active work with good event activity
- **60-79 (Good)**: 🔵 Satisfactory performance, minor improvements possible
- **40-59 (Needs Improvement)**: 🟠 Below expectations, significant idle time or low activity
- **0-39 (Inactive)**: 🔴 Minimal activity detected, possible issues

### Anomaly Severity
- **Critical (Red)**: ≥70% deviation - immediate attention required
- **High (Orange)**: ≥50% deviation - review recommended
- **Medium (Yellow)**: ≥30% deviation - monitor trend
- **Low (Blue)**: <30% deviation - informational

---

## 🔄 Daily Workflow

### Automated (No Action Needed)
1. **Midnight**: Cron job runs automatically
2. **12:00:05 AM**: Scores calculated for all employees
3. **12:00:10 AM**: Anomalies detected
4. **12:00:15 AM**: Alerts sent (Medium+ severity)
5. **Morning**: HR admin reviews anomalies in dashboard

### Manual Admin Actions
1. **View anomalies**: Dashboard → Anomaly Alerts section
2. **Resolve anomaly**: Click "Resolve" → Add notes → Confirm
3. **Check team scores**: Dashboard → Team Performance section
4. **Run ad-hoc analysis**: Settings → Manual Analysis → Select date

---

## 📱 Next Steps

### For Employees
1. Check your daily AI score in Employee Dashboard
2. View 7-day trend chart to track progress
3. Review personal anomalies (if any)

### For HR Admins
1. Review all unresolved anomalies daily
2. Contact employees with Critical/High anomalies
3. Resolve anomalies after follow-up
4. Export weekly reports for management

### For Developers
1. Review full implementation: `STAGE4-IMPLEMENTATION.md`
2. Integrate frontend components (ScoreCard, AnomalyTable, ScoreTrendChart)
3. Customize alert templates in `alertManager.js`
4. Adjust scoring formula weights if needed

---

## 🌟 Production Deployment Checklist

- [ ] Set secure `JWT_SECRET`
- [ ] Use production MongoDB cluster
- [ ] Configure production email (SendGrid/Mailgun recommended)
- [ ] Set up dedicated Slack channel for alerts
- [ ] Configure `FRONTEND_URL` for dashboard links in emails
- [ ] Test cron job in production timezone
- [ ] Enable HTTPS for all API endpoints
- [ ] Set up monitoring (Sentry/LogRocket)
- [ ] Configure backup strategy for ProductivitySummary/Anomaly collections

---

## 🆘 Need Help?

### Documentation
- **Full Implementation Guide**: `STAGE4-IMPLEMENTATION.md`
- **API Reference**: Test all 16 AI endpoints
- **Database Schema**: ProductivitySummary + Anomaly models

### Common Questions
**Q: How many days of data needed for baseline?**  
A: Minimum 1 day, but 7 days recommended for accurate anomaly detection.

**Q: Can I change scoring algorithm?**  
A: Yes! Edit `aiProductivityService.js` → `WEIGHTS` constants (currently 70/30).

**Q: Can I customize anomaly types?**  
A: Yes! Edit `anomalyDetectionService.js` → Add new detection logic.

**Q: Can I skip email/Slack setup?**  
A: Yes, alerts are optional. System still calculates scores and detects anomalies.

---

**🎊 Congratulations! Stage 4 is now live with AI-powered productivity insights!**

*Setup time: ~5 minutes | Next cron run: Tonight at midnight* ⏰
