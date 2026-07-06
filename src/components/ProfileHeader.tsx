import React, { useState } from 'react';
import { useAuth } from '../store/AuthContext';
import { User, CheckCircle, Calendar, Hash, ShieldCheck, Mail, LogOut, Copy, Check } from 'lucide-react';
import { motion } from 'motion/react';

interface ProfileHeaderProps {
  onLogoutClick?: () => void;
  showLogout?: boolean;
}

export default function ProfileHeader({ onLogoutClick, showLogout = true }: ProfileHeaderProps) {
  const { user, profile, signOut } = useAuth();
  const [copiedUid, setCopiedUid] = useState(false);

  const refCode = profile?.customUid || 'DX-82475193';
  const email = profile?.email || user?.email || 'user@example.com';
  const name = profile?.name || 'Rahul Sharma';
  
  // Format join date securely
  const joinDate = profile?.createdAt 
    ? new Date(profile.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long' }) 
    : 'June 2026';

  const handleCopyUid = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(refCode);
    setCopiedUid(true);
    setTimeout(() => setCopiedUid(false), 2000);
  };

  return (
    <div className="bg-gradient-to-br from-white via-white to-orange-50/20 rounded-[24px] p-5 sm:p-6 md:p-7 shadow-sm border border-slate-100 hover:border-orange-200/50 transition-all duration-300">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
        
        {/* Profile Card Main Info Wrapper */}
        <div className="flex flex-col sm:flex-row items-center sm:items-start lg:items-center gap-5 text-center sm:text-left">
          
          {/* 1. Profile Picture Placeholder with status badge */}
          <div className="relative shrink-0 select-none group">
            <div className="w-18 h-18 sm:w-20 sm:h-20 rounded-full bg-[#FFF7ED] border-4 border-orange-100/80 group-hover:border-orange-200/80 flex items-center justify-center text-[#F97316] relative transition-all duration-300 shadow-3xs overflow-hidden">
              {profile?.profilePhoto || user?.photoURL ? (
                <img 
                  src={profile?.profilePhoto || user?.photoURL || ''} 
                  alt="Profile Avatar" 
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover rounded-full" 
                />
              ) : (
                <User size={34} className="stroke-[1.75]" />
              )}
            </div>
            {profile?.verified === true && (
              <motion.div 
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="absolute -bottom-1 -right-0.5 bg-[#F97316] text-white rounded-full p-1.5 border-2 border-white shadow-3xs z-10 cursor-help"
                title="Identity Secured & Verified"
              >
                <CheckCircle size={12} className="stroke-[2.5]" />
              </motion.div>
            )}
          </div>

          {/* 2. User info name/email, metadata elements */}
          <div className="space-y-2 flex-1 min-w-0">
            <div className="flex flex-col sm:flex-row sm:items-center justify-center sm:justify-start gap-2 flex-wrap">
              <h2 className="text-[20px] sm:text-[23px] font-black text-slate-800 tracking-tight leading-none">
                {name}
              </h2>
              {profile?.verified === true && (
                <div className="inline-flex items-center gap-1 bg-orange-50/80 border border-orange-100/80 text-orange-600 px-2.5 py-0.5 rounded-full text-[10px] font-black tracking-wider uppercase select-none w-fit mx-auto sm:mx-0">
                  <ShieldCheck size={11} className="stroke-[2.5]" />
                  <span>Verified</span>
                </div>
              )}
            </div>

            {/* Email Address */}
            <div className="flex items-center justify-center sm:justify-start gap-1 text-slate-500 font-medium text-[12.5px] leading-none">
              <Mail size={13} className="text-slate-400 stroke-[1.8]" />
              <span className="truncate max-w-[280px]">{email}</span>
            </div>

            {/* Bottom Row metadata: UID, Account Status, Join Date */}
            <div className="pt-2 flex flex-wrap items-center justify-center sm:justify-start gap-x-4 gap-y-2 border-t border-slate-100 mt-2">
              
              {/* UID */}
              <div 
                onClick={handleCopyUid}
                className="inline-flex items-center gap-1 text-[11.5px] font-bold text-slate-400 hover:text-orange-500 transition-colors cursor-pointer group/uid"
                title="Click to copy unique signature identifier"
              >
                <span className="uppercase text-[10px] tracking-wider font-black text-slate-400">UID:</span>
                <span className="font-mono font-black text-slate-700 bg-slate-50 group-hover/uid:bg-orange-50 border border-slate-200/60 px-2 py-0.5 rounded-lg transition-colors ml-0.5">
                  {refCode}
                </span>
                {copiedUid ? (
                  <Check size={12} className="text-orange-600 animate-pulse ml-0.5" />
                ) : (
                  <Copy size={11} className="text-slate-400 group-hover/uid:text-orange-500 transition-colors opacity-0 group-hover/uid:opacity-100 ml-0.5" />
                )}
              </div>

              {/* Bullet divider */}
              <div className="w-1 h-1 rounded-full bg-slate-200 hidden sm:block"></div>

              {/* Account Status */}
              <div className="inline-flex items-center gap-1.5 text-[11.5px] font-semibold text-slate-500">
                <span className="uppercase text-[10px] tracking-wider font-black text-slate-400">Status:</span>
                <span className="bg-emerald-50 text-emerald-600 border border-emerald-100 font-extrabold px-2.5 py-0.5 rounded-md text-[11px] uppercase tracking-wide leading-none">
                  Active
                </span>
              </div>

              {/* Bullet divider */}
              <div className="w-1 h-1 rounded-full bg-slate-200 hidden sm:block"></div>

              {/* Join Date */}
              <div className="inline-flex items-center gap-1 text-[11.5px] font-semibold text-slate-500">
                <Calendar size={12} className="text-slate-400 stroke-[1.8]" />
                <span className="uppercase text-[10px] tracking-wider font-black text-slate-400 mr-[1px]">Joined:</span>
                <span className="text-slate-600 font-extrabold">{joinDate}</span>
              </div>

            </div>

          </div>

        </div>

        {/* 3. Action Buttons - Logout Gateway */}
        {showLogout && (
          <div className="flex shrink-0 w-full lg:w-auto border-t lg:border-t-0 border-slate-100 pt-4 lg:pt-0">
            <button 
              onClick={onLogoutClick || signOut} 
              className="flex items-center justify-center gap-2 w-full lg:w-auto px-5 py-2.5 text-slate-500 hover:text-red-600 font-black bg-slate-50 hover:bg-red-50/50 transition-all rounded-xl border border-slate-200 hover:border-red-100 text-[11px] uppercase tracking-wider cursor-pointer shadow-3xs"
            >
              <LogOut size={13} className="stroke-[2]" />
              <span>Log Out Gateway</span>
            </button>
          </div>
        )}

      </div>
    </div>
  );
}
