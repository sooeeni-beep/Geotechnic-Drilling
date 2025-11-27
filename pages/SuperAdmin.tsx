
import React, { useState, useEffect } from 'react';
import { db } from '../services/mockDb';
import { Company, User, UserRole, CompanyStatus, LICENSE_TIERS, License, UserStatus } from '../types';
import { Card, Button, Badge, Input } from '../components/UI';
import { 
    Users, 
    Building2, 
    ShieldAlert, 
    Edit, 
    DollarSign,
    LayoutDashboard,
    CreditCard,
    Menu,
    X,
    ArrowLeft,
    CheckCircle,
    Trash2,
    Unlock
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface Props {
    onSelectCompany?: (companyId: string) => void;
}

type ViewState = 'dashboard' | 'companies' | 'admins' | 'licenses';

export const SuperAdminPanel: React.FC<Props> = ({ onSelectCompany }) => {
  const navigate = useNavigate();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [licenses, setLicenses] = useState<License[]>(LICENSE_TIERS);
  
  // Layout State
  const [activeView, setActiveView] = useState<ViewState>('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Edit States
  const [editingPrice, setEditingPrice] = useState<string | null>(null);
  const [newPrice, setNewPrice] = useState<number>(0);

  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [editForm, setEditForm] = useState({ fullName: '', username: '', password: '' });

  useEffect(() => {
    refreshData();
  }, [activeView]);

  const refreshData = () => {
    setCompanies(db.getAllCompanies());
    setUsers(db.getUsers());
  };

  const getOwnerName = (ownerId: string) => {
    return users.find(u => u.id === ownerId)?.fullName || 'Unknown';
  };

  const toggleBlockUser = (e: React.MouseEvent, user: User) => {
    e.preventDefault();
    e.stopPropagation();
    try {
        db.toggleBlockUser(user.id);
        refreshData();
    } catch(e: any) { alert(e.message); }
  };

  const openEditUser = (user: User) => {
      setEditingUser(user);
      setEditForm({ fullName: user.fullName, username: user.username, password: '' });
  };

  const saveUserEdit = () => {
      if(!editingUser) return;
      try {
          // Update Password if set
          if(editForm.password && editForm.password.length > 0) {
              db.updateUserPassword(editingUser.id, editForm.password);
          }
          // Update details
          db.updateUser('creator-001', editingUser.id, { fullName: editForm.fullName, username: editForm.username });
          setEditingUser(null);
          refreshData();
      } catch(e: any) { alert(e.message); }
  };

  const saveLicensePrice = (id: string) => {
      db.updateLicensePrice(id, newPrice);
      setEditingPrice(null);
      setLicenses([...LICENSE_TIERS]); // Force refresh from updated source
  };

  const adminL1s = users.filter(u => u.role === UserRole.ADMIN_L1);

  // --- Layout Components ---

  const SidebarItem = ({ id, label, icon: Icon }: { id: ViewState, label: string, icon: any }) => (
    <button 
        type="button"
        onClick={() => { setActiveView(id); setIsSidebarOpen(false); }}
        className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium transition-colors rounded-lg mb-1
            ${activeView === id ? 'bg-primary text-white shadow-md' : 'text-slate-600 hover:bg-slate-100 hover:text-primary'}
        `}
    >
        <Icon size={20} />
        {label}
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
                  <h1 className="text-xl font-bold text-primary truncate">System Core</h1>
                  <p className="text-sm font-semibold text-slate-700 mt-1 truncate">Creator Panel</p>
                  <p className="text-xs text-slate-500 font-mono mt-0.5">Level 0 Access</p>
              </div>
              <button type="button" className="md:hidden text-slate-500" onClick={() => setIsSidebarOpen(false)}>
                  <X size={24} />
              </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4">
              <div className="text-xs font-semibold text-slate-400 uppercase mb-2 px-4">Overview</div>
              <SidebarItem id="dashboard" label="Dashboard" icon={LayoutDashboard} />
              
              <div className="text-xs font-semibold text-slate-400 uppercase mb-2 mt-6 px-4">Management</div>
              <SidebarItem id="companies" label="Companies" icon={Building2} />
              <SidebarItem id="admins" label="Admins" icon={Users} />
              
              <div className="text-xs font-semibold text-slate-400 uppercase mb-2 mt-6 px-4">System</div>
              <SidebarItem id="licenses" label="Licenses" icon={CreditCard} />
          </div>

          <div className="p-4 border-t border-slate-100 bg-slate-50">
               <button type="button" onClick={() => navigate('/portal')} className="w-full flex items-center justify-center text-sm text-slate-600 hover:text-primary mb-2">
                  <ArrowLeft size={14} className="mr-1"/> Back to Portal
               </button>
              <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-slate-800 text-white flex items-center justify-center font-bold">
                      0
                  </div>
                  <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-900 truncate">System Creator</p>
                      <p className="text-xs text-slate-500 truncate">Super Admin</p>
                  </div>
              </div>
          </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden">
          <header className="bg-white border-b border-slate-200 h-16 flex items-center px-6 justify-between md:justify-end">
              <button type="button" className="md:hidden text-slate-600" onClick={() => setIsSidebarOpen(true)}>
                  <Menu size={24} />
              </button>
              <div className="flex items-center gap-2">
                   <span className="text-xs font-bold bg-slate-100 text-slate-600 px-2 py-1 rounded border">Global Environment</span>
              </div>
          </header>

          <div className="flex-1 overflow-y-auto p-6">
              
              {/* VIEW: DASHBOARD */}
              {activeView === 'dashboard' && (
                  <div className="space-y-6 animate-fadeIn">
                      <h2 className="text-2xl font-bold text-slate-800">System Overview</h2>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <Card className="border-l-4 border-primary">
                          <div className="flex items-center">
                            <Building2 className="w-8 h-8 text-primary mr-4" />
                            <div>
                              <p className="text-sm text-slate-500">Total Companies</p>
                              <h2 className="text-2xl font-bold">{companies.length}</h2>
                            </div>
                          </div>
                        </Card>
                        <Card className="border-l-4 border-green-500">
                          <div className="flex items-center">
                            <DollarSign className="w-8 h-8 text-green-500 mr-4" />
                            <div>
                              <p className="text-sm text-slate-500">Active Licenses</p>
                              <h2 className="text-2xl font-bold">{companies.filter(c => c.status === CompanyStatus.ACTIVE).length}</h2>
                            </div>
                          </div>
                        </Card>
                      </div>
                  </div>
              )}

              {/* VIEW: COMPANIES */}
              {activeView === 'companies' && (
                  <div className="space-y-6 animate-fadeIn">
                      <h2 className="text-2xl font-bold text-slate-800">Registered Companies</h2>
                      <Card className="w-full">
                        <div className="overflow-x-auto">
                          <table className="w-full text-left text-sm text-slate-600">
                            <thead className="bg-slate-50 text-slate-900 font-semibold border-b">
                              <tr>
                                <th className="p-4">Company Name</th>
                                <th className="p-4">Owner</th>
                                <th className="p-4">Status</th>
                                <th className="p-4">Expires In</th>
                              </tr>
                            </thead>
                            <tbody>
                              {companies.map(company => (
                                <tr key={company.id} className="border-b hover:bg-slate-50">
                                  <td className="p-4 font-medium">{company.name}</td>
                                  <td className="p-4">{getOwnerName(company.ownerId)}</td>
                                  <td className="p-4">
                                    <Badge color={
                                        company.status === CompanyStatus.ACTIVE ? 'bg-green-100 text-green-800' : 
                                        company.status === CompanyStatus.PENDING_APPROVAL ? 'bg-orange-100 text-orange-800' :
                                        'bg-red-100 text-red-800'
                                    }>
                                        {company.status}
                                    </Badge>
                                  </td>
                                  <td className="p-4">
                                      {company.expiryDate ? (
                                          <span className={db.calculateRemainingDays(company.expiryDate) < 7 ? 'text-red-600 font-bold' : ''}>
                                              {db.calculateRemainingDays(company.expiryDate)} Days
                                          </span>
                                      ) : '-'}
                                  </td>
                                </tr>
                              ))}
                              {companies.length === 0 && (
                                <tr>
                                    <td colSpan={4} className="p-8 text-center text-slate-400">No companies registered yet.</td>
                                </tr>
                              )}
                            </tbody>
                          </table>
                        </div>
                      </Card>
                  </div>
              )}

              {/* VIEW: ADMINS */}
              {activeView === 'admins' && (
                  <div className="space-y-6 animate-fadeIn">
                      <h2 className="text-2xl font-bold text-slate-800">Admin Level 1 Management</h2>
                      <Card className="w-full">
                        <div className="overflow-x-auto">
                          <table className="w-full text-left text-sm text-slate-600">
                            <thead className="bg-slate-50 text-slate-900 font-semibold border-b">
                              <tr>
                                <th className="p-4">Full Name</th>
                                <th className="p-4">Username</th>
                                <th className="p-4">Company ID</th>
                                <th className="p-4">Status</th>
                                <th className="p-4">Actions</th>
                              </tr>
                            </thead>
                            <tbody>
                              {adminL1s.map(admin => (
                                <tr key={admin.id} className="border-b hover:bg-slate-50">
                                  <td className="p-4 font-medium">{admin.fullName}</td>
                                  <td className="p-4">{admin.username}</td>
                                  <td className="p-4 text-xs font-mono">{admin.companyId}</td>
                                  <td className="p-4">
                                      <Badge color={admin.status === UserStatus.ACTIVE ? 'bg-green-100 text-green-800' : 'bg-orange-100 text-orange-800'}>
                                          {admin.status}
                                      </Badge>
                                  </td>
                                  <td className="p-4 flex gap-2">
                                     <button type="button" onClick={() => openEditUser(admin)} className="text-blue-500 hover:text-blue-700 p-1 border rounded hover:bg-blue-50" title="Edit User">
                                        <Edit size={16} />
                                     </button>
                                     <button type="button" onClick={(e) => toggleBlockUser(e, admin)} className="text-orange-500 hover:text-orange-700 p-1 border rounded hover:bg-orange-50" title={admin.status === UserStatus.BLOCKED ? "Unblock" : "Block"}>
                                        {admin.status === UserStatus.BLOCKED ? <Unlock size={16} /> : <ShieldAlert size={16} />}
                                     </button>
                                  </td>
                                </tr>
                              ))}
                              {adminL1s.length === 0 && (
                                <tr>
                                    <td colSpan={5} className="p-8 text-center text-slate-400">No Admins found.</td>
                                </tr>
                              )}
                            </tbody>
                          </table>
                        </div>
                      </Card>
                  </div>
              )}

              {/* VIEW: LICENSES */}
              {activeView === 'licenses' && (
                  <div className="space-y-6 animate-fadeIn">
                      <h2 className="text-2xl font-bold text-slate-800">License Pricing</h2>
                      <Card className="w-full">
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                              {licenses.map(l => (
                                  <div key={l.id} className="p-6 border rounded-xl bg-slate-50 hover:shadow-md transition-shadow">
                                      <h3 className="font-bold text-slate-800 text-lg">{l.name}</h3>
                                      <div className="mt-4 flex items-end justify-between">
                                          {editingPrice === l.id ? (
                                              <div className="flex gap-2 items-center w-full">
                                                  <span className="text-slate-500">$</span>
                                                  <input 
                                                    type="number" 
                                                    className="w-full p-2 border rounded"
                                                    value={newPrice} 
                                                    onChange={(e) => setNewPrice(Number(e.target.value))}
                                                    autoFocus
                                                  />
                                                  <Button size="sm" onClick={() => saveLicensePrice(l.id)}>Save</Button>
                                              </div>
                                          ) : (
                                              <>
                                                <div>
                                                    <span className="text-3xl font-bold text-slate-900">${l.basePriceMonthly}</span>
                                                    <span className="text-sm text-slate-500"> / month</span>
                                                </div>
                                                <button 
                                                    type="button"
                                                    onClick={() => { setEditingPrice(l.id); setNewPrice(l.basePriceMonthly); }} 
                                                    className="text-blue-600 hover:text-blue-800 p-2 rounded-full hover:bg-blue-100 transition-colors"
                                                >
                                                    <Edit size={18}/>
                                                </button>
                                              </>
                                          )}
                                      </div>
                                      <div className="mt-4 text-xs text-slate-400">
                                          Max Users: {l.maxUsers}
                                      </div>
                                  </div>
                              ))}
                          </div>
                      </Card>
                  </div>
              )}
          </div>
      </main>

      {/* Edit Modal */}
      {editingUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 px-4">
            <div className="bg-white rounded-xl w-full max-w-md p-6 shadow-2xl">
                <h3 className="text-xl font-bold mb-4">Edit Admin L1</h3>
                <div className="space-y-4">
                    <Input label="Full Name" value={editForm.fullName} onChange={e => setEditForm({...editForm, fullName: e.target.value})} />
                    <Input label="Username" value={editForm.username} onChange={e => setEditForm({...editForm, username: e.target.value})} />
                    <Input label="Reset Password" placeholder="Leave blank to keep" value={editForm.password} onChange={e => setEditForm({...editForm, password: e.target.value})} />
                </div>
                <div className="flex gap-2 mt-6 justify-end">
                    <Button variant="outline" onClick={() => setEditingUser(null)}>Cancel</Button>
                    <Button onClick={saveUserEdit}>Save Changes</Button>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};
