import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { formatUSD, formatINR } from '../store/TradingContext';

interface Props {
  pnl: number;
  margin?: number;
  type?: 'usd' | 'percent' | 'both' | 'usd_inr';
  className?: string;
  align?: 'center' | 'right' | 'left';
  preferredCurrency?: 'USDT' | 'INR';
}

export default function UnrealizedPNLPulse({ pnl, margin, type = 'usd', className = '', align = 'right', preferredCurrency = 'USDT' }: Props) {
  const prevPnlRef = useRef<number>(pnl);
  const [pulse, setPulse] = useState<'up' | 'down' | null>(null);
  const [pulseKey, setPulseKey] = useState<number>(0);

  const isPositive = pnl >= 0;
  const pnlPercent = margin && margin > 0 ? (pnl / margin) * 100 : 0;

  useEffect(() => {
    // Check if there was an actual change in PNL value
    if (pnl !== prevPnlRef.current) {
      const isUp = pnl > prevPnlRef.current;
      setPulse(isUp ? 'up' : 'down');
      setPulseKey(prev => prev + 1);
      prevPnlRef.current = pnl;

      const timer = setTimeout(() => {
        setPulse(null);
      }, 800); // clear pulse after 800ms
      return () => clearTimeout(timer);
    }
  }, [pnl]);

  // Determine target text colors for resting vs flashing states
  const normalTextColor = isPositive ? 'text-[#00C076]' : 'text-[#FF4D4F]';
  
  // Custom animation configs for background and text
  const bgFlashColor = pulse === 'up' 
    ? 'rgba(0, 192, 118, 0.15)' 
    : pulse === 'down' 
      ? 'rgba(255, 77, 79, 0.15)' 
      : 'rgba(0, 0, 0, 0)';

  const textFlashColor = pulse === 'up'
    ? '#00e68a'
    : pulse === 'down'
    ? '#ff6b6e'
    : isPositive
    ? '#00C076'
    : '#FF4D4F';

  const renderContent = () => {
    const alignClass = align === 'center' ? 'items-center' : align === 'left' ? 'items-start' : 'items-end';
    
    const usdValue = Math.abs(pnl).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    const inrValue = Math.abs(pnl * 83.5).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

    const usdElement = (
      <span key="usd" className={`${preferredCurrency === 'USDT' ? 'font-black text-[12px]' : 'text-[10px] font-medium opacity-50'} font-mono whitespace-nowrap`}>
        {isPositive ? '+' : '-'}${usdValue}
      </span>
    );
    const inrElement = (
      <span key="inr" className={`${preferredCurrency === 'INR' ? 'font-black text-[12px]' : 'text-[10px] font-medium opacity-50'} font-mono whitespace-nowrap`}>
        {isPositive ? '+' : '-'}₹{inrValue}
      </span>
    );
 
    if (type === 'usd') {
      return (
        <span className="font-mono whitespace-nowrap">
          {isPositive ? '+' : ''}{formatUSD(pnl)}
        </span>
      );
    } else if (type === 'percent') {
      return (
        <span className="font-mono whitespace-nowrap">
          {isPositive ? '+' : ''}{pnlPercent.toFixed(2)}%
        </span>
      );
    } else if (type === 'usd_inr') {
      return (
        <div className={`flex flex-row gap-1.5 ${alignClass} whitespace-nowrap items-baseline`}>
          {preferredCurrency === 'INR' ? (
            <>
              {inrElement}
              {usdElement}
            </>
          ) : (
            <>
              {usdElement}
              {inrElement}
            </>
          )}
        </div>
      );
    } else {
      return (
        <div className={`flex flex-col ${alignClass} whitespace-nowrap`}>
          <span className="font-mono font-bold text-[14px] sm:text-[15px] whitespace-nowrap">
            {isPositive ? '+' : ''}{formatUSD(pnl)}
          </span>
          <span className="text-[11px] sm:text-[12px] font-medium font-mono whitespace-nowrap opacity-70">
            {isPositive ? '+' : ''}{pnlPercent.toFixed(2)}%
          </span>
        </div>
      );
    }
  };

  return (
    <div
      className={`px-1.5 py-0.5 rounded-[6px] leading-none inline-flex items-center justify-end ${normalTextColor} ${className}`}
      style={{ display: 'inline-block' }}
    >
      {renderContent()}
    </div>
  );
}
