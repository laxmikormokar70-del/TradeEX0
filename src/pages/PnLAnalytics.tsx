import React, { useState } from 'react';
import { TrendingUp, ArrowLeft } from 'lucide-react';
import { useTradingContext } from '../store/TradingContext';

export default function PnLAnalyticsPage({ setActiveTab }: { setActiveTab: (tab: string) => void }) {
  const { positionHistory, accountMode } = useTradingContext();
  const [timeframe, setTimeframe] = useState<'7' | '30' | '90'>('90');

  const stats = React.useMemo(() => {
    // Current mode history is already provided by context thanks to my recent changes
    const relevantHistory = positionHistory;
    
    const timeframeMs = timeframe === '7' ? 7 * 86400000 : timeframe === '30' ? 30 * 86400000 : 90 * 86400000;
    const filteredHistory = relevantHistory.filter(p => 
      (p.status === 'Closed' || p.status === 'TP Hit' || p.status === 'SL Hit') && 
      p.closeTime && (Date.now() - p.closeTime) <= timeframeMs
    );
    
    const pnlTotal = filteredHistory.reduce((acc, p) => acc + (p.pnl || 0), 0);
    const pnlDaily = pnlTotal / parseInt(timeframe);
    const pnlWeekly = pnlDaily * 7;
    const pnlMonthly = pnlDaily * 30;

    const winningTrades = filteredHistory.filter(p => (p.pnl || 0) > 0).length;
    const losingTrades = filteredHistory.filter(p => (p.pnl || 0) < 0).length;
    const totalTrades = filteredHistory.length;
    const winRate = totalTrades > 0 ? ((winningTrades / totalTrades) * 100).toFixed(1) : '0.0';
    
    const profitTrades = filteredHistory.filter(p => (p.pnl || 0) > 0);
    const lossTrades = filteredHistory.filter(p => (p.pnl || 0) < 0);
    
    const avgProfit = profitTrades.length > 0 ? profitTrades.reduce((acc, p) => acc + (p.pnl || 0), 0) / profitTrades.length : 0;
    const avgLoss = lossTrades.length > 0 ? Math.abs(lossTrades.reduce((acc, p) => acc + (p.pnl || 0), 0) / lossTrades.length) : 0;
    const bestTrade = profitTrades.length > 0 ? Math.max(...profitTrades.map(p => p.pnl || 0)) : 0;
    const worstTrade = lossTrades.length > 0 ? Math.min(...lossTrades.map(p => p.pnl || 0)) : 0;

    return { 
      pnlTotal, pnlDaily, pnlWeekly, pnlMonthly, 
      winningTrades, losingTrades, totalTrades, winRate,
      avgProfit, avgLoss, bestTrade, worstTrade
    };
  }, [positionHistory, timeframe]);

  return (
    <div className="flex flex-col h-full bg-slate-50 overflow-y-auto">
      <div className="p-4 sm:p-6 max-w-4xl mx-auto w-full space-y-6 pb-20">
        <div className="flex items-center gap-4 mb-2">
          <button 
            onClick={() => setActiveTab('more')}
            className="w-10 h-10 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-500 hover:text-brand hover:border-brand/40 transition-all cursor-pointer shadow-sm"
          >
            <ArrowLeft size={20} />
          </button>
          <h2 className="text-2xl font-bold text-slate-900">Performance P&L</h2>
        </div>

        <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center">
                <TrendingUp size={22} />
              </div>
              <div>
                <h3 className="font-bold text-slate-900">P&L Analysis</h3>
                <p className="text-xs text-slate-400 font-medium uppercase tracking-wider">{accountMode} ACCOUNT</p>
              </div>
            </div>
            
            <div className="flex bg-slate-100 p-1 rounded-xl">
              {(['7', '30', '90'] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setTimeframe(t)}
                  className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all ${timeframe === t ? 'bg-white text-orange-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                >
                  {t}D
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'Daily P&L', value: stats.pnlDaily },
              { label: 'Weekly P&L', value: stats.pnlWeekly },
              { label: 'Monthly P&L', value: stats.pnlMonthly },
              { label: 'Total Net Profit', value: stats.pnlTotal }
            ].map((item, i) => (
              <div key={i} className="bg-slate-50 border border-slate-100 rounded-2xl p-4 text-center">
                <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">{item.label}</span>
                <div className={`text-lg font-black ${item.value >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                  {item.value > 0 ? '+' : ''}{item.value.toFixed(2)} USDT
                </div>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-slate-50 border border-slate-100 rounded-2xl p-6 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{timeframe}-Day Win Rate</span>
                <span className="text-xs font-black text-orange-600 bg-orange-50 border border-orange-100 px-3 py-1 rounded-lg uppercase">{stats.winRate}% Success</span>
              </div>

              <div className="space-y-3">
                <div className="flex justify-between text-xs font-bold text-slate-700">
                  <span>Wins ({stats.winningTrades})</span>
                  <span>Losses ({stats.losingTrades})</span>
                </div>
                <div className="w-full h-3 rounded-full bg-rose-100 overflow-hidden flex shadow-inner">
                  <div className="h-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]" style={{ width: `${stats.winRate}%` }}></div>
                </div>
              </div>
            </div>

            <div className="bg-slate-50 border border-slate-100 rounded-2xl p-6 space-y-4">
              <span className="block text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Statistical Ratios</span>
              <div className="grid grid-cols-2 gap-4 pt-1">
                <div>
                  <span className="block text-[9px] font-black text-slate-400 uppercase tracking-wide">Avg Profit</span>
                  <span className="text-sm font-black text-slate-800">+{stats.avgProfit.toFixed(2)}</span>
                </div>
                <div>
                  <span className="block text-[9px] font-black text-slate-400 uppercase tracking-wide">Avg Loss</span>
                  <span className="text-sm font-black text-slate-800">-{stats.avgLoss.toFixed(2)}</span>
                </div>
                <div>
                  <span className="block text-[9px] font-black text-slate-400 uppercase tracking-wide">Best Trade</span>
                  <span className="text-sm font-black text-emerald-600">+{stats.bestTrade.toFixed(2)}</span>
                </div>
                <div>
                  <span className="block text-[9px] font-black text-slate-400 uppercase tracking-wide">Worst Trade</span>
                  <span className="text-sm font-black text-rose-500">{stats.worstTrade.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>
          
          {stats.totalTrades === 0 && (
            <div className="py-12 flex flex-col items-center justify-center text-center opacity-60">
              <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 mb-4">
                <TrendingUp size={30} />
              </div>
              <p className="text-sm font-bold text-slate-500">No trading activity recorded in this period.</p>
              <p className="text-xs text-slate-400 mt-1">Execute your first trade to see analytics here.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
