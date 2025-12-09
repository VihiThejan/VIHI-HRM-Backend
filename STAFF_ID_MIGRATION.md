# Staff ID Login Migration Guide

## Overview
The login system has been updated to use Staff ID instead of email address for authentication.

## Changes Made

### Backend Changes
1. **Authentication Controller** (`src/controllers/auth.controller.ts`)
   - Login endpoint now accepts `staffId` instead of `email`
   - Returns `staffId` in the user response
   - Validates staff ID and password combination

2. **Employee Model** (`src/models/Employee.model.ts`)
   - `staffId` field is now required for all employees
   - Added indexes on `staffId` for faster queries
   - Staff ID must be unique

3. **Employee Controller** (`src/controllers/employee.controller.ts`)
   - Auto-generates staff IDs when creating new employees (format: VIHI001, VIHI002, etc.)
   - Search functionality now includes staff ID
   - Added helper function to generate sequential staff IDs

4. **Migration Script** (`src/scripts/addStaffIds.ts`)
   - Adds staff IDs to existing employees without one
   - Generates sequential IDs starting from VIHI001

### Frontend Changes
1. **Login Page** (`app/(auth)/login/page.tsx`)
   - Updated form to use Staff ID input field instead of email
   - Changed placeholder and labels
   - Updated test credentials display

## Staff ID Format
- **Format**: `VIHI###` (e.g., VIHI001, VIHI002, VIHI003)
- **Prefix**: VIHI (company identifier)
- **Numbers**: 3-digit zero-padded sequential number

## Migration Steps

### For Existing Database
Run the migration script to add staff IDs to existing employees:

```bash
npm run add:staff-ids
```

This will:
- Find all employees without a staff ID
- Generate sequential staff IDs (VIHI001, VIHI002, etc.)
- Update each employee record

### For New Employees
Staff IDs are automatically generated when creating new employees through:
- Employee creation API endpoint
- The system will find the last staff ID and increment

## Usage

### Login Request Format
**Old (Email-based):**
```json
{
  "email": "admin@vihi.com",
  "password": "admin123"
}
```

**New (Staff ID-based):**
```json
{
  "staffId": "VIHI001",
  "password": "admin123"
}
```

### Response Format
```json
{
  "status": "success",
  "data": {
    "token": "jwt_token_here",
    "user": {
      "id": "user_id",
      "name": "User Name",
      "email": "user@email.com",
      "staffId": "VIHI001",
      "role": "admin",
      "department": "IT",
      "position": "Admin"
    }
  }
}
```

## Test Credentials
After migration, default test login:
- **Staff ID**: VIHI001
- **Password**: admin123 (or your configured admin password)

## Notes
- Staff IDs are case-sensitive
- Staff IDs cannot be changed once assigned (unique identifier)
- Email is still stored and used for communication purposes
- Old email-based authentication is no longer supported
