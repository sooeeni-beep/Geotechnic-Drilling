

import React, { useState, useEffect } from 'react';
import { db } from '../services/mockDb';
import { User, Company, UserRole, UserStatus, CompanyStatus, Project, PERMISSIONS, PROJECT_ROLE_CATEGORIES, PROJECT_JOB_TITLES } from '../types';
import { Card, Button, Badge, Input } from '../components/UI';
import { 
    LayoutDashboard, 
    Menu, 
    X, 
    ClipboardList, 
    Map, 
    CheckSquare, 
    Package, 
    ArrowLeft,
    Users,
    CheckCircle,
    Edit,
    History,
    Calendar,
    ArrowRightLeft,
    ShieldAlert,
    XCircle,
    ChevronRight,
    Briefcase
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface Props {
  currentUser: User;
  selectedProjectId?: string | null;
}

type MenuId = 'dashboard' | 'users' | 'drilling_entry' | 'drilling_points' | 'checkman' | 'inventory';

export const CompanyPanel: React.FC<Props> = ({ currentUser, selectedProjectId }) => {
  const navigate = useNavigate();
  const [company, setCompany] = useState<Company | null>(null);
  const [project, setProject] = useState<Project | null>(null);
  
  // Lists
  const [employees, setEmployees] = useState<User[]>([]); // Active Employees
  const [pendingUsers, setPendingUsers] = useState<User[]>([]); // Consolidated Pending List
  
  const [admins, setAdmins] = useState<User[]>([]); // For name resolution
  const [allProjects, setAllProjects] = useState<Project[]>([]);
  
  // Layout State
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [activeView, setActiveView] = useState<MenuId>('dashboard');

  // Edit States
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [editForm, setEditForm] = useState({ fullName: '', position: '', username: '' });

  // Log Viewer State
  const [viewingLogsFor, setViewingLogsFor] = useState<User | null>(null);

  // Transfer Request Modal (Office)
  const [transferRequestUser, setTransferRequestUser] = useState<User | null>(null);
  
  // Direct Transfer Modal (Admin)
  const [directTransferUser, setDirectTransferUser] = useState<User | null>(null);
  
  // Shared Transfer Targets State
  const [transferTargets, setTransferTargets] = useState<string[]>([]);

  // Staff Approval Modal (Review New Member)
  const [approvingStaff, setApprovingStaff] = useState<User | null>(null);
  const [staffApprovalForm, setStaffApprovalForm] = useState({
      role: UserRole.USER,
      projectRoleCategory: '',
      jobTitle: '',
      permissions: [] as string[],
      assignedProjectIds: [] as string[]
  });

  // Drilling Data Form
  const [drillingForm, setDrillingForm] = useState({
    swath: '',
    pointCode: '',
    pointType: 'New Point', // 'New Point' | 'Re-drill'
    groupType: 'Company', // 'Company' | 'Contractor'
    groupName: '',
    contractorName: '',
    supervisor: '',
    foreman: '',
    mechanic: '',
    holeType: 'Single', // 'Single' | 'Pattern'
    depth1: '',
    depth2: '',
    date: new Date().toISOString().split('T')[0],
    comments: ''
  });

  useEffect(() => {
    if (currentUser.companyId) {
        refreshData();
    }
  }, [currentUser, selectedProjectId, activeView]);

  const refreshData = () => {
    const companies = db.getCompanies();
    const myCompany = companies.find(c => c.id === currentUser.companyId);
    setCompany(myCompany || null);

    const projs = db.getProjects();
    setAllProjects(projs.filter(p => p.companyId === currentUser.companyId));
    
    if (selectedProjectId) {
        setProject(projs.find(p => p.id === selectedProjectId) || null);
    }

    const allUsers = db.getUsers();
    setAdmins(allUsers.filter(u => u.companyId === currentUser.companyId && u.role !== UserRole.USER));

    // Get Pending Users
    let pUsers = allUsers.filter(u => 
        u.companyId === currentUser.companyId &&
        u.status === UserStatus.PENDING_APPROVAL
    );
    
    if (selectedProjectId) {
        // Only show those assigned to this project (Workforce/Field)
        pUsers = pUsers.filter(u => u.assignedProjectIds && u.assignedProjectIds.includes(selectedProjectId));
    }
    setPendingUsers(pUsers);

    // Active Employees
    let empList = allUsers.filter(u => 
        u.companyId === currentUser.companyId && 
        u.role === UserRole.USER && 
        u.status === UserStatus.ACTIVE
    );
    if (selectedProjectId) {
        empList = empList.filter(u => u.assignedProjectIds && u.assignedProjectIds.includes(selectedProjectId));
    }
    setEmployees(empList);
  };

  // --- Permissions ---

  const isL1 = currentUser.role === UserRole.CREATOR || currentUser.role === UserRole.ADMIN_L1;
  const isOffice = currentUser.role === UserRole.USER && currentUser.position?.toLowerCase().includes('office');
  
  const canApprove = isL1 || (currentUser.role === UserRole.ADMIN_L2 && currentUser.permissions?.includes(PERMISSIONS.APPROVE_STAFF)) || isOffice;
  
  const canRequestTransfer = isOffice;
  const canFinalizeTransfer = isL1 || (currentUser.role === UserRole.ADMIN_L2 && currentUser.permissions?.includes(PERMISSIONS.APPROVE_TRANSFERS));
  
  const canEditUsers = isL1 || currentUser.role === UserRole.ADMIN_L2; // Office cannot direct edit

  // --- Handlers ---

  const submitDrillingData = (e: React.FormEvent) => {
    e.preventDefault();
    if (!drillingForm.pointCode) {
        alert("Point Code is required.");
        return;
    }

    let reportSummary = `Daily Drilling Report\n`;
    reportSummary += `Date: ${drillingForm.date}\n`;
    reportSummary += `Point: ${drillingForm.pointCode} (${drillingForm.swath})\n`;
    reportSummary += `Type: ${drillingForm.pointType}\n`;
    reportSummary += `Group: ${drillingForm.groupType === 'Company' ? drillingForm.groupName : drillingForm.contractorName} (${drillingForm.groupType})\n`;
    reportSummary += `Crew: ${drillingForm.supervisor} (Sup), ${drillingForm.foreman} (Fore), ${drillingForm.mechanic} (Mech)\n`;
    reportSummary += `Hole: ${drillingForm.holeType}\n`;
    reportSummary += `Depth: ${drillingForm.depth1}m${drillingForm.holeType === 'Pattern' ? ` / ${drillingForm.depth2}m` : ''}`;
    
    alert(reportSummary);

    setDrillingForm({
        swath: '',
        pointCode: '',
        pointType: 'New Point',
        groupType: 'Company',
        groupName: '',
        contractorName: '',
        supervisor: '',
        foreman: '',
        mechanic: '',
        holeType: 'Single',
        depth1: '',
        depth2: '',
        date: new Date().toISOString().split('T')[0],
        comments: ''
    });
  };

  const openStaffApproval = (user: User) => {
      setApprovingStaff(user);
      
      // Project Panel -> Defaults to Workforce (USER) only. No Deputy option here.
      setStaffApprovalForm({
          role: UserRole.USER,
          projectRoleCategory: '',
          jobTitle: '',
          permissions: [],
          assignedProjectIds: selectedProjectId ? [selectedProjectId] : [] // Forces assignment to current project
      });
  };

  const submitStaffApproval = () => {
      if (!approvingStaff) return;
      if (!staffApprovalForm.projectRoleCategory && staffApprovalForm.role === UserRole.USER) {
          alert("Please select a Project Role Category.");
          return;
      }
      try {
          // Update role/projects first
          const updates: any = {
              role: staffApprovalForm.role,
              projectRoleCategory: staffApprovalForm.projectRoleCategory,
              jobTitle: staffApprovalForm.jobTitle,
              position: staffApprovalForm.jobTitle || 'Workforce',
              permissions: staffApprovalForm.permissions,
              assignedProjectIds: selectedProjectId ? [selectedProjectId] : [], // Strict force
              assignedProjectId: selectedProjectId || null
          };
          
          db.updateUser(currentUser.id, approvingStaff.id, updates);
          // Then Approve
          db.approveUser(currentUser.id, approvingStaff.id);
          setApprovingStaff(null);
          refreshData();
      } catch (e: any) { alert(e.message); }
  };

  // Logic for Transfer Request (Office)
  const openTransferRequest = (user: User) => {
      setTransferRequestUser(user);
      setTransferTargets([]); // Reset
  };

  const submitTransferRequest = () => {
      if (!transferRequestUser) return;
      try {
          db.requestUserTransfer(currentUser.id, transferRequestUser.id, transferTargets);
          alert("Transfer Requested. Pending Admin Approval.");
          setTransferRequestUser(null);
          refreshData();
      } catch(e: any) { alert(e.message); }
  };

  // Logic for Direct Transfer (Admin)
  const openDirectTransfer = (user: User) => {
      setDirectTransferUser(user);
      setTransferTargets(db.getUserProjects(user));
  };

  const submitDirectTransfer = () => {
      if (!directTransferUser) return;
      if (transferTargets.length === 0) {
          alert("Please select at least one project.");
          return;
      }
      if (!confirm(`Confirm move of ${directTransferUser.fullName} to selected projects? This will log a transfer.`)) return;

      try {
          // Update User Projects directly
          db.updateUser(currentUser.id, directTransferUser.id, {
              assignedProjectIds: transferTargets,
              assignedProjectId: transferTargets[0]
          });
          setDirectTransferUser(null);
          refreshData();
      } catch (err: any) { alert(err.message); }
  };


  // Logic for Transfer Finalization (L1/Deputy)
  const resolveTransfer = (e: React.MouseEvent, userId: string, approved: boolean) => {
      e.stopPropagation(); // Stop row click
      e.preventDefault(); // Stop form submit
      try {
          if (approved && !confirm("Approve this transfer request? Data will be moved effectively immediately.")) return;
          if (!approved && !confirm("Reject this transfer?")) return;
          
          db.resolveTransferRequest(currentUser.id, userId, approved);
          refreshData();
      } catch(err: any) { alert(err.message); }
  };

  // Direct Edit (L1/Deputy)
  const openEditModal = (user: User) => {
    setEditingUser(user);
    setEditForm({ 
        fullName: user.fullName, 
        position: user.position || '', 
        username: user.username || ''
    });
  };

  const saveUserEdit = () => {
      if (!editingUser) return;
      try {
          db.updateUser(currentUser.id, editingUser.id, { 
              fullName: editForm.fullName, 
              position: editForm.position,
              username: editForm.username
          });
          setEditingUser(null);
          refreshData();
      } catch (err: any) { alert(err.message); }
  };
  
  const handleRemoveFromProject = (e: React.MouseEvent, user: User) => {
      e.stopPropagation();
      e.preventDefault();
      
      if (!selectedProjectId) {
          alert("Can only remove from a specific project context.");
          return;
      }
      if(confirm(`Remove ${user.fullName} from this project? They will become 'Open to Work' if no projects remain.`)) {
          try {
              db.removeUserFromProject(currentUser.id, user.id, selectedProjectId);
              refreshData();
          } catch(e: any) { alert(e.message); }
      }
  };

  // Helpers
  const toggleTransferTarget = (id: string) => {
      const targetUser = directTransferUser || transferRequestUser;
      const isSingleSelect = targetUser?.role === UserRole.USER; // Workforce = Single Select

      if (isSingleSelect) {
          setTransferTargets([id]);
      } else {
          if (transferTargets.includes(id)) setTransferTargets(transferTargets.filter(t => t !== id));
          else setTransferTargets([...transferTargets, id]);
      }
  };
  
  const toggleStaffPermission = (perm: string) => {
      const current = staffApprovalForm.permissions;
      if (current.includes(perm)) setStaffApprovalForm({...staffApprovalForm, permissions: current.filter(p => p !== perm)});
      else setStaffApprovalForm({...staffApprovalForm, permissions: [...current, perm]});
  };

  // --- Renderers ---

  if (!company) return <div className="p-10 flex justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>;

  const SidebarItem = ({ id, label, icon: Icon, badge }: { id: MenuId, label: string, icon: any, badge?: number }) => (
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
        {/* Mobile Sidebar Overlay */}
        {isSidebarOpen && (
            <div className="fixed inset-0 bg-black bg-opacity-50 z-20 md:hidden" onClick={() => setIsSidebarOpen(false)}></div>
        )}

        {/* Sidebar */}
        <aside className={`
            fixed md:static inset-y-0 left-0 z-30 w-64 bg-white border-r border-slate-200 transform transition-transform duration-200 ease-in-out flex flex-col
            ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
        `}>
            <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                <div className="overflow-hidden">
                    <h1 className="text-xl font-bold text-primary truncate">{company.name}</h1>
                    {project ? (
                        <>
                            <p className="text-sm font-semibold text-slate-700 mt-1 truncate">{project.name}</p>
                            <p className="text-xs text-slate-500 font-mono mt-0.5">Proj Code: {project.projectCode}</p>
                        </>
                    ) : (
                        <p className="text-xs text-red-500 mt-1">No Project Selected</p>
                    )}
                </div>
                <button className="md:hidden text-slate-500" onClick={() => setIsSidebarOpen(false)}>
                    <X size={24} />
                </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
                <div className="text-xs font-semibold text-slate-400 uppercase mb-2 px-4">Main</div>
                <SidebarItem id="dashboard" label="Dashboard" icon={LayoutDashboard} />
                <SidebarItem id="users" label="Users" icon={Users} badge={canApprove ? pendingUsers.length : 0}/>
                
                <div className="text-xs font-semibold text-slate-400 uppercase mb-2 mt-6 px-4">Operations</div>
                <SidebarItem id="drilling_entry" label="Drilling Data" icon={ClipboardList} />
                <SidebarItem id="drilling_points" label="Drilling Points" icon={Map} />
                <SidebarItem id="checkman" label="Checkman" icon={CheckSquare} />
                <SidebarItem id="inventory" label="Inventory" icon={Package} />
            </div>

            <div className="p-4 border-t border-slate-100 bg-slate-50">
                 <button onClick={() => navigate('/portal')} className="w-full flex items-center justify-center text-sm text-slate-600 hover:text-primary mb-2">
                    <ArrowLeft size={14} className="mr-1"/> Back to Portal
                 </button>
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center text-slate-600 font-bold">
                        {currentUser.fullName.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-900 truncate">{currentUser.fullName}</p>
                        <p className="text-xs text-slate-500 truncate">{currentUser.role === UserRole.ADMIN_L1 ? 'Owner' : currentUser.role === UserRole.ADMIN_L2 ? 'Deputy' : 'Workforce'}</p>
                    </div>
                </div>
            </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 flex flex-col h-screen overflow-hidden">
            <header className="bg-white border-b border-slate-200 h-16 flex items-center px-6 justify-between md:justify-end">
                <button className="md:hidden text-slate-600" onClick={() => setIsSidebarOpen(true)}>
                    <Menu size={24} />
                </button>
                <div className="flex items-center gap-4">
                    <Badge color={company.status === CompanyStatus.ACTIVE ? 'bg-green-100 text-green-800' : 'bg-orange-100 text-orange-800'}>
                        {company.status}
                    </Badge>
                </div>
            </header>

            <div className="flex-1 overflow-y-auto p-6">
                
                {/* --- DASHBOARD VIEW --- */}
                {activeView === 'dashboard' && (
                    <div className="space-y-6">
                        <h2 className="text-2xl font-bold text-slate-800">Operational Dashboard</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                            <Card className="p-4 bg-blue-50 border-blue-100">
                                <div className="text-sm text-blue-600 font-medium">Field Personnel</div>
                                <div className="text-3xl font-bold text-slate-800 mt-2">{employees.length}</div>
                            </Card>
                            <Card className="p-4 bg-purple-50 border-purple-100">
                                <div className="text-sm text-purple-600 font-medium">Current Project</div>
                                <div className="text-xl font-bold text-slate-800 mt-2 truncate">{project?.name || 'N/A'}</div>
                            </Card>
                            <Card className="p-4 bg-green-50 border-green-100">
                                <div className="text-sm text-green-600 font-medium">Drilled Today</div>
                                <div className="text-3xl font-bold text-slate-800 mt-2">0m</div>
                            </Card>
                            {/* Pending Tasks Counter */}
                            <Card className="p-4 bg-orange-50 border-orange-100">
                                <div className="text-sm text-orange-600 font-medium">Approvals Needed</div>
                                <div className="text-3xl font-bold text-slate-800 mt-2">
                                    {canApprove ? pendingUsers.length : 0}
                                </div>
                            </Card>
                        </div>
                    </div>
                )}

                {/* --- USERS VIEW --- */}
                {activeView === 'users' && (
                    <div className="space-y-8">
                        <div className="flex justify-between items-center">
                            <h2 className="text-2xl font-bold text-slate-800">User Management</h2>
                        </div>

                        {/* Pending Requests */}
                        {canApprove && pendingUsers.length > 0 && (
                            <Card title="Pending Approvals" className="bg-orange-50 border-orange-200">
                                <table className="w-full text-left text-sm text-slate-600">
                                    <thead className="text-slate-900 border-b border-orange-200">
                                        <tr>
                                            <th className="p-4">Name</th>
                                            <th className="p-4">Requested Intent</th>
                                            <th className="p-4">Project</th>
                                            <th className="p-4">Action</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {pendingUsers.map(u => {
                                            const projName = db.getUserProjects(u).map(pid => allProjects.find(p => p.id === pid)?.name).join(', ');
                                            return (
                                            <tr key={u.id} className="hover:bg-orange-100">
                                                <td className="p-4">
                                                    <div className="font-bold">{u.fullName}</div>
                                                    <div className="text-xs text-slate-500">{u.username}</div>
                                                </td>
                                                <td className="p-4">
                                                    <span className="bg-white border rounded px-2 py-1 text-xs font-bold">
                                                        {u.joinIntent || 'UNKNOWN'}
                                                    </span>
                                                </td>
                                                <td className="p-4">{projName || '-'}</td>
                                                <td className="p-4">
                                                    <Button size="sm" onClick={() => openStaffApproval(u)}>Review & Assign Role</Button>
                                                </td>
                                            </tr>
                                        )})}
                                    </tbody>
                                </table>
                            </Card>
                        )}

                        {/* Active Users Table */}
                        <Card title="Active Project Users">
                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-sm text-slate-600">
                                    <thead className="bg-slate-50 text-slate-900 font-semibold border-b">
                                        <tr>
                                            <th className="p-4">Name</th>
                                            <th className="p-4">Role / Title</th>
                                            <th className="p-4">Projects</th>
                                            <th className="p-4">Status</th>
                                            <th className="p-4">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {employees.map(emp => {
                                            const projNames = db.getUserProjects(emp).map(pid => allProjects.find(p => p.id === pid)?.name).join(', ');
                                            return (
                                            <tr key={emp.id} className="border-b hover:bg-slate-50">
                                                <td className="p-4">
                                                    <div className="font-medium text-slate-800">{emp.fullName}</div>
                                                    <div className="text-xs text-slate-400">{emp.username}</div>
                                                </td>
                                                <td className="p-4">
                                                    <div className="font-bold text-xs text-slate-600 mb-0.5">{emp.role === UserRole.ADMIN_L2 ? 'Deputy' : 'Workforce'}</div>
                                                    <div>{emp.jobTitle || emp.position}</div>
                                                </td>
                                                <td className="p-4 max-w-xs truncate" title={projNames}>{projNames}</td>
                                                <td className="p-4">
                                                    {emp.transferRequest ? (
                                                        <Badge color="bg-orange-100 text-orange-800 flex items-center gap-1">
                                                            <ArrowRightLeft size={10}/> Transfer Req
                                                        </Badge>
                                                    ) : (
                                                        <Badge color="bg-green-100 text-green-800">Active</Badge>
                                                    )}
                                                </td>
                                                <td className="p-4 flex gap-2">
                                                    {/* OFFICE: Request Transfer */}
                                                    {canRequestTransfer && !emp.transferRequest && (
                                                        <Button size="sm" variant="secondary" onClick={() => openTransferRequest(emp)} title="Request Transfer">
                                                            <ArrowRightLeft size={14}/>
                                                        </Button>
                                                    )}

                                                    {/* ADMIN L1/L2: Direct Transfer */}
                                                    {canFinalizeTransfer && !emp.transferRequest && (
                                                        <Button size="sm" variant="secondary" onClick={() => openDirectTransfer(emp)} title="Direct Transfer">
                                                            <ArrowRightLeft size={14}/>
                                                        </Button>
                                                    )}

                                                    {/* ADMIN: Resolve Transfer */}
                                                    {emp.transferRequest && canFinalizeTransfer && (
                                                        <div className="flex gap-1">
                                                            <Button size="sm" type="button" className="bg-green-600 hover:bg-green-700" onClick={(e) => resolveTransfer(e, emp.id, true)}>Accept</Button>
                                                            <Button size="sm" type="button" variant="danger" onClick={(e) => resolveTransfer(e, emp.id, false)}>Reject</Button>
                                                        </div>
                                                    )}

                                                    {/* ADMIN: Remove from Project (Release) */}
                                                    {isL1 && selectedProjectId && (
                                                        <Button size="sm" variant="danger" onClick={(e) => handleRemoveFromProject(e, emp)} title="Remove from Project">
                                                            <XCircle size={14}/>
                                                        </Button>
                                                    )}

                                                    {/* ADMIN: Edit */}
                                                    {canEditUsers && (
                                                        <Button size="sm" variant="outline" onClick={() => openEditModal(emp)} title="Edit">
                                                            <Edit size={14}/>
                                                        </Button>
                                                    )}
                                                    
                                                    {/* ALL: Logs */}
                                                    <Button size="sm" variant="outline" onClick={() => setViewingLogsFor(emp)} title="View Logs">
                                                        <History size={14}/>
                                                    </Button>
                                                </td>
                                            </tr>
                                        )})}
                                        {employees.length === 0 && (
                                            <tr><td colSpan={5} className="p-6 text-center text-slate-400">No active users found.</td></tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </Card>
                    </div>
                )}

                {/* --- DRILLING ENTRY VIEW --- */}
                {activeView === 'drilling_entry' && (
                    <div className="max-w-3xl mx-auto space-y-6">
                        <h2 className="text-2xl font-bold text-slate-800">Daily Drilling Report</h2>
                        <Card title="Enter Drilling Data">
                            <form onSubmit={submitDrillingData} className="space-y-6">
                                
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <Input 
                                        label="Swath" 
                                        placeholder="e.g. S-10" 
                                        value={drillingForm.swath} 
                                        onChange={e => setDrillingForm({...drillingForm, swath: e.target.value})} 
                                    />
                                    <Input 
                                        label="Point Code" 
                                        placeholder="e.g. P-105" 
                                        value={drillingForm.pointCode} 
                                        onChange={e => setDrillingForm({...drillingForm, pointCode: e.target.value})}
                                        required
                                    />
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Point Type</label>
                                        <select 
                                            className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary focus:outline-none border-slate-300 bg-white"
                                            value={drillingForm.pointType}
                                            onChange={e => setDrillingForm({...drillingForm, pointType: e.target.value})}
                                        >
                                            <option value="New Point">New Point</option>
                                            <option value="Re-drill">Re-drill</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Group Type</label>
                                        <select 
                                            className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary focus:outline-none border-slate-300 bg-white"
                                            value={drillingForm.groupType}
                                            onChange={e => setDrillingForm({...drillingForm, groupType: e.target.value})}
                                        >
                                            <option value="Company">Company</option>
                                            <option value="Contractor">Contractor</option>
                                        </select>
                                    </div>
                                </div>

                                <div>
                                    {drillingForm.groupType === 'Company' ? (
                                        <Input 
                                            label="Group Name" 
                                            placeholder="Enter Group Name" 
                                            value={drillingForm.groupName} 
                                            onChange={e => setDrillingForm({...drillingForm, groupName: e.target.value})} 
                                        />
                                    ) : (
                                        <Input 
                                            label="Contractor Name" 
                                            placeholder="Enter Contractor Name" 
                                            value={drillingForm.contractorName} 
                                            onChange={e => setDrillingForm({...drillingForm, contractorName: e.target.value})} 
                                        />
                                    )}
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                    <Input 
                                        label="Supervisor" 
                                        placeholder="Name" 
                                        value={drillingForm.supervisor} 
                                        onChange={e => setDrillingForm({...drillingForm, supervisor: e.target.value})} 
                                    />
                                    <Input 
                                        label="Foreman" 
                                        placeholder="Name" 
                                        value={drillingForm.foreman} 
                                        onChange={e => setDrillingForm({...drillingForm, foreman: e.target.value})} 
                                    />
                                    <Input 
                                        label="Mechanic" 
                                        placeholder="Name" 
                                        value={drillingForm.mechanic} 
                                        onChange={e => setDrillingForm({...drillingForm, mechanic: e.target.value})} 
                                    />
                                </div>

                                <div className="p-4 bg-slate-50 rounded-lg border border-slate-100">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-4">
                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 mb-1">Hole Type</label>
                                            <select 
                                                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary focus:outline-none border-slate-300 bg-white"
                                                value={drillingForm.holeType}
                                                onChange={e => setDrillingForm({...drillingForm, holeType: e.target.value})}
                                            >
                                                <option value="Single">Single</option>
                                                <option value="Pattern">Pattern</option>
                                            </select>
                                        </div>
                                        <Input 
                                            label="Drilling Date" 
                                            type="date"
                                            value={drillingForm.date} 
                                            onChange={e => setDrillingForm({...drillingForm, date: e.target.value})} 
                                        />
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <Input 
                                            label={drillingForm.holeType === 'Pattern' ? "Depth 1 (m)" : "Depth (m)"}
                                            type="number" 
                                            step="0.1" 
                                            placeholder="0.0" 
                                            value={drillingForm.depth1} 
                                            onChange={e => setDrillingForm({...drillingForm, depth1: e.target.value})}
                                            required
                                        />
                                        {drillingForm.holeType === 'Pattern' && (
                                            <Input 
                                                label="Depth 2 (m)" 
                                                type="number" 
                                                step="0.1" 
                                                placeholder="0.0" 
                                                value={drillingForm.depth2} 
                                                onChange={e => setDrillingForm({...drillingForm, depth2: e.target.value})}
                                            />
                                        )}
                                    </div>
                                </div>
                                
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Comments</label>
                                    <textarea 
                                        className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary focus:outline-none border-slate-300"
                                        rows={3}
                                        value={drillingForm.comments}
                                        onChange={e => setDrillingForm({...drillingForm, comments: e.target.value})}
                                        placeholder="Additional notes..."
                                    ></textarea>
                                </div>

                                <div className="flex justify-end pt-4">
                                    <Button type="submit" size="lg">Submit Report</Button>
                                </div>
                            </form>
                        </Card>
                    </div>
                )}

                {/* --- OTHER PLACEHOLDER VIEWS --- */}
                {activeView === 'drilling_points' && <div className="text-center p-10 text-slate-400">Drilling Points Module</div>}
                {activeView === 'checkman' && <div className="text-center p-10 text-slate-400">Checkman Module</div>}
                {activeView === 'inventory' && <div className="text-center p-10 text-slate-400">Inventory Module</div>}
            </div>
        </main>

        {/* --- MODALS --- */}

        {/* 1. Review New Member (Staff Approval Modal) */}
        {approvingStaff && (
             <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                <div className="bg-white rounded-xl w-full max-w-2xl p-6 shadow-2xl overflow-y-auto max-h-[90vh]">
                    <h3 className="text-xl font-bold mb-4">Review New Member</h3>
                    <div className="mb-4 p-3 bg-blue-50 border border-blue-100 rounded text-sm text-blue-800">
                        <p><b>Applicant:</b> {approvingStaff.fullName}</p>
                        <p><b>Requested Intent:</b> {approvingStaff.joinIntent}</p>
                    </div>
                    
                    <div className="space-y-6">
                        {/* Role Selection - PROJECT CONTEXT: WORKFORCE ONLY */}
                        <div>
                            <label className="block text-sm font-bold mb-2">Assign Role</label>
                            <label className={`flex items-start gap-2 cursor-pointer border p-3 rounded hover:bg-slate-50 ${staffApprovalForm.role === UserRole.USER ? 'border-primary bg-slate-50' : ''}`}>
                                <input type="radio" className="mt-1" checked={staffApprovalForm.role === UserRole.USER} readOnly />
                                <div>
                                    <span className="font-bold block text-sm">Workforce</span>
                                    <span className="text-xs text-slate-500">Standard project employee.</span>
                                </div>
                            </label>
                        </div>
                        
                        {/* Project Role Category & Job Title */}
                        <div>
                             <label className="block text-sm font-bold mb-2">Project Role & Job Title</label>
                             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                 <div>
                                     <span className="text-xs text-slate-500 mb-1 block">Role Category</span>
                                     <select 
                                        className="w-full p-2 border rounded text-sm"
                                        value={staffApprovalForm.projectRoleCategory}
                                        onChange={(e) => setStaffApprovalForm({...staffApprovalForm, projectRoleCategory: e.target.value, jobTitle: ''})}
                                     >
                                         <option value="">-- Select Category --</option>
                                         {Object.entries(PROJECT_ROLE_CATEGORIES).map(([key, val]) => (
                                             <option key={key} value={key}>{val}</option>
                                         ))}
                                     </select>
                                 </div>
                                 <div>
                                     <span className="text-xs text-slate-500 mb-1 block">Job Title</span>
                                     <select 
                                        className="w-full p-2 border rounded text-sm"
                                        value={staffApprovalForm.jobTitle}
                                        onChange={(e) => setStaffApprovalForm({...staffApprovalForm, jobTitle: e.target.value})}
                                        disabled={!staffApprovalForm.projectRoleCategory}
                                     >
                                         <option value="">-- Select Title --</option>
                                         {staffApprovalForm.projectRoleCategory && PROJECT_JOB_TITLES[staffApprovalForm.projectRoleCategory]?.map(title => (
                                             <option key={title} value={title}>{title}</option>
                                         ))}
                                     </select>
                                 </div>
                             </div>
                        </div>

                        {/* Project Assignment - Forced to Current */}
                        <div>
                            <label className="block text-sm font-medium mb-1">Assign Projects</label>
                            <div className="p-2 border rounded bg-slate-50 text-sm text-slate-500 italic">
                                Automatically assigned to current project: {project?.name}
                            </div>
                        </div>
                    </div>
                    
                    <div className="flex gap-2 mt-6 justify-end pt-4 border-t">
                        <Button variant="outline" onClick={() => setApprovingStaff(null)}>Cancel</Button>
                        <Button onClick={submitStaffApproval}>Approve & Assign</Button>
                    </div>
                </div>
             </div>
        )}

        {/* 2. Transfer Request Modal (Office) */}
        {transferRequestUser && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                <div className="bg-white rounded-xl w-full max-w-md p-6 shadow-2xl">
                    <h3 className="text-xl font-bold mb-2">Request Transfer</h3>
                    <p className="text-sm text-slate-500 mb-4">For: {transferRequestUser.fullName}</p>
                    
                    <div className="space-y-4">
                        <div className="max-h-48 overflow-y-auto border rounded bg-white p-2">
                             {allProjects.map(p => (
                                <label key={p.id} className="flex items-center gap-2 p-2 hover:bg-slate-50 cursor-pointer text-sm">
                                    <input 
                                        type={transferRequestUser.role === UserRole.USER ? "radio" : "checkbox"} 
                                        checked={transferTargets.includes(p.id)} 
                                        onChange={() => toggleTransferTarget(p.id)} 
                                        className="accent-primary"
                                    />
                                    {p.name}
                                </label>
                            ))}
                        </div>
                        <p className="text-xs text-orange-600">This request requires Admin approval.</p>
                    </div>
                    <div className="flex gap-2 mt-6 justify-end">
                        <Button variant="outline" onClick={() => setTransferRequestUser(null)}>Cancel</Button>
                        <Button onClick={submitTransferRequest}>Submit Request</Button>
                    </div>
                </div>
            </div>
        )}

        {/* 3. Direct Transfer Modal (Admin) */}
        {directTransferUser && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                <div className="bg-white rounded-xl w-full max-w-md p-6 shadow-2xl border-t-4 border-orange-500">
                    <h3 className="text-xl font-bold mb-2">Direct Transfer</h3>
                    <p className="text-sm text-slate-500 mb-4">Moving: {directTransferUser.fullName}</p>
                    
                    <div className="space-y-4">
                        <label className="block text-sm font-medium">Select Target Project(s):</label>
                        <div className="max-h-48 overflow-y-auto border rounded bg-white p-2">
                             {allProjects.map(p => (
                                <label key={p.id} className="flex items-center gap-2 p-2 hover:bg-slate-50 cursor-pointer text-sm">
                                    <input 
                                        type={directTransferUser.role === UserRole.USER ? "radio" : "checkbox"} 
                                        checked={transferTargets.includes(p.id)} 
                                        onChange={() => toggleTransferTarget(p.id)}
                                        className="accent-primary"
                                    />
                                    {p.name}
                                </label>
                            ))}
                        </div>
                        <p className="text-xs text-slate-500">
                            Updates will be applied immediately and logged.
                        </p>
                    </div>
                    <div className="flex gap-2 mt-6 justify-end">
                        <Button variant="outline" onClick={() => setDirectTransferUser(null)}>Cancel</Button>
                        <Button onClick={submitDirectTransfer} className="bg-orange-600 hover:bg-orange-700 text-white">Transfer</Button>
                    </div>
                </div>
            </div>
        )}

        {/* 4. Direct Edit Modal */}
        {editingUser && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 px-4">
                <div className="bg-white rounded-xl w-full max-w-md p-6 shadow-2xl">
                    <h3 className="text-xl font-bold mb-4">Edit User</h3>
                    <div className="space-y-4">
                        <Input label="Full Name" value={editForm.fullName} onChange={e => setEditForm({...editForm, fullName: e.target.value})} />
                        <Input label="Phone/Username" value={editForm.username} onChange={e => setEditForm({...editForm, username: e.target.value})} />
                        <Input label="Position" value={editForm.position} onChange={e => setEditForm({...editForm, position: e.target.value})} />
                    </div>
                    <div className="flex gap-2 mt-6 justify-end border-t border-slate-100 pt-4">
                        <Button variant="outline" onClick={() => setEditingUser(null)}>Cancel</Button>
                        <Button onClick={saveUserEdit}>Save Details</Button>
                    </div>
                </div>
            </div>
        )}

        {/* 5. Log Viewer */}
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
