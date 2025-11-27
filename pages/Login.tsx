
import React, { useState } from 'react';
import { db } from '../services/mockDb';
import { User, UserStatus, UserRole } from '../types';
import { Input, Button, Card } from '../components/UI';
import { Link } from 'react-router-dom';
import { AlertTriangle } from 'lucide-react';

interface Props {
  onLogin: (user: User) => void;
}

export const LoginPage: React.FC<Props> = ({ onLogin }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [forceChangePassword, setForceChangePassword] = useState<User | null>(null);
  const [newPassword, setNewPassword] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    try {
      const user = db.authenticate(username, password);
      
      if (!user) {
        setError("Invalid credentials");
        return;
      }

      // Allow PENDING_APPROVAL users to login so they can see the verification screen or pending message
      // Blocked users are thrown in mockDb.authenticate

      if (user.status === UserStatus.NEEDS_PASSWORD_CHANGE) {
        setForceChangePassword(user);
        return;
      }

      onLogin(user);
    } catch (err: any) {
       setError(err.message);
    }
  };

  const handleChangePassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (!forceChangePassword) return;
    if (newPassword.length < 5) {
        setError("Password must be at least 5 characters");
        return;
    }
    
    try {
        const updatedUser = db.updateUserPassword(forceChangePassword.id, newPassword);
        onLogin(updatedUser);
    } catch (err: any) {
        setError(err.message);
    }
  };

  if (forceChangePassword) {
    return (
        <div className="flex items-center justify-center min-h-screen bg-slate-100">
        <div className="w-full max-w-md px-4">
          <Card title="Security Update Required" className="shadow-xl">
            <div className="mb-4 bg-yellow-50 text-yellow-800 p-3 rounded text-sm">
                For security reasons, the Creator account must change its password upon first login.
            </div>
            <form onSubmit={handleChangePassword}>
              <Input
                label="New Password"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                placeholder="Enter new secure password"
              />
              {error && <p className="text-red-500 text-sm mb-4">{error}</p>}
              <Button type="submit" className="w-full">
                Update Password & Login
              </Button>
            </form>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-slate-100">
      <div className="w-full max-w-md px-4">
        <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-primary tracking-tight">GeoDrill</h1>
            <p className="text-slate-500 mt-2">Geotechnical Project Management</p>
        </div>
        <Card title="Login to Your Workspace" className="shadow-xl">
              <form onSubmit={handleSubmit} className="space-y-4">
                <Input
                label="Mobile / Username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter your registered Mobile Number"
                required
                />
                <Input
                label="Password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                />
                
                {error && (
                    <div className="p-3 bg-red-50 text-red-700 text-sm rounded flex items-center gap-2">
                        <AlertTriangle size={16}/> {error}
                    </div>
                )}
                
                <div className="pt-2">
                    <Button type="submit" className="w-full text-lg py-3">
                    Login
                    </Button>
                </div>
                
                <div className="text-center mt-6 text-sm text-slate-600">
                  Don't have an account? <Link to="/register" className="text-accent hover:underline font-medium">Join a company or create one</Link>
                </div>
            </form>
        </Card>
      </div>
    </div>
  );
};
