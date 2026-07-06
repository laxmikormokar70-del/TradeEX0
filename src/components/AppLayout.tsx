import React, { useState, useEffect } from 'react';
import { useTradingContext } from '../store/TradingContext';
import { useAuth } from '../store/AuthContext';
import { Home, LineChart, ArrowLeftRight, Clock, Briefcase, User, Search, Bell, Grid, Headset, MoreHorizontal, ChevronRight, ArrowUpRight, ArrowDownRight, ScanLine, Wallet, Sun, Moon, CheckCircle, Shield } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

import HomePage from '../pages/Home';
import TradePage from '../pages/Trade';
import ChartsPage from '../pages/Charts';
import MarketsPage from '../pages/Markets';
import PortfolioPage from '../pages/Portfolio';
import AccountPage from '../pages/Account';
import DepositPage from '../pages/Deposit';
import LoginPage from '../pages/Login';
import SignupPage from '../pages/Signup';
import AdminDashboardPage from '../pages/AdminDashboard';
import WithdrawPage from '../pages/Withdraw';
import MorePage from '../pages/More';
import PnLAnalyticsPage from '../pages/PnLAnalytics';
import TradingLedgerPage from '../pages/TradingLedger';
import SupportPage from '../pages/Support';
import DisplayCurrencyPage from '../pages/DisplayCurrency';
import NotificationsPage from '../pages/Notifications';
import AccountDrawer from './AccountDrawer';
import TradeEXLogo from './TradeEXLogo';
import { db } from '../lib/firebase';
import { collection, query, where, onSnapshot } from 'firebase/firestore';

export default function AppLayout() {
  const { theme, toggleTheme, accountMode, setAccountMode } = useTradingContext();
  const { user, profile, setIsProfileOpen } = useAuth();
  const [activeTab, setActiveTab ] = useState('home');

  const isAdmin = user && user.email === 'laxmikormokar70@gmail.com';

  const [unreadNotifCount, setUnreadNotifCount] = useState(0);

  useEffect(() => {
    if (!user) {
      setUnreadNotifCount(0);
      return;
    }

    const depositsQuery = query(
      collection(db, 'deposits'),
      where('uid', '==', user.uid)
    );

    const withdrawalsQuery = query(
      collection(db, 'withdrawals'),
      where('uid', '==', user.uid)
    );

    let depositsList: any[] = [];
    let withdrawalsList: any[] = [];

    const calculateUnreadCount = () => {
      const activeReadStates = JSON.parse(localStorage.getItem('user_notif_read_states_v5') || '{}');
      let count = 0;

      // Welcome notif is unread by default if not marked read
      if (activeReadStates['welcome-notif'] !== false) {
        count++;
      }

      // Deposits
      depositsList.forEach((dep) => {
        const depId = `dep-${dep.id}`;
        const isRead = activeReadStates[depId] !== undefined ? !activeReadStates[depId] : (dep.status === 'approved');
        if (!isRead) {
          count++;
        }
      });

      // Withdrawals
      withdrawalsList.forEach((wth) => {
        const wthId = `wth-${wth.id}`;
        const isRead = activeReadStates[wthId] !== undefined ? !activeReadStates[wthId] : (wth.status === 'approved');
        if (!isRead) {
          count++;
        }
      });

      // KYC submission
      if (profile?.kycStatus && profile.kycStatus !== 'not_started') {
        const kycId = 'kyc-notif';
        const isRead = activeReadStates[kycId] !== undefined ? !activeReadStates[kycId] : (profile.kycStatus === 'approved');
        if (!isRead) {
          count++;
        }
      }

      setUnreadNotifCount(count);
    };

    const unsubDeps = onSnapshot(depositsQuery, (snap) => {
      depositsList = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      calculateUnreadCount();
    });

    const unsubWths = onSnapshot(withdrawalsQuery, (snap) => {
      withdrawalsList = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      calculateUnreadCount();
    });

    // Also update on custom event trigger if read states modify
    const handleRefresh = () => calculateUnreadCount();
    window.addEventListener('refresh-notifications', handleRefresh);

    calculateUnreadCount();

    return () => {
      unsubDeps();
      unsubWths();
      window.removeEventListener('refresh-notifications', handleRefresh);
    };
  }, [user, profile]);

  useEffect(() => {
    if (user?.email === 'laxmikormokar70@gmail.com') {
      if (activeTab !== 'admin_dashboard') {
        setActiveTab('admin_dashboard');
      }
    } else {
      if (activeTab === 'admin_dashboard') {
        setActiveTab('home');
      }
    }
  }, [user, activeTab]);

  useEffect(() => {
    // window.scrollTo({ top: 0, behavior: 'auto' });
    const scrollContainer = document.getElementById('main-scroll-container');
    if (scrollContainer) {
      scrollContainer.scrollTo({ top: 0, behavior: 'auto' });
    }
  }, [activeTab]);

  const mobileNavItems = [
    { id: 'home', icon: Home, label: 'Home' },
    { id: 'markets', icon: Grid, label: 'Markets' },
    { id: 'trade', icon: ArrowLeftRight, label: 'Trade' },
    { id: 'charts', icon: LineChart, label: 'Charts' },
    { id: 'portfolio', icon: Briefcase, label: 'Portfolio' },
    ...(isAdmin ? [{ id: 'admin_dashboard', icon: Shield, label: 'Admin HQ' }] : [])
  ];

  const desktopNavItems = isAdmin 
    ? [{ id: 'admin_dashboard', icon: Shield, label: 'Admin HQ' }]
    : [
        { id: 'home', icon: Home, label: 'Home' },
        { id: 'markets', icon: Grid, label: 'Markets' },
        { id: 'trade', icon: ArrowLeftRight, label: 'Trade' },
        { id: 'portfolio', icon: Briefcase, label: 'Portfolio' }
      ];

  return (
    <div className="flex flex-col bg-bg-base min-h-screen h-screen overflow-hidden text-slate-800">
      {/* Top Header */}
      <header className="hidden md:flex items-center justify-between px-5 md:px-8 py-3 bg-surface border-b border-brand-light/30 shrink-0 shadow-3xs">
        <div className="flex items-center gap-8">
          {/* Logo */}
          <div 
            onClick={() => setActiveTab('home')}
            className="flex items-center gap-3 font-sans font-bold text-[18px] md:text-[20px] text-text-main cursor-pointer select-none transition-all group duration-300"
          >
            <div className="w-[54px] h-[54px] md:w-[64px] md:h-[64px] flex items-center justify-center group-hover:scale-105 transition-all">
              <TradeEXLogo />
            </div>
            <div className="flex flex-col">
              <span className="tracking-tight leading-none pt-0.5 font-black text-slate-900 text-transparent bg-clip-text bg-gradient-to-r from-[#FF4500] to-[#FFA500] text-xl" style={{ letterSpacing: "-0.5px" }}>TradeEX</span>
              <span className="text-[10px] font-mono text-slate-400 font-bold uppercase tracking-wider mt-0.5">Premium Trading</span>
            </div>
          </div>
          
          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-1.5 ml-4">
            {desktopNavItems.map((item) => (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs uppercase tracking-wider transition-all duration-200 cursor-pointer ${
                  activeTab === item.id 
                    ? 'text-white bg-brand font-black shadow-3xs scale-[1.02]'
                    : 'text-text-muted hover:text-brand hover:bg-bg-sec/50 font-bold'
                }`}
              >
                <item.icon size={15} className={activeTab === item.id ? 'stroke-[2.5px]' : ''} />
                <span>{item.label}</span>
              </button>
            ))}
          </nav>
        </div>

        {/* Right Corner Area - Premium Profile Area Redesign */}
        <div className="flex items-center gap-4">
          <button 
            onClick={() => setAccountMode(accountMode === 'demo' ? 'real' : 'demo')}
            className={`hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full border shadow-3xs cursor-pointer transition-all hover:scale-105 ${
              accountMode === 'real' 
                ? 'bg-emerald-50 border-emerald-100' 
                : 'bg-amber-50 border-amber-100'
            }`}
            title="Switch Account Mode"
          >
            <span className={`w-2 h-2 rounded-full animate-pulse ${
              accountMode === 'real' ? 'bg-emerald-500' : 'bg-amber-500'
            }`}></span>
            <span className={`text-[10px] font-black uppercase tracking-wider ${
              accountMode === 'real' ? 'text-emerald-700' : 'text-amber-700'
            }`}>
              {accountMode === 'real' ? 'Real' : 'Demo'}
            </span>
          </button>
          
          {user ? (
            <div 
              className="hidden lg:flex items-center gap-3.5 px-4.5 py-2 hover:bg-slate-50 border border-slate-100 rounded-[16px] cursor-pointer transition-all duration-200" 
              onClick={() => setActiveTab('account')}
            >
              {/* Profile Picture */}
              <div className="relative shrink-0 select-none">
                <div className="w-9 h-9 rounded-full bg-[#FFF8F0] flex items-center justify-center shrink-0 border border-[#FFD6A5] text-[#FF8A00] font-sans font-bold text-[14px] overflow-hidden shadow-3xs">
                  <img src={user.photoURL || profile?.profilePhoto || `https://api.dicebear.com/7.x/adventurer/svg?seed=${user.uid}`} alt="avatar" className="w-full h-full object-cover" />
                </div>
                {profile?.verified === true && (
                  <div className="absolute -bottom-0.5 -right-0.5 bg-[#F97316] text-white rounded-full p-[2px] border border-white shadow-3xs" title="Identity Verified">
                    <CheckCircle size={9} className="stroke-[2.5]" />
                  </div>
                )}
              </div>

              {/* User Name, Email, UID & Account Status */}
              <div className="flex flex-col space-y-0.5 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-black text-slate-800 leading-none truncate max-w-[120px]">
                    {profile?.name || user.displayName || user.email?.split('@')[0]}
                  </span>
                  
                  {/* Verified Badge */}
                  {profile?.verified === true && (
                    <span className="inline-flex items-center text-[8px] bg-orange-50 font-black text-[#F97316] border border-orange-100 px-1 py-0.2 rounded uppercase leading-none scale-90">
                      verified
                    </span>
                  )}
                </div>

                {/* Email address */}
                <span className="text-[10px] font-medium text-slate-400 truncate max-w-[160px] leading-none">
                  {user.email}
                </span>

                {/* UID and status info row */}
                <div className="flex items-center gap-1.5 pt-0.5 select-none text-[9.5px]">
                  <span className="font-mono font-black text-slate-500 bg-slate-100/80 border border-slate-200/50 px-1 py-0.2 rounded-md">
                    {profile?.customUid || 'DX-82475193'}
                  </span>
                  <span className="w-1 h-1 bg-slate-300 rounded-full"></span>
                  <span className="font-black text-emerald-600 uppercase tracking-wider scale-90 leading-none">
                    Active
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <div 
              className="hidden lg:flex items-center gap-3.5 px-4.5 py-2 hover:bg-slate-50 border border-slate-100 rounded-[16px] cursor-pointer transition-all duration-200" 
              onClick={() => setActiveTab('login')}
            >
              <div className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center shrink-0 border border-slate-200 text-slate-400">
                <User size={18} />
              </div>
              <div className="flex flex-col">
                <span className="text-xs font-black text-slate-700 leading-none">Guest Gateway</span>
                <span className="text-[10px] font-medium text-slate-400 mt-1 leading-none">Non-Authenticated</span>
              </div>
            </div>
          )}
          
          {/* Action buttons */}
          <div className="flex items-center gap-1.5">
            <button 
              onClick={() => setActiveTab('notifications')}
              className="hidden md:flex w-9 h-9 items-center justify-center rounded-full border border-slate-100 bg-white text-slate-400 hover:text-brand hover:border-brand/40 shadow-3xs cursor-pointer transition-colors relative" 
              title="Notifications"
            >
              <Bell size={16} />
              {unreadNotifCount > 0 && (
                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 border border-white rounded-full animate-pulse" />
              )}
            </button>
            <button onClick={() => setActiveTab('portfolio')} className="hidden md:flex w-9 h-9 items-center justify-center rounded-full border border-slate-100 bg-white text-slate-400 hover:text-brand hover:border-brand/40 shadow-3xs cursor-pointer transition-colors" title="Portfolio Assets">
              <Wallet size={16} />
            </button>
            <button onClick={() => user ? setIsProfileOpen(true) : setActiveTab('login')} className="w-9 h-9 flex items-center justify-center rounded-full border border-slate-100 bg-white text-slate-400 hover:text-brand hover:border-brand/40 shadow-3xs cursor-pointer transition-colors" title="User Operations Platform">
              <User size={16} />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col h-full bg-bg-base overflow-hidden relative">
        <div id="main-scroll-container" className="flex-1 overflow-y-auto pb-16 md:pb-0 h-full">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="h-full"
            >
              {activeTab === 'home' && <HomePage setActiveTab={setActiveTab} />}
              {activeTab === 'login' && (
                <LoginPage 
                  onNavigateToSignup={() => setActiveTab('signup')} 
                  onLoginSuccess={() => {
                    if (user?.email === 'laxmikormokar70@gmail.com') {
                      setActiveTab('admin_dashboard');
                    } else {
                      setActiveTab('home');
                    }
                  }} 
                />
              )}
              {activeTab === 'signup' && <SignupPage onNavigateToLogin={() => setActiveTab('login')} onSignupSuccess={() => setActiveTab('home')} />}
              {activeTab === 'trade' && <TradePage setActiveTab={setActiveTab} />}
              {activeTab === 'charts' && <ChartsPage setActiveTab={setActiveTab} />}
              {activeTab === 'markets' && <MarketsPage setActiveTab={setActiveTab} />}
              {activeTab === 'portfolio' && <PortfolioPage setActiveTab={setActiveTab} />}
              {activeTab === 'account' && <AccountPage setActiveTab={setActiveTab} />}
              {activeTab === 'deposit' && <DepositPage setActiveTab={setActiveTab} />}
              {activeTab === 'withdraw' && <WithdrawPage setActiveTab={setActiveTab} />}
              {activeTab === 'more' && <MorePage setActiveTab={setActiveTab} />}
              {activeTab === 'notifications' && <NotificationsPage setActiveTab={setActiveTab} />}
              {activeTab === 'analytics' && <PnLAnalyticsPage setActiveTab={setActiveTab} />}
              {activeTab === 'statistics' && <TradingLedgerPage setActiveTab={setActiveTab} />}
              {activeTab === 'support' && <SupportPage setActiveTab={setActiveTab} />}
              {activeTab === 'currency' && <DisplayCurrencyPage setActiveTab={setActiveTab} />}
              {activeTab === 'admin_dashboard' && <AdminDashboardPage />}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Global Drawer */}
        <AccountDrawer onNavigate={(tab) => setActiveTab(tab)} />

        {/* Mobile Bottom Navigation */}
        {activeTab !== 'admin_dashboard' && (
        <nav className="md:hidden bg-surface/80 backdrop-blur-xl border-t border-brand-light/20 fixed bottom-0 left-0 right-0 z-[100] supports-[backdrop-filter]:bg-surface/70">
          <div className="flex justify-around items-center h-16 pb-safe">
            {mobileNavItems.map((item) => (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`flex flex-col items-center justify-center w-full h-full gap-1 transition-all relative ${
                  activeTab === item.id ? 'text-brand' : 'text-text-muted hover:text-brand/70'
                }`}
              >
                <item.icon size={22} className={activeTab === item.id ? "stroke-[2.5px]" : "stroke-[1.5px]"} />
                <span className={`text-[10px] ${activeTab === item.id ? 'font-bold' : 'font-medium'}`}>
                  {item.label}
                </span>
                {activeTab === item.id && (
                  <motion.div layoutId="nav-indicator" className="absolute top-0 right-1/2 translate-x-1/2 w-6 h-[3px] bg-brand rounded-b-full shadow-[0_2px_8px_rgba(255,140,66,0.6)]" />
                )}
              </button>
            ))}
          </div>
        </nav>
        )}
      </main>
    </div>
  );
}
