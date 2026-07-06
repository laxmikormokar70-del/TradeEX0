import React from 'react';
import { useTradingContext, formatUSD } from '../store/TradingContext';
import { History, CheckCircle, Clock } from 'lucide-react';

export default function RecentTransactions({ accountMode = 'real' }: { accountMode?: 'real' | 'demo' }) {
  const { tradeHistory, isDemo } = useTradingContext();
  
  // Sorting by timestamp descending (recent first). Filter out based on mode.
  // In demo mode, fetch demo transactions. If accountMode is real, we only want real transactions (when !isDemo globally or tracking separately).
  const relevantTransactions = (accountMode === 'real' && !isDemo) ? tradeHistory : [];

  const recentTransactions = [...relevantTransactions].sort((a, b) => b.timestamp - a.timestamp).slice(0, 5);

  return (
    <div className="bg-white rounded-[24px] p-6 shadow-3xs border border-slate-100 mt-6">
      <div className="flex items-center gap-2.5 border-b border-slate-100 pb-4 mb-4">
        <div className="w-8 h-8 rounded-lg bg-orange-50 text-[#F97316] flex items-center justify-center">
          <History size={16} />
        </div>
        <h3 className="font-extrabold text-[#1E293B] text-[15px] uppercase tracking-wider">Recent Transactions</h3>
      </div>
      
      {recentTransactions.length === 0 ? (
        <p className="text-[13px] font-bold uppercase tracking-wider text-slate-400 text-center py-4">No Data Available</p>
      ) : (
        <div className="space-y-3">
          {recentTransactions.map((tx) => (
            <div key={tx.id} className="flex justify-between items-center bg-slate-50 p-4 rounded-xl border border-slate-100">
              <div className="flex flex-col gap-0.5">
                <span className="text-[13px] font-bold text-slate-800">{tx.pair}</span>
                <span className="text-[11px] font-semibold text-slate-400 capitalize">
                    {tx.type} • {tx.side}
                </span>
                <span className="text-[10px] font-semibold text-slate-400">
                    {new Date(tx.timestamp).toLocaleString()}
                </span>
              </div>
              <div className="text-right flex flex-col items-end gap-1 select-none">
                <span className="text-[13px] font-mono font-bold text-slate-900 whitespace-nowrap">{formatUSD(tx.price * tx.quantity)}</span>
                <span className={`flex items-center gap-1 text-[10px] uppercase font-black px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-600`}>
                  <CheckCircle size={10} /> Settled
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
