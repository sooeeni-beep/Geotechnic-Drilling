
export enum UserRole {
  CREATOR = 'CREATOR', // Level 0
  ADMIN_L1 = 'ADMIN_L1', // Company Owner
  ADMIN_L2 = 'ADMIN_L2', // Deputy / Project Manager
  USER = 'USER' // Employee/Expert/Talent
}

export enum UserStatus {
  ACTIVE = 'ACTIVE',
  PENDING_APPROVAL = 'PENDING_APPROVAL',
  BLOCKED = 'BLOCKED',
  NEEDS_PASSWORD_CHANGE = 'NEEDS_PASSWORD_CHANGE'
}

export enum CompanyStatus {
  ACTIVE = 'ACTIVE',
  PENDING_APPROVAL = 'PENDING_APPROVAL',
  PENDING_PAYMENT = 'PENDING_PAYMENT',
  EXPIRED = 'EXPIRED'
}

export enum VerificationStatus {
  UNVERIFIED = 'UNVERIFIED',
  PENDING = 'PENDING',
  VERIFIED = 'VERIFIED',
  REJECTED = 'REJECTED'
}

export const PERMISSIONS = {
  APPROVE_STAFF: 'APPROVE_STAFF', // Can approve new members
  APPROVE_TRANSFERS: 'APPROVE_TRANSFERS', // Can move people between projects
  MANAGE_FINANCE: 'MANAGE_FINANCE', // Can renew packages/licenses
  CREATE_PROJECT: 'CREATE_PROJECT', // Can define new projects
  EDIT_USERS: 'EDIT_USERS' // Can edit user details
};

export const PROJECT_ROLE_CATEGORIES = {
    'A': 'Project Management Roles',
    'B': 'Technical & Engineering Roles',
    'C': 'Operations & Field Workforce',
    'D': 'HSE & Quality Roles',
    'E': 'Logistics & Support Roles'
};

export const PROJECT_JOB_TITLES: Record<string, string[]> = {
    'A': ['Project Manager', 'Site Manager', 'Field Supervisor', 'Section Supervisor', 'Project Controller'],
    'B': ['Geophysicist', 'Geotechnical Engineer', 'Field Engineer', 'Drilling Engineer', 'Instrumentation Engineer', 'Data Analyst (Geo Data)', 'Survey Engineer', 'Logging Engineer'],
    'C': ['Foreman', 'Senior Supervisor', 'Machine Operator', 'Drilling Operator', 'Field Technician', 'Mechanic', 'Electrician', 'Welder', 'General Worker', 'Technical Worker', 'Driver', 'Equipment Handler'],
    'D': ['HSE Officer', 'HSE Supervisor', 'Safety Inspector', 'Environmental Officer', 'Quality Control Officer'],
    'E': ['Logistics Coordinator', 'Warehouse Officer / Storekeeper', 'Procurement Coordinator', 'Security Lead', 'Camp Manager', 'Maintenance Technician', 'IT Support Technician']
};

export interface Module {
  id: string;
  name: string;
  priceMonthly: number;
  description: string;
}

export interface License {
  id: string;
  name: string;
  basePriceMonthly: number;
  maxUsers: number;
}

export interface Company {
  id: string;
  name: string;
  companyCode: string; // Unique code for employee registration
  country?: string;
  industry?: 'Geotechnical' | 'Geophysical' | 'Mixed';
  licenseId: string | null;
  activeModules: string[];
  status: CompanyStatus;
  expiryDate: string | null;
  ownerId: string;
  companyResumeUrl?: string; // New field for Company CV
}

export interface Project {
  id: string;
  name: string;
  projectCode: string; // Unique code for employee registration
  companyId: string;
  location: string;
  status: 'ACTIVE' | 'COMPLETED' | 'ARCHIVED';
}

export interface UserLog {
  date: string; // ISO String
  action: string; // e.g., 'APPROVED', 'PROJECT_CHANGE', 'EDIT_INFO'
  adminName: string;
  description: string;
}

export interface TransferRequest {
  targetProjectIds: string[];
  requestedBy: string; // Name of requester
  requestedById: string;
  requestedAt: string;
  reason?: string;
}

export interface Address {
    country: string;
    state: string;
    city: string;
    mainStreet: string;
    subStreet?: string;
    alley?: string;
    plate: string;
    floor?: string;
    unit?: string;
    zipCode?: string;
}

export interface UserRating {
    employerName: string;
    rating: number; // 1-5
    comment?: string;
    date: string;
}

export interface User {
  id: string;
  username: string; // This will map to Mobile Number for login
  
  // Contact
  countryCode: string; // e.g. +98
  mobile: string; // Number without code
  email: string;
  
  // Personal
  firstName: string;
  lastName: string;
  fullName: string; // Computed or stored for ease
  
  // Verification Data (Collected later)
  nationalId?: string; // International ID
  address?: Address;
  idCardUrl?: string;
  resumeUrl?: string;
  verificationStatus: VerificationStatus;
  previousRatings?: UserRating[];

  password?: string; // stored only in mock DB
  role: UserRole;
  companyId: string | null;
  status: UserStatus;
  
  permissions?: string[]; // Specific permissions for L2 (e.g. PERMISSIONS.APPROVE_STAFF)
  position?: string; // e.g., "HR Expert", "Drilling Supervisor"
  
  // New Standardized Role Fields
  projectRoleCategory?: string; // 'A', 'B', 'C', 'D', 'E'
  jobTitle?: string; // Specific Title from the list

  joinIntent?: 'OFFICE' | 'FIELD' | 'BOTH' | 'TALENT'; // The user's stated intent during registration

  assignedProjectId?: string | null; // Deprecated: Single project assignment
  assignedProjectIds?: string[]; // Multi-project assignment
  
  isAvailableForWork?: boolean; // "Blue Card" Status (Open to Work)

  transferRequest?: TransferRequest | null; // Pending transfer

  // Approval Log
  approvedBy?: string; // ID of the admin who approved
  approvedAt?: string; // ISO Timestamp
  
  logs: UserLog[];
}

export let AVAILABLE_MODULES: Module[] = [
  { id: 'geo_log', name: 'Geotechnical Logging', priceMonthly: 50, description: 'Field logging and stratification' },
  { id: 'lab_data', name: 'Laboratory Management', priceMonthly: 40, description: 'Soil and rock lab test results' },
  { id: 'geophysics', name: 'Geophysics Data', priceMonthly: 60, description: 'Seismic and electrical resistivity data' },
  { id: 'gis_map', name: 'GIS Mapping', priceMonthly: 30, description: 'Project location visualization' }
];

export let LICENSE_TIERS: License[] = [
  { id: 'basic', name: 'Basic License', basePriceMonthly: 100, maxUsers: 5 },
  { id: 'pro', name: 'Professional License', basePriceMonthly: 250, maxUsers: 20 },
  { id: 'enterprise', name: 'Enterprise License', basePriceMonthly: 500, maxUsers: 100 }
];
