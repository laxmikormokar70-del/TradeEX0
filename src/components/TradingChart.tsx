import React, { useEffect, useRef, useState } from 'react';

declare global {
  interface Window {
    TradingView: any;
  }
}

interface TradingChartProps {
  pair: string;
  timeframe: string;
  theme?: 'light' | 'dark';
  containerId: string;
  studies?: string[];
  showDrawingTools?: boolean;
}

export default function TradingChart({
  pair,
  timeframe,
  theme = 'light',
  containerId,
  studies = [],
  showDrawingTools = false,
  hideTopToolbar = false,
}: TradingChartProps & { hideTopToolbar?: boolean }) {
  const [isScriptLoaded, setIsScriptLoaded] = useState(false);
  const [isWidgetCreated, setIsWidgetCreated] = useState(false);
  const scriptTagRef = useRef<HTMLScriptElement | null>(null);
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Maps the selected asset pair to its corresponding TradingView widget symbol format
  const getTradingViewSymbol = (asset: string) => {
    const upperAsset = asset.toUpperCase().replace('/', '').trim();
    
    // Explicit mapping for Precious Metals (OANDA symbols) to match user requested XAU/EUR chart and others
    const metalsMap: Record<string, string> = {
      'XAGAUD': 'OANDA:XAGAUD',
      'XAGUSD': 'OANDA:XAGUSD',
      'XAUAUD': 'OANDA:XAUAUD',
      'XAUEUR': 'OANDA:XAUEUR',
      'XAUJPY': 'OANDA:XAUJPY',
      'XAUUSD': 'OANDA:XAUUSD',
      'XPDUSD': 'OANDA:XPDUSD',
      'XPTUSD': 'OANDA:XPTUSD'
    };
    if (metalsMap[upperAsset]) return metalsMap[upperAsset];
    
    // Explicit mapping for Exotic / Specific Forex pairs (FX_IDC or OANDA)
    const exoticsMap: Record<string, string> = {
      'USDBRL': 'FX_IDC:USDBRL',
      'USDCLP': 'FX_IDC:USDCLP',
      'USDCOP': 'FX_IDC:USDCOP',
      'USDIDR': 'FX_IDC:USDIDR',
      'USDINR': 'FX_IDC:USDINR',
      'USDKRW': 'FX_IDC:USDKRW',
      'USDTWD': 'FX_IDC:USDTWD',
      'AUDCNH': 'OANDA:AUDCNH'
    };
    if (exoticsMap[upperAsset]) return exoticsMap[upperAsset];

    // Special Crypto asset mappings to guarantee proper charts open instantly from verified exchanges
    const specialCryptoMap: Record<string, string> = {
      'HUSDUSD': 'BINANCE:USDCUSDT',
      'HUSD': 'BINANCE:USDCUSDT',
      'RIVERUSD': 'GATEIO:RIVERUSDT',
      'RIVER': 'GATEIO:RIVERUSDT',
      'RAVEUSD': 'MEXC:RAVEUSDT',
      'RAVE': 'MEXC:RAVEUSDT',
      'SPXUSD': 'GATEIO:SPXUSDT',
      'SPX': 'GATEIO:SPXUSDT',
      'VVVUSD': 'GATEIO:VVVUSDT',
      'VVV': 'GATEIO:VVVUSDT',
      'XAUTUSD': 'KRAKEN:XAUTUSD',
      'XAUT': 'KRAKEN:XAUTUSD',
      'AIOTUSD': 'GATEIO:AIOTUSDT',
      'AIOT': 'GATEIO:AIOTUSDT',
      'SKYAIUSD': 'GATEIO:SKYUSDT',
      'SKYAI': 'GATEIO:SKYUSDT',
      'HYPEUSD': 'GATEIO:HYPEUSDT',
      'HYPE': 'GATEIO:HYPEUSDT',
      'SIRENUSD': 'GATEIO:SIRENUSDT',
      'SIREN': 'GATEIO:SIRENUSDT',
      'EDENUSD': 'GATEIO:EDENUSDT',
      'EDEN': 'GATEIO:EDENUSDT',
      'ARCUSD': 'GATEIO:ARCUSDT',
      'ARC': 'GATEIO:ARCUSDT',
      'BLESSUSD': 'GATEIO:BLESSUSDT',
      'BLESS': 'GATEIO:BLESSUSDT',
      'CHIPUSD': 'GATEIO:CHIPUSDT',
      'CHIP': 'GATEIO:CHIPUSDT',
      'BUMUSD': 'GATEIO:BUMUSDT',
      'BUM': 'GATEIO:BUMUSDT',
      'SWARMSUSD': 'GATEIO:SWARMSUSDT',
      'SWARMS': 'GATEIO:SWARMSUSDT',
      'ANOMAUSD': 'GATEIO:ANOMAUSDT',
      'ANOMA': 'GATEIO:ANOMAUSDT',
      'METAXUSD': 'GATEIO:METAXUSDT',
      'METAX': 'GATEIO:METAXUSDT',
      'CONXUSD': 'GATEIO:CONXUSDT',
      'CONX': 'GATEIO:CONXUSDT',
      'HANAUSD': 'GATEIO:HANAUSDT',
      'HANA': 'GATEIO:HANAUSDT',
      'JUPUSD': 'BINANCE:JUPUSDT',
      'JUP': 'BINANCE:JUPUSDT',
      'PENGUUSD': 'BINANCE:PENGUUSDT',
      'PENGU': 'BINANCE:PENGUUSDT',
      'PAXGUSD': 'BINANCE:PAXGUSDT',
      'PAXG': 'BINANCE:PAXGUSDT',
    };

    if (specialCryptoMap[upperAsset]) return specialCryptoMap[upperAsset];

    let category = '';
    
    if (upperAsset.includes('USDT') || upperAsset.includes('DOGE') || upperAsset.includes('XRP') || upperAsset.endsWith('USD')) category = 'Crypto';
    else if (asset.includes('/')) category = 'Forex';
    else if (upperAsset.includes('NIFTY') || upperAsset === 'SENSEX' || upperAsset === 'MIDCAP SELECT' || [
      'RELIANCE', 'TCS', 'INFOSYS', 'HDFC BANK', 'ICICI BANK', 'STATE BANK OF INDIA', 'AXIS BANK', 'KOTAK MAHINDRA BANK', 'ITC', 'BHARTI AIRTEL', 'L&T', 'WIPRO', 'TATA MOTORS', 'TATA STEEL', 'TATA POWER', 'TATA CONSUMER', 'ADANI ENTERPRISES', 'ADANI PORTS', 'ADANI POWER', 'ADANI GREEN', 'HCL TECHNOLOGIES', 'SUN PHARMA', 'ASIAN PAINTS', 'BAJAJ FINANCE', 'MARUTI SUZUKI', 'ULTRATECH CEMENT', 'POWER GRID', 'TITAN', 'NESTLE INDIA', 'JSW STEEL', 'ONGC', 'COAL INDIA', 'GRASIM', 'NTPC', 'HINDALCO', 'BPCL', 'HERO MOTOCORP', 'EICHER MOTORS', 'APOLLO HOSPITALS', 'BAJAJ AUTO', 'CIPLA', 'DIVIS LAB', 'DR REDDYS', 'INDUSIND BANK', 'BRITANNIA'
    ].includes(upperAsset)) category = 'Indian Market';
    else if (['GOLD', 'SILVER', 'CRUDE OIL', 'NATURAL GAS', 'COPPER', 'ALUMINIUM', 'ZINC', 'NICKEL', 'COTTON', 'COFFEE', 'SUGAR', 'WHEAT', 'CORN', 'SOYBEAN'].includes(upperAsset)) category = 'Commodities';
    else if (['APPLE', 'MICROSOFT', 'GOOGLE', 'AMAZON', 'META', 'TESLA', 'NVIDIA', 'NETFLIX', 'AMD', 'INTEL', 'ORACLE', 'SALESFORCE', 'UBER', 'AIRBNB'].includes(upperAsset)) category = 'Global Stocks';
    else if (['S&P 500', 'NASDAQ 100', 'DOW JONES', 'FTSE 100', 'DAX', 'NIKKEI 225', 'US30', 'NAS100', 'SPX500'].includes(upperAsset)) category = 'Indices';
    else category = 'Indian Market'; 

    if (category === 'Crypto') {
      const formatted = upperAsset.endsWith('USD') && !upperAsset.includes('USDT')
        ? upperAsset.replace(/USD$/, 'USDT')
        : upperAsset;
      return `BINANCE:${formatted.replace('/', '')}`;
    }
    if (category === 'Forex') return `FX:${upperAsset.replace('/', '')}`;
    if (category === 'Indian Market') {
      const imap: Record<string, string> = { 
        'NIFTY 50': 'NSE:NIFTY', 
        'BANK NIFTY': 'NSE:BANKNIFTY', 
        'FINNIFTY': 'NSE:FINNIFTY', 
        'SENSEX': 'BSE:SENSEX', 
        'MIDCAP SELECT': 'NSE:MIDCPNIFTY',
        'NIFTY IT': 'NSE:CNXIT', 
        'NIFTY AUTO': 'NSE:CNXAUTO', 
        'NIFTY FMCG': 'NSE:CNXFMCG', 
        'NIFTY PHARMA': 'NSE:CNXPHARMA', 
        'NIFTY REALTY': 'NSE:CNXREALTY', 
        'NIFTY METAL': 'NSE:CNXMETAL', 
        'MIDCAP NIFTY': 'NSE:MIDCPNIFTY',
        'RELIANCE': 'NSE:RELIANCE', 
        'TCS': 'NSE:TCS', 
        'INFOSYS': 'NSE:INFY', 
        'HDFC BANK': 'NSE:HDFCBANK', 
        'ICICI BANK': 'NSE:ICICIBANK', 
        'STATE BANK OF INDIA': 'NSE:SBIN', 
        'AXIS BANK': 'NSE:AXISBANK', 
        'KOTAK MAHINDRA BANK': 'NSE:KOTAKBANK', 
        'ITC': 'NSE:ITC', 
        'BHARTI AIRTEL': 'NSE:BHARTIARTL', 
        'L&T': 'NSE:LT', 
        'WIPRO': 'NSE:WIPRO', 
        'TATA MOTORS': 'NSE:TATAMOTORS', 
        'TATA STEEL': 'NSE:TATASTEEL', 
        'TATA POWER': 'NSE:TATAPOWER', 
        'TATA CONSUMER': 'NSE:TATACONSUM', 
        'ADANI ENTERPRISES': 'NSE:ADANIENT', 
        'ADANI PORTS': 'NSE:ADANIPORTS', 
        'ADANI POWER': 'NSE:ADANIPOWER', 
        'ADANI GREEN': 'NSE:ADANIGREEN', 
        'HCL TECHNOLOGIES': 'NSE:HCLTECH', 
        'SUN PHARMA': 'NSE:SUNPHARMA', 
        'ASIAN PAINTS': 'NSE:ASIANPAINT', 
        'BAJAJ FINANCE': 'NSE:BAJFINANCE', 
        'MARUTI SUZUKI': 'NSE:MARUTI', 
        'ULTRATECH CEMENT': 'NSE:ULTRACEMCO',
        'POWER GRID': 'NSE:POWERGRID',
        'TITAN': 'NSE:TITAN',
        'NESTLE INDIA': 'NSE:NESTLEIND',
        'JSW STEEL': 'NSE:JSWSTEEL',
        'ONGC': 'NSE:ONGC',
        'COAL INDIA': 'NSE:COALINDIA',
        'GRASIM': 'NSE:GRASIM',
        'NTPC': 'NSE:NTPC',
        'HINDALCO': 'NSE:HINDALCO',
        'BPCL': 'NSE:BPCL',
        'HERO MOTOCORP': 'NSE:HEROMOTOCO',
        'EICHER MOTORS': 'NSE:EICHERMOT',
        'APOLLO HOSPITALS': 'NSE:APOLLOHOSP',
        'BAJAJ AUTO': 'NSE:BAJAJ-AUTO',
        'CIPLA': 'NSE:CIPLA',
        'DIVIS LAB': 'NSE:DIVISLAB',
        'DR REDDYS': 'NSE:DRREDDY',
        'INDUSIND BANK': 'NSE:INDUSINDBK',
        'BRITANNIA': 'NSE:BRITANNIA'
      };
      return imap[upperAsset] || imap[asset] || `NSE:${upperAsset.replace(/\s/g, '')}`;
    }
    if (category === 'Stocks') {
      const smap: Record<string, string> = { 
        'RELIANCE': 'NSE:RELIANCE', 
        'TCS': 'NSE:TCS', 
        'INFOSYS': 'NSE:INFY', 
        'HDFC BANK': 'NSE:HDFCBANK', 
        'ICICI BANK': 'NSE:ICICIBANK', 
        'STATE BANK OF INDIA': 'NSE:SBIN', 
        'AXIS BANK': 'NSE:AXISBANK', 
        'KOTAK MAHINDRA BANK': 'NSE:KOTAKBANK', 
        'ITC': 'NSE:ITC', 
        'BHARTI AIRTEL': 'NSE:BHARTIARTL', 
        'L&T': 'NSE:LT', 
        'WIPRO': 'NSE:WIPRO', 
        'TATA MOTORS': 'NSE:TATAMOTORS', 
        'TATA STEEL': 'NSE:TATASTEEL', 
        'TATA POWER': 'NSE:TATAPOWER', 
        'TATA CONSUMER': 'NSE:TATACONSUM', 
        'ADANI ENTERPRISES': 'NSE:ADANIENT', 
        'ADANI PORTS': 'NSE:ADANIPORTS', 
        'ADANI POWER': 'NSE:ADANIPOWER', 
        'ADANI GREEN': 'NSE:ADANIGREEN', 
        'HCL TECHNOLOGIES': 'NSE:HCLTECH', 
        'SUN PHARMA': 'NSE:SUNPHARMA', 
        'ASIAN PAINTS': 'NSE:ASIANPAINT', 
        'BAJAJ FINANCE': 'NSE:BAJFINANCE', 
        'MARUTI SUZUKI': 'NSE:MARUTI', 
        'ULTRATECH CEMENT': 'NSE:ULTRACEMCO',
        'POWER GRID': 'NSE:POWERGRID',
        'TITAN': 'NSE:TITAN',
        'NESTLE INDIA': 'NSE:NESTLEIND'
      };
      return smap[upperAsset] || smap[asset] || `NSE:${upperAsset.replace(/\s/g, '')}`;
    }
    if (category === 'Global Stocks') {
      const gsmap: Record<string, string> = { 
        'APPLE': 'NASDAQ:AAPL', 
        'MICROSOFT': 'NASDAQ:MSFT', 
        'GOOGLE': 'NASDAQ:GOOGL', 
        'AMAZON': 'NASDAQ:AMZN', 
        'META': 'NASDAQ:META', 
        'TESLA': 'NASDAQ:TSLA', 
        'NVIDIA': 'NASDAQ:NVDA', 
        'NETFLIX': 'NASDAQ:NFLX', 
        'AMD': 'NASDAQ:AMD', 
        'INTEL': 'NASDAQ:INTC', 
        'ORACLE': 'NYSE:ORCL', 
        'SALESFORCE': 'NYSE:CRM', 
        'UBER': 'NYSE:UBER', 
        'AIRBNB': 'NASDAQ:ABNB' 
      };
      return gsmap[upperAsset] || `NASDAQ:${upperAsset.replace(' ', '')}`;
    }
    if (category === 'Commodities') {
      const cmap: Record<string, string> = { 
        'GOLD': 'TVC:GOLD', 
        'SILVER': 'TVC:SILVER', 
        'CRUDE OIL': 'TVC:USOIL', 
        'NATURAL GAS': 'TVC:NATGAS', 
        'COPPER': 'TVC:COPPER' 
      };
      return cmap[upperAsset] || `TVC:${upperAsset.replace(' ', '')}`;
    }
    if (category === 'Indices') {
      const idmap: Record<string, string> = { 
        'S&P 500': 'SP:SPX', 
        'NASDAQ 100': 'NASDAQ:NDX', 
        'DOW JONES': 'DJ:DJI', 
        'FTSE 100': 'LSE:UKX', 
        'DAX': 'XETR:DAX', 
        'NIKKEI 225': 'OSE:NI225',
        'US30': 'CURRENCYCOM:US30',
        'NAS100': 'CURRENCYCOM:US100',
        'SPX500': 'CURRENCYCOM:US500'
      };
      return idmap[upperAsset] || `CURRENCYCOM:${upperAsset}`;
    }
    return `BINANCE:${upperAsset.replace('/', '')}`; // default fallback
  };

  useEffect(() => {
    // 1. Check if the script is already present on the page or inside window
    if (window.TradingView) {
      setIsScriptLoaded(true);
    } else {
      const existingScript = document.getElementById('tradingview-widget-script');
      if (existingScript) {
        setIsScriptLoaded(true);
      } else {
        const script = document.createElement('script');
        script.id = 'tradingview-widget-script';
        script.src = 'https://s3.tradingview.com/tv.js';
        script.async = true;
        script.onload = () => {
          setIsScriptLoaded(true);
        };
        script.onerror = () => {
          console.error("Failed to load TradingView chart library script.");
        };
        document.body.appendChild(script);
        scriptTagRef.current = script;
      }
    }
  }, []);

  useEffect(() => {
    if (!isScriptLoaded) return;

    const symbol = getTradingViewSymbol(pair);

    function initWidget(sym: string, attempt = 1) {
      if (typeof window.TradingView === 'undefined') {
        if (attempt <= 10) {
          retryTimeoutRef.current = setTimeout(() => {
            initWidget(sym, attempt + 1);
          }, 200);
        }
        return;
      }

      const el = document.getElementById(containerId);
      if (!el) return;

      // Clear any inner HTML of container element to avoid duplicating widget shells
      el.innerHTML = '';

      try {
        const enabledFeatures = ["study_templates"];
        if (!showDrawingTools) {
          enabledFeatures.push("side_toolbar_in_popup_only");
        }

        const widgetOptions: any = {
          "autosize": true,
          "symbol": sym,
          "interval": timeframe,
          "timezone": "Asia/Kolkata",
          "theme": "light",
          "style": "1",
          "locale": "en",
          "enable_publishing": false,
          "allow_symbol_change": true,
          "backgroundColor": "#FFFFFF",
          "gridColor": "#FED7AA",
          "hide_top_toolbar": hideTopToolbar,
          "hide_legend": false,
          "hide_side_toolbar": false,
          "save_image": true,
          "container_id": containerId,
          "hide_volume": true,
          "support_host": "https://www.tradingview.com",
          "disabled_features": [
            "header_symbol_search",
            "header_compare"
          ]
        };

        if (studies && studies.length > 0) {
          widgetOptions.studies = studies;
        }

        new window.TradingView.widget(widgetOptions);
        setIsWidgetCreated(true);
      } catch (err) {
        console.error("TradingView widget initialization error: ", err);
      }
    }

    initWidget(symbol);

    return () => {
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
      }
    };
  }, [isScriptLoaded, pair, timeframe, theme, containerId, JSON.stringify(studies), showDrawingTools]);

  return (
    <div className="w-full h-full relative">
      {/* Skeletons/Indicators while loading */}
      {!isWidgetCreated && (
        <div className="absolute inset-0 flex flex-col justify-between p-6 bg-white  select-none pointer-events-none opacity-40 z-0">
          <div className="flex justify-between items-center h-8">
            <div className="flex gap-2 animate-pulse">
              <div className="h-4 w-12 bg-slate-200  rounded"></div>
              <div className="h-4 w-8 bg-slate-200  rounded"></div>
            </div>
            <div className="h-4 w-16 bg-slate-200  rounded animate-pulse"></div>
          </div>
          <div className="flex-1 grid grid-cols-6 grid-rows-6 gap-2 my-4 select-none opacity-10">
            {Array.from({ length: 36 }).map((_, i) => (
              <div key={i} className="border border-slate-100  rounded-sm"></div>
            ))}
          </div>
          <div className="flex justify-between h-4 mt-auto">
            {['09:30', '11:00', '13:00', '15:00', '17:00'].map(t => (
              <span key={t} className="text-[9px] font-mono text-slate-350">{t}</span>
            ))}
          </div>
        </div>
      )}
      <div id={containerId} className="w-full h-full z-10" />
    </div>
  );
}
