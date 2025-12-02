// User & Auth Types
export type UserRole = 'admin' | 'ceo' | 'manager' | 'employee' | 'intern';

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  employeeId?: string;
}

export interface AuthResponse {
  token: string;
  user: User;
}

// Employee Types
export interface Employee {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  department: string;
  position: string;
  salary: number;
  joinDate: Date;
  status: 'active' | 'inactive' | 'on-leave';
  role: UserRole;
  avatar?: string;
}

// Leave Types
export type LeaveType = 'sick' | 'casual' | 'annual' | 'unpaid';
export type LeaveStatus = 'pending' | 'approved' | 'rejected';

export interface Leave {
  id: string;
  employeeId: string;
  employee?: Employee;
  type: LeaveType;
  startDate: Date;
  endDate: Date;
  reason: string;
  status: LeaveStatus;
  approvedBy?: string;
  approvedDate?: Date;
  createdAt: Date;
}

// Attendance Types
export interface Attendance {
  id: string;
  employeeId: string;
  employee?: Employee;
  date: Date;
  checkIn: Date;
  checkOut?: Date;
  totalHours?: number;
  status: 'present' | 'absent' | 'half-day' | 'late';
}

// Payroll Types
export interface Payroll {
  id: string;
  employeeId: string;
  employee?: Employee;
  month: string;
  baseSalary: number;
  deductions: number;
  bonuses: number;
  netSalary: number;
  status: 'draft' | 'processed' | 'paid';
  generatedDate: Date;
  paidDate?: Date;
}

// Performance Types
export interface Performance {
  id: string;
  employeeId: string;
  employee?: Employee;
  reviewerId: string;
  reviewer?: Employee;
  period: string;
  goals: string[];
  achievements: string[];
  rating: number;
  comments: string;
  createdAt: Date;
}

// Recruitment Types
export type JobStatus = 'open' | 'closed' | 'on-hold';
export type ApplicationStatus = 'applied' | 'screening' | 'interview' | 'offered' | 'rejected' | 'hired';

export interface JobPosting {
  id: string;
  title: string;
  description: string;
  requirements: string[];
  department: string;
  location: string;
  salary: {
    min: number;
    max: number;
  };
  status: JobStatus;
  postedDate: Date;
  closingDate?: Date;
}

export interface Applicant {
  id: string;
  jobId: string;
  job?: JobPosting;
  name: string;
  email: string;
  phone: string;
  resumeUrl: string;
  coverLetter?: string;
  status: ApplicationStatus;
  appliedDate: Date;
  notes?: string;
}

// Intern Time Tracking Types
export interface InternTask {
  date: Date;
  description: string;
  hours: number;
}

export interface InternTimeTracking {
  id: string;
  internId: string;
  intern?: Employee;
  weekStartDate: Date;
  weekEndDate: Date;
  totalHours: number;
  tasks: InternTask[];
  ceoComments?: string;
  diaryGenerated: boolean;
  diaryUrl?: string;
  createdAt: Date;
  updatedAt: Date;
}

// API Response Types
export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ApiError {
  message: string;
  errors?: Record<string, string[]>;
}
