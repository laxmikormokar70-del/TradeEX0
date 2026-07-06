import React, { useState, useEffect } from 'react';
import { useAuth } from '../store/AuthContext';
import { useTradingContext, formatINR } from '../store/TradingContext';
import { ArrowLeft, Wallet, ShieldCheck, CheckCircle, HelpCircle, ChevronRight, RefreshCw, AlertCircle } from 'lucide-react';
import { collection, addDoc, doc, updateDoc, getDoc, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { motion, AnimatePresence } from 'motion/react';

export default function WithdrawPage({ setActiveTab }: { setActiveTab?: (tab: string) => void }) {
  const { user, profile } = useAuth();
  const { accountMode, setAccountMode, setDemoBalance, accountBalance } = useTradingContext();

  const [amount, setAmount] = useState<string>('');
  const [upiId, setUpiId] = useState<string>('');
  const [accountHolderName, setAccountHolderName] = useState<string>('');
  const [mobileNumber, setMobileNumber] = useState<string>('');
  
  const [step, setStep] = useState<1 | 2>(1); // 1 = Form, 2 = Review
  const [error, setError] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [withdrawalsList, setWithdrawalsList] = useState<any[]>([]);

  // Subscribed to user's personal withdrawal history
  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, 'withdrawals'), where('uid', '==', user.uid));
    const unsub = onSnapshot(q, (snapshot) => {
      const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as any));
      setWithdrawalsList(list.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()));
    });
    return () => unsub();
  }, [user]);

  if (!user) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-6 text-center h-full">
        <div className="w-20 h-20 bg-orange-50 rounded-full flex items-center justify-center text-[#F97316] mb-6 shadow-sm">
          <Wallet size={32} />
        </div>
        <h2 className="text-[22px] font-bold text-slate-800 mb-2">Authentication Required</h2>
        <p className="text-[14px] text-slate-500 max-w-[300px] mb-8">
          Please Login or Create an Account to continue with withdrawals.
        </p>
        <div className="flex items-center gap-4 w-full max-w-xs">
          <button onClick={() => setActiveTab?.('login')} className="px-6 flex-1 h-[46px] bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl font-bold text-sm">Login</button>
          <button onClick={() => setActiveTab?.('signup')} className="px-6 flex-1 h-[46px] bg-[#F97316] hover:bg-[#EA580C] text-white rounded-xl font-bold text-sm">Register</button>
        </div>
      </div>
    );
  }

  if (profile?.status === 'suspended') {
    return (
      <div className="flex flex-col h-full bg-[#fffaf4] font-sans pb-24 overflow-y-auto">
        <div className="bg-white px-4 py-4 border-b border-orange-100 flex items-center gap-3 sticky top-0 z-10 shadow-sm">
          <button 
            onClick={() => setActiveTab?.('portfolio')} 
            className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-orange-50 text-slate-600 transition-colors"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-xl font-black text-slate-800 leading-none">Instant Payouts</h1>
            <p className="text-[12px] font-extrabold text-[#FF8A00] mt-1 uppercase tracking-wider">
              Account Suspended
            </p>
          </div>
        </div>

        <div className="p-5 max-w-lg mx-auto w-full mt-12">
          <div className="bg-white rounded-[24px] p-8 shadow-sm border border-red-100 text-center space-y-4">
            <div className="w-16 h-16 bg-red-50 border border-red-100 rounded-full flex items-center justify-center mx-auto text-red-505 animate-pulse">
              <AlertCircle size={28} />
            </div>
            <h2 className="text-lg font-black text-slate-800">Account Restricted</h2>
            <p className="text-xs text-slate-500 leading-relaxed">
              Your account has been temporarily suspended by risk governance. Deposits, trades, and financial withdrawals are disabled. Please open a support ticket to resolve this restriction.
            </p>
            <button 
              onClick={() => setActiveTab?.('support')}
              className="px-6 py-2.5 bg-red-50 hover:bg-red-100 text-red-600 border border-red-100 rounded-xl font-bold text-xs uppercase tracking-wider transition-colors cursor-pointer inline-block"
            >
              Contact Support Desk
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Pre-fill user name if profile loads
  useEffect(() => {
    if (profile?.name && !accountHolderName) {
      setAccountHolderName(profile.name);
    }
  }, [profile]);

  const withdrawAmountVal = parseFloat(amount) || 0;
  const processingFee = withdrawAmountVal * 0.02;
  const finalAmount = withdrawAmountVal - processingFee;

  const handleValidateForm = () => {
    setError('');
    
    if (isNaN(withdrawAmountVal) || withdrawAmountVal < 100) {
      setError('Minimum withdrawal amount is ₹100');
      return;
    }

    if (withdrawAmountVal > accountBalance.inr) {
      setError(`Sufficient balance is required. Available: ${formatINR(accountBalance.inr)}`);
      return;
    }

    if (!upiId.trim() || !upiId.includes('@')) {
      setError('Please enter a valid UPI ID (e.g. user@paytm)');
      return;
    }

    if (!accountHolderName.trim()) {
      setError('Account Holder Name is required');
      return;
    }

    const cleanMobile = mobileNumber.replace(/\D/g, '');
    if (cleanMobile.length < 10) {
      setError('Please enter a valid 10-digit mobile number');
      return;
    }

    // Go to review step
    setStep(2);
  };

  const handleSubmitRequest = async () => {
    setError('');
    setIsLoading(true);

    try {
      // Re-verify balance in DB just to be secure (for Real account)
      if (accountMode === 'real') {
        const userRef = doc(db, 'users', user.uid);
        const userSnap = await getDoc(userRef);
        if (!userSnap.exists()) {
          throw new Error('User profile error or not found.');
        }

        const userData = userSnap.data();
        const availableInr = userData.realBalanceINR || 0;
        const availableUsd = userData.realBalanceUSD || 0;

        if (withdrawAmountVal > availableInr) {
          throw new Error(`Sufficient balance is required. Selected: ${formatINR(withdrawAmountVal)}, Available: ${formatINR(availableInr)}`);
        }

        // Deduct from real profile balance
        const updatedInr = availableInr - withdrawAmountVal;
        const updatedUsd = availableUsd - (withdrawAmountVal / 83.5);

        await updateDoc(userRef, {
          realBalanceINR: updatedInr,
          realBalanceUSD: updatedUsd
        });

        // Save real withdrawal request
        await addDoc(collection(db, 'withdrawals'), {
          id: 'wd_' + Date.now(),
          uid: user.uid,
          name: accountHolderName,
          email: user.email,
          amount: withdrawAmountVal / 85, // Works perfectly with (w.amount * 85) in Admin Panel to show ₹withdrawAmountVal
          amountINR: withdrawAmountVal,
          currency: 'INR',
          fee: processingFee / 85,
          feeINR: processingFee,
          receivedINR: finalAmount,
          upiId: upiId.trim(),
          mobile: cleanMobileNumber(),
          status: 'pending',
          createdAt: new Date().toISOString()
        });
      } else {
        // Handle Demo mode deduction
        if (withdrawAmountVal > accountBalance.inr) {
          throw new Error('Sufficient demo balance is required.');
        }

        setDemoBalance(prev => {
          const newInr = prev.inr - withdrawAmountVal;
          return {
            inr: newInr,
            usd: newInr / 83.5
          };
        });

        // Log simulation withdrawal
        await addDoc(collection(db, 'withdrawals'), {
          id: 'wd_demo_' + Date.now(),
          uid: user.uid,
          name: `[Demo] ${accountHolderName}`,
          email: `${user.email} (Demo)`,
          amount: withdrawAmountVal / 85,
          amountINR: withdrawAmountVal,
          currency: 'INR',
          fee: processingFee / 85,
          feeINR: processingFee,
          receivedINR: finalAmount,
          upiId: upiId.trim(),
          mobile: cleanMobileNumber(),
          status: 'pending',
          createdAt: new Date().toISOString()
        });
      }

      setSuccessMsg('Withdrawal request submitted successfully.');
      setAmount('');
      setUpiId('');
      setMobileNumber('');
      setStep(1);

      setTimeout(() => {
        setSuccessMsg('');
      }, 5000);

    } catch (err: any) {
      setError(err?.message || 'Something went wrong submitting request.');
    } finally {
      setIsLoading(false);
    }
  };

  const cleanMobileNumber = () => {
    return mobileNumber.replace(/\D/g, '');
  };

  return (
    <div className="flex flex-col h-full bg-[#FAFAFA] font-sans pb-24 overflow-y-auto">
      {/* Header */}
      <div className="bg-white px-4 py-4 border-b border-slate-100 flex items-center gap-3 sticky top-0 z-10">
        <button onClick={() => setActiveTab?.('portfolio')} className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-slate-50 text-slate-600 transition-colors">
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1 className="text-lg font-black text-slate-800 leading-none">Withdrawal Gateway</h1>
          <p className="text-[11px] font-bold text-slate-400 mt-1 uppercase tracking-wider">
            {accountMode === 'demo' ? 'VIRTUAL DEMO DISBURSEMENT' : 'SECURE UPI SETTLEMENT'}
          </p>
        </div>
      </div>

      <div className="p-5 space-y-6 max-w-lg mx-auto w-full">
        {/* Balances Board */}
        <div className="bg-gradient-to-br from-[#F97316] to-[#EA580C] text-white rounded-[24px] p-6 shadow-md relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl -mr-10 -mt-10" />
          <p className="text-[11px] text-white/80 uppercase font-bold tracking-wider mb-1">Available Balance</p>
          <h2 className="text-[26px] font-black tracking-tight mb-2">
            {formatINR(accountBalance.inr)}
          </h2>
          <div className="flex items-center gap-1.5 text-[11px] text-white/90 font-semibold bg-white/10 px-3 py-1 rounded-full w-fit">
            <ShieldCheck size={12} className="stroke-[2.5]" />
            <span>2% Processing Fee Appears on Checkout</span>
          </div>
        </div>

        {error && (
          <div className="bg-rose-50 border border-rose-100 text-rose-600 text-xs font-bold rounded-2xl p-4 flex gap-2.5 items-start shadow-xs">
            <AlertCircle size={16} className="shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {successMsg && (
          <div className="bg-emerald-50 border border-emerald-100 text-emerald-750 text-xs font-bold rounded-2xl p-4 flex gap-2.5 items-start shadow-xs">
            <CheckCircle size={16} className="shrink-0 mt-0.5" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Withdrawal form/review stack */}
        <AnimatePresence mode="wait">
          {(!profile || (profile.kycStatus !== 'approved' && !profile.verified)) ? (
            <motion.div
              key="kyc-blocker"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-[24px] p-6 text-center shadow-xs border border-slate-100 flex flex-col items-center justify-center py-10 space-y-5"
            >
              <div className="w-16 h-16 bg-rose-50 rounded-full flex items-center justify-center text-rose-500 mb-2">
                <AlertCircle size={32} className="stroke-[2.5]" />
              </div>
              <div className="space-y-2 max-w-sm">
                <h3 className="font-extrabold text-[17px] text-slate-800 tracking-tight leading-tight">
                  KYC Verification Required
                </h3>
                <p className="text-xs text-slate-500 leading-relaxed">
                  As per regulatory compliance guidelines, you must verify your identity (KYC) before you can request any withdrawals.
                </p>
                {profile?.kycStatus === 'pending' && (
                  <div className="bg-amber-50 border border-amber-100 p-3 rounded-xl mt-3 text-left">
                    <span className="font-black text-amber-700 text-[10px] uppercase block tracking-wider mb-0.5">● Audit in progress</span>
                    <span className="text-[10px] text-amber-600 block leading-normal font-semibold">Your KYC documentation is currently queued and under active administration review. We will notify you once verified.</span>
                  </div>
                )}
                {profile?.kycStatus === 'rejected' && (
                  <div className="bg-rose-50 border border-rose-100 p-3 rounded-xl mt-3 text-left">
                    <span className="font-black text-rose-700 text-[10px] uppercase block tracking-wider mb-0.5">✕ Verification Rejected</span>
                    <span className="text-[10px] text-rose-600 block leading-normal font-semibold">
                      Your previous KYC submission was rejected by our compliance head.
                      {profile.kycRejectReason && (
                        <span className="block font-black mt-1 text-slate-805">Reason: {profile.kycRejectReason}</span>
                      )}
                    </span>
                  </div>
                )}
              </div>
              
              <button
                type="button"
                onClick={() => {
                  localStorage.setItem('account_active_subtab', 'compliance');
                  if (setActiveTab) setActiveTab('account');
                }}
                className="w-full max-w-xs h-12 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white rounded-xl font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all shadow-md active:scale-95 cursor-pointer mt-2"
              >
                Complete Your KYC
              </button>
            </motion.div>
          ) : accountMode === 'demo' ? (
            <motion.div
              key="demo-blocker"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-[24px] p-6 text-center shadow-xs border border-slate-100 flex flex-col items-center justify-center py-10 space-y-5"
            >
              <div className="w-16 h-16 bg-amber-50 rounded-full flex items-center justify-center text-amber-500 mb-2">
                <AlertCircle size={32} className="stroke-[2.5]" />
              </div>
              <div className="space-y-1 max-w-sm">
                <h3 className="font-extrabold text-[17px] text-slate-800 tracking-tight leading-tight">
                  Real Account Required
                </h3>
              </div>
              
              <button
                type="button"
                onClick={() => setAccountMode('real')}
                className="w-full max-w-xs h-12 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white rounded-xl font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all shadow-md active:scale-95 cursor-pointer mt-2"
              >
                <span className="w-2 h-2 rounded-full bg-white shrink-0 animate-pulse" />
                Switch to Real Account
              </button>
            </motion.div>
          ) : step === 1 ? (
            <motion.div 
              key="form"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="bg-white rounded-[24px] p-6 shadow-xs border border-slate-100 space-y-5"
            >
              <h3 className="font-extrabold text-[15px] text-slate-800 tracking-tight pb-3 border-b border-slate-50">Settlement Account Details</h3>
              
              {/* UPI ID input */}
              <div className="space-y-1.5">
                <label className="block text-[11px] font-black uppercase text-slate-400 tracking-wider">UPI ID</label>
                <input 
                  type="text"
                  value={upiId}
                  onChange={(e) => setUpiId(e.target.value)}
                  placeholder="e.g. name@paytm or upiholder@ybl"
                  className="w-full h-12 px-4 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-800 focus:border-[#F97316] outline-none transition-colors"
                />
              </div>

              {/* Account Holder Name */}
              <div className="space-y-1.5">
                <label className="block text-[11px] font-black uppercase text-slate-400 tracking-wider">Account Holder Name</label>
                <input 
                  type="text"
                  value={accountHolderName}
                  onChange={(e) => setAccountHolderName(e.target.value)}
                  placeholder="Full Legal Name"
                  className="w-full h-12 px-4 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-800 focus:border-[#F97316] outline-none transition-colors"
                />
              </div>

              {/* Mobile Number */}
              <div className="space-y-1.5">
                <label className="block text-[11px] font-black uppercase text-slate-400 tracking-wider">Mobile Number</label>
                <input 
                  type="tel"
                  value={mobileNumber}
                  onChange={(e) => setMobileNumber(e.target.value)}
                  placeholder="Registered Mobile Number"
                  maxLength={10}
                  className="w-full h-12 px-4 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-800 focus:border-[#F97316] outline-none transition-colors"
                />
              </div>

              {/* Amount input */}
              <div className="space-y-1.5 pt-2">
                <div className="flex justify-between items-center text-[11px] font-black uppercase tracking-wider text-slate-400">
                  <label>Amount to Withdraw (INR)</label>
                  <span>Min ₹100</span>
                </div>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 font-extrabold text-base">₹</span>
                  <input 
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0"
                    className="w-full h-13 pl-8 pr-4 bg-slate-50 border border-slate-200 rounded-xl text-base font-extrabold text-slate-800 focus:border-[#F97316] outline-none transition-colors"
                  />
                </div>
                
                {/* Instant Calculation Panel */}
                {withdrawAmountVal >= 100 && (
                  <motion.div 
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="bg-orange-50/30 border border-orange-100 rounded-xl p-4 mt-3 space-y-2 text-xs font-bold"
                  >
                    <div className="flex justify-between text-slate-500">
                      <span>Withdrawal Level:</span>
                      <span className="font-mono text-slate-700">{formatINR(withdrawAmountVal)}</span>
                    </div>
                    <div className="flex justify-between text-slate-500">
                      <span>Processing Fee (2%):</span>
                      <span className="font-mono text-slate-700">{formatINR(processingFee)}</span>
                    </div>
                    <div className="border-t border-orange-100/60 pt-2 flex justify-between text-slate-800 text-sm">
                      <span>You Will Receive:</span>
                      <span className="font-mono text-[#F97316] font-extrabold">{formatINR(finalAmount)}</span>
                    </div>
                  </motion.div>
                )}
              </div>

              <button
                onClick={handleValidateForm}
                className="w-full h-12 bg-gradient-to-r from-[#F97316] to-[#EA580C] hover:from-[#EA580C] hover:to-[#C2410C] text-white rounded-xl font-extrabold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-md active:scale-95"
              >
                Review Settlement <ChevronRight size={14} />
              </button>
            </motion.div>
          ) : (
            <motion.div 
              key="review"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="bg-white rounded-[24px] p-6 shadow-xs border border-slate-100 space-y-5"
            >
              <div className="flex justify-between items-center pb-3 border-b border-slate-50">
                <h3 className="font-extrabold text-[15px] text-slate-800 tracking-tight">Review Withdrawal</h3>
                <button 
                  onClick={() => setStep(1)} 
                  className="text-xs font-black text-[#F97316] uppercase tracking-wider hover:underline"
                >
                  Edit Details
                </button>
              </div>

              <div className="space-y-3 text-xs font-bold divide-y divide-slate-50">
                <div className="flex justify-between py-2.5 gap-4">
                  <span className="text-slate-400">Available Balance:</span>
                  <span className="text-slate-800 font-mono whitespace-nowrap">{formatINR(accountBalance.inr)}</span>
                </div>
                <div className="flex justify-between py-2.5 gap-4">
                  <span className="text-slate-400">Withdrawal Amount:</span>
                  <span className="text-slate-800 font-mono whitespace-nowrap">{formatINR(withdrawAmountVal)}</span>
                </div>
                <div className="flex justify-between py-2.5 gap-4">
                  <span className="text-slate-400">Platform Fee (2%):</span>
                  <span className="text-slate-800 font-mono whitespace-nowrap">{formatINR(processingFee)}</span>
                </div>
                <div className="flex justify-between py-2.5 text-sm gap-4">
                  <span className="text-slate-700 font-extrabold">Final Payout Amount:</span>
                  <span className="text-[#F97316] font-mono font-black whitespace-nowrap">{formatINR(finalAmount)}</span>
                </div>
                <div className="flex justify-between py-2.5 pt-4">
                  <span className="text-slate-400">Settlement UPI ID:</span>
                  <span className="text-slate-800 font-mono">{upiId}</span>
                </div>
                <div className="flex justify-between py-2.5">
                  <span className="text-slate-400">Account Holder:</span>
                  <span className="text-slate-800">{accountHolderName}</span>
                </div>
                <div className="flex justify-between py-2.5">
                  <span className="text-slate-400">Mobile Reference:</span>
                  <span className="text-slate-800 font-mono">{cleanMobileNumber()}</span>
                </div>
              </div>

              <button
                onClick={handleSubmitRequest}
                disabled={isLoading}
                className="w-full h-12 bg-[#F97316] hover:bg-[#EA580C] text-white rounded-xl font-extrabold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-md active:scale-95 disabled:opacity-50"
              >
                {isLoading ? (
                  <RefreshCw size={14} className="animate-spin" />
                ) : (
                  'Request Withdrawal'
                )}
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* User Withdrawal History Module */}
        <div className="bg-white rounded-[24px] p-6 shadow-xs border border-slate-100">
          <div className="flex items-center gap-2 pb-4 border-b border-slate-50 mb-4 justify-between">
            <h3 className="font-extrabold text-slate-800 text-[14px] uppercase tracking-wider">Settlement History</h3>
            <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">UPI / India</span>
          </div>

          {withdrawalsList.length === 0 ? (
            <p className="text-[12px] font-bold text-slate-400 text-center py-6">No withdrawal history available.</p>
          ) : (
            <div className="space-y-3 max-h-[290px] overflow-y-auto pr-1">
              {withdrawalsList.map((wd) => (
                <div key={wd.id} className="p-3 bg-slate-50 border border-slate-100 rounded-xl text-xs font-bold space-y-1.5 relative overflow-hidden">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-700 font-mono">{formatINR(wd.amountINR || (wd.amount * 85))}</span>
                    <span className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase leading-none border ${
                      wd.status === 'approved' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                      wd.status === 'rejected' ? 'bg-rose-50 text-rose-600 border-rose-100' :
                      'bg-amber-50 text-amber-600 border-amber-100 animate-pulse'
                    }`}>
                      {wd.status}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-[10px] text-slate-400 leading-none">
                    <span>Fee: {formatINR(wd.feeINR || (wd.amountINR * 0.02) || 0)}</span>
                    <span className="font-mono text-slate-500">
                      {wd.createdAt ? new Date(wd.createdAt).toLocaleDateString() : '--'}
                    </span>
                  </div>
                  <div className="text-[9.5px] text-slate-450 border-t border-slate-100/60 pt-1.5 flex justify-between items-center">
                    <span className="truncate max-w-[170px] font-mono leading-none">ID: {wd.id}</span>
                    <span className="leading-none text-slate-500 truncate max-w-[120px] font-mono">{wd.upiId}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
