import React, { useState } from 'react';
import { Search, X, TrendingUp, TrendingDown, Star } from 'lucide-react';
import { useTradingContext, formatUSD } from '../store/TradingContext';

interface MarketSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedPair: string;
  onSelectPair: (pair: string) => void;
}

const CATEGORIES = ['Crypto', 'Forex', 'Indian Market'] as const;

export default function MarketSelectorModal({
  isOpen,
  onClose,
  selectedPair,
  onSelectPair
}: MarketSelectorModalProps) {
  const { tickers } = useTradingContext();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<string>('Crypto');

  if (!isOpen) return null;

  // Flatten symbols based on MOCK_ASSETS category or look inside tickers
  const allTickerSymbols = Object.keys(tickers);

  // Categorize symbols based on their patterns
  const categorizeSymbol = (sym: string): string => {
    if (sym.includes('/') && !sym.includes('NIFTY')) return 'Forex';
    if (sym.includes('NIFTY') || sym === 'SENSEX' || [
      'Reliance', 'TCS', 'Infosys', 'HDFC Bank', 'ICICI Bank', 'State Bank of India', 'Axis Bank', 'Kotak Mahindra Bank', 'ITC', 'Bharti Airtel', 'L&T', 'Wipro', 'Tata Motors', 'Tata Steel', 'Tata Power', 'Tata Consumer', 'Adani Enterprises', 'Adani Ports', 'Adani Power', 'Adani Green', 'HCL Technologies', 'Sun Pharma', 'Asian Paints', 'Bajaj Finance', 'Maruti Suzuki', 'UltraTech Cement'
    ].some(p => sym.startsWith(p))) {
      return 'Indian Market';
    }
    return 'Crypto';
  };

  const filteredSymbols = allTickerSymbols.filter(symbol => {
    const matchesSearch = symbol.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = categorizeSymbol(symbol) === activeCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div className="absolute inset-0" onClick={onClose} />
      
      <div className="relative w-full max-w-md bg-surface border border-brand-light/20 rounded-3xl shadow-2xl flex flex-col max-h-[85vh] overflow-hidden animate-fadeIn text-text-main">
        {/* Header */}
        <div className="p-5 border-b border-brand-light/10 flex items-center justify-between shrink-0">
          <div>
            <h3 className="text-lg font-bold">Select Trading Asset</h3>
            <p className="text-xs text-text-muted">Choose cross-margined perpetual futures</p>
          </div>
          <button 
            onClick={onClose} 
            className="w-8 h-8 rounded-full bg-bg-sec/50 flex items-center justify-center text-text-muted hover:text-text-main hover:bg-bg-sec select-none"
          >
            <X size={16} />
          </button>
        </div>

        {/* Search Input */}
        <div className="p-4 bg-bg-base/30 shrink-0">
          <div className="relative flex items-center">
            <Search size={16} className="absolute left-3 text-text-muted" />
            <input
              type="text"
              placeholder="Search ticker (e.g. BTCUSD, EUR/USD)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-11 pl-10 pr-4 rounded-xl bg-bg-sec/40 border border-brand-light/10 text-sm focus:border-brand/40 focus:outline-none transition-all"
            />
          </div>
        </div>

        {/* Category Tabs */}
        <div className="px-4 pb-2 flex gap-1.5 overflow-x-auto no-scrollbar shrink-0 border-b border-brand-light/10">
          {CATEGORIES.map(cat => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
                activeCategory === cat
                  ? 'bg-brand text-white shadow-sm shadow-brand/10'
                  : 'bg-bg-sec/40 text-text-muted hover:text-text-main'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Listed symbols */}
        <div className="flex-1 overflow-y-auto p-3.5 space-y-1">
          {filteredSymbols.length === 0 ? (
            <div className="py-12 text-center text-text-muted text-xs">
              No assets found under "{activeCategory}" matching query.
            </div>
          ) : (
            filteredSymbols.map(sym => {
              const ticker = tickers[sym];
              const price = ticker?.lastPrice || 0;
              const percent = ticker?.priceChangePercent || 0;
              const isUp = percent >= 0;
              const isSelected = sym === selectedPair;

              return (
                <div
                  key={sym}
                  onClick={() => {
                    onSelectPair(sym);
                    onClose();
                  }}
                  className={`flex items-center justify-between p-3 rounded-2xl cursor-pointer transition-colors ${
                    isSelected 
                      ? 'bg-brand-light/10 border-brand/20 border' 
                      : 'border border-transparent hover:bg-bg-sec/30'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center font-bold text-xs uppercase w-8 h-8 rounded-full bg-brand-light/15 text-brand">
                      {sym.replace('USDT', '').replace('USD', '').substring(0, 3)}
                    </div>
                    <div>
                      <span className="font-semibold text-sm block leading-tight">
                        {sym === 'Gold' ? 'XAU/USD' : (sym.endsWith('USD') && !sym.includes('/') ? sym.slice(0, -3) + '/USD' : sym.replace('USDT', '/USD'))}
                      </span>
                      <span className="text-[10px] text-text-muted">Perpetual Contract</span>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <span className="font-mono font-semibold text-sm block whitespace-nowrap">{formatUSD(price)}</span>
                    {ticker?.category !== 'Indian Market' ? (
                      <span className={`text-[11px] font-bold inline-flex items-center gap-0.5 ${isUp ? 'text-success' : 'text-danger'}`}>
                        {isUp ? '+' : ''}{percent.toFixed(2)}%
                      </span>
                    ) : (
                      <span className="text-[11px] font-bold text-slate-300">-</span>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
