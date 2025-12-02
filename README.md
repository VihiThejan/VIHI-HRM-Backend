# VIHI HRM Backend

Backend API for VIHI Human Resource Management System built with Node.js, Express, TypeScript, and MongoDB.

## Tech Stack

- **Runtime**: Node.js
- **Framework**: Express.js
- **Language**: TypeScript
- **Database**: MongoDB with Mongoose ODM
- **Authentication**: JWT (JSON Web Tokens)
- **Validation**: Express Validator
- **Security**: Helmet, CORS, Rate Limiting
- **File Upload**: Multer
- **PDF Generation**: PDFKit
- **Logging**: Winston
- **Task Scheduling**: Node-Cron

## Project Structure

```
backend/
├── src/
│   ├── config/              # Configuration files
│   │   ├── database.ts      # MongoDB connection
│   │   └── logger.ts        # Winston logger setup
│   ├── controllers/         # Route controllers
│   │   ├── auth.controller.ts
│   │   └── employee.controller.ts
│   ├── middleware/          # Custom middleware
│   │   ├── auth.middleware.ts
│   │   ├── error.middleware.ts
│   │   ├── rateLimiter.middleware.ts
│   │   └── validation.middleware.ts
│   ├── models/              # Mongoose models
│   │   ├── Employee.model.ts
│   │   ├── Leave.model.ts
│   │   ├── Attendance.model.ts
│   │   ├── Payroll.model.ts
│   │   ├── Performance.model.ts
│   │   ├── JobPosting.model.ts
│   │   ├── Applicant.model.ts
│   │   └── InternTimeTracking.model.ts
│   ├── routes/              # API routes
│   │   ├── auth.routes.ts
│   │   ├── employee.routes.ts
│   │   ├── leave.routes.ts
│   │   ├── attendance.routes.ts
│   │   ├── payroll.routes.ts
│   │   ├── performance.routes.ts
│   │   ├── recruitment.routes.ts
│   │   └── intern.routes.ts
│   ├── jobs/                # Cron jobs
│   │   └── diaryGeneration.job.ts
│   ├── utils/               # Utility functions
│   │   ├── pdfGenerator.ts
│   │   └── fileUpload.ts
│   └── server.ts            # Entry point
├── logs/                    # Log files
├── uploads/                 # Uploaded files
├── .env.example             # Environment variables template
├── .gitignore
├── package.json
├── tsconfig.json
└── README.md
```

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- MongoDB (local or MongoDB Atlas)

### Installation

1. **Install dependencies:**
```bash
cd backend
npm install
```

2. **Set up environment variables:**
```bash
cp .env.example .env
```

Edit `.env` file:
```env
NODE_ENV=development
PORT=5000
MONGODB_URI=mongodb://localhost:27017/vihi_hrm
JWT_SECRET=your-secret-key-here
JWT_EXPIRE=7d
CORS_ORIGIN=http://localhost:3000
```

3. **Create required directories:**
```bash
mkdir logs uploads
```

4. **Run development server:**
```bash
npm run dev
```

5. **Build for production:**
```bash
npm run build
npm start
```

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new employee
- `POST /api/auth/login` - Login employee
- `GET /api/auth/me` - Get current user
- `POST /api/auth/logout` - Logout user

### Employees
- `GET /api/employees` - Get all employees (with pagination)
- `GET /api/employees/:id` - Get single employee
- `POST /api/employees` - Create employee (Admin/CEO only)
- `PUT /api/employees/:id` - Update employee (Admin/CEO only)
- `DELETE /api/employees/:id` - Delete employee (Admin/CEO only)

### Leaves
- `GET /api/leaves` - Get leaves
- `POST /api/leaves` - Request leave
- `PUT /api/leaves/:id/approve` - Approve/reject leave

### Attendance
- `POST /api/attendance/check-in` - Clock in
- `POST /api/attendance/check-out` - Clock out
- `GET /api/attendance` - Get attendance records

### Payroll
- `POST /api/payroll/generate` - Generate payroll (Admin/CEO)
- `GET /api/payroll` - Get payroll records
- `GET /api/payroll/:employeeId` - Get employee payroll

### Performance
- `GET /api/performance/:employeeId` - Get employee reviews
- `POST /api/performance` - Create review
- `PUT /api/performance/:id` - Update review

### Recruitment
- `GET /api/recruitment/jobs` - Get job postings
- `POST /api/recruitment/jobs` - Create job posting
- `GET /api/recruitment/applicants` - Get applicants

### Intern Time Tracking
- `POST /api/interns/clock` - Clock in/out
- `POST /api/interns/track` - Log task hours
- `GET /api/interns/:id/weekly` - Get weekly summary
- `POST /api/interns/:id/comments` - Add CEO comments (CEO only)
- `GET /api/interns/:id/diary` - Download weekly diary

## Authentication

All protected routes require JWT token in the Authorization header:

```
Authorization: Bearer <token>
```

## Role-Based Access Control

- **Admin**: Full access to all modules
- **CEO**: Full access, can add comments to intern diaries
- **Manager**: Can manage team, approve leaves
- **Employee**: Can view own data, request leaves
- **Intern**: Limited access, can track time

## Database Models

### Employee
- Personal details (name, email, phone, address)
- Employment details (department, position, salary, joinDate)
- Role and status
- Emergency contact

### Leave
- Employee reference
- Leave type (sick, casual, annual, unpaid)
- Date range and reason
- Approval status and approver

### Attendance
- Employee reference
- Check-in/out times
- Total hours calculation
- Daily status

### Payroll
- Employee reference
- Monthly salary breakdown
- Deductions and bonuses
- Net salary calculation

### Performance
- Employee and reviewer references
- Goals, achievements, rating
- Strengths and improvement areas

### Intern Time Tracking
- Weekly time tracking (max 40 hours)
- Task logging with descriptions
- CEO comments
- Auto-generated PDF diaries

## Scheduled Jobs

### Weekly Diary Generation
- Runs every Sunday at midnight
- Generates PDF summaries for completed weeks
- Aggregates intern tasks and hours
- Includes CEO comments

## Security Features

- JWT authentication
- Password hashing with bcrypt
- Rate limiting (100 requests/10 min)
- Auth rate limiting (5 attempts/15 min)
- Helmet security headers
- CORS configuration
- Input validation
- Error handling

## Logging

- Winston logger with file rotation
- Separate error and combined logs
- Console logging in development
- Request/response logging with Morgan

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| NODE_ENV | Environment mode | development |
| PORT | Server port | 5000 |
| MONGODB_URI | MongoDB connection string | mongodb://localhost:27017/vihi_hrm |
| JWT_SECRET | JWT signing secret | - |
| JWT_EXPIRE | JWT expiration time | 7d |
| CORS_ORIGIN | Allowed CORS origin | http://localhost:3000 |
| MAX_FILE_SIZE | Max upload size in bytes | 5242880 |
| ENABLE_CRON_JOBS | Enable scheduled jobs | true |
| LOG_LEVEL | Logging level | info |

## Development

```bash
# Run in development with hot reload
npm run dev

# Run linter
npm run lint

# Run type check
npm run build

# Run tests
npm test
```

## Deployment

### MongoDB Atlas Setup
1. Create MongoDB Atlas account
2. Create cluster and database
3. Get connection string
4. Update MONGODB_URI in .env

### Deploy to Render/Railway
1. Push code to GitHub
2. Connect repository
3. Set environment variables
4. Deploy

## API Documentation

TODO: Add Swagger/OpenAPI documentation

## License

MIT
