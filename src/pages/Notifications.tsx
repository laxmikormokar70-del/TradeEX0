import React, { useState, useEffect } from 'react';
import { useAuth } from '../store/AuthContext';
import { db } from '../lib/firebase';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { Bell, Zap, ArrowDownToLine, Activity, ShieldCheck, X, Check, Trash2 } from 'lucide-react';

export default function NotificationsPage({ setActiveTab }: { setActiveTab: (tab: string) => void }) {
  const { user, profile } = useAuth();
  const [notifications, setNotifications] = useState<any[]>([]);

  useEffect(() => {
    if (!user) {
      setNotifications([]);
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

    const rebuildNotifications = () => {
      const activeReadStates = JSON.parse(localStorage.getItem('user_notif_read_states_v5') || '{}');
      const compiled: any[] = [];

      // A. Welcome Notification
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

      // B. deposits
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

      // C. withdrawals
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

      // D. KYC
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

      // E. Love
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

      compiled.sort((a, b) => (a.unread === b.unread ? 0 : a.unread ? -1 : 1));
      setNotifications(compiled);
    };

    const unsubDeps = onSnapshot(depositsQuery, (snap) => {
      depositsList = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      depositsList.sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      rebuildNotifications();
    });

    const unsubWths = onSnapshot(withdrawalsQuery, (snap) => {
      withdrawalsList = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      withdrawalsList.sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      rebuildNotifications();
    });

    return () => {
      unsubDeps();
      unsubWths();
    };
  }, [user, profile]);

  const markAllAsRead = () => {
    const activeReadStates = JSON.parse(localStorage.getItem('user_notif_read_states_v5') || '{}');
    notifications.forEach((n) => {
      activeReadStates[n.id] = false;
    });
    localStorage.setItem('user_notif_read_states_v5', JSON.stringify(activeReadStates));
    setNotifications((prev) => prev.map(n => ({ ...n, unread: false })));
    window.dispatchEvent(new Event('refresh-notifications'));
  };

  const toggleReadStatus = (id: string) => {
    const activeReadStates = JSON.parse(localStorage.getItem('user_notif_read_states_v5') || '{}');
    const targetNotif = notifications.find(n => n.id === id);
    if (targetNotif) {
      activeReadStates[id] = !targetNotif.unread;
      localStorage.setItem('user_notif_read_states_v5', JSON.stringify(activeReadStates));
      setNotifications((prev) => prev.map(n => n.id === id ? { ...n, unread: !n.unread } : n));
      window.dispatchEvent(new Event('refresh-notifications'));
    }
  };

  const deleteNotification = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const activeReadStates = JSON.parse(localStorage.getItem('user_notif_read_states_v5') || '{}');
    activeReadStates[id] = false;
    localStorage.setItem('user_notif_read_states_v5', JSON.stringify(activeReadStates));
    setNotifications((prev) => prev.filter(n => n.id !== id));
    if (id === 'pwa-love-notif') {
      localStorage.removeItem('pwa_installed_notif');
    }
    window.dispatchEvent(new Event('refresh-notifications'));
  };

  const unreadCount = notifications.filter(n => n.unread).length;

  return (
    <div className="p-4 sm:p-6 bg-slate-50 min-h-full pb-24">
      <div className="max-w-xl mx-auto">
        <div className="flex items-center gap-2 mb-4">
          <button 
            onClick={() => setActiveTab('home')}
            className="flex items-center gap-1.5 text-xs font-black text-slate-500 hover:text-[#FF8A00] transition-colors cursor-pointer bg-white px-3 py-1.5 rounded-xl border border-slate-100 shadow-3xs"
          >
            ← Back to Terminal
          </button>
        </div>

        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <Bell className="text-brand w-6 h-6" />
            <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight font-sans">
              Notifications
            </h2>
            {unreadCount > 0 && (
              <span className="bg-brand/10 text-brand px-2.5 py-0.5 rounded-full text-xs font-black">
                {unreadCount} Unread
              </span>
            )}
          </div>
          
          {unreadCount > 0 && (
            <button
              onClick={markAllAsRead}
              className="text-xs font-bold text-brand hover:text-orange-700 bg-brand/5 hover:bg-[#FFF0E0] px-3 py-1.5 rounded-lg border border-brand/10 transition-colors cursor-pointer"
            >
              Mark All Read
            </button>
          )}
        </div>

        {notifications.length === 0 ? (
          <div className="py-16 px-6 bg-white border border-slate-100 rounded-3xl flex flex-col items-center justify-center text-center shadow-xs">
            <div className="w-14 h-14 rounded-full bg-slate-50 flex items-center justify-center text-slate-300 border border-slate-100 mb-4 animate-pulse">
              <Bell size={24} />
            </div>
            <p className="text-sm font-black text-slate-800 uppercase tracking-wider">No notifications yet</p>
            <p className="text-xs text-slate-400 mt-1 max-w-[240px]">
              Compliance updates and automated UPI ledger clearances will list here.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {notifications.map((notif) => {
              let NotifIcon = Bell;
              let iconBg = 'bg-orange-50 text-orange-600 border-orange-100';
              if (notif.type === 'system') {
                NotifIcon = Zap;
                iconBg = 'bg-amber-50 text-amber-600 border-amber-100';
              } else if (notif.type === 'limit') {
                NotifIcon = ArrowDownToLine;
                iconBg = 'bg-emerald-50 text-emerald-600 border-emerald-100';
              } else if (notif.type === 'market') {
                NotifIcon = Activity;
                iconBg = 'bg-indigo-50 text-indigo-600 border-indigo-100';
              } else if (notif.type === 'security') {
                NotifIcon = ShieldCheck;
                iconBg = 'bg-blue-50 text-blue-600 border-blue-100';
              }

              return (
                <div
                  key={notif.id}
                  onClick={() => toggleReadStatus(notif.id)}
                  className={`p-4 bg-white border border-slate-100 rounded-2xl hover:bg-slate-50/50 transition-all flex gap-3.5 relative cursor-pointer group shadow-3xs ${
                    notif.unread ? 'ring-1 ring-brand/15' : 'opacity-85'
                  }`}
                >
                  {notif.unread && (
                    <div className="absolute top-5 left-2 w-2 h-2 rounded-full bg-brand" />
                  )}

                  <div className={`w-[40px] h-[40px] rounded-xl flex items-center justify-center shrink-0 border ${iconBg} shadow-3xs`}>
                    <NotifIcon size={18} />
                  </div>

                  <div className="flex-1 min-w-0 pr-6 text-left">
                    <div className="flex items-center justify-between gap-2">
                      <h4 className={`text-[13px] leading-tight ${
                        notif.unread ? 'font-extrabold text-slate-900' : 'font-semibold text-slate-700'
                      }`}>
                        {notif.title}
                      </h4>
                      <span className="text-[9.5px] font-mono font-bold text-slate-400 shrink-0 bg-slate-50 px-1.5 py-0.5 rounded">
                        {notif.time}
                      </span>
                    </div>
                    <p className="text-[12px] text-slate-500 leading-normal mt-1 whitespace-normal">
                      {notif.description}
                    </p>
                  </div>

                  <button
                    onClick={(e) => deleteNotification(notif.id, e)}
                    className="opacity-0 group-hover:opacity-100 hover:text-rose-600 hover:bg-rose-50 text-slate-400 p-1.5 rounded-lg transition-all absolute right-2.5 top-2.5"
                    title="Dismiss notification"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
