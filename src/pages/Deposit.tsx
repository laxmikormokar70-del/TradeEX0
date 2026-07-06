import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../store/AuthContext';
import { useTradingContext, formatINR } from '../store/TradingContext';
import { 
  ArrowLeft, Wallet, CheckCircle, ShieldCheck, ChevronRight, 
  Copy, History, Clock, UploadCloud, Image, Trash2, 
  Smartphone, AlertTriangle, Eye, Loader2, Download
} from 'lucide-react';
import { collection, addDoc, query, where, orderBy, limit, onSnapshot, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { motion, AnimatePresence } from 'motion/react';
import { QRCodeSVG } from 'qrcode.react';

const PhonePeLogo = () => (
  <div className="flex items-center gap-1.5 px-3 py-1.5 bg-[#5f259f]/5 rounded-xl border border-[#5f259f]/15 shrink-0 shadow-3xs">
    <div className="w-5 h-5 bg-[#5f259f] rounded-lg flex items-center justify-center text-white font-serif font-black text-[10px] shadow-3xs">Pe</div>
    <span className="text-[11px] font-black text-[#6d30b0] tracking-tight">PhonePe</span>
  </div>
);

const PaytmLogo = () => (
  <div className="flex items-center gap-1.5 px-3 py-1.5 bg-[#002fd6]/5 rounded-xl border border-[#002fd6]/15 shrink-0 shadow-3xs">
    <div className="w-5 h-5 bg-[#002fd6] rounded-lg flex items-center justify-center text-white font-sans font-black text-[9px] tracking-tighter shadow-3xs">pay</div>
    <span className="text-[11px] font-black text-[#002fbe] tracking-tight">Paytm</span>
  </div>
);

const GPayLogo = () => (
  <div className="flex items-center gap-1.5 px-3 py-1.5 bg-sky-500/5 rounded-xl border border-sky-500/15 shrink-0 shadow-3xs">
    <div className="flex items-center gap-0.5">
      <span className="text-[11px] font-black text-blue-600">G</span>
      <span className="text-[11px] font-black text-red-500">o</span>
      <span className="text-[11px] font-black text-amber-500">o</span>
      <span className="text-[11px] font-black text-green-600">g</span>
      <span className="text-[11px] font-black text-blue-500">l</span>
      <span className="text-[11px] font-black text-[#F97316]">e</span>
    </div>
    <span className="text-[11px] font-black text-slate-700 tracking-tight">Pay</span>
  </div>
);

export default function DepositPage({ setActiveTab }: { setActiveTab?: (tab: string) => void }) {
  const { user, profile, updateProfileData } = useAuth();
  const { accountMode, setDemoBalance } = useTradingContext();

  const [amount, setAmount] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [step, setStep] = useState<'amount' | 'qr' | 'success' | 'failed'>('amount');

  // New states for Screenshot Upload and AI Verification
  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isVerifyingScreenshot, setIsVerifyingScreenshot] = useState(false);
  const [verificationError, setVerificationError] = useState<string>('');
  const [verificationFeedback, setVerificationFeedback] = useState<string>('');
  
  // High-fidelity active verification sub-steps (AI feel)
  const [verifyingDetails, setVerifyingDetails] = useState<string>('');

  const [recentDeposits, setRecentDeposits] = useState<any[]>([]);
  const [timeLeft, setTimeLeft] = useState<number>(300); // 5 minutes countdown

  const upiId = 'trade-in@freecharge';
  const upiName = 'TradeEX';

  const qrRef = useRef<HTMLDivElement>(null);

  const compressImage = (base64Str: string, maxWidth = 800, maxHeight = 800, quality = 0.7): Promise<string> => {
    return new Promise((resolve) => {
      const img = new globalThis.Image();
      img.src = base64Str;
      img.onerror = () => resolve(base64Str);
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL('image/jpeg', quality));
        } else {
          resolve(base64Str);
        }
      };
    });
  };

  const handleDownloadQR = () => {
    if (!qrRef.current) return;
    const svg = qrRef.current.querySelector('svg');
    if (!svg) return;

    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new globalThis.Image();
    
    img.onload = () => {
      canvas.width = img.width * 2;
      canvas.height = img.height * 2;
      if (ctx) {
        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        const pngFile = canvas.toDataURL('image/png');
        const downloadLink = document.createElement('a');
        downloadLink.download = `TradeEX_Payment_QR_${amount}.png`;
        downloadLink.href = pngFile;
        downloadLink.click();
      }
    };
    
    img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
  };

  // Timer Effect for QR Payment Session
  useEffect(() => {
    if (step !== 'qr') return;
    
    setTimeLeft(300); // Reset to 300 seconds (5 minutes)
    
    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    
    return () => clearInterval(interval);
  }, [step]);

  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, 'deposits'),
      where('uid', '==', user.uid),
      orderBy('createdAt', 'desc'),
      limit(5)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const deps = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setRecentDeposits(deps);
    }, (err) => {
      console.error("Error fetching deposits:", err);
    });

    return () => unsubscribe();
  }, [user]);

  if (!user) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-6 text-center h-full">
        <div className="w-20 h-20 bg-orange-50 rounded-full flex items-center justify-center text-orange-500 mb-6 shadow-sm">
          <Wallet size={32} />
        </div>
        <h2 className="text-[22px] font-bold text-slate-800 mb-2">Authentication Required</h2>
        <p className="text-[14px] text-slate-500 max-w-[300px] mb-8">
          Please Login or Create an Account to continue with deposits.
        </p>
        <div className="flex items-center gap-4">
          <button onClick={() => setActiveTab?.('login')} className="px-8 flex-1 h-[46px] bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl font-bold text-sm">Login</button>
          <button onClick={() => setActiveTab?.('signup')} className="px-8 flex-1 h-[46px] bg-[#F97316] hover:bg-[#EA580C] text-white rounded-xl font-bold text-sm">Register</button>
        </div>
      </div>
    );
  }

  const handleContinueToPayment = () => {
    const amt = parseFloat(amount);
    if (isNaN(amt) || amt < 1) {
      setError('Minimum deposit amount is ₹1');
      return;
    }
    setError('');
    
    if (accountMode === 'demo') {
      handleDemoDeposit();
    } else {
      setSelectedFile(null);
      setPreviewUrl(null);
      setVerificationError('');
      setVerificationFeedback('');
      setStep('qr');
    }
  };

  const handleDemoDeposit = async () => {
    setIsLoading(true);
    const amt = parseFloat(amount);
    setTimeout(() => {
      setDemoBalance(prev => ({
        ...prev,
        inr: prev.inr + amt,
        usd: prev.usd + (amt / 83.5)
      }));
      setSuccessMsg(`₹${amt} Demo Balance Added successfully.`);
      setIsLoading(false);
      setAmount('');
      setTimeout(() => {
        setSuccessMsg('');
        setActiveTab?.('portfolio');
      }, 2000);
    }, 800);
  };

  // Drag and drop handlers
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  const handleFile = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      setVerificationError('Please upload an image screenshot of your payment receipt.');
      return;
    }
    setSelectedFile(file);
    setVerificationError('');
    setVerificationFeedback('');

    const reader = new FileReader();
    reader.onload = async (e) => {
      const base64 = e.target?.result as string;
      // Compress image to ensure it's under Firestore's 1MB limit and fits in API request
      const compressed = await compressImage(base64);
      setPreviewUrl(compressed);
    };
    reader.readAsDataURL(file);
  };

  const removeFile = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
    setVerificationError('');
    setVerificationFeedback('');
  };

  // Verify screenshot via backend Gemini API
  const handleVerifyScreenshot = async () => {
    if (!previewUrl) {
      setVerificationError('Please choose or drag a screenshot file first.');
      return;
    }

    setIsVerifyingScreenshot(true);
    setVerificationError('');
    setVerificationFeedback('');

    // Progressive loading updates to give immediate AI user-feedback
    setVerifyingDetails('1/4 Loading payment receipt image...');
    
    setTimeout(() => {
      setVerifyingDetails('2/4 Initiating TradeEX AI OCR scanning engine...');
    }, 1200);

    setTimeout(() => {
      setVerifyingDetails('3/4 Matching merchant VPA reference against trade-in@freecharge...');
    }, 2800);

    setTimeout(() => {
      setVerifyingDetails('4/4 Comparing amounts and validating date constraints (must match today)...');
    }, 4200);

    try {
      const reqAmount = parseFloat(amount);
      const res = await fetch('/api/verify-screenshot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          image: previewUrl,
          expectedAmount: reqAmount
        })
      });

      if (!res.ok) {
        throw new Error('Verification network request failed. Please try again.');
      }

      const resData = await res.json();
      if (!resData.success || !resData.result) {
        throw new Error(resData.error || 'Failed to complete screenshot analysis. Try another file.');
      }

      const aiResult = resData.result;
      console.log("Returned AI results:", aiResult);

      if (aiResult.success) {
        setVerifyingDetails('Checking for duplicate transactions...');

        // 1. Check PhonePe Transaction ID Duplicate
        if (aiResult.transactionId) {
          const txnQuery = query(collection(db, 'deposits'), where('phonepeTxnId', '==', aiResult.transactionId));
          const txnSnapshot = await getDocs(txnQuery);
          if (!txnSnapshot.empty) {
            setVerificationError(`AI Verification Rejected: This receipt has already been processed.`);
            setVerificationFeedback(`Duplicate PhonePe Transaction ID detected: ${aiResult.transactionId}. Reuse of screenshots is strictly forbidden.`);
            setIsVerifyingScreenshot(false);
            setVerifyingDetails('');
            return;
          }
        }

        // 2. Check UTR number Duplicate
        if (aiResult.utr) {
          const utrQuery = query(collection(db, 'deposits'), where('utr', '==', aiResult.utr));
          const utrSnapshot = await getDocs(utrQuery);
          if (!utrSnapshot.empty) {
            setVerificationError(`AI Verification Rejected: This receipt has already been processed.`);
            setVerificationFeedback(`Duplicate UTR number detected: ${aiResult.utr}. Reuse of screenshots is strictly forbidden.`);
            setIsVerifyingScreenshot(false);
            setVerifyingDetails('');
            return;
          }
        }

        // Double check confirmation: payment is valid!
        setVerifyingDetails('Saving verified deposit entry...');
        
        // Add approved deposit record
        await addDoc(collection(db, 'deposits'), {
          uid: user.uid,
          email: user.email,
          name: profile?.name || user.displayName || 'Exchange User',
          amount: reqAmount,
          currency: 'INR',
          txId: aiResult.upiId || 'TradeEX_AI_Verified',
          phonepeTxnId: aiResult.transactionId || '',
          utr: aiResult.utr || '',
          screenshot: previewUrl || '',
          status: 'approved',
          createdAt: new Date().toISOString(),
          paymentMethod: 'UPI_AI_SCREENSHOT'
        });

        // Add real balance inside Firestore user profiles
        const currentUsd = profile?.realBalanceUSD || 0;
        const currentInr = profile?.realBalanceINR || 0;
        
        await updateProfileData({
          realBalanceUSD: currentUsd + (reqAmount / 83.5),
          realBalanceINR: currentInr + reqAmount
        });

        setStep('success');
        removeFile();
        
        setTimeout(() => {
          setActiveTab?.('portfolio');
        }, 4000);
      } else {
        // Log the failed deposit
        try {
          await addDoc(collection(db, 'deposits'), {
            uid: user.uid,
            email: user.email,
            name: profile?.name || user.displayName || 'Exchange User',
            amount: reqAmount,
            detectedAmount: aiResult.amount || 0,
            currency: 'INR',
            txId: aiResult.upiId || 'TradeEX_AI_Rejected',
            screenshot: previewUrl || '',
            status: 'failed',
            message: aiResult.message || 'Amount mismatch or invalid receipt',
            createdAt: new Date().toISOString(),
            paymentMethod: 'UPI_AI_SCREENSHOT'
          });
        } catch (e) {
          console.error('Failed to log cancelled deposit', e);
        }

        // AI rejected payment verification because specifications failed
        setVerificationError(`Payment Cancelled by AI: ${aiResult.message}`);
        setVerificationFeedback(`Detected Amount: ₹${aiResult.amount || '0'} (Expected: ₹${reqAmount}) | Status: Rejected`);
        
        // Return to amount selection after a short delay since it's cancelled
        setTimeout(() => {
          setStep('amount');
        }, 5000);
      }
    } catch (err: any) {
      console.error(err);
      setVerificationError(err.message || 'Verification system is offline. Please try again later or contact support.');
    } finally {
      setIsVerifyingScreenshot(false);
      setVerifyingDetails('');
    }
  };

  const upiUrl = `upi://pay?pa=${upiId}&pn=${encodeURIComponent(upiName)}&am=${amount}&cu=INR`;
  const phonepeUrl = `phonepe://pay?pa=${upiId}&pn=${encodeURIComponent(upiName)}&am=${amount}&cu=INR`;
  const paytmUrl = `paytmmp://pay?pa=${upiId}&pn=${encodeURIComponent(upiName)}&am=${amount}&cu=INR`;
  const gpayUrl = `gpay://upi/pay?pa=${upiId}&pn=${encodeURIComponent(upiName)}&am=${amount}&cu=INR`;

  if (profile?.status === 'suspended') {
    return (
      <div className="flex flex-col h-full bg-[#fffaf4] font-sans pb-24 overflow-y-auto">
        {/* Header */}
        <div className="bg-white px-4 py-4 border-b border-orange-100 flex items-center gap-3 sticky top-0 z-10 shadow-sm">
          <button 
            onClick={() => setActiveTab?.('portfolio')} 
            className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-orange-50 text-slate-600 transition-colors"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-xl font-black text-slate-800 leading-none">Add Funds</h1>
            <p className="text-[12px] font-extrabold text-[#FF8A00] mt-1 uppercase tracking-wider">
              Account Suspended
            </p>
          </div>
        </div>

        <div className="p-5 max-w-lg mx-auto w-full mt-12">
          <div className="bg-white rounded-[24px] p-8 shadow-sm border border-red-100 text-center space-y-4">
            <div className="w-16 h-16 bg-red-50 border border-red-100 rounded-full flex items-center justify-center mx-auto text-red-500 animate-pulse">
              <AlertTriangle size={28} />
            </div>
            <h2 className="text-lg font-black text-slate-800">Account Restricted</h2>
            <p className="text-xs text-slate-500 leading-relaxed">
              Your account has been temporarily suspended by risk governance. Deposits and financial trades are disabled. Please open a helpdesk ticket to resolve this restriction.
            </p>
            <button 
              onClick={() => setActiveTab?.('support')}
              className="px-6 py-2.5 bg-red-50 hover:bg-red-105 text-red-600 border border-red-100 rounded-xl font-bold text-xs uppercase tracking-wider transition-colors cursor-pointer inline-block"
            >
              Contact Support Desk
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-[#fffaf4] font-sans pb-24 overflow-y-auto">
      {/* Header */}
      <div className="bg-white px-4 py-4 border-b border-orange-100 flex items-center gap-3 sticky top-0 z-10 shadow-sm">
        <button 
          onClick={() => (step === 'qr') ? setStep('amount') : setActiveTab?.('portfolio')} 
          className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-orange-50 text-slate-600 transition-colors"
        >
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1 className="text-xl font-black text-slate-800 leading-none">Add Funds</h1>
          <p className="text-[12px] font-extrabold text-slate-400 mt-1 uppercase tracking-wider">
            {accountMode === 'demo' ? 'Virtual Demo Gateway' : 'Instant AI Checked UPI'}
          </p>
        </div>
      </div>

      <div className="p-5 space-y-6 max-w-lg mx-auto w-full">
        {step === 'amount' && (
          <div className="space-y-6">
            <div className={`p-4 rounded-[18px] border flex items-center justify-between ${accountMode === 'real' ? 'bg-emerald-50 border-emerald-100' : 'bg-amber-50 border-amber-100'}`}>
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${accountMode === 'real' ? 'bg-emerald-100/50 text-emerald-600' : 'bg-amber-100/50 text-amber-600'}`}>
                  <Wallet size={18} />
                </div>
                <div>
                  <p className={`text-[11px] font-black uppercase tracking-wider ${accountMode === 'real' ? 'text-emerald-500' : 'text-amber-500'}`}>Active Gateway</p>
                  <p className={`text-[15px] font-extrabold ${accountMode === 'real' ? 'text-emerald-700' : 'text-amber-700'} mt-0.5`}>
                    {accountMode === 'real' ? 'Instant AI Verification' : 'Demo Account'}
                  </p>
                </div>
              </div>
              {accountMode === 'real' && <ShieldCheck size={24} className="text-emerald-400 opacity-50" />}
            </div>

            <div className="bg-white rounded-[24px] p-6.5 shadow-sm border border-slate-100">
              <h3 className="font-extrabold text-[15px] text-slate-800 mb-5 tracking-tight">Enter Deposit Amount</h3>
              
              {error && (
                <div className="mb-4 bg-rose-50 border border-rose-100 text-rose-600 text-[13px] font-bold rounded-xl p-3.5">
                  {error}
                </div>
              )}
              
              <div className="space-y-5">
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 font-bold text-xl">₹</span>
                  <input
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0.00"
                    className="w-full h-14 pl-11 pr-4 bg-slate-50 border border-slate-200 rounded-[14px] text-xl font-black text-slate-800 focus:border-[#F97316] outline-none transition-colors"
                  />
                </div>

                <div className="flex items-center gap-2">
                  {[500, 1000, 5000, 10000].map(val => (
                     <button
                      key={val}
                      onClick={() => setAmount(val.toString())}
                      className="flex-1 py-2.5 rounded-xl bg-[#fffaf4] hover:bg-orange-50 border border-orange-100 hover:border-[#ff8c2a] text-[#ff8c2a] text-[12px] font-bold transition-colors cursor-pointer"
                    >
                      +{formatINR(val)}
                    </button>
                  ))}
                </div>

                <button
                  onClick={handleContinueToPayment}
                  disabled={isLoading || !amount || parseFloat(amount) <= 0}
                  className="w-full h-14 bg-[#ff8c2a] hover:bg-orange-500 text-white rounded-[16px] font-extrabold text-[14px] uppercase tracking-wider flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-orange-500/20 mt-6 cursor-pointer"
                >
                  {isLoading ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      {accountMode === 'demo' ? 'Add Demo Funds' : 'Proceed via UPI'} <ChevronRight size={18} />
                    </>
                  )}
                </button>
              </div>
            </div>
            
            {recentDeposits.length > 0 && (
              <div className="bg-white rounded-[24px] p-6.5 shadow-sm border border-slate-100">
                <div className="flex items-center gap-2 mb-5">
                  <History size={18} className="text-slate-400" />
                  <h3 className="font-bold text-[14px] text-slate-700 tracking-tight">Recent Deposits</h3>
                </div>
                <div className="space-y-4">
                  {recentDeposits.map((dep) => (
                    <div key={dep.id} className="flex items-center justify-between border-b border-slate-50 pb-4 last:border-0 last:pb-0">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${dep.status === 'approved' ? 'bg-emerald-50 text-emerald-500' : dep.status === 'failed' ? 'bg-rose-50 text-rose-500' : 'bg-amber-50 text-amber-500'}`}>
                           {dep.status === 'approved' ? <CheckCircle size={16} /> : dep.status === 'failed' ? <AlertTriangle size={16} /> : <Clock size={16} />}
                        </div>
                        <div>
                          <p className="text-[14px] font-bold text-slate-800">{formatINR(dep.amount)}</p>
                          <p className="text-[11px] uppercase tracking-wider text-slate-400 font-bold mt-1">
                             {new Date(dep.createdAt).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                         <span className={`text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-md ${dep.status === 'approved' ? 'bg-emerald-50 text-emerald-600' : dep.status === 'failed' ? 'bg-rose-50 text-rose-600' : 'bg-amber-50 text-amber-600'}`}>
                           {dep.status}
                         </span>
                         {dep.txId && <p className="text-[9px] text-slate-400 font-mono mt-1 pr-1 truncate max-w-[120px]">{dep.txId.startsWith('WOLF') ? dep.txId.replace('WOLF_', '#') : dep.txId}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
          </div>
        )}

        {step === 'qr' && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-[28px] shadow-2xl overflow-hidden w-full relative border border-slate-100 max-w-4xl mx-auto"
          >
            {timeLeft === 0 ? (
              <div className="p-12 text-center space-y-5">
                <div className="w-16 h-16 bg-rose-50 rounded-full flex items-center justify-center text-rose-500 mx-auto border border-rose-100 shadow-sm animate-pulse">
                  <Clock size={28} />
                </div>
                <h3 className="text-lg font-black text-slate-800 uppercase tracking-tight">Unified Session Expired</h3>
                <p className="text-xs text-slate-500 max-w-sm mx-auto leading-relaxed">
                  Your secure payment checkout session has timed out (5-minute limit). For your transaction security, please return to the amount selection and try again.
                </p>
                <div className="pt-2">
                  <button 
                    onClick={() => setStep('amount')}
                    className="px-8 h-12 bg-[#ff8c2a] hover:bg-orange-600 text-white font-extrabold text-xs uppercase tracking-widest rounded-xl transition-all shadow-md active:scale-95"
                  >
                    Request New Payment Session
                  </button>
                </div>
              </div>
            ) : (
              <>
                {/* Header with Countdown Clock */}
                <div className="bg-gradient-to-b from-[#FFFDFB] to-white p-5 pb-4 flex flex-col sm:flex-row items-center justify-between border-b border-dashed border-slate-100 gap-3">
                  <div className="text-center sm:text-left">
                    <span className="text-[10px] font-black tracking-widest bg-orange-100 text-[#ff8c2a] px-3 py-1 rounded-full uppercase leading-none">Instant Secure Gateway</span>
                    <h2 className="text-lg font-black text-slate-800 mt-2 leading-none uppercase tracking-tight">AI-Assisted UPI Deposit Desk</h2>
                  </div>
                  
                  {/* Master 5-Minute Countdown Timer Clock */}
                  <div className="flex items-center gap-2 px-4 py-1.5 bg-rose-50 border border-rose-100/60 rounded-full text-[11px] font-black text-rose-600 uppercase tracking-wider animate-pulse shadow-3xs">
                    <Clock size={14} className="text-rose-500 shrink-0" />
                    <span>Time Left: {Math.floor(timeLeft / 60).toString().padStart(2, '0')}:{(timeLeft % 60).toString().padStart(2, '0')}</span>
                  </div>
                </div>

                {/* 2-Column Responsive checkout dashboard layout */}
                <div className="grid grid-cols-1 md:grid-cols-12 gap-6 p-5 md:p-6.5">
                  
                  {/* Left Column (Cohesive Payment Profile Receipt) */}
                  <div className="md:col-span-6 space-y-4">
                    {/* Unified Profile Card Frame */}
                    <div className="bg-[#FFFDFB] rounded-[24px] border border-orange-100/60 p-4 shadow-3xs hover:shadow-xs transition-shadow">
                      
                      <div className="flex items-center justify-center border-b border-orange-100/40 pb-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#ff8c2a] to-orange-500 text-white flex items-center justify-center font-black text-sm shadow-md">
                            IN
                          </div>
                          <div>
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-1 items-center flex gap-1.5 justify-center"><ShieldCheck size={11} className="text-emerald-500" /> Verified Merchant</p>
                            <h4 className="text-base font-black text-slate-800 tracking-tight leading-none text-center">{upiName}</h4>
                          </div>
                        </div>
                      </div>

                      {/* Cash value overlay inside the profile layout */}
                      <div className="py-5 text-center border-b border-dashed border-orange-100/35 bg-orange-50/10 rounded-2xl my-2">
                        <span className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Deposit Amount (Pay Exact)</span>
                        <div className="flex items-baseline justify-center gap-1.5 text-[#ff8c2a] font-bold">
                          <span className="text-xl">₹</span>
                          <span className="text-4xl font-black tracking-tighter leading-none select-all">
                            {formatINR(parseFloat(amount)).replace('₹', '')}
                          </span>
                          <button 
                            onClick={() => {
                              navigator.clipboard.writeText(amount);
                              setSuccessMsg('Amount Copied!');
                              setTimeout(() => setSuccessMsg(''), 1500);
                            }}
                            className="text-slate-300 hover:text-[#ff8c2a] ml-1 transition-colors self-center cursor-pointer"
                            title="Copy deposit amount"
                          >
                            <Copy size={11} />
                          </button>
                        </div>
                        {successMsg && (
                          <div className="text-[9px] text-emerald-600 font-extrabold uppercase tracking-wide mt-1 text-center animate-pulse">{successMsg}</div>
                        )}
                      </div>

                      {/* QR framing setup */}
                      <div className="flex flex-col items-center justify-center pt-2">
                        
                        {/* Professional VPA Box Above QR */}
                        <div className="w-full max-w-[260px] bg-white border border-slate-200 rounded-xl py-2 px-3 flex items-center justify-between shadow-3xs mb-4">
                          <div className="flex items-center flex-1 min-w-0">
                            <span className="text-[11px] text-slate-500 font-extrabold uppercase tracking-widest shrink-0">Pay<span className="mx-1 text-slate-300">-</span></span>
                            <span className="font-mono text-[12px] font-black text-slate-800 selection:bg-orange-100 truncate mt-[1px]">{upiId}</span>
                          </div>
                          <button 
                            onClick={() => {
                              navigator.clipboard.writeText(upiId);
                              setSuccessMsg('Payment ID Copied!');
                              setTimeout(() => setSuccessMsg(''), 1500);
                            }}
                            className="bg-slate-50 hover:bg-orange-50 p-2 rounded-lg border border-slate-100 text-slate-400 hover:text-[#ff8c2a] hover:border-orange-200 transition-all cursor-pointer shadow-3xs ml-2 shrink-0"
                            title="Copy Payment ID"
                          >
                            <Copy size={13} />
                          </button>
                        </div>

                        <div 
                          ref={qrRef}
                          className="bg-white p-4 rounded-3xl shadow-xl border border-slate-150 mb-4 relative group"
                        >
                          {/* Light scanner simulation line */}
                          <div className="absolute left-1 right-1 h-[2px] bg-gradient-to-r from-transparent via-orange-400 to-transparent top-1/2 pointer-events-none animate-pulse"></div>
                          <QRCodeSVG value={upiUrl} size={180} level="H" includeMargin={true} />
                        </div>

                        {/* High fidelity QR export button */}
                        <button 
                          onClick={handleDownloadQR}
                          className="mb-6 flex items-center gap-2 px-6 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-black text-[11px] uppercase tracking-widest transition-all shadow-sm active:scale-95 border border-slate-200"
                        >
                          <Download size={14} className="text-[#ff8c2a]" />
                          Save High-Res QR to Gallery
                        </button>

                        {/* Unified BHIM UPI Tagline */}
                        <div className="flex items-center justify-center gap-1 opacity-70 mb-3">
                          <span className="font-sans italic font-black text-slate-500 text-[10px] tracking-tight">BHIM</span>
                          <div className="h-2.5 w-[1px] bg-slate-200"></div>
                          <span className="font-sans italic font-black text-transparent bg-clip-text bg-gradient-to-r from-emerald-600 via-slate-600 to-orange-500 text-[10px] tracking-tighter">UPI</span>
                        </div>

                        {/* Beautiful Sweet Professional Supported Badges Indicator */}
                        <div className="w-full bg-slate-50/60 rounded-xl p-3 border border-slate-100 text-center space-y-2 mt-1">
                          <span className="block text-[8.5px] font-black text-slate-400 uppercase tracking-widest text-[9px]">Scan with any secure UPI application</span>
                          <div className="flex items-center justify-center gap-1.5 flex-wrap">
                            <PhonePeLogo />
                            <PaytmLogo />
                            <GPayLogo />
                          </div>
                        </div>
                      </div>

                    </div>
                  </div>

                  {/* Right Column (Screenshot Upload and OCR Verification Panel) */}
                  <div className="md:col-span-6 flex flex-col justify-between space-y-4">
                    
                    <div className="space-y-4">
                      <div className="text-left bg-orange-50/20 rounded-2xl p-4 border border-orange-100/30">
                        <h4 className="text-[12px] font-extrabold text-slate-800 tracking-tight flex items-center gap-1.5">
                          <UploadCloud size={15} className="text-[#ff8c2a]" />
                          Submit Screenshot Proof
                        </h4>
                        <p className="text-[10.5px] text-slate-500 leading-normal mt-1">
                          Complete your UPI payment first. Then capture and upload a clean screenshot of the payment receipt clearly showing the successful status, exact amount paid, and reference fields.
                        </p>
                      </div>

                      {/* Drag & Drop Screenshot Frame */}
                      <div 
                        onDragEnter={handleDrag}
                        onDragOver={handleDrag}
                        onDragLeave={handleDrag}
                        onDrop={handleDrop}
                        className={`border-2 border-dashed rounded-[20px] p-4.5 text-center transition-all cursor-pointer relative flex flex-col items-center justify-center min-h-[160px] ${
                          dragActive 
                            ? 'border-[#ff8c2a] bg-orange-50/50' 
                            : previewUrl 
                              ? 'border-emerald-300 bg-emerald-50/5' 
                              : 'border-slate-200 hover:border-[#ff8c2a] bg-slate-50/50'
                        }`}
                      >
                        <input
                          type="file"
                          id="screenshot-file-input"
                          className="hidden"
                          accept="image/*"
                          onChange={handleFileInputChange}
                          disabled={isVerifyingScreenshot}
                        />

                        <AnimatePresence mode="wait">
                          {!previewUrl ? (
                            <label 
                              htmlFor="screenshot-file-input" 
                              className="w-full h-full flex flex-col items-center justify-center cursor-pointer py-3"
                            >
                              <div className="w-10 h-10 rounded-full bg-orange-50 flex items-center justify-center text-[#ff8c2a] mb-2 shadow-inner">
                                <Image size={18} />
                              </div>
                              <p className="text-[11px] font-black text-slate-800">
                                Drag & Drop screenshot here
                              </p>
                              <p className="text-[10px] text-slate-400 mt-0.5">
                                or <span className="text-[#ff8c2a] font-bold hover:underline">Choose Image File</span>
                              </p>
                            </label>
                          ) : (
                            <div className="relative w-full flex flex-col items-center">
                              {/* Selected Preview Image */}
                              <div className="relative rounded-xl overflow-hidden border border-slate-200 shadow-3xs max-w-[100px] aspect-square mb-2">
                                <img 
                                  src={previewUrl} 
                                  alt="Screenshot receipt" 
                                  className="w-full h-full object-cover" 
                                />
                                <div className="absolute inset-0 bg-black/10 flex items-center justify-center hover:bg-black/25 transition-all">
                                  <span className="text-white bg-black/70 px-1.5 py-0.5 rounded text-[8px] font-bold flex items-center gap-1">
                                    <Eye size={9} /> Selected
                                  </span>
                                </div>
                              </div>

                              <p className="text-[10px] font-bold text-slate-700 truncate max-w-[180px] leading-tight">
                                {selectedFile ? selectedFile.name : "screenshot.png"}
                              </p>
                              
                              {/* Remove file button */}
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  removeFile();
                                }}
                                disabled={isVerifyingScreenshot}
                                className="absolute -top-1 -right-1 p-1 bg-rose-50 hover:bg-rose-100 text-rose-500 rounded-full transition-colors border border-rose-100 shadow-3xs cursor-pointer"
                                title="Remove Screenshot"
                              >
                                <Trash2 size={12} />
                              </button>
                            </div>
                          )}
                        </AnimatePresence>
                      </div>

                      {/* Error representation in uploader */}
                      {verificationError && (
                        <div className="bg-rose-50/85 border border-rose-100 rounded-xl p-3 text-left space-y-1">
                          <p className="flex items-center gap-1 text-rose-700 text-[11px] font-black uppercase tracking-wider">
                            <AlertTriangle size={12} className="shrink-0" />
                            Verification Rejected
                          </p>
                          <p className="font-bold text-[10px] text-rose-500 leading-normal">{verificationError}</p>
                          {verificationFeedback && (
                            <p className="font-mono text-[8.5px] text-slate-500 pt-1 border-t border-rose-200/40 leading-normal">{verificationFeedback}</p>
                          )}
                        </div>
                      )}

                      {/* Active AI scan progress bar */}
                      {isVerifyingScreenshot && (
                        <div className="bg-sky-50/80 border border-sky-100 rounded-xl p-3 text-left space-y-2">
                          <div className="flex items-center gap-1.5">
                            <Loader2 size={12} className="animate-spin text-sky-600 shrink-0" />
                            <span className="font-extrabold text-[11px] text-[#002fbe] uppercase tracking-wider">AI Analysis Protocol...</span>
                          </div>
                          <p className="font-mono text-[9px] text-[#002fbe] leading-tight">{verifyingDetails}</p>
                          <div className="w-full h-1 bg-sky-200/40 rounded-full overflow-hidden">
                            <div className="h-full bg-blue-500 animate-pulse w-4/5 rounded-full"></div>
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="space-y-2 pt-2">
                      {/* Confirm & Scan action button */}
                      <button
                        type="button"
                        onClick={handleVerifyScreenshot}
                        disabled={!previewUrl || isVerifyingScreenshot}
                        className="w-full h-11 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed text-white rounded-xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-1.5 transition-all shadow-md active:scale-98 cursor-pointer"
                      >
                        {isVerifyingScreenshot ? (
                          <>
                            <Loader2 size={13} className="animate-spin" />
                            Analyzing Proof Authenticity...
                          </>
                        ) : (
                          <>
                            <ShieldCheck size={14} />
                            Verify Receipt with AI
                          </>
                        )}
                      </button>

                      {/* Cancel & return */}
                      <button 
                        onClick={() => setStep('amount')}
                        disabled={isVerifyingScreenshot}
                        className="w-full h-11 bg-white hover:bg-orange-50/50 text-slate-700 border border-slate-200 font-bold uppercase tracking-widest text-[#ff8c2a] text-xs rounded-xl transition-all shadow-3xs active:scale-[0.98] flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Change Amount / Cancel
                      </button>
                    </div>

                  </div>
                </div>
              </>
            )}
          </motion.div>
        )}

        {step === 'success' && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-[24px] shadow-2xl p-8 text-center min-h-[400px] flex flex-col justify-center items-center border border-emerald-100 relative max-w-lg mx-auto w-full"
          >
            <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-emerald-100 mb-4 border-4 border-white shadow-lg">
                <CheckCircle className="text-2xl text-emerald-600 animate-bounce" size={32} />
            </div>
            <h2 className="text-xl font-black text-slate-900 mb-2 tracking-tight">Payment Verified</h2>
            <p className="text-slate-500 text-sm mb-6 font-medium">Your deposit of ₹{amount} has been successfully verified by our AI and credited to your real account balance.</p>
            
            <div className="w-full bg-slate-50 border border-slate-100 rounded-xl p-4 flex flex-col items-center">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Redirecting to Portfolio...</p>
              <div className="flex gap-1.5 mt-2">
                 <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></div>
                 <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse delay-75"></div>
                 <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse delay-150"></div>
              </div>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
