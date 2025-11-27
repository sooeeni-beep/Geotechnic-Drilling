
import React, { useState } from 'react';
import { db } from '../services/mockDb';
import { User } from '../types';
import { Input, Button, Card } from '../components/UI';
import { Link, useNavigate } from 'react-router-dom';
import { Building2, UserPlus, Star, Search, Check } from 'lucide-react';

interface Props {
  onRegister: (user: User) => void;
}

// Simple Country Code Selector Mock
const COUNTRY_CODES = [
    { code: '+98', country: 'Iran' },
    { code: '+1', country: 'USA/Canada' },
    { code: '+44', country: 'UK' },
    { code: '+49', country: 'Germany' },
    { code: '+971', country: 'UAE' },
    { code: '+90', country: 'Turkey' },
    // Add more as needed
];

export const RegisterPage: React.FC<Props> = ({ onRegister }) => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'create_company' | 'join_company' | 'talent'>('create_company');
  
  // Personal Info
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [countryCode, setCountryCode] = useState('+98');
  const [mobile, setMobile] = useState('');
  const [email, setEmail] = useState('');
  
  // Security
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Create Company Fields
  const [companyName, setCompanyName] = useState('');
  const [industry, setIndustry] = useState<'Geotechnical' | 'Geophysical' | 'Mixed'>('Geotechnical');

  // Join Company Fields
  const [joinIntent, setJoinIntent] = useState<'OFFICE' | 'FIELD'>('OFFICE');
  const [companyCode, setCompanyCode] = useState('');
  const [projectCode, setProjectCode] = useState('');

  // UI States
  const [error, setError] = useState('');
  const [showCountrySelect, setShowCountrySelect] = useState(false);
  const [countrySearch, setCountrySearch] = useState('');

  const filteredCountries = COUNTRY_CODES.filter(c => 
      c.country.toLowerCase().includes(countrySearch.toLowerCase()) || 
      c.code.includes(countrySearch)
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
        setError("Passwords do not match.");
        return;
    }

    const baseUserData: Partial<User> = {
        firstName, lastName, countryCode, mobile, email, password
    };

    try {
        if (activeTab === 'create_company') {
            if (!companyName) throw new Error("Company Name required.");
            const result = db.registerCompany(baseUserData, { name: companyName, industry });
            alert(`Company Created! Code: ${result.company.companyCode}. Proceed to Identity Verification.`);
            navigate('/login');
        } else if (activeTab === 'join_company') {
            let targetCode = '';
            // secondCode removed as BOTH option is removed

            if (joinIntent === 'OFFICE') {
                if (!companyCode) throw new Error("Company Code required.");
                targetCode = companyCode;
            } else {
                if (!projectCode) throw new Error("Project Code required.");
                targetCode = projectCode;
            }
            
            // Cast intent to allow passing to DB logic even if we restrict UI
            db.joinCompany(baseUserData, joinIntent as any, targetCode, undefined);
            alert("Join Request Submitted. Please Login to Verify Identity.");
            navigate('/login');
        } else {
            // TALENT
            db.joinCompany(baseUserData, 'TALENT');
            alert("Talent Account Created. Please Login to Verify Identity.");
            navigate('/login');
        }
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-slate-100 py-10">
      <div className="w-full max-w-xl px-4">
        <div className="text-center mb-6">
            <h1 className="text-3xl font-bold text-primary tracking-tight">GeoDrill ID</h1>
            <p className="text-slate-500 text-sm">One account for all your geotechnical projects.</p>
        </div>
        
        <div className="flex rounded-xl bg-white p-1 shadow-sm mb-4 border border-slate-200">
            <button 
                type="button"
                className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-medium transition-all ${activeTab === 'create_company' ? 'bg-primary text-white shadow' : 'text-slate-500 hover:bg-slate-50'}`}
                onClick={() => setActiveTab('create_company')}
            >
                <Building2 size={14}/> Create Company
            </button>
            <button 
                type="button"
                className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-medium transition-all ${activeTab === 'join_company' ? 'bg-primary text-white shadow' : 'text-slate-500 hover:bg-slate-50'}`}
                onClick={() => setActiveTab('join_company')}
            >
                <UserPlus size={14}/> Join Company
            </button>
            <button 
                type="button"
                className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-medium transition-all ${activeTab === 'talent' ? 'bg-primary text-white shadow' : 'text-slate-500 hover:bg-slate-50'}`}
                onClick={() => setActiveTab('talent')}
            >
                <Star size={14}/> I am Talent
            </button>
        </div>

        <Card title={activeTab === 'create_company' ? "Setup Organization" : activeTab === 'join_company' ? "Join Organization" : "Register as Talent"}>
          <form onSubmit={handleSubmit} className="space-y-4">
            
            {/* Compact Personal Info */}
            <div className="grid grid-cols-2 gap-3">
                <Input className="h-10 text-sm" label="First Name" value={firstName} onChange={e => setFirstName(e.target.value)} required />
                <Input className="h-10 text-sm" label="Last Name" value={lastName} onChange={e => setLastName(e.target.value)} required />
            </div>

            <div className="grid grid-cols-1 gap-3">
                <div className="relative">
                    <label className="block text-xs font-medium text-slate-700 mb-1">Mobile Number</label>
                    <div className="flex">
                        <div className="relative">
                            <button 
                                type="button" 
                                className="h-10 px-3 bg-slate-50 border border-r-0 border-slate-300 rounded-l-lg text-sm font-medium text-slate-700 flex items-center min-w-[80px] justify-between"
                                onClick={() => setShowCountrySelect(!showCountrySelect)}
                            >
                                {countryCode}
                            </button>
                            {showCountrySelect && (
                                <div className="absolute top-full left-0 mt-1 w-64 bg-white border border-slate-200 shadow-xl rounded-lg z-50 max-h-60 overflow-hidden flex flex-col">
                                    <div className="p-2 border-b">
                                        <div className="relative">
                                            <Search size={12} className="absolute left-2 top-2 text-slate-400"/>
                                            <input 
                                                autoFocus
                                                className="w-full pl-7 pr-2 py-1 text-xs border rounded bg-slate-50 focus:outline-none focus:border-primary" 
                                                placeholder="Search country..."
                                                value={countrySearch}
                                                onChange={e => setCountrySearch(e.target.value)}
                                            />
                                        </div>
                                    </div>
                                    <div className="overflow-y-auto flex-1">
                                        {filteredCountries.map(c => (
                                            <div 
                                                key={c.code} 
                                                className="px-3 py-2 hover:bg-slate-50 cursor-pointer text-xs flex justify-between items-center"
                                                onClick={() => { setCountryCode(c.code); setShowCountrySelect(false); }}
                                            >
                                                <span>{c.country}</span>
                                                <span className="font-mono text-slate-500">{c.code}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                        <input 
                            className="flex-1 h-10 px-3 border border-slate-300 rounded-r-lg text-sm focus:ring-2 focus:ring-primary focus:outline-none"
                            placeholder="9123456789"
                            value={mobile}
                            onChange={e => setMobile(e.target.value)}
                            required
                        />
                    </div>
                </div>
                <Input className="h-10 text-sm" label="Email" type="email" value={email} onChange={e => setEmail(e.target.value)} required />
            </div>

            <div className="grid grid-cols-2 gap-3">
                 <Input className="h-10 text-sm" label="Password" type="password" value={password} onChange={e => setPassword(e.target.value)} required />
                 <Input className="h-10 text-sm" label="Confirm Password" type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} required />
            </div>

            {/* Context Specifics */}
            
            {activeTab === 'create_company' && (
                <div className="bg-blue-50 p-3 rounded-lg border border-blue-100 text-sm">
                    <h3 className="text-blue-800 font-bold mb-2 flex items-center gap-1"><Building2 size={14}/> Company Info</h3>
                    <div className="space-y-3">
                        <Input
                            className="h-10 text-sm"
                            label="Company Name"
                            value={companyName}
                            onChange={(e) => setCompanyName(e.target.value)}
                            required
                        />
                         <div>
                            <label className="block text-xs font-medium text-slate-700 mb-1">Industry</label>
                            <select 
                                className="w-full h-10 px-3 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-primary focus:outline-none"
                                value={industry}
                                onChange={(e: any) => setIndustry(e.target.value)}
                            >
                                <option value="Geotechnical">Geotechnical</option>
                                <option value="Geophysical">Geophysical</option>
                                <option value="Mixed">Mixed</option>
                            </select>
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'join_company' && (
                <div className="bg-orange-50 p-3 rounded-lg border border-orange-100 text-sm">
                     <h3 className="text-orange-800 font-bold mb-2 flex items-center gap-1"><UserPlus size={14}/> Join Request</h3>
                    
                    <div className="mb-3">
                        <label className="block text-xs font-medium text-slate-800 mb-1">Are you joining:</label>
                        <div className="grid grid-cols-2 gap-2">
                            {['OFFICE', 'FIELD'].map((intent) => (
                                <button
                                    key={intent}
                                    type="button"
                                    className={`py-2 text-xs font-medium rounded border transition-all ${joinIntent === intent ? 'bg-orange-600 text-white border-orange-600 shadow' : 'bg-white text-slate-600 hover:bg-orange-50'}`}
                                    onClick={() => setJoinIntent(intent as any)}
                                >
                                    {intent === 'OFFICE' ? 'Office' : 'Workforce'}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="space-y-3">
                        {joinIntent === 'OFFICE' && (
                             <Input
                                className="h-10 text-sm"
                                label="Company Code"
                                value={companyCode}
                                onChange={(e) => setCompanyCode(e.target.value)}
                                required
                            />
                        )}
                        {joinIntent === 'FIELD' && (
                             <Input
                                className="h-10 text-sm"
                                label="Project Code"
                                value={projectCode}
                                onChange={(e) => setProjectCode(e.target.value)}
                                required
                            />
                        )}
                    </div>
                </div>
            )}

            {error && <p className="text-red-500 text-xs font-bold bg-red-50 p-2 rounded">{error}</p>}
            
            <Button type="submit" className="w-full mt-2" size="md">
              {activeTab === 'create_company' ? 'Register Company' : activeTab === 'join_company' ? 'Submit Join Request' : 'Create Talent Account'}
            </Button>
            
            <div className="text-center mt-3 text-xs text-slate-600">
              Already have an account? <Link to="/login" className="text-accent hover:underline font-medium">Login</Link>
            </div>
          </form>
        </Card>
      </div>
    </div>
  );
};
