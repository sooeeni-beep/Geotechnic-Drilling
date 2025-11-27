
import React, { useState, useEffect } from 'react';
import { User, UserRole, Company, Project, VerificationStatus } from '../types';
import { db } from '../services/mockDb';
import { Button, Card } from '../components/UI';
import { Settings, Briefcase, Building2, MapPin, ArrowRight, ShieldCheck, AlertTriangle, UserCircle, Globe } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface Props {
  user: User;
  onCompanySelect: (companyId: string) => void;
  onProjectSelect: (projectId: string) => void;
}

export const DashboardPortal: React.FC<Props> = ({ user, onCompanySelect, onProjectSelect }) => {
  const navigate = useNavigate();
  
  // Selection States
  const [viewState, setViewState] = useState<'MAIN' | 'SELECT_COMPANY' | 'SELECT_PROJECT'>('MAIN');
  const [selectedCompanyId, setSelectedCompanyId] = useState<string | null>(user.companyId);
  
  // Data
  const [companies] = useState<Company[]>(db.getAllCompanies());
  const [projects, setProjects] = useState<Project[]>([]);
  const [pendingNotificationCount, setPendingNotificationCount] = useState(0);

  useEffect(() => {
    if (selectedCompanyId) {
        const allProjects = db.getProjects();
        let companyProjects = allProjects.filter(p => p.companyId === selectedCompanyId);
        
        // Strict filtering for non-Owners: only show assigned projects
        if (user.role === UserRole.ADMIN_L2 || user.role === UserRole.USER) {
            const userProjects = db.getUserProjects(user);
            // If they have explicit assignments, filter. Otherwise show none.
            companyProjects = companyProjects.filter(p => userProjects.includes(p.id));
        }
        setProjects(companyProjects);
    }
    
    // Check notifications if Admin/L1/L2
    if (user.companyId && (user.role === UserRole.ADMIN_L1 || user.role === UserRole.ADMIN_L2)) {
        setPendingNotificationCount(db.getPendingNotificationCount(user.companyId));
    }
  }, [selectedCompanyId, user]);

  const handleAdminPanel = () => {
    if (user.role === UserRole.CREATOR) {
        navigate('/super-admin');
    } else {
        navigate('/company-management');
    }
  };

  const handleOperationalPanel = () => {
    if (user.role === UserRole.CREATOR) {
        setViewState('SELECT_COMPANY');
    } else {
        setViewState('SELECT_PROJECT');
    }
  };

  const handleCompanySelect = (companyId: string) => {
    onCompanySelect(companyId);
    setSelectedCompanyId(companyId);
    setViewState('SELECT_PROJECT'); 
  };

  const handleFinalProjectSelect = (projectId: string) => {
      onProjectSelect(projectId);
      navigate('/company-panel');
  };

  // --- LOGIC ---
  const isVerified = user.verificationStatus === VerificationStatus.VERIFIED;
  const isPendingVerification = user.verificationStatus === VerificationStatus.PENDING;
  const isTalent = user.joinIntent === 'TALENT';

  // --- RENDERERS ---

  if (viewState === 'SELECT_COMPANY') {
      return (
          <div className="max-w-2xl mx-auto p-6">
              <Button variant="outline" onClick={() => setViewState('MAIN')} className="mb-4">Back</Button>
              <h2 className="text-2xl font-bold mb-6">Select Company</h2>
              <div className="space-y-3">
                  {companies.map(c => (
                      <div key={c.id} className="bg-white p-4 rounded-xl border hover:border-primary shadow-sm flex justify-between items-center group">
                          <div className="flex items-center">
                              <Building2 className="mr-3 text-slate-400 group-hover:text-primary"/>
                              <div><div className="font-bold text-slate-800">{c.name}</div><div className="text-xs text-slate-500">Code: {c.companyCode}</div></div>
                          </div>
                          <Button size="sm" onClick={() => handleCompanySelect(c.id)}>Select Project <ArrowRight size={16}/></Button>
                      </div>
                  ))}
              </div>
          </div>
      );
  }

  if (viewState === 'SELECT_PROJECT') {
      if (projects.length === 1 && user.role !== UserRole.CREATOR && user.role !== UserRole.ADMIN_L1) {
          setTimeout(() => handleFinalProjectSelect(projects[0].id), 0);
          return <div className="p-10 text-center">Entering Project...</div>;
      }
      return (
          <div className="max-w-2xl mx-auto p-6">
              <Button variant="outline" onClick={() => setViewState(user.role === UserRole.CREATOR ? 'SELECT_COMPANY' : 'MAIN')} className="mb-4">Back</Button>
              <h2 className="text-2xl font-bold mb-6">Select Project</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {projects.map(p => (
                      <div key={p.id} onClick={() => handleFinalProjectSelect(p.id)} className="bg-white p-6 rounded-xl border border-slate-200 cursor-pointer hover:shadow-lg hover:border-accent transition-all">
                          <div className="flex justify-between items-start mb-2"><Briefcase className="text-accent" size={24}/><span className="text-xs bg-slate-100 px-2 py-1 rounded border">Code: {p.projectCode}</span></div>
                          <h3 className="font-bold text-lg text-slate-800">{p.name}</h3>
                          <div className="flex items-center text-sm text-slate-500 mt-2"><MapPin size={14} className="mr-1"/> {p.location}</div>
                      </div>
                  ))}
                  {projects.length === 0 && <div className="col-span-2 text-center py-10 text-slate-400 bg-white rounded-xl border border-dashed">No projects available.</div>}
              </div>
          </div>
      );
  }

  // Profile Card Content based on Role
  let profileTitle = "Professional Profile";
  let profileDesc = "Update Resume/CV & View Ratings.";
  let ProfileIcon = UserCircle;

  if (user.role === UserRole.CREATOR) {
      profileTitle = "Global Talent Directory";
      profileDesc = "Search and view all registered users.";
      ProfileIcon = Globe;
  } else if (user.role === UserRole.ADMIN_L1) {
      profileTitle = "Company Profile";
      profileDesc = "View company history and stats.";
      ProfileIcon = Building2;
  }

  // MAIN DASHBOARD
  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="flex justify-between items-center mb-8">
        <div>
            <h1 className="text-3xl font-bold text-slate-800">Welcome, {user.firstName}</h1>
            <p className="text-slate-500">Dashboard Portal</p>
        </div>
        <div className="text-right">
             <span className={`px-3 py-1 rounded-full text-xs font-bold ${isVerified ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                 {user.verificationStatus}
             </span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        
        {/* 1. Identity Verification Card (Only visible if NOT Verified) */}
        {!isVerified && (
             <div 
                onClick={() => navigate('/identity-verification')}
                className="group cursor-pointer bg-white rounded-2xl shadow-md border border-red-200 bg-red-50 p-8 hover:shadow-xl transition-all duration-300"
             >
                <div className="w-16 h-16 rounded-xl flex items-center justify-center mb-6 transition-colors bg-red-100 text-red-600">
                    <ShieldCheck size={32} />
                </div>
                <h2 className="text-2xl font-bold text-slate-800 mb-2">Identity Verification</h2>
                <p className="text-slate-500 text-sm">
                    Complete your profile to access workspaces.
                </p>
                <div className="mt-4 text-primary text-sm font-semibold group-hover:underline flex items-center gap-1">
                    <AlertTriangle size={14}/> Complete Now &rarr;
                </div>
            </div>
        )}

        {/* 2. Professional Profile / Global Directory / Company Profile */}
        {isVerified && (
            <div 
                onClick={() => navigate('/profile')}
                className="group cursor-pointer bg-white rounded-2xl shadow-md border border-slate-200 p-8 hover:shadow-xl hover:border-blue-500 transition-all duration-300"
            >
                <div className="bg-blue-50 w-16 h-16 rounded-xl flex items-center justify-center mb-6 group-hover:bg-blue-600 group-hover:text-white transition-colors text-blue-600">
                    <ProfileIcon size={32} />
                </div>
                <h2 className="text-2xl font-bold text-slate-800 mb-2">{profileTitle}</h2>
                <p className="text-slate-500 text-sm">{profileDesc}</p>
                <div className="mt-4 text-blue-600 text-sm font-semibold group-hover:underline">View &rarr;</div>
            </div>
        )}

        {/* 3. Admin Panel (Hidden for Talent or Unverified) */}
        {/* Deputy (L2) can now access this */}
        {(user.role === UserRole.CREATOR || user.role === UserRole.ADMIN_L1 || user.role === UserRole.ADMIN_L2) && isVerified && (
            <div 
                onClick={handleAdminPanel}
                className="group cursor-pointer bg-white rounded-2xl shadow-md border border-slate-200 p-8 hover:shadow-xl hover:border-primary transition-all duration-300"
            >
                <div className="bg-slate-100 w-16 h-16 rounded-xl flex items-center justify-center mb-6 group-hover:bg-primary group-hover:text-white transition-colors text-primary">
                    <Settings size={32} />
                </div>
                <h2 className="text-2xl font-bold text-slate-800 mb-2">Admin Panel</h2>
                <p className="text-slate-500 text-sm">{user.role === UserRole.CREATOR ? 'Manage Global System' : 'Manage Company Settings'}</p>
                <div className="mt-4 text-primary text-sm font-semibold group-hover:underline">Enter Management &rarr;</div>
            </div>
        )}

        {/* 4. Operational Panel (Hidden for Talent/Unverified) */}
        {!isTalent && isVerified && (
            <div 
                onClick={handleOperationalPanel}
                className="group cursor-pointer bg-white rounded-2xl shadow-md border border-slate-200 p-8 hover:shadow-xl hover:border-accent transition-all duration-300 relative"
            >
                 {pendingNotificationCount > 0 && (
                    <div className="absolute top-6 right-6 w-4 h-4 bg-red-500 rounded-full animate-pulse border-2 border-white"></div>
                 )}
                <div className="bg-orange-50 w-16 h-16 rounded-xl flex items-center justify-center mb-6 group-hover:bg-accent group-hover:text-white transition-colors text-accent">
                    <Briefcase size={32} />
                </div>
                <h2 className="text-2xl font-bold text-slate-800 mb-2">Operational Workspace</h2>
                <p className="text-slate-500 text-sm">Access Drilling Projects and Data.</p>
                <div className="mt-4 text-accent text-sm font-semibold group-hover:underline">Enter Workspace &rarr;</div>
            </div>
        )}
      </div>
    </div>
  );
};
