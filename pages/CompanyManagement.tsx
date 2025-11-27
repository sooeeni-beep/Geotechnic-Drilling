
import React, { useState, useEffect } from 'react';
import { db } from '../services/mockDb';
import { User, Company, UserRole, UserStatus, CompanyStatus, LICENSE_TIERS, Project, PERMISSIONS, PROJECT_ROLE_CATEGORIES, PROJECT_JOB_TITLES } from '../types';
import { Card, Button, Input, Badge } from '../components/UI';
import { 
    Users, 
    ArrowLeft, 
    FolderPlus, 
    Menu,
    X,
    CreditCard,
    Edit,
    Briefcase,
    Shield,
    UserCheck,
    Calendar,
    XCircle,
    History,
    ArrowRightLeft,
    ShieldAlert
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface Props {
  currentUser: User;
}

export const CompanyManagement: React.FC<Props> = ({ currentUser }) => {
  const navigate = useNavigate();
  const [company, setCompany] = useState<Company | null>(null);
  const [admins, setAdmins] = useState<User[]>([]);
  const [activeOfficeStaff, setActiveOfficeStaff] = useState<User[]>([]); // New list for active office/admin staff
  const [employees, setEmployees] = useState<User[]>([]);
  const [pendingOfficeUsers, setPendingOfficeUsers] = useState<User[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  
  // Layout State
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [activeView, setActiveView] = useState<'admins' | 'office_staff' | 'projects' | 'subscription'>('admins');
  
  // Forms
  const [newProject, setNewProject] = useState({ name: '', location: '' });
  
  // Edit Users (L2)
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [editForm, setEditForm] = useState({ 
      fullName: '', 
      position: '', 
      assignedProjectIds: [] as string[], 
      password: '',
      permissions: [] as string[]
  });

  // Approval Modal State (Copied from CompanyPanel for consistent powerful approval)
  const [approvingStaff, setApprovingStaff] = useState<User | null>(null);
  const [staffApprovalForm, setStaffApprovalForm] = useState({
      role: UserRole.USER,
      projectRoleCategory: '',
      jobTitle: '',
      permissions: [] as string[],
      assignedProjectIds: [] as string[] // Can optionally assign projects during approval
  });

  // Log Viewer
  const [viewingLogsFor, setViewingLogsFor] = useState<User | null>(null);

  const isL1 = currentUser.role === UserRole.ADMIN_L1 || currentUser.role === UserRole.CREATOR;

  useEffect(() => {
    if (currentUser.companyId) {
        refreshData();
    }
  }, [currentUser, activeView]);

  const refreshData = () => {
    const companies = db.getCompanies();
    const myCompany = companies.find(c => c.id === currentUser.companyId);
    setCompany(myCompany || null);

    const allUsers = db.getUsers();
    
    // 1. Pending Office Staff (Joined via Company Code)
    setPendingOfficeUsers(allUsers.filter(u => 
        u.companyId === currentUser.companyId &&
        u.status === UserStatus.PENDING_APPROVAL &&
        (u.joinIntent === 'OFFICE' || u.joinIntent === 'BOTH' || (!u.assignedProjectIds || u.assignedProjectIds.length === 0))
    ));

    // 2. Active Office Staff & Admins (Users managed here)
    // Includes L1, L2, and Users with "Office" roles OR joined via Company Code without specific project assignment logic dominance
    // We treat anyone with Role ADMIN_L2 OR (Role USER and Intent OFFICE) as managed here.
    setActiveOfficeStaff(allUsers.filter(u => 
        u.companyId === currentUser.companyId &&
        u.status === UserStatus.ACTIVE &&
        (u.role === UserRole.ADMIN_L2 || (u.role === UserRole.USER && (u.joinIntent === 'OFFICE' || u.joinIntent === 'BOTH')))
    ));

    // 3. Admins List (Only L1/Owner for separate view if needed, or merged. Existing code separates L2s into Admins view. Let's keep existing logic for Admins view)
    setAdmins(allUsers.filter(u => 
        u.companyId === currentUser.companyId && 
        u.status === UserStatus.ACTIVE &&
        (u.role === UserRole.ADMIN_L1 || u.role === UserRole.ADMIN_L2)
    ));

    // Employees for Count
    setEmployees(allUsers.filter(u => u.companyId === currentUser.companyId && u.role === UserRole.USER));

    // Projects
    let allProjects = db.getProjects().filter(p => p.companyId === currentUser.companyId);
    if (currentUser.role === UserRole.ADMIN_L2) {
        const myProjects = db.getUserProjects(currentUser);
        if (myProjects.length > 0) {
            allProjects = allProjects.filter(p => myProjects.includes(p.id));
        }
    }
    setProjects(allProjects);
  };

  // --- Handlers ---

  const handleCreateProject = (e: React.FormEvent) => {
      e.preventDefault();
      if (!company) return;
      if (!isL1) {
          alert("Access Denied: Only Company Owners can create projects.");
          return;
      }
      try {
          db.createProject(company.id, newProject.name, newProject.location);
          alert("Project Created Successfully");
          setNewProject({ name: '', location: '' });
          refreshData();
      } catch (err: any) { alert(err.message); }
  };

  // Open Approval Modal
  const openStaffApproval = (user: User) => {
      setApprovingStaff(user);
      // Default to L2 if Intent is Office, otherwise User
      const defaultRole = (user.joinIntent === 'OFFICE' || user.joinIntent === 'BOTH') ? UserRole.ADMIN_L2 : UserRole.USER;
      setStaffApprovalForm({
          role: defaultRole,
          projectRoleCategory: '',
          jobTitle: '',
          permissions: [],
          assignedProjectIds: []
      });
  };

  const submitStaffApproval = () => {
      if (!approvingStaff) return;
      
      try {
          const updates: any = {
              role: staffApprovalForm.role,
              projectRoleCategory: staffApprovalForm.projectRoleCategory,
              jobTitle: staffApprovalForm.jobTitle,
              position: staffApprovalForm.jobTitle || 'Staff',
              permissions: staffApprovalForm.permissions,
              assignedProjectIds: staffApprovalForm.assignedProjectIds,
              assignedProjectId: staffApprovalForm.assignedProjectIds[0] || null
          };
          
          db.updateUser(currentUser.id, approvingStaff.id, updates);
          db.approveUser(currentUser.id, approvingStaff.id);
          setApprovingStaff(null);
          refreshData();
      } catch(e: any) { alert(e.message); }
  };

  const handleRemoveFromCompany = (e: React.MouseEvent, user: User) => {
      e.stopPropagation();
      e.preventDefault();
      if(confirm(`Remove ${user.fullName} from the company? This will block their access.`)) {
          try {
              db.removeUserFromCompany(currentUser.id, user.id);
              refreshData();
          } catch(e: any) { alert(e.message); }
      }
  };

  const openEditModal = (user: User) => {
      setEditingUser(user);
      setEditForm({ 
          fullName: user.fullName, 
          position: user.position || '', 
          assignedProjectIds: db.getUserProjects(user),
          password: '',
          permissions: user.permissions || []
      });
  };

  const saveUserEdit = () => {
      if (!editingUser) return;
      try {
        const updates: any = { 
            fullName: editForm.fullName, 
            position: editForm.position,
            permissions: editForm.permissions
        };
        updates.assignedProjectIds = editForm.assignedProjectIds;
        updates.assignedProjectId = editForm.assignedProjectIds.length > 0 ? editForm.assignedProjectIds[0] : null;

        if (editForm.password && editForm.password.length >= 5) {
            db.updateUserPassword(editingUser.id, editForm.password);
        }

        db.updateUser(currentUser.id, editingUser.id, updates);
        setEditingUser(null);
        refreshData();
      } catch (err: any) { alert(err.message); }
  };

  const handleSubscribe = (licenseId: string) => {
    if (!company) return;
    if (confirm(`Confirm purchase of ${licenseId} license? (Test Mode: Free)`)) {
        db.purchaseLicense(company.id, licenseId, ['geo_log']); 
        alert("License Activated Successfully!");
        refreshData();
    }
  };

  const toggleProject = (projectId: string, currentList: string[], setter: (l: string[]) => void) => {
      if (currentList.includes(projectId)) {
          setter(currentList.filter(id => id !== projectId));
      } else {
          setter([...currentList, projectId]);
      }
  };
  
  const toggleEditProject = (id: string) => {
      toggleProject(id, editForm.assignedProjectIds, (l) => setEditForm({...editForm, assignedProjectIds: l}));
  };
  
  const togglePermission = (perm: string) => {
      const current = editForm.permissions;
      if (current.includes(perm)) {
          setEditForm({...editForm, permissions: current.filter(p => p !== perm)});
      } else {
          setEditForm({...editForm, permissions: [...current, perm]});
      }
  };
  
  const toggleStaffPermission = (perm: string) => {
      const current = staffApprovalForm.permissions;
      if (current.includes(perm)) setStaffApprovalForm({...staffApprovalForm, permissions: current.filter(p => p !== perm)});
      else setStaffApprovalForm({...staffApprovalForm, permissions: [...current, perm]});
  };

  if (!company) return <div className="p-10 text-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div></div>;

  const SidebarItem = ({ id, label, icon: Icon, badge }: { id: 'admins' | 'office_staff' | 'projects' | 'subscription', label: string, icon: any, badge?: number }) => (
    <button 
        onClick={() => { setActiveView(id); setIsSidebarOpen(false); }}
        className={`w-full flex items-center justify-between px-4 py-3 text-sm font-medium transition-colors rounded-lg mb-1
            ${activeView === id ? 'bg-primary text-white shadow-md' : 'text-slate-600 hover:bg-slate-100 hover:text-primary'}
        `}
    >
        <div className="flex items-center gap-3">
            <Icon size={20} />
            {label}
        </div>
        {badge && badge > 0 && <span className="bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">{badge}</span>}
    </button>
  );

  return (
    <div className="flex min-h-screen bg-slate-50">
        {/* Sidebar and Layout remain mostly same... */}
        {isSidebarOpen && (
            <div className="fixed inset-0 bg-black bg-opacity-50 z-20 md:hidden" onClick={() => setIsSidebarOpen(false)}></div>
        )}
        <aside className={`
            fixed md:static inset-y-0 left-0 z-30 w-64 bg-white border-r border-slate-200 transform transition-transform duration-200 ease-in-out flex flex-col h-screen
            ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
        `}>
            <div className="p-6 border-b border-slate-100 flex justify-between items-center flex-shrink-0">
                <div className="overflow-hidden">
                    <h1 className="text-xl font-bold text-primary truncate">Admin Panel</h1>
                    <p className="text-sm font-semibold text-slate-700 mt-1 truncate">{company.name}</p>
                    <p className="text-xs text-slate-500 font-mono mt-0.5">Code: {company.companyCode}</p>
                </div>
                <button className="md:hidden text-slate-500" onClick={() => setIsSidebarOpen(false)}>
                    <X size={24} />
                </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 flex flex-col">
                <div className="text-xs font-semibold text-slate-400 uppercase mb-2 px-4">Management</div>
                <SidebarItem id="admins" label="Admin Management" icon={Users} />
                <SidebarItem id="office_staff" label="Office Staff (Users)" icon={UserCheck} badge={pendingOfficeUsers.length} />
                <SidebarItem id="projects" label="Project Management" icon={Briefcase} />
                {isL1 && <SidebarItem id="subscription" label="Subscription & Licenses" icon={CreditCard} />}
            </div>
            <div className="p-4 border-t border-slate-100 bg-slate-50 mt-auto flex-shrink-0">
                 <button onClick={() => navigate('/portal')} className="w-full flex items-center justify-center text-sm text-slate-600 hover:text-primary mb-2">
                    <ArrowLeft size={14} className="mr-1"/> Back to Portal
                 </button>
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center text-slate-600 font-bold">
                        {currentUser.fullName.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-900 truncate">{currentUser.fullName}</p>
                        <p className="text-xs text-slate-500 truncate">{currentUser.role === UserRole.ADMIN_L1 ? 'Owner' : currentUser.role === UserRole.ADMIN_L2 ? 'Deputy' : 'Staff'}</p>
                    </div>
                </div>
            </div>
        </aside>

        <main className="flex-1 flex flex-col h-screen overflow-hidden">
            <header className="bg-white border-b border-slate-200 h-16 flex items-center px-6 justify-between md:justify-end flex-shrink-0">
                <button className="md:hidden text-slate-600" onClick={() => setIsSidebarOpen(true)}><Menu size={24} /></button>
                <div className="flex items-center gap-4">
                    <Badge color={company.status === CompanyStatus.ACTIVE ? 'bg-green-100 text-green-800' : 'bg-orange-100 text-orange-800'}>{company.status}</Badge>
                </div>
            </header>

            <div className="flex-1 overflow-y-auto p-6">
                
                {/* --- VIEW: ADMIN MANAGEMENT --- */}
                {activeView === 'admins' && (
                    <div className="space-y-6">
                        <h2 className="text-2xl font-bold text-slate-800">Admin Management</h2>
                        <Card title="Admin Directory">
                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-sm text-slate-600">
                                    <thead className="bg-slate-50 text-slate-900 font-semibold border-b">
                                        <tr><th className="p-4">Name</th><th className="p-4">Role</th><th className="p-4">Scope</th><th className="p-4">Actions</th></tr>
                                    </thead>
                                    <tbody>
                                        {admins.map(admin => (
                                            <tr key={admin.id} className="border-b hover:bg-slate-50">
                                                <td className="p-4"><div className="font-medium text-slate-800">{admin.fullName}</div><div className="text-xs text-slate-500">{admin.jobTitle || admin.position}</div></td>
                                                <td className="p-4"><Badge color={admin.role === UserRole.ADMIN_L1 ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'}>{admin.role === UserRole.ADMIN_L1 ? 'Owner' : 'Deputy'}</Badge></td>
                                                <td className="p-4">{db.getUserProjects(admin).length > 0 ? `${db.getUserProjects(admin).length} Projects` : 'Company Wide'}</td>
                                                <td className="p-4 flex gap-2">
                                                    {(isL1 && admin.role === UserRole.ADMIN_L2) && <Button variant="outline" size="sm" onClick={() => openEditModal(admin)}><Edit size={14}/></Button>}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </Card>
                    </div>
                )}

                {/* --- VIEW: OFFICE STAFF (Users) --- */}
                {activeView === 'office_staff' && (
                    <div className="space-y-6">
                        <h2 className="text-2xl font-bold text-slate-800">Office & General Staff</h2>
                        
                        {/* Pending Table */}
                        {pendingOfficeUsers.length > 0 && (
                             <Card title="Pending Approvals" className="bg-orange-50 border-orange-200 mb-6">
                                <table className="w-full text-left text-sm text-slate-600">
                                    <thead className="text-slate-900 border-b border-orange-200">
                                        <tr><th className="p-4">Name</th><th className="p-4">Intent</th><th className="p-4">Action</th></tr>
                                    </thead>
                                    <tbody>
                                        {pendingOfficeUsers.map(u => (
                                            <tr key={u.id} className="hover:bg-orange-100">
                                                <td className="p-4 font-bold">{u.fullName}<div className="text-xs font-normal">{u.username}</div></td>
                                                <td className="p-4">{u.joinIntent}</td>
                                                <td className="p-4"><Button size="sm" onClick={() => openStaffApproval(u)}>Review & Approve</Button></td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </Card>
                        )}
                        
                        {/* Active Table */}
                        <Card title="Active Office Staff">
                             <div className="overflow-x-auto">
                                <table className="w-full text-left text-sm text-slate-600">
                                    <thead className="bg-slate-50 text-slate-900 font-semibold border-b">
                                        <tr><th className="p-4">Name</th><th className="p-4">Role/Title</th><th className="p-4">Status</th><th className="p-4">Actions</th></tr>
                                    </thead>
                                    <tbody>
                                        {activeOfficeStaff.map(u => (
                                            <tr key={u.id} className="border-b hover:bg-slate-50">
                                                <td className="p-4"><div className="font-bold">{u.fullName}</div></td>
                                                <td className="p-4"><div className="font-bold text-xs text-slate-600">{u.role}</div><div>{u.jobTitle || u.position}</div></td>
                                                <td className="p-4"><Badge color="bg-green-100 text-green-800">Active</Badge></td>
                                                <td className="p-4 flex gap-2">
                                                     <Button size="sm" variant="outline" onClick={() => openEditModal(u)} title="Edit"><Edit size={14}/></Button>
                                                     <Button size="sm" variant="outline" onClick={() => setViewingLogsFor(u)} title="Logs"><History size={14}/></Button>
                                                     <Button size="sm" variant="danger" onClick={(e) => handleRemoveFromCompany(e, u)} title="Remove"><XCircle size={14}/></Button>
                                                </td>
                                            </tr>
                                        ))}
                                        {activeOfficeStaff.length === 0 && <tr><td colSpan={4} className="p-6 text-center text-slate-400">No active office staff found.</td></tr>}
                                    </tbody>
                                </table>
                            </div>
                        </Card>
                    </div>
                )}

                {/* --- VIEW: SUBSCRIPTION (L1 Only) --- */}
                {activeView === 'subscription' && isL1 && (
                     <div className="space-y-6">
                        <h2 className="text-2xl font-bold text-slate-800">Subscription & Licenses</h2>
                        <Card title="Available Plans">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                {LICENSE_TIERS.map(tier => (
                                    <div key={tier.id} className={`border rounded-lg p-6 relative flex flex-col ${company.licenseId === tier.id ? 'border-primary ring-2 ring-primary bg-slate-50' : 'border-slate-200 bg-white'}`}>
                                        {company.licenseId === tier.id && <span className="absolute top-0 right-0 bg-primary text-white text-xs px-2 py-1 rounded-bl-lg font-bold">CURRENT</span>}
                                        <h3 className="font-bold text-lg text-slate-800">{tier.name}</h3>
                                        <p className="text-3xl font-bold mt-4 text-slate-900">${tier.basePriceMonthly}<span className="text-sm font-normal text-slate-500">/mo</span></p>
                                        <div className="mt-4 text-sm text-slate-500 mb-6">Up to {tier.maxUsers} Users</div>
                                        <div className="mt-auto">
                                            <Button size="md" className="w-full" onClick={() => handleSubscribe(tier.id)} disabled={company.licenseId === tier.id} variant={company.licenseId === tier.id ? 'outline' : 'primary'}>{company.licenseId === tier.id ? 'Plan Active' : 'Upgrade Plan'}</Button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </Card>
                        <Card title="Financial History">
                            <table className="w-full text-sm text-left text-slate-600">
                                <thead className="bg-slate-50 font-bold border-b"><tr><th className="p-3">Date</th><th className="p-3">Description</th><th className="p-3">Amount</th></tr></thead>
                                <tbody>
                                    <tr className="border-b"><td className="p-3">2023-10-01</td><td className="p-3">License Renewal (Basic)</td><td className="p-3">$100</td></tr>
                                </tbody>
                            </table>
                        </Card>
                    </div>
                )}

                {/* --- VIEW: PROJECT MANAGEMENT --- */}
                {activeView === 'projects' && (
                    <div className="space-y-6">
                        <h2 className="text-2xl font-bold text-slate-800">Project Management</h2>
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                            <div className="lg:col-span-2">
                                <Card title="Defined Projects">
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-left text-sm text-slate-600">
                                            <thead className="bg-slate-50 text-slate-900 font-semibold border-b"><tr><th className="p-4">Project Name</th><th className="p-4">Code</th><th className="p-4">Location</th><th className="p-4">Staff</th></tr></thead>
                                            <tbody>
                                                {projects.map(p => {
                                                    const staffCount = employees.filter(e => db.getUserProjects(e).includes(p.id)).length;
                                                    return (
                                                    <tr key={p.id} className="border-b hover:bg-slate-50">
                                                        <td className="p-4 font-medium text-slate-800">{p.name}</td>
                                                        <td className="p-4 font-mono text-xs">{p.projectCode}</td>
                                                        <td className="p-4 text-xs">{p.location}</td>
                                                        <td className="p-4"><Badge>{staffCount}</Badge></td>
                                                    </tr>
                                                )})}
                                                {projects.length === 0 && <tr><td colSpan={4} className="p-6 text-center text-slate-400">No projects found.</td></tr>}
                                            </tbody>
                                        </table>
                                    </div>
                                </Card>
                            </div>
                            <div className="lg:col-span-1">
                                {isL1 ? (
                                    <Card title="Create New Project">
                                        <form onSubmit={handleCreateProject} className="space-y-4">
                                            <Input label="Project Name" value={newProject.name} onChange={e => setNewProject({...newProject, name: e.target.value})} required placeholder="e.g. Metro Line A" />
                                            <Input label="Location" value={newProject.location} onChange={e => setNewProject({...newProject, location: e.target.value})} required placeholder="City, Region" />
                                            <div className="p-3 bg-blue-50 text-blue-800 text-xs rounded">A unique Project Code will be generated automatically.</div>
                                            <Button type="submit" className="w-full"><FolderPlus className="mr-2 h-4 w-4"/> Create</Button>
                                        </form>
                                    </Card>
                                ) : <div className="text-center text-slate-400 text-sm mt-4">Only Company Owners (L1) can create new projects.</div>}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </main>

        {/* --- APPROVAL MODAL (For Office Staff) --- */}
        {approvingStaff && (
             <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                <div className="bg-white rounded-xl w-full max-w-2xl p-6 shadow-2xl overflow-y-auto max-h-[90vh]">
                    <h3 className="text-xl font-bold mb-4">Review Office Staff</h3>
                    <div className="mb-4 p-3 bg-blue-50 border border-blue-100 rounded text-sm text-blue-800">
                        <p><b>Applicant:</b> {approvingStaff.fullName}</p>
                        <p><b>Intent:</b> {approvingStaff.joinIntent}</p>
                    </div>
                    
                    <div className="space-y-6">
                        {/* Role Selection */}
                        <div>
                            <label className="block text-sm font-bold mb-2">Assign System Role</label>
                            <div className="grid grid-cols-2 gap-4">
                                <label className={`flex items-start gap-2 cursor-pointer border p-3 rounded hover:bg-slate-50 ${staffApprovalForm.role === UserRole.ADMIN_L2 ? 'border-primary bg-slate-50' : ''}`}>
                                    <input type="radio" className="mt-1" checked={staffApprovalForm.role === UserRole.ADMIN_L2} onChange={() => setStaffApprovalForm({...staffApprovalForm, role: UserRole.ADMIN_L2})} />
                                    <div>
                                        <span className="font-bold block text-sm">Deputy</span>
                                        <span className="text-xs text-slate-500">Can manage projects/staff.</span>
                                    </div>
                                </label>
                                <label className={`flex items-start gap-2 cursor-pointer border p-3 rounded hover:bg-slate-50 ${staffApprovalForm.role === UserRole.USER ? 'border-primary bg-slate-50' : ''}`}>
                                    <input type="radio" className="mt-1" checked={staffApprovalForm.role === UserRole.USER} onChange={() => setStaffApprovalForm({...staffApprovalForm, role: UserRole.USER})} />
                                    <div>
                                        <span className="font-bold block text-sm">Staff</span>
                                        <span className="text-xs text-slate-500">General employee access.</span>
                                    </div>
                                </label>
                            </div>
                        </div>
                        
                        {/* Admin Permissions */}
                        {staffApprovalForm.role === UserRole.ADMIN_L2 && (
                            <div className="bg-purple-50 p-4 rounded border border-purple-100">
                                <label className="block text-sm font-bold mb-2 text-purple-900 flex items-center gap-2"><ShieldAlert size={16}/> Deputy Permissions</label>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                    <label className="flex items-center gap-2 text-sm cursor-pointer"><input type="checkbox" checked={staffApprovalForm.permissions.includes(PERMISSIONS.CREATE_PROJECT)} onChange={() => toggleStaffPermission(PERMISSIONS.CREATE_PROJECT)} /> Create Projects</label>
                                    <label className="flex items-center gap-2 text-sm cursor-pointer"><input type="checkbox" checked={staffApprovalForm.permissions.includes(PERMISSIONS.MANAGE_FINANCE)} onChange={() => toggleStaffPermission(PERMISSIONS.MANAGE_FINANCE)} /> Renew Packages</label>
                                    <label className="flex items-center gap-2 text-sm cursor-pointer"><input type="checkbox" checked={staffApprovalForm.permissions.includes(PERMISSIONS.APPROVE_STAFF)} onChange={() => toggleStaffPermission(PERMISSIONS.APPROVE_STAFF)} /> Approve Members</label>
                                    <label className="flex items-center gap-2 text-sm cursor-pointer"><input type="checkbox" checked={staffApprovalForm.permissions.includes(PERMISSIONS.APPROVE_TRANSFERS)} onChange={() => toggleStaffPermission(PERMISSIONS.APPROVE_TRANSFERS)} /> Manage Transfers</label>
                                </div>
                            </div>
                        )}

                        {/* Job Title */}
                        <div>
                             <label className="block text-sm font-bold mb-2">Job Title & Category</label>
                             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                 <div>
                                     <span className="text-xs text-slate-500 mb-1 block">Role Category</span>
                                     <select className="w-full p-2 border rounded text-sm" value={staffApprovalForm.projectRoleCategory} onChange={(e) => setStaffApprovalForm({...staffApprovalForm, projectRoleCategory: e.target.value, jobTitle: ''})}>
                                         <option value="">-- Select Category --</option>
                                         {Object.entries(PROJECT_ROLE_CATEGORIES).map(([key, val]) => <option key={key} value={key}>{val}</option>)}
                                     </select>
                                 </div>
                                 <div>
                                     <span className="text-xs text-slate-500 mb-1 block">Job Title</span>
                                     <select className="w-full p-2 border rounded text-sm" value={staffApprovalForm.jobTitle} onChange={(e) => setStaffApprovalForm({...staffApprovalForm, jobTitle: e.target.value})} disabled={!staffApprovalForm.projectRoleCategory}>
                                         <option value="">-- Select Title --</option>
                                         {staffApprovalForm.projectRoleCategory && PROJECT_JOB_TITLES[staffApprovalForm.projectRoleCategory]?.map(title => <option key={title} value={title}>{title}</option>)}
                                     </select>
                                 </div>
                             </div>
                        </div>
                    </div>
                    <div className="flex gap-2 mt-6 justify-end pt-4 border-t">
                        <Button variant="outline" onClick={() => setApprovingStaff(null)}>Cancel</Button>
                        <Button onClick={submitStaffApproval}>Approve & Onboard</Button>
                    </div>
                </div>
             </div>
        )}

        {/* Edit Modal */}
        {editingUser && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                <div className="bg-white rounded-xl w-full max-w-md p-6 shadow-2xl">
                    <h3 className="text-xl font-bold mb-4">Edit {editingUser.fullName}</h3>
                    <div className="space-y-4">
                        <Input label="Full Name" value={editForm.fullName} onChange={e => setEditForm({...editForm, fullName: e.target.value})} />
                        <Input label="Position" value={editForm.position} onChange={e => setEditForm({...editForm, position: e.target.value})} />
                        
                        {/* Permissions Editor for Deputies */}
                        {editingUser.role === UserRole.ADMIN_L2 && (
                            <div className="pt-2 border-t border-slate-100">
                                <label className="block text-sm font-medium mb-2 text-purple-900">Deputy Permissions</label>
                                <div className="grid grid-cols-1 gap-2 bg-purple-50 p-3 rounded border border-purple-100">
                                    <label className="flex items-center gap-2 text-sm cursor-pointer">
                                        <input 
                                            type="checkbox" 
                                            checked={editForm.permissions.includes(PERMISSIONS.CREATE_PROJECT)} 
                                            onChange={() => togglePermission(PERMISSIONS.CREATE_PROJECT)} 
                                        /> 
                                        Create Projects
                                    </label>
                                    <label className="flex items-center gap-2 text-sm cursor-pointer">
                                        <input 
                                            type="checkbox" 
                                            checked={editForm.permissions.includes(PERMISSIONS.MANAGE_FINANCE)} 
                                            onChange={() => togglePermission(PERMISSIONS.MANAGE_FINANCE)} 
                                        /> 
                                        Renew Packages
                                    </label>
                                    <label className="flex items-center gap-2 text-sm cursor-pointer">
                                        <input 
                                            type="checkbox" 
                                            checked={editForm.permissions.includes(PERMISSIONS.APPROVE_STAFF)} 
                                            onChange={() => togglePermission(PERMISSIONS.APPROVE_STAFF)} 
                                        /> 
                                        Approve Members
                                    </label>
                                    <label className="flex items-center gap-2 text-sm cursor-pointer">
                                        <input 
                                            type="checkbox" 
                                            checked={editForm.permissions.includes(PERMISSIONS.APPROVE_TRANSFERS)} 
                                            onChange={() => togglePermission(PERMISSIONS.APPROVE_TRANSFERS)} 
                                        /> 
                                        Manage Transfers
                                    </label>
                                </div>
                            </div>
                        )}

                        <div className="pt-2 border-t border-slate-100">
                             <label className="block text-sm font-medium mb-2">Assigned Projects</label>
                             <div className="max-h-32 overflow-y-auto border rounded bg-slate-50 p-2 text-sm">
                                 {projects.map(p => (
                                     <label key={p.id} className="flex items-center gap-2 p-1 cursor-pointer hover:bg-white">
                                         <input 
                                            type="checkbox" 
                                            checked={editForm.assignedProjectIds.includes(p.id)} 
                                            onChange={() => toggleEditProject(p.id)}
                                         />
                                         {p.name}
                                     </label>
                                 ))}
                             </div>
                        </div>

                        <div className="pt-2 border-t border-slate-100">
                             <Input label="New Password (Optional)" type="password" placeholder="Leave blank to keep current" value={editForm.password} onChange={e => setEditForm({...editForm, password: e.target.value})} />
                        </div>
                    </div>
                    <div className="flex gap-2 mt-6 justify-end">
                        <Button variant="outline" onClick={() => setEditingUser(null)}>Cancel</Button>
                        <Button onClick={saveUserEdit}>Save Changes</Button>
                    </div>
                </div>
            </div>
        )}

        {/* Log Viewer */}
        {viewingLogsFor && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                <div className="bg-white rounded-xl w-full max-w-lg p-6 shadow-2xl max-h-[80vh] flex flex-col">
                    <div className="flex justify-between items-center mb-4 pb-2 border-b">
                        <div><h3 className="text-xl font-bold text-slate-800">History Log</h3><p className="text-sm text-slate-500">{viewingLogsFor.fullName}</p></div>
                        <button onClick={() => setViewingLogsFor(null)} className="text-slate-400 hover:text-slate-600"><X size={24}/></button>
                    </div>
                    <div className="flex-1 overflow-y-auto space-y-4 pr-2">
                        {viewingLogsFor.logs && viewingLogsFor.logs.length > 0 ? viewingLogsFor.logs.slice().reverse().map((log, idx) => (
                            <div key={idx} className="bg-slate-50 rounded-lg p-3 border border-slate-100"><div className="flex justify-between items-start mb-1"><span className="text-xs font-bold text-slate-700 px-2 py-0.5 bg-white border rounded">{log.action}</span><span className="text-xs text-slate-400 flex items-center"><Calendar size={10} className="mr-1"/>{new Date(log.date).toLocaleString()}</span></div><p className="text-sm text-slate-700 mt-1">{log.description}</p><p className="text-xs text-slate-400 mt-2">By: {log.adminName}</p></div>
                        )) : <div className="text-center text-slate-400 py-10">No history available.</div>}
                    </div>
                    <div className="mt-4 pt-2 border-t flex justify-end"><Button variant="outline" onClick={() => setViewingLogsFor(null)}>Close</Button></div>
                </div>
            </div>
        )}

    </div>
  );
};
