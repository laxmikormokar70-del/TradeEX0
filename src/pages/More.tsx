import React from 'react';
import { TrendingUp, Percent, Wallet, ChevronRight } from 'lucide-react';

export default function MorePage({ setActiveTab }: { setActiveTab: (tab: string) => void }) {
  const options = [
    { id: 'statistics', label: 'Trading Ledger', icon: Percent, tab: 'statistics' },
    { id: 'currency', label: 'Display Currency', icon: Wallet, tab: 'currency' }
  ];

  return (
    <div className="p-6 h-full bg-slate-50 overflow-y-auto">
      <h2 className="text-2xl font-bold text-slate-900 mb-6 font-sans tracking-tight">Settings</h2>
      <div className="grid gap-3 max-w-2xl mx-auto pb-24">
        {options.map((option) => (
          <button
            key={option.id}
            onClick={() => {
                setActiveTab(option.tab);
            }}
            className="flex items-center justify-between p-4 bg-white rounded-xl shadow-sm border border-slate-100 hover:border-orange-200 transition-all cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-orange-50 flex items-center justify-center text-orange-600">
                <option.icon size={20} />
              </div>
              <span className="font-semibold text-slate-800">{option.label}</span>
            </div>
            <ChevronRight className="text-slate-400" size={20} />
          </button>
        ))}
      </div>
    </div>
  );
}
