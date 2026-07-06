import React from 'react';
import { Wallet, ArrowLeft, Check, IndianRupee, DollarSign } from 'lucide-react';
import { useAuth } from '../store/AuthContext';

export default function DisplayCurrencyPage({ setActiveTab }: { setActiveTab: (tab: string) => void }) {
  const { profile, updateProfileData } = useAuth();
  
  const currentCurrency = profile?.currencyPreference || 'USDT';

  const handleSwitch = async (mode: 'USDT' | 'INR') => {
    try {
      await updateProfileData({ currencyPreference: mode });
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-50 overflow-y-auto">
      <div className="p-4 sm:p-6 max-w-2xl mx-auto w-full space-y-6 pb-20">
        <div className="flex items-center gap-4 mb-2">
          <button 
            onClick={() => setActiveTab('more')}
            className="w-10 h-10 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-500 hover:text-brand hover:border-brand/40 transition-all cursor-pointer shadow-sm"
          >
            <ArrowLeft size={20} />
          </button>
          <h2 className="text-2xl font-bold text-slate-900">Display Settings</h2>
        </div>

        <div className="bg-white rounded-3xl p-8 shadow-sm border border-slate-100 space-y-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center">
              <Wallet size={22} />
            </div>
            <div>
              <h3 className="font-bold text-slate-900">Currency Preference</h3>
              <p className="text-sm text-slate-500">Select how your balances and profits are displayed across the platform.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4">
            <button 
              onClick={() => handleSwitch('USDT')}
              className={`p-6 rounded-2xl border-2 transition-all flex flex-col items-center gap-4 group ${currentCurrency === 'USDT' ? 'border-orange-500 bg-orange-50/50' : 'border-slate-100 bg-slate-50/50 hover:border-slate-200'}`}
            >
              <div className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${currentCurrency === 'USDT' ? 'bg-orange-500 text-white' : 'bg-white text-slate-400 group-hover:text-slate-600'}`}>
                <DollarSign size={24} />
              </div>
              <div className="text-center">
                <span className="block font-black text-slate-800">USDT (Tether)</span>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Default Standard</span>
              </div>
              {currentCurrency === 'USDT' && <div className="mt-auto pt-2 text-orange-600"><Check size={20} /></div>}
            </button>

            <button 
              onClick={() => handleSwitch('INR')}
              className={`p-6 rounded-2xl border-2 transition-all flex flex-col items-center gap-4 group ${currentCurrency === 'INR' ? 'border-orange-500 bg-orange-50/50' : 'border-slate-100 bg-slate-50/50 hover:border-slate-200'}`}
            >
              <div className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${currentCurrency === 'INR' ? 'bg-orange-500 text-white' : 'bg-white text-slate-400 group-hover:text-slate-600'}`}>
                <IndianRupee size={24} />
              </div>
              <div className="text-center">
                <span className="block font-black text-slate-800">INR (Rupee)</span>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Local Preferred</span>
              </div>
              {currentCurrency === 'INR' && <div className="mt-auto pt-2 text-orange-600"><Check size={20} /></div>}
            </button>
          </div>

          <div className="mt-8 p-4 bg-slate-50 rounded-2xl border border-slate-100 italic text-xs text-slate-400 text-center">
            Note: Changing this setting only affects display units. All underlying trading operations and order executions remain anchored to USDT / Contract underlying assets.
          </div>
        </div>
      </div>
    </div>
  );
}
