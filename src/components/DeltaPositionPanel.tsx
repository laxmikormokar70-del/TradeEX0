import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { ShieldCheck, X, Compass, CheckCircle, Target } from "lucide-react";
import { useTradingContext, formatUSD, formatINR } from "../store/TradingContext";
import { useAuth } from "../store/AuthContext";
import { Position } from "../types";

export default function DeltaPositionPanel() {
  const { positions, currentPrices, closePosition, closePositionPartial, updatePositionTpSl } =
    useTradingContext();
  const { profile } = useAuth();
  const currencyPref = profile?.currencyPreference || localStorage.getItem('currency_preference') || 'USDT';
  const [editingPosition, setEditingPosition] = useState<Position | null>(null);
  const [tpPriceInput, setTpPriceInput] = useState("");
  const [slPriceInput, setSlPriceInput] = useState("");

  // 1. Calculations for upper summary deck
  const totalPnl = positions.reduce((acc, pos) => {
    const price = currentPrices[pos.pair] || pos.entryPrice;
    const pnl =
      pos.side === "long"
        ? (price - pos.entryPrice) * pos.quantity
        : (pos.entryPrice - price) * pos.quantity;
    return acc + pnl;
  }, 0);

  const totalMargin = positions.reduce((acc, pos) => acc + pos.margin, 0);
  const totalPnlPercent = totalMargin > 0 ? (totalPnl / totalMargin) * 100 : 0;

  const handleCloseAll = () => {
    positions.forEach((pos) => {
      closePosition(pos.id);
    });
  };

  const handleOpenTpSl = (pos: Position) => {
    setEditingPosition(pos);
    setTpPriceInput(pos.tp ? pos.tp.toString() : "");
    setSlPriceInput(pos.sl ? pos.sl.toString() : "");
  };

  return (
    <div className="w-full bg-gradient-to-br from-[#FFF9F4] via-[#FFFFFF] to-[#FFFBF8] rounded-[16px] border border-orange-200/80 text-slate-800 p-4 font-sans shadow-[0_4px_24px_rgba(255,140,66,0.03)] overflow-hidden flex flex-col gap-4">
      {/* 2. Position Summary Area (Total PnL, PnL %, Risk badge, and Close All) */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-gradient-to-r from-orange-500/10 to-orange-500/0 p-4 rounded-[12px] border border-orange-100">
        <div className="flex flex-wrap items-center gap-x-8 gap-y-2">
          {/* Total PnL & % */}
          <div>
            <div className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-1 leading-none">
              UPNL
            </div>
            <div className="flex flex-col gap-1">
              <div className="flex items-baseline gap-2 flex-wrap">
                {currencyPref === 'INR' ? (
                  <>
                    <span className={`text-[17px] font-bold font-mono tracking-tight leading-none ${totalPnl >= 0 ? "text-green-600" : "text-red-500"}`}>
                      {totalPnl >= 0 ? "+" : ""}{formatINR(totalPnl * 85)}
                    </span>
                    <span className={`text-[12px] font-bold font-mono opacity-80 ${totalPnl >= 0 ? "text-green-600" : "text-red-500"}`}>
                      {totalPnl >= 0 ? "+" : ""}{formatUSD(totalPnl)}
                    </span>
                  </>
                ) : (
                  <>
                    <span className={`text-[17px] font-bold font-mono tracking-tight leading-none ${totalPnl >= 0 ? "text-green-600" : "text-red-500"}`}>
                      {totalPnl >= 0 ? "+" : ""}{formatUSD(totalPnl)}
                    </span>
                    <span className={`text-[12px] font-bold font-mono opacity-80 ${totalPnl >= 0 ? "text-green-600" : "text-red-500"}`}>
                      {totalPnl >= 0 ? "+" : ""}{formatINR(totalPnl * 85)}
                    </span>
                  </>
                )}
              </div>
              <span
                className={`text-[11px] font-bold font-mono ${totalPnl >= 0 ? "text-green-600" : "text-red-500"}`}
              >
                ({totalPnlPercent >= 0 ? "+" : ""}
                {totalPnlPercent.toFixed(2)}%)
              </span>
            </div>
          </div>

          {/* Standard Risk Indicator */}
          <div className="flex flex-col">
            <div className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-[5px] leading-none">
              Risk Status
            </div>
            <div className="flex items-center gap-1.5 px-2 py-0.5 bg-green-50 text-green-700 rounded border border-green-200 text-[9px] font-bold tracking-wide uppercase self-start">
              <ShieldCheck size={10} strokeWidth={2.5} />
              <span>Safe</span>
            </div>
          </div>
        </div>

        {/* Close All Button */}
        <button
          onClick={handleCloseAll}
          disabled={positions.length === 0}
          className="h-[32px] px-3 bg-red-50 hover:bg-red-100 text-red-600 disabled:opacity-50 disabled:bg-slate-100 disabled:text-slate-400 border border-red-200 rounded-md flex items-center justify-center gap-1.5 text-[11px] font-bold uppercase tracking-wider transition-all shadow-xs cursor-pointer active:scale-95 shrink-0 self-stretch md:self-auto"
        >
          <X size={14} strokeWidth={2.5} />
          Close All Positions
        </button>
      </div>

      {/* 3. Positions List & Cards Redesign */}
      <div className="flex flex-col gap-0 border border-orange-100 rounded-xl overflow-hidden bg-white shadow-sm">
        {/* Desktop Table Header */}
        {positions.length > 0 && (
          <div className="hidden md:grid grid-cols-12 gap-3 px-4 py-3 bg-orange-50/50 border-b border-orange-100 text-[11px] font-black text-slate-500 uppercase tracking-widest w-full">
            <div className="col-span-2">Symbol / Side</div>
            <div className="col-span-1">Size</div>
            <div className="col-span-1">Entry Price</div>
            <div className="col-span-1">Mark Price</div>
            <div className="col-span-2">Liq. Price</div>
            <div className="col-span-1">Margin</div>
            <div className="col-span-1">PNL</div>
            <div className="col-span-1">TP / SL</div>
            <div className="col-span-2 text-right">Action</div>
          </div>
        )}

        <AnimatePresence>
          {positions.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-16 bg-white"
            >
              <div className="w-12 h-12 rounded-full bg-orange-50 border border-orange-100 flex items-center justify-center mx-auto mb-4">
                <Compass size={22} className="text-[#ff8c2a]" />
              </div>
              <h3 className="text-slate-800 font-bold text-[16px] tracking-tight">
                No Open Positions
              </h3>
              <p className="text-slate-400 text-[13px] font-medium mt-2 max-w-[280px] mx-auto">
                Open a new position to track your live trades and P&L here.
              </p>
            </motion.div>
          ) : (
            positions.map((pos) => {
              const leverageVal = Number(pos.leverage) || 50;
              const entryPriceVal = Number(pos.entryPrice) || 0;
              const quantityVal = Number(pos.quantity) || 0;
              const marginVal = Number(pos.margin) || 1;

              const cPrice = currentPrices[pos.pair] || entryPriceVal;
              const pnl =
                pos.side === "long"
                  ? (cPrice - entryPriceVal) * quantityVal
                  : (entryPriceVal - cPrice) * quantityVal;

              const pnlPercent = (pnl / marginVal) * 100;
              const isProfit = pnl >= 0;

              // Liquidation Price calculation: 
              // For Long: Entry * (1 - 1/Leverage + 0.005)
              // For Short: Entry * (1 + 1/Leverage - 0.005)
              // This is a common futures approximation (90% maintenance margin)
              const liquidationPrice =
                pos.side === "long"
                  ? entryPriceVal * (1 - 0.9 / leverageVal)
                  : entryPriceVal * (1 + 0.9 / leverageVal);

              return (
                <motion.div
                  key={`pos-row-${pos.id}`}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="bg-white border-b border-slate-100 hover:bg-slate-50/50 transition-all overflow-hidden flex flex-col w-full"
                >
                  {/* --- DESKTOP VIEW --- */}
                  <div className="hidden md:grid grid-cols-12 items-center gap-2 px-4 py-4 w-full">
                    {/* Symbol & Side */}
                    <div className="col-span-2 flex flex-col gap-1">
                      <span className="text-[14px] font-bold text-slate-900 font-mono">
                        {pos.pair}
                      </span>
                      <div className="flex items-center gap-1.5">
                        <span className={`text-[10px] font-black uppercase px-1.5 py-0.5 rounded ${pos.side === 'long' ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>
                          {pos.side.toUpperCase()}
                        </span>
                        <span className="text-[10px] font-bold text-slate-400 bg-slate-50 px-1 py-0.5 rounded">
                          {pos.leverage}X
                        </span>
                      </div>
                    </div>

                    {/* Size */}
                    <div className="col-span-1">
                      <span className="font-mono font-bold text-[13px] text-slate-700">
                        {pos.quantity.toFixed(4)} Lot
                      </span>
                    </div>

                    {/* Entry Price */}
                    <div className="col-span-1">
                      <span className="font-mono font-bold text-[13px] text-slate-700 whitespace-nowrap">
                        {formatUSD(pos.entryPrice)}
                      </span>
                    </div>

                    {/* Mark Price */}
                    <div className="col-span-1">
                      <span className="font-mono font-bold text-[13px] text-[#ff8c2a] whitespace-nowrap">
                        {formatUSD(cPrice)}
                      </span>
                    </div>

                    {/* Liquidation Price */}
                    <div className="col-span-2">
                       <div className="bg-red-50 border border-red-100 rounded px-2 py-1 inline-flex flex-col items-start min-w-[100px]">
                         <span className="text-[9px] font-black uppercase text-red-400 leading-none mb-1">Liquidation</span>
                         <span className="font-mono font-black text-[12px] text-red-600 leading-none whitespace-nowrap">
                           {formatUSD(liquidationPrice)}
                         </span>
                       </div>
                    </div>

                    {/* Margin */}
                    <div className="col-span-1">
                      <span className="font-mono font-bold text-[13px] text-slate-700 whitespace-nowrap">
                        {formatUSD(pos.margin)}
                      </span>
                    </div>

                    {/* PNL */}
                    <div className="col-span-1 flex flex-col items-start">
                      <div className="flex flex-col items-start">
                        {currencyPref === 'INR' ? (
                          <>
                            <span className={`text-[13px] font-black font-mono leading-none whitespace-nowrap ${isProfit ? "text-emerald-600" : "text-red-500"}`}>
                              {isProfit ? "+" : ""}{formatINR(pnl * 85)}
                            </span>
                            <span className={`text-[10px] font-bold font-mono opacity-80 whitespace-nowrap mt-0.5 ${isProfit ? "text-emerald-600" : "text-red-500"}`}>
                              {isProfit ? "+" : ""}{formatUSD(pnl)}
                            </span>
                          </>
                        ) : (
                          <>
                            <span className={`text-[13px] font-black font-mono leading-none whitespace-nowrap ${isProfit ? "text-emerald-600" : "text-red-500"}`}>
                              {isProfit ? "+" : ""}{formatUSD(pnl)}
                            </span>
                            <span className={`text-[10px] font-bold font-mono opacity-80 whitespace-nowrap mt-0.5 ${isProfit ? "text-emerald-600" : "text-red-500"}`}>
                              {isProfit ? "+" : ""}{formatINR(pnl * 85)}
                            </span>
                          </>
                        )}
                      </div>
                      <span className={`text-[10px] font-bold font-mono mt-1 whitespace-nowrap ${isProfit ? "text-emerald-500" : "text-red-400"}`}>
                        ({isProfit ? "+" : ""}{pnlPercent.toFixed(2)}%)
                      </span>
                    </div>

                    {/* TP/SL */}
                    <div className="col-span-1 flex flex-col gap-0.5">
                       <span className={`text-[10px] font-mono whitespace-nowrap ${pos.tp ? 'text-emerald-600 font-bold' : 'text-slate-350 font-medium'}`}>
                         TP: {pos.tp ? formatUSD(pos.tp) : '--'}
                       </span>
                       <span className={`text-[10px] font-mono whitespace-nowrap ${pos.sl ? 'text-red-500 font-bold' : 'text-slate-350 font-medium'}`}>
                         SL: {pos.sl ? formatUSD(pos.sl) : '--'}
                       </span>
                    </div>

                    {/* Actions */}
                    <div className="col-span-2 flex justify-end gap-2">
                      <button 
                        onClick={() => handleOpenTpSl(pos)}
                        className="p-1.5 text-slate-400 hover:text-[#ff8c2a] hover:bg-orange-50 rounded transition-all"
                        title="Edit TP/SL"
                      >
                        <Target size={16} />
                      </button>
                      <button 
                         onClick={() => closePosition(pos.id)}
                         className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white text-[11px] font-bold uppercase tracking-wide rounded-lg shadow-sm transition-all duration-200 active:scale-95"
                      >
                         Close
                      </button>
                    </div>
                  </div>

                  {/* --- MOBILE VIEW --- */}
                  <div className="flex flex-col md:hidden p-4 gap-3 bg-white border-b border-slate-100">
                     <div className="flex justify-between items-center">
                        <div className="flex items-center gap-2">
                           <span className="text-[15px] font-black font-mono">{pos.pair}</span>
                           <span className={`text-[10px] font-black px-1.5 py-0.5 rounded ${pos.side === 'long' ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>
                             {pos.side.toUpperCase()} {pos.leverage}X
                           </span>
                        </div>
                        <div className="flex flex-col items-end">
                           <div className="flex flex-col items-end">
                             {currencyPref === 'INR' ? (
                               <>
                                 <span className={`text-[14px] font-black font-mono ${isProfit ? 'text-emerald-600' : 'text-red-500'} leading-none`}>
                                   {isProfit ? '+' : ''}{formatINR(pnl * 85)}
                                 </span>
                                 <span className={`text-[10px] font-bold font-mono opacity-80 ${isProfit ? 'text-emerald-600' : 'text-red-500'} mt-0.5`}>
                                   {isProfit ? '+' : ''}{formatUSD(pnl)}
                                 </span>
                               </>
                             ) : (
                               <>
                                 <span className={`text-[14px] font-black font-mono ${isProfit ? 'text-emerald-600' : 'text-red-500'} leading-none`}>
                                   {isProfit ? '+' : ''}{formatUSD(pnl)}
                                 </span>
                                 <span className={`text-[10px] font-bold font-mono opacity-80 ${isProfit ? 'text-emerald-600' : 'text-red-500'} mt-0.5`}>
                                   {isProfit ? '+' : ''}{formatINR(pnl * 85)}
                                 </span>
                               </>
                             )}
                           </div>
                           <span className={`text-[10px] font-bold font-mono ${isProfit ? 'text-emerald-500' : 'text-red-400'} mt-0.5`}>
                             ({isProfit ? '+' : ''}{pnlPercent.toFixed(1)}%)
                           </span>
                        </div>
                     </div>

                     <div className="grid grid-cols-2 gap-4 bg-slate-50/50 rounded-xl p-3 border border-slate-100">
                        <div className="flex flex-col">
                           <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Entry Price</span>
                           <span className="text-[14px] font-bold font-mono">{formatUSD(pos.entryPrice)}</span>
                        </div>
                        <div className="flex flex-col">
                           <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Mark Price</span>
                           <span className="text-[14px] font-bold font-mono text-[#ff8c2a]">{formatUSD(cPrice)}</span>
                        </div>
                        <div className="flex flex-col">
                           <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Size</span>
                           <span className="text-[14px] font-bold font-mono">{pos.quantity.toFixed(4)} Lot</span>
                        </div>
                        <div className="flex flex-col">
                           <span className="text-[10px] font-bold text-red-400 uppercase tracking-widest mb-1">Liquidation</span>
                           <span className="text-[14px] font-bold font-mono text-red-600">{formatUSD(liquidationPrice)}</span>
                        </div>
                        <div className="flex flex-col col-span-2">
                           <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Take Profit / Stop Loss</span>
                           <div className="flex gap-4">
                             <span className="text-[14px] font-bold font-mono text-emerald-600">TP: {pos.tp ? formatUSD(pos.tp) : '--'}</span>
                             <span className="text-[14px] font-bold font-mono text-red-500">SL: {pos.sl ? formatUSD(pos.sl) : '--'}</span>
                           </div>
                        </div>
                     </div>

                     <div className="flex gap-2">
                        <button 
                          onClick={() => handleOpenTpSl(pos)}
                          className="flex-1 py-2.5 bg-slate-100 text-slate-700 text-[12px] font-bold rounded-lg"
                        >
                          TP/SL
                        </button>
                        <button 
                          onClick={() => closePosition(pos.id)}
                          className="flex-[2] py-3 bg-orange-600 hover:bg-orange-700 text-white text-[13px] font-bold uppercase tracking-wide rounded-lg shadow-sm transition-all duration-200 active:scale-95"
                        >
                          Close Position
                        </button>
                     </div>
                  </div>
                </motion.div>
              );
            })
          )}
        </AnimatePresence>
      </div>

      {/* TP/SL Modal inside DeltaPositionPanel (Req 11: TP/SL Functionality Fix) */}
      <AnimatePresence>
        {editingPosition && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-[200] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="w-full max-w-[390px] bg-white rounded-2xl border border-orange-150 shadow-2xl overflow-hidden flex flex-col text-slate-800 font-sans"
            >
              {/* Header */}
              <div className="flex items-center justify-between p-4 border-b border-orange-100 bg-[#FFFBF8] relative">
                <div className="flex items-center gap-2">
                  <span className="font-extrabold text-[14px] uppercase tracking-wider text-[#FF850A]">
                    TP/SL POSITION CONFIG
                  </span>
                  <span className="text-[10.5px] bg-orange-100 text-[#FF850A] font-extrabold px-1.5 py-0.5 rounded uppercase">
                    {editingPosition.pair.replace("USDT", "")}
                  </span>
                </div>
                <button
                  onClick={() => setEditingPosition(null)}
                  className="p-1 text-slate-400 hover:text-[#FF850A] rounded-lg transition-colors absolute right-4"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="p-5 flex flex-col gap-4 text-sm font-semibold text-slate-600">
                {/* Entry Price & Trigger Mark Price */}
                <div className="flex justify-between items-center py-1.5 border-b border-dashed border-orange-100">
                  <span className="text-[13px] text-slate-500 font-bold">
                    Entry Price
                  </span>
                  <span className="font-mono text-[14px] text-slate-900 font-extrabold">
                    {formatUSD(editingPosition.entryPrice)}
                  </span>
                </div>
                <div className="flex justify-between items-center py-1.5 border-b border-dashed border-orange-100">
                  <span className="text-[13px] text-slate-500 font-bold">
                    Current Mark Price
                  </span>
                  <span className="font-mono text-[14px] text-slate-900 font-extrabold">
                    {formatUSD(
                      currentPrices[editingPosition.pair] ||
                        editingPosition.entryPrice,
                    )}
                  </span>
                </div>

                {/* TP Section */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-[13px] text-slate-700 font-extrabold">
                    Trigger Price (Take Profit)
                  </label>
                  <div className="flex items-center gap-2 px-3.5 py-2 whitespace-nowrap bg-[#FFFBF8] border border-orange-100 rounded-xl">
                    <span className="text-[11px] font-black text-[#FF850A] uppercase tracking-wide mr-1.5">
                      TP:
                    </span>
                    <input
                      type="number"
                      step="0.01"
                      placeholder="Not Set"
                      value={tpPriceInput}
                      onChange={(e) => setTpPriceInput(e.target.value)}
                      className="w-full bg-transparent outline-none font-bold font-mono text-slate-900"
                    />
                    {tpPriceInput && (
                      <button
                        onClick={() => setTpPriceInput("")}
                        className="text-[11px] text-slate-400 font-extrabold uppercase hover:text-red-500"
                      >
                        Clear
                      </button>
                    )}
                  </div>
                  {/* Presets */}
                  <div className="grid grid-cols-4 gap-1.5">
                    {[10, 25, 50, 100].map((pct) => (
                      <button
                        key={`tp-pct-${pct}`}
                        onClick={() => {
                          const change =
                            (editingPosition.entryPrice * (pct / 100)) /
                            editingPosition.leverage;
                          const val =
                            editingPosition.side === "long"
                              ? editingPosition.entryPrice + change
                              : editingPosition.entryPrice - change;
                          setTpPriceInput(val.toFixed(2));
                        }}
                        className="py-1 px-2 text-[11px] font-extrabold text-[#FF850A] bg-orange-50 hover:bg-orange-100/70 border border-orange-200/50 rounded-lg transition-all"
                      >
                        +{pct}%
                      </button>
                    ))}
                  </div>
                </div>

                {/* SL Section */}
                <div className="flex flex-col gap-1.5 mt-1.5">
                  <label className="text-[13px] text-slate-700 font-extrabold">
                    Trigger Price (Stop Loss)
                  </label>
                  <div className="flex items-center gap-2 px-3.5 py-2 bg-[#FFFBF8] border border-orange-100 rounded-xl">
                    <span className="text-[11px] font-black text-red-500 uppercase tracking-wide mr-1.5">
                      SL:
                    </span>
                    <input
                      type="number"
                      step="0.01"
                      placeholder="Not Set"
                      value={slPriceInput}
                      onChange={(e) => setSlPriceInput(e.target.value)}
                      className="w-full bg-transparent outline-none font-bold font-mono text-slate-900"
                    />
                    {slPriceInput && (
                      <button
                        onClick={() => setSlPriceInput("")}
                        className="text-[11px] text-slate-400 font-extrabold uppercase hover:text-red-500"
                      >
                        Clear
                      </button>
                    )}
                  </div>
                  {/* Presets */}
                  <div className="grid grid-cols-4 gap-1.5">
                    {[10, 25, 50, 75].map((pct) => (
                      <button
                        key={`sl-pct-${pct}`}
                        onClick={() => {
                          const change =
                            (editingPosition.entryPrice * (pct / 100)) /
                            editingPosition.leverage;
                          const val =
                            editingPosition.side === "long"
                              ? editingPosition.entryPrice - change
                              : editingPosition.entryPrice + change;
                          setSlPriceInput(val.toFixed(2));
                        }}
                        className="py-1 px-2 text-[11px] font-extrabold text-red-500 bg-red-50 hover:bg-red-100/70 border border-red-200/50 rounded-lg transition-all"
                      >
                        -{pct}%
                      </button>
                    ))}
                  </div>
                </div>

                {/* Expected metrics calculations display */}
                <div className="bg-[#FFFBF8] rounded-xl p-3 border border-orange-100 space-y-2 mt-2">
                  <div className="flex justify-between text-[12px] font-bold">
                    <span className="text-slate-500">Expected Profit:</span>
                    <span
                      className={`font-mono ${parseFloat(tpPriceInput) > 0 ? "text-green-600" : "text-slate-400"}`}
                    >
                      {(() => {
                        const val = parseFloat(tpPriceInput);
                        if (!val) return "--";
                        const diff = val - editingPosition.entryPrice;
                        const tpPnl =
                          editingPosition.side === "long"
                            ? diff * editingPosition.quantity
                            : -diff * editingPosition.quantity;
                        const tpPnlPct = (tpPnl / editingPosition.margin) * 100;
                        return `${tpPnl >= 0 ? "+" : ""}${formatUSD(tpPnl)} (${tpPnlPct >= 0 ? "+" : ""}${tpPnlPct.toFixed(1)}%)`;
                      })()}
                    </span>
                  </div>
                  <div className="flex justify-between text-[12px] font-bold">
                    <span className="text-slate-500">Expected Loss:</span>
                    <span
                      className={`font-mono ${parseFloat(slPriceInput) > 0 ? "text-red-500" : "text-slate-400"}`}
                    >
                      {(() => {
                        const val = parseFloat(slPriceInput);
                        if (!val) return "--";
                        const diff = val - editingPosition.entryPrice;
                        const slPnl =
                          editingPosition.side === "long"
                            ? diff * editingPosition.quantity
                            : -diff * editingPosition.quantity;
                        const slPnlPct = (slPnl / editingPosition.margin) * 100;
                        return `${formatUSD(slPnl)} (${slPnlPct.toFixed(1)}%)`;
                      })()}
                    </span>
                  </div>
                </div>
              </div>

              <div className="p-4 bg-[#FFFBF8] border-t border-orange-100 flex gap-3">
                <button
                  onClick={() => setEditingPosition(null)}
                  className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 border border-slate-200 hover:border-slate-300 text-slate-700 text-[13px] font-bold rounded-xl transition-all active:scale-[0.98]"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    const tp = tpPriceInput
                      ? parseFloat(tpPriceInput)
                      : undefined;
                    const sl = slPriceInput
                      ? parseFloat(slPriceInput)
                      : undefined;
                    updatePositionTpSl(editingPosition.id, tp, sl);
                    setEditingPosition(null);
                  }}
                  className="flex-1 py-3 bg-gradient-to-r from-[#FF9F43] to-[#FF850A] hover:opacity-90 text-white text-[13px] font-bold rounded-xl transition-all active:scale-[0.98] shadow-md shadow-orange-500/10"
                >
                  Update TP/SL
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

function MetricItem({
  label,
  value,
  valueColor = "text-slate-800",
}: {
  label: string;
  value: string;
  valueColor?: string;
}) {
  return (
    <div className="flex flex-col">
      <span className="text-[10.5px] text-slate-500 font-bold uppercase tracking-wider mb-0.5 truncate">
        {label}
      </span>
      <span className={`font-mono font-bold text-[13px] ${valueColor}`}>
        {value}
      </span>
    </div>
  );
}
