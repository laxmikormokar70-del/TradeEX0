import React, { useState } from 'react';
import { useTradingContext, formatUSD, formatINR } from '../store/TradingContext';
import { useAuth } from '../store/AuthContext';
import { Search, Clock, AlertCircle, Trash2, ShieldAlert, Briefcase } from 'lucide-react';
import { motion } from 'motion/react';
import UnrealizedPNLPulse from '../components/UnrealizedPNLPulse';
import DeltaPositionPanel from '../components/DeltaPositionPanel';

export default function PortfolioPage({ setActiveTab }: { setActiveTab?: (tab: string) => void }) {
  const { user, profile } = useAuth();
  const { 
    accountBalance, 
    positions, 
    closePosition, 
    currentPrices,
    pendingOrders,
    orderHistory,
    positionHistory,
    cancelPendingOrder
  } = useTradingContext();

  const currencyPreference = profile?.currencyPreference || localStorage.getItem('currency_preference') || 'USDT';

  if (!user) {
    return (
      <div className="flex flex-col h-full bg-bg-base overflow-hidden items-center justify-center p-6 text-center">
        <div className="w-20 h-20 bg-orange-50 rounded-full flex items-center justify-center text-orange-500 mb-6 border border-orange-100 shadow-sm">
          <Briefcase size={32} strokeWidth={2.5} />
        </div>
        <h2 className="text-[22px] font-bold text-slate-800 mb-2 font-sans tracking-tight">Authentication Required</h2>
        <p className="text-[14px] text-slate-500 max-w-[300px] mb-8 leading-relaxed">
          Please Login or Create an Account to continue accessing your wallet information and portfolio.
        </p>
        <div className="flex items-center gap-4">
          <button 
            onClick={() => setActiveTab?.('login')}
            className="px-8 flex-1 h-[46px] bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl font-bold text-sm uppercase tracking-wider transition-colors border border-slate-200"
          >
            Login
          </button>
          <button 
            onClick={() => setActiveTab?.('signup')}
            className="px-8 flex-1 h-[46px] bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white rounded-xl font-bold text-sm uppercase tracking-wider transition-colors shadow-md shadow-orange-500/20"
          >
            Register
          </button>
        </div>
      </div>
    );
  }

  const formatPref = (usdVal: number, inrVal: number) => {
    return currencyPreference === 'INR' ? formatINR(inrVal) : formatUSD(usdVal);
  };

  const formatAlt = (usdVal: number, inrVal: number) => {
    return currencyPreference === 'INR' ? formatUSD(usdVal) : formatINR(inrVal);
  };

  const [subTab, setSubTab] = useState('positions');
  const [mobileSubTab, setMobileSubTab] = useState('positions');

  const totalPnl = positions.reduce((acc, pos) => {
    const price = currentPrices[pos.pair] || pos.entryPrice;
    const pnl = pos.side === 'long' 
      ? (price - pos.entryPrice) * pos.quantity 
      : (pos.entryPrice - price) * pos.quantity;
    return acc + pnl;
  }, 0);

  const totalMarginUsed = positions.reduce((acc, pos) => acc + pos.margin, 0);

  const renderAssetLogo = (pair: string) => {
    const cleanName = pair.replace('USDT', '');
    let colors = 'from-amber-500 to-orange-600 shadow-amber-500/10';
    if (pair.includes('ETH')) {
      colors = 'from-indigo-500 to-violet-600 shadow-indigo-500/10';
    } else if (pair.includes('SOL')) {
      colors = 'from-emerald-400 to-teal-600 shadow-emerald-500/10';
    } else if (pair.length > 7) {
      colors = 'from-fuchsia-500 to-pink-600 shadow-fuchsia-500/10';
    }
    return (
      <div className={`w-8 h-8 rounded-xl bg-gradient-to-br ${colors} flex items-center justify-center text-white text-xs font-semibold tracking-tight shrink-0 shadow-md`}>
        {cleanName.substring(0, 3)}
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full bg-bg-base overflow-hidden">
      
      {/* ========================================================================
          1. DESKTOP VIEWPORT LAYOUT (hidden on mobile & tablet)
          ======================================================================== */}
      <div className="hidden lg:flex flex-col h-full overflow-y-auto w-full">
        <div className="w-full max-w-[1600px] xl:w-[90%] mx-auto flex flex-col min-h-full bg-surface shadow-[0_0_20px_rgba(0,0,0,0.01)] relative">
          <div className="px-5 pt-6 pb-4 shrink-0">
            <h1 className="text-[26px] font-bold text-text-main tracking-tight font-sans mb-2">Portfolio</h1>
            
            {/* Balances summary - clean no PnL */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              {/* Account Wallet Balance */}
              <div className="bg-gradient-to-br from-brand to-brand-hover text-white rounded-[20px] p-5 shadow-sm relative overflow-hidden flex flex-col justify-between">
                <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl -mr-10 -mt-10"></div>
                <div>
                  <div className="text-[12px] text-white/85 uppercase font-black tracking-widest mb-1.5">Wallet Balance</div>
                  <div className="text-[26px] font-black font-sans tracking-tight mb-1">{formatPref(accountBalance.usd, accountBalance.inr)}</div>
                </div>
                <div className="text-[14px] font-mono opacity-80">{formatAlt(accountBalance.usd, accountBalance.inr)}</div>
              </div>

              {/* Margin & Wallet Balance */}
              <div className="bg-white border border-brand/20 rounded-[20px] p-5 shadow-sm flex flex-col justify-between">
                <div className="text-[12px] text-text-muted uppercase font-black tracking-widest mb-2">Margin details</div>
                <div className="space-y-2.5 py-1.5">
                  <div className="flex justify-between text-[13px] font-mono">
                    <span className="text-text-muted font-bold uppercase text-[10px]">Total Available Margin:</span>
                    <span className="font-black text-text-main text-sm">{formatPref(accountBalance.usd, accountBalance.inr)}</span>
                  </div>
                  <div className="flex justify-between text-[13px] font-mono border-t border-slate-50 pt-2">
                    <span className="text-text-muted font-bold uppercase text-[10px]">Used margin:</span>
                    <span className="font-black text-rose-500 text-sm">{formatPref(totalMarginUsed, totalMarginUsed * 83.5)}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex gap-6 border-b border-bg-sec">
              {['positions', 'orders', 'balances'].map((tab) => (
                <button
                  key={`desktop-${tab}`}
                  onClick={() => setSubTab(tab)}
                  className={`pb-3 text-[14px] font-medium capitalize transition-all relative ${
                    subTab === tab ? 'text-brand' : 'text-text-muted hover:text-text-main'
                  }`}
                >
                  {tab === 'positions' ? `Positions (${positions.length})` : tab}
                  {subTab === tab && (
                    <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand rounded-t-full shadow-[0_-2px_4px_rgba(255,138,0,0.5)]" />
                  )}
                </button>
              ))}
            </div>
          </div>

          <div className="flex-1 p-5 pb-24">
            {subTab === 'positions' && (
              <DeltaPositionPanel />
            )}

            {subTab === 'orders' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Pending Limit/Stop orders */}
                <div className="bg-surface rounded-[24px] border border-bg-sec p-5 flex flex-col">
                  <h3 className="text-[16px] font-bold text-text-main mb-4 flex items-center gap-2">
                    <Clock size={18} className="text-brand"/> Active Pending Orders
                  </h3>
                  {pendingOrders.length === 0 ? (
                    <div className="text-center py-10 text-text-muted text-[13px]">No pending orders.</div>
                  ) : (
                    <div className="space-y-3 max-h-[450px] overflow-y-auto pr-1">
                      {pendingOrders.map(o => (
                        <div key={`desk-pending-${o.id}`} className="bg-bg-sec/30 border border-brand-light/40 rounded-xl p-3 flex justify-between items-center text-sm">
                          <div>
                            <span className="font-mono font-bold text-text-main block">{o.pair}</span>
                            <span className="text-[11.5px] text-text-muted block">{o.type} • {o.side.toUpperCase()} @ {formatUSD(o.price)}</span>
                          </div>
                          <button
                            onClick={() => cancelPendingOrder(o.id)}
                            className="bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-100 text-xs font-bold px-3 py-1.5 rounded-lg transition-colors"
                          >
                            Cancel
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Historic orders */}
                <div className="bg-surface rounded-[24px] border border-bg-sec p-5 flex flex-col">
                  <h3 className="text-[16px] font-bold text-text-main mb-4 flex items-center gap-2">
                    <Clock size={18} className="text-brand"/> Past Order History
                  </h3>
                  {orderHistory.length === 0 ? (
                    <div className="text-center py-10 text-text-muted text-[13px]">No order history logged.</div>
                  ) : (
                    <div className="space-y-3 max-h-[450px] overflow-y-auto pr-1">
                      {orderHistory.map(h => (
                        <div key={`desk-history-${h.id}`} className="bg-bg-sec/10 border border-bg-sec rounded-xl p-3 flex justify-between items-center text-sm">
                          <div>
                            <span className="font-mono font-bold text-text-main block">{h.pair}</span>
                            <span className="text-[11.5px] text-text-muted block">{h.side.toUpperCase()} ({h.type}) • Lots: {h.quantity.toFixed(3)}</span>
                          </div>
                          <span className={`px-2 py-0.5 rounded-lg font-bold text-[10.5px] uppercase ${
                            h.status === 'Filled' ? 'bg-success/10 text-success' : 'bg-amber-100 text-amber-700'
                          }`}>
                            {h.status}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {subTab === 'balances' && (
               <div className="bg-surface rounded-[20px] p-5 shadow-sm border border-brand-light/30 max-w-xl">
                  <div className="space-y-4">
                    <div className="flex justify-between items-center text-[13px]">
                       <span className="text-text-muted">Total Available</span>
                       <span className="font-mono font-medium text-text-main">{formatUSD(accountBalance.usd)}</span>
                    </div>
                    <div className="flex justify-between items-center text-[13px]">
                       <span className="text-text-muted">Used Margin</span>
                       <span className="font-mono font-medium text-text-main">{formatUSD(
                         positions.reduce((acc, p) => acc + p.margin, 0)
                       )}</span>
                    </div>
                  </div>
               </div>
            )}
          </div>
        </div>
      </div>

      {/* ========================================================================
          2. MOBILE & TABLET VIEWPORT LAYOUT (hidden on desktop)
          ======================================================================== */}
      <div className="lg:hidden flex flex-col h-full overflow-y-auto pb-24 scrollbar-none w-full">
        <div className="px-5 pt-6 pb-4 shrink-0">
          <h1 className="text-[26px] font-bold text-text-main tracking-tight font-sans mb-2">Portfolio</h1>
          
          {/* Balances summary stack */}
          <div className="space-y-3 mb-5">
            {/* Account Balance Card */}
            <div className="bg-gradient-to-br from-brand to-brand-hover text-white rounded-[20px] p-5 shadow-sm relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl -mr-10 -mt-10"></div>
              <div className="text-[11px] text-white/85 uppercase font-black tracking-widest mb-1.5">Wallet Balance</div>
              <div className="text-[22px] font-black font-sans tracking-tight mb-0.5">{formatPref(accountBalance.usd, accountBalance.inr)}</div>
              <div className="text-[13px] font-mono opacity-85">{formatAlt(accountBalance.usd, accountBalance.inr)}</div>
            </div>

            {/* Sub stats row */}
            <div className="grid grid-cols-1 gap-3">
              <div className="bg-white border border-brand/20 rounded-[18px] p-4 shadow-xs">
                <div className="flex justify-between items-center text-[11px] font-mono font-bold text-text-muted uppercase mb-1.5">
                  <span>Available Margin:</span>
                  <span className="text-slate-700 font-extrabold">{formatPref(accountBalance.usd, accountBalance.inr)}</span>
                </div>
                <div className="flex justify-between items-center text-[11px] font-mono font-bold text-text-muted uppercase pt-1.5 border-t border-slate-100">
                  <span>Used Margin:</span>
                  <span className="text-rose-500 font-extrabold">{formatPref(totalMarginUsed, totalMarginUsed * 83.5)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Unified mobile horizontal subtab bar matching user request */}
          <div className="flex bg-slate-50 p-0.5 border border-slate-200/50 rounded-full shadow-xs overflow-x-auto no-scrollbar flex-nowrap gap-0.5">
            {[
              { id: 'positions', label: 'Positions', count: positions.length },
              { id: 'open-orders', label: 'Open', count: pendingOrders.filter(o => !o.type.includes('Stop')).length },
              { id: 'stop-orders', label: 'Stops', count: pendingOrders.filter(o => o.type.includes('Stop')).length },
              { id: 'order-history', label: 'Orders', count: orderHistory.length },
              { id: 'history', label: 'Closed', count: positionHistory.length },
              { id: 'balances', label: 'Balances' }
            ].map((tab) => (
              <button
                key={`portfolio-mobile-tab-${tab.id}`}
                onClick={() => setMobileSubTab(tab.id)}
                className={`relative px-3 py-1.5 rounded-full text-[11px] font-extrabold transition-all flex items-center justify-center whitespace-nowrap ${
                  mobileSubTab === tab.id
                    ? 'text-white bg-[#FF810A] shadow-xs'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                <span>{tab.label}</span>
                {tab.count !== undefined && (
                  <span className="opacity-90 ml-1 text-[10px] font-mono">({tab.count})</span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Tab content container for mobile & tablet */}
        <div className="flex-1 px-5">
          {mobileSubTab === 'positions' && (
            <DeltaPositionPanel />
          )}

          {mobileSubTab === 'open-orders' && (
            <div className="space-y-4 pb-12">
              {pendingOrders.filter(o => !o.type.includes('Stop')).length === 0 ? (
                <div className="flex flex-col items-center justify-center mt-8 text-center p-6 bg-surface rounded-[25px] border border-brand-light/30">
                  <div className="w-14 h-14 bg-bg-sec rounded-full flex items-center justify-center text-brand/75 mb-3">
                    <Clock size={22} />
                  </div>
                  <h3 className="text-[15px] font-bold text-text-main mb-1">No open limit orders</h3>
                  <p className="text-[12px] text-text-muted max-w-[200px]">Any basic buy/limit triggers will be listed list logs.</p>
                </div>
              ) : (
                pendingOrders.filter(o => !o.type.includes('Stop')).map(o => (
                  <div 
                    key={`portfolio-mob-open-ord-${o.id}`}
                    className="bg-surface rounded-[20px] p-5 shadow-sm border border-brand-light/30"
                  >
                    <div className="flex justify-between items-center mb-4 pb-4 border-b border-bg-sec">
                      <div className="flex items-center gap-2">
                        {renderAssetLogo(o.pair)}
                        <div>
                          <span className="font-semibold text-[15px] font-mono block leading-none">{o.pair}</span>
                          <span className="text-[11px] text-text-muted font-bold block mt-1">{o.type} Limit Order</span>
                        </div>
                      </div>
                      <button
                        onClick={() => cancelPendingOrder(o.id)}
                        className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-xl text-[12px] font-extrabold transition-all border border-rose-100 cursor-pointer shadow-xs active:scale-95"
                      >
                        Cancel
                      </button>
                    </div>

                    <div className="grid grid-cols-2 gap-3.5">
                      <div>
                        <span className="text-[11px] text-text-muted mb-0.5 block">Side</span>
                        <span className={`text-[13px] font-bold uppercase ${o.side === 'long' ? 'text-green-600' : 'text-rose-600'}`}>
                          {o.side === 'long' ? 'BUY LONG' : 'SELL SHORT'}
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="text-[11px] text-text-muted mb-0.5 block">Limit Price</span>
                        <span className="font-mono font-bold text-text-main text-[13px]">{formatUSD(o.price)}</span>
                      </div>
                      <div>
                        <span className="text-[11px] text-text-muted mb-0.5 block">Size</span>
                        <span className="font-mono font-bold text-text-main text-[13px]">{o.quantity.toFixed(4)} Lots</span>
                      </div>
                      <div className="text-right">
                        <span className="text-[11px] text-text-muted mb-0.5 block">Total Value</span>
                        <span className="font-mono font-bold text-slate-800 text-[13px]">{formatUSD(o.price * o.quantity)}</span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {mobileSubTab === 'stop-orders' && (
            <div className="space-y-4 pb-12">
              {pendingOrders.filter(o => o.type.includes('Stop')).length === 0 ? (
                <div className="flex flex-col items-center justify-center mt-8 text-center p-6 bg-surface rounded-[24px] border border-brand-light/30">
                  <div className="w-14 h-14 bg-bg-sec rounded-full flex items-center justify-center text-orange-500 mb-3 leading-none">
                    <ShieldAlert size={22} />
                  </div>
                  <h3 className="text-[15px] font-bold text-text-main mb-1">No stop triggers</h3>
                  <p className="text-[12px] text-text-muted max-w-[180px]">Any conditional Stop Loss/Take Profit logs.</p>
                </div>
              ) : (
                pendingOrders.filter(o => o.type.includes('Stop')).map(o => (
                  <div 
                    key={`portfolio-mob-stop-ord-${o.id}`}
                    className="bg-surface rounded-[20px] p-5 shadow-sm border border-brand-light/30"
                  >
                    <div className="flex justify-between items-center mb-4 pb-4 border-b border-bg-sec">
                      <div className="flex items-center gap-2">
                        {renderAssetLogo(o.pair)}
                        <div>
                          <span className="font-semibold text-[15px] font-mono block leading-none">{o.pair}</span>
                          <span className="text-[11px] text-orange-600 font-bold block mt-1">{o.type}</span>
                        </div>
                      </div>
                      <button
                        onClick={() => cancelPendingOrder(o.id)}
                        className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-xl text-[12px] font-extrabold transition-all border border-rose-100 cursor-pointer shadow-xs active:scale-95"
                      >
                        Cancel
                      </button>
                    </div>

                    <div className="grid grid-cols-2 gap-3.5">
                      <div>
                        <span className="text-[11px] text-text-muted mb-0.5 block">Side</span>
                        <span className={`text-[13px] font-bold uppercase ${o.side === 'long' ? 'text-green-600' : 'text-rose-600'}`}>
                          {o.side === 'long' ? 'BUY LONG' : 'SELL SHORT'}
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="text-[11px] text-text-muted mb-0.5 block">Trigger Price</span>
                        <span className="font-mono font-bold text-orange-600 text-[13px]">≤ {formatUSD(o.price)}</span>
                      </div>
                      <div>
                        <span className="text-[11px] text-text-muted mb-0.5 block">Lots Size</span>
                        <span className="font-mono font-semibold text-text-main text-[13px]">{o.quantity.toFixed(4)} Lots</span>
                      </div>
                      <div className="text-right">
                        <span className="text-[11px] text-text-muted mb-0.5 block">Status</span>
                        <span className="text-orange-500 font-extrabold text-[12.5px] uppercase">Awaiting Trigger</span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {mobileSubTab === 'order-history' && (
            <div className="space-y-4 pb-12">
              {orderHistory.length === 0 ? (
                <div className="flex flex-col items-center justify-center mt-8 text-center p-6 bg-surface rounded-[20px] border border-brand-light/30">
                  <div className="w-14 h-14 bg-bg-sec rounded-full flex items-center justify-center text-brand/70 mb-3">
                    <Clock size={22} />
                  </div>
                  <h3 className="text-[15px] font-bold text-text-main mb-1">No order logs</h3>
                  <p className="text-[12px] text-text-muted max-w-[200px]">Historical limit & market requests empty.</p>
                </div>
              ) : (
                orderHistory.map(o => (
                  <div 
                    key={`portfolio-mob-ord-hist-${o.id}`}
                    className="bg-surface rounded-[20px] p-5 shadow-sm border border-brand-light/30"
                  >
                    <div className="flex justify-between items-center mb-3 pb-3 border-b border-bg-sec">
                      <div className="flex items-center gap-2">
                        {renderAssetLogo(o.pair)}
                        <div>
                          <span className="font-semibold text-[15px] font-mono block leading-none">{o.pair}</span>
                          <span className="text-[11px] text-text-muted font-bold block mt-1">{o.side.toUpperCase()} ({o.type})</span>
                        </div>
                      </div>
                      <span className={`px-2.5 py-0.5 rounded-lg text-[11.5px] font-extrabold uppercase ${
                        o.status === 'Filled' 
                          ? 'bg-success/15 text-success' 
                          : o.status === 'Cancelled' 
                          ? 'bg-amber-500/15 text-amber-600' 
                          : 'bg-danger/15 text-danger'
                      }`}>
                        {o.status}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-3.5 text-xs">
                      <div>
                        <span className="text-text-muted block text-[10px] mb-0.5">Rate Limit:</span>
                        <span className="font-mono font-bold text-text-main text-[13px]">{formatUSD(o.price)}</span>
                      </div>
                      <div className="text-right">
                        <span className="text-text-muted block text-[10px] mb-0.5">Quantity:</span>
                        <span className="font-mono font-bold text-text-main text-[13px]">{o.quantity.toFixed(4)} Lots</span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {mobileSubTab === 'history' && (
            <div className="space-y-4 pb-12">
              {positionHistory.length === 0 ? (
                <div className="flex flex-col items-center justify-center mt-8 text-center p-6 bg-surface rounded-[20px] border border-brand-light/30">
                  <div className="w-14 h-14 bg-bg-sec rounded-full flex items-center justify-center text-brand/70 mb-3">
                    <Clock size={22} />
                  </div>
                  <h3 className="text-[15px] font-bold text-text-main mb-1">No closed settlements</h3>
                  <p className="text-[12px] text-text-muted max-w-[200px]">Any closed historical log indexes empty.</p>
                </div>
              ) : (
                positionHistory.map(h => {
                  const isProfit = h.pnl >= 0;
                  return (
                    <div 
                      key={`portfolio-mob-hist-${h.id}`}
                      className="bg-surface border border-brand/20 shadow-sm rounded-[24px] p-5 transition-all"
                    >
                      <div className="flex justify-between items-center mb-3 pb-3 border-b border-bg-sec">
                        <div className="flex items-center gap-2">
                          {renderAssetLogo(h.pair)}
                          <div>
                            <span className="font-semibold text-[15px] font-mono block leading-none">{h.pair}</span>
                            <span className="text-[11px] text-text-muted font-bold block mt-1">Closed Settle</span>
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-1 leading-none">
                          <span className={`px-2 py-0.5 rounded-md text-[11px] font-bold uppercase ${
                            h.side === 'long' ? 'bg-success/15 text-success' : 'bg-danger/15 text-danger'
                          }`}>
                            {h.side}
                          </span>
                          <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-md uppercase mt-1 ${
                            h.status === 'TP Hit' ? 'bg-success/15 text-success' : h.status === 'SL Hit' ? 'bg-danger/15 text-danger' : 'bg-brand/15 text-brand'
                          }`}>
                            {h.status}
                          </span>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3.5 mb-2">
                        <div>
                          <span className="text-[10px] text-text-muted block">Entry Price:</span>
                          <span className="font-mono text-text-main font-semibold text-[13px]">{formatUSD(h.entryPrice)}</span>
                        </div>
                        <div className="text-right">
                          <span className="text-[10px] text-text-muted block">Exit Price:</span>
                          <span className="font-mono text-text-main font-semibold text-[13px]">{formatUSD(h.exitPrice)}</span>
                        </div>
                        <div>
                          <span className="text-[10px] text-text-muted block">Lot Size:</span>
                          <span className="font-mono text-text-main font-semibold text-[13px]">{h.quantity} Lots</span>
                        </div>
                        <div className="text-right">
                          <span className="text-[10px] text-text-muted block">Gain/Loss:</span>
                          <span className={`font-mono font-extrabold text-[13px] ${isProfit ? 'text-success' : 'text-danger'}`}>
                            {isProfit ? '+' : ''}{formatUSD(h.pnl)}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}

          {mobileSubTab === 'balances' && (
             <div className="bg-surface rounded-[24px] p-6 shadow-sm border border-brand-light/30 pb-12">
                <div className="space-y-4">
                  <div className="flex justify-between items-center text-[13px] border-b border-bg-sec pb-3">
                     <span className="text-text-muted font-bold">Total Available Base</span>
                     <span className="font-mono font-extrabold text-text-main text-[14px]">{formatUSD(accountBalance.usd)}</span>
                  </div>
                  <div className="flex justify-between items-center text-[13px]">
                     <span className="text-text-muted font-bold">Used Contract Margin</span>
                     <span className="font-mono font-extrabold text-rose-500 text-[14px]">{formatUSD(
                       positions.reduce((acc, p) => acc + p.margin, 0)
                     )}</span>
                  </div>
                </div>
             </div>
          )}
        </div>
      </div>

    </div>
  );
}
