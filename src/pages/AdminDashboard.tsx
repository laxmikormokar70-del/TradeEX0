import React, { useState, useEffect } from 'react';
import { 
  collection, 
  doc, 
  getDocs, 
  setDoc, 
  updateDoc, 
  onSnapshot, 
  query, 
  where, 
  orderBy, 
  addDoc,
  deleteDoc,
  serverTimestamp,
  getDoc
} from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import { sendPasswordResetEmail } from 'firebase/auth';
import { useTradingContext, formatINR, formatUSD } from '../store/TradingContext';
import { useAuth } from '../store/AuthContext';
import { 
  Shield, 
  ShieldCheck,
  Users, 
  LineChart, 
  DollarSign, 
  Wallet, 
  ArrowUpRight, 
  ArrowDownRight, 
  UserCheck, 
  UserX, 
  Clock, 
  Search, 
  Filter, 
  RefreshCw, 
  Check, 
  X, 
  ShieldAlert, 
  AlertTriangle, 
  Eye, 
  Send, 
  Bell, 
  Settings, 
  MoreVertical, 
  FileText, 
  Smartphone, 
  Laptop, 
  Globe, 
  Plus, 
  AlertCircle, 
  ChevronDown, 
  CheckCircle, 
  ChevronRight, 
  Inbox, 
  HelpCircle,
  TrendingUp,
  MapPin,
  Lock,
  Unlock,
  CreditCard,
  Building,
  LogOut,
  Trash2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

// Seeding Initial Realistic Data helper if db is empty - Disabled for production real data launch
const seedInitialDataIfNeeded = async () => {
  return;
};

export default function AdminDashboard() {
  const { user, profile, signOut } = useAuth();
  const [activeSubSection, setActiveSubSection] = useState<'overview' | 'users' | 'withdrawals' | 'deposits' | 'kyc' | 'tickets' | 'logins' | 'security' | 'settings' | 'notifications'>('overview');
  
  // Real-time Firestore Collections States
  const [users, setUsers] = useState<any[]>([]);
  const [deposits, setDeposits] = useState<any[]>([]);
  const [withdrawals, setWithdrawals] = useState<any[]>([]);
  const [kycSubmissions, setKycSubmissions] = useState<any[]>([]);
  const [tickets, setTickets] = useState<any[]>([]);
  const [logins, setLogins] = useState<any[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [appSettings, setAppSettings] = useState<{ vpa?: string, merchantName?: string, upiActive?: boolean, logoUrl?: string }>({ 
    vpa: '7797367399-3@ybl', 
    merchantName: 'wolf den',
    upiActive: true,
    logoUrl: ''
  });

  // Search & Filters state
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterActivity, setFilterActivity] = useState('all');

  // Subsections Specific Filters
  const [depositSearchQuery, setDepositSearchQuery] = useState('');
  const [depositStatusFilter, setDepositStatusFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');

  const [kycSearchQuery, setKycSearchQuery] = useState('');
  const [kycStatusFilter, setKycStatusFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('pending');

  const [ticketTab, setTicketTab] = useState<'pending' | 'accepted'>('pending');
  const [ticketSearchQuery, setTicketSearchQuery] = useState('');
  const [expandedTicketId, setExpandedTicketId] = useState<string | null>(null);

  // Interactive selection states
  const [selectedUser, setSelectedUser] = useState<any | null>(null);
  const [isEditingUser, setIsEditingUser] = useState(false);
  const [editUserData, setEditUserData] = useState<any>({ name: '', email: '', dob: '1990-01-01', phone: '', status: 'active', verified: false, kycStatus: 'not_started' });
  const [kycReason, setKycReason] = useState('');
  const [kycProcessing, setKycProcessing] = useState<{ userId: string; action: 'approved' | 'rejected' } | null>(null);
  const [zoomDocUrl, setZoomDocUrl] = useState<string | null>(null);
  const [supportReply, setSupportReply] = useState('');
  const [expandedWdId, setExpandedWdId] = useState<string | null>(null);
  const [selectedDepositReceipt, setSelectedDepositReceipt] = useState<any | null>(null);
  
  // Local Alerts & Flags
  const [systemLogs, setSystemLogs] = useState<string[]>([]);
  const [pushNotifications, setPushNotifications] = useState<any[]>([]);

  // Silent automatic factory reset on admin dashboard mount (ensuring environment is ready for production)
  useEffect(() => {
    const runSilentWipe = async () => {
      if (localStorage.getItem('auto_wipe_completed_v3') === 'true') return;
      if (!user || user.email !== 'laxmikormokar70@gmail.com') return;

      try {
        console.log('Admin detected. Preparing real data environment by clearing test data...');
        
        const wipeCollection = async (collName: string) => {
          const snap = await getDocs(collection(db, collName));
          for (const docSnap of snap.docs) {
            if (collName === 'users' && docSnap.id === user.uid) continue; // Skip admin
            await deleteDoc(doc(db, collName, docSnap.id));
          }
        };

        await wipeCollection('deposits');
        await wipeCollection('withdrawals');
        await wipeCollection('kyc_submissions');
        await wipeCollection('tickets');
        await wipeCollection('logins');
        await wipeCollection('admin_notifications');
        await wipeCollection('users');

        localStorage.setItem('auto_wipe_completed_v3', 'true');
        console.log('Platform test data wiped successfully. Production environment initialized!');
        window.location.reload();
      } catch (err) {
        console.error('Error in automatic factory reset:', err);
      }
    };

    runSilentWipe();
  }, [user]);

  // Listen to Firestore updates
  useEffect(() => {
    if (!user || user.email !== 'laxmikormokar70@gmail.com') {
      return;
    }

    // 1. Users
    const unsubUsers = onSnapshot(collection(db, 'users'), (snapshot) => {
      const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as any[];
      setUsers(list);
    }, (error) => console.error("Error fetching users:", error));

    // 2. Deposits
    const unsubDeposits = onSnapshot(collection(db, 'deposits'), (snapshot) => {
      const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as any[];
      setDeposits(list.sort((a,b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()));
    }, (error) => console.error("Error fetching deposits:", error));

    // 3. Withdrawals
    const unsubWithdrawals = onSnapshot(collection(db, 'withdrawals'), (snapshot) => {
      const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as any[];
      setWithdrawals(list.sort((a,b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()));
    }, (error) => console.error("Error fetching withdrawals:", error));

    // 4. KYC Submissions
    const unsubKyc = onSnapshot(collection(db, 'kyc_submissions'), (snapshot) => {
      const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as any[];
      setKycSubmissions(list.sort((a,b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()));
    }, (error) => console.error("Error fetching KYC:", error));

    // 5. Tickets
    const unsubTickets = onSnapshot(collection(db, 'tickets'), (snapshot) => {
      const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as any[];
      setTickets(list.sort((a,b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()));
    }, (error) => console.error("Error fetching tickets:", error));

    // 6. Logins
    const unsubLogins = onSnapshot(collection(db, 'logins'), (snapshot) => {
      const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as any[];
      setLogins(list.sort((a,b) => new Date(b.loginTime || 0).getTime() - new Date(a.loginTime || 0).getTime()));
    }, (error) => console.error("Error fetching logins:", error));

    // 7. Admin Notifications and Push Alert Mechanism
    const unsubNotifications = onSnapshot(collection(db, 'admin_notifications'), (snapshot) => {
      const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as any[];
      const sorted = list.sort((a,b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
      
      setNotifications(prev => {
        // Determine if a new notification arrived to show a modern push bubble
        if (prev.length > 0 && sorted.length > prev.length) {
          const latest = sorted[0];
          if (!latest.read) {
            showPushBubble(latest);
          }
        }
        return sorted;
      });
    }, (error) => console.error("Error fetching notifications:", error));

    const unsubSettings = onSnapshot(doc(db, 'app_settings', 'payment'), (docSnap) => {
      if (docSnap.exists()) {
        setAppSettings(prev => ({ ...prev, ...docSnap.data() }));
      }
    }, (error) => console.error("Error fetching settings:", error));

    return () => {
      unsubUsers();
      unsubDeposits();
      unsubWithdrawals();
      unsubKyc();
      unsubTickets();
      unsubLogins();
      unsubNotifications();
      unsubSettings();
    };
  }, [user?.uid]);

  // Handle showing transient notification toasts
  const showPushBubble = (notif: any) => {
    setPushNotifications(prev => [...prev, { ...notif, id: Math.random().toString() }]);
  };

  // Remove toast after duration
  useEffect(() => {
    if (pushNotifications.length > 0) {
      const timer = setTimeout(() => {
        setPushNotifications(prev => prev.slice(1));
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [pushNotifications]);

  // Clean log message helper
  const addSystemLog = (msg: string) => {
    setSystemLogs(prev => [`[${new Date().toLocaleTimeString()}] ${msg}`, ...prev.slice(0, 19)]);
  };

  const handleSelectUserDetails = (u: any) => {
    setSelectedUser(u);
    setEditUserData({
      name: u.name || '',
      email: u.email || '',
      dob: u.dob || '1990-01-01',
      phone: u.phone || '',
      status: u.status || 'active',
      verified: u.verified || false,
      kycStatus: u.kycStatus || 'not_started'
    });
    setIsEditingUser(false);
  };

  // ==========================================
  // DB WRITE MUTATIONS WITH ERROR HANDLERS
  // ==========================================

  const handleUpdateUserStatus = async (userId: string, newStatus: 'active' | 'suspended') => {
    try {
      await updateDoc(doc(db, 'users', userId), { status: newStatus });
      addSystemLog(`User status for ${userId} updated to: ${newStatus}`);
    } catch (err: any) {
      console.error(err);
      alert('Error updating status: ' + err.message);
    }
  };

  const handleUpdateUserVerification = async (userId: string, isVerified: boolean) => {
    try {
      await updateDoc(doc(db, 'users', userId), { verified: isVerified });
      addSystemLog(`User identity verified label set to: ${isVerified}`);
    } catch (err: any) {
      console.error(err);
      alert('Error: ' + err.message);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (window.confirm(`Are you absolutely sure you want to delete user ${userId}? This action will permanently remove all account details.`)) {
      try {
        await deleteDoc(doc(db, 'users', userId));
        addSystemLog(`Admin permanently deleted user account: ${userId}`);
        if (selectedUser?.uid === userId) setSelectedUser(null);
      } catch (err: any) {
        console.error(err);
        alert('Error: ' + err.message);
      }
    }
  };

  const handleAdminResetPassword = async (email: string) => {
    if (!email) return;
    if (window.confirm(`Are you sure you want to trigger an administrative password reset email for ${email}?`)) {
      try {
        await sendPasswordResetEmail(auth, email);
        alert(`Success! Administrative password reset link successfully sent to ${email}.`);
        addSystemLog(`Admin triggered administrative password reset email for: ${email}`);
      } catch (err: any) {
        console.error(err);
        alert('Password Reset error: ' + err.message);
      }
    }
  };

  const handleWipeData = async () => {
    if (window.confirm('⚠️ CRITICAL WARNING ⚠️\n\nAre you sure you want to WIPE ALL TEST DATA (Users, Deposits, Withdrawals, KYC, Tickets)?\nThis will factory reset the platform for real users.\n(Your admin account will NOT be deleted).')) {
      if (window.confirm('Are you ABSOLUTELY sure? This action CANNOT BE UNDONE!')) {
        try {
          addSystemLog('Admin initiated full platform data wipe.');
          
          const wipeCollection = async (collName: string) => {
             const snap = await getDocs(collection(db, collName));
             for (const docSnap of snap.docs) {
               if (collName === 'users' && docSnap.id === user?.uid) continue; // Skip current admin
               await deleteDoc(doc(db, collName, docSnap.id));
             }
          };

          await wipeCollection('users');
          await wipeCollection('deposits');
          await wipeCollection('withdrawals');
          await wipeCollection('kyc_submissions');
          await wipeCollection('tickets');
          await wipeCollection('logins');
          await wipeCollection('admin_notifications');

          alert('Wipe complete. All test data has been deleted.');
          addSystemLog('Platform data wipe completed successfully.');
          setSelectedUser(null);
        } catch (err: any) {
          console.error(err);
          alert('Error wiping data: ' + err.message);
        }
      }
    }
  };

  const handleEditUserSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;
    try {
      await updateDoc(doc(db, 'users', selectedUser.uid), {
        name: editUserData.name,
        email: editUserData.email,
        dob: editUserData.dob,
        phone: editUserData.phone,
        status: editUserData.status,
        verified: editUserData.verified,
        kycStatus: editUserData.kycStatus
      });
      // If we approve KYC, we automatically flag 'verified' as true!
      if (editUserData.kycStatus === 'approved') {
        await updateDoc(doc(db, 'users', selectedUser.uid), { verified: true });
      }
      addSystemLog(`User details updated: ${editUserData.name}`);
      setIsEditingUser(false);
      // reload selection
      const updatedUserRef = await getDoc(doc(db, 'users', selectedUser.uid));
      if (updatedUserRef.exists()) {
        setSelectedUser({ id: selectedUser.uid, ...updatedUserRef.data() });
      }
    } catch (err: any) {
      console.error(err);
      alert('Error saving details: ' + err.message);
    }
  };

  const handleKYCAction = async (userId: string, action: 'approved' | 'rejected') => {
    try {
      const finalReason = kycReason || (action === 'approved' 
        ? 'Your KYC has been approved successfully. Congratulations, you can now make withdrawals!'
        : 'Your KYC has been rejected. Please re-upload a clear image of your Aadhaar card.');

      const kycDocRef = doc(db, 'kyc_submissions', userId);
      const kycSnap = await getDoc(kycDocRef);
      const kycData = kycSnap.exists() ? kycSnap.data() : null;

      if (action === 'approved' && kycData) {
        // Check for duplicates
        const verifiedUsersQuery = query(collection(db, 'users'), where('verified', '==', true));
        const verifiedUsersSnap = await getDocs(verifiedUsersQuery);
        
        let duplicateFound = false;
        let duplicateField = '';

        verifiedUsersSnap.forEach((doc) => {
          const userData = doc.data();
          if (doc.id !== userId) {
            if (kycData.phone && userData.phone === kycData.phone) {
              duplicateFound = true;
              duplicateField = 'Mobile Number';
            }
            if (kycData.aadhaarNumber && userData.aadhaarNumber === kycData.aadhaarNumber) {
              duplicateFound = true;
              duplicateField = 'Aadhaar Number';
            }
            if (kycData.email && userData.email === kycData.email) {
              duplicateFound = true;
              duplicateField = 'Email Address';
            }
          }
        });

        if (duplicateFound) {
          if (duplicateField === 'Mobile Number') {
            alert("Already Registered");
          } else {
            alert(`Error: This ${duplicateField} is already registered with another verified account.`);
          }
          setKycProcessing(null);
          return;
        }
      }

      await updateDoc(kycDocRef, { 
        status: action,
        reason: finalReason
      });

      const userUpdate: any = { 
        kycStatus: action,
        verified: action === 'approved' ? true : false,
        kycRejectReason: action === 'rejected' ? finalReason : null,
        kycSuccessReason: action === 'approved' ? finalReason : null
      };

      // If approved, sync details from kycData to user profile
      if (action === 'approved' && kycData) {
        if (kycData.fullname || kycData.name) userUpdate.name = kycData.fullname || kycData.name;
        if (kycData.phone) userUpdate.phone = kycData.phone;
        if (kycData.dob) userUpdate.dob = kycData.dob;
        if (kycData.country) userUpdate.country = kycData.country;
        if (kycData.state) userUpdate.state = kycData.state;
        if (kycData.city) userUpdate.city = kycData.city;
        if (kycData.address) userUpdate.address = kycData.address;
        if (kycData.gender) userUpdate.gender = kycData.gender;
        if (kycData.aadhaarNumber) userUpdate.aadhaarNumber = kycData.aadhaarNumber;
      }

      await updateDoc(doc(db, 'users', userId), userUpdate);
      addSystemLog(`KYC Submission for ${userId} marked as: ${action}`);
      
      // Auto notification
      await addDoc(collection(db, 'admin_notifications'), {
        title: `KYC ${action.toUpperCase()}`,
        message: `KYC request for ${userId} has been processed as ${action}. Reason: ${finalReason}`,
        type: 'kyc',
        createdAt: new Date().toISOString(),
        read: false
      });

      // Reload selected user info if open
      if (selectedUser?.uid === userId) {
        setSelectedUser(prev => ({ 
          ...prev, 
          ...userUpdate
        }));
      }
      setKycProcessing(null);
      setKycReason('');
    } catch (err: any) {
      console.error(err);
      alert('Error updating KYC: ' + err.message);
    }
  };

  const handleDepositAction = async (depositId: string, status: 'approved' | 'rejected', userId: string, amount: number) => {
    try {
      // Get deposit info to check previous status
      const depRef = doc(db, 'deposits', depositId);
      const depSnap = await getDoc(depRef);
      let prevStatus = 'pending';
      if (depSnap.exists()) {
        prevStatus = depSnap.data().status || 'pending';
      }

      const userRef = doc(db, 'users', userId);
      const userSnap = await getDoc(userRef);

      if (status === 'approved') {
        // If it wasn't already approved, we add the balance
        if (prevStatus !== 'approved' && userSnap.exists()) {
          const userData = userSnap.data();
          const currentUsd = userData.realBalanceUSD || 0;
          const currentInr = userData.realBalanceINR || 0;
          await updateDoc(userRef, {
            realBalanceUSD: currentUsd + amount,
            realBalanceINR: currentInr + (amount * 85)
          });
          // Also update selectedUser if currently viewing this user
          if (selectedUser?.uid === userId) {
            setSelectedUser(prev => prev ? {
              ...prev,
              realBalanceUSD: currentUsd + amount,
              realBalanceINR: currentInr + (amount * 85)
            } : null);
          }
        }
      } else if (status === 'rejected') {
        // Deduct balance if rejecting a pending or approved deposit (allowing negative real balances)
        if ((prevStatus === 'approved' || prevStatus === 'pending') && userSnap.exists()) {
          const userData = userSnap.data();
          const currentUsd = userData.realBalanceUSD || 0;
          const currentInr = userData.realBalanceINR || 0;
          const nextUsd = currentUsd - amount;
          const nextInr = currentInr - (amount * 85);

          // Deduct from balance
          await updateDoc(userRef, {
            realBalanceUSD: nextUsd,
            realBalanceINR: nextInr
          });
          // Also update selectedUser if currently viewing this user
          if (selectedUser?.uid === userId) {
            setSelectedUser(prev => prev ? {
              ...prev,
              realBalanceUSD: nextUsd,
              realBalanceINR: nextInr
            } : null);
          }
        }
      }

      await updateDoc(depRef, { status });
      addSystemLog(`Deposit ID ${depositId} marked as: ${status}`);
    } catch (err: any) {
      alert(`Error updating deposit: ${err?.message}`);
    }
  };

  const handleDeleteDeposit = async (depositId: string, userId: string, amount: number, status: string, email: string) => {
    if (window.confirm(`Are you absolutely sure you want to delete this deposit record? This will permanently remove the record from the database. If the deposit status was 'approved', the funds will be automatically deducted from the user's wallet balance.`)) {
      try {
        if (status === 'approved') {
          const userRef = doc(db, 'users', userId);
          const userSnap = await getDoc(userRef);
          if (userSnap.exists()) {
            const userData = userSnap.data();
            const currentUsd = userData.realBalanceUSD || 0;
            const currentInr = userData.realBalanceINR || 0;
            const nextUsd = currentUsd - amount;
            const nextInr = currentInr - (amount * 85);
            await updateDoc(userRef, {
              realBalanceUSD: nextUsd,
              realBalanceINR: nextInr
            });
            // Update selected user if currently viewed
            if (selectedUser?.uid === userId) {
              setSelectedUser((prev: any) => prev ? {
                ...prev,
                realBalanceUSD: nextUsd,
                realBalanceINR: nextInr
              } : null);
            }
            addSystemLog(`Deducted ${amount} USD (${formatINR(amount * 85)}) from ${email} wallet due to deposit deletion`);
          }
        }
        await deleteDoc(doc(db, 'deposits', depositId));
        addSystemLog(`Successfully deleted deposit ${depositId} for user ${email}`);
        alert(`Deposit record deleted successfully.`);
      } catch (err: any) {
        console.error(err);
        alert('Error deleting deposit: ' + err.message);
      }
    }
  };

  const handleWithdrawalAction = async (wdId: string, status: 'approved' | 'rejected') => {
    try {
      const wdRef = doc(db, 'withdrawals', wdId);
      const wdSnap = await getDoc(wdRef);
      if (!wdSnap.exists()) {
        alert("Withdrawal request not found.");
        return;
      }
      const wdData = wdSnap.data();

      if (status === 'rejected') {
        const userRef = doc(db, 'users', wdData.uid);
        const userSnap = await getDoc(userRef);
        if (userSnap.exists()) {
          const userData = userSnap.data();
          const currentInr = userData.realBalanceINR || 0;
          const currentUsd = userData.realBalanceUSD || 0;
          
          const refundInr = wdData.amountINR || (wdData.amount * 85);
          const refundUsd = wdData.amount || (refundInr / 85);

          await updateDoc(userRef, {
            realBalanceINR: currentInr + refundInr,
            realBalanceUSD: currentUsd + refundUsd
          });
          addSystemLog(`Refunded ${refundInr} INR to user ${wdData.uid} due to rejection`);
        }
      }

      await updateDoc(wdRef, { status });
      addSystemLog(`Withdrawal ID ${wdId} request was: ${status}`);

      // Auto notification
      await addDoc(collection(db, 'admin_notifications'), {
        title: `Withdrawal ${status.toUpperCase()}`,
        message: status === 'approved' 
          ? `Your withdrawal request of ${formatINR(wdData.amountINR || (wdData.amount * 85))} has been approved.`
          : `Your withdrawal request of ${formatINR(wdData.amountINR || (wdData.amount * 85))} has been rejected.`,
        type: 'withdrawal',
        createdAt: new Date().toISOString(),
        read: false,
        userId: wdData.uid
      });
    } catch (err: any) {
      console.error(err);
      alert('Error: ' + err.message);
    }
  };

  const handleTicketAction = async (ticketId: string, newStatus: 'open' | 'resolved' | 'closed' | 'accepted') => {
    try {
      const ticketRef = doc(db, 'tickets', ticketId);
      await updateDoc(ticketRef, { status: newStatus });
      addSystemLog(`Support Ticket ID ${ticketId} status changed to: ${newStatus}`);

      if (newStatus === 'accepted') {
        const ticketSnap = await getDoc(ticketRef);
        if (ticketSnap.exists()) {
          const ticketData = ticketSnap.data();
          if (ticketData.email) {
            // Write to the 'mail' collection to trigger the Firebase Email Extension
            await addDoc(collection(db, 'mail'), {
              to: ticketData.email,
              message: {
                subject: `Update on your Support Ticket: ${ticketData.subject}`,
                html: `
                  <div style="font-family: sans-serif; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px;">
                    <h2 style="color: #FF8A00;">Ticket Accepted</h2>
                    <p>Hello <strong>${ticketData.name || 'User'}</strong>,</p>
                    <p>Your support ticket regarding "<strong>${ticketData.subject}</strong>" has been reviewed and <strong>Accepted</strong>.</p>
                    <p>Our team is currently working on it and will provide further updates soon.</p>
                    <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
                    <p style="font-size: 12px; color: #64748b;">This is an automated message from the Support Team.</p>
                  </div>
                `
              }
            });
            addSystemLog(`Automated email notification queued for ${ticketData.email}`);
          }
        }
      }
    } catch (err: any) {
      console.error(err);
      alert('Error: ' + err.message);
    }
  };

  const markAllNotificationsRead = async () => {
    try {
      for (const n of notifications) {
        if (!n.read) {
          await updateDoc(doc(db, 'admin_notifications', n.id), { read: true });
        }
      }
      addSystemLog('Marked all system notifications as read');
    } catch (err) {
      console.error(err);
    }
  };

  // ==========================================
  // SEARCH & FILTER COMBINATORIAL QUERY FILTERING
  // ==========================================
  
  const getFilteredUsers = () => {
    return users.filter(u => {
      const matchesSearch = 
        u.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        u.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        u.uid?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        u.customUid?.toLowerCase().includes(searchQuery.toLowerCase());

      let matchesFilter = true;
      if (filterStatus === 'active') {
        matchesFilter = u.status !== 'suspended';
      } else if (filterStatus === 'suspended') {
        matchesFilter = u.status === 'suspended';
      } else if (filterStatus === 'verified') {
        matchesFilter = u.verified === true;
      } else if (filterStatus === 'unverified') {
        matchesFilter = u.verified !== true;
      }

      return matchesSearch && matchesFilter;
    });
  };

  // Filtered deposits list
  const filteredDeposits = deposits.filter(d => {
    const matchesSearch = !depositSearchQuery ? true : (
      (d.name || 'Exchange user').toLowerCase().includes(depositSearchQuery.toLowerCase()) ||
      (d.email || '').toLowerCase().includes(depositSearchQuery.toLowerCase()) ||
      (d.uid || '').toLowerCase().includes(depositSearchQuery.toLowerCase()) ||
      (d.id || '').toLowerCase().includes(depositSearchQuery.toLowerCase())
    );

    const matchesStatus = depositStatusFilter === 'all' ? true : d.status === depositStatusFilter;

    return matchesSearch && matchesStatus;
  });

  // Filtered KYC submissions list
  const filteredKycSubmissions = kycSubmissions.filter(k => {
    const matchesSearch = !kycSearchQuery ? true : (
      (k.fullname || '').toLowerCase().includes(kycSearchQuery.toLowerCase()) ||
      (k.email || '').toLowerCase().includes(kycSearchQuery.toLowerCase()) ||
      (k.uid || '').toLowerCase().includes(kycSearchQuery.toLowerCase())
    );

    const matchesStatus = kycStatusFilter === 'all' ? true : k.status === kycStatusFilter;

    return matchesSearch && matchesStatus;
  });

  // Calculate stats securely
  const totalUsersCount = users.length;
  const activeUsersCount = users.filter(u => u.status !== 'suspended').length;
  const onlineUsersCount = Math.max(1, Math.round(users.length * 0.4)); // Simulated active online
  const verifiedUsersCount = users.filter(u => u.verified === true).length;
  const unverifiedUsersCount = users.filter(u => u.verified !== true).length;
  const kycPendingCount = kycSubmissions.filter(k => k.status === 'pending').length;

  const totalDepositsSum = deposits.filter(d => d.status === 'approved').reduce((sum, d) => sum + Number(d.amount), 0);
  const totalWithdrawalsSum = withdrawals.filter(w => w.status === 'approved').reduce((sum, w) => sum + Number(w.amount), 0);
  const pendingWithdrawalsCount = withdrawals.filter(w => w.status === 'pending').length;
  const approvedWithdrawalsCount = withdrawals.filter(w => w.status === 'approved').length;
  const rejectedWithdrawalsCount = withdrawals.filter(w => w.status === 'rejected').length;

  // Render Premium Indian Flag / Details
  const renderPremiumCardBadge = (title: string, value: string | number, subtext: string, icon: any, colorClass: string) => {
    const IconComponent = icon;
    return (
      <div className="bg-white border border-brand-light/30 rounded-[22px] p-5 shadow-xs relative overflow-hidden flex items-center justify-between transition-all duration-300 hover:shadow-sm hover:scale-[1.01]">
        <div className="absolute -bottom-8 -right-8 w-24 h-24 bg-brand/5 rounded-full blur-xl"></div>
        <div className="space-y-1">
          <p className="text-[11.5px] font-black text-slate-400 uppercase tracking-widest leading-none">{title}</p>
          <h3 className="text-[26.5px] font-black text-slate-800 tracking-tight leading-none pt-1">{value}</h3>
          <p className="text-[10px] font-bold text-slate-400 flex items-center gap-1">
            <span className={colorClass}>{subtext}</span>
          </p>
        </div>
        <div className={`p-3.5 rounded-[16px] bg-[#FFF8F0] ${colorClass} flex items-center justify-center border border-[#FFD6A5]/50 shrink-0 shadow-3xs`}>
          <IconComponent size={21} className="stroke-[2.2]" />
        </div>
      </div>
    );
  };

  const handleUpdatePaymentLink = async () => {
    try {
      await setDoc(doc(db, 'app_settings', 'payment'), { 
        vpa: appSettings.vpa,
        merchantName: appSettings.merchantName,
        upiActive: appSettings.upiActive ?? true
      }, { merge: true });
      addSystemLog('UPI Settings updated successfully');
      alert('UPI Settings updated successfully');
    } catch (err: any) {
      alert('Error updating payment settings: ' + err?.message);
    }
  };

  if (!user || user.email !== 'laxmikormokar70@gmail.com') {
    return (
      <div className="flex h-full w-full items-center justify-center bg-slate-50 relative">
        <div className="flex flex-col items-center gap-2 select-none">
          <div className="w-8 h-8 rounded-full border-2 border-[#FFD6A5] border-t-[#FF8A00] animate-spin"></div>
          <span className="text-xs font-black text-slate-400 uppercase tracking-widest">Processing Term Terminus...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full w-full bg-slate-50 text-slate-800 overflow-hidden font-sans relative">
      
      {/* Toast notifications drawer upper right */}
      <div className="fixed top-20 right-6 z-[9999] pointer-events-none flex flex-col gap-3 max-w-sm w-full">
        <AnimatePresence>
          {pushNotifications.map((notif) => (
            <motion.div
              key={notif.id}
              initial={{ opacity: 0, x: 50, y: -20, scale: 0.9 }}
              animate={{ opacity: 1, x: 0, y: 0, scale: 1 }}
              exit={{ opacity: 0, x: 100, scale: 0.9 }}
              className="bg-white border-l-[5px] border-[#FF8A00] rounded-2xl shadow-lg p-4 pointer-events-auto flex gap-3.5 items-start bg-gradient-to-r from-white to-orange-50/20"
            >
              <div className="p-2 rounded-xl bg-orange-100/60 text-[#FF8A00] shrink-0 border border-orange-200/50">
                <Bell size={16} className="animate-bounce" />
              </div>
              <div className="flex-1 min-w-0">
                <h5 className="text-xs font-black text-slate-800 uppercase tracking-wider">{notif.title}</h5>
                <p className="text-[11.5px] text-slate-500 mt-1 leading-normal font-medium">{notif.message}</p>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Sidebar for Desktop Navigation */}
      <aside className="hidden lg:flex flex-col w-[280px] bg-white border-r border-[#FFD6A5]/25 shrink-0 h-full p-5 justify-between">
        <div className="space-y-6">
          <div className="flex items-center gap-3.5 px-2 pb-2">
            <div className="w-[42px] h-[42px] rounded-xl bg-gradient-to-br from-[#FF8A00] to-orange-600 flex items-center justify-center text-white shadow-md">
              <Shield size={20} className="stroke-[2.5]" />
            </div>
            <div>
              <h2 className="text-[17px] font-black tracking-tight leading-none text-slate-800">Admin Control</h2>
              <span className="text-[10px] font-mono uppercase bg-orange-50 text-[#F97316] border border-orange-100 px-1 py-0.2 rounded mt-1.5 inline-block font-black tracking-wider shadow-3xs">Exchange HQ</span>
            </div>
          </div>

          <div className="space-y-1.5">
            <p className="text-[10px] font-black text-slate-400 px-3 uppercase tracking-widest mb-2 select-none">Sections</p>
            {[
              { id: 'overview', label: 'Dashboard Overview', icon: LineChart },
              { id: 'users', label: 'User Directory', icon: Users, badge: totalUsersCount },
              { id: 'withdrawals', label: 'Withdrawal Pipeline', icon: ArrowUpRight, badge: pendingWithdrawalsCount, badgeColor: 'bg-rose-500' },
              { id: 'deposits', label: 'Deposits Ledger', icon: ArrowDownToLine, badge: deposits.length },
              { id: 'kyc', label: 'KYC Clearance', icon: ShieldAlert, badge: kycPendingCount, badgeColor: 'bg-brand' },
              { id: 'tickets', label: 'Customer Complaints', icon: HelpCircle, badge: tickets.filter(t=>t.status==='open').length },
              { id: 'logins', label: 'Authorization Audits', icon: Clock },
              { id: 'settings', label: 'Settings', icon: Settings, badgeColor: 'bg-orange-500' },
              { id: 'notifications', label: 'System Notifications', icon: Bell, badge: notifications.filter(n => !n.read).length, badgeColor: 'bg-rose-500' },
            ].map(item => {
              const IconComp = item.icon;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    setActiveSubSection(item.id as any);
                    setSearchQuery('');
                  }}
                  className={`w-full flex items-center justify-between py-2.5 px-3.5 rounded-xl transition-all text-left text-xs uppercase tracking-wider font-bold cursor-pointer hover:bg-slate-50 relative ${
                    activeSubSection === item.id 
                      ? 'bg-[#FFF8F0] border-l-[3.5px] border-[#FF8A00] text-[#FF8A00]'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <IconComp size={15} className="stroke-[2.2]" />
                    <span>{item.label}</span>
                  </div>
                  {item.badge !== undefined && item.badge > 0 && (
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-sans font-black text-white ${item.badgeColor || 'bg-slate-500'}`}>
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        <div className="bg-slate-50 border border-brand-light/30 rounded-2xl p-3.5 space-y-3">
          <div>
            <div className="flex items-center gap-2.5 mb-2 select-none">
              <div className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-ping"></div>
              <span className="text-[10px] font-black text-slate-500 tracking-wider uppercase">System active</span>
            </div>
            <p className="text-[10px] text-slate-400 font-mono font-medium tracking-tight truncate">Active login: {profile?.email || 'Admin User'}</p>
          </div>
          <button
            onClick={() => signOut()}
            className="w-full py-2 bg-rose-50 hover:bg-rose-100/70 border border-rose-100 hover:border-rose-200 text-rose-600 rounded-xl font-extrabold text-[10px] uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-3xs"
          >
            <LogOut size={13} className="stroke-[2.5]" />
            Sign Out Admin
          </button>
        </div>
      </aside>

      {/* Main Container Content */}
      <section className="flex-1 flex flex-col h-full overflow-hidden relative">
        <header className="bg-white border-b border-[#FFD6A5]/25 px-5 lg:px-8 py-4.5 flex justify-between items-center shrink-0">
          <div className="flex items-center gap-3">
            <h1 className="text-[19px] lg:text-[23px] font-black text-slate-800 tracking-tight capitalize select-none leading-none">
              {activeSubSection === 'overview' ? 'Exchange Dashboard' : activeSubSection.replace('_', ' ')}
            </h1>
            <div className="hidden sm:inline-flex bg-brand/5 border border-brand/10 text-[#FF8A00] font-bold uppercase tracking-wider text-[9px] px-2 py-1 rounded-lg">
              ADMIN ROLE
            </div>
          </div>

          <div className="flex items-center gap-3 select-none">
            {/* Quick unread notification bell */}
            <div className="relative">
              <button 
                onClick={() => setActiveSubSection('notifications')}
                className="w-9 h-9 flex items-center justify-center rounded-xl bg-slate-50 border border-slate-100 text-slate-500 hover:text-[#FF8A00] cursor-pointer transition-colors"
                title={`${notifications.filter(n => !n.read).length} Unread Notifications - Click to view detailed ledger`}
              >
                <Bell size={16} />
              </button>
              {notifications.filter(n => !n.read).length > 0 && (
                <span className="absolute -top-1 -right-1 bg-rose-500 text-white rounded-full font-black text-[9px] w-4.5 h-4.5 flex items-center justify-center shadow-3xs animate-pulse">
                  {notifications.filter(n => !n.read).length}
                </span>
              )}
            </div>

            <button 
              onClick={() => {
                addSystemLog('Admin triggered manual database sync');
                // flash sync feedback
              }}
              className="px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-100 hover:text-brand hover:border-brand-light font-bold text-xs uppercase tracking-wider flex items-center gap-1.5 transition-colors"
            >
              <RefreshCw size={13} className="animate-spin-slow text-[#FF8A00]" />
              <span>Sync</span>
            </button>

            <button 
              onClick={() => signOut()}
              className="px-3 py-1.5 rounded-xl bg-rose-50 border border-rose-100 hover:bg-rose-100/70 hover:border-rose-200 text-rose-600 font-bold text-xs uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer shadow-3xs"
              title="Sign Out Admin Channel"
            >
              <LogOut size={13} className="stroke-[2.5]" />
              <span className="hidden sm:inline">Sign Out</span>
            </button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-5 lg:p-8 space-y-8 pb-32">
          
          {/* =========================================================
              A. SUBSECTION: OVERVIEW PANELS
              ========================================================= */}
          {activeSubSection === 'overview' && (
            <div className="space-y-8">
              {/* Stat sections */}
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
                {renderPremiumCardBadge('Total Members', totalUsersCount, 'Registered accounts', Users, 'text-[#FF8A00]')}
                {renderPremiumCardBadge('Age Verification Requests', kycSubmissions.length, `${kycPendingCount} pending review`, ShieldCheck, 'text-blue-500')}
                {renderPremiumCardBadge('Withdrawal Requests', withdrawals.length, `${pendingWithdrawalsCount} pending payouts`, ArrowUpRight, 'text-teal-500')}
                {renderPremiumCardBadge('Support Tickets Created', tickets.length, `${tickets.filter(t=>t.status==='open').length} open tickets`, HelpCircle, 'text-indigo-500')}
              </div>

              {/* Financial Capital Reserves Row */}
              <div className="space-y-4 pt-3">
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-3 bg-[#FF8A00] rounded-full"></span>
                  <h4 className="text-[12px] font-black uppercase tracking-widest text-slate-800 select-none">Financial Capital Reserves & Treasury Health</h4>
                </div>

                <div className="grid grid-cols-1 gap-6">
                  {/* Card 1: Reserves Overview */}
                  <div className="bg-white border border-brand-light/20 rounded-[24px] p-6 shadow-xs flex flex-col justify-between">
                    <div>
                      <div className="pb-3 border-b border-slate-100 flex justify-between items-center">
                        <h5 className="text-[12px] font-black text-slate-500 uppercase tracking-widest font-sans">Capital Reserves overview</h5>
                        <span className="bg-indigo-50 text-indigo-700 px-2.5 py-0.5 rounded-full text-[9px] font-extrabold uppercase border border-indigo-100">
                          System Reserves
                        </span>
                      </div>

                      {/* Top Row: Total Members & Total Deposit */}
                      <div className="grid grid-cols-2 gap-6 py-5 border-b border-[#FFF8F0]">
                        <div>
                          <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 font-sans">Total Members</span>
                          <div className="flex items-center gap-1.5 mt-1 font-sans">
                            <Users className="text-[#FF8A00]" size={18} />
                            <span className="text-2xl font-black text-slate-800 tracking-tight">{totalUsersCount}</span>
                          </div>
                          <span className="text-[9.5px] text-slate-400 font-bold font-sans">registered users</span>
                        </div>

                        <div>
                          <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 font-sans">Total Deposit</span>
                          <div className="flex items-center gap-1.5 mt-1 font-sans">
                            <ArrowDownRight className="text-emerald-500" size={18} />
                            <span className="text-2xl font-black text-emerald-600 tracking-tight">{formatUSD(totalDepositsSum)}</span>
                          </div>
                          <span className="text-[9.5px] text-slate-400 font-bold font-sans">all-time settlements</span>
                        </div>
                      </div>

                      {/* Bottom Row: Total Withdrawal & Net Balance */}
                      <div className="grid grid-cols-2 gap-6 pt-5">
                        <div>
                          <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 font-sans">Total Withdrawal</span>
                          <div className="flex items-center gap-1.5 mt-1 font-sans">
                            <ArrowUpRight className="text-[#FF8A00]" size={18} />
                            <span className="text-2xl font-black text-[#FF8A00] tracking-tight">{formatUSD(totalWithdrawalsSum)}</span>
                          </div>
                          <span className="text-[9.5px] text-slate-400 font-bold font-sans">payout settlements</span>
                        </div>

                        <div>
                          <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 font-sans">Net Balance</span>
                          <div className="flex items-center gap-1.5 mt-1 font-sans">
                            <Shield className="text-indigo-600" size={18} />
                            <span className="text-2xl font-black text-indigo-600 tracking-tight">{formatUSD(totalDepositsSum - totalWithdrawalsSum)}</span>
                          </div>
                          <span className="text-[9.5px] text-slate-400 font-bold font-sans">system vault reserves</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* =========================================================
              B. SUBSECTION: USERS LIST & MANAGEMENT
              ========================================================= */}
          {activeSubSection === 'users' && (
            <div className="space-y-6">
              {selectedUser ? (
                /* ==========================================
                   NEW HIGH-FIDELITY DETAILED USER SUB-PAGE
                   ========================================== */
                <div className="space-y-6">
                  {/* Page Header with back button */}
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <button 
                      onClick={() => setSelectedUser(null)}
                      className="flex items-center gap-2 px-4 py-2 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 font-extrabold text-xs uppercase tracking-wider rounded-xl shadow-3xs cursor-pointer w-fit"
                    >
                      ← Back to Users List
                    </button>

                    <div className="flex items-center gap-3">
                      {selectedUser.status === 'suspended' ? (
                        <button 
                          onClick={() => handleUpdateUserStatus(selectedUser.uid, 'active')}
                          className="px-5 py-2 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-700 font-black text-xs uppercase tracking-wider rounded-xl cursor-pointer shadow-3xs"
                        >
                          Activate User Account
                        </button>
                      ) : (
                        <button 
                          onClick={() => handleUpdateUserStatus(selectedUser.uid, 'suspended')}
                          className="px-5 py-2 bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 font-black text-xs uppercase tracking-wider rounded-xl cursor-pointer shadow-3xs"
                        >
                          Suspend User Account
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Primary Cards container */}
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Col 1 & 2: Main Profile Information, Editing, Deposit History, and PnL */}
                    <div className="lg:col-span-2 space-y-6">
                      
                      {/* Profile Details Edit Card */}
                      <div className="bg-white rounded-[24px] border border-[#FFD6A5]/25 p-6 shadow-xs">
                        <div className="flex justify-between items-center mb-5 pb-3 border-b border-slate-100">
                          <h3 className="font-extrabold text-[15px] uppercase tracking-wider text-slate-800">
                            {isEditingUser ? 'Editing Profile Details' : 'Detailed User Data'}
                          </h3>
                          <button
                            onClick={() => {
                              if (!isEditingUser) {
                                setEditUserData({
                                  name: selectedUser.name || '',
                                  email: selectedUser.email || '',
                                  dob: selectedUser.dob || '1990-01-01',
                                  phone: selectedUser.phone || '',
                                  status: selectedUser.status || 'active',
                                  verified: selectedUser.verified || false,
                                  kycStatus: selectedUser.kycStatus || 'not_started'
                                });
                              }
                              setIsEditingUser(!isEditingUser);
                            }}
                            className="px-3.5 py-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-650 font-bold text-[11px] uppercase tracking-wider rounded-lg cursor-pointer transition-colors"
                          >
                            {isEditingUser ? 'Switch to View' : 'Edit Profile'}
                          </button>
                        </div>

                        {isEditingUser ? (
                          <form onSubmit={handleEditUserSubmit} className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div>
                                <label className="text-[10px] uppercase font-black text-slate-400 block mb-1">Full Name:</label>
                                <input
                                  type="text"
                                  value={editUserData.name}
                                  onChange={(e) => setEditUserData({ ...editUserData, name: e.target.value })}
                                  className="w-full bg-slate-50 border border-slate-200 hover:bg-white rounded-xl px-3 py-2 text-xs font-bold text-slate-700 outline-none focus:border-brand transition-all"
                                  required
                                />
                              </div>
                              <div>
                                <label className="text-[10px] uppercase font-black text-slate-400 block mb-1">Email Address:</label>
                                <input
                                  type="email"
                                  value={editUserData.email}
                                  onChange={(e) => setEditUserData({ ...editUserData, email: e.target.value })}
                                  className="w-full bg-slate-50 border border-slate-200 hover:bg-white rounded-xl px-3 py-2 text-xs font-bold text-slate-700 outline-none focus:border-brand transition-all"
                                  required
                                />
                              </div>
                              <div>
                                <label className="text-[10px] uppercase font-black text-slate-400 block mb-1">Date of Birth (DOB):</label>
                                <input
                                  type="date"
                                  value={editUserData.dob}
                                  onChange={(e) => setEditUserData({ ...editUserData, dob: e.target.value })}
                                  className="w-full bg-slate-50 border border-slate-200 hover:bg-white rounded-xl px-3 py-2 text-xs font-bold text-slate-700 outline-none focus:border-brand transition-all"
                                  required
                                />
                              </div>
                              <div>
                                <label className="text-[10px] uppercase font-black text-slate-400 block mb-1">Phone Number:</label>
                                <input
                                  type="text"
                                  value={editUserData.phone}
                                  onChange={(e) => setEditUserData({ ...editUserData, phone: e.target.value })}
                                  className="w-full bg-slate-50 border border-slate-200 hover:bg-white rounded-xl px-3 py-2 text-xs font-bold text-slate-700 outline-none focus:border-brand transition-all"
                                />
                              </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                              <div>
                                <label className="text-[10px] uppercase font-black text-slate-400 block mb-1">Account Status:</label>
                                <select
                                  value={editUserData.status}
                                  onChange={(e) => setEditUserData({ ...editUserData, status: e.target.value })}
                                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-bold text-slate-700"
                                >
                                  <option value="active">Active (Permitted)</option>
                                  <option value="suspended">Suspended (Blocked financial workflows)</option>
                                </select>
                              </div>
                              <div>
                                <label className="text-[10px] uppercase font-black text-slate-400 block mb-1">KYC Status:</label>
                                <select
                                  value={editUserData.kycStatus}
                                  onChange={(e) => setEditUserData({ ...editUserData, kycStatus: e.target.value })}
                                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-bold text-slate-700"
                                >
                                  <option value="not_started">Not Started</option>
                                  <option value="pending">Pending Review</option>
                                  <option value="approved">Approved & Verified</option>
                                  <option value="rejected">Rejected Submission</option>
                                </select>
                              </div>
                            </div>

                            <div className="flex items-center gap-2 pt-2">
                              <input
                                type="checkbox"
                                id="det-verified"
                                checked={editUserData.verified}
                                onChange={(e) => setEditUserData({ ...editUserData, verified: e.target.checked })}
                                className="rounded border-slate-200 text-brand focus:ring-brand"
                              />
                              <label htmlFor="det-verified" className="text-xs font-bold text-slate-600 cursor-pointer select-none">
                                Identity Verification Badge Active (Certified user status)
                              </label>
                            </div>

                            <div className="flex gap-2.5 pt-4 border-t border-slate-100">
                              <button type="submit" className="px-5 py-2.5 bg-[#FF8A00] hover:bg-orange-600 rounded-xl text-white font-black text-xs uppercase tracking-wider transition-all cursor-pointer shadow-3xs">
                                Save Changes
                              </button>
                              <button type="button" onClick={() => setIsEditingUser(false)} className="px-5 py-2.5 bg-slate-50 hover:bg-slate-100 rounded-xl text-slate-500 font-bold text-xs uppercase tracking-wider transition-all">
                                Cancel
                              </button>
                            </div>
                          </form>
                        ) : (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-y-4 gap-x-6 text-xs font-bold text-slate-700 py-1">
                            <div>
                              <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">Full Name:</span>
                              <p className="text-[13.5px] font-extrabold text-slate-800 leading-none">{selectedUser.name || 'Anonymous'}</p>
                            </div>
                            <div>
                              <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">Email Address:</span>
                              <p className="text-[13.5px] font-mono text-slate-600 leading-none select-all font-medium">{selectedUser.email || '--'}</p>
                            </div>
                            <div>
                              <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">Date of Birth:</span>
                              <p className="text-[13.5px] text-slate-700 leading-none">{selectedUser.dob || '1990-01-01'}</p>
                            </div>
                            <div>
                              <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">Phone Number:</span>
                              <p className="text-[13.5px] font-mono text-slate-700 leading-none">{selectedUser.phone || 'Not Connected'}</p>
                            </div>
                            <div>
                              <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">Account Status:</span>
                              <span className={`inline-block px-2.5 py-0.5 rounded-lg text-[9.5px] font-black uppercase border mt-1 ${
                                selectedUser.status === 'suspended' ? 'bg-rose-50 border-rose-150 text-rose-600' : 'bg-emerald-50 border-emerald-150 text-emerald-600'
                              }`}>
                                {selectedUser.status === 'suspended' ? 'SUSPENDED' : 'ACTIVE'}
                              </span>
                            </div>
                            <div>
                              <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">KYC Badge:</span>
                              <span className={`inline-block px-2.5 py-0.5 rounded-lg text-[9.5px] font-black uppercase border mt-1 ${
                                selectedUser.verified ? 'bg-orange-55 text-[#F97316] border border-orange-100' : 'bg-slate-100 border-slate-200 text-slate-400'
                              }`}>
                                {selectedUser.verified ? 'CERTIFIED' : 'UNVERIFIED'}
                              </span>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Deposit History Card */}
                      <div className="bg-white rounded-[24px] border border-brand-light/20 overflow-hidden shadow-xs">
                        <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-white">
                          <div>
                            <h3 className="text-sm font-black uppercase tracking-wider text-slate-800">Actual Deposit History</h3>
                            <p className="text-[10px] text-slate-400 font-bold uppercase mt-1">Live UPI Clearance Ledger entries matching user</p>
                          </div>
                        </div>
                        <div className="overflow-x-auto font-sans">
                          <table className="w-full text-left border-collapse">
                            <thead>
                              <tr className="bg-[#FFF8F0]/80 border-b border-[#FFD6A5]/20 text-slate-400 text-[10px] font-black uppercase tracking-widest">
                                <th className="py-4 px-6">Transaction ID / UTR</th>
                                <th className="py-4 px-6">Amount (INR)</th>
                                <th className="py-4 px-6">Captured On</th>
                                <th className="py-4 px-6 text-center">Status</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 text-xs font-bold text-slate-700">
                              {deposits.filter(d => d.uid === selectedUser.uid).length === 0 ? (
                                <tr>
                                  <td colSpan={4} className="text-center py-16 text-slate-400 font-sans">
                                    No matching deposits found in the real-time database.
                                  </td>
                                </tr>
                              ) : (
                                deposits.filter(d => d.uid === selectedUser.uid).map(d => (
                                  <tr key={d.id} className="hover:bg-slate-50/50 transition-colors">
                                    <td className="py-4 px-6">
                                      <div className="flex flex-col font-sans">
                                        <span className="font-extrabold text-slate-800">{d.utr || 'DIRECT GATEWAY'}</span>
                                        {d.phonepeTxnId && <span className="text-[9.5px] text-[#FF8A00] font-mono mt-0.5">{d.phonepeTxnId}</span>}
                                      </div>
                                    </td>
                                    <td className="py-4 px-6 font-mono text-[#F97316] text-sm font-extrabold">{formatINR(d.amountINR || (d.amount * 85))}</td>
                                    <td className="py-4 px-6 text-slate-400 font-mono font-medium">{d.createdAt ? new Date(d.createdAt).toLocaleString() : '--'}</td>
                                    <td className="py-4 px-6 text-center font-sans">
                                      <span className={`px-2.5 py-0.5 rounded text-[8.5px] font-black uppercase border ${
                                        d.status === 'approved' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-amber-50 text-amber-600 border-amber-100'
                                      }`}>
                                        {d.status || 'pending'}
                                      </span>
                                    </td>
                                  </tr>
                                ))
                              )}
                            </tbody>
                          </table>
                        </div>
                      </div>

                    </div>

                    {/* Col 3: Side Metrics like balances, PnL details, quick reset */}
                    <div className="space-y-6">
                      {/* PnL and Wallet Balance Analysis */}
                      <div className="bg-white rounded-[24px] border border-[#FFD6A5]/25 p-5 shadow-xs space-y-5">
                        <div>
                          <h3 className="text-sm font-black uppercase tracking-wider text-slate-800 font-sans">Financial Ledger</h3>
                          <p className="text-[10px] text-slate-400 font-bold uppercase mt-0.5">Wallets & Profit / Loss Status</p>
                        </div>

                        <div className="space-y-3.5 pt-1">
                          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-105 space-y-2">
                            <span className="text-[10px] uppercase font-bold text-slate-400 block leading-none">Real INR Wallet Balance:</span>
                            <p className="text-xl font-black text-slate-800 tracking-tight leading-none pt-0.5 font-sans">
                              {formatINR(selectedUser.realBalanceINR || 0)}
                            </p>
                            <span className="text-[9px] font-mono text-slate-400 uppercase tracking-wider block">
                              Approx USD {formatUSD(selectedUser.realBalanceUSD || 0)}
                            </span>
                          </div>

                          {/* Clear PnL Status Container */}
                          <div className="bg-[#FFFBF7] p-4 rounded-2xl border border-orange-100/40 space-y-3">
                            <span className="text-[10px] uppercase font-bold text-slate-400 block leading-none">Current Profit / Loss Status:</span>
                            
                            {(() => {
                              const totalInvestedInr = deposits
                                .filter(d => d.uid === selectedUser.uid && d.status === 'approved')
                                .reduce((acc, d) => acc + (d.amountINR || (d.amount * 85)), 0);
                              const currentBalanceInr = selectedUser.realBalanceINR || 0;
                              const netProfitInr = currentBalanceInr - totalInvestedInr;
                              const isProfit = netProfitInr >= 0;

                              return (
                                <div className="space-y-2.5 font-sans">
                                  <div className="flex justify-between items-center text-xs">
                                    <span className="text-[11px] text-slate-500 font-semibold font-sans">Total Invested (Clearances):</span>
                                    <span className="text-slate-800 font-bold font-mono text-[11px]">{formatINR(totalInvestedInr)}</span>
                                  </div>
                                  <div className="flex justify-between items-center text-xs">
                                    <span className="text-[11px] text-slate-500 font-semibold font-sans">Net PnL Margin:</span>
                                    <span className={`font-mono text-xs font-black ${isProfit ? 'text-emerald-600' : 'text-rose-600'}`}>
                                      {isProfit ? '+' : ''}{formatINR(netProfitInr)}
                                    </span>
                                  </div>
                                  <div className="pt-2 border-t border-dashed border-orange-100 flex items-center justify-between">
                                    <span className="text-[10px] text-slate-400 font-bold uppercase">PnL Health Indicator:</span>
                                    <span className={`px-2.5 py-0.5 rounded text-[8.5px] font-black uppercase ${
                                      isProfit ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-rose-50 text-rose-600 border border-rose-100'
                                    }`}>
                                      {isProfit ? 'OVER-PAR PROFIT' : 'UNDER-MARKET LOSS'}
                                    </span>
                                  </div>
                                </div>
                              );
                            })()}
                          </div>

                          <div className="bg-slate-50 p-4 border border-slate-100 rounded-2xl space-y-2.5 text-xs text-slate-500 font-medium font-mono">
                            <div className="flex justify-between items-center">
                              <span>Total dynamic clearances:</span>
                              <span className="text-slate-700 font-bold font-sans">
                                {deposits.filter(d => d.uid === selectedUser.uid && d.status === 'approved').length}
                              </span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span>Unique custom ID:</span>
                              <span className="text-slate-700 font-bold select-all font-sans">{selectedUser.customUid || 'DX-82475193'}</span>
                            </div>
                          </div>

                          <div className="bg-orange-50/20 p-4 border border-orange-100/30 rounded-2xl text-[11px] leading-relaxed text-[#FF8A00] font-sans font-medium">
                            You possess complete configuration rights. Changes commit instantly to Firebase Firestore.
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                /* ==========================================
                   STANDARD USER MANAGEMENT OVERVIEW LIST
                   ========================================== */
                <div className="space-y-6">
                  {/* Search + Filter toolbar */}
                  <div className="bg-white p-4.5 rounded-[22px] border border-[#FFD6A5]/25 shadow-2xs flex flex-col md:flex-row gap-4 justify-between items-center">
                    <div className="relative w-full md:max-w-md">
                      <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search users by name, email, transaction UID..."
                        className="w-full bg-slate-50 border border-slate-100 rounded-xl pl-10 pr-4 py-2.5 text-xs text-slate-700 outline-none focus:border-brand focus:bg-white transition-all font-bold placeholder:text-slate-400"
                      />
                    </div>

                    <div className="flex gap-3 w-full md:w-auto">
                      <select 
                        value={filterStatus}
                        onChange={(e) => setFilterStatus(e.target.value)}
                        className="bg-slate-50 border border-slate-100 rounded-xl px-4 py-2.5 text-xs font-bold text-slate-700 outline-none cursor-pointer focus:border-brand flex-1 md:flex-none"
                      >
                        <option value="all">All Users</option>
                        <option value="active">Active Users</option>
                        <option value="verified">KYC Verified</option>
                        <option value="unverified">Unverified</option>
                        <option value="suspended">Suspended</option>
                      </select>
                    </div>
                  </div>

                  {/* Main table list */}
                  <div className="bg-white rounded-[24px] border border-brand-light/20 overflow-hidden shadow-xs">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="bg-[#FFF8F0]/80 border-b border-[#FFD6A5]/20 text-slate-400 text-[10px] font-black uppercase tracking-widest">
                            <th className="py-4 px-6">User / Custom ID</th>
                            <th className="py-4 px-6">Email Address</th>
                            <th className="py-4 px-6">Registered On</th>
                            <th className="py-4 px-6">Account Mode</th>
                            <th className="py-4 px-6">Verification</th>
                            <th className="py-4 px-6 text-center">Control Center</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-xs font-bold text-slate-700">
                          {getFilteredUsers().length === 0 ? (
                            <tr>
                              <td colSpan={6} className="text-center py-24 text-slate-400">
                                <div className="max-w-xs mx-auto flex flex-col items-center">
                                  <Inbox size={32} className="text-[#FF8A00] opacity-35 mb-2.5 animate-bounce-slow" />
                                  <p className="font-extrabold text-[13px] uppercase tracking-wider text-slate-500">No users found</p>
                                  <p className="text-[10px] text-slate-400 mt-1">Try relaxing filters or adjust queries.</p>
                                </div>
                              </td>
                            </tr>
                          ) : (
                            getFilteredUsers().map(u => (
                              <tr 
                                key={u.id} 
                                onClick={() => handleSelectUserDetails(u)}
                                className="hover:bg-slate-50/50 transition-colors cursor-pointer"
                              >
                                <td className="py-4.5 px-6" onClick={(e) => e.stopPropagation()}>
                                  <div 
                                    onClick={() => handleSelectUserDetails(u)}
                                    className="flex items-center gap-3 cursor-pointer"
                                  >
                                    <div className="w-9 h-9 rounded-full bg-slate-100 overflow-hidden border border-slate-200">
                                      <img src={u.profilePhoto || `https://api.dicebear.com/7.x/adventurer/svg?seed=${u.uid}`} alt="p" className="w-full h-full object-cover" />
                                    </div>
                                    <div className="flex flex-col">
                                      <span className="font-black text-slate-800 text-[13.5px] leading-tight">{u.name}</span>
                                      <span className="font-mono text-[9px] text-slate-400 mt-0.5 bg-slate-150 px-1 py-0.2 rounded-md tracking-wide w-fit">
                                        {u.customUid || u.uid?.substring(0, 10).toUpperCase()}
                                      </span>
                                    </div>
                                  </div>
                                </td>
                                <td className="py-4.5 px-6 text-slate-500 select-all font-mono text-[11px]">{u.email}</td>
                                <td className="py-4.5 px-6 font-mono text-slate-400">{u.createdAt ? new Date(u.createdAt).toLocaleDateString() : '--'}</td>
                                <td className="py-4.5 px-6">
                                  <span className={`px-2 py-1 rounded-lg text-[9px] uppercase font-black border ${
                                    u.status === 'suspended' ? 'bg-rose-50 text-rose-600 border-rose-100' : 'bg-emerald-50 text-emerald-600 border-emerald-100'
                                  }`}>
                                    {u.status || 'active'}
                                  </span>
                                </td>
                                <td className="py-4.5 px-6">
                                  <div className="flex items-center gap-1.5 font-sans">
                                    {u.verified === true ? (
                                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-orange-50 text-[#F97316] text-[9.5px] font-black uppercase border border-orange-100">
                                        <CheckCircle size={10} /> Certified
                                      </span>
                                    ) : (
                                      <span className={`px-2 py-0.5 rounded-lg text-[9.5px] font-black uppercase border ${
                                        u.kycStatus === 'pending' ? 'bg-amber-50 text-amber-600 border border-amber-100' : 'bg-slate-100 text-slate-400 border border-slate-250'
                                      }`}>
                                        {u.kycStatus === 'pending' ? 'KYC REVIEW' : 'UNVERIFIED'}
                                      </span>
                                    )}
                                  </div>
                                </td>
                                <td className="py-4.5 px-6 text-center" onClick={(e) => e.stopPropagation()}>
                                  <div className="flex items-center justify-center">
                                    <button
                                      onClick={() => handleSelectUserDetails(u)}
                                      className="p-1.5 rounded-lg bg-slate-50 hover:bg-orange-50 text-slate-600 hover:text-[#FF8A00] border border-slate-200 cursor-pointer shadow-3xs"
                                      title="View Details"
                                    >
                                      <Eye size={14} className="stroke-[2.2]" />
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* =========================================================
              C. SUBSECTION: WITHDRAWALS PIPELINE
              ========================================================= */}
          {activeSubSection === 'withdrawals' && (
            <div className="space-y-6">
              <div className="bg-white rounded-[24px] border border-[#FFD6A5]/25 overflow-hidden shadow-xs">
                <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-white">
                  <div>
                    <h3 className="text-sm font-black uppercase tracking-wider text-slate-800">Live Settlement Pipeline</h3>
                    <p className="text-[10px] text-slate-450 font-bold uppercase mt-1">Accept, reject & review user settlement requests</p>
                  </div>
                  <div className="bg-rose-50 border border-rose-100 px-3 py-1 rounded-xl font-bold uppercase tracking-wider text-[10px] text-rose-600 animate-pulse">
                    {pendingWithdrawalsCount} Awaiting Review
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-[#FFF8F0]/80 border-b border-[#FFD6A5]/20 text-slate-400 text-[10px] font-black uppercase tracking-widest">
                        <th className="py-4 px-6 w-2/5">User Detail / UID</th>
                        <th className="py-4 px-6 w-1/5">Amount (INR)</th>
                        <th className="py-4 px-6 w-1/5">Date / Time</th>
                        <th className="py-4 px-6 w-1/5">Status Gate</th>
                        <th className="py-4 px-6 text-center w-1/5">Settlement Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-xs font-bold text-slate-700">
                      {withdrawals.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="text-center py-20 text-slate-400">
                            No withdrawal requests filed yet.
                          </td>
                        </tr>
                      ) : (
                        withdrawals.map(w => {
                          const isExpanded = expandedWdId === w.id;
                          const amountInr = w.amountINR || (w.amount * 85);
                          const feeInr = w.feeINR || (amountInr * 0.02);
                          const receivedInr = w.receivedINR || (amountInr * 0.98);
                          return (
                            <React.Fragment key={w.id}>
                              <tr className={`hover:bg-slate-50/50 transition-colors border-l-4 ${isExpanded ? 'border-[#F97316] bg-orange-50/10' : 'border-transparent'}`}>
                                <td className="py-4 px-6">
                                  <div className="flex flex-col gap-0.5">
                                    <span className="font-extrabold text-slate-800 text-[13px]">{w.name || 'Anonymous trader'}</span>
                                    <span className="font-mono text-[9.5px] text-slate-400 select-all">{w.uid}</span>
                                    {w.email && <span className="text-[10px] text-slate-400 select-all leading-none mt-1">{w.email}</span>}
                                  </div>
                                </td>
                                <td className="py-4 px-6 font-mono text-sm font-extrabold text-[#F97316] whitespace-nowrap">
                                  {formatINR(amountInr)}
                                </td>
                                <td className="py-4 px-6 text-slate-450 font-mono font-bold">
                                  {w.createdAt ? new Date(w.createdAt).toLocaleString() : '--'}
                                </td>
                                <td className="py-4 px-6">
                                  <span className={`px-2.5 py-1 rounded-lg text-[9px] font-black uppercase ${
                                    w.status === 'approved' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' :
                                    w.status === 'rejected' ? 'bg-rose-50 text-rose-600 border border-rose-100' :
                                    'bg-amber-50 text-amber-600 border border-amber-100 animate-pulse'
                                  }`}>
                                    {w.status}
                                  </span>
                                </td>
                                <td className="py-4 px-6 text-center">
                                  <div className="flex items-center justify-center gap-2">
                                    <button
                                      onClick={() => setExpandedWdId(isExpanded ? null : w.id)}
                                      className="px-2.5 py-1.5 rounded-lg border border-slate-200 text-slate-600 text-[10px] font-black uppercase tracking-wider bg-white hover:bg-slate-50"
                                    >
                                      {isExpanded ? 'Hide Details' : 'View Details'}
                                    </button>
                                    
                                    {w.status === 'pending' && (
                                      <>
                                        <button
                                          onClick={() => handleWithdrawalAction(w.id, 'approved')}
                                          className="px-3 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-[10px] font-black uppercase tracking-wider shadow-3xs"
                                        >
                                          Approve
                                        </button>
                                        <button
                                          onClick={() => handleWithdrawalAction(w.id, 'rejected')}
                                          className="px-3 py-1.5 rounded-xl bg-rose-500 hover:bg-rose-600 text-white text-[10px] font-black uppercase tracking-wider shadow-3xs"
                                        >
                                          Reject
                                        </button>
                                      </>
                                    )}
                                  </div>
                                </td>
                              </tr>
                              
                              {/* Detailed Dropdown Row */}
                              {isExpanded && (
                                <tr className="bg-slate-50/50 border-l-4 border-[#F97316]">
                                  <td colSpan={5} className="py-4 px-8 border-b border-slate-100">
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-xs text-slate-650 bg-white border border-slate-100 rounded-2xl p-5 shadow-3xs">
                                      <div className="space-y-2">
                                        <p className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Applicant Profile</p>
                                        <div>
                                          <p className="text-[11px] font-bold text-slate-400 uppercase">Holder Full Name</p>
                                          <p className="text-[13px] font-extrabold text-slate-800">{w.name || 'Anonymous trader'}</p>
                                        </div>
                                        <div>
                                          <p className="text-[11px] font-bold text-slate-400 uppercase">Registered Email</p>
                                          <p className="text-[12px] font-mono font-bold text-slate-800 select-all">{w.email || '--'}</p>
                                        </div>
                                        <div>
                                          <p className="text-[11px] font-bold text-slate-400 uppercase">Global UID</p>
                                          <p className="text-[11px] font-mono text-slate-500 select-all">{w.uid}</p>
                                        </div>
                                      </div>
                                      
                                      <div className="space-y-2">
                                        <p className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Settlement Routing Info</p>
                                        <div>
                                          <p className="text-[11px] font-bold text-[#F97316] uppercase">UPI Address (ID)</p>
                                          <p className="text-[14px] font-mono font-extrabold text-[#F97316] select-all bg-orange-50/30 border border-orange-100/50 px-2 py-1 rounded-lg w-fit">{w.upiId || w.upi || 'N/A'}</p>
                                        </div>
                                        <div>
                                          <p className="text-[11px] font-bold text-slate-400 uppercase">Mobile Number</p>
                                          <p className="text-[13px] font-mono font-bold text-slate-800">{w.mobile || 'N/A'}</p>
                                        </div>
                                        <div>
                                          <p className="text-[11px] font-bold text-slate-400 uppercase">Received Date & Time</p>
                                          <p className="text-[12px] font-mono text-slate-600">{w.createdAt ? new Date(w.createdAt).toLocaleString() : '--'}</p>
                                        </div>
                                      </div>

                                      <div className="space-y-2 border-l border-slate-100 pl-4 md:pl-6">
                                        <p className="text-[10px] font-black uppercase text-slate-400 tracking-wider font-sans">Payment Calculation Details</p>
                                        <div className="flex justify-between border-b border-slate-50 pb-1.5 gap-4">
                                          <span className="text-slate-500">Gross Amount Requested</span>
                                          <span className="font-mono text-slate-800 font-bold whitespace-nowrap">{formatINR(amountInr)}</span>
                                        </div>
                                        <div className="flex justify-between border-b border-slate-50 pb-1.5 gap-4">
                                          <span className="text-slate-500">Platform Handling Fee (2%)</span>
                                          <span className="font-mono text-rose-500 font-bold whitespace-nowrap">-{formatINR(feeInr)}</span>
                                        </div>
                                        <div className="flex justify-between pt-1 font-extrabold text-slate-800 gap-4">
                                          <span className="text-[#F97316]">Final Paid Amount (Net)</span>
                                          <span className="font-mono text-[#F97316] text-[15px] font-black bg-orange-50 border border-orange-100 px-2 py-0.5 rounded-md leading-none whitespace-nowrap">{formatINR(receivedInr)}</span>
                                        </div>
                                        <div className="pt-2">
                                          <p className="text-[9.5px] text-slate-400 uppercase tracking-wider font-semibold">Current Gate Status</p>
                                          <span className={`inline-block mt-1 px-2.5 py-0.5 rounded-md text-[9.5px] font-black uppercase ${
                                            w.status === 'approved' ? 'bg-emerald-50 text-emerald-600' :
                                            w.status === 'rejected' ? 'bg-rose-50 text-rose-600' :
                                            'bg-amber-50 text-amber-600 animate-pulse'
                                          }`}>
                                            {w.status}
                                          </span>
                                        </div>
                                      </div>
                                    </div>
                                  </td>
                                </tr>
                              )}
                            </React.Fragment>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* =========================================================
              D. SUBSECTION: DEPOSITS MONITORING
              ========================================================= */}
          {activeSubSection === 'deposits' && (
            <div className="space-y-6">
              <div className="bg-white rounded-[24px] border border-[#FFD6A5]/25 overflow-hidden shadow-xs">
                <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                  <div>
                    <h3 className="text-sm font-black uppercase tracking-wider text-slate-500">Live Deposit Logs</h3>
                    <p className="text-[10px] text-slate-400 mt-1">Audit, check receipts, and approve/reject trader deposits</p>
                  </div>
                  <div className="bg-brand/5 border border-brand-light/30 px-3 py-1 rounded-xl text-[10px] uppercase font-bold tracking-wider text-[#FF8A00] self-start sm:self-auto">
                    Verified Amount: {formatUSD(totalDepositsSum)}
                  </div>
                </div>

                {/* Sub-search and Status Filters */}
                <div className="p-4 bg-slate-50/60 border-b border-slate-100 flex flex-col md:flex-row gap-4 items-center justify-between">
                  <div className="relative w-full md:max-w-md">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-300">
                      <Search size={15} />
                    </span>
                    <input
                      type="text"
                      placeholder="Search deposits by name or user ID..."
                      value={depositSearchQuery}
                      onChange={(e) => setDepositSearchQuery(e.target.value)}
                      className="w-full h-9 pl-9 pr-4 bg-white border border-slate-200 rounded-xl outline-none focus:border-brand text-xs font-semibold text-slate-700 placeholder-slate-400 font-sans shadow-3xs"
                    />
                  </div>
                  
                  <div className="flex flex-wrap items-center gap-1.5 w-full md:w-auto justify-start md:justify-end">
                    <span className="text-[10px] uppercase font-extrabold text-[#FF8A00] bg-orange-50 px-2 py-1 rounded border border-orange-100 mr-1 font-sans">Status</span>
                    <button
                      onClick={() => setDepositStatusFilter('all')}
                      className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-wide transition-all cursor-pointer ${
                        depositStatusFilter === 'all'
                          ? 'bg-[#FF8A00] text-white shadow-2xs'
                          : 'bg-white border border-slate-200 text-slate-500 hover:bg-slate-50'
                      }`}
                    >
                      All
                    </button>
                    <button
                      onClick={() => setDepositStatusFilter('pending')}
                      className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-wide transition-all cursor-pointer ${
                        depositStatusFilter === 'pending'
                          ? 'bg-amber-500 text-white shadow-2xs'
                          : 'bg-white border border-slate-200 text-slate-500 hover:bg-slate-50'
                      }`}
                    >
                      Pending
                    </button>
                    <button
                      onClick={() => setDepositStatusFilter('approved')}
                      className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-wide transition-all cursor-pointer ${
                        depositStatusFilter === 'approved'
                          ? 'bg-emerald-500 text-white shadow-2xs'
                          : 'bg-white border border-slate-200 text-slate-500 hover:bg-slate-50'
                      }`}
                    >
                      Approved
                    </button>
                    <button
                      onClick={() => setDepositStatusFilter('rejected')}
                      className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-wide transition-all cursor-pointer ${
                        depositStatusFilter === 'rejected'
                          ? 'bg-rose-500 text-white shadow-2xs'
                          : 'bg-white border border-slate-200 text-slate-500 hover:bg-slate-50'
                      }`}
                    >
                      Rejected
                    </button>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-[#FFF8F0]/80 border-b border-[#FFD6A5]/20 text-slate-400 text-[10px] font-black uppercase tracking-widest">
                        <th className="py-4 px-6">Trader Detail</th>
                        <th className="py-4 px-6">Deposited Amount</th>
                        <th className="py-4 px-6">Payment Method</th>
                        <th className="py-4 px-6">Reference ID / UPI TxID</th>
                        <th className="py-4 px-6">Logged Time</th>
                        <th className="py-4 px-6">Verification</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-xs font-bold text-slate-700">
                      {filteredDeposits.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="text-center py-20 text-slate-400 font-medium">
                            No matching deposit records found.
                          </td>
                        </tr>
                      ) : (
                        filteredDeposits.map(d => (
                          <tr key={d.id} className="hover:bg-slate-50/50 transition-colors">
                            <td className="py-4 px-6">
                              <div className="flex flex-col">
                                <span className="font-extrabold text-slate-800 text-[13px]">{d.name || 'Exchange user'}</span>
                                <span className="font-mono text-[9px] text-slate-400 mt-0.5">{d.email}</span>
                              </div>
                            </td>
                            <td className="py-4 px-6 font-mono font-extrabold text-emerald-600 text-sm whitespace-nowrap">
                              {d.currency === 'INR' ? formatINR(d.amount * 85) : formatUSD(d.amount)}
                            </td>
                            <td className="py-4 px-6 font-medium text-slate-500">
                              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-slate-50 border border-slate-100 uppercase text-[9.5px] font-black">
                                <CreditCard size={11} className="text-brand" /> {d.paymentMethod || 'UPI Option'}
                              </span>
                            </td>
                            <td className="py-4 px-6 text-center">
                              <button
                                onClick={() => setSelectedDepositReceipt(d)}
                                className="mx-auto p-2 rounded-xl bg-orange-50 border border-orange-200 text-[#FF8A00] hover:bg-orange-100 cursor-pointer transition-colors shadow-3xs flex items-center justify-center scale-105 hover:scale-110"
                                title="View Details"
                              >
                                <Eye size={16} className="stroke-[2.5]" />
                              </button>
                            </td>
                            <td className="py-4 px-6 font-mono text-slate-400">{d.createdAt ? new Date(d.createdAt).toLocaleString() : '--'}</td>
                            <td className="py-4 px-6">
                              <div className="flex items-center gap-2">
                                {d.status === 'pending' ? (
                                  <div className="flex gap-2">
                                    <button 
                                      onClick={() => handleDepositAction(d.id, 'approved', d.uid, d.amount)}
                                      className="px-2 py-1 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 rounded text-[9px] font-bold uppercase transition-colors border border-emerald-200 cursor-pointer"
                                    >
                                      Approve
                                    </button>
                                    <button 
                                      onClick={() => handleDepositAction(d.id, 'rejected', d.uid, d.amount)}
                                      className="px-2 py-1 bg-rose-50 text-rose-600 hover:bg-rose-100 rounded text-[9px] font-bold uppercase transition-colors border border-rose-200 cursor-pointer"
                                    >
                                      Reject
                                    </button>
                                  </div>
                                ) : d.status === 'approved' ? (
                                  <div className="flex items-center gap-2">
                                    <span className="px-1.5 py-0.5 rounded text-[8.5px] font-black uppercase border bg-emerald-50 text-emerald-600 border-emerald-100">
                                      Approved
                                    </span>
                                    <button 
                                      onClick={() => handleDepositAction(d.id, 'rejected', d.uid, d.amount)}
                                      className="px-2 py-1 bg-rose-50 text-rose-600 hover:bg-rose-100 rounded text-[9px] font-bold uppercase transition-colors border border-rose-200 cursor-pointer"
                                      title="Reject and Deduct Wallet Balance"
                                    >
                                      Reject
                                    </button>
                                  </div>
                                ) : (
                                  <span className="px-1.5 py-0.5 rounded text-[8.5px] font-black uppercase border bg-rose-50 text-rose-600 border-rose-100">
                                    Rejected
                                  </span>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* =========================================================
              E. SUBSECTION: KYC CLEARANCE CENTER
              ========================================================= */}
          {activeSubSection === 'kyc' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* KYC Submissions List with Search, Status Filters, & Table list */}
                <div className="bg-white border border-[#FFD6A5]/25 rounded-[24px] p-5 shadow-xs flex flex-col h-[580px]">
                  <div className="flex flex-col gap-3 mb-4 pb-2 border-b border-slate-100">
                    <div className="flex justify-between items-center">
                      <h3 className="text-xs font-black uppercase tracking-wider text-slate-500 font-sans">Aadhaar Validation Queue</h3>
                      <span className="text-[10px] font-black uppercase bg-orange-100 text-[#FF8A00] px-2.5 py-0.5 rounded-full font-sans">
                        {filteredKycSubmissions.length} record{filteredKycSubmissions.length !== 1 ? 's' : ''}
                      </span>
                    </div>

                    {/* Search Bar inside KYC */}
                    <div className="relative">
                      <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-300">
                        <Search size={14} />
                      </span>
                      <input
                        type="text"
                        placeholder="Search submissions by name..."
                        value={kycSearchQuery}
                        onChange={(e) => setKycSearchQuery(e.target.value)}
                        className="w-full h-9 pl-9 pr-4 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-brand text-xs font-semibold text-slate-705 placeholder-slate-400 font-sans"
                      />
                    </div>

                    {/* Three distinct status filter buttons: 'Approved', 'Pending', 'Rejected' */}
                    <div className="grid grid-cols-3 gap-2 mt-1">
                      <button
                        onClick={() => setKycStatusFilter('pending')}
                        className={`py-1.5 px-2 rounded-xl text-[10px] font-black uppercase tracking-wide transition-all cursor-pointer border text-center ${
                          kycStatusFilter === 'pending'
                            ? 'bg-amber-500 text-white border-transparent shadow-3xs'
                            : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'
                        }`}
                      >
                        Pending
                      </button>
                      <button
                        onClick={() => setKycStatusFilter('approved')}
                        className={`py-1.5 px-2 rounded-xl text-[10px] font-black uppercase tracking-wide transition-all cursor-pointer border text-center ${
                          kycStatusFilter === 'approved'
                            ? 'bg-emerald-500 text-white border-transparent shadow-3xs'
                            : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'
                        }`}
                      >
                        Approved
                      </button>
                      <button
                        onClick={() => setKycStatusFilter('rejected')}
                        className={`py-1.5 px-2 rounded-xl text-[10px] font-black uppercase tracking-wide transition-all cursor-pointer border text-center ${
                          kycStatusFilter === 'rejected'
                            ? 'bg-rose-500 text-white border-transparent shadow-3xs'
                            : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'
                        }`}
                      >
                        Rejected
                      </button>
                    </div>
                  </div>

                  {/* List in structured table/row format showing Name, Gmail ID, with Eye icon */}
                  <div className="flex-1 overflow-y-auto pr-1">
                    {filteredKycSubmissions.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-20 text-slate-400 text-center">
                        <UserCheck size={28} className="opacity-25 mb-1 text-slate-400" />
                        <p className="text-xs font-extrabold uppercase tracking-wider">No matches found</p>
                        <p className="text-[10px] text-slate-400 mt-1">Try adjusting your search criteria or filter options.</p>
                      </div>
                    ) : (
                      <div className="divide-y divide-slate-100">
                        {filteredKycSubmissions.map(k => {
                          const isSelected = selectedUser?.uid === k.uid;
                          return (
                            <div 
                              key={k.id}
                              onClick={() => {
                                const targetUser = users.find(u => u.uid === k.uid);
                                setSelectedUser(targetUser || { uid: k.uid, name: k.fullname, email: k.email });
                              }}
                              className={`p-3.5 flex items-center justify-between rounded-xl transition-all cursor-pointer border ${
                                isSelected 
                                  ? 'bg-orange-50/30 border-[#FFD6A5]/50' 
                                  : 'hover:bg-slate-50 border-transparent'
                              }`}
                            >
                              <div className="min-w-0 pr-2">
                                <h4 className="font-extrabold text-[13px] text-slate-800 leading-tight truncate">{k.fullname || k.name}</h4>
                                <p className="text-[10px] text-slate-450 mt-1 select-all truncate text-slate-450">{k.email}</p>
                                <span className={`inline-block mt-2 px-1.5 py-0.5 rounded text-[8.5px] font-black uppercase ${
                                  k.status === 'approved' ? 'bg-emerald-50 text-emerald-600' :
                                  k.status === 'rejected' ? 'bg-rose-50 text-rose-600' :
                                  'bg-amber-50 text-amber-600 animate-pulse'
                                }`}>
                                  {k.status}
                                </span>
                              </div>

                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  const targetUser = users.find(u => u.uid === k.uid);
                                  setSelectedUser(targetUser || { uid: k.uid, name: k.fullname, email: k.email });
                                }}
                                className={`p-2 rounded-xl transition-all flex items-center justify-center border ${
                                  isSelected 
                                    ? 'bg-amber-500 border-amber-500 text-white scale-105 shadow-2xs' 
                                    : 'bg-white hover:bg-orange-50 border-slate-200 text-slate-500 hover:text-[#FF8A00] hover:border-orange-200'
                                }`}
                                title="View Verification Details"
                              >
                                <Eye size={15} className="stroke-[2.5]" />
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>

                {/* KYC Active Auditing View Documents area */}
                <div className="bg-white border border-[#FFD6A5]/25 rounded-[24px] p-6 shadow-xs flex flex-col justify-between">
                  <div>
                    <h3 className="text-xs font-black uppercase tracking-wider text-slate-500 mb-5 pb-2 border-b border-slate-100 select-none">Biometric Identity Document Examiner</h3>
                    
                    {selectedUser ? (
                      (() => {
                        const sub = kycSubmissions.find(k => k.uid === selectedUser.uid);
                        if (!sub) {
                          return (
                            <div className="py-20 text-center text-slate-400">
                              <FileText className="mx-auto mb-2 opacity-30" size={32} />
                              <p className="font-extrabold uppercase text-xs">No Verification filed yet</p>
                              <p className="text-[10px] mt-1 pr-4">This profile has not submitted identity photos for verification review.</p>
                            </div>
                          );
                        }
                        return (
                          <div className="space-y-5">
                            <div>
                              <span className="text-[10px] uppercase font-bold text-slate-400">Full verified name:</span>
                              <p className="text-[15px] font-extrabold text-slate-800">{sub.fullname}</p>
                            </div>

                            <div className="space-y-4 mb-4 grid grid-cols-2 gap-3 text-[11px]">
                              <div>
                                <span className="text-[9.5px] uppercase font-bold text-slate-400 block">UID</span>
                                <p className="font-extrabold text-slate-700 truncate">{sub.uid}</p>
                              </div>
                              <div>
                                <span className="text-[9.5px] uppercase font-bold text-slate-400 block">Email</span>
                                <p className="font-extrabold text-slate-700 truncate">{sub.email}</p>
                              </div>
                              <div>
                                <span className="text-[9.5px] uppercase font-bold text-slate-400 block">Mobile Phone</span>
                                <p className="font-extrabold text-slate-700">{sub.phone || '--'}</p>
                              </div>
                              <div>
                                <span className="text-[9.5px] uppercase font-bold text-slate-400 block">Date of Birth</span>
                                <p className="font-extrabold text-slate-700">{sub.dob || '--'}</p>
                              </div>
                              <div>
                                <span className="text-[9.5px] uppercase font-bold text-slate-400 block">Gender</span>
                                <p className="font-extrabold text-slate-700">{sub.gender || '--'}</p>
                              </div>
                              <div>
                                <span className="text-[9.5px] uppercase font-bold text-slate-400 block">Country</span>
                                <p className="font-extrabold text-slate-700">{sub.country || '--'}</p>
                              </div>
                              <div className="col-span-2">
                                <span className="text-[9.5px] uppercase font-bold text-slate-400 block">Residential Address</span>
                                <p className="font-extrabold text-slate-700 whitespace-pre-wrap">{[sub.address, sub.city, sub.state].filter(Boolean).join(', ') || '--'}</p>
                              </div>
                              <div className="col-span-2 bg-orange-50 p-3 rounded-xl border border-orange-100">
                                <span className="text-[9.5px] uppercase font-black text-orange-500 block mb-1">Aadhaar Card Number</span>
                                <p className="font-mono text-[14px] tracking-wider font-extrabold text-slate-800">{sub.aadhaarNumber || 'Not provided'}</p>
                              </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                              <div className="border border-slate-100 rounded-xl p-3 bg-slate-50/50 flex flex-col justify-between">
                                <span className="text-[9.5px] uppercase font-black text-slate-400">Aadhaar Card Front</span>
                                <div 
                                  onClick={() => setZoomDocUrl(sub.docFront)}
                                  className="my-3.5 h-[100px] border border-[#FFD6A5]/40 rounded-lg flex items-center justify-center cursor-zoom-in active:scale-95 transition-all select-none shadow-3xs overflow-hidden bg-slate-100"
                                >
                                  {sub.docFront && sub.docFront.startsWith('data:image/') ? (
                                    <img src={sub.docFront} alt="Aadhaar Front" className="w-full h-full object-cover" />
                                  ) : (
                                    <span className="p-2 text-center text-[9px] font-mono leading-tight text-[#FF8A00] font-bold">
                                      {sub.docFront || 'No Documents Uploaded'}
                                    </span>
                                  )}
                                </div>
                                <button onClick={() => setZoomDocUrl(sub.docFront)} className="text-[10px] text-brand hover:underline font-bold text-left">Zoom Document</button>
                              </div>

                              <div className="border border-slate-100 rounded-xl p-3 bg-slate-50/50 flex flex-col justify-between">
                                <span className="text-[9.5px] uppercase font-black text-slate-400">Aadhaar Card Back</span>
                                <div 
                                  onClick={() => setZoomDocUrl(sub.docBack)}
                                  className="my-3.5 h-[100px] border border-[#FFD6A5]/40 rounded-lg flex items-center justify-center cursor-zoom-in active:scale-95 transition-all select-none shadow-3xs overflow-hidden bg-slate-100"
                                >
                                  {sub.docBack && sub.docBack.startsWith('data:image/') ? (
                                    <img src={sub.docBack} alt="Aadhaar Back" className="w-full h-full object-cover" />
                                  ) : (
                                    <span className="p-2 text-center text-[9px] font-mono leading-tight text-[#FF8A00] font-bold">
                                      {sub.docBack || 'No Documents Uploaded'}
                                    </span>
                                  )}
                                </div>
                                <button onClick={() => setZoomDocUrl(sub.docBack)} className="text-[10px] text-brand hover:underline font-bold text-left">Zoom Document</button>
                              </div>
                            </div>

                            {/* Selfie section */}
                            {sub.selfie && (
                              <div className="bg-slate-50/80 border border-slate-100 rounded-xl p-4.5">
                                <span className="text-[9.5px] uppercase font-black text-slate-400 block mb-2.5">Biometric Face Geometry (Confirmation Photo)</span>
                                <div className="flex gap-4 items-center">
                                  <div className="w-[50px] h-[50px] rounded-full bg-slate-250 border border-slate-150 flex items-center justify-center text-slate-400">
                                    <Globe size={22} className="animate-spin-slow text-brand" />
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <span className="font-mono text-[9px] text-[#FF8A00] uppercase font-black bg-orange-50 px-1.5 py-0.5 rounded border border-orange-100 block w-fit">FACE ID MATCHED</span>
                                    <p className="text-[10.5px] text-slate-500 font-bold leading-normal mt-1.5">{sub.selfie}</p>
                                  </div>
                                </div>
                              </div>
                            )}

                            {/* Actions bar */}
                            <div className="bg-orange-50/20 border border-brand/20 p-4 rounded-2xl flex flex-col gap-3">
                              <div className="flex items-center justify-between pb-1 border-b border-[#FFD6A5]/20">
                                <span className="text-[10px] uppercase font-black tracking-wider text-[#FF8A00] block">Application Status</span>
                                <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase ${
                                  sub.status === 'approved' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' :
                                  sub.status === 'rejected' ? 'bg-rose-50 text-rose-600 border border-rose-100' :
                                  'bg-amber-50 text-amber-600 border border-amber-100 animate-pulse'
                                }`}>
                                  {sub.status}
                                </span>
                              </div>

                              {kycProcessing && kycProcessing.userId === sub.uid ? (
                                <>
                                   <span className="text-[10.5px] pr-2 text-slate-500 font-bold leading-tight">Enter reason for {kycProcessing.action}:</span>
                                   <input type="text" value={kycReason} onChange={e => setKycReason(e.target.value)} className="w-full p-2 border border-slate-200 rounded-lg text-xs" placeholder="Reason..." />
                                   <div className="flex gap-2">
                                     <button onClick={() => { handleKYCAction(kycProcessing.userId, kycProcessing.action); }} className="px-4 py-2 text-xs font-black uppercase text-white bg-[#FF8A00] hover:bg-orange-600 rounded-xl shadow-2xs pointer-events-auto cursor-pointer">Confirm</button>
                                     <button onClick={() => { setKycProcessing(null); setKycReason(''); }} className="px-4 py-2 text-xs font-black uppercase text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl shadow-2xs pointer-events-auto cursor-pointer">Cancel</button>
                                   </div>
                                </>
                              ) : (
                                <>
                                  <span className="text-[10.5px] pr-2 text-slate-500 font-bold leading-tight">
                                    {sub.status === 'pending' 
                                      ? "Proceed with verifying this user's exchange credentials?" 
                                      : "Do you want to change the verified status for this user's credentials?"}
                                  </span>
                                  <div className="flex gap-2">
                                    {sub.status !== 'approved' && (
                                      <button onClick={() => setKycProcessing({ userId: selectedUser.uid, action: 'approved' })} className="px-3 py-2 text-xs font-black uppercase text-white bg-emerald-500 hover:bg-emerald-600 rounded-xl shadow-2xs cursor-pointer">
                                        Approve Verified
                                      </button>
                                    )}
                                    {sub.status !== 'rejected' && (
                                      <button onClick={() => setKycProcessing({ userId: selectedUser.uid, action: 'rejected' })} className="px-3 py-2 text-xs font-black uppercase text-white bg-rose-500 hover:bg-rose-600 rounded-xl shadow-2xs cursor-pointer">
                                        Reject
                                      </button>
                                    )}
                                  </div>
                                </>
                              )}
                            </div>
                          </div>
                        );
                      })()
                    ) : (
                      <div className="py-24 text-center text-slate-400">
                        <Users className="mx-auto mb-2 opacity-30" size={32} />
                        <p className="font-extrabold uppercase text-xs">No profile selected</p>
                        <p className="text-[10.5px] mt-1 pr-4">Click any pending profile submission on the left pane to audit credentials.</p>
                      </div>
                    )}

                  </div>
                </div>

              </div>
            </div>
          )}

          {/* =========================================================
              F. SUBSECTION: CUSTOMER COMPLAINTS / SERVICES TICKETS
              ========================================================= */}
          {activeSubSection === 'tickets' && (
            <div className="space-y-6">
              
              {/* Ticket Header Tabs */}
              <div className="flex gap-4 border-b border-slate-200">
                <button
                  onClick={() => { setTicketTab('pending'); setExpandedTicketId(null); }}
                  className={`pb-3 text-sm font-bold uppercase tracking-wider transition-colors ${
                    ticketTab === 'pending' 
                      ? 'text-[#FF8A00] border-b-2 border-[#FF8A00]' 
                      : 'text-slate-400 hover:text-slate-600'
                  }`}
                >
                  Pending
                </button>
                <button
                  onClick={() => { setTicketTab('accepted'); setExpandedTicketId(null); }}
                  className={`pb-3 text-sm font-bold uppercase tracking-wider transition-colors ${
                    ticketTab === 'accepted' 
                      ? 'text-[#FF8A00] border-b-2 border-[#FF8A00]' 
                      : 'text-slate-400 hover:text-slate-600'
                  }`}
                >
                  Accepted
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* Tickets registry list */}
                <div className="bg-white border border-[#FFD6A5]/25 rounded-[24px] p-5 shadow-xs">
                  <div className="flex justify-between items-center mb-4 pb-2 border-b border-slate-100">
                    <h3 className="text-xs font-black uppercase tracking-wider text-slate-500">
                      {ticketTab === 'pending' ? 'Pending Tickets' : 'Accepted Tickets'}
                    </h3>
                  </div>

                  {/* Search Bar */}
                  <div className="mb-4 relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={14} />
                    <input
                      type="text"
                      placeholder="Search by name or phone..."
                      value={ticketSearchQuery}
                      onChange={(e) => setTicketSearchQuery(e.target.value)}
                      className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:border-[#FF8A00] focus:ring-1 focus:ring-[#FF8A00] transition-all"
                    />
                  </div>
                  
                  {(() => {
                    const filteredTickets = tickets.filter(t => {
                      const matchesTab = ticketTab === 'pending' ? t.status === 'open' : t.status === 'accepted';
                      const matchesSearch = !ticketSearchQuery || 
                        (t.name?.toLowerCase().includes(ticketSearchQuery.toLowerCase()) || 
                         t.phone?.includes(ticketSearchQuery));
                      return matchesTab && matchesSearch;
                    });

                    if (filteredTickets.length === 0) {
                      return <p className="text-center py-12 text-slate-400 text-xs">No {ticketTab} tickets match your search.</p>;
                    }

                    return (
                      <div className="space-y-3 max-h-[460px] overflow-y-auto pr-1">
                        {filteredTickets.map(t => (
                        <div 
                          key={t.id}
                          onClick={() => setExpandedTicketId(t.id)}
                          className={`border rounded-2xl p-4 cursor-pointer transition-all ${
                            expandedTicketId === t.id 
                              ? 'border-[#FF8A00] bg-orange-50/20' 
                              : 'border-slate-100 hover:bg-slate-50/50'
                          }`}
                        >
                          <div className="flex justify-between items-start">
                            <div>
                              <span className="text-[9px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded font-black tracking-wider uppercase mb-1.5 inline-block">
                                Category: {t.category || 'General'}
                              </span>
                              <h4 className="font-extrabold text-[13.5px] text-slate-800 leading-tight">{t.subject}</h4>
                              <p className="text-[10px] text-slate-400 font-medium mt-1">{t.name || 'Unknown'} • {t.phone || 'N/A'}</p>
                            </div>
                            <span className={`px-2 py-0.5 rounded-lg text-[9px] font-black uppercase ${
                              t.status === 'accepted' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-500 animate-pulse'
                            }`}>
                              {t.status}
                            </span>
                          </div>

                          <div className="flex justify-between items-center mt-3 text-[10px]">
                            <span className="text-slate-400 font-mono">Date: {t.createdAt ? new Date(t.createdAt).toLocaleDateString() : '--'}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                    );
                  })()}
                </div>

                {/* Secure customer ticketing reply center */}
                <div className="bg-white border border-[#FFD6A5]/25 rounded-[24px] p-6 shadow-xs flex flex-col justify-between">
                  <div>
                    <h3 className="text-xs font-black uppercase tracking-wider text-slate-500 mb-5 pb-2 border-b border-slate-100 select-none">Ticket Details</h3>
                    
                    {expandedTicketId ? (
                      (() => {
                        const targetTicket = tickets.find(t => t.id === expandedTicketId);
                        if (!targetTicket) {
                          return (
                            <div className="py-20 text-center text-slate-400">
                              <HelpCircle className="mx-auto mb-2 opacity-30" size={32} />
                              <p className="font-extrabold uppercase text-xs">Ticket not found</p>
                            </div>
                          );
                        }
                        return (
                          <div className="space-y-4">
                            <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                              <div className="space-y-2 text-sm">
                                <div className="grid grid-cols-[100px_1fr] gap-2">
                                  <span className="text-slate-400 font-bold uppercase text-[10px]">Full Name</span>
                                  <span className="text-slate-800 font-medium text-xs">{targetTicket.name || 'Not Provided'}</span>
                                </div>
                                <div className="grid grid-cols-[100px_1fr] gap-2">
                                  <span className="text-slate-400 font-bold uppercase text-[10px]">Phone</span>
                                  <span className="text-slate-800 font-medium text-xs">{targetTicket.phone || 'Not Provided'}</span>
                                </div>
                                <div className="grid grid-cols-[100px_1fr] gap-2">
                                  <span className="text-slate-400 font-bold uppercase text-[10px]">Email</span>
                                  <span className="text-slate-800 font-medium text-xs">{targetTicket.email || 'Not Provided'}</span>
                                </div>
                                <div className="grid grid-cols-[100px_1fr] gap-2">
                                  <span className="text-slate-400 font-bold uppercase text-[10px]">Category</span>
                                  <span className="text-slate-800 font-medium text-xs">{targetTicket.category || 'General'}</span>
                                </div>
                              </div>
                              
                              <div className="mt-4 pt-4 border-t border-slate-200">
                                <strong className="text-xs text-slate-400 block select-none uppercase font-black">Subject:</strong>
                                <p className="text-[13.5px] font-extrabold text-slate-800 mt-1">{targetTicket.subject}</p>
                                <strong className="text-xs text-slate-400 block select-none uppercase font-black mt-3">Message:</strong>
                                <p className="text-slate-550 text-[11.5px] leading-relaxed mt-1 font-medium bg-white p-3 rounded-lg border border-slate-100 whitespace-pre-wrap">
                                  {targetTicket.message}
                                </p>
                              </div>
                            </div>

                            {targetTicket.status === 'open' && (
                              <div className="mt-6 pt-4 border-t border-slate-100">
                                <button 
                                  onClick={() => handleTicketAction(targetTicket.id, 'accepted')}
                                  className="w-full py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white font-black text-xs uppercase tracking-widest rounded-xl shadow-2xs flex items-center justify-center gap-1.5 transition-colors"
                                >
                                  <CheckCircle size={14} className="stroke-[2.5]" />
                                  <span>Approve</span>
                                </button>
                              </div>
                            )}
                          </div>
                        );
                      })()
                    ) : (
                      <div className="py-24 text-center text-slate-400">
                        <Users className="mx-auto mb-2 opacity-30" size={32} />
                        <p className="font-extrabold uppercase text-xs">No ticket selected</p>
                        <p className="text-[10.5px] mt-1 pr-4">Click any ticket on the left pane to view details.</p>
                      </div>
                    )}
                  </div>
                </div>

              </div>
            </div>
          )}

          {/* =========================================================
              G. SUBSECTION: LOGIN ACTIVITY TRACKING
              ========================================================= */}
          {activeSubSection === 'logins' && (
            <div className="space-y-6">
              
              {/* Login query toolbar */}
              <div className="bg-white p-4.5 rounded-[22px] border border-[#FFD6A5]/25 shadow-2xs flex flex-col md:flex-row gap-4 justify-between items-center">
                <div className="relative w-full md:max-w-md">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Filter logins by username, email, IP identifier, device ..."
                    className="w-full bg-slate-50 border border-slate-100 rounded-xl pl-10 pr-4 py-2.5 text-xs text-slate-705 outline-none focus:border-brand focus:bg-white transition-all font-bold placeholder:text-slate-400"
                  />
                </div>
                <div className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                  Total Audited logins: {logins.length}
                </div>
              </div>

              <div className="bg-white rounded-[24px] border border-brand-light/20 overflow-hidden shadow-xs">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-[#FFF8F0]/80 border-b border-[#FFD6A5]/20 text-slate-400 text-[10px] font-black uppercase tracking-widest">
                        <th className="py-4 px-6">User Identity</th>
                        <th className="py-4 px-6">Security Code</th>
                        <th className="py-4 px-6">Session Login Time</th>
                        <th className="py-4 px-6">Audit Status</th>
                        <th className="py-4 px-6">IP Address Location</th>
                        <th className="py-4 px-6">Terminals / Browser</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-xs font-bold text-slate-700">
                      {logins.filter(l => {
                        const matchingUser = users.find(u => u.uid === l.uid || u.email?.toLowerCase() === l.email?.toLowerCase());
                        const userName = l.name || matchingUser?.name || 'Exchange Partner';
                        const userEmail = l.email || matchingUser?.email || '';
                        const q = searchQuery.toLowerCase();
                        return userName.toLowerCase().includes(q) ||
                               userEmail.toLowerCase().includes(q) ||
                               l.ipAddress?.toLowerCase().includes(q) ||
                               l.deviceType?.toLowerCase().includes(q) ||
                               l.browser?.toLowerCase().includes(q);
                      }).length === 0 ? (
                        <tr>
                          <td colSpan={6} className="text-center py-20 text-slate-400">
                            No matching login security histories found.
                          </td>
                        </tr>
                      ) : (
                        logins.filter(l => {
                          const matchingUser = users.find(u => u.uid === l.uid || u.email?.toLowerCase() === l.email?.toLowerCase());
                          const userName = l.name || matchingUser?.name || 'Exchange Partner';
                          const userEmail = l.email || matchingUser?.email || '';
                          const q = searchQuery.toLowerCase();
                          return userName.toLowerCase().includes(q) ||
                                 userEmail.toLowerCase().includes(q) ||
                                 l.ipAddress?.toLowerCase().includes(q) ||
                                 l.deviceType?.toLowerCase().includes(q) ||
                                 l.browser?.toLowerCase().includes(q);
                        }).map(l => {
                          const matchingUser = users.find(u => u.uid === l.uid || u.email?.toLowerCase() === l.email?.toLowerCase());
                          const userName = l.name || matchingUser?.name || 'Exchange Partner';
                          const userEmail = l.email || matchingUser?.email || '';
                          const securityCode = matchingUser?.staticPin || '--';

                          return (
                            <tr key={l.id} className="hover:bg-slate-50/50 transition-colors">
                              <td className="py-4 px-6">
                                <div className="flex flex-col">
                                  <span className="font-extrabold text-slate-800 text-[13px]">{userName}</span>
                                  <span className="font-mono text-[9px] text-slate-400 mt-0.5 select-all">{userEmail}</span>
                                </div>
                              </td>
                              <td className="py-4 px-6">
                                <span className="font-mono text-[12px] bg-amber-50 text-amber-700 border border-[#FFD6A5]/45 px-2.5 py-1 rounded-lg">
                                  {securityCode}
                                </span>
                              </td>
                              <td className="py-4 px-6 font-mono text-slate-400">{new Date(l.loginTime).toLocaleString()}</td>
                              <td className="py-4 px-6">
                                <span className={`px-2 py-0.5 rounded text-[8.5px] font-black uppercase ${
                                  l.status === 'success' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' :
                                  'bg-rose-50 text-rose-500 border border-rose-100 animate-pulse'
                                }`}>
                                  {l.status === 'success' ? 'AUTHORIZED' : 'BREACH BLOCKED'}
                                </span>
                              </td>
                              <td className="py-4 px-6 font-mono select-all text-slate-550 flex items-center gap-1.5 pt-4">
                                <MapPin size={11} className="text-pink-500 shrink-0" />
                                <span>{l.ipAddress || '127.0.0.1'}</span>
                              </td>
                              <td className="py-4 px-6">
                                <div className="flex items-center gap-1.5 font-medium text-slate-500">
                                  {l.deviceType === 'Mobile' ? <Smartphone size={13} className="text-sky-500" /> : <Laptop size={13} className="text-indigo-500" />}
                                  <span className="text-[11.5px]">{l.browser || 'Chrome Mobile'}</span>
                                </div>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* =========================================================
              I. SUBSECTION: SETTINGS
              ========================================================= */}
          {activeSubSection === 'settings' && (
            <div className="space-y-6">
              <div className="bg-white border border-[#FFD6A5]/25 rounded-[24px] p-6 shadow-xs relative overflow-hidden">
                <div className="absolute top-0 right-0 w-44 h-44 bg-orange-50 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none"></div>
                
                <div className="flex items-center justify-between mb-6 border-b border-slate-100 pb-4">
                  <h3 className="text-xs font-black uppercase tracking-wider text-slate-800 flex items-center gap-2">
                    <Settings className="text-[#FF8A00]" size={17} /> Platform Global Configurations
                  </h3>
                  <button 
                    onClick={handleUpdatePaymentLink}
                    className="px-6 py-2 bg-[#FF8A00] hover:bg-orange-600 text-white rounded-xl text-center font-black text-[10.5px] uppercase tracking-wider shadow-sm transition-all active:scale-[0.98]"
                  >
                    Save All Changes
                  </button>
                </div>
                
                <div className="max-w-3xl space-y-8">
                  {/* Branding Section */}
                  <div className="space-y-4">
                    <div className="flex items-center gap-2">
                      <div className="w-1.5 h-4 bg-[#FF8A00] rounded-full"></div>
                      <h4 className="text-[11px] font-black uppercase tracking-widest text-slate-500">Platform Branding</h4>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Application Logo URL</label>
                        <input 
                          type="text" 
                          value={appSettings.logoUrl || ''}
                          onChange={(e) => setAppSettings(prev => ({ ...prev, logoUrl: e.target.value }))}
                          className="w-full h-[45px] bg-[#FAF9F8] border border-slate-200 rounded-xl px-4 text-sm font-medium focus:border-[#FF8A00] outline-none"
                          placeholder="https://example.com/logo.png"
                        />
                        <p className="text-[9px] text-slate-400 font-bold uppercase italic mt-1">Direct image link (PNG/JPG/SVG) for global platform headers.</p>
                      </div>
                      {appSettings.logoUrl && (
                        <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex flex-col items-center gap-2">
                          <span className="text-[9px] font-black uppercase text-slate-400">Live Preview</span>
                          <img src={appSettings.logoUrl} alt="Logo Preview" className="max-h-[60px] object-contain" onError={(e) => (e.currentTarget.style.display = 'none')} />
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Payment Gateway Section */}
                  <div className="space-y-4">
                    <div className="flex items-center gap-2">
                      <div className="w-1.5 h-4 bg-indigo-500 rounded-full"></div>
                      <h4 className="text-[11px] font-black uppercase tracking-widest text-slate-500">UPI Payment Gateway</h4>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">UPI Address (VPA)</label>
                        <input 
                          type="text" 
                          value={appSettings.vpa || ''}
                          onChange={(e) => setAppSettings(prev => ({ ...prev, vpa: e.target.value }))}
                          className="w-full h-[45px] bg-[#FAF9F8] border border-slate-200 rounded-xl px-4 text-sm font-medium focus:border-indigo-500 outline-none"
                          placeholder="yourname@upi"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Merchant Name</label>
                        <input 
                          type="text" 
                          value={appSettings.merchantName || ''}
                          onChange={(e) => setAppSettings(prev => ({ ...prev, merchantName: e.target.value }))}
                          className="w-full h-[45px] bg-[#FAF9F8] border border-slate-200 rounded-xl px-4 text-sm font-medium focus:border-indigo-500 outline-none"
                          placeholder="Business Name"
                        />
                      </div>
                    </div>

                    <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                      <input 
                        type="checkbox" 
                        checked={appSettings.upiActive ?? true}
                        onChange={(e) => setAppSettings(prev => ({ ...prev, upiActive: e.target.checked }))}
                        className="w-4 h-4 accent-[#FF8A00]"
                        id="upi-active"
                      />
                      <label htmlFor="upi-active" className="text-xs font-bold text-slate-600 cursor-pointer">Enable UPI Payments for users</label>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* =========================================================
              J. SUBSECTION: NOTIFICATIONS
              ========================================================= */}
          {activeSubSection === 'notifications' && (
            <div className="space-y-6">
              <div className="bg-white border border-[#FFD6A5]/25 rounded-[24px] p-6 shadow-xs relative overflow-hidden">
                <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
                  <div>
                    <h3 className="text-md font-black uppercase text-slate-800 flex items-center gap-2">
                      <Bell className="text-[#FF8A00]" size={18} /> System Audit Notifications
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5 leading-snug">
                      Review automated tracking event warnings, payout alerts, and deposit queue clearances as they happen.
                    </p>
                  </div>
                  
                  {notifications.filter(n => !n.read).length > 0 && (
                    <button
                      onClick={markAllNotificationsRead}
                      className="px-4 py-2 bg-orange-50 hover:bg-orange-100 text-[#FF8A00] rounded-xl font-bold text-[10.5px] uppercase tracking-wider transition-all"
                    >
                      Mark All as Read
                    </button>
                  )}
                </div>

                <div className="divide-y divide-slate-100 divide-dashed max-h-[600px] overflow-y-auto pr-1">
                  {notifications.length === 0 ? (
                    <div className="py-16 text-center flex flex-col justify-center items-center">
                      <div className="w-12 h-12 rounded-full bg-slate-50 flex items-center justify-center text-slate-350 border border-slate-100 mb-2">
                        <Bell size={18} />
                      </div>
                      <p className="text-xs font-black uppercase text-slate-600 tracking-wider">No logged events found</p>
                      <p className="text-[10.5px] text-slate-400 mt-1">Real-time gateway actions will register here.</p>
                    </div>
                  ) : (
                    notifications.map((notif) => {
                      const dateStr = notif.createdAt ? new Date(notif.createdAt).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Unknown';
                      return (
                        <div key={notif.id} className={`py-4 flex gap-4 pr-2 items-start transition-all relative ${notif.read ? 'opacity-70' : ''}`}>
                          <div className={`w-2.5 h-2.5 rounded-full mt-2 shrink-0 ${notif.read ? 'bg-slate-200' : 'bg-brand'}`} />
                          
                          <div className="flex-1 text-left">
                            <div className="flex justify-between items-start gap-3">
                              <h4 className={`text-[13px] leading-tight ${notif.read ? 'font-semibold text-slate-700' : 'font-extrabold text-slate-900'}`}>{notif.title}</h4>
                              <span className="text-[10px] font-mono font-bold text-slate-400 shrink-0 bg-slate-50 px-2 py-0.5 rounded">{dateStr}</span>
                            </div>
                            <p className="text-[11.5px] text-slate-500 leading-normal mt-1">{notif.message}</p>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          )}

        </div>
      </section>

      {/* =========================================================
          MODAL: ZOOM IN IDENTITY PHOTOGRAPH
          ========================================================= */}
      <AnimatePresence>
        {zoomDocUrl && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setZoomDocUrl(null)}
            className="fixed inset-0 bg-slate-900/80 backdrop-blur-md z-[99999] flex items-center justify-center p-6 cursor-zoom-out"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 15 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 15 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-3xl p-6 max-w-lg w-full border border-orange-100/30 overflow-hidden relative shadow-2xl flex flex-col items-center justify-center text-center text-sm font-sans"
            >
              <button 
                onClick={() => setZoomDocUrl(null)}
                className="absolute top-4 right-4 w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center hover:bg-orange-50 text-[#FF8A00] cursor-pointer transition-colors border border-slate-200"
              >
                <X size={15} />
              </button>
              
              <div className="w-12 h-12 rounded-full bg-orange-100 text-[#FF8A00] flex items-center justify-center mb-3.5 shadow-xs shrink-0">
                <FileText size={20} className="stroke-[2.2]" />
              </div>

              <h4 className="font-sans font-black text-slate-800 text-[15px] uppercase tracking-wider">Aadhaar Validation Inspection</h4>
              
              <div className="my-6 bg-gradient-to-br from-[#FFF8F0] to-orange-50 border border-[#FFD6A5] p-2 rounded-2xl min-h-[140px] w-full flex items-center justify-center text-[#FF8A00] font-mono leading-relaxed select-all overflow-hidden bg-slate-100">
                {zoomDocUrl.startsWith('data:image/') ? (
                  <img src={zoomDocUrl} alt="Aadhaar Zoomed" className="max-h-[300px] w-full object-contain rounded-xl" />
                ) : (
                  <span className="p-4 block text-center text-xs">{zoomDocUrl}</span>
                )}
              </div>

              <p className="text-[11px] text-slate-400 font-bold leading-normal">
                This document layout verified against National UIDAI registries. Identity properties successfully extracted.
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>



      {/* =========================================================
          DRAWER / DIALOG: DETAILED DEPOSIT RECEIPTS & SCREENSHOTS
          ========================================================= */}
      <AnimatePresence>
        {selectedDepositReceipt && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSelectedDepositReceipt(null)}
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-[9999] flex justify-end"
          >
            <motion.div 
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 220 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-lg bg-white h-full shadow-2xl border-l border-[#FFD6A5]/25 flex flex-col justify-between overflow-hidden"
            >
              <div className="flex-1 overflow-y-auto p-6 space-y-7 pb-20 select-none">
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-3.5">
                    <div className="w-12 h-12 rounded-full bg-orange-50 border border-orange-200 flex items-center justify-center text-[#ff8c2a]">
                      <ArrowDownToLine size={24} />
                    </div>
                    <div>
                      <h3 className="text-[17px] font-sans font-black text-slate-800 leading-tight">Deposit Audit Details</h3>
                      <p className="font-mono text-[9px] text-[#FF8A00] uppercase tracking-widest font-black mt-1">
                        ID: {selectedDepositReceipt.id}
                      </p>
                    </div>
                  </div>
                  <button 
                    onClick={() => setSelectedDepositReceipt(null)}
                    className="w-8 h-8 rounded-full bg-slate-50 hover:bg-orange-50 border border-slate-100 flex items-center justify-center text-slate-500 hover:text-[#ff8c2a] cursor-pointer"
                  >
                    <X size={15} />
                  </button>
                </div>

                <div className="space-y-5">
                  
                  {/* Trader details block */}
                  <div className="space-y-2">
                    <h4 className="text-[10.5px] font-black uppercase text-slate-400 tracking-wider font-extrabold pb-1">Trader Information</h4>
                    <div className="bg-slate-50 p-4 border border-slate-100 rounded-2xl space-y-2 text-xs">
                      <div className="flex justify-between">
                        <span className="text-slate-450">Name:</span>
                        <span className="text-slate-800 font-extrabold">{selectedDepositReceipt.name || 'Exchange user'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-450">Email:</span>
                        <span className="text-slate-800 font-mono font-bold">{selectedDepositReceipt.email}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-450">UID:</span>
                        <span className="text-slate-600 font-mono text-[10px]">{selectedDepositReceipt.uid}</span>
                      </div>
                    </div>
                  </div>

                  {/* Transaction details block */}
                  <div className="space-y-2">
                    <h4 className="text-[10.5px] font-black uppercase text-slate-400 tracking-wider font-extrabold pb-1">Transaction Specifications</h4>
                    <div className="bg-slate-50 p-4 border border-slate-100 rounded-2xl space-y-2 text-xs font-bold text-slate-700">
                      <div className="flex justify-between items-center">
                        <span className="text-slate-455">Deposited Amount:</span>
                        <span className="text-sm font-black text-emerald-600">
                          {selectedDepositReceipt.currency === 'INR' ? formatINR(selectedDepositReceipt.amount * 85) : formatUSD(selectedDepositReceipt.amount)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-455">Status:</span>
                        <span className={`px-2 py-0.5 rounded text-[8.5px] font-black uppercase border ${
                          selectedDepositReceipt.status === 'approved' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-rose-50 text-rose-600 border-rose-100'
                        }`}>
                          {selectedDepositReceipt.status}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-455">Payment Gateway:</span>
                        <span className="uppercase text-[10px] text-slate-600">{selectedDepositReceipt.paymentMethod || 'UPI_AI_SCREENSHOT'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-455">Merchant VPA:</span>
                        <span className="font-mono text-slate-600 font-medium select-all truncate max-w-[250px]">{selectedDepositReceipt.txId || 'None'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-455">Logged Time:</span>
                        <span className="text-slate-500 font-mono font-medium">{selectedDepositReceipt.createdAt ? new Date(selectedDepositReceipt.createdAt).toLocaleString() : '--'}</span>
                      </div>
                    </div>
                  </div>

                  {/* UNIQUE AUDIT DETAILS */}
                  <div className="space-y-2">
                    <h4 className="text-[10.5px] font-black uppercase text-slate-400 tracking-wider font-extrabold pb-1">PhonePe/UPI AI Scan Fields</h4>
                    <div className="bg-orange-50/50 p-4 border border-orange-100/50 rounded-2xl space-y-3 text-xs">
                      <div>
                        <span className="text-slate-450 block text-[10px] uppercase font-black tracking-wide">PhonePe Transaction ID</span>
                        <span className="text-slate-800 font-mono font-black text-sm select-all mt-0.5 block">
                          {selectedDepositReceipt.phonepeTxnId || (
                            <span className="text-slate-400 font-sans italic font-bold">Not detected or legacy payment</span>
                          )}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-450 block text-[10px] uppercase font-black tracking-wide">UTR Reference Number</span>
                        <span className="text-slate-800 font-mono font-black text-sm select-all mt-0.5 block">
                          {selectedDepositReceipt.utr || (
                            <span className="text-slate-400 font-sans italic font-bold">Not detected or legacy payment</span>
                          )}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* SCREENSHOT PRESENTATION */}
                  <div className="space-y-2">
                    <h4 className="text-[10.5px] font-black uppercase text-slate-400 tracking-wider font-extrabold pb-1">Submitted Receipt Image</h4>
                    {selectedDepositReceipt.screenshot ? (
                      <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-xs bg-slate-50 max-h-[380px] flex justify-center p-2 relative">
                        <img 
                          src={selectedDepositReceipt.screenshot} 
                          alt="Receipt Screenshot" 
                          referrerPolicy="no-referrer"
                          className="max-h-[365px] w-auto object-contain rounded-lg shadow-2xs"
                        />
                      </div>
                    ) : (
                      <div className="border-2 border-dashed border-slate-200 rounded-2xl p-8 text-center text-slate-400 text-xs font-semibold">
                        No receipt image uploaded for this ledger entry.
                      </div>
                    )}
                  </div>

                </div>
              </div>

              <div className="p-5 border-t border-slate-100 bg-slate-50/70 flex flex-wrap gap-2 shrink-0">
                {selectedDepositReceipt.status === 'pending' && (
                  <>
                    <button 
                      onClick={() => {
                        handleDepositAction(selectedDepositReceipt.id, 'approved', selectedDepositReceipt.uid, selectedDepositReceipt.amount);
                        setSelectedDepositReceipt(null);
                      }}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-black text-xs uppercase tracking-wider flex-1 cursor-pointer transition-colors"
                    >
                      Approve
                    </button>
                    <button 
                      onClick={() => {
                        handleDepositAction(selectedDepositReceipt.id, 'rejected', selectedDepositReceipt.uid, selectedDepositReceipt.amount);
                        setSelectedDepositReceipt(null);
                      }}
                      className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-black text-xs uppercase tracking-wider flex-1 cursor-pointer transition-colors"
                    >
                      Reject
                    </button>
                  </>
                )}
                {selectedDepositReceipt.status === 'approved' && (
                  <button 
                    onClick={() => {
                      handleDepositAction(selectedDepositReceipt.id, 'rejected', selectedDepositReceipt.uid, selectedDepositReceipt.amount);
                      setSelectedDepositReceipt(null);
                    }}
                    className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-black text-xs uppercase tracking-wider flex-1 cursor-pointer transition-colors"
                  >
                    Reject & Deduct Balance
                  </button>
                )}
                <button 
                  onClick={() => setSelectedDepositReceipt(null)}
                  className="px-4 py-2.5 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-xl font-black text-xs uppercase tracking-wider w-full text-center cursor-pointer transition-colors"
                >
                  Close Audit Details
                </button>
              </div>

            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Admin Mobile Bottom Navigation */}
      <nav className="lg:hidden bg-surface/80 backdrop-blur-xl border-t border-brand-light/20 fixed bottom-0 left-0 right-0 z-[100] overflow-x-auto [&::-webkit-scrollbar]:hidden pb-safe supports-[backdrop-filter]:bg-surface/70">
        <div className="flex items-center w-max px-2 h-16 min-w-full justify-start sm:justify-around">
          {[
            { id: 'overview', label: 'Overview', icon: TrendingUp },
            { id: 'users', label: 'Users', icon: Users },
            { id: 'withdrawals', label: 'Withdraw', icon: ArrowUpRight },
            { id: 'deposits', label: 'Deposits', icon: ArrowDownRight },
            { id: 'kyc', label: 'KYC', icon: UserCheck },
            { id: 'tickets', label: 'Tickets', icon: HelpCircle },
            { id: 'logins', label: 'Logins', icon: Clock },
            { id: 'settings', label: 'Settings', icon: Settings }
          ].map(item => (
            <button
              key={`mob-nav-${item.id}`}
              onClick={() => {
                setActiveSubSection(item.id as any);
                setSearchQuery('');
              }}
              className={`flex flex-col items-center justify-center w-[72px] shrink-0 h-full gap-1 transition-all relative ${
                activeSubSection === item.id ? 'text-brand' : 'text-text-muted hover:text-brand/70'
              }`}
            >
              <item.icon size={22} className={activeSubSection === item.id ? "stroke-[2.5px]" : "stroke-[1.5px]"} />
              <span className={`text-[9px] uppercase tracking-wider ${activeSubSection === item.id ? 'font-bold' : 'font-medium'}`}>
                {item.label}
              </span>
              {activeSubSection === item.id && (
                <motion.div layoutId="admin-nav-indicator" className="absolute top-0 right-1/2 translate-x-1/2 w-6 h-[3px] bg-brand rounded-b-full shadow-[0_2px_8px_rgba(255,140,66,0.6)]" />
              )}
            </button>
          ))}
        </div>
      </nav>

    </div>
  );
}

// Arrow Down Icon Helper
function ArrowDownToLine({ className, size = 16 }: { className?: string, size?: number }) {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      width={size} 
      height={size} 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2.2" 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      className={className}
    >
      <path d="M12 17V3" />
      <path d="m6 11 6 6 6-6" />
      <path d="M19 21H5" />
    </svg>
  );
}
