import Permission from '../models/Permission.model';
import Role from '../models/Role.model';
import { logger } from '../config/logger';

// Define all permissions
const permissions = [
  // Dashboard
  { key: 'view_dashboard', module: 'dashboard', action: 'view', description: 'View dashboard' },

  // Employees
  { key: 'view_employees', module: 'employees', action: 'view', description: 'View employees list' },
  { key: 'create_employees', module: 'employees', action: 'create', description: 'Create new employee' },
  { key: 'update_employees', module: 'employees', action: 'update', description: 'Update employee information' },
  { key: 'delete_employees', module: 'employees', action: 'delete', description: 'Delete employee' },
  { key: 'manage_employees', module: 'employees', action: 'manage', description: 'Full employee management' },

  // Recruitment
  { key: 'view_recruitment', module: 'recruitment', action: 'view', description: 'View job postings and applicants' },
  { key: 'create_recruitment', module: 'recruitment', action: 'create', description: 'Create job postings' },
  { key: 'update_recruitment', module: 'recruitment', action: 'update', description: 'Update job postings and applicant status' },
  { key: 'delete_recruitment', module: 'recruitment', action: 'delete', description: 'Delete job postings' },
  { key: 'manage_recruitment', module: 'recruitment', action: 'manage', description: 'Full recruitment management' },

  // Leaves
  { key: 'request_leave', module: 'leaves', action: 'create', description: 'Request leave' },
  { key: 'view_leaves', module: 'leaves', action: 'view', description: 'View leave requests' },
  { key: 'update_leaves', module: 'leaves', action: 'update', description: 'Update leave requests' },
  { key: 'approve_leaves', module: 'leaves', action: 'approve', description: 'Approve leave requests' },
  { key: 'reject_leaves', module: 'leaves', action: 'reject', description: 'Reject leave requests' },
  { key: 'delete_leaves', module: 'leaves', action: 'delete', description: 'Delete leave requests' },

  // Attendance
  { key: 'view_attendance', module: 'attendance', action: 'view', description: 'View attendance records' },
  { key: 'create_attendance', module: 'attendance', action: 'create', description: 'Record attendance' },
  { key: 'update_attendance', module: 'attendance', action: 'update', description: 'Update attendance records' },
  { key: 'manage_attendance', module: 'attendance', action: 'manage', description: 'Full attendance management' },

  // Payroll
  { key: 'view_payroll', module: 'payroll', action: 'view', description: 'View payroll information' },
  { key: 'create_payroll', module: 'payroll', action: 'create', description: 'Generate payroll' },
  { key: 'update_payroll', module: 'payroll', action: 'update', description: 'Update payroll records' },
  { key: 'approve_payroll', module: 'payroll', action: 'approve', description: 'Approve payroll' },
  { key: 'run_payroll', module: 'payroll', action: 'run', description: 'Process payroll payments' },
  { key: 'manage_payroll', module: 'payroll', action: 'manage', description: 'Full payroll management' },

  // Performance
  { key: 'view_performance', module: 'performance', action: 'view', description: 'View performance reviews' },
  { key: 'create_performance', module: 'performance', action: 'create', description: 'Create performance reviews' },
  { key: 'update_performance', module: 'performance', action: 'update', description: 'Update performance reviews' },
  { key: 'delete_performance', module: 'performance', action: 'delete', description: 'Delete performance reviews' },
  { key: 'manage_performance', module: 'performance', action: 'manage', description: 'Full performance management' },

  // Interns
  { key: 'track_own_time', module: 'interns', action: 'create', description: 'Track own time entries' },
  { key: 'view_interns', module: 'interns', action: 'view', description: 'View intern time tracking' },
  { key: 'comment_intern_diary', module: 'interns', action: 'comment', description: 'Comment on intern diaries' },
  { key: 'manage_interns', module: 'interns', action: 'manage', description: 'Full intern management' },

  // Admin
  { key: 'manage_roles', module: 'admin', action: 'manage', description: 'Manage roles and permissions' },
  { key: 'manage_users', module: 'admin', action: 'manage', description: 'Manage user accounts' },
  { key: 'manage_permissions', module: 'admin', action: 'manage', description: 'Manage permissions' },
  { key: 'view_admin', module: 'admin', action: 'view', description: 'View admin panel' },
];

// Define default roles
const defaultRoles = [
  {
    name: 'Super Admin',
    description: 'Full system access with all permissions',
    isSystem: true,
    permissionKeys: permissions.map(p => p.key),
  },
  {
    name: 'HR Admin',
    description: 'Full HR management capabilities',
    isSystem: true,
    permissionKeys: [
      'view_dashboard',
      'manage_employees',
      'view_employees',
      'create_employees',
      'update_employees',
      'delete_employees',
      'manage_recruitment',
      'view_recruitment',
      'create_recruitment',
      'update_recruitment',
      'delete_recruitment',
      'view_leaves',
      'approve_leaves',
      'reject_leaves',
      'manage_attendance',
      'view_attendance',
      'create_attendance',
      'update_attendance',
      'manage_payroll',
      'view_payroll',
      'create_payroll',
      'update_payroll',
      'approve_payroll',
      'run_payroll',
      'manage_performance',
      'view_performance',
      'create_performance',
      'update_performance',
      'delete_performance',
      'view_interns',
      'manage_interns',
      'track_own_time',
    ],
  },
  {
    name: 'Manager',
    description: 'Department manager with approval rights',
    isSystem: true,
    permissionKeys: [
      'view_dashboard',
      'view_employees',
      'update_employees',
      'view_recruitment',
      'view_leaves',
      'approve_leaves',
      'reject_leaves',
      'view_attendance',
      'update_attendance',
      'view_payroll',
      'view_performance',
      'create_performance',
      'update_performance',
      'view_interns',
      'comment_intern_diary',
      'track_own_time',
    ],
  },
  {
    name: 'Employee',
    description: 'Regular employee access',
    isSystem: true,
    permissionKeys: [
      'view_dashboard',
      'request_leave',
      'view_leaves',
      'create_attendance',
      'view_attendance',
      'view_performance',
      'track_own_time',
    ],
  },
  {
    name: 'Intern',
    description: 'Intern with time tracking access',
    isSystem: true,
    permissionKeys: [
      'view_dashboard',
      'track_own_time',
      'request_leave',
      'view_leaves',
      'create_attendance',
      'view_attendance',
    ],
  },
  {
    name: 'CEO',
    description: 'CEO with view and approval rights',
    isSystem: true,
    permissionKeys: [
      'view_dashboard',
      'view_employees',
      'view_recruitment',
      'view_leaves',
      'approve_leaves',
      'view_attendance',
      'view_payroll',
      'approve_payroll',
      'view_performance',
      'view_interns',
      'track_own_time',
      'comment_intern_diary',
    ],
  },
  {
    name: 'Intern Mentor',
    description: 'Mentor for interns',
    isSystem: true,
    permissionKeys: [
      'view_dashboard',
      'view_interns',
      'comment_intern_diary',
      'track_own_time',
      'view_performance',
    ],
  },
];

export const seedPermissionsAndRoles = async () => {
  try {
    logger.info('🌱 Starting permissions and roles seeding...');

    // Seed permissions
    const existingPermissions = await Permission.countDocuments();
    if (existingPermissions === 0) {
      await Permission.insertMany(permissions);
      logger.info(`✅ Seeded ${permissions.length} permissions`);
    } else {
      logger.info(`ℹ️  Permissions already exist (${existingPermissions} found)`);
    }

    // Seed roles
    const existingRoles = await Role.countDocuments();
    if (existingRoles === 0) {
      await Role.insertMany(defaultRoles);
      logger.info(`✅ Seeded ${defaultRoles.length} default roles`);
    } else {
      logger.info(`ℹ️  Roles already exist (${existingRoles} found)`);
    }

    logger.info('🎉 Permissions and roles seeding completed');
  } catch (error: any) {
    logger.error('❌ Error seeding permissions and roles:', error);
    throw error;
  }
};
