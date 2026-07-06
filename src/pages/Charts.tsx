import React, { useState } from 'react';
import { useTradingContext, formatUSD, getTradingViewLink } from '../store/TradingContext';
import { Pencil, Sparkles, TrendingUp, TrendingDown, Check, X, ChevronDown, ArrowUpRight } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import TradingChart from '../components/TradingChart';
import MarketSelectorModal from '../components/MarketSelectorModal';

export default function ChartsPage({ setActiveTab }: { setActiveTab?: (tab: string) => void }) {
  const { selectedPair, tickers, currentPrices, setPreloadedSide, setSelectedPair } = useTradingContext();

  const [timeframe, setTimeframe] = useState('5'); // default 5m
  const [showDrawingsMsg, setShowDrawingsMsg] = useState(false);
  const [showIndicatorsMsg, setShowIndicatorsMsg] = useState(false);
  const [isMarketSelectorOpen, setIsMarketSelectorOpen] = useState(false);

  // Advanced Interactive Features (Real active indicator indices & drawing toggles!)
  const [activeIndicators, setActiveIndicators] = useState<string[]>(['MASimple@tv-basicstudies']);
  const [showDrawingTools, setShowDrawingTools] = useState(false);
  const [showIndicatorSelector, setShowIndicatorSelector] = useState(false);

  const indicatorOptions = [
    { name: 'Simple Moving Average (SMA)', id: 'MASimple@tv-basicstudies' },
    { name: 'Exponential Moving Average (EMA)', id: 'MAExp@tv-basicstudies' },
    { name: 'Relative Strength Index (RSI)', id: 'RSI@tv-basicstudies' },
    { name: 'Moving Average Convergence Divergence (MACD)', id: 'MACD@tv-basicstudies' },
    { name: 'Bollinger Bands (BB)', id: 'BB@tv-basicstudies' },
    { name: 'Stochastic Oscillator', id: 'Stochastic@tv-basicstudies' },
  ];

  const toggleIndicator = (id: string) => {
    if (activeIndicators.includes(id)) {
      setActiveIndicators(activeIndicators.filter((item) => item !== id));
    } else {
      setActiveIndicators([...activeIndicators, id]);
    }
  };

  const ticker = tickers[selectedPair];
  const price = currentPrices[selectedPair] || ticker?.lastPrice || 0;
  const isPositive = (ticker?.priceChangePercent || 0) >= 0;

  const timeframes = [
    { label: '1m', value: '1' },
    { label: '5m', value: '5' },
    { label: '15m', value: '15' },
    { label: '1H', value: '60' },
    { label: '4H', value: '240' },
    { label: '1D', value: 'D' },
  ];

  const handleMobileOrder = (orderSide: 'long' | 'short') => {
    setPreloadedSide(orderSide);
    if (setActiveTab) {
      setActiveTab('trade');
    }
  };

  return (
    <div className="flex flex-col h-full bg-bg-base overflow-hidden w-full max-w-[1600px] xl:w-[90%] mx-auto relative select-none">
      
      {/* 1. Content for Desktop */}
      <div className="hidden md:flex flex-col h-full relative">
        <header className="px-5 py-4 border-b border-orange-100/30 bg-white  shadow-sm sticky top-0 z-10 flex justify-between items-center shrink-0">
          <div className="flex items-center gap-3">
            <h1 className="text-[18px] font-bold text-slate-800  tracking-tight font-sans">Advanced Chart</h1>
            <button 
              onClick={() => setIsMarketSelectorOpen(true)}
              className="flex items-center gap-1.5 text-[15px] font-mono font-semibold text-[#FF8A00] bg-orange-50/50  px-3 py-1 rounded-xl border border-orange-100/20 hover:bg-orange-100/50  transition-colors"
            >
              {selectedPair.replace('USDT', 'USD')}
              <ChevronDown size={14} />
            </button>
            <a 
              href={getTradingViewLink(selectedPair, tickers[selectedPair]?.category || 'Crypto')}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-[11px] font-bold text-orange-600 bg-orange-50 hover:bg-orange-100/60 px-3 py-1.5 rounded-xl border border-orange-100/50 ml-1 transition-all"
            >
              <span>Live Chart Indicator</span>
              <ArrowUpRight size={12} className="stroke-[3]" />
            </a>
          </div>

          <div className="flex items-center gap-6">
            {/* Timeframe Selector desktop */}
            <div className="flex items-center bg-slate-50  border border-slate-150  p-1 rounded-xl gap-1">
              {timeframes.map((tf) => (
                <button
                  key={`desk-tf-${tf.value}`}
                  onClick={() => setTimeframe(tf.value)}
                  className={`text-[12px] font-bold px-3 py-1.5 rounded-lg transition-all ${
                    timeframe === tf.value
                      ? 'bg-orange-500 text-white shadow-sm'
                      : 'text-slate-500 hover:text-slate-800  '
                  }`}
                >
                  {tf.label}
                </button>
              ))}
            </div>

            <div className="h-5 w-[1.5px] bg-slate-100 " />

            <div className="flex items-center gap-2 relative">
              {/* Desktop Indicator buttons */}
              <button
                onClick={() => setShowIndicatorSelector(!showIndicatorSelector)}
                className={`flex items-center gap-1.5 text-xs font-bold px-4 h-9 border rounded-xl transition-all shadow-subtle ${
                  activeIndicators.length > 0 
                  ? 'bg-orange-500 text-white border-orange-500' 
                  : 'bg-white hover:bg-slate-50   text-slate-600  border-orange-200/50'
                }`}
              >
                <Sparkles size={13} />
                <span>Indicators ({activeIndicators.length})</span>
              </button>
              
              <button
                onClick={() => {
                  const targetState = !showDrawingTools;
                  setShowDrawingTools(targetState);
                  setShowDrawingsMsg(true);
                  setTimeout(() => setShowDrawingsMsg(false), 2500);
                }}
                className={`flex items-center gap-1.5 text-xs font-bold px-4 h-9 border rounded-xl transition-all shadow-subtle ${
                  showDrawingTools 
                  ? 'bg-[#00C076] text-white border-[#00C076]' 
                  : 'bg-white hover:bg-slate-50   text-slate-650  border-orange-200/50'
                }`}
              >
                <Pencil size={13} />
                <span>Drawing Tools: {showDrawingTools ? 'ON' : 'OFF'}</span>
              </button>

              {/* Toggle indicators card */}
              <AnimatePresence>
                {showIndicatorSelector && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    className="absolute top-11 right-[160px] z-[99] w-[260px] bg-white  border border-orange-200/70  rounded-2xl shadow-2xl p-3.5 select-none"
                  >
                    <div className="flex items-center justify-between border-b border-slate-100  pb-2 mb-2">
                      <span className="text-[11px] font-semibold uppercase text-slate-800  tracking-wider">Trading Indicators</span>
                      <button onClick={() => setShowIndicatorSelector(false)} className="text-slate-400 hover:text-slate-600"><X size={14} /></button>
                    </div>
                    <div className="flex flex-col gap-1">
                      {indicatorOptions.map((opt) => {
                        const isSelected = activeIndicators.includes(opt.id);
                        return (
                          <button
                            key={`desk-opt-${opt.id}`}
                            onClick={() => toggleIndicator(opt.id)}
                            className={`flex items-center justify-between w-full px-2.5 py-2 rounded-xl text-[11px] font-bold transition-all text-left ${
                              isSelected 
                                ? 'bg-orange-50 text-orange-600  ' 
                                : 'text-slate-650 hover:bg-slate-50  '
                            }`}
                          >
                            <span>{opt.name.split(' (')[0]}</span>
                            <span className={`w-4 h-4 rounded-md flex items-center justify-center border transition-all ${
                              isSelected ? 'bg-orange-500 border-orange-500 text-white' : 'border-slate-300 '
                            }`}>
                              {isSelected && <Check size={10} strokeWidth={3} />}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                    <div className="border-t border-slate-100  pt-2.5 mt-2 flex justify-between items-center text-[14px] font-medium text-slate-500">
                      <span>Active overlays: {activeIndicators.length}</span>
                      <button 
                        onClick={() => {
                          setActiveIndicators([]);
                        }} 
                        className="text-rose-500 hover:underline"
                      >
                        Clear
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </header>

        {/* Desktop Chart Area */}
        <div className="flex-1 w-full bg-bg-base relative">
          <div className="absolute inset-0 z-10">
            <TradingChart 
              pair={selectedPair} 
              timeframe={timeframe} 
              containerId="tradingview_chart_desktop" 
              theme="light" 
              studies={activeIndicators}
              showDrawingTools={showDrawingTools}
            />
          </div>
        </div>

        {/* Short & Long triggers */}
        <div className="p-4 bg-surface border-t border-brand-light/30 flex justify-between gap-4 shrink-0">
          <button 
            onClick={() => {
              setPreloadedSide('short');
              if (setActiveTab) setActiveTab('trade');
            }} 
            className="flex-1 py-3 rounded-[12px] bg-danger text-white font-semibold text-[16px] shadow-sm hover:opacity-90 transition-opacity"
          >
            Short
          </button>
          <button 
            onClick={() => {
              setPreloadedSide('long');
              if (setActiveTab) setActiveTab('trade');
            }} 
            className="flex-1 py-3 rounded-[12px] bg-success text-white font-semibold text-[16px] shadow-sm hover:opacity-90 transition-opacity"
          >
            Long
          </button>
        </div>
      </div>

      {/* 2. Full-Screen Visual Mobile Redesign (PHONE ONLY) */}
      <div className="md:hidden flex flex-col h-full bg-white relative">
        
        {/* Mobile Header: Asset Name, Live Price, 24h Change */}
        <div className="px-4 pt-3 pb-2 border-b border-slate-100 flex items-center justify-between bg-white shrink-0">
          <div className="flex flex-col">
            <div className="flex items-center gap-1">
              <button 
                onClick={() => setIsMarketSelectorOpen(true)}
                className="flex items-center gap-1.5 text-[16px] font-bold text-slate-800 tracking-tight active:opacity-70 transition-opacity"
              >
                {selectedPair}
                <ChevronDown size={18} className="text-slate-500" />
              </button>
              <a 
                href={getTradingViewLink(selectedPair, tickers[selectedPair]?.category || 'Crypto')}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-0.5 text-[9px] font-black text-orange-600 bg-orange-50 px-1.5 py-0.5 rounded border border-orange-100 ml-1"
              >
                <span>Live</span>
                <ArrowUpRight size={10} className="stroke-[3]" />
              </a>
            </div>
            <span className="text-[11px] text-slate-400 font-medium font-sans">Index Price</span>
          </div>
          <div className="flex flex-col items-end">
            <span className={`text-[17px] font-bold font-mono leading-tight ${isPositive ? 'text-[#00C076]' : 'text-[#FF4D4F]'}`}>
              {formatUSD(price)}
            </span>
            <span className={`text-[11px] font-bold flex items-center gap-0.5 ${isPositive ? 'text-[#00C076]' : 'text-[#FF4D4F]'}`}>
              {isPositive ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
              {isPositive ? '+' : ''}{ticker?.priceChangePercent?.toFixed(2)}%
            </span>
          </div>
        </div>

        {/* Full-screen Chart Area */}
        <div className="flex-1 relative w-full bg-white">
          <div className="absolute inset-0 z-10">
            <TradingChart 
              pair={selectedPair} 
              timeframe={timeframe} 
              containerId="tradingview_chart_mobile" 
              theme="light" 
              studies={activeIndicators}
              showDrawingTools={showDrawingTools}
            />
          </div>
        </div>

        {/* Toast notifications */}
        <AnimatePresence>
          {showIndicatorsMsg && (
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 15 }}
              className="absolute bottom-20 left-4 right-4 bg-slate-900/95 text-white px-4 py-2.5 text-[11px] font-medium rounded-xl shadow-lg z-50 flex items-center gap-2"
            >
              <Check size={14} className="text-orange-400 shrink-0" />
              <span>Moving Average or RSI study enabled on Trading Canvas</span>
            </motion.div>
          )}
          {showDrawingsMsg && (
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 15 }}
              className="absolute bottom-20 left-4 right-4 bg-slate-900/95 text-white px-4 py-2.5 text-[11px] font-medium rounded-xl shadow-lg z-50 flex items-center gap-2"
            >
              <Check size={14} className="text-orange-400 shrink-0" />
              <span>{showDrawingTools ? 'Drawing Tools activated! Use left margin selectors.' : 'Drawing Tools deactivated.'}</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Buy and Sell Action Buttons at Bottom */}
        <div className="p-3 bg-white border-t border-slate-100 grid grid-cols-2 gap-3 shrink-0">
          <button
            onClick={() => handleMobileOrder('short')}
            className="w-full py-2.5 rounded-xl bg-[#FF4D4F] text-white font-bold text-[15px] shadow-sm active:opacity-90 hover:opacity-95 transition-all text-center uppercase tracking-wider"
          >
            Sell Now
          </button>
          <button
            onClick={() => handleMobileOrder('long')}
            className="w-full py-2.5 rounded-xl bg-[#00C076] text-white font-bold text-[15px] shadow-sm active:opacity-90 hover:opacity-95 transition-all text-center uppercase tracking-wider"
          >
            Buy Now
          </button>
        </div>
      </div>

      <MarketSelectorModal 
        isOpen={isMarketSelectorOpen} 
        onClose={() => setIsMarketSelectorOpen(false)} 
        selectedPair={selectedPair} 
        onSelectPair={setSelectedPair} 
      />
    </div>
  );
}
