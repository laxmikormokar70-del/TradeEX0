import React from 'react';
import { X, ShieldAlert, Award } from 'lucide-react';

interface FeesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function FeesModal({ isOpen, onClose }: FeesModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div className="absolute inset-0" onClick={onClose} />
      
      <div className="relative w-full max-w-sm bg-surface border border-brand-light/20 rounded-3xl shadow-2xl flex flex-col max-h-[80vh] overflow-hidden text-text-main animate-fadeIn">
        {/* Header */}
        <div className="p-5 border-b border-brand-light/10 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <Award className="text-brand" size={18} />
            <div>
              <h3 className="text-base font-bold">Standard Trading Fees</h3>
              <p className="text-[10px] text-text-muted uppercase">Transparent pricing & rates policy</p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="w-7 h-7 rounded-full bg-bg-sec/50 flex items-center justify-center text-text-muted hover:text-text-main hover:bg-bg-sec select-none"
          >
            <X size={14} />
          </button>
        </div>

        {/* Content body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4 text-xs select-none">
          
            <div className="p-3.5 bg-bg-sec/55 rounded-2xl border border-brand-light/5">
              <span className="block text-[10px] uppercase font-bold text-text-muted mb-1">Maker Fee</span>
              <span className="text-lg font-black text-brand tracking-tight">5%</span>
              <span className="block text-[9px] text-text-muted mt-1 leading-none">Limit Orders</span>
            </div>
            
            <div className="p-3.5 bg-bg-sec/55 rounded-2xl border border-brand-light/5">
              <span className="block text-[10px] uppercase font-bold text-text-muted mb-1">Taker Fee</span>
              <span className="text-lg font-black text-brand tracking-tight">10%</span>
              <span className="block text-[9px] text-text-muted mt-1 leading-none">Market Orders</span>
            </div>

          <div className="space-y-2.5 pt-2">
            <h4 className="text-xs font-black uppercase text-brand">Funding Fee Settlement</h4>
            <p className="leading-normal text-[11px] text-text-muted">
              Perpetual contracts settle funding premiums every 8 hours directly between long and short contract holders:
            </p>
            <ul className="list-disc list-inside space-y-1.5 text-[11px] text-text-muted pl-1">
              <li>Interval timers are at 00:00, 08:00, 16:00 UTC.</li>
              <li>Positive rates: Long positions pay shorts.</li>
              <li>Negative rates: Short positions pay longs.</li>
              <li>The current base rate is <span className="font-bold text-text-main">0.0002% / 8 hrs</span>.</li>
            </ul>
          </div>

          <div className="p-3 bg-brand/5 rounded-2xl border border-brand/10 text-[10px] leading-normal text-text-muted flex gap-2">
            <ShieldAlert size={14} className="text-brand shrink-0 mt-0.5" />
            <p>
              Demo fees are processed mathematically against virtual margin capital. No real funds are consumed during any transactions.
            </p>
          </div>

        </div>

        <div className="p-5 border-t border-brand-light/10 shrink-0">
          <button 
            onClick={onClose}
            className="w-full py-3 rounded-2xl bg-brand text-white font-black text-xs uppercase tracking-wider text-center hover:bg-brand/90 transition-colors shadow-lg"
          >
            I Understand
          </button>
        </div>
      </div>
    </div>
  );
}
