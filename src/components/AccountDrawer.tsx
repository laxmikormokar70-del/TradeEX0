import React from 'react';
import { useAuth } from '../store/AuthContext';
import { useTradingContext } from '../store/TradingContext';
import { motion, AnimatePresence } from 'motion/react';
import { X, User, ShieldCheck, FileCheck, Settings, LogOut, ChevronRight, Activity } from 'lucide-react';

export default function AccountDrawer({ onNavigate }: { onNavigate?: (tab: string) => void }) {
  const { user, profile, isProfileOpen, setIsProfileOpen, signOut } = useAuth();
  const { accountMode, setAccountMode } = useTradingContext();

  const handleMenuClick = (subtab: string) => {
    try {
      localStorage.setItem('account_active_subtab', subtab);
    } catch (e) {}
    setIsProfileOpen(false);
    if (onNavigate) {
      onNavigate('account');
    }
  };

  return (
    <AnimatePresence>
      {isProfileOpen && (
        <div className="fixed inset-0 z-[200] flex justify-end">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsProfileOpen(false)}
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
          />

          {/* Drawer Content */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300, mass: 0.8 }}
            className="relative w-full max-w-[420px] h-full bg-white shadow-2xl flex flex-col z-[210] border-l border-[#FFD6A5]/30"
          >
            {/* Header */}
            <div className="p-5 flex items-center justify-between border-b border-[#FFD6A5]/45 bg-gradient-to-r from-white to-[#FFF8F0]">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-[#FFF8F0] flex items-center justify-center border border-[#FFD6A5]">
                  <Settings className="w-5 h-5 text-[#FF8A00]" />
                </div>
                <span className="font-extrabold text-[16px] text-slate-800 uppercase tracking-wider">Account Operations</span>
              </div>
              <button 
                onClick={() => setIsProfileOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-50 border border-slate-200 hover:bg-slate-100 flex items-center justify-center text-slate-500 hover:text-slate-800 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Profile Summary Card */}
            <div className="flex-1 overflow-y-auto p-5 space-y-6">
              <div className="bg-gradient-to-br from-[#FFFDFB] to-white p-5 rounded-[22px] border border-[#FFD6A5]/40 shadow-3xs flex items-center gap-4">
                <div className="w-14 h-14 rounded-full bg-[#FFF8F0] ring-4 ring-[#FFE3C8] flex items-center justify-center text-[#FF8A00] font-sans font-bold text-[18px] overflow-hidden">
                  {user?.photoURL || profile?.profilePhoto ? (
                    <img src={user?.photoURL || profile?.profilePhoto} alt="Avatar" className="w-full h-full object-cover" />
                  ) : (
                    <User size={24} />
                  )}
                </div>
                <div className="flex flex-col flex-1 min-w-0">
                  <span className="font-extrabold text-[16px] text-slate-800 truncate leading-tight">
                    {profile?.name || user?.displayName || 'Rahul Sharma'}
                  </span>
                  <span className="text-[13px] font-medium text-slate-500 truncate mt-0.5">
                    {user?.email}
                  </span>
                  <div className="flex items-center gap-1.5 mt-1">
                    <span className="bg-[#FFF8F0] text-[#FF8A00] px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border border-[#FFD6A5]">
                      Premium
                    </span>
                    <span className="text-[11px] font-mono text-slate-400">
                      UID: {profile?.customUid || user?.uid?.substring(0, 8)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Mode Switcher */}
              <div className="bg-slate-50 p-4 rounded-[20px] border border-slate-100 flex items-center justify-between shadow-3xs cursor-pointer hover:bg-slate-100 transition-all"
                   onClick={() => setAccountMode(accountMode === 'demo' ? 'real' : 'demo')}>
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${accountMode === 'real' ? 'bg-emerald-100 text-emerald-600' : 'bg-amber-100 text-amber-600'}`}>
                    <Activity size={20} />
                  </div>
                  <div className="flex flex-col">
                    <span className="font-bold text-[14px] text-slate-800">Account Mode</span>
                    <span className="text-[12px] font-medium text-slate-500">
                      Currently using <strong className={accountMode === 'real' ? 'text-emerald-600' : 'text-amber-600 uppercase'}>{accountMode === 'real' ? 'Real Funds' : 'Demo Sandbox'}</strong>
                    </span>
                  </div>
                </div>
                <div className={`w-12 h-6 rounded-full flex items-center p-1 transition-all ${accountMode === 'real' ? 'bg-emerald-500 justify-end' : 'bg-slate-300 justify-start'}`}>
                  <div className="w-4 h-4 rounded-full bg-white shadow-sm"></div>
                </div>
              </div>

              {/* Menu Sections */}
              <div className="flex flex-col gap-3">
                <MenuAction icon={<User size={18} />} label="Personal Details" onClick={() => handleMenuClick('personal')} />
                <MenuAction icon={<ShieldCheck size={18} />} label="Security Settings" onClick={() => handleMenuClick('security')} />
                <MenuAction 
                  icon={<FileCheck size={18} />} 
                  label="KYC Verification" 
                  status={profile?.kycStatus === 'approved' || profile?.verified === true ? 'Verified' : profile?.kycStatus === 'pending' ? 'Pending' : 'Unverified'} 
                  statusColor={profile?.kycStatus === 'approved' || profile?.verified === true ? 'text-[#00C076]' : profile?.kycStatus === 'pending' ? 'text-amber-500' : 'text-slate-400'} 
                  onClick={() => handleMenuClick('compliance')} 
                />
                <MenuAction icon={<Settings size={18} />} label="Preferences & Locale" onClick={() => handleMenuClick('currency')} />
              </div>
            </div>

            {/* Footer / Logout */}
            <div className="p-5 border-t border-[#FFD6A5]/40 bg-white">
              <button 
                onClick={() => {
                  signOut();
                  setIsProfileOpen(false);
                }}
                className="w-full h-[50px] bg-[#FFF8F0] hover:bg-[#FFEFE2] text-[#FF4D4F] rounded-[16px] font-bold text-[15px] flex items-center justify-center gap-2 transition-colors border border-[#FFD6A5]/50"
              >
                <LogOut size={18} />
                Sign Out
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

function MenuAction({ icon, label, status, statusColor, onClick }: { icon: React.ReactNode, label: string, status?: string, statusColor?: string, onClick?: () => void }) {
  return (
    <button onClick={onClick} className="w-full flex items-center justify-between p-4 bg-white rounded-[16px] border border-[#FFD6A5]/30 hover:border-[#FFD6A5] hover:shadow-xs transition-all group cursor-pointer">
      <div className="flex items-center gap-3 text-slate-700 group-hover:text-[#FF8A00] transition-colors">
        <div className="w-9 h-9 rounded-full bg-[#FFF8F0] flex items-center justify-center">
          {icon}
        </div>
        <span className="font-bold text-[14px]">{label}</span>
      </div>
      <div className="flex items-center gap-2">
        {status && <span className={`text-[12px] font-bold ${statusColor}`}>{status}</span>}
        <ChevronRight size={18} className="text-slate-300 group-hover:text-[#FF8A00]" />
      </div>
    </button>
  );
}
