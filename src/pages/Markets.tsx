import React, { useState, useMemo } from 'react';
import { useTradingContext, formatUSD } from '../store/TradingContext';
import { useAuth } from '../store/AuthContext';
import { Star, Search } from 'lucide-react';

export default function MarketsPage({ setActiveTab }: { setActiveTab: (tab: string) => void }) {
  const { tickers, currentPrices, setSelectedPair } = useTradingContext();
  const { profile } = useAuth();
  const [filter, setFilter] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');

  const currencyPreference = profile?.currencyPreference || localStorage.getItem('currency_preference') || 'USDT';

  const renderPrice = (ticker: any) => {
    const price = currentPrices[ticker.symbol] || ticker.lastPrice;
    if (price === undefined || price === null || isNaN(price)) return '0.00';
    if (currencyPreference === 'INR') {
      const inrPrice = price * 83.5;
      return '₹' + inrPrice.toLocaleString(undefined, { 
        minimumFractionDigits: inrPrice < 1 ? 4 : 2,
        maximumFractionDigits: inrPrice < 1 ? 6 : 2 
      });
    } else {
      return '$' + price.toLocaleString(undefined, { 
        minimumFractionDigits: price < 1 ? 4 : 2,
        maximumFractionDigits: price < 1 ? 6 : 4 
      });
    }
  };

  const categories = [
    { id: 'All', label: 'All', icon: '🌐' },
    { id: 'Crypto', label: 'Crypto', icon: '🪙' },
    { id: 'Forex', label: 'Forex', icon: '💱' },
    { id: 'Indian Market', label: 'Indian Market', icon: '📈' },
    { id: 'Favorites', label: 'Favorites', icon: '⭐' },
  ];

  const [favorites, setFavorites] = useState<string[]>(() => {
    try {
      return JSON.parse(localStorage.getItem('crypto_favorites') || '[]');
    } catch {
      return [];
    }
  });

  const toggleFavorite = (e: React.MouseEvent, symbol: string) => {
    e.stopPropagation();
    const newFavs = favorites.includes(symbol) 
      ? favorites.filter(s => s !== symbol) 
      : [...favorites, symbol];
    setFavorites(newFavs);
    localStorage.setItem('crypto_favorites', JSON.stringify(newFavs));
  };

  const displayedTickers = useMemo(() => {
    let list = (Object.values(tickers) as any[]);
    if (filter === 'All') {
      // Do not filter by category, show all
    } else if (filter === 'Favorites') {
      list = list.filter(t => favorites.includes(t.symbol));
    } else {
      list = list.filter(t => t.category === filter);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(t => 
        (t.symbol && t.symbol.toLowerCase().includes(q)) || 
        (t.name && t.name.toLowerCase().includes(q))
      );
    }

    return list.sort((a, b) => b.quoteVolume - a.quoteVolume);
  }, [tickers, filter, favorites, searchQuery]);

  return (
    <div className="flex flex-col h-full overflow-y-auto bg-bg-base">
      <div className="w-full max-w-[1600px] xl:w-[90%] mx-auto flex flex-col min-h-full bg-surface shadow-[0_0_20px_rgba(0,0,0,0.01)] relative">
        <div className="px-5 pt-6 pb-2 shrink-0">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
            <h1 className="text-[26px] font-bold text-text-main tracking-tight font-sans">Markets</h1>
            
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={16} />
              <input
                type="text"
                placeholder="Search markets..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-14 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:border-[#FF8A00] focus:ring-1 focus:ring-[#FF8A00] transition-all"
              />
              <span className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-[#FF8A00] text-white text-[9px] font-black uppercase px-1.5 py-0.5 rounded shadow-sm">
                PRO
              </span>
            </div>
          </div>
          
          {/* Top Category Bar */}
          <div className="flex gap-2 overflow-x-auto custom-scrollbar pb-3 touch-pan-x cursor-grab active:cursor-grabbing text-[14px]">
            {categories.map(cat => (
              <button
                key={cat.id}
                onClick={() => setFilter(cat.id)}
                className={`whitespace-nowrap flex items-center gap-1.5 px-4 py-2 rounded-full font-bold transition-all border ${
                  filter === cat.id 
                    ? 'bg-[#FF8A00] text-white border-[#FF8A00] shadow-sm' 
                    : 'bg-white border-slate-200 text-slate-500 hover:border-[#FF8A00]/40 hover:text-slate-800'
                }`}
              >
                <span>{cat.icon}</span>
                {cat.label}
              </button>
            ))}
          </div>
        </div>

        <div className="px-5 py-2 flex-1 pb-24">

          {/* Table Header */}
          <div className="grid grid-cols-[2.2fr_1.4fr_1.2fr_24px] sm:grid-cols-[2.2fr_1.5fr_1.2fr_40px] px-2 sm:px-4 mb-3 pb-3 text-[11px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100/60 gap-1.5 sm:gap-3">
            <div>Contract</div>
            <div className="text-left pl-1 sm:pl-3">Price</div>
            <div className="text-right">24h</div>
            <div className="text-right"></div>
          </div>

          {/* Table Body */}
          <div className="space-y-2.5">
            {displayedTickers.length === 0 ? (
              <div className="py-12 text-center text-text-muted font-medium bg-surface rounded-[16px] border border-brand-light/20">
                No markets found matching the filter
              </div>
            ) : (
              displayedTickers.map(ticker => {
                const isCrypto = ticker.category === 'Crypto' || !ticker.category;
                const coinName = isCrypto ? ticker.symbol.replace('USDT', '').replace('USD', '') : ticker.symbol.replace('/USD', '');
                
                return (
                  <div
                    key={ticker.symbol}
                    onClick={() => { setSelectedPair(ticker.symbol); setActiveTab('trade'); }}
                    className="w-full grid grid-cols-[2.2fr_1.4fr_1.2fr_24px] sm:grid-cols-[2.2fr_1.5fr_1.2fr_40px] items-center p-3 sm:p-4 bg-white rounded-[20px] shadow-[0_2px_12px_rgba(0,0,0,0.02)] border border-slate-100 hover:border-[#FFD6A5] hover:shadow-md transition-all cursor-pointer group gap-1.5 sm:gap-3"
                  >
                    <div className="flex items-center gap-2 sm:gap-3 text-left overflow-hidden">
                      <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-bg-sec flex items-center justify-center border border-brand-light/30 shrink-0 font-bold overflow-hidden bg-white shadow-sm">
                        <img 
                          src={isCrypto ? `https://cdn.jsdelivr.net/gh/atomiclabs/cryptocurrency-icons@1a63530c26148158af15a2ca0715e36511b2db40/svg/color/${coinName.toLowerCase()}.svg` : `https://ui-avatars.com/api/?name=${encodeURIComponent(coinName.charAt(0))}&background=FF8A00&color=fff&rounded=true&bold=true`}
                          alt={ticker.symbol}
                          className="w-full h-full object-cover hidden sm:block"
                          onError={(e) => { 
                            e.currentTarget.onerror = null;
                            e.currentTarget.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(coinName.charAt(0))}&background=FF8A00&color=fff&rounded=true&bold=true`;
                          }}
                        />
                        <span className="sm:hidden text-[11px] text-text-main group-hover:text-brand transition-colors font-bold">
                          {coinName.slice(0, 2)}
                        </span>
                      </div>
                      <div className="min-w-0 flex flex-col justify-center">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-[14px] sm:text-[15px] font-extrabold text-[#1E293B] group-hover:text-[#FF8A00] transition-colors leading-tight tracking-tight shrink-0 whitespace-nowrap">
                            {isCrypto ? `${coinName}/USD` : (coinName === 'Gold' ? 'XAU/USD' : coinName)}
                          </span>
                          {ticker.category !== 'Crypto' && (
                            <span className="text-[9px] font-black text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded-md leading-none shrink-0 uppercase tracking-wider">
                              {ticker.category}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  
                  <div className="text-left flex items-center pl-1 sm:pl-3 shrink-0 min-w-0">
                    <span className="text-[14px] sm:text-[15px] font-mono font-bold text-slate-800 leading-tight whitespace-nowrap">
                      {renderPrice(ticker)}
                    </span>
                  </div>

                  <div className="text-right flex justify-end">
                    {ticker.category !== 'Indian Market' ? (
                      <div className={`px-1.5 py-1 sm:px-2 sm:py-1 rounded-[6px] text-[12px] sm:text-[13px] font-bold inline-flex items-center justify-center min-w-[54px] sm:min-w-[70px] shadow-sm ${
                        ticker.priceChangePercent >= 0 ? 'bg-success/10 text-success' : 'bg-danger/10 text-danger'
                      }`}>
                        {ticker.priceChangePercent >= 0 ? '+' : ''}{ticker.priceChangePercent.toFixed(2)}%
                      </div>
                    ) : (
                      <div className="text-slate-300 font-bold text-[13px] pr-2">-</div>
                    )}
                  </div>
                  
                  <div className="flex justify-end items-center px-0 sm:px-1">
                    <button 
                      onClick={(e) => toggleFavorite(e, ticker.symbol)}
                      className="p-1.5 focus:outline-none"
                    >
                      <Star 
                        size={18} 
                        className={`transition-colors ${favorites.includes(ticker.symbol) ? 'fill-[#FF8A00] text-[#FF8A00]' : 'text-slate-300 hover:text-[#FF8A00]'}`} 
                      />
                    </button>
                  </div>
                </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
