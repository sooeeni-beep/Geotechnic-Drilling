
import React, { useState } from 'react';
import { HashRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { LoginPage } from './pages/Login';
import { RegisterPage } from './pages/Register';
import { SuperAdminPanel } from './pages/SuperAdmin';
import { CompanyPanel } from './pages/CompanyPanel';
import { CompanyManagement } from './pages/CompanyManagement';
import { DashboardPortal } from './pages/DashboardPortal';
import { IdentityVerification } from './pages/IdentityVerification'; 
import { UserProfile } from './pages/UserProfile'; // Import
import { User, UserRole, UserStatus } from './types';
import { db } from './services/mockDb';
import { LogOut, LayoutDashboard, Settings } from 'lucide-react';

interface PrivateRouteProps {
  children: React.ReactNode;
  allowedRoles?: UserRole[];
  currentUser: User | null;
}

const PrivateRoute: React.FC<PrivateRouteProps> = ({ children, allowedRoles, currentUser }) => {
  if (!currentUser) return <Navigate to="/login" />;
  
  if (allowedRoles && !allowedRoles.includes(currentUser.role)) {
    return <div className="p-10 text-center text-red-500">Access Denied</div>;
  }
  return <>{children}</>;
};

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [targetCompanyId, setTargetCompanyId] = useState<string | null>(null);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);

  const handleLogout = () => {
    setCurrentUser(null);
    setTargetCompanyId(null);
    setSelectedProjectId(null);
  };

  const getActiveCompanyId = () => {
    if (currentUser?.role === UserRole.CREATOR) return targetCompanyId;
    return currentUser?.companyId;
  };

  const activeCompanyId = getActiveCompanyId();
  const viewingUser = currentUser?.role === UserRole.CREATOR && activeCompanyId 
    ? { ...currentUser, companyId: activeCompanyId } 
    : currentUser;

  return (
    <HashRouter>
      <div className="min-h-screen bg-slate-100 flex flex-col">
        {currentUser && (
          <nav className="bg-primary text-white shadow-lg sticky top-0 z-50">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="flex items-center justify-between h-16">
                <div className="flex items-center">
                  <div className="flex-shrink-0 font-bold text-xl tracking-wider text-accent">
                    GeoDrill
                  </div>
                  <div className="hidden md:block">
                    <div className="ml-10 flex items-baseline space-x-4">
                      <a href="#/portal" className="px-3 py-2 rounded-md text-sm font-medium hover:bg-slate-700">Portal</a>
                      {currentUser.role === UserRole.CREATOR && !targetCompanyId && (
                         <a href="#/super-admin" className="px-3 py-2 rounded-md text-sm font-medium hover:bg-slate-700 text-orange-300">Global Admin</a>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  {currentUser.role === UserRole.CREATOR && targetCompanyId && (
                      <span className="bg-orange-600 px-2 py-1 rounded text-xs font-bold">Viewing Company</span>
                  )}
                  <div className="text-right hidden sm:block">
                    <div className="text-sm font-medium text-white">{currentUser.fullName}</div>
                    <div className="text-xs text-slate-400">{currentUser.role}</div>
                  </div>
                  <button onClick={handleLogout} className="bg-slate-800 p-2 rounded-full text-slate-400 hover:text-white">
                    <LogOut size={20} />
                  </button>
                </div>
              </div>
            </div>
          </nav>
        )}

        <main className={`flex-grow ${currentUser ? 'w-full' : ''}`}>
          <Routes>
            <Route path="/login" element={!currentUser ? <LoginPage onLogin={setCurrentUser} /> : <Navigate to="/portal" />} />
            <Route path="/register" element={!currentUser ? <RegisterPage onRegister={(u) => setCurrentUser(u)} /> : <Navigate to="/portal" />} />
            
            <Route 
              path="/portal" 
              element={
                <PrivateRoute currentUser={currentUser}>
                  <DashboardPortal 
                    user={currentUser!} 
                    onCompanySelect={(id) => setTargetCompanyId(id)}
                    onProjectSelect={(id) => setSelectedProjectId(id)}
                  />
                </PrivateRoute>
              } 
            />

            <Route 
              path="/identity-verification" 
              element={
                <PrivateRoute currentUser={currentUser}>
                   <IdentityVerification user={currentUser!} onUpdate={setCurrentUser} />
                </PrivateRoute>
              } 
            />
            
            <Route 
              path="/profile" 
              element={
                <PrivateRoute currentUser={currentUser}>
                   <UserProfile user={currentUser!} onUpdate={setCurrentUser} />
                </PrivateRoute>
              } 
            />

            <Route 
              path="/super-admin" 
              element={
                <PrivateRoute allowedRoles={[UserRole.CREATOR]} currentUser={currentUser}>
                   <SuperAdminPanel onSelectCompany={(id) => {
                       setTargetCompanyId(id);
                       window.location.href = '#/company-management';
                   }}/>
                </PrivateRoute>
              } 
            />

            <Route 
              path="/company-management" 
              element={
                <PrivateRoute allowedRoles={[UserRole.CREATOR, UserRole.ADMIN_L1, UserRole.ADMIN_L2]} currentUser={currentUser}>
                   {viewingUser && viewingUser.companyId ? (
                        <CompanyManagement currentUser={viewingUser} />
                   ) : ( <Navigate to="/portal" /> )}
                </PrivateRoute>
              } 
            />

            <Route 
              path="/company-panel" 
              element={
                <PrivateRoute currentUser={currentUser}>
                   {viewingUser && viewingUser.companyId ? (
                        <CompanyPanel 
                          currentUser={viewingUser} 
                          selectedProjectId={selectedProjectId}
                        />
                   ) : ( <Navigate to="/portal" /> )}
                </PrivateRoute>
              } 
            />

            <Route path="*" element={<Navigate to="/login" />} />
          </Routes>
        </main>
      </div>
    </HashRouter>
  );
};

export default App;
