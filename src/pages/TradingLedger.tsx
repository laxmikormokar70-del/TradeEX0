import React from 'react';
import { Trophy, ArrowLeft } from 'lucide-react';
import { useTradingContext, formatUSD } from '../store/TradingContext';
import RecentTransactions from '../components/RecentTransactions';

export default function TradingLedgerPage({ setActiveTab }: { setActiveTab: (tab: string) => void }) {
  const { tradeHistory, positionHistory, accountMode } = useTradingContext();

  const stats = React.useMemo(() => {
    // Current mode history is already handled by context
    const tradingVolume = tradeHistory.reduce((acc, tx) => acc + (tx.price * tx.quantity), 0);
    const closedPositionsCount = positionHistory.filter(p => p.status === 'Closed' || p.status === 'TP Hit' || p.status === 'SL Hit').length;
    
    const totalDeposits = 0; 
    const totalWithdrawals = 0; 
    const highestBalance = 0; 
    const avgPositionSize = closedPositionsCount > 0 
      ? positionHistory.reduce((acc, p) => acc + (p.entryPrice * p.quantity), 0) / positionHistory.length 
      : 0;
      
    return { tradingVolume, closedPositionsCount, totalDeposits, totalWithdrawals, highestBalance, avgPositionSize };
  }, [tradeHistory, positionHistory]);

  return (
    <div className="flex flex-col h-full bg-slate-50 overflow-y-auto">
      <div className="p-4 sm:p-6 max-w-5xl mx-auto w-full space-y-6 pb-20">
        <div className="flex items-center gap-4 mb-2">
          <button 
            onClick={() => setActiveTab('more')}
            className="w-10 h-10 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-500 hover:text-brand hover:border-brand/40 transition-all cursor-pointer shadow-sm"
          >
            <ArrowLeft size={20} />
          </button>
          <h2 className="text-2xl font-bold text-slate-900">Trading Ledger</h2>
        </div>

        <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center">
                <Trophy size={22} />
              </div>
              <div>
                <h3 className="font-bold text-slate-900">Statistics Ledger</h3>
                <p className="text-xs text-slate-400 font-medium uppercase tracking-wider">{accountMode} ACCOUNT</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="bg-slate-50 border border-slate-100 p-6 rounded-2xl flex flex-col gap-1 shadow-3xs">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Trading Volume</span>
              <span className="text-2xl font-black text-slate-800 font-mono mt-1">{formatUSD(stats.tradingVolume)}</span>
              <span className="text-[10px] text-slate-400 font-bold uppercase mt-1">Tier 3 qualified</span>
            </div>

            <div className="bg-slate-50 border border-slate-100 p-6 rounded-2xl flex flex-col gap-1 shadow-3xs">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Open Limit</span>
              <span className="text-2xl font-black text-slate-800 font-mono mt-1">4 / 25 Max</span>
              <span className="text-[10px] text-orange-600 font-bold uppercase mt-1">16% Capacity leveraged</span>
            </div>

            <div className="bg-slate-50 border border-slate-100 p-6 rounded-2xl flex flex-col gap-1 shadow-3xs">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Closed Positions</span>
              <span className="text-2xl font-black text-slate-800 font-mono mt-1">{stats.closedPositionsCount} Trades</span>
              <span className="text-[10px] text-slate-400 font-bold uppercase mt-1">Filled record</span>
            </div>

            <div className="bg-slate-50 border border-slate-100 p-6 rounded-2xl flex flex-col gap-1 shadow-3xs">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Deposits</span>
              <span className="text-2xl font-black text-emerald-600 font-mono mt-1">+{formatUSD(stats.totalDeposits)}</span>
              <span className="text-[10px] text-slate-400 font-bold uppercase mt-1">Verified gateways</span>
            </div>

            <div className="bg-slate-50 border border-slate-100 p-6 rounded-2xl flex flex-col gap-1 shadow-3xs">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Withdrawals</span>
              <span className="text-2xl font-black text-rose-500 font-mono mt-1">-{formatUSD(stats.totalWithdrawals)}</span>
              <span className="text-[10px] text-slate-400 font-bold uppercase mt-1">Net processed</span>
            </div>

            <div className="bg-slate-50 border border-slate-100 p-6 rounded-2xl flex flex-col gap-1 shadow-3xs">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Highest Balance</span>
              <span className="text-2xl font-black text-orange-600 font-mono mt-1">{formatUSD(stats.highestBalance)}</span>
              <span className="text-[10px] text-slate-400 font-bold uppercase mt-1">Historical Peak</span>
            </div>
          </div>

          <div className="bg-slate-50 border border-slate-100 p-6 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-6 shadow-3xs">
            <div>
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Average Position Size</span>
              <span className="text-3xl font-black text-slate-800 font-mono mt-1 block">{formatUSD(stats.avgPositionSize)}</span>
            </div>
            <div className="flex gap-4">
              <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-3xs flex flex-col items-center min-w-[120px]">
                <span className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Standard Lev</span>
                <span className="text-xl font-black text-orange-500">20x</span>
              </div>
              <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-3xs flex flex-col items-center min-w-[120px]">
                <span className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Max Lev</span>
                <span className="text-xl font-black text-slate-800">125x</span>
              </div>
            </div>
          </div>

          <div className="pt-4">
            <h4 className="text-sm font-bold text-slate-800 mb-4 uppercase tracking-wider">Recent Transactions</h4>
            <div className="bg-white rounded-2xl overflow-hidden border border-slate-100 shadow-3xs">
              <RecentTransactions accountMode={accountMode} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
