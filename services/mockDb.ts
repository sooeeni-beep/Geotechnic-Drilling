
import { User, Company, UserRole, UserStatus, CompanyStatus, License, Module, Project, LICENSE_TIERS, AVAILABLE_MODULES, UserLog, PERMISSIONS, VerificationStatus, Address } from '../types';

const STORAGE_KEYS = {
  USERS: 'geodrill_users',
  COMPANIES: 'geodrill_companies',
  PROJECTS: 'geodrill_projects',
  INIT: 'geodrill_initialized',
  CUSTOM_LICENSES: 'geodrill_custom_licenses'
};

// Initial Creator Credentials
const CREATOR_INIT = {
  username: '0077541308',
  password: 'admin'
};

class MockDatabase {
  constructor() {
    this.init();
    this.loadCustomLicenses();
  }

  private init() {
    if (!localStorage.getItem(STORAGE_KEYS.INIT)) {
      const creator: User = {
        id: 'creator-001',
        username: CREATOR_INIT.username,
        password: CREATOR_INIT.password,
        mobile: CREATOR_INIT.username,
        countryCode: '+98',
        email: 'creator@geodrill.com',
        firstName: 'System',
        lastName: 'Creator',
        fullName: 'System Creator',
        role: UserRole.CREATOR,
        companyId: null,
        status: UserStatus.NEEDS_PASSWORD_CHANGE,
        verificationStatus: VerificationStatus.VERIFIED,
        logs: []
      };
      
      localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify([creator]));
      localStorage.setItem(STORAGE_KEYS.COMPANIES, JSON.stringify([]));
      localStorage.setItem(STORAGE_KEYS.PROJECTS, JSON.stringify([]));
      localStorage.setItem(STORAGE_KEYS.INIT, 'true');
    }
  }

  private loadCustomLicenses() {
    const stored = localStorage.getItem(STORAGE_KEYS.CUSTOM_LICENSES);
    if (stored) {
        const customLicenses = JSON.parse(stored);
        // Update the exported arrays in memory (simulated reference update)
        customLicenses.forEach((cl: License) => {
            const idx = LICENSE_TIERS.findIndex(l => l.id === cl.id);
            if (idx !== -1) LICENSE_TIERS[idx] = cl;
        });
    }
  }

  getUsers(): User[] {
    return JSON.parse(localStorage.getItem(STORAGE_KEYS.USERS) || '[]');
  }
  
  getGlobalUsers(): User[] {
      // Exclude Creator and Company Owners (L1)
      return this.getUsers().filter(u => u.role !== UserRole.CREATOR && u.role !== UserRole.ADMIN_L1);
  }
  
  getUserHistory(userId: string): UserLog[] {
      const user = this.getUsers().find(u => u.id === userId);
      return user ? user.logs : [];
  }

  getPendingNotificationCount(companyId: string): number {
      const users = this.getUsers();
      return users.filter(u => u.companyId === companyId && u.status === UserStatus.PENDING_APPROVAL).length;
  }

  saveUsers(users: User[]) {
    localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));
  }

  getCompanies(): Company[] {
    return JSON.parse(localStorage.getItem(STORAGE_KEYS.COMPANIES) || '[]');
  }

  saveCompanies(companies: Company[]) {
    localStorage.setItem(STORAGE_KEYS.COMPANIES, JSON.stringify(companies));
  }

  getProjects(): Project[] {
    return JSON.parse(localStorage.getItem(STORAGE_KEYS.PROJECTS) || '[]');
  }

  saveProjects(projects: Project[]) {
    localStorage.setItem(STORAGE_KEYS.PROJECTS, JSON.stringify(projects));
  }

  generateId(): string {
    return Math.random().toString(36).substr(2, 9);
  }

  generateCode(length: number = 6): string {
    return Math.random().toString(36).substr(2, length).toUpperCase();
  }

  // Auth
  authenticate(username: string, password: string): User | null {
    const users = this.getUsers();
    // Auth by Username (Mobile)
    const user = users.find(u => u.username === username && u.password === password);
    if (!user) return null;
    
    // We allow PENDING and UNVERIFIED users to be returned here so the UI can redirect them
    if (user.status === UserStatus.BLOCKED) throw new Error("Account Blocked");
    
    return user;
  }

  updateUserPassword(userId: string, newPassword: string): User {
    const users = this.getUsers();
    const idx = users.findIndex(u => u.id === userId);
    if (idx === -1) throw new Error("User not found");
    
    users[idx].password = newPassword;
    if (users[idx].role === UserRole.CREATOR) {
        users[idx].status = UserStatus.ACTIVE;
    }
    this.saveUsers(users);
    return users[idx];
  }
  
  updateCompanyResume(companyId: string, url: string) {
      const companies = this.getCompanies();
      const idx = companies.findIndex(c => c.id === companyId);
      if (idx !== -1) {
          companies[idx].companyResumeUrl = url;
          this.saveCompanies(companies);
      }
      return companies[idx];
  }

  // Registration - Create Company Account
  registerCompany(userData: Partial<User>, companyData: { name: string, industry: 'Geotechnical' | 'Geophysical' | 'Mixed' }): { user: User, company: Company } {
    const users = this.getUsers();
    const fullMobile = (userData.countryCode || '') + (userData.mobile || '');
    if (users.find(u => u.username === fullMobile || u.mobile === userData.mobile)) throw new Error("Mobile number already registered");

    const companies = this.getCompanies();
    
    const companyId = this.generateId();
    const ownerId = this.generateId();

    const newCompany: Company = {
      id: companyId,
      name: companyData.name,
      companyCode: this.generateCode(),
      country: 'Unknown', // Will be updated during verification
      industry: companyData.industry,
      licenseId: null,
      activeModules: [],
      // Auto-activate: No approval needed for L1
      status: CompanyStatus.ACTIVE, 
      expiryDate: null,
      ownerId: ownerId
    };

    const newOwner: User = {
      id: ownerId,
      username: fullMobile, // Login handle
      mobile: userData.mobile || '',
      countryCode: userData.countryCode || '',
      email: userData.email || '',
      firstName: userData.firstName || '',
      lastName: userData.lastName || '',
      fullName: `${userData.firstName} ${userData.lastName}`,
      password: userData.password || '',
      role: UserRole.ADMIN_L1,
      companyId: companyId,
      status: UserStatus.ACTIVE,
      verificationStatus: VerificationStatus.UNVERIFIED, // Needs verification next
      position: 'Company Owner',
      permissions: Object.values(PERMISSIONS),
      logs: [{
          date: new Date().toISOString(),
          action: 'CREATED',
          adminName: 'System',
          description: 'Company Owner account created.'
      }]
    };

    this.saveCompanies([...companies, newCompany]);
    this.saveUsers([...users, newOwner]);

    return { user: newOwner, company: newCompany };
  }

  // Registration - Join Company (Unified)
  joinCompany(userData: Partial<User>, intent: 'OFFICE' | 'FIELD' | 'BOTH' | 'TALENT', code?: string, secondCode?: string): User {
      const companies = this.getCompanies();
      const projects = this.getProjects();
      const users = this.getUsers();
      
      const fullMobile = (userData.countryCode || '') + (userData.mobile || '');
      if (users.find(u => u.username === fullMobile || u.mobile === userData.mobile)) throw new Error("Mobile number already registered");

      let company: Company | undefined;
      let assignedProjectIds: string[] = [];
      let description = `Joined with intent: ${intent}`;

      if (intent === 'TALENT') {
          // Talent doesn't join a company yet
          description = "Registered as Talent";
      } else {
          if (!code) throw new Error("Code required for joining a company");

          if (intent === 'OFFICE') {
              // 'code' is Company Code
              company = companies.find(c => c.companyCode === code);
              if (!company) throw new Error("Invalid Company Code");
          } 
          else if (intent === 'FIELD') {
              // 'code' is Project Code. System must find company.
              const project = projects.find(p => p.projectCode === code);
              if (!project) throw new Error("Invalid Project Code");
              
              company = companies.find(c => c.id === project.companyId);
              if (!company) throw new Error("System Error: Project orphan");
              
              assignedProjectIds.push(project.id);
              description += ` | Requested Project: ${project.name}`;
          }
          else if (intent === 'BOTH') {
              // 'code' is Company Code, 'secondCode' is Project Code
              company = companies.find(c => c.companyCode === code);
              if (!company) throw new Error("Invalid Company Code");
              
              if (secondCode) {
                  const project = projects.find(p => p.projectCode === secondCode && p.companyId === company.id);
                  if (!project) throw new Error("Invalid Project Code for this Company");
                  assignedProjectIds.push(project.id);
                  description += ` | Requested Project: ${project.name}`;
              }
          }
      }

      const newUser: User = {
          id: this.generateId(),
          username: fullMobile,
          mobile: userData.mobile || '',
          countryCode: userData.countryCode || '',
          email: userData.email || '',
          firstName: userData.firstName || '',
          lastName: userData.lastName || '',
          fullName: `${userData.firstName} ${userData.lastName}`,
          password: userData.password || '',
          role: UserRole.USER, // Default safe role
          companyId: company ? company.id : null,
          assignedProjectIds: assignedProjectIds,
          assignedProjectId: assignedProjectIds[0] || null, // legacy
          isAvailableForWork: intent === 'TALENT',
          status: UserStatus.PENDING_APPROVAL,
          verificationStatus: VerificationStatus.UNVERIFIED, // Needs verification
          position: intent === 'TALENT' ? 'Job Seeker' : (intent === 'OFFICE' ? 'Office Staff (Pending)' : 'Field Staff (Pending)'),
          joinIntent: intent,
          logs: [{
            date: new Date().toISOString(),
            action: 'REGISTERED',
            adminName: 'Self',
            description: description
        }]
      };

      this.saveUsers([...users, newUser]);
      return newUser;
  }

  // Verification
  submitIdentityVerification(userId: string, data: { address: Address, nationalId: string, idCardUrl?: string, resumeUrl?: string }) {
      const users = this.getUsers();
      const idx = users.findIndex(u => u.id === userId);
      if (idx === -1) throw new Error("User not found");

      users[idx].address = data.address;
      users[idx].nationalId = data.nationalId;
      users[idx].idCardUrl = data.idCardUrl;
      users[idx].resumeUrl = data.resumeUrl;
      users[idx].verificationStatus = VerificationStatus.PENDING; // Pending Admin Review
      
      // Auto-verify for simulation purposes unless you want an admin step
      // For now, let's auto-verify to proceed with the demo
      users[idx].verificationStatus = VerificationStatus.VERIFIED; 

      users[idx].logs.push({
          date: new Date().toISOString(),
          action: 'IDENTITY_SUBMITTED',
          adminName: 'Self',
          description: 'Identity verification documents submitted.'
      });

      this.saveUsers(users);
      return users[idx];
  }


  // Creator Actions
  getAllCompanies() {
    return this.getCompanies();
  }

  updateLicensePrice(licenseId: string, newPrice: number) {
      const idx = LICENSE_TIERS.findIndex(l => l.id === licenseId);
      if (idx !== -1) {
          LICENSE_TIERS[idx].basePriceMonthly = newPrice;
          localStorage.setItem(STORAGE_KEYS.CUSTOM_LICENSES, JSON.stringify(LICENSE_TIERS));
      }
  }

  calculateRemainingDays(expiryDateStr: string | null): number {
      if (!expiryDateStr) return 0;
      const expiry = new Date(expiryDateStr);
      const now = new Date();
      const diff = expiry.getTime() - now.getTime();
      return Math.max(0, Math.ceil(diff / (1000 * 3600 * 24)));
  }

  approveCompany(adminId: string, companyId: string) {
      const companies = this.getCompanies();
      const users = this.getUsers();
      
      const cIdx = companies.findIndex(c => c.id === companyId);
      if (cIdx === -1) throw new Error("Company not found");

      // Activate Company
      companies[cIdx].status = CompanyStatus.ACTIVE; 
      
      // Activate Owner and log approval
      const ownerIdx = users.findIndex(u => u.id === companies[cIdx].ownerId);
      if (ownerIdx !== -1) {
          users[ownerIdx].status = UserStatus.ACTIVE;
          users[ownerIdx].approvedBy = adminId;
          users[ownerIdx].approvedAt = new Date().toISOString();
      }

      this.saveCompanies(companies);
      this.saveUsers(users);
  }

  rejectCompany(companyId: string) {
      let companies = this.getCompanies();
      let users = this.getUsers();

      const company = companies.find(c => c.id === companyId);
      if (!company) return;

      // Delete Owner
      users = users.filter(u => u.id !== company.ownerId);
      // Delete Company
      companies = companies.filter(c => c.id !== companyId);

      this.saveCompanies(companies);
      this.saveUsers(users);
  }

  toggleBlockUser(userId: string) {
      const users = this.getUsers();
      const idx = users.findIndex(u => u.id === userId);
      if (idx === -1) throw new Error("User not found");

      if (users[idx].status === UserStatus.BLOCKED) {
          users[idx].status = UserStatus.ACTIVE;
      } else {
          users[idx].status = UserStatus.BLOCKED;
      }
      this.saveUsers(users);
  }

  // L1 Actions
  purchaseLicense(companyId: string, licenseId: string, modules: string[]) {
    const companies = this.getCompanies();
    const idx = companies.findIndex(c => c.id === companyId);
    if (idx === -1) return;

    // Simulate payment success
    const now = new Date();
    const expiry = new Date();
    expiry.setMonth(now.getMonth() + 1); // 1 Month sub

    companies[idx].licenseId = licenseId;
    companies[idx].activeModules = modules;
    companies[idx].status = CompanyStatus.ACTIVE;
    companies[idx].expiryDate = expiry.toISOString();

    this.saveCompanies(companies);
  }

  // Create Project
  createProject(companyId: string, name: string, location: string): Project {
    const projects = this.getProjects();
    const newProject: Project = {
        id: this.generateId(),
        name: name,
        companyId: companyId,
        location: location,
        projectCode: this.generateCode(8),
        status: 'ACTIVE'
    };
    this.saveProjects([...projects, newProject]);
    return newProject;
  }

  // Management Actions
  approveUser(adminId: string, targetUserId: string) {
      const users = this.getUsers();
      const admin = users.find(u => u.id === adminId);
      const targetIdx = users.findIndex(u => u.id === targetUserId);

      if (!admin || targetIdx === -1) throw new Error("User or Admin not found");
      
      const targetRole = users[targetIdx].role;
      let canApprove = false;

      // Permission Logic
      if (admin.role === UserRole.CREATOR || admin.role === UserRole.ADMIN_L1) {
          canApprove = true;
      } else if (admin.role === UserRole.ADMIN_L2) {
          if (admin.permissions && admin.permissions.includes(PERMISSIONS.APPROVE_STAFF)) canApprove = true;
      } else if (admin.role === UserRole.USER && admin.position?.toLowerCase().includes('office')) {
          if (targetRole === UserRole.USER) canApprove = true; // Office can approve specialists
      }

      if (!canApprove) throw new Error("Insufficient Permissions to approve this user.");
      
      const now = new Date().toISOString();

      // Log Approval
      if (!users[targetIdx].logs) users[targetIdx].logs = [];
      users[targetIdx].logs.push({
          date: now,
          action: 'APPROVED',
          adminName: admin.fullName,
          description: `User approved as ${users[targetIdx].jobTitle || users[targetIdx].position} by ${admin.fullName}`
      });

      users[targetIdx].status = UserStatus.ACTIVE;
      users[targetIdx].approvedBy = adminId;
      users[targetIdx].approvedAt = now;

      // If approved into a project or is Office, they are employed
      const isOffice = users[targetIdx].joinIntent === 'OFFICE' || users[targetIdx].joinIntent === 'BOTH';
      const hasProjects = users[targetIdx].assignedProjectIds && users[targetIdx].assignedProjectIds!.length > 0;
      
      if (hasProjects || isOffice) {
          users[targetIdx].isAvailableForWork = false;
      }

      this.saveUsers(users);
      return users[targetIdx];
  }

  // Request a Transfer (by Office staff)
  requestUserTransfer(adminId: string, targetUserId: string, targetProjectIds: string[]) {
      const users = this.getUsers();
      const admin = users.find(u => u.id === adminId);
      const targetIdx = users.findIndex(u => u.id === targetUserId);

      if (!admin || targetIdx === -1) throw new Error("User not found");

      const projects = this.getProjects();
      const projNames = targetProjectIds.map(id => projects.find(p => p.id === id)?.name || id).join(', ');

      users[targetIdx].transferRequest = {
          targetProjectIds,
          requestedBy: admin.fullName,
          requestedById: admin.id,
          requestedAt: new Date().toISOString(),
          reason: `Transfer requested to: ${projNames}`
      };

      users[targetIdx].logs.push({
          date: new Date().toISOString(),
          action: 'TRANSFER_REQUESTED',
          adminName: admin.fullName,
          description: `Transfer requested to projects: ${projNames}`
      });

      this.saveUsers(users);
  }

  // Finalize Transfer (Approve/Reject by L1/Deputy)
  resolveTransferRequest(adminId: string, targetUserId: string, approved: boolean) {
      const users = this.getUsers();
      const admin = users.find(u => u.id === adminId);
      const targetIdx = users.findIndex(u => u.id === targetUserId);

      if (!admin || targetIdx === -1) throw new Error("User not found");
      const targetUser = users[targetIdx];

      if (!targetUser.transferRequest) throw new Error("No pending transfer request");

      // Permission Check
      let canResolve = false;
      if (admin.role === UserRole.CREATOR || admin.role === UserRole.ADMIN_L1) canResolve = true;
      if (admin.role === UserRole.ADMIN_L2 && admin.permissions?.includes(PERMISSIONS.APPROVE_TRANSFERS)) canResolve = true;
      
      if (!canResolve) throw new Error("Insufficient Permissions to resolve transfers.");

      const now = new Date().toISOString();
      const projects = this.getProjects();
      const oldProjNames = (targetUser.assignedProjectIds || []).map(id => projects.find(p => p.id === id)?.name).join(', ');

      if (approved) {
          const newProjIds = targetUser.transferRequest.targetProjectIds;
          const newProjNames = newProjIds.map(id => projects.find(p => p.id === id)?.name).join(', ');

          targetUser.assignedProjectIds = newProjIds;
          targetUser.assignedProjectId = newProjIds.length > 0 ? newProjIds[0] : null;
          // Set to busy if assigned
          if (newProjIds.length > 0) targetUser.isAvailableForWork = false;

          targetUser.logs.push({
              date: now,
              action: 'TRANSFER_APPROVED',
              adminName: admin.fullName,
              description: `Transfer Approved. Moved from [${oldProjNames}] to [${newProjNames}]. Requested by ${targetUser.transferRequest.requestedBy}`
          });
      } else {
          targetUser.logs.push({
              date: now,
              action: 'TRANSFER_REJECTED',
              adminName: admin.fullName,
              description: `Transfer Rejected. Remained in [${oldProjNames}]. Request by ${targetUser.transferRequest.requestedBy} denied.`
          });
      }

      targetUser.transferRequest = null; // Clear request
      users[targetIdx] = targetUser;
      this.saveUsers(users);
  }
  
  // Remove User From Project (Release to Pool)
  removeUserFromProject(adminId: string, targetUserId: string, projectId: string) {
      const users = this.getUsers();
      const admin = users.find(u => u.id === adminId);
      const targetIdx = users.findIndex(u => u.id === targetUserId);
      
      if (!admin || targetIdx === -1) throw new Error("User or Admin not found");
      const targetUser = users[targetIdx];
      
      const projects = this.getProjects();
      const projName = projects.find(p => p.id === projectId)?.name || projectId;

      // Remove Project ID
      targetUser.assignedProjectIds = (targetUser.assignedProjectIds || []).filter(id => id !== projectId);
      targetUser.assignedProjectId = targetUser.assignedProjectIds[0] || null;

      // Log
      if (!targetUser.logs) targetUser.logs = [];
      targetUser.logs.push({
          date: new Date().toISOString(),
          action: 'REMOVED_FROM_PROJECT',
          adminName: admin.fullName,
          description: `Removed from project: ${projName}`
      });

      // If no projects left, set as Available (Open to Work)
      if (targetUser.assignedProjectIds.length === 0) {
          targetUser.isAvailableForWork = true;
          targetUser.logs.push({
            date: new Date().toISOString(),
            action: 'STATUS_UPDATE',
            adminName: 'System',
            description: `Auto-set to 'Open to Work' after project removal.`
        });
      }

      users[targetIdx] = targetUser;
      this.saveUsers(users);
  }
  
  // Remove User From Company (Office Staff Block/Remove)
  removeUserFromCompany(adminId: string, targetUserId: string) {
      const users = this.getUsers();
      const admin = users.find(u => u.id === adminId);
      const targetIdx = users.findIndex(u => u.id === targetUserId);
      
      if (!admin || targetIdx === -1) throw new Error("User or Admin not found");
      
      users[targetIdx].status = UserStatus.BLOCKED;
      
      if (!users[targetIdx].logs) users[targetIdx].logs = [];
      users[targetIdx].logs.push({
          date: new Date().toISOString(),
          action: 'REMOVED_FROM_COMPANY',
          adminName: admin.fullName,
          description: `User blocked/removed from company by ${admin.fullName}.`
      });
      
      this.saveUsers(users);
  }
  
  // Toggle "Blue Card" Availability
  toggleUserAvailability(userId: string) {
      const users = this.getUsers();
      const idx = users.findIndex(u => u.id === userId);
      if (idx === -1) return;
      
      const user = users[idx];
      const isEmployed = (user.assignedProjectIds && user.assignedProjectIds.length > 0) || (user.joinIntent === 'OFFICE' && user.companyId);
      
      // Update Status
      users[idx].isAvailableForWork = !users[idx].isAvailableForWork;
      
      // Log Signal if Employed and Turning ON
      if (isEmployed && users[idx].isAvailableForWork) {
           if (!users[idx].logs) users[idx].logs = [];
           users[idx].logs.push({
              date: new Date().toISOString(),
              action: 'AVAILABILITY_SIGNAL',
              adminName: 'Self',
              description: `User signaled 'Open to Work' while employed.`
           });
      }

      this.saveUsers(users);
      return users[idx];
  }

  updateUser(adminId: string, targetUserId: string, updates: Partial<User>) {
    const users = this.getUsers();
    const admin = users.find(u => u.id === adminId);
    const targetIdx = users.findIndex(u => u.id === targetUserId);

    if (!admin || targetIdx === -1) throw new Error("User or Admin not found");
    
    // Only L1, Creator, L2, or Office can edit
    // (Checked at UI layer too, but safety here)
    if (admin.role === UserRole.USER && !admin.position?.toLowerCase().includes('office')) throw new Error("Employees cannot edit other users");
    
    const oldUser = users[targetIdx];
    const newUser = { ...oldUser, ...updates };

    // LOGGING CHANGES
    if (!newUser.logs) newUser.logs = [];
    const now = new Date().toISOString();
    const adminName = admin.fullName;

    // 1. Project Changes
    const oldProjs = (oldUser.assignedProjectIds || []).sort();
    const newProjs = (updates.assignedProjectIds || oldUser.assignedProjectIds || []).sort();
    
    if (JSON.stringify(oldProjs) !== JSON.stringify(newProjs)) {
        const projects = this.getProjects();
        const getNames = (ids: string[]) => ids.map(id => projects.find(p => p.id === id)?.name || id).join(', ');
        
        newUser.logs.push({
            date: now,
            action: 'PROJECT_CHANGE',
            adminName: adminName,
            description: `Projects changed from [${getNames(oldProjs)}] to [${getNames(newProjs)}]`
        });
        
        // Auto Update Availability
        if (newProjs.length > 0) newUser.isAvailableForWork = false;
        else if (newProjs.length === 0 && oldProjs.length > 0) newUser.isAvailableForWork = true;
    }

    // 2. Position Change
    if (updates.position && updates.position !== oldUser.position) {
        newUser.logs.push({
            date: now,
            action: 'POSITION_CHANGE',
            adminName: adminName,
            description: `Position changed from "${oldUser.position}" to "${updates.position}"`
        });
    }

    // 3. Name Change
    if (updates.fullName && updates.fullName !== oldUser.fullName) {
        newUser.logs.push({
            date: now,
            action: 'NAME_CHANGE',
            adminName: adminName,
            description: `Name changed from "${oldUser.fullName}" to "${updates.fullName}"`
        });
    }
    
    // 4. Permissions Change
    if (updates.permissions && JSON.stringify(updates.permissions) !== JSON.stringify(oldUser.permissions)) {
        newUser.logs.push({
            date: now,
            action: 'PERMISSIONS_CHANGE',
            adminName: adminName,
            description: `Permissions updated.`
        });
    }

    users[targetIdx] = newUser;
    this.saveUsers(users);
    return users[targetIdx];
  }

  // Helper
  getUserProjects(user: User): string[] {
      if (user.assignedProjectIds && user.assignedProjectIds.length > 0) return user.assignedProjectIds;
      if (user.assignedProjectId) return [user.assignedProjectId];
      return [];
  }
}

export const db = new MockDatabase();
