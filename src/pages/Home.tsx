import React, { useState, useEffect, useRef } from 'react';
import { useTradingContext, formatINR, formatUSD } from '../store/TradingContext';
import { useAuth } from '../store/AuthContext';
import UnrealizedPNLPulse from '../components/UnrealizedPNLPulse';
import { TickerData } from '../types';
import { Eye, EyeOff, Zap, Wallet, BarChart2, ShieldCheck, Activity, Headphones, ArrowDownToLine, Settings, Bell, User, Search, ChevronDown, Star, Sun, Moon, Phone, Mail, CheckCircle2, X, Send, MessageSquare, ScanLine, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { db } from '../lib/firebase';
import { collection, addDoc, query, where, onSnapshot } from 'firebase/firestore';

export default function HomePage({ setActiveTab }: { setActiveTab: (tab: string) => void }) {
  const { accountBalance, positions, tickers, currentPrices, setSelectedPair, theme, toggleTheme, pendingOrders, accountMode, setAccountMode } = useTradingContext();
  const { user, profile, setIsProfileOpen, getCurrentSecurityCode, getSecurityCodeTimeRemaining, updateProfileData } = useAuth();

    // 🎫 Support & Helpdesk Ticket Generation Modal States
  const [showSupportModal, setShowSupportModal] = useState(false);
  const [supportName, setSupportName] = useState('');
  const [supportEmail, setSupportEmail] = useState('');
  const [supportPhone, setSupportPhone] = useState('');
  const [supportCategory, setSupportCategory] = useState('General');
  const [supportMessage, setSupportMessage] = useState('');
  const [supportSubmitting, setSupportSubmitting] = useState(false);
  const [supportSuccess, setSupportSuccess] = useState(false);

  const handleSupportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (supportSubmitting) return;
    setSupportSubmitting(true);
    try {
      const ticketPayload = {
        uid: user?.uid || 'anonymous_guest',
        name: supportName || 'Guest User',
        email: supportEmail || 'no-email@exchange.com',
        phone: supportPhone || 'Not Provided',
        subject: `Help request: ${supportCategory}`,
        category: supportCategory,
        message: supportMessage,
        status: 'open',
        createdAt: new Date().toISOString()
      };

      // 1. Create support ticket document in Firestore tickets collection
      await addDoc(collection(db, 'tickets'), ticketPayload);

      // 2. Add an Admin Notification so it instantly pops up on Admin Dashboard
      await addDoc(collection(db, 'admin_notifications'), {
        title: 'New Support Ticket Raised',
        message: `${ticketPayload.name} (Phone: ${ticketPayload.phone}) submitted a ${supportCategory} grievance.`,
        type: 'ticket',
        createdAt: new Date().toISOString(),
        read: false
      });

      // 3. Update their user profile with the phone number if they changed/added it
      if (user && profile && supportPhone && profile.phone !== supportPhone) {
        await updateProfileData({ phone: supportPhone });
      }

      setSupportSuccess(true);
    } catch (err: any) {
      console.error('Error raising support ticket:', err);
      alert('Error raising support ticket: ' + err.message);
    } finally {
      setSupportSubmitting(false);
    }
  };
  
  useEffect(() => {
    const handleNavigate = (e: any) => {
      setSelectedPair(e.detail.symbol);
      setActiveTab('charts');
    };
    window.addEventListener('navigate-to-charts', handleNavigate);
    return () => window.removeEventListener('navigate-to-charts', handleNavigate);
  }, [setSelectedPair, setActiveTab]);

  const currencyPreference = profile?.currencyPreference || localStorage.getItem('currency_preference') || 'USDT';

  const formatPref = (usdVal: number, inrVal: number) => {
    return currencyPreference === 'INR' ? formatINR(inrVal) : formatUSD(usdVal);
  };

  const formatAlt = (usdVal: number, inrVal: number) => {
    return currencyPreference === 'INR' ? formatUSD(usdVal) : formatINR(inrVal);
  };

  const [showBalance, setShowBalance] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  
  // 🔔 Notifications State
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);

  useEffect(() => {
    if (!user) {
      setNotifications([]);
      return;
    }

    // 1. Establish query observers for deposits & withdrawals to load REAL data from Firestore (No fake!)
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

    const rebuildNotifications = () => {
      const activeReadStates = JSON.parse(localStorage.getItem('user_notif_read_states_v5') || '{}');
      const compiled: any[] = [];

      // A. Real Time dynamic system welcome notification for new accounts
      if (user.metadata.creationTime) {
        const welcomeId = 'welcome-notif';
        compiled.push({
          id: welcomeId,
          title: 'Welcome to TradeEX Family! 🎉',
          description: `Great to have you here, ${profile?.name || user.displayName || 'Trader'}! Your premium Futures & Multi-Asset trading account has been successfully generated and initialized.`,
          time: new Date(user.metadata.creationTime).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }),
          unread: activeReadStates[welcomeId] !== undefined ? activeReadStates[welcomeId] : true,
          type: 'security',
          icon: 'ShieldCheck'
        });
      }

      // B. REAL UPI deposits matching real database entries (Fully synced real time, no fakes!)
      depositsList.forEach((dep) => {
        const depId = `dep-${dep.id}`;
        const dateStr = dep.createdAt ? new Date(dep.createdAt).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Just now';
        
        let title = 'Deposit Approved Successfully ✅';
        let desc = `Excellent! Your mobile UPI deposit of ₹${dep.amount} was automatically checked and credited to your wallet balance.`;
        let type = 'limit';
        
        if (dep.status === 'pending') {
          title = 'Verification Processing ⏳';
          desc = `Our automated system is verifying your UPI payment of ₹${dep.amount}. It will be approved inside 15 seconds.`;
          type = 'system';
        } else if (dep.status === 'failed') {
          title = 'Verification Cancelled ❌';
          desc = `Verification failed or was cancelled for your deposit of ₹${dep.amount}. Receipt details did not match expected amount.`;
          type = 'system';
        }

        compiled.push({
          id: depId,
          title,
          description: desc,
          time: dateStr,
          unread: activeReadStates[depId] !== undefined ? activeReadStates[depId] : (dep.status !== 'approved'),
          type,
          icon: dep.status === 'approved' ? 'ArrowDownToLine' : 'Zap'
        });
      });

      // C. REAL Payout withdrawals matching real database entries (Fully synced real time, no fakes!)
      withdrawalsList.forEach((wth) => {
        const wthId = `wth-${wth.id}`;
        const dateStr = wth.createdAt ? new Date(wth.createdAt).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Just now';
        
        let title = 'Withdrawal Processed Successfully 🏦';
        let desc = `Your payout application for ₹${wth.amount} has been approved, debited, and successfully dispatched to your banking gateway.`;
        let type = 'limit';

        if (wth.status === 'pending') {
          title = 'Withdrawal Pending Audit ⏳';
          desc = `Your request to withdraw ₹${wth.amount} is currently being screened by our audit compliance agents.`;
          type = 'system';
        } else if (wth.status === 'failed') {
          title = 'Withdrawal Request Rejected ❌';
          desc = `Compliance cancelled your payout of ₹${wth.amount} due to invalid credential verification.`;
          type = 'system';
        }

        compiled.push({
          id: wthId,
          title,
          description: desc,
          time: dateStr,
          unread: activeReadStates[wthId] !== undefined ? activeReadStates[wthId] : (wth.status !== 'approved'),
          type,
          icon: wth.status === 'approved' ? 'ArrowDownToLine' : 'Zap'
        });
      });

      // D. KYC Verification Progress Real-Time Pushes
      if (profile?.kycStatus && profile.kycStatus !== 'not_started') {
        const kycId = 'kyc-notif';
        let kycTitle = 'KYC Verification Pending ⚙️';
        let kycDesc = 'Your government uploaded credentials are being processed. Verification completed instantly.';
        if (profile.kycStatus === 'approved') {
          kycTitle = 'KYC Authenticated Successfully 🛡️';
          kycDesc = 'Congratulations! Aadhaar card credentials verified. Unlimited margin tiers and cash limits are now live!';
        } else if (profile.kycStatus === 'rejected') {
          kycTitle = 'KYC Verification Rejected ⚠️';
          kycDesc = 'Verification attempt was declined. Please submit a high-contrast clear selfie with readable documents.';
        }

        compiled.push({
          id: kycId,
          title: kycTitle,
          description: kycDesc,
          time: 'Active status update',
          unread: activeReadStates[kycId] !== undefined ? activeReadStates[kycId] : (profile.kycStatus !== 'approved'),
          type: 'security',
          icon: 'ShieldCheck'
        });
      }

      // E. Live PWA installed "I love you" Real Popup Notification
      if (localStorage.getItem('pwa_installed_notif') === 'true') {
        const loveId = 'pwa-love-notif';
        compiled.push({
          id: loveId,
          title: 'TradeEX Mobile App ❤️',
          description: 'I love you',
          time: 'Just now',
          unread: activeReadStates[loveId] !== undefined ? activeReadStates[loveId] : true,
          type: 'market',
          icon: 'Activity'
        });
      }

      // Sort with unread ones first
      compiled.sort((a, b) => (a.unread === b.unread ? 0 : a.unread ? -1 : 1));

      setNotifications(compiled);
    };

    const unsubDeps = onSnapshot(depositsQuery, (snap) => {
      depositsList = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      depositsList.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      rebuildNotifications();
    });

    const unsubWths = onSnapshot(withdrawalsQuery, (snap) => {
      withdrawalsList = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      withdrawalsList.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      rebuildNotifications();
    });

    const handleRefresh = () => rebuildNotifications();
    window.addEventListener('refresh-notifications', handleRefresh);

    rebuildNotifications();
    
    return () => {
      unsubDeps();
      unsubWths();
      window.removeEventListener('refresh-notifications', handleRefresh);
    };
  }, [user, profile]);

  const unreadCount = notifications.filter((n: any) => n.unread).length;

  const markAllAsRead = () => {
    const activeReadStates = JSON.parse(localStorage.getItem('user_notif_read_states_v5') || '{}');
    notifications.forEach((n) => {
      activeReadStates[n.id] = false; // set as read
    });
    localStorage.setItem('user_notif_read_states_v5', JSON.stringify(activeReadStates));
    setNotifications((prev: any[]) => prev.map(n => ({ ...n, unread: false })));
  };

  const toggleReadStatus = (id: string) => {
    const activeReadStates = JSON.parse(localStorage.getItem('user_notif_read_states_v5') || '{}');
    const targetNotif = notifications.find(n => n.id === id);
    if (targetNotif) {
      activeReadStates[id] = !targetNotif.unread;
      localStorage.setItem('user_notif_read_states_v5', JSON.stringify(activeReadStates));
      setNotifications((prev: any[]) => prev.map(n => n.id === id ? { ...n, unread: !n.unread } : n));
    }
  };

  const deleteNotification = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const activeReadStates = JSON.parse(localStorage.getItem('user_notif_read_states_v5') || '{}');
    activeReadStates[id] = false; // mark as read/inactive
    localStorage.setItem('user_notif_read_states_v5', JSON.stringify(activeReadStates));
    setNotifications((prev: any[]) => prev.filter(n => n.id !== id));
    if (id === 'pwa-love-notif') {
      localStorage.removeItem('pwa_installed_notif');
    }
  };

  const [activeFilter, setActiveFilter] = useState('All');
  
  const scrollRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!scrollRef.current) return;
    setIsDragging(true);
    setStartX(e.pageX - scrollRef.current.offsetLeft);
    setScrollLeft(scrollRef.current.scrollLeft);
  };

  const handleMouseLeave = () => {
    setIsDragging(false);
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !scrollRef.current) return;
    e.preventDefault();
    const x = e.pageX - scrollRef.current.offsetLeft;
    const walk = (x - startX) * 2; // Scroll-fast
    scrollRef.current.scrollLeft = scrollLeft - walk;
  };
  
  const [favorites, setFavorites] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('crypto_favorites');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    localStorage.setItem('crypto_favorites', JSON.stringify(favorites));
  }, [favorites]);

  const toggleFavorite = (e: React.MouseEvent, symbol: string) => {
    e.stopPropagation();
    setFavorites(prev => 
      prev.includes(symbol) ? prev.filter(s => s !== symbol) : [...prev, symbol]
    );
  };

  const getOpenInterest = (ticker: TickerData) => {
    let charHash = 0;
    for(let i=0; i<ticker.symbol.length; i++) charHash += ticker.symbol.charCodeAt(i);
    const multiplier = 0.3 + (charHash % 6) * 0.1;
    return ticker.quoteVolume * multiplier;
  };

  const finalTickers = (Object.values(tickers) as TickerData[]).filter(t => {
    if (searchQuery && !t.symbol.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    
    if (activeFilter === 'All') return true;
    if (activeFilter === 'Favorites') return favorites.includes(t.symbol);
    if (activeFilter !== 'Favorites') {
      return t.category === activeFilter;
    }
    
    return true;
  }).sort((a,b) => {
    return b.quoteVolume - a.quoteVolume;
  });

  const [activeBanner, setActiveBanner] = useState(0);

  const banners = [
    { 
      id: 1, 
      title: 'Trade Futures Like a Professional', 
      subtitle: 'Access Crypto, Forex, Stocks, Commodities and Global Markets.', 
      button: 'Start Trading',
      bgClass: 'bg-gradient-to-r from-[#FFF0E0] to-[#FFF8F0]',
      icon: <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#FF8A00" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline></svg>
    },
    { 
      id: 2, 
      title: 'Fast Deposits & Secure Withdrawals', 
      subtitle: 'Multiple payment methods with enhanced security.', 
      button: 'Add Funds',
      bgClass: 'bg-gradient-to-r from-[#FFF8F0] to-[#FFF0E0]',
      icon: <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#00C076" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
    },
    { 
      id: 3, 
      title: 'Global Markets in One Platform', 
      subtitle: 'Trade Crypto, Forex, Indian Markets and International Stocks.', 
      button: 'Explore Markets',
      bgClass: 'bg-gradient-to-r from-[#FFF0E0] to-[#FFF8F0]',
      icon: <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#FF8A00" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="2" y1="12" x2="22" y2="12"></line><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path></svg>
    },
    { 
      id: 4, 
      title: 'Advanced Analytics & Market Insights', 
      subtitle: 'Track trends, volume and market sentiment in real time.', 
      button: 'View Insights',
      bgClass: 'bg-gradient-to-r from-[#FFF8F0] to-[#FFF0E0]',
      icon: <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#2563EB" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 3v18h18"></path><path d="M18 17V9"></path><path d="M13 17V5"></path><path d="M8 17v-3"></path></svg>
    },
  ];

  useEffect(() => {
    const timer = setInterval(() => {
      setActiveBanner(p => (p + 1) % banners.length);
    }, 4000);
    return () => clearInterval(timer);
  }, []);

  const [sentiment, setSentiment] = useState({ bullish: 62, bearish: 28, neutral: 10 });
  
  // Market sentiment dynamic auto-update
  useEffect(() => {
    const timer = setInterval(() => {
      const bull = 40 + Math.floor(Math.random() * 30);
      const bear = 20 + Math.floor(Math.random() * 20);
      const neutral = 100 - bull - bear;
      setSentiment({ bullish: bull, bearish: bear, neutral });
    }, 60000);
    return () => clearInterval(timer);
  }, []);

  const upnl = positions.reduce((acc, pos) => {
    const price = currentPrices[pos.pair] || pos.entryPrice;
    return acc + (pos.side === 'long' 
      ? (price - pos.entryPrice) * pos.quantity 
      : (pos.entryPrice - price) * pos.quantity);
  }, 0);
  const marginUsed = positions.reduce((acc, pos) => acc + pos.margin, 0);

  const quickActions = [
    { icon: BarChart2, label: 'Markets', action: () => setActiveTab('markets') },
    { icon: ArrowDownToLine, label: 'Deposit', action: () => setActiveTab('deposit') },
    { icon: Wallet, label: 'Withdraw', action: () => setActiveTab('withdraw') },
    { icon: Headphones, label: 'Support', action: () => {
      setSupportName(profile?.name || user?.displayName || '');
      setSupportEmail(profile?.email || user?.email || '');
      setSupportPhone(profile?.phone || '');
      setSupportCategory('General');
      setSupportMessage('');
      setSupportSuccess(false);
      setShowSupportModal(true);
    } },
    { icon: Settings, label: 'Settings', action: () => setActiveTab('more') },
  ];

  const generateSparkline = (isPositive: boolean) => (
    <svg className="w-[50px] h-6 shrink-0" viewBox="0 0 60 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d={isPositive ? "M0 28 Q 15 28, 20 20 T 40 15 T 60 4" : "M0 4 Q 15 4, 20 15 T 40 20 T 60 28"} 
            stroke={isPositive ? "#00C076" : "#FF4D4F"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      <path d={isPositive ? "M60 4 L60 32 L0 32 L0 28 Q 15 28, 20 20 T 40 15 T 60 4 Z" : "M60 28 L60 32 L0 32 L0 4 Q 15 4, 20 15 T 40 20 T 60 28 Z"} 
            fill={`url(#gradient-${isPositive ? 'success' : 'danger'})`} opacity="0.15"/>
      <defs>
        <linearGradient id="gradient-success" x1="30" y1="0" x2="30" y2="32" gradientUnits="userSpaceOnUse">
          <stop stopColor="#00C076"/>
          <stop offset="1" stopColor="#00C076" stopOpacity="0"/>
        </linearGradient>
        <linearGradient id="gradient-danger" x1="30" y1="0" x2="30" y2="32" gradientUnits="userSpaceOnUse">
          <stop stopColor="#FF4D4F"/>
          <stop offset="1" stopColor="#FF4D4F" stopOpacity="0"/>
        </linearGradient>
      </defs>
    </svg>
  );

  return (
    <div className="flex flex-col items-center w-full min-h-full bg-bg-base overflow-x-hidden relative text-text-main">
      
      {/* 🚀 Fixed Top Header */}
      <header className="sticky top-0 z-50 flex items-center justify-between w-full h-[64px] bg-gradient-to-r from-[#FFF4E8] via-[#FFFAF5] to-[#FFF4E8]/90 backdrop-blur-md px-4 md:px-6 border-b border-[#FFE4CC]/60 shadow-[0_4px_18px_rgba(255,140,66,0.06)] shrink-0 select-none">
        {/* Left Side: Profile Icon & Name */}
        <div className="flex items-center gap-2.5 cursor-pointer shrink-0" onClick={() => user ? setIsProfileOpen(true) : setActiveTab('login')}>
          {user ? (
            <>
              <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center shrink-0 border border-orange-200/80 shadow-xs overflow-hidden hover:scale-105 active:scale-95 transition-all">
                <img src={user.photoURL || `https://api.dicebear.com/7.x/adventurer/svg?seed=${user.uid}`} alt="avatar" className="w-full h-full object-cover" />
              </div>
              <div className="flex flex-col">
                <span className="text-[14px] font-bold text-slate-800 leading-tight truncate max-w-[120px] sm:max-w-[180px]">{user.displayName || user.email?.split('@')[0]}</span>
                {profile?.kycStatus === 'approved' || profile?.verified === true ? (
                  <span className="text-[11px] font-black text-emerald-600">✓ Verified</span>
                ) : profile?.kycStatus === 'pending' ? (
                  <span className="text-[11px] font-black text-amber-600 animate-pulse">● KYC Pending</span>
                ) : profile?.kycStatus === 'rejected' ? (
                  <span className="text-[11px] font-black text-rose-600">✕ KYC Rejected</span>
                ) : (
                  <span className="text-[11px] font-black text-orange-500">● KYC Unverified</span>
                )}
              </div>
            </>
          ) : (
            <>
              <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center shrink-0 border border-orange-200/80 text-orange-500 shadow-xs hover:scale-105 active:scale-95 transition-all">
                <User size={19} className="stroke-[2.2]" />
              </div>
              <div className="flex flex-col">
                <span className="text-[14px] font-bold text-slate-800 leading-tight">Welcome</span>
                <span className="text-[11px] font-medium text-slate-500">Login / Signup</span>
              </div>
            </>
          )}
        </div>

        {/* Right Side: Wallet Icon, Notification Icon & Dialog */}
        <div className="flex items-center gap-1.5 sm:gap-3 shrink-0 relative">
          <button 
            type="button" 
            onClick={() => setActiveTab('portfolio')} 
            className="w-9 h-9 flex items-center justify-center rounded-full bg-white/85 border border-orange-200/30 text-[#EA580C] shadow-xs hover:bg-white hover:text-orange-500 hover:scale-105 active:scale-95 transition-all duration-150 cursor-pointer"
            title="Wallet"
          >
            <Wallet size={17} strokeWidth={2.2} />
          </button>

          <div>
            <button 
              type="button" 
              onClick={() => setActiveTab('notifications')}
              className="w-9 h-9 flex items-center justify-center rounded-full bg-white/85 border border-orange-200/30 text-[#EA580C] shadow-xs hover:bg-white hover:text-orange-500 hover:scale-105 active:scale-95 transition-all duration-150 cursor-pointer relative"
              title="Notifications"
            >
              <Bell size={17} strokeWidth={2.2} />
              {unreadCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-red-500 border-2 border-white rounded-full animate-pulse" />
              )}
            </button>
          </div>
        </div>
      </header>

      <div className="flex flex-col gap-4 w-[96%] sm:w-[94%] xl:w-[90%] max-w-[1600px] pt-4 pb-24 shrink-0 mx-auto">
        
        {/* Login & Sign Up Options for Unauthenticated Users */}
        {!user && (
          <div className="w-full flex flex-col gap-2.5 mb-2 px-1 mt-1">
            <div className="flex gap-3">
              <button 
                onClick={() => setActiveTab('login')}
                className="flex-1 h-[40px] bg-white border border-[#FF8A00] text-[#FF8A00] rounded-[12px] font-bold text-[14px] hover:bg-[#FFF8F0] shadow-sm transition-all flex items-center justify-center cursor-pointer"
              >
                Login
              </button>
              <button 
                onClick={() => setActiveTab('signup')}
                className="flex-1 h-[40px] bg-gradient-to-r from-[#FF8C42] to-[#FFB347] text-white rounded-[12px] font-bold text-[14px] hover:from-[#FF9B5A] hover:to-[#FFC069] shadow-[0_4px_12px_rgba(255,140,66,0.25)] transition-all flex items-center justify-center cursor-pointer"
              >
                Sign Up
              </button>
            </div>
            <button
              onClick={() => {
                setSupportName('');
                setSupportEmail('');
                setSupportPhone('');
                setSupportCategory('General');
                setSupportMessage('');
                setSupportSuccess(false);
                setShowSupportModal(true);
              }}
              className="w-full h-[40px] bg-black border-none text-white rounded-[12px] font-bold text-[13px] hover:bg-slate-900 transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-3xs font-sans"
            >
              <Headphones size={15} />
              Need Guest Help? Submit Support Ticket
            </button>
          </div>
        )}

        {/* Account Value Card */}
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="w-full bg-surface rounded-[18px] p-5 shadow-[0_4px_24px_rgb(0,0,0,0.03)] border border-brand-light/20 flex flex-col"
        >
          {/* Row 1: Label + Eye + Mode Switcher */}
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5">
              <span className="text-[13px] font-medium text-text-muted">Account Value</span>
              <button 
                onClick={() => setShowBalance(!showBalance)} 
                className="text-text-muted hover:text-text-main p-1 flex items-center justify-center rounded-full hover:bg-bg-sec/40 transition-colors"
                title="Toggle Visibility"
              >
                {showBalance ? <Eye size={16} /> : <EyeOff size={16} />}
              </button>
            </div>
            
            {/* Beautiful Segmented Toggle Switcher (Demo on Left, Real on Right) */}
            <div className="flex bg-slate-100 p-0.5 rounded-full border border-slate-200/50 shadow-inner select-none items-center">
              <button
                type="button"
                onClick={() => setAccountMode('demo')}
                className={`px-3 py-1.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider transition-all duration-200 flex items-center gap-1 outline-none cursor-pointer ${
                  accountMode === 'demo'
                    ? 'bg-amber-500 text-white shadow-sm scale-[1.02]'
                    : 'text-slate-400 hover:text-slate-600'
                }`}
              >
                <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${accountMode === 'demo' ? 'bg-white animate-pulse' : 'bg-slate-300'}`} />
                <span>Demo</span>
              </button>
              
              <button
                type="button"
                onClick={() => setAccountMode('real')}
                className={`px-3 py-1.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider transition-all duration-200 flex items-center gap-1 outline-none cursor-pointer ${
                  accountMode === 'real'
                    ? 'bg-emerald-500 text-white shadow-sm scale-[1.02]'
                    : 'text-slate-400 hover:text-slate-600'
                }`}
              >
                <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${accountMode === 'real' ? 'bg-white animate-pulse' : 'bg-slate-300'}`} />
                <span>Real</span>
              </button>
            </div>
          </div>

          {/* Row 2: Balance Primary (based on user preference) */}
          <div className="text-[28px] md:text-[34px] font-semibold text-text-main leading-none tracking-tight whitespace-nowrap overflow-hidden text-ellipsis">
            {showBalance ? formatPref(accountBalance.usd, accountBalance.inr) : (currencyPreference === 'INR' ? '₹••••••••' : '•••••••• USDT')}
          </div>

          {/* Row 3: USD Value */}
          <div className="text-[13px] text-text-muted mt-1 font-medium mb-5 md:mb-6 whitespace-nowrap overflow-hidden text-ellipsis">
            ≈ {showBalance ? formatAlt(accountBalance.usd, accountBalance.inr) : (currencyPreference === 'INR' ? '$••••••••' : '₹••••••••')}
          </div>

          {/* Row 4: Account Stats */}
          <div className="bg-orange-50/70 dark:bg-[#FF8A00]/10 p-3.5 rounded-[16px] mb-2 border border-white dark:border-white/10 border-l-[4px] border-l-[#FF8A00] shadow-sm">
            <div className="flex items-center justify-between">
              {/* UPNL Side */}
              <div className="flex-1 pr-3">
                <div className="flex items-center gap-1 mb-1">
                  <span className="text-[12px] text-text-muted">UPNL</span>
                  <ChevronRight size={14} className="text-[#FF8A00]" />
                </div>
                <div className="flex items-baseline gap-1.5 mt-0.5">
                  <span className={`text-[16px] font-bold ${upnl >= 0 ? 'text-text-color' : 'text-semantic-error'}`}>
                    {showBalance ? (currencyPreference === 'INR' ? `₹${(upnl * 84).toFixed(2)}` : `$${upnl.toFixed(2)}`) : '••••'}
                  </span>
                  <span className="text-[13px] font-medium text-slate-500">
                    {showBalance ? (currencyPreference === 'INR' ? `$${upnl.toFixed(2)}` : `₹${(upnl * 84).toFixed(2)}`) : '••••'}
                  </span>
                </div>
              </div>
              
              {/* Divider */}
              <div className="w-[1px] h-9 bg-orange-200 dark:bg-orange-900/50 mx-2"></div>
              
              {/* Positions / Orders Side */}
              <div 
                onClick={() => setActiveTab('portfolio')}
                className="flex-1 pl-3 cursor-pointer"
              >
                <div className="flex items-center gap-1 mb-1">
                  <span className="text-[12px] text-text-muted">Positions / Orders</span>
                  <ChevronRight size={14} className="text-[#FF8A00]" />
                </div>
                <div className="text-[16px] font-bold text-text-color mt-0.5">
                  {positions.length} <span className="text-slate-300 dark:text-slate-600 font-light mx-0.5">/</span> {pendingOrders.length}
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* 📋 Complete Your KYC Banner */}
        {user && (!profile?.kycStatus || profile.kycStatus !== 'approved') && !profile?.verified && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.05 }}
            className={`w-full mt-3 p-4.5 rounded-[18px] border flex flex-col md:flex-row md:items-center md:justify-between gap-4 ${
              profile?.kycStatus === 'pending' 
                ? 'bg-amber-50/55 border-amber-200/50 text-amber-805' 
                : profile?.kycStatus === 'rejected'
                ? 'bg-rose-50/50 border-rose-200/60 text-slate-800'
                : 'bg-gradient-to-r from-orange-50 to-amber-50/50 border-orange-200/40 text-slate-850'
            }`}
          >
            <div className="flex items-start gap-3.5">
              <div className={`w-11 h-11 rounded-full flex items-center justify-center shrink-0 shadow-3xs border ${
                profile?.kycStatus === 'pending'
                  ? 'bg-amber-100/60 border-amber-250 text-amber-600'
                  : profile?.kycStatus === 'rejected'
                  ? 'bg-rose-100/65 border-rose-200/85 text-rose-600'
                  : 'bg-orange-100/60 border-orange-250 text-[#EA580C]'
              }`}>
                <ShieldCheck size={20} className={profile?.kycStatus === 'pending' ? 'animate-pulse' : ''} />
              </div>
              <div className="flex flex-col space-y-1">
                <h4 className="text-[14px] font-black uppercase tracking-wide leading-tight">
                  {profile?.kycStatus === 'pending' 
                    ? 'Identity Verification Pending' 
                    : profile?.kycStatus === 'rejected'
                    ? 'KYC Verification Rejected'
                    : 'Complete Your KYC'}
                </h4>
                <p className="text-[11.5px] font-semibold text-slate-500 leading-relaxed max-w-xl">
                  {profile?.kycStatus === 'pending'
                    ? 'Our administration desk is actively auditing your Aadhaar and biometric materials. Verified status usually resolves instantly within minutes.'
                    : profile?.kycStatus === 'rejected'
                    ? `Your Aadhaar details were rejected. Reason: ${profile?.kycRejectReason || 'Illegible photocopy or incorrect documents.'} Please audit and resubmit immediately.`
                    : 'We require a valid identity check before allowing real balance withdrawals. Tap below to upload your Aadhaar credentials.'}
                </p>
              </div>
            </div>

            {profile?.kycStatus !== 'pending' && (
              <button
                type="button"
                onClick={() => {
                  localStorage.setItem('account_active_subtab', 'compliance');
                  setActiveTab('account');
                }}
                className="self-start md:self-auto h-10 px-5 bg-gradient-to-r from-[#FF8C42] to-[#FFB347] hover:from-[#FF9B5A] hover:to-[#FFC069] text-white rounded-[12px] font-black text-xs uppercase tracking-wider shadow-sm transition-all whitespace-nowrap active:scale-95 cursor-pointer flex items-center justify-center"
              >
                {profile?.kycStatus === 'rejected' ? 'Re-verify KYC' : 'Complete KYC Now'}
              </button>
            )}
          </motion.div>
        )}

        {/* Security Code Widget */}
        {profile?.staticPin && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.1 }}
            className="w-full mt-3 bg-gradient-to-r from-orange-50 to-white rounded-[12px] p-3 flex items-center justify-between border border-[#FFD6A5]/80 shadow-sm"
          >
            <div className="flex items-center gap-3">
              <div className="w-[34px] h-[34px] rounded-full bg-white flex items-center justify-center shadow-xs border border-[#FFD6A5]">
                <ShieldCheck size={16} className="text-[#FF8A00]" />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Security Code:</span>
                <span className="text-[16px] font-mono font-black tracking-[0.1em] text-slate-900">
                  {profile.staticPin}
                </span>
              </div>
            </div>
            <div className="bg-white rounded-lg px-2.5 py-1 border border-[#FFD6A5] shadow-xs flex items-center gap-1.5">
              <span className="text-[10px] font-bold text-slate-600 uppercase">Fixed Code</span>
            </div>
          </motion.div>
        )}

        {/* Professional Banners */}
        <div 
          className="relative w-full h-[120px] mt-3 md:mt-4 md:h-[160px] rounded-[16px] md:rounded-[20px] mb-5 overflow-hidden shadow-sm border border-[#FFD6A5]/60 ring-[3px] ring-white/50 group cursor-pointer transition-all hover:shadow-md" 
          style={{ touchAction: 'pan-y pinch-zoom' }} 
          onClick={() => {
            if (banners[activeBanner].button === 'Start Trading' || banners[activeBanner].button === 'Explore Markets') setActiveTab('markets');
            else if (banners[activeBanner].button === 'Add Funds') setActiveTab('deposit');
            else setActiveTab('markets');
          }}
        >
          <AnimatePresence mode="wait">
            <motion.div
              key={activeBanner}
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.02 }}
              transition={{ duration: 0.4, ease: "easeOut" }}
              className={`absolute inset-0 flex items-center px-4 md:px-10 w-full ${banners[activeBanner].bgClass}`}
            >
              <div className="absolute inset-0 bg-gradient-to-r from-white/30 to-transparent pointer-events-none" />
              <div className="flex w-full items-center justify-between z-10 gap-3 md:gap-6 relative">
                <div className="flex flex-col max-w-[65%] sm:max-w-md">
                  <h2 className="text-[15px] md:text-[22px] font-bold text-slate-900 leading-tight mb-1.5 tracking-tight">
                    {banners[activeBanner].title}
                  </h2>
                  <p className="text-[11px] md:text-[13px] font-medium text-slate-600 mb-2.5 md:mb-4 leading-snug">
                    {banners[activeBanner].subtitle}
                  </p>
                  <div>
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        if (banners[activeBanner].button === 'Start Trading' || banners[activeBanner].button === 'Explore Markets') setActiveTab('markets');
                        else if (banners[activeBanner].button === 'Add Funds') setActiveTab('deposit');
                        else setActiveTab('markets');
                      }}
                      className="bg-slate-900 hover:bg-slate-800 text-white px-4 py-2 rounded-[10px] md:rounded-[12px] text-[11px] md:text-[13px] font-bold shadow-sm ring-2 ring-white/20 transition-all active:scale-95"
                    >
                      {banners[activeBanner].button}
                    </button>
                  </div>
                </div>
                <div className="w-[64px] h-[64px] md:w-[90px] md:h-[90px] bg-white rounded-full flex items-center justify-center shrink-0 shadow-sm border-2 border-white backdrop-blur-md relative z-10">
                  <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-orange-50 to-transparent opacity-50" />
                  <div className="relative z-10 scale-75 md:scale-90">
                    {banners[activeBanner].icon}
                  </div>
                </div>
              </div>
            </motion.div>
          </AnimatePresence>
          
          {/* Arrow Controls (Desktop) */}
          <button 
            onClick={(e) => { e.stopPropagation(); setActiveBanner(p => (p - 1 + banners.length) % banners.length); }}
            className="absolute left-4 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white/80 border border-[#FFD6A5] text-slate-700 flex items-center justify-center shadow-sm opacity-0 group-hover:opacity-100 transition-opacity hidden md:flex"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg>
          </button>
          <button 
            onClick={(e) => { e.stopPropagation(); setActiveBanner(p => (p + 1) % banners.length); }}
            className="absolute right-4 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white/80 border border-[#FFD6A5] text-slate-700 flex items-center justify-center shadow-sm opacity-0 group-hover:opacity-100 transition-opacity hidden md:flex"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>
          </button>
        </div>

        {/* Quick Actions */}
        <div className="flex justify-between items-center w-full px-1 py-1 mb-4 max-w-[450px] mx-auto">
          {quickActions.map((action, idx) => (
            <button 
              key={idx}
              onClick={action.action}
              className="flex flex-col items-center justify-center gap-1 w-[58px] md:w-[72px] cursor-pointer group"
            >
              <div className="w-[48px] h-[48px] md:w-[54px] md:h-[54px] bg-white border border-[#FFD6A5]/80 rounded-[12px] flex items-center justify-center shadow-xs text-slate-700 group-hover:text-[#FF8A00] group-hover:border-[#FF8A00] group-hover:bg-orange-50/40 hover:shadow-sm active:scale-95 transition-all duration-200">
                <action.icon size={22} className="md:hidden stroke-[1.8]" />
                <action.icon size={25} className="hidden md:block stroke-[1.8]" />
              </div>
              <span className="text-[11px] md:text-[12px] font-bold text-slate-750 group-hover:text-[#FF8A00] transition-colors tracking-tight whitespace-nowrap">{action.label}</span>
            </button>
          ))}
        </div>

        {/* Top Performers Section */}
        <div className="flex flex-col w-full mb-6 z-0 relative">
          <div className="flex flex-col mb-2 px-1">
            <h3 className="text-[16px] md:text-[18px] font-bold text-slate-900">Top Performers</h3>
            <span className="text-[11px] md:text-[13px] font-medium text-slate-500">Best performing assets today</span>
          </div>

          <div className="flex gap-2.5 overflow-x-auto no-scrollbar pb-3 pt-1 -mx-4 px-4 md:mx-0 md:px-1 md:grid md:grid-cols-4 md:gap-3 snap-x">
            <AnimatePresence mode="popLayout">
              {(() => {
                const allTickers = (Object.values(tickers) as any[]);
                if (!allTickers.length) return null;
                
                // Requested specific assets for Top Performance
                const allowedSymbols = ['BTCUSD', 'ETHUSD', 'SOLUSD', 'Gold'];
                const filteredTickers = allowedSymbols.map(sym => 
                  allTickers.find(t => t.symbol === sym)
                ).filter(Boolean);

                const performanceConfig = [
                  { badge: 'Market Leader', color: 'orange' },
                  { badge: 'Top Altcoin', color: 'blue' },
                  { badge: 'Trending Project', color: 'purple' },
                  { badge: 'Commodity Ref', color: 'yellow' },
                ];

                return filteredTickers.map((ticker, index) => {
                  const isPositive = ticker.priceChangePercent >= 0;
                  const isCrypto = ticker.category === 'Crypto' || !ticker.category || ticker.symbol.includes('USDT') || ticker.symbol.endsWith('USD');
                  const rawSymbol = isCrypto ? ticker.symbol.replace('USDT', '').replace('USD', '') : ticker.symbol;
                  
                  // Professional display: BTC/USD, ETH/USD, etc.
                  const displaySymbol = isCrypto ? `${rawSymbol}/USD` : (rawSymbol === 'Gold' ? 'XAU/USD' : rawSymbol);
                  const config = performanceConfig[index] || { badge: 'Trending', color: 'orange' };
                  
                  const coinName = rawSymbol === 'Gold' ? 'XAU' : rawSymbol;
                  const coinIconUrl = isCrypto 
                    ? `https://cdn.jsdelivr.net/gh/atomiclabs/cryptocurrency-icons@1a63530c26148158af15a2ca0715e36511b2db40/svg/color/${coinName.toLowerCase()}.svg`
                    : (rawSymbol === 'Gold' ? 'https://cdn-icons-png.flaticon.com/512/2913/2913434.png' : '');

                  return (
                    <motion.button
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      key={`${ticker.symbol}-${config.badge}`}
                      onClick={() => { 
                        setSelectedPair(ticker.symbol);
                        setActiveTab('charts');
                      }}
                      className="w-[170px] md:w-full h-[115px] bg-white rounded-[14px] p-3.5 shadow-sm border border-[#FFD6A5]/60 hover:border-[#FF8A00] hover:shadow-[0_4px_12px_rgba(255,138,0,0.06)] transition-all flex flex-col justify-between shrink-0 snap-center relative group overflow-hidden"
                    >
                      <div className="absolute top-0 right-0 w-12 h-12 bg-gradient-to-bl from-orange-50 to-transparent -mr-5 -mt-5 rounded-full opacity-50" />
                      
                      <div className="flex items-center gap-2 relative z-10 w-full overflow-hidden">
                        <div className="w-[30px] h-[30px] rounded-full bg-slate-50 flex items-center justify-center shrink-0 border border-slate-100 overflow-hidden shadow-xs">
                          <img 
                            src={coinIconUrl} 
                            alt={coinName} 
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              e.currentTarget.onerror = null;
                              e.currentTarget.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(coinName.charAt(0))}&background=FF8A00&color=fff&rounded=true&bold=true`;
                            }}
                          />
                        </div>
                        <div className="flex flex-col items-start min-w-0 flex-1 pr-1">
                          <span className="font-black text-[14px] text-slate-900 leading-none tracking-tighter truncate w-full text-left">
                            {displaySymbol}
                          </span>
                          <span className="text-[8px] font-black uppercase text-orange-600 truncate max-w-full leading-none mt-1">
                            {config.badge}
                          </span>
                        </div>
                      </div>
                      
                      <div className="flex justify-between items-end w-full relative z-10">
                        <div className="flex flex-col text-left select-all min-w-0 pr-1">
                          <span className="text-[12px] md:text-[13px] font-mono font-bold text-slate-900 leading-tight mb-0.5 whitespace-nowrap">
                            {formatUSD(ticker.lastPrice)}
                          </span>
                          <div className="flex items-center gap-1">
                            <span className={`text-[10px] font-black ${isPositive ? 'text-[#00C076]' : 'text-[#FF4D4F]'} flex items-center`}>
                              {isPositive ? '▲' : '▼'}{ticker.priceChangePercent.toFixed(2)}%
                            </span>
                          </div>
                        </div>
                        <div className="mb-0.5 opacity-80 group-hover:opacity-100 transition-opacity scale-75 origin-bottom-right">
                          {generateSparkline(isPositive)}
                        </div>
                      </div>
                    </motion.button>
                  );
                });
              })()}
            </AnimatePresence>
          </div>
        </div>

        {/* Market Sentiment Widget */}
        <div className="w-full bg-white rounded-[20px] p-5 md:p-6 mb-6 shadow-[0_4px_20px_rgb(0,0,0,0.03)] border border-[#FFD6A5] flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex flex-col">
            <h3 className="text-[18px] md:text-[20px] font-bold text-slate-900 leading-tight">Market Sentiment</h3>
            <span className="text-[13px] md:text-[14px] font-medium text-slate-500 mt-1">Real-time overall market trend analysis</span>
          </div>

          <div className="flex flex-col md:w-[45%] lg:w-[40%] gap-4">
            <div className="flex justify-between items-center text-[13px] font-bold">
              <span className="text-[#FF4D4F]">Bearish {sentiment.bearish}%</span>
              <span className="text-slate-400">Neutral {sentiment.neutral}%</span>
              <span className="text-[#00C076]">Bullish {sentiment.bullish}%</span>
            </div>

            {/* Premium Gauge Bar */}
            <div className="relative h-4 rounded-full overflow-hidden bg-slate-100 flex drop-shadow-sm border border-slate-200/50">
              <div 
                className="h-full bg-gradient-to-r from-red-500 to-[#FF4D4F] transition-all duration-1000 ease-out"
                style={{ width: `${sentiment.bearish}%` }}
              />
              <div 
                className="h-full bg-gradient-to-r from-slate-300 to-slate-200 transition-all duration-1000 ease-out"
                style={{ width: `${sentiment.neutral}%` }}
              />
              <div 
                className="h-full bg-gradient-to-r from-[#00C076] to-green-500 transition-all duration-1000 ease-out"
                style={{ width: `${sentiment.bullish}%` }}
              />
              
              {/* Pointer */}
              <div 
                className="absolute top-1/2 -translate-y-1/2 w-1.5 h-6 bg-slate-900 rounded-full shadow-md border-2 border-white transition-all duration-1000 ease-out z-10"
                style={{ left: `calc(${sentiment.bearish + sentiment.neutral / 2}% - 3px)` }}
              />
            </div>
            
            <div className="flex justify-center mt-1">
              <span className="bg-[#FFF8F0] border border-[#FFD6A5] px-3 py-1 rounded-[8px] text-[12px] font-bold text-slate-700 shadow-sm">
                Status: {sentiment.bullish > sentiment.bearish ? 'Bullish' : 'Bearish'}
              </span>
            </div>
          </div>
        </div>

        {/* Market Navigation Tabs */}
        <div 
          className="flex w-full items-center overflow-x-auto no-scrollbar h-12 shrink-0 bg-transparent mb-4 pt-2 touch-pan-x cursor-grab active:cursor-grabbing"
          ref={scrollRef}
          onMouseDown={handleMouseDown}
          onMouseLeave={handleMouseLeave}
          onMouseUp={handleMouseUp}
          onMouseMove={handleMouseMove}
        >
          <div className="flex gap-2 h-full items-center lg:px-1">
            {[
              { id: 'All', label: 'All', icon: '🌐' },
              { id: 'Favorites', label: 'Favorites', icon: '⭐' },
              { id: 'Crypto', label: 'Crypto', icon: '🪙' },
              { id: 'Forex', label: 'Forex', icon: '💱' },
              { id: 'Indian Market', label: 'Indian Market', icon: '📈' },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveFilter(tab.id)}
                className={`whitespace-nowrap flex items-center gap-1.5 px-4 py-2 text-[13px] md:text-[14px] font-bold transition-all rounded-full border ${
                  activeFilter === tab.id 
                    ? 'bg-[#FF8A00] text-white border-[#FF8A00] shadow-sm' 
                    : 'bg-white text-slate-700 border-[#FF8A00] hover:bg-[#FFF8F0] hover:text-slate-900'
                }`}
              >
                <span className="text-[14px]">{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Professional All Market Pairs List */}
        <div className="w-full flex flex-col mb-4 bg-white rounded-[20px] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-[#FFD6A5] overflow-hidden">
          <div className="px-5 py-4 border-b border-[#FFF8F0] flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white z-20 lg:sticky lg:top-[60px]">
            <div className="flex flex-col">
              <h3 className="text-[18px] md:text-[20px] font-bold text-slate-900 leading-tight">All Market Pairs</h3>
              <span className="text-[13px] font-medium text-slate-500 mt-0.5">Real-time Futures Market Data</span>
            </div>
            
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 w-full md:w-auto">
              <div className="relative flex-1 md:w-[220px]">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <input 
                  type="text"
                  placeholder="Search contracts..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full h-[40px] pl-10 pr-4 bg-[#FFF8F0]/80 border border-[#FFD6A5]/50 hover:border-[#FFD6A5] rounded-xl text-[13px] font-medium text-slate-900 focus:outline-none focus:bg-white focus:ring-2 focus:ring-[#FF8A00] focus:border-transparent placeholder:text-slate-400 transition-all"
                />
              </div>
              <div className="relative w-full sm:w-[150px] shrink-0">
                <select 
                  value={activeFilter}
                  onChange={(e) => setActiveFilter(e.target.value)}
                  className="w-full h-[40px] pl-4 pr-10 bg-white border border-[#FFD6A5] hover:border-[#FF8A00]/50 rounded-xl text-[13px] font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#FF8A00] appearance-none cursor-pointer shadow-sm transition-all"
                >
                  <option value="All">🌐 All</option>
                  <option value="Favorites">⭐ Favorites</option>
                  <option value="Crypto">🪙 Crypto</option>
                  <option value="Forex">💱 Forex</option>
                  <option value="Indian Market">📈 Indian Market</option>
                </select>
                <ChevronDown size={16} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              </div>
            </div>
          </div>

          {/* Desktop Table (lg:block) */}
          <div className="hidden lg:block w-full overflow-x-auto min-h-[400px]">
            <table className="w-full text-left border-collapse">
              <thead className="bg-[#FAF9F8]">
                <tr>
                  <th className="px-5 py-3 text-[11px] font-bold text-slate-400 uppercase tracking-wider w-[40px] border-b border-[#FFD6A5]/50"></th>
                  <th className="px-5 py-3 text-[11px] font-bold text-slate-400 uppercase tracking-wider border-b border-[#FFD6A5]/50">Contract</th>
                  <th className="px-5 py-3 text-[11px] font-bold text-slate-400 uppercase tracking-wider border-b border-[#FFD6A5]/50 text-right">Last Price</th>
                  <th className="px-5 py-3 text-[11px] font-bold text-slate-400 uppercase tracking-wider border-b border-[#FFD6A5]/50 text-right">24H Change</th>
                  <th className="px-5 py-3 text-[11px] font-bold text-slate-400 uppercase tracking-wider border-b border-[#FFD6A5]/50 text-right">Volume</th>
                  <th className="px-5 py-3 text-[11px] font-bold text-slate-400 uppercase tracking-wider border-b border-[#FFD6A5]/50 text-right">Trend</th>

                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100/60">
                {finalTickers.slice(0, 20).map((ticker, i) => {
                  const isPositive = ticker.priceChangePercent >= 0;
                  const isCrypto = ticker.category === 'Crypto' || !ticker.category;
                  const coinName = isCrypto ? ticker.symbol.replace('USDT', '').replace('USD', '') : ticker.symbol.replace('/USD', '');
                  const coinIconUrl = isCrypto ? `https://cdn.jsdelivr.net/gh/atomiclabs/cryptocurrency-icons@1a63530c26148158af15a2ca0715e36511b2db40/svg/color/${coinName.toLowerCase()}.svg` : '';
                  const badgeText = ticker.category === 'Crypto' ? 'USD' : ticker.category === 'Forex' ? 'FX' : ticker.category === 'Indian Market' ? 'IND' : ticker.category === 'Stocks' ? 'STK' : ticker.category === 'Commodities' ? 'COM' : ticker.category === 'Indices' ? 'IDX' : ticker.category === 'Global Stocks' ? 'GLB' : 'MKT';
                  
                  return (
                    <tr 
                      key={ticker.symbol} 
                      onClick={() => {
                        setSelectedPair(ticker.symbol);
                        setActiveTab('charts');
                      }}
                      className={`group hover:bg-[#FFF8F0]/60 transition-colors cursor-pointer ${i % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}`}
                    >
                      <td className="px-5 py-3 h-[56px] cursor-pointer" onClick={(e) => toggleFavorite(e, ticker.symbol)}>
                        <Star 
                          size={16} 
                          className={`transition-colors ${favorites.includes(ticker.symbol) ? 'fill-[#FF8A00] text-[#FF8A00]' : 'text-slate-300 hover:text-[#FF8A00]'}`} 
                        />
                      </td>
                      <td className="px-5 py-3 h-[56px]">
                        <div className="flex items-center gap-3">
                          <div className="w-[36px] h-[36px] rounded-full bg-white shadow-sm flex items-center justify-center shrink-0 border border-slate-100 overflow-hidden">
                            <img 
                              src={isCrypto ? coinIconUrl : `https://ui-avatars.com/api/?name=${encodeURIComponent(coinName.charAt(0))}&background=FF8A00&color=fff&rounded=true&bold=true`} 
                              alt={coinName} 
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                e.currentTarget.onerror = null;
                                e.currentTarget.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(coinName.charAt(0))}&background=FF8A00&color=fff&rounded=true&bold=true`;
                              }}
                            />
                          </div>
                          <div className="flex gap-2 items-center">
                            <span className="font-bold text-[14px] text-slate-900 group-hover:text-[#FF8A00] transition-colors whitespace-nowrap">
                              {isCrypto ? `${coinName}/USD` : (coinName === 'Gold' ? 'XAU/USD' : ticker.symbol)}
                            </span>
                            {badgeText !== 'USD' && (
                              <span className="text-[9px] font-black text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded-md uppercase tracking-wider shrink-0">{badgeText}</span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3 h-[56px] text-right whitespace-nowrap">
                        <span className="font-mono font-bold text-[14px] text-slate-900 whitespace-nowrap">{formatUSD(ticker.lastPrice)}</span>
                      </td>
                      <td className="px-5 py-3 h-[56px] text-right">
                        {ticker.category !== 'Indian Market' ? (
                          <span className={`text-[13px] font-bold px-2 py-1 rounded-[6px] ${isPositive ? 'text-[#00C076] bg-[#00C076]/10' : 'text-[#FF4D4F] bg-[#FF4D4F]/10'}`}>
                            {isPositive ? '+' : ''}{ticker.priceChangePercent.toFixed(2)}%
                          </span>
                        ) : (
                          <span className="text-[13px] font-bold text-slate-300">-</span>
                        )}
                      </td>
                      <td className="px-5 py-3 h-[56px] text-right">
                        <span className="text-[13px] font-medium text-slate-600">${(ticker.quoteVolume/1000000).toFixed(1)}M</span>
                      </td>
                      <td className="px-5 py-3 h-[56px] text-right">
                        <div className="flex justify-end pr-2">
                          {generateSparkline(isPositive)}
                        </div>
                      </td>

                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile and Tablet Cards (lg:hidden) */}
          <div className="flex flex-col lg:hidden p-3 gap-2 bg-[#FAF9F8] min-h-[400px]">
            <AnimatePresence mode="popLayout">
              {finalTickers.slice(0, 15).map((ticker) => {
                const isPositive = ticker.priceChangePercent >= 0;
                const isCrypto = ticker.category === 'Crypto' || !ticker.category;
                const coinName = isCrypto ? ticker.symbol.replace('USDT', '').replace('USD', '') : ticker.symbol.replace('/USD', '');
                const coinIconUrl = isCrypto ? `https://cdn.jsdelivr.net/gh/atomiclabs/cryptocurrency-icons@1a63530c26148158af15a2ca0715e36511b2db40/svg/color/${coinName.toLowerCase()}.svg` : '';
                const badgeText = ticker.category === 'Crypto' ? 'USD' : ticker.category === 'Forex' ? 'FX' : ticker.category === 'Indian Market' ? 'IND' : ticker.category === 'Stocks' ? 'STK' : ticker.category === 'Commodities' ? 'COM' : 'MKT';
                
                return (
                  <motion.div 
                    layout
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.98 }}
                    transition={{ duration: 0.2 }}
                    key={ticker.symbol} 
                    onClick={() => {
                      setSelectedPair(ticker.symbol);
                      setActiveTab('charts');
                    }}
                    className="bg-white rounded-[14px] shadow-sm p-3 flex items-center justify-between border border-[#FFD6A5]/60 hover:border-[#FF8A00]/80 cursor-pointer hover:shadow-[0_4px_12px_rgba(255,138,0,0.05)] transition-all duration-150"
                  >
                    <div className="flex items-center gap-3">
                      <button 
                        onClick={(e) => toggleFavorite(e, ticker.symbol)}
                        className="p-1 -ml-1"
                      >
                        <Star 
                          size={18} 
                          className={`transition-colors ${favorites.includes(ticker.symbol) ? 'fill-[#FF8A00] text-[#FF8A00]' : 'text-slate-300 hover:text-[#FF8A00]'}`} 
                        />
                      </button>
                      <div className="w-[40px] h-[40px] rounded-full bg-white shadow-sm flex items-center justify-center shrink-0 border border-slate-100 overflow-hidden">
                        <img 
                          src={isCrypto ? coinIconUrl : `https://ui-avatars.com/api/?name=${encodeURIComponent(coinName.charAt(0))}&background=FF8A00&color=fff&rounded=true&bold=true`} 
                          alt={ticker.symbol} 
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            e.currentTarget.onerror = null;
                            e.currentTarget.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(coinName.charAt(0))}&background=FF8A00&color=fff&rounded=true&bold=true`;
                          }}
                        />
                      </div>
                      <div className="flex flex-col">
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-[14px] text-slate-900 leading-none whitespace-nowrap">
                             {isCrypto ? `${coinName}/USD` : (coinName === 'Gold' ? 'XAU/USD' : ticker.symbol)}
                          </span>
                          {badgeText !== 'USD' && (
                            <span className="text-[9px] font-black text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded-md leading-none shrink-0 uppercase tracking-wider">{badgeText}</span>
                          )}
                        </div>
                        <span className="text-[11px] font-medium text-slate-500 mt-1">
                          Vol ${(ticker.quoteVolume/1000000).toFixed(1)}M
                        </span>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-4">
                      <div className="hidden sm:block">
                        {generateSparkline(isPositive)}
                      </div>
                      <div className="flex flex-col items-end shrink-0">
                        <span className="font-mono font-bold text-[14px] text-slate-900 leading-tight whitespace-nowrap">{formatUSD(ticker.lastPrice)}</span>
                        {ticker.category !== 'Indian Market' ? (
                          <span className={`text-[11px] font-bold mt-0.5 whitespace-nowrap ${isPositive ? 'text-[#00C076]' : 'text-[#FF4D4F]'}`}>
                            {isPositive ? '+' : ''}{ticker.priceChangePercent.toFixed(2)}%
                          </span>
                        ) : (
                          <span className="text-[11px] font-bold text-slate-300 mt-0.5">-</span>
                        )}
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        </div>

      </div>

      {/* 🛠️ Support & Helpdesk Ticket Generation Modal */}
      <AnimatePresence>
        {showSupportModal && (
          <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md">
            {/* Modal Container */}
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              transition={{ type: "spring", duration: 0.5 }}
              className="relative w-full max-w-[500px] bg-white rounded-[28px] overflow-hidden shadow-2xl border border-slate-100/80 flex flex-col max-h-[85vh] text-[#1E293B]"
            >
              {/* Header */}
              <div className="bg-gradient-to-r from-orange-500 to-amber-500 px-6 py-5 shrink-0 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center text-white backdrop-blur-md">
                    <Headphones size={20} className="stroke-[2.5]" />
                  </div>
                  <div>
                    <h3 className="text-[17px] font-extrabold text-white leading-tight">Helpdesk Support</h3>
                    <p className="text-[11px] text-orange-100/95 font-medium">Create a Support Ticket instantly</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowSupportModal(false)}
                  className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 active:scale-95 flex items-center justify-center text-white transition-colors cursor-pointer"
                >
                  <X size={16} className="stroke-[2.5]" />
                </button>
              </div>

              {/* Scrollable content */}
              <div className="p-6 overflow-y-auto space-y-5">
                {supportSuccess ? (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="flex flex-col items-center text-center py-6 space-y-4"
                  >
                    <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center text-emerald-500">
                      <CheckCircle2 size={36} className="stroke-[2.5] animate-bounce" />
                    </div>
                    <div className="space-y-2">
                      <h4 className="font-extrabold text-[16px] text-slate-800 tracking-tight leading-tight uppercase">
                        Ticket Registered Successfully!
                      </h4>
                      <p className="text-[13px] font-extrabold text-emerald-650 leading-normal px-2">
                        Your support ticket has been created successfully.
                      </p>
                      <p className="text-[14px] font-black text-[#FF8A00] uppercase bg-orange-50 px-4 py-2 border border-orange-100 rounded-xl inline-block mt-1 font-sans">
                        Please check your email within 24 hours.
                      </p>
                      <p className="text-[12px] font-bold text-slate-700 leading-relaxed max-w-sm mx-auto">
                        Your issue is logged in our helpdesk. A dedicated support specialist will review your request and reach out to you within 24 hours.
                      </p>
                    </div>
                    <div className="w-full h-[1px] bg-slate-100 my-2" />
                    <button
                      type="button"
                      onClick={() => {
                        setShowSupportModal(false);
                        setSupportSuccess(false);
                      }}
                      className="w-full py-3 px-5 bg-slate-100 hover:bg-slate-200 text-slate-755 rounded-xl font-bold text-xs uppercase tracking-wider transition-colors cursor-pointer"
                    >
                      Close Window
                    </button>
                  </motion.div>
                ) : (
                  <form onSubmit={handleSupportSubmit} className="space-y-4 font-bold text-xs text-slate-700">
                    
                    {/* Welcome/Sign-in notice */}
                    {!user && (
                      <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl text-[11px] text-slate-500 font-medium leading-relaxed">
                        ⚠️ You are filing as a Guest. To track your tickets in real-time, please register or sign in.
                      </div>
                    )}

                    {/* Field 1: Full Name */}
                    <div>
                      <label className="text-[11px] text-slate-900 font-extrabold uppercase tracking-wider block mb-1.5">
                        Your Full Name
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                          <User size={15} />
                        </div>
                        <input
                          type="text"
                          required
                          value={supportName}
                          onChange={(e) => setSupportName(e.target.value)}
                          placeholder="e.g. Amit Kumar"
                          className="w-full pl-9 bg-slate-50 border border-slate-200/80 rounded-xl h-11 text-[13px] font-bold outline-none focus:border-orange-500 focus:bg-white focus:ring-1 focus:ring-orange-500/20 transition-all font-sans"
                        />
                      </div>
                    </div>

                    {/* Field 2: Email Address */}
                    <div>
                      <label className="text-[11px] text-slate-900 font-extrabold uppercase tracking-wider block mb-1.5">
                        Email Address
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                          <Mail size={15} />
                        </div>
                        <input
                          type="email"
                          required
                          value={supportEmail}
                          onChange={(e) => setSupportEmail(e.target.value)}
                          placeholder="e.g. amit@mail.com"
                          className="w-full pl-9 bg-slate-50 border border-slate-200/80 rounded-xl h-11 text-[13px] font-bold outline-none focus:border-orange-500 focus:bg-white focus:ring-1 focus:ring-orange-500/20 transition-all font-sans"
                        />
                      </div>
                    </div>

                    {/* Field 3: Mobile Number */}
                    <div>
                      <label className="text-[11px] text-slate-900 font-extrabold uppercase tracking-wider block mb-1.5">
                        Mobile Number
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                          <Phone size={15} />
                        </div>
                        <input
                          type="tel"
                          required
                          value={supportPhone}
                          onChange={(e) => setSupportPhone(e.target.value)}
                          placeholder="e.g. +91 98765-43210"
                          className="w-full pl-9 bg-slate-50 border border-slate-200/80 rounded-xl h-11 text-[13px] font-bold outline-none focus:border-orange-500 focus:bg-white focus:ring-1 focus:ring-orange-500/20 transition-all font-sans"
                        />
                      </div>
                    </div>

                    {/* Field 4: Category Dropdown */}
                    <div>
                      <label className="text-[11px] text-slate-900 font-extrabold uppercase tracking-wider block mb-1.5">
                        Inquiry Category
                      </label>
                      <select
                        value={supportCategory}
                        onChange={(e) => setSupportCategory(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200/80 rounded-xl h-11 px-3 text-[13px] font-bold outline-none focus:border-orange-500 focus:bg-white transition-all cursor-pointer text-slate-800"
                      >
                        <option value="General">General Trade Inquiry</option>
                        <option value="Payments">Deposit Support</option>
                        <option value="Withdrawals">Withdrawal Support</option>
                        <option value="KYC">KYC Uploads Query</option>
                        <option value="Technical">Technical Problem</option>
                      </select>
                    </div>

                    {/* Field 5: Problem Message */}
                    <div>
                      <label className="text-[11px] text-slate-900 font-extrabold uppercase tracking-wider block mb-1.5">
                        Explain Your Issue
                      </label>
                      <div className="relative">
                        <div className="absolute top-3 left-3 pointer-events-none text-slate-400">
                          <MessageSquare size={15} />
                        </div>
                        <textarea
                          required
                          rows={4}
                          value={supportMessage}
                          onChange={(e) => setSupportMessage(e.target.value)}
                          placeholder="Please provide complete details so we can assist you better..."
                          className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200/80 rounded-xl text-[13px] font-bold outline-none focus:border-orange-500 focus:bg-white focus:ring-1 focus:ring-orange-500/20 transition-all resize-none font-sans"
                        />
                      </div>
                    </div>

                    {/* Submit Button */}
                    <button
                      type="submit"
                      disabled={supportSubmitting}
                      className="w-full h-12 bg-black hover:bg-slate-900 disabled:bg-slate-300 text-white rounded-xl font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all shadow-md active:scale-95 cursor-pointer mt-2 border-none"
                    >
                      <Send size={13} className="shrink-0" />
                      {supportSubmitting ? 'Registering Ticket...' : 'File Support Ticket & Continue'}
                    </button>
                  </form>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

