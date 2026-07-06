import React, { useState } from 'react';
import { X, Calculator, ShieldAlert } from 'lucide-react';
import { formatUSD } from '../store/TradingContext';

interface CalculatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultPrice: number;
  pair: string;
}

export default function CalculatorModal({
  isOpen,
  onClose,
  defaultPrice,
  pair
}: CalculatorModalProps) {
  const [calcSide, setCalcSide] = useState<'long' | 'short'>('long');
  const [calcLeverage, setCalcLeverage] = useState<number>(50);
  const [calcEntryPrice, setCalcEntryPrice] = useState<string>(defaultPrice ? defaultPrice.toString() : '1670');
  const [calcExitPrice, setCalcExitPrice] = useState<string>(defaultPrice ? (defaultPrice * 1.05).toFixed(2) : '1750');
  const [calcQuantity, setCalcQuantity] = useState<string>('1');

  if (!isOpen) return null;

  const entry = parseFloat(calcEntryPrice) || 0;
  const exit = parseFloat(calcExitPrice) || 0;
  const qty = parseFloat(calcQuantity) || 0;

  // Calculables
  const marginRequired = entry && qty ? (entry * qty) / calcLeverage : 0;
  const rawPnl = calcSide === 'long' 
    ? (exit - entry) * qty 
    : (entry - exit) * qty;

  const roi = marginRequired > 0 ? (rawPnl / marginRequired) * 100 : 0;
  const liqPrice = calcSide === 'long'
    ? entry * (1 - 0.9 / calcLeverage)
    : entry * (1 + 0.9 / calcLeverage);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div className="absolute inset-0" onClick={onClose} />
      
      <div className="relative w-full max-w-md bg-surface border border-brand-light/20 rounded-3xl shadow-2xl flex flex-col max-h-[85vh] overflow-hidden text-text-main animate-fadeIn">
        {/* Header */}
        <div className="p-5 border-b border-brand-light/10 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <Calculator className="text-brand" size={18} />
            <div>
              <h3 className="text-base font-bold">Trading Calculator</h3>
              <p className="text-[10px] text-text-muted uppercase">Calculate Margin, ROI, and Liquidation</p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="w-7 h-7 rounded-full bg-bg-sec/50 flex items-center justify-center text-text-muted hover:text-text-main hover:bg-bg-sec select-none"
          >
            <X size={14} />
          </button>
        </div>

        {/* Content panel */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          
          {/* Side Selector Toggle */}
          <div className="flex p-0.5 bg-bg-sec rounded-xl border border-brand-light/5 shadow-inner">
            <button
              onClick={() => setCalcSide('long')}
              className={`flex-1 py-1.5 rounded-lg text-[14px] font-medium text-slate-500 uppercase transition-all ${
                calcSide === 'long'
                  ? 'bg-success text-white shadow-sm'
                  : 'text-text-muted hover:text-text-main'
              }`}
            >
              Buy Long
            </button>
            <button
              onClick={() => setCalcSide('short')}
              className={`flex-1 py-1.5 rounded-lg text-[14px] font-medium text-slate-500 uppercase transition-all ${
                calcSide === 'short'
                  ? 'bg-danger text-white shadow-sm'
                  : 'text-text-muted hover:text-text-main'
              }`}
            >
              Sell Short
            </button>
          </div>

          {/* Form Inputs Grid */}
          <div className="grid grid-cols-2 gap-3.5">
            <div>
              <label className="text-[14px] font-medium text-slate-500 text-text-muted block mb-1 uppercase tracking-wider">Leverage</label>
              <div className="flex bg-bg-sec/40 rounded-xl border border-brand-light/10 items-center overflow-hidden h-10 px-3">
                <input
                  type="number"
                  min="1"
                  max="100"
                  value={calcLeverage}
                  onChange={(e) => setCalcLeverage(Math.min(100, Math.max(1, parseInt(e.target.value) || 1)))}
                  className="w-full bg-transparent font-mono font-bold text-sm outline-none"
                />
                <span className="text-xs font-semibold text-brand">x</span>
              </div>
            </div>

            <div>
              <label className="text-[14px] font-medium text-slate-500 text-text-muted block mb-1 uppercase tracking-wider">Quantity Size</label>
              <div className="flex bg-bg-sec/40 rounded-xl border border-brand-light/10 items-center overflow-hidden h-10 px-3">
                <input
                  type="number"
                  step="0.01"
                  value={calcQuantity}
                  onChange={(e) => setCalcQuantity(e.target.value)}
                  className="w-full bg-transparent font-mono font-bold text-sm outline-none"
                />
                <span className="text-[14px] font-medium text-slate-500 text-text-muted">Lots</span>
              </div>
            </div>

            <div>
              <label className="text-[14px] font-medium text-slate-500 text-text-muted block mb-1 uppercase tracking-wider">Entry Price (USD)</label>
              <input
                type="number"
                step="0.01"
                value={calcEntryPrice}
                onChange={(e) => setCalcEntryPrice(e.target.value)}
                className="w-full h-10 px-3 bg-bg-sec/40 rounded-xl border border-brand-light/10 font-mono font-bold text-sm focus:outline-none"
              />
            </div>

            <div>
              <label className="text-[14px] font-medium text-slate-500 text-text-muted block mb-1 uppercase tracking-wider">Exit Price (USD)</label>
              <input
                type="number"
                step="0.01"
                value={calcExitPrice}
                onChange={(e) => setCalcExitPrice(e.target.value)}
                className="w-full h-10 px-3 bg-bg-sec/40 rounded-xl border border-brand-light/10 font-mono font-bold text-sm focus:outline-none"
              />
            </div>
          </div>

          {/* Results Summary and Output metrics */}
          <div className="bg-bg-sec/50 p-4 rounded-2xl border border-brand-light/10 space-y-3 select-none">
            <div className="flex justify-between text-xs font-semibold text-text-muted">
              <span>Required Margin:</span>
              <span className="font-mono text-text-main font-semibold">{formatUSD(marginRequired)}</span>
            </div>
            
            <div className="flex justify-between text-xs font-semibold text-text-muted">
              <span>Estimated P&L:</span>
              <span className={`font-mono text-sm font-semibold ${rawPnl >= 0 ? 'text-success' : 'text-danger'}`}>
                {rawPnl >= 0 ? '+' : ''}{formatUSD(rawPnl)}
              </span>
            </div>

            <div className="flex justify-between text-xs font-semibold text-text-muted border-t border-dashed border-brand-light/10 pt-2.5">
              <span>ROI Return Percentage:</span>
              <span className={`font-mono font-semibold text-sm ${roi >= 0 ? 'text-success' : 'text-danger'}`}>
                {roi >= 0 ? '+' : ''}{roi.toFixed(2)}%
              </span>
            </div>

            <div className="flex justify-between text-xs font-semibold text-text-muted">
              <span>Est. Liquidation Price:</span>
              <span className="font-mono text-danger font-semibold">{formatUSD(liqPrice)}</span>
            </div>
          </div>

          <div className="p-3.5 bg-brand/5 rounded-2xl border border-brand/10 text-[10px] leading-normal text-text-muted flex gap-2">
            <ShieldAlert size={14} className="text-brand shrink-0 mt-0.5" />
            <p>
              Calculations are estimates for reference only. High leverage multiplier values increase rapid liquidation risks. Set appropriate safeguards.
            </p>
          </div>

        </div>

        <div className="p-5 border-t border-brand-light/10 shrink-0">
          <button 
            onClick={onClose}
            className="w-full py-3 rounded-2xl bg-brand text-white font-semibold text-xs uppercase tracking-wider text-center hover:bg-brand/90 transition-colors shadow-lg shadow-brand/15"
          >
            Calculate Done
          </button>
        </div>
      </div>
    </div>
  );
}
