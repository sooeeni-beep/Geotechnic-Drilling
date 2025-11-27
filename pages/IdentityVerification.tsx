
import React, { useState } from 'react';
import { User, Address, VerificationStatus } from '../types';
import { db } from '../services/mockDb';
import { Button, Input, Card } from '../components/UI';
import { ShieldCheck, MapPin, Check, AlertTriangle, FileText, Smartphone, Mail } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface Props {
  user: User;
  onUpdate: (user: User) => void;
}

export const IdentityVerification: React.FC<Props> = ({ user, onUpdate }) => {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);

  // Verification States
  const [mobileVerified, setMobileVerified] = useState(false);
  const [emailVerified, setEmailVerified] = useState(false);
  const [mobileOtp, setMobileOtp] = useState('');
  const [emailOtp, setEmailOtp] = useState('');

  // Form Data
  const [nationalId, setNationalId] = useState(user.nationalId || '');
  const [address, setAddress] = useState<Address>(user.address || {
      country: '', state: '', city: '', mainStreet: '', plate: ''
  });

  const handleAddressChange = (field: keyof Address, value: string) => {
      setAddress(prev => ({ ...prev, [field]: value }));
  };

  // Simulation of OTP
  const sendMobileOtp = () => { alert(`OTP sent to ${user.countryCode} ${user.mobile}: 1234 (Or use 'TEST')`); };
  const verifyMobile = () => { 
      if (mobileOtp === '1234' || mobileOtp.toUpperCase() === 'TEST') setMobileVerified(true); 
      else alert('Invalid OTP'); 
  };
  
  const sendEmailOtp = () => { alert(`OTP sent to ${user.email}: 5678 (Or use 'TEST')`); };
  const verifyEmail = () => { 
      if (emailOtp === '5678' || emailOtp.toUpperCase() === 'TEST') setEmailVerified(true); 
      else alert('Invalid OTP'); 
  };

  const handleSubmit = () => {
    if (!nationalId) { alert("National ID required"); return; }
    if (!address.country || !address.city) { alert("Address incomplete"); return; }
    
    setLoading(true);
    try {
        // Mock file URLs - Resume is no longer part of this step
        const data = {
            address,
            nationalId,
            idCardUrl: 'mock_id_card.jpg'
        };
        const updatedUser = db.submitIdentityVerification(user.id, data);
        onUpdate(updatedUser);
        setTimeout(() => {
            alert("Identity Verification Submitted! Access Granted.");
            navigate('/portal');
        }, 1000);
    } catch(e: any) {
        alert(e.message);
        setLoading(false);
    }
  };

  const ProgressStep = ({ num, title, active }: any) => (
      <div className={`flex items-center gap-2 ${active ? 'text-primary' : 'text-slate-400'}`}>
          <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${active ? 'bg-primary text-white' : 'bg-slate-200 text-slate-500'}`}>
              {num}
          </div>
          <span className="text-sm font-medium hidden md:block">{title}</span>
      </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center py-10 px-4">
        <div className="w-full max-w-3xl">
            <div className="mb-8 text-center">
                <h1 className="text-3xl font-bold text-slate-800">Identity Verification</h1>
                <p className="text-slate-500 mt-2">Complete these steps to activate your GeoDrill account.</p>
            </div>

            <div className="flex justify-between items-center mb-8 px-10">
                <ProgressStep num={1} title="Contact" active={step >= 1} />
                <div className="h-0.5 bg-slate-200 flex-1 mx-4"></div>
                <ProgressStep num={2} title="Details" active={step >= 2} />
                <div className="h-0.5 bg-slate-200 flex-1 mx-4"></div>
                <ProgressStep num={3} title="Identity" active={step >= 3} />
            </div>

            <Card>
                {/* STEP 1: CONTACT VERIFICATION */}
                {step === 1 && (
                    <div className="space-y-6 animate-fadeIn">
                        <h2 className="text-xl font-bold flex items-center gap-2"><Smartphone className="text-accent"/> Contact Verification</h2>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            {/* Mobile */}
                            <div className="p-4 border rounded-xl bg-slate-50">
                                <div className="flex justify-between items-start mb-4">
                                    <div>
                                        <p className="font-bold text-slate-700">Mobile Number</p>
                                        <p className="text-sm text-slate-500">{user.countryCode} {user.mobile}</p>
                                    </div>
                                    {mobileVerified && <CheckCircle className="text-green-500" />}
                                </div>
                                {!mobileVerified ? (
                                    <div className="flex gap-2">
                                        <input className="w-24 p-2 text-sm border rounded" placeholder="OTP / TEST" value={mobileOtp} onChange={e => setMobileOtp(e.target.value)} />
                                        <Button size="sm" onClick={verifyMobile} disabled={!mobileOtp}>Verify</Button>
                                        <button onClick={sendMobileOtp} className="text-xs text-blue-600 underline">Send Code</button>
                                    </div>
                                ) : <span className="text-xs text-green-600 font-bold bg-green-100 px-2 py-1 rounded">Verified</span>}
                            </div>

                            {/* Email */}
                            <div className="p-4 border rounded-xl bg-slate-50">
                                <div className="flex justify-between items-start mb-4">
                                    <div>
                                        <p className="font-bold text-slate-700">Email Address</p>
                                        <p className="text-sm text-slate-500">{user.email}</p>
                                    </div>
                                    {emailVerified && <CheckCircle className="text-green-500" />}
                                </div>
                                {!emailVerified ? (
                                    <div className="flex gap-2">
                                        <input className="w-24 p-2 text-sm border rounded" placeholder="OTP / TEST" value={emailOtp} onChange={e => setEmailOtp(e.target.value)} />
                                        <Button size="sm" onClick={verifyEmail} disabled={!emailOtp}>Verify</Button>
                                        <button onClick={sendEmailOtp} className="text-xs text-blue-600 underline">Send Code</button>
                                    </div>
                                ) : <span className="text-xs text-green-600 font-bold bg-green-100 px-2 py-1 rounded">Verified</span>}
                            </div>
                        </div>

                        <div className="flex justify-end mt-4">
                            <Button onClick={() => setStep(2)} disabled={!mobileVerified || !emailVerified}>Next: Personal Details</Button>
                        </div>
                    </div>
                )}

                {/* STEP 2: DETAILS */}
                {step === 2 && (
                    <div className="space-y-6 animate-fadeIn">
                        <h2 className="text-xl font-bold flex items-center gap-2"><MapPin className="text-accent"/> Personal & Address</h2>
                        
                        <div className="space-y-4">
                            <Input label="National ID / Passport Number" value={nationalId} onChange={e => setNationalId(e.target.value)} required />
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <Input label="Country" value={address.country} onChange={e => handleAddressChange('country', e.target.value)} required />
                                <Input label="State/Province" value={address.state} onChange={e => handleAddressChange('state', e.target.value)} required />
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <Input label="City" value={address.city} onChange={e => handleAddressChange('city', e.target.value)} required />
                                <Input label="Zip/Postal Code" value={address.zipCode || ''} onChange={e => handleAddressChange('zipCode', e.target.value)} required />
                                <Input label="Plate No." value={address.plate} onChange={e => handleAddressChange('plate', e.target.value)} required />
                            </div>
                            <Input label="Main Street Address" value={address.mainStreet} onChange={e => handleAddressChange('mainStreet', e.target.value)} required />
                        </div>

                        <div className="flex justify-between mt-6">
                            <Button variant="outline" onClick={() => setStep(1)}>Back</Button>
                            <Button onClick={() => setStep(3)}>Next: Documents</Button>
                        </div>
                    </div>
                )}

                {/* STEP 3: DOCUMENTS */}
                {step === 3 && (
                    <div className="space-y-6 animate-fadeIn">
                        <h2 className="text-xl font-bold flex items-center gap-2"><FileText className="text-accent"/> Document Upload</h2>
                        
                        <div className="grid grid-cols-1 gap-6">
                            <div className="border-2 border-dashed border-slate-300 rounded-xl p-6 text-center hover:bg-slate-50 transition-colors cursor-pointer">
                                <div className="bg-blue-50 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3 text-blue-600">
                                    <ShieldCheck size={24}/>
                                </div>
                                <h3 className="font-bold text-slate-800">ID Card / Passport</h3>
                                <p className="text-xs text-slate-500 mt-1">Upload clear front/back photo to verify your identity.</p>
                                <Button size="sm" variant="outline" className="mt-4">Select File</Button>
                            </div>
                        </div>

                        <div className="mt-4 text-xs text-slate-500 text-center">
                            Note: You can upload your Resume/CV in your Profile section after verification.
                        </div>

                        <div className="flex justify-between mt-6">
                            <Button variant="outline" onClick={() => setStep(2)}>Back</Button>
                            <Button onClick={handleSubmit} isLoading={loading} className="bg-green-600 hover:bg-green-700">Submit Verification</Button>
                        </div>
                    </div>
                )}
            </Card>
        </div>
    </div>
  );
};

const CheckCircle = ({ className }: { className?: string }) => (
    <svg className={`w-5 h-5 ${className}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
);
