
import React, { useState, useEffect } from 'react';
import { User, UserRole, Company, Project } from '../types';
import { db } from '../services/mockDb';
import { Button, Card, Badge, Input } from '../components/UI';
import { 
    FileText, 
    Star, 
    Briefcase, 
    User as UserIcon, 
    MapPin, 
    Upload, 
    Building2, 
    TrendingUp, 
    Search, 
    Eye, 
    X,
    LayoutDashboard,
    Menu,
    ArrowLeft,
    LogOut,
    UserCircle,
    History,
    Download
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface Props {
  user: User;
  onUpdate?: (user: User) => void;
}

export const UserProfile: React.FC<Props> = ({ user, onUpdate }) => {
  const navigate = useNavigate();
  const [resumeFile, setResumeFile] = useState<string | null>(null);

  // Layout State
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [activeView, setActiveView] = useState<'overview' | 'resume' | 'history' | 'directory'>('overview');

  // L0: Global Directory State
  const [globalUsers, setGlobalUsers] = useState<User[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [viewingUser, setViewingUser] = useState<User | null>(null);

  // L1: Company Profile State
  const [myCompany, setMyCompany] = useState<Company | null>(null);
  const [companyProjects, setCompanyProjects] = useState<Project[]>([]);
  const [companyResumeFile, setCompanyResumeFile] = useState<string | null>(null);

  // User: Blue Card Logic
  const [employmentLabel, setEmploymentLabel] = useState<string>('');
  const [isEmployed, setIsEmployed] = useState(false);
  const [blueCardStatus, setBlueCardStatus] = useState<string>('');
  const [blueCardColor, setBlueCardColor] = useState<string>('');

  useEffect(() => {
    // 1. Load Data Based on Role
    if (user.role === UserRole.CREATOR) {
        setGlobalUsers(db.getGlobalUsers());
        setActiveView('directory');
    } else if (user.role === UserRole.ADMIN_L1 && user.companyId) {
        const companies = db.getCompanies();
        const c = companies.find(comp => comp.id === user.companyId);
        setMyCompany(c || null);
        const projects = db.getProjects();
        setCompanyProjects(projects.filter(p => p.companyId === user.companyId));
        setActiveView('overview');
    } else {
        // Talent / User
        checkEmploymentStatus();
    }
  }, [user]);

  const checkEmploymentStatus = () => {
      let employed = false;
      let label = '';
      
      // Explicit Employment Checks
      const hasProjects = user.assignedProjectIds && user.assignedProjectIds.length > 0;
      // User is employed by company if they have an ID and are Active (covers Office Staff)
      const hasCompany = !!user.companyId && user.status === 'ACTIVE';

      if (hasProjects) {
          employed = true;
          const projects = db.getProjects();
          const pNames = user.assignedProjectIds!.map(pid => projects.find(p => p.id === pid)?.name || 'Unknown Project').join(', ');
          label = `Employed at: ${pNames}`;
      } else if (hasCompany) {
          employed = true;
          const companies = db.getCompanies();
          const c = companies.find(comp => comp.id === user.companyId);
          label = `Employed at: ${c?.name || 'Unknown Company'}`;
      } else {
          employed = false;
          label = 'Available for Work';
      }
      
      setIsEmployed(employed);
      setEmploymentLabel(label);
      
      // Determine Card Appearance based on constraints
      if (user.isAvailableForWork) {
          // Explicitly Open
          setBlueCardStatus(employed ? 'OPEN TO WORK (Employed)' : 'OPEN TO WORK');
          setBlueCardColor('bg-blue-600 shadow-blue-200');
      } else {
          // Explicitly Off
          if (employed) {
              setBlueCardStatus('BUSY / EMPLOYED');
              setBlueCardColor('bg-slate-700');
          } else {
              setBlueCardStatus('UNAVAILABLE');
              setBlueCardColor('bg-slate-400');
          }
      }
  };

  const handleUploadResume = () => {
    if (!resumeFile) return;
    try {
        // Mock DB Update
        const updated = db.submitIdentityVerification(user.id, {
            nationalId: user.nationalId!,
            address: user.address!,
            idCardUrl: user.idCardUrl,
            resumeUrl: resumeFile // Updating resume field
        });
        if (onUpdate) onUpdate(updated);
        alert("Resume Uploaded Successfully!");
        setResumeFile(null);
    } catch(e: any) { alert(e.message); }
  };
  
  const handleUploadCompanyResume = () => {
      if (!companyResumeFile || !myCompany) return;
      try {
          db.updateCompanyResume(myCompany.id, companyResumeFile);
          alert("Company Resume Updated!");
          // Refresh local company data
          const companies = db.getCompanies();
          setMyCompany(companies.find(c => c.id === myCompany.id) || null);
          setCompanyResumeFile(null);
      } catch(e: any) { alert(e.message); }
  };

  const toggleBlueCard = () => {
      try {
          const updated = db.toggleUserAvailability(user.id);
          if (updated && onUpdate) onUpdate(updated);
      } catch(e: any) { alert(e.message); }
  };

  // --- L0 Directory Render ---
  const renderDirectory = () => {
      const filtered = globalUsers.filter(u => 
          u.fullName.toLowerCase().includes(searchTerm.toLowerCase()) || 
          u.username.includes(searchTerm) ||
          u.position?.toLowerCase().includes(searchTerm.toLowerCase())
      );

      return (
          <div className="space-y-6">
              <h2 className="text-2xl font-bold text-slate-800">Global Talent Directory</h2>
              <div className="flex gap-2 mb-4">
                  <div className="relative flex-1">
                      <Search className="absolute left-3 top-3 text-slate-400" size={20}/>
                      <Input 
                        label="" 
                        placeholder="Search by name, mobile, position..." 
                        className="pl-10"
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                      />
                  </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filtered.map(u => (
                      <div key={u.id} className="bg-white p-4 rounded-xl border hover:shadow-md transition-shadow cursor-pointer" onClick={() => setViewingUser(u)}>
                          <div className="flex justify-between items-start">
                              <div className="flex items-center gap-3">
                                  <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center font-bold text-slate-600">
                                      {u.firstName.charAt(0)}
                                  </div>
                                  <div>
                                      <h3 className="font-bold text-slate-800">{u.fullName}</h3>
                                      <p className="text-xs text-slate-500">{u.position || 'No Position'}</p>
                                  </div>
                              </div>
                              {u.isAvailableForWork ? (
                                  <span className="w-3 h-3 bg-blue-500 rounded-full" title="Open to Work"></span>
                              ) : (
                                  <span className="w-3 h-3 bg-slate-300 rounded-full" title="Employed/Busy"></span>
                              )}
                          </div>
                          <div className="mt-3 text-xs text-slate-500 line-clamp-2">
                              {u.joinIntent === 'TALENT' ? 'Registered Talent' : `Employed at ${u.companyId ? 'Company' : 'N/A'}`}
                          </div>
                      </div>
                  ))}
              </div>

              {/* User Detail Modal */}
              {viewingUser && (
                  <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                      <div className="bg-white rounded-xl w-full max-w-lg p-6 shadow-2xl relative">
                          <button onClick={() => setViewingUser(null)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600"><X/></button>
                          <div className="flex items-center gap-4 mb-6">
                              <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center text-2xl font-bold text-slate-500">
                                  {viewingUser.firstName.charAt(0)}
                              </div>
                              <div>
                                  <h2 className="text-2xl font-bold">{viewingUser.fullName}</h2>
                                  <p className="text-slate-500">{viewingUser.position || 'Talent'}</p>
                                  {viewingUser.isAvailableForWork && <Badge color="bg-blue-100 text-blue-700 mt-2">Open to Work</Badge>}
                              </div>
                          </div>
                          
                          <div className="space-y-4">
                              <div className="p-4 bg-slate-50 rounded-lg border">
                                  <h4 className="font-bold text-sm mb-2">Resume / CV</h4>
                                  {viewingUser.resumeUrl ? (
                                      <div className="flex items-center gap-2 text-blue-600 cursor-pointer hover:underline">
                                          <FileText size={16}/> View Uploaded Resume
                                      </div>
                                  ) : <span className="text-sm text-slate-400">No resume uploaded.</span>}
                              </div>
                              <div className="p-4 bg-slate-50 rounded-lg border">
                                  <h4 className="font-bold text-sm mb-2">Ratings</h4>
                                  <div className="flex items-center gap-1 text-yellow-500">
                                      <Star fill="currentColor" size={16}/>
                                      <span className="font-bold text-slate-800">0.0</span>
                                      <span className="text-slate-400 text-xs ml-1">(No ratings yet)</span>
                                  </div>
                              </div>
                          </div>
                          
                          <div className="mt-6 flex justify-end">
                              <Button variant="outline" onClick={() => setViewingUser(null)}>Close</Button>
                          </div>
                      </div>
                  </div>
              )}
          </div>
      );
  };

  // --- L1 Company Profile Render ---
  const renderCompanyProfile = () => {
      if (!myCompany) return <div>Loading...</div>;
      
      return (
          <div className="space-y-6">
               <h2 className="text-2xl font-bold text-slate-800">Company Profile</h2>
               
               <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                   <Card className="md:col-span-2">
                       <div className="flex items-center gap-4 mb-6">
                           <div className="w-16 h-16 bg-blue-50 rounded-lg flex items-center justify-center text-blue-600">
                               <Building2 size={32}/>
                           </div>
                           <div>
                               <h3 className="text-xl font-bold text-slate-800">{myCompany.name}</h3>
                               <p className="text-slate-500">{myCompany.industry} Industry</p>
                               <div className="flex gap-2 mt-2">
                                   <Badge>{myCompany.activeModules.length} Modules</Badge>
                                   <Badge color={myCompany.status === 'ACTIVE' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>{myCompany.status}</Badge>
                               </div>
                           </div>
                       </div>
                       
                       {/* Company Resume Section */}
                       <div className="mt-6 pt-6 border-t border-slate-100">
                           <h4 className="font-bold text-slate-800 mb-2">Company Resume (CV)</h4>
                           <p className="text-sm text-slate-500 mb-4">Upload a comprehensive document detailing your company's past projects, financial standing, and capabilities. This will be visible to potential partners.</p>
                           
                           {myCompany.companyResumeUrl ? (
                               <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded flex justify-between items-center">
                                   <span className="text-sm text-green-800 font-medium flex items-center gap-2"><FileText size={16}/> Current Resume Active</span>
                                   <button className="text-xs text-green-700 underline">View</button>
                               </div>
                           ) : (
                               <div className="mb-4 p-3 bg-slate-50 border border-slate-200 rounded text-sm text-slate-500 italic">
                                   No resume uploaded yet.
                               </div>
                           )}

                           <div className="flex gap-3">
                               <Button variant="outline" size="sm" onClick={() => alert("Downloading Template...")}>
                                   <Download size={14} className="mr-2"/> Download Template
                               </Button>
                               <div className="flex-1 flex gap-2">
                                   <input 
                                     className="flex-1 text-sm border rounded px-2 py-1.5" 
                                     placeholder="Mock Upload URL..."
                                     value={companyResumeFile || ''}
                                     onChange={e => setCompanyResumeFile(e.target.value)}
                                   />
                                   <Button size="sm" onClick={handleUploadCompanyResume} disabled={!companyResumeFile}>
                                       <Upload size={14} className="mr-2"/> Upload
                                   </Button>
                               </div>
                           </div>
                       </div>
                   </Card>

                   <div className="space-y-6">
                       <Card title="Statistics">
                            <div className="space-y-4">
                                <div>
                                    <div className="text-xs text-slate-500 uppercase">Active Projects</div>
                                    <div className="text-2xl font-bold text-slate-800">{companyProjects.length}</div>
                                </div>
                                <div>
                                    <div className="text-xs text-slate-500 uppercase">Total Staff</div>
                                    <div className="text-2xl font-bold text-slate-800">{db.getUsers().filter(u => u.companyId === myCompany.id && u.role === UserRole.USER).length}</div>
                                </div>
                            </div>
                       </Card>
                   </div>
               </div>
          </div>
      );
  };

  // --- User Profile Render ---
  const renderUserProfile = () => (
    <div className="space-y-6">
        <h2 className="text-2xl font-bold text-slate-800">Professional Profile</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* Left Column: Stats & Blue Card */}
            <div className="space-y-6">
                {/* BLUE CARD: AVAILABILITY */}
                <Card className={`text-white transition-colors duration-300 ${blueCardColor}`}>
                    <div className="flex justify-between items-start mb-4">
                        <Briefcase size={28} className="opacity-80"/>
                        <div className="text-right">
                             <div className="text-xs font-bold uppercase opacity-70">Status</div>
                             <div className="font-bold text-lg">{blueCardStatus}</div>
                        </div>
                    </div>
                    
                    <div className="mb-6">
                         <p className="text-sm opacity-90">{employmentLabel}</p>
                         {isEmployed && user.isAvailableForWork && (
                             <div className="mt-2 bg-white/20 p-2 rounded text-xs">
                                 <b className="block mb-1">Warning:</b>
                                 You are listed as employed but have signaled availability. Admins will be notified.
                             </div>
                         )}
                    </div>

                    <div className="pt-4 border-t border-white/20 flex justify-between items-center">
                        <span className="text-xs font-medium opacity-80">Toggle Visibility</span>
                        <button 
                            onClick={toggleBlueCard}
                            className={`w-12 h-6 rounded-full p-1 transition-colors ${user.isAvailableForWork ? 'bg-white' : 'bg-slate-500'}`}
                        >
                            <div className={`w-4 h-4 rounded-full shadow-sm transform transition-transform ${user.isAvailableForWork ? 'translate-x-6 bg-blue-600' : 'bg-white'}`}></div>
                        </button>
                    </div>
                </Card>

                <Card>
                    <div className="text-center p-4">
                        <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-slate-100 mb-3 text-2xl font-bold text-slate-500">
                             {user.firstName.charAt(0)}
                        </div>
                        <h3 className="font-bold text-lg text-slate-800">{user.fullName}</h3>
                        <p className="text-slate-500 text-sm mb-4">{user.position || 'No Title'}</p>
                        <div className="flex justify-center gap-1 text-yellow-500 mb-2">
                             <Star fill="currentColor" size={20}/>
                             <span className="font-bold text-lg text-slate-900">0.0</span>
                        </div>
                        <p className="text-xs text-slate-400">Based on 0 reviews</p>
                    </div>
                </Card>
            </div>

            {/* Right Column: Resume & Details */}
            <div className="md:col-span-2 space-y-6">
                <Card title="Resume & CV">
                    <div className="space-y-4">
                        <p className="text-sm text-slate-600">
                            Upload your latest resume to be visible in the Global Talent Directory.
                        </p>
                        
                        <div className="border-2 border-dashed border-slate-300 rounded-xl p-8 text-center hover:bg-slate-50 transition-colors">
                            {user.resumeUrl ? (
                                <div>
                                    <FileText size={48} className="mx-auto text-blue-500 mb-3"/>
                                    <p className="font-bold text-slate-700">Resume_v1.pdf</p>
                                    <p className="text-xs text-slate-400 mb-4">Uploaded on {new Date().toLocaleDateString()}</p>
                                    <Button size="sm" variant="outline" onClick={() => alert("Download Mock")}>Download</Button>
                                </div>
                            ) : (
                                <div>
                                    <Upload size={48} className="mx-auto text-slate-300 mb-3"/>
                                    <p className="font-bold text-slate-700">No Resume Uploaded</p>
                                    <p className="text-xs text-slate-400">PDF or Word formats only.</p>
                                </div>
                            )}
                        </div>

                        <div className="flex gap-2">
                             <Input 
                                label="Update Resume (Mock URL)" 
                                placeholder="http://..." 
                                value={resumeFile || ''} 
                                onChange={e => setResumeFile(e.target.value)}
                                className="flex-1"
                             />
                             <div className="mt-6">
                                <Button onClick={handleUploadResume} disabled={!resumeFile}>Upload</Button>
                             </div>
                        </div>
                    </div>
                </Card>

                <Card title="Work History">
                     <div className="text-center py-8 text-slate-400">
                         No history records found.
                     </div>
                </Card>
            </div>
        </div>
    </div>
  );

  const SidebarItem = ({ id, label, icon: Icon }: { id: string, label: string, icon: any }) => (
    <button 
        onClick={() => { setActiveView(id as any); setIsSidebarOpen(false); }}
        className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium transition-colors rounded-lg mb-1
            ${activeView === id ? 'bg-primary text-white shadow-md' : 'text-slate-600 hover:bg-slate-100 hover:text-primary'}
        `}
    >
        <Icon size={20} />
        {label}
    </button>
  );

  // --- Main Layout Wrapper ---
  return (
    <div className="flex min-h-screen bg-slate-50">
        {/* Sidebar */}
         <aside className={`
            fixed md:static inset-y-0 left-0 z-30 w-64 bg-white border-r border-slate-200 transform transition-transform duration-200 ease-in-out flex flex-col
            ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
        `}>
            <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                <div className="overflow-hidden">
                    <h1 className="text-xl font-bold text-primary truncate">Profile</h1>
                    <p className="text-xs text-slate-500 font-mono mt-0.5">{user.fullName}</p>
                </div>
                <button className="md:hidden text-slate-500" onClick={() => setIsSidebarOpen(false)}><X size={24} /></button>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
                {user.role === UserRole.CREATOR ? (
                    <SidebarItem id="directory" label="Global Directory" icon={Search} />
                ) : user.role === UserRole.ADMIN_L1 ? (
                    <SidebarItem id="overview" label="Company Profile" icon={Building2} />
                ) : (
                    <>
                        <SidebarItem id="overview" label="My Profile" icon={UserCircle} />
                        <SidebarItem id="history" label="History" icon={History} />
                    </>
                )}
            </div>

            <div className="p-4 border-t border-slate-100 bg-slate-50 mt-auto">
                 <button onClick={() => navigate('/portal')} className="w-full flex items-center justify-center text-sm text-slate-600 hover:text-primary mb-2">
                    <ArrowLeft size={14} className="mr-1"/> Back to Portal
                 </button>
            </div>
        </aside>

        <main className="flex-1 flex flex-col h-screen overflow-hidden">
             <header className="bg-white border-b border-slate-200 h-16 flex items-center px-6 justify-between md:justify-end">
                <button className="md:hidden text-slate-600" onClick={() => setIsSidebarOpen(true)}>
                    <Menu size={24} />
                </button>
            </header>
            <div className="flex-1 overflow-y-auto p-6">
                {activeView === 'directory' && renderDirectory()}
                {activeView === 'overview' && user.role === UserRole.ADMIN_L1 && renderCompanyProfile()}
                {activeView === 'overview' && user.role !== UserRole.ADMIN_L1 && renderUserProfile()}
                {activeView === 'history' && <div className="text-center p-10 text-slate-400">History Log View Placeholder</div>}
            </div>
        </main>
    </div>
  );
};
