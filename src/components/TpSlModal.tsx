import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, ChevronDown } from 'lucide-react';

interface TpSlModalProps {
  isOpen: boolean;
  onClose: () => void;
  entryPrice: number;
  side: 'long' | 'short';
  tradeSizeInCoins: number;
  initialTpPrice: string;
  initialSlPrice: string;
  onConfirm: (tpPrice: string, slPrice: string) => void;
}

export default function TpSlModal({
  isOpen,
  onClose,
  entryPrice,
  side,
  tradeSizeInCoins,
  initialTpPrice,
  initialSlPrice,
  onConfirm,
}: TpSlModalProps) {
  const [tpPriceStr, setTpPriceStr] = useState(initialTpPrice);
  const [slPriceStr, setSlPriceStr] = useState(initialSlPrice);
  const [tpPercentStr, setTpPercentStr] = useState('');
  const [slPercentStr, setSlPercentStr] = useState('');

  const [tpType, setTpType] = useState('Market');
  const [slType, setSlType] = useState('Market');

  const presets = [0.25, 0.5, 1, 2];

  useEffect(() => {
    if (isOpen) {
      setTpPriceStr(initialTpPrice);
      setSlPriceStr(initialSlPrice);
      setTpPercentStr('');
      setSlPercentStr('');
    }
  }, [isOpen, initialTpPrice, initialSlPrice]);

  if (!isOpen) return null;

  const handleTpPercentSelect = (pct: number) => {
    setTpPercentStr(pct.toString());
    const val = side === 'long' 
      ? entryPrice * (1 + pct / 100)
      : entryPrice * (1 - pct / 100);
    setTpPriceStr(val.toFixed(4));
  };

  const handleSlPercentSelect = (pct: number) => {
    setSlPercentStr(pct.toString());
    const val = side === 'long' 
      ? entryPrice * (1 - pct / 100)
      : entryPrice * (1 + pct / 100);
    setSlPriceStr(val.toFixed(4));
  };

  const tpValue = parseFloat(tpPriceStr) || 0;
  const slValue = parseFloat(slPriceStr) || 0;

  const tpPnl = tpValue > 0 ? (side === 'long' ? (tpValue - entryPrice) * tradeSizeInCoins : (entryPrice - tpValue) * tradeSizeInCoins) : 0;
  const slPnl = slValue > 0 ? (side === 'long' ? (slValue - entryPrice) * tradeSizeInCoins : (entryPrice - slValue) * tradeSizeInCoins) : 0;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-[200] flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="w-full max-w-[340px] bg-white rounded-[16px] shadow-2xl overflow-hidden text-[#2D2D2D]"
      >
        <div className="flex items-center justify-between p-4 border-b border-[#FFD8A8]">
          <h2 className="text-[16px] font-bold tracking-wide text-center w-full">Set TP/SL</h2>
          <button onClick={onClose} className="absolute right-4 text-slate-400 hover:text-[#FF9F43] transition-colors p-1">
            <X size={18} />
          </button>
        </div>

        <div className="p-4 flex flex-col gap-4 text-[13px] font-semibold text-slate-500">
          {/* Header row */}
          <div className="flex justify-between items-center px-1">
            <span className="text-slate-400">Entry Price</span>
            <span className="text-[#2D2D2D] font-mono text-[14px]">{entryPrice.toFixed(4)}</span>
          </div>
          <div className="flex justify-between items-center px-1 border-b border-dashed border-[#FFD8A8] pb-4">
            <span className="text-slate-400 border-b border-dotted border-slate-400 hover:text-[#FF9F43] cursor-pointer">Trigger Index</span>
            <div className="flex items-center gap-1 cursor-pointer">
              <span className="text-[#2D2D2D] font-mono">Mark {entryPrice.toFixed(1)}</span>
              <ChevronDown size={14} className="text-slate-500" />
            </div>
          </div>

          {/* TP Section */}
          <div className="flex flex-col gap-2">
            <div className="flex justify-between items-center">
              <span className="text-[#2D2D2D] font-bold border-b border-dashed border-[#2D2D2D]">Take Profit</span>
              <div className="flex bg-[#FFF8F1] rounded-md border border-[#FFD8A8] overflow-hidden text-[12px]">
                <button 
                  onClick={() => setTpType('Market')}
                  className={`px-3 py-1 font-bold ${tpType === 'Market' ? 'text-[#FF9F43] bg-white border-r border-[#FFD8A8]' : 'text-slate-500 hover:bg-[#FFF4E8]'}`}
                >
                  Market
                </button>
                <button 
                  onClick={() => setTpType('Limit')}
                  className={`px-3 py-1 font-bold ${tpType === 'Limit' ? 'text-[#FF9F43] bg-white border-l border-[#FFD8A8]' : 'text-slate-500 hover:bg-[#FFF4E8]'}`}
                >
                  Limit
                </button>
              </div>
            </div>

            <div className="bg-[#FFF4E8] p-2.5 rounded-lg mt-1 relative border border-[#FFD8A8]/50">
              <span className="text-slate-400 text-[11px] mb-1 block">Trigger Price USD</span>
              <input 
                type="number"
                value={tpPriceStr}
                onChange={(e) => setTpPriceStr(e.target.value)}
                placeholder="Trigger Price"
                className="w-full bg-white border border-[#FFD8A8] rounded p-1.5 outline-none font-bold font-mono text-[#2D2D2D] mb-2 focus:border-[#FF9F43]"
              />
              <div className="flex items-center justify-between text-[11px] bg-white border border-[#FFD8A8] rounded overflow-hidden">
                {presets.map(pct => (
                  <button 
                    key={pct}
                    onClick={() => handleTpPercentSelect(pct)}
                    className="flex-1 py-1 text-center font-bold text-[#2D2D2D] border-r border-[#FFD8A8] hover:bg-[#FFF4E8] transition-colors"
                  >
                    {pct}%
                  </button>
                ))}
                <div className="flex-none w-14 flex items-center bg-[#FFF8F1] focus-within:bg-white text-slate-400">
                  <input
                    type="number"
                    value={tpPercentStr}
                    onChange={(e) => {
                      setTpPercentStr(e.target.value);
                      const pct = parseFloat(e.target.value) || 0;
                      if(pct > 0){
                          const val = side === 'long' 
                            ? entryPrice * (1 + pct / 100)
                            : entryPrice * (1 - pct / 100);
                          setTpPriceStr(val.toFixed(4));
                      }
                    }}
                    className="w-full bg-transparent p-1 outline-none text-right font-bold text-[#2D2D2D]"
                  />
                  <span className="pr-2">%</span>
                </div>
              </div>
            </div>
          </div>

          <div className="border-b border-dashed border-[#FFD8A8] w-full" />

          {/* SL Section */}
          <div className="flex flex-col gap-2">
            <div className="flex justify-between items-center">
              <span className="text-[#2D2D2D] font-bold border-b border-dashed border-[#2D2D2D]">Stop Loss</span>
              <div className="flex bg-[#FFF8F1] rounded-md border border-[#FFD8A8] overflow-hidden text-[12px]">
                <button 
                  onClick={() => setSlType('Market')}
                  className={`px-2 py-1 font-bold ${slType === 'Market' ? 'text-[#FF9F43] bg-white' : 'text-slate-500 hover:bg-[#FFF4E8]'}`}
                >
                  Market
                </button>
                <button 
                  onClick={() => setSlType('Limit')}
                  className={`px-2 py-1 font-bold border-x border-[#FFD8A8] ${slType === 'Limit' ? 'text-[#FF9F43] bg-white' : 'text-slate-500 hover:bg-[#FFF4E8]'}`}
                >
                  Limit
                </button>
                <button 
                  onClick={() => setSlType('Trail')}
                  className={`px-2 py-1 font-bold ${slType === 'Trail' ? 'text-[#FF9F43] bg-white' : 'text-slate-500 hover:bg-[#FFF4E8]'}`}
                >
                  Trail
                </button>
              </div>
            </div>

            <div className="bg-[#FFF4E8] p-2.5 rounded-lg mt-1 relative border border-[#FFD8A8]/50">
              <span className="text-slate-400 text-[11px] mb-1 block">Trigger Price USD</span>
              <input 
                type="number"
                value={slPriceStr}
                onChange={(e) => setSlPriceStr(e.target.value)}
                placeholder="Trigger Price"
                className="w-full bg-white border border-[#FFD8A8] rounded p-1.5 outline-none font-bold font-mono text-[#2D2D2D] mb-2 focus:border-[#FF9F43]"
              />
              <div className="flex items-center justify-between text-[11px] bg-white border border-[#FFD8A8] rounded overflow-hidden">
                {presets.map(pct => (
                  <button 
                    key={pct}
                    onClick={() => handleSlPercentSelect(pct)}
                    className="flex-1 py-1 text-center font-bold text-[#2D2D2D] border-r border-[#FFD8A8] hover:bg-[#FFF4E8] transition-colors"
                  >
                    {pct}%
                  </button>
                ))}
                <div className="flex-none w-14 flex items-center bg-[#FFF8F1] focus-within:bg-white text-slate-400">
                  <input
                    type="number"
                    value={slPercentStr}
                    onChange={(e) => {
                      setSlPercentStr(e.target.value);
                      const pct = parseFloat(e.target.value) || 0;
                      if(pct > 0){
                          const val = side === 'long' 
                            ? entryPrice * (1 - pct / 100)
                            : entryPrice * (1 + pct / 100);
                          setSlPriceStr(val.toFixed(4));
                      }
                    }}
                    className="w-full bg-transparent p-1 outline-none text-right font-bold focus:text-[#FF9F43]"
                  />
                  <span className="pr-2 focus-within:text-[#FF9F43]">%</span>
                </div>
              </div>
            </div>
          </div>

          {/* PnL Section */}
          <div className="flex flex-col gap-2 mt-4 text-[12px]">
            <div className="flex justify-between items-center px-1">
              <span className="text-slate-400">Exit PnL</span>
              <span className={`font-mono font-bold ${tpPnl > 0 ? 'text-[#22C55E]' : 'text-slate-400'}`}>
                {tpValue > 0 ? (tpPnl > 0 ? `+${tpPnl.toFixed(4)}` : tpPnl.toFixed(4)) : '-'}
              </span>
            </div>
            <div className="flex justify-between items-center px-1">
              <span className="text-slate-400">Stop PnL</span>
              <span className={`font-mono font-bold ${slPnl < 0 ? 'text-[#EF4444]' : 'text-slate-400'}`}>
                {slValue > 0 ? (slPnl > 0 ? `+${slPnl.toFixed(4)}` : slPnl.toFixed(4)) : '-'}
              </span>
            </div>
          </div>

        </div>

        <div className="p-4 bg-white border-t border-[#FFD8A8]">
          <button 
            onClick={() => onConfirm(tpPriceStr, slPriceStr)}
            className="w-full py-3.5 bg-[#FF9F43] hover:bg-[#E28525] text-white font-bold rounded-lg transition-all active:scale-[0.98] shadow-md shadow-orange-500/20 text-[14px]"
          >
            Set Bracket
          </button>
        </div>
      </motion.div>
    </div>
  );
}
