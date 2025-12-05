# Role-Based Access Control (RBAC) Implementation

## Overview

This document describes the complete Role-Based Access Control (RBAC) system implemented in the VIHI HRM application. The system provides dynamic permission management, allowing administrators to create custom roles and assign them to users.

## Architecture

### Database Models

#### 1. Permission Model (`src/models/Permission.model.ts`)
- **key**: Unique identifier for the permission (e.g., `view_employees`)
- **module**: The module it belongs to (`dashboard`, `employees`, `recruitment`, etc.)
- **action**: The action type (`view`, `create`, `update`, `delete`, `approve`, etc.)
- **description**: Human-readable description

#### 2. Role Model (`src/models/Role.model.ts`)
- **name**: Unique role name (e.g., "HR Admin", "Manager")
- **description**: Role description
- **permissionKeys**: Array of permission keys assigned to this role
- **isSystem**: Boolean flag indicating if this is a system role (cannot be deleted)

#### 3. User Model (`src/models/User.model.ts`)
- **name**: User's full name
- **email**: Unique email address
- **password**: Hashed password
- **roleIds**: Array of Role ObjectIds
- **employeeId**: Optional reference to Employee model
- **status**: `active`, `inactive`, or `suspended`
- **lastLogin**: Timestamp of last login

### Backend Implementation

#### Middleware

**Authentication Middleware** (`src/middleware/auth.middleware.ts`)
- Verifies JWT tokens
- Loads user with their roles and permissions
- Supports both RBAC users and legacy Employee model
- Attaches `req.user` with permissions array

**Permission Middleware** (`src/middleware/permission.middleware.ts`)
- `requirePermission(key)`: Requires specific permission
- `requireAnyPermission([keys])`: Requires at least one permission
- `requireAllPermissions([keys])`: Requires all permissions

#### Controllers

1. **Permission Controller** (`src/controllers/permission.controller.ts`)
   - GET `/api/admin/permissions` - List all permissions
   - GET `/api/admin/permissions/grouped` - Permissions grouped by module
   - POST `/api/admin/permissions` - Create permission
   - PUT `/api/admin/permissions/:id` - Update permission
   - DELETE `/api/admin/permissions/:id` - Delete permission

2. **Role Controller** (`src/controllers/role.controller.ts`)
   - GET `/api/admin/roles` - List all roles with user counts
   - GET `/api/admin/roles/:id` - Get single role with permissions
   - POST `/api/admin/roles` - Create new role
   - PUT `/api/admin/roles/:id` - Update role
   - DELETE `/api/admin/roles/:id` - Delete role (if not assigned to users)

3. **User Controller** (`src/controllers/user.controller.ts`)
   - GET `/api/admin/users` - List all users
   - GET `/api/admin/users/:id` - Get single user
   - POST `/api/admin/users` - Create new user
   - PUT `/api/admin/users/:id` - Update user
   - PUT `/api/admin/users/:id/roles` - Update user's roles
   - PUT `/api/admin/users/:id/password` - Reset user password
   - DELETE `/api/admin/users/:id` - Delete user

#### Seeding System

**Auto-seeding** (`src/scripts/seedRBAC.ts`)
- Runs automatically on server startup
- Seeds 40 permissions across 9 modules
- Creates 7 default roles:
  - Super Admin (all permissions)
  - HR Admin (full HR management)
  - Manager (approval and view rights)
  - Employee (basic access)
  - Intern (time tracking)
  - CEO (executive view)
  - Intern Mentor (mentoring access)

### Frontend Implementation

#### Navigation System (`lib/navigation.ts`)

Dynamic navigation configuration with permission-based filtering:

```typescript
{
  label: 'Employees',
  path: '/dashboard/employees',
  icon: '👥',
  requiredPermissions: ['view_employees', 'manage_employees'],
}
```

The `filterNavigation()` function removes nav items the user doesn't have permissions for.

#### Components

**Sidebar Component** (`components/Sidebar.tsx`)
- Receives `permissions` array
- Dynamically renders navigation based on user permissions
- Shows permission count

**Dashboard Layout** (`app/(dashboard)/layout.tsx`)
- Loads user data and permissions from localStorage
- Passes permissions to Sidebar
- Shows user profile with logout
- Redirects to login if not authenticated

#### Admin Pages

**Roles Management** (`app/(dashboard)/dashboard/admin/roles/page.tsx`)
- View all roles with user counts
- Create/edit/delete roles
- Permission matrix UI grouped by module
- Select all by module functionality
- System role protection

**Users Management** (`app/(dashboard)/dashboard/admin/users/page.tsx`)
- List users with roles and status
- Create/edit/delete users
- Manage user roles via modal
- Reset user passwords
- Status management (active/inactive/suspended)

## Permissions List

### Dashboard Module
- `view_dashboard` - View dashboard

### Employees Module
- `view_employees` - View employees list
- `create_employees` - Create new employee
- `update_employees` - Update employee information
- `delete_employees` - Delete employee
- `manage_employees` - Full employee management

### Recruitment Module
- `view_recruitment` - View job postings and applicants
- `create_recruitment` - Create job postings
- `update_recruitment` - Update job postings and applicant status
- `delete_recruitment` - Delete job postings
- `manage_recruitment` - Full recruitment management

### Leaves Module
- `request_leave` - Request leave
- `view_leaves` - View leave requests
- `update_leaves` - Update leave requests
- `approve_leaves` - Approve leave requests
- `reject_leaves` - Reject leave requests
- `delete_leaves` - Delete leave requests

### Attendance Module
- `view_attendance` - View attendance records
- `create_attendance` - Record attendance
- `update_attendance` - Update attendance records
- `manage_attendance` - Full attendance management

### Payroll Module
- `view_payroll` - View payroll information
- `create_payroll` - Generate payroll
- `update_payroll` - Update payroll records
- `approve_payroll` - Approve payroll
- `run_payroll` - Process payroll payments
- `manage_payroll` - Full payroll management

### Performance Module
- `view_performance` - View performance reviews
- `create_performance` - Create performance reviews
- `update_performance` - Update performance reviews
- `delete_performance` - Delete performance reviews
- `manage_performance` - Full performance management

### Interns Module
- `track_own_time` - Track own time entries
- `view_interns` - View intern time tracking
- `comment_intern_diary` - Comment on intern diaries
- `manage_interns` - Full intern management

### Admin Module
- `manage_roles` - Manage roles and permissions
- `manage_users` - Manage user accounts
- `manage_permissions` - Manage permissions
- `view_admin` - View admin panel

## Setup Instructions

### 1. Install Dependencies

Backend already has all required dependencies.

### 2. Start the Server

```bash
cd VIHI-HRM-Backend
npm run dev
```

The server will:
- Connect to MongoDB
- Auto-seed permissions and roles
- Start on port 5000

### 3. Create RBAC Admin User

```bash
npm run create:rbac-admin
```

This creates:
- Email: `admin@vihi.com`
- Password: `admin123`
- Role: Super Admin (all permissions)

### 4. Start Frontend

```bash
cd VIHI_HRM_CORE
npm run dev
```

Frontend will start on port 3000.

### 5. Login and Test

1. Navigate to `http://localhost:3000/login`
2. Login with `admin@vihi.com` / `admin123`
3. You'll see the dashboard with full navigation (all permissions)
4. Navigate to Admin > Users and Admin > Roles to manage RBAC

## Usage Examples

### Creating a New Role

1. Go to **Admin > Roles**
2. Click **Create Role**
3. Enter name and description
4. Select permissions from the matrix (grouped by module)
5. Click **Create**

### Assigning Roles to Users

1. Go to **Admin > Users**
2. Click the **Shield icon** next to a user
3. Select/deselect roles
4. Click **Update Roles**

### Adding Permissions to Routes

```typescript
// Require single permission
router.get('/employees', 
  protect, 
  requirePermission('view_employees'), 
  getEmployees
);

// Require any permission
router.get('/leaves', 
  protect, 
  requireAnyPermission(['view_leaves', 'approve_leaves']), 
  getLeaves
);

// Require all permissions
router.post('/payroll/process', 
  protect, 
  requireAllPermissions(['manage_payroll', 'approve_payroll']), 
  processPayroll
);
```

## Security Features

1. **JWT-based Authentication**: Tokens include user permissions
2. **Backend Validation**: All routes protected with middleware
3. **Frontend Filtering**: UI elements hidden based on permissions
4. **System Role Protection**: Default roles cannot be deleted
5. **Role Assignment Validation**: Cannot delete roles assigned to users
6. **Self-deletion Prevention**: Users cannot delete their own account

## Migration from Old System

The system maintains backward compatibility with the old Employee-based authentication:

- Existing Employee logins still work
- Old roles mapped to permissions automatically
- Gradual migration supported
- Run `npm run migrate:admin` to migrate admin employee to RBAC

## Testing the System

1. **Create Test Role**:
   - Create role "Department Manager"
   - Assign: `view_dashboard`, `view_employees`, `approve_leaves`

2. **Create Test User**:
   - Create user with email `manager@vihi.com`
   - Assign "Department Manager" role

3. **Login as Manager**:
   - Login with manager account
   - Verify limited navigation (no Admin, Payroll, etc.)
   - Verify can approve leaves but not manage employees

## API Response Format

### Login Response
```json
{
  "status": "success",
  "data": {
    "token": "jwt-token-here",
    "user": {
      "id": "user-id",
      "name": "System Admin",
      "email": "admin@vihi.com",
      "roleIds": ["role-id-1", "role-id-2"],
      "roles": [
        { "id": "role-id-1", "name": "Super Admin" }
      ],
      "permissions": [
        "view_dashboard",
        "manage_employees",
        ...
      ],
      "status": "active"
    }
  }
}
```

## Troubleshooting

### Permissions Not Working
- Ensure backend server restarted after adding permissions
- Check JWT token includes permissions array
- Verify middleware order (protect before requirePermission)

### User Cannot Access Route
- Check user's roles in Admin > Users
- Verify role has required permissions in Admin > Roles
- Check browser console for 403 errors with permission details

### Seeding Issues
- Delete existing permissions/roles in MongoDB
- Restart server to re-seed
- Check logs for seeding errors

## NPM Scripts

- `npm run dev` - Start development server
- `npm run create:rbac-admin` - Create RBAC admin user
- `npm run seed:rbac` - Manually seed permissions/roles
- `npm run migrate:admin` - Migrate employee to RBAC user

## Files Structure

```
Backend:
├── src/
│   ├── models/
│   │   ├── Permission.model.ts
│   │   ├── Role.model.ts
│   │   └── User.model.ts
│   ├── middleware/
│   │   ├── auth.middleware.ts
│   │   └── permission.middleware.ts
│   ├── controllers/
│   │   ├── permission.controller.ts
│   │   ├── role.controller.ts
│   │   └── user.controller.ts
│   ├── routes/
│   │   ├── permission.routes.ts
│   │   ├── role.routes.ts
│   │   └── user.routes.ts
│   └── scripts/
│       ├── seedRBAC.ts
│       └── createRBACAdmin.ts

Frontend:
├── lib/
│   └── navigation.ts
├── components/
│   └── Sidebar.tsx
└── app/
    └── (dashboard)/
        ├── layout.tsx
        └── dashboard/
            └── admin/
                ├── roles/
                │   └── page.tsx
                └── users/
                    └── page.tsx
```

## Future Enhancements

1. Permission caching for better performance
2. Permission groups/categories
3. Time-based permissions (temporary access)
4. Resource-level permissions (e.g., only own department)
5. Audit logs for role/permission changes
6. Permission templates for common role patterns
7. Bulk user role assignment
8. Permission inheritance (parent-child roles)

## Support

For issues or questions, check:
1. Server logs: `logs/combined.log`
2. Browser console for frontend errors
3. MongoDB for data inconsistencies
4. JWT token content (use jwt.io)
