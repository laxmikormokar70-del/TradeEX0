import React, { useState, useEffect } from "react";
import {
  useTradingContext,
  formatUSD,
  formatINR,
  getInstrumentConfig,
  getTradingViewLink,
} from "../store/TradingContext";
import {
  X,
  ChevronDown,
  CheckCircle,
  TrendingUp,
  TrendingDown,
  Info,
  SlidersHorizontal,
  Layers,
  AlertCircle,
  Plus,
  Sparkles,
  Target,
  ShieldAlert,
  Star,
  MoreVertical,
  LogIn,
  Scale,
  Trash2,
  ArrowUpDown,
  User,
  Wallet,
  Sun,
  Moon,
  Clock,
  ArrowUpRight,
  ArrowDownRight,
  RefreshCw,
  BarChart2,
  Bell,
  HelpCircle,
  Settings,
  Calculator,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { useAuth } from "../store/AuthContext";
import UnrealizedPNLPulse from "../components/UnrealizedPNLPulse";
import AnimatedPriceBox from "../components/AnimatedPriceBox";
import MarketSelectorModal from "../components/MarketSelectorModal";
import CalculatorModal from "../components/CalculatorModal";
import FeesModal from "../components/FeesModal";
import TpSlModal from "../components/TpSlModal";
import TradingChart from "../components/TradingChart";
import LightweightTradingChart from "../components/LightweightTradingChart";
import DeltaPositionPanel from "../components/DeltaPositionPanel";

export default function TradePage({
  setActiveTab,
}: {
  setActiveTab?: (tab: string) => void;
}) {
  const { user, setIsProfileOpen, profile } = useAuth();
  const {
    accountMode,
    setAccountMode,
    accountBalance,
    selectedPair,
    setSelectedPair,
    theme,
    toggleTheme,
    currentPrices,
    tickers,
    executeTrade,
    positions,
    closePosition,
    preloadedSide,
    setPreloadedSide,
    positionHistory,
    addFunds,
    pendingOrders,
    orderHistory,
    tradeHistory,
    cancelPendingOrder,
  } = useTradingContext();

  const currencyPreference = profile?.currencyPreference || localStorage.getItem('currency_preference') || 'USDT';

  const formatUSD = (val: number) => {
    if (val === undefined || val === null || isNaN(val)) {
      return currencyPreference === 'INR' ? '₹0.00' : '$0.00';
    }
    return currencyPreference === 'INR' 
      ? formatINR(val * 85) 
      : new Intl.NumberFormat('en-US', { 
          style: 'currency', 
          currency: 'USD', 
          minimumFractionDigits: 2, 
          maximumFractionDigits: 2 
        }).format(val);
  };

  const getPerpetualDesc = (pair: string) => {
    if (pair.includes("BTC")) return "Bitcoin Perpetual";
    if (pair.includes("ETH")) return "Ethereum Perpetual";
    if (pair.includes("SOL")) return "Solana Perpetual";
    if (pair.includes("BNB")) return "BNB Perpetual";
    if (pair.includes("XRP")) return "Ripple Perpetual";
    if (pair.includes("ADA")) return "Cardano Perpetual";
    if (pair.includes("DOGE")) return "Dogecoin Perpetual";
    return `${pair.replace("USDT", "").replace("USD", "")} Perpetual`;
  };

  const formatCompactUSD = (val: number) => {
    const isINR = currencyPreference === 'INR';
    const multiplier = isINR ? 85 : 1;
    const prefix = isINR ? '₹' : '$';
    const converted = val * multiplier;
    if (converted >= 1e9) return `${prefix}${(converted / 1e9).toFixed(1)}B`;
    if (converted >= 1e6) return `${prefix}${(converted / 1e6).toFixed(1)}M`;
    if (converted >= 1e3) return `${prefix}${(converted / 1e3).toFixed(1)}K`;
    return `${prefix}${converted.toFixed(2)}`;
  };

  // State Declarations
  const [side, setSide] = useState<"long" | "short">("long");
  const [leverage, setLeverage] = useState(50);
  const [orderType, setOrderType] = useState<"Market" | "Limit">("Market");
  const [quantityStr, setQuantityStr] = useState("1");
  const [customPrice, setCustomPrice] = useState<number | null>(null);
  const [chartTimeframe, setChartTimeframe] = useState("5");
  const [showDrawingTools, setShowDrawingTools] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  // Mobile Chart Visibility Toggle
  const [showMobileChart, setShowMobileChart] = useState(false);

  // Custom Popover Menus
  const [showOrderTypeMenu, setShowOrderTypeMenu] = useState(false);
  const [showQuantityUnitMenu, setShowQuantityUnitMenu] = useState(false);
  const [quantityUnit, setQuantityUnit] = useState<"Lot" | "Units">("Lot");

  // TP/SL toggler & inputs
  const [addTpSl, setAddTpSl] = useState(false);
  const [reduceOnly, setReduceOnly] = useState(false);
  const [tpPriceStr, setTpPriceStr] = useState("");
  const [slPriceStr, setSlPriceStr] = useState("");

  // Active subtab for desktop & mobile positions panel
  // Supports position & closed log tabs
  const [tradeSubTab, setTradeSubTab] = useState<
    | "positions"
    | "open-orders"
    | "stop-orders"
    | "fills"
    | "order-history"
    | "history"
  >("positions");
  const [showLeverageModal, setShowLeverageModal] = useState(false);
  const [isRefreshingCost, setIsRefreshingCost] = useState(false);

  // Notifications or alert visual state
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);
  const [orderBookSeed, setOrderBookSeed] = useState(0);

  // Modals state
  const [showTpSlModal, setShowTpSlModal] = useState(false);
  const [showMarketSelector, setShowMarketSelector] = useState(false);
  const [showCalculatorModal, setShowCalculatorModal] = useState(false);
  const [showFeesModal, setShowFeesModal] = useState(false);
  const [countdownStr, setCountdownStr] = useState("06h:20m:10s");

  const [favorites, setFavorites] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem("favorites_trading_symbols");
      return saved ? JSON.parse(saved) : ["BTCUSD", "ETHUSD", "SOLUSD"];
    } catch {
      return ["BTCUSD", "ETHUSD", "SOLUSD"];
    }
  });

  // Recent completed transactions inside Trade panel
  const [recentTransactions, setRecentTransactions] = useState<any[]>([
    {
      id: "tx-1",
      pair: "ETHUSD",
      type: "Buy Long",
      amount: "1.50",
      price: 1673.8,
      status: "Filled",
      time: "10:42:15",
      date: "Jun 14",
    },
    {
      id: "tx-2",
      pair: "BTCUSD",
      type: "Sell Short",
      amount: "0.05",
      price: 68512.4,
      status: "Completed",
      time: "10:14:32",
      date: "Jun 14",
    },
    {
      id: "tx-3",
      pair: "SOLUSD",
      type: "Buy Long",
      amount: "12.00",
      price: 142.1,
      status: "Rejected",
      time: "08:11:04",
      date: "Jun 14",
    },
  ]);

  // Clean Display Pair Name (e.g. BTCUSD -> BTC/USD)
  const cleanDisplayPair = selectedPair === 'Gold' ? 'XAU/USD' : (selectedPair.endsWith('USD') && !selectedPair.includes('/') ? selectedPair.slice(0, -3) + '/USD' : selectedPair.replace("USDT", "/USD"));

  // Decrement funding countdown timer
  useEffect(() => {
    let totalSeconds = 6 * 3600 + 20 * 60 + 10;
    const interval = setInterval(() => {
      totalSeconds = totalSeconds > 0 ? totalSeconds - 1 : 8 * 3600;
      const hours = Math.floor(totalSeconds / 3600);
      const minutes = Math.floor((totalSeconds % 3600) / 60);
      const seconds = totalSeconds % 60;
      setCountdownStr(
        `${hours.toString().padStart(2, "0")}h:${minutes.toString().padStart(2, "0")}m:${seconds.toString().padStart(2, "0")}s`,
      );
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Sync favorites to localStorage
  useEffect(() => {
    localStorage.setItem(
      "favorites_trading_symbols",
      JSON.stringify(favorites),
    );
  }, [favorites]);

  const toggleFavorite = () => {
    if (favorites.includes(selectedPair)) {
      setFavorites(favorites.filter((f) => f !== selectedPair));
    } else {
      setFavorites([...favorites, selectedPair]);
    }
  };

  const isFavorite = favorites.includes(selectedPair);

  // Synchronize dynamic preloaded order intentions (e.g. from chart page)
  useEffect(() => {
    if (preloadedSide) {
      setSide(preloadedSide);
      setPreloadedSide(null);
    }
  }, [preloadedSide]);

  // Sync custom input price baseline rate if selectedPair changes
  const price =
    currentPrices[selectedPair] || tickers[selectedPair]?.lastPrice || 0;
  const ticker = tickers[selectedPair];
  const isPositive = (ticker?.priceChangePercent || 0) >= 0;

  // Calculate dynamic percents based on current price & leverage
  const basePriceVal = customPrice || price;
  const tpPercent =
    tpPriceStr && basePriceVal
      ? Math.round(
          Math.abs((parseFloat(tpPriceStr) - basePriceVal) / basePriceVal) *
            100 *
            leverage,
        )
      : 0;

  const slPercent =
    slPriceStr && basePriceVal
      ? Math.round(
          Math.abs((parseFloat(slPriceStr) - basePriceVal) / basePriceVal) *
            100 *
            leverage,
        )
      : 0;

  const handleQuickSlTpPercent = (type: "tp" | "sl", pct: number) => {
    if (!basePriceVal) return;
    const change = (basePriceVal * (pct / 100)) / leverage;
    if (type === "tp") {
      const tp =
        side === "long" ? basePriceVal + change : basePriceVal - change;
      setTpPriceStr(tp.toFixed(1));
    } else {
      const sl =
        side === "long" ? basePriceVal - change : basePriceVal + change;
      setSlPriceStr(sl.toFixed(1));
    }
  };

  useEffect(() => {
    if (price > 0 && customPrice === null) {
      setCustomPrice(price);
    }
  }, [selectedPair, price]);

  // Seed simulator for order book price ticks
  useEffect(() => {
    const timer = setInterval(() => {
      setOrderBookSeed((prev) => prev + 1);
    }, 1200);
    return () => clearInterval(timer);
  }, []);

  const quantity = parseFloat(quantityStr) || 0;
  const executionPrice =
    orderType === "Limit" && customPrice ? customPrice : price;

  // Dynamic instrument config detection
  const instrumentConfig = getInstrumentConfig(
    selectedPair,
    tickers[selectedPair]?.category,
    tickers
  );
  const activeMultiplier = instrumentConfig.lotMultiplier;
  const minQty = instrumentConfig.minQuantity;

  const tradeSizeInCoins =
    quantityUnit === "Lot" ? quantity * activeMultiplier : quantity;

  // Calculate margin based on Daily Opening Price (Fixed for the day)
  const basePriceForMargin = tickers[selectedPair]?.openingPrice || price;
  let calculatedMargin =
    basePriceForMargin && tradeSizeInCoins
      ? (basePriceForMargin * tradeSizeInCoins) / leverage
      : 0;
  if (calculatedMargin > 0 && calculatedMargin < 0.05) {
    calculatedMargin = 0.05;
  }
  const isOverMargin = calculatedMargin > accountBalance.usd;

  // Real-time Estimated PNL metrics
  const getEstimatedPnl = () => {
    if (!tradeSizeInCoins || !executionPrice) return { tpPnl: 0, slPnl: 0 };
    const tpPrice = parseFloat(tpPriceStr) || 0;
    const slPrice = parseFloat(slPriceStr) || 0;

    let tpPnl = 0;
    let slPnl = 0;

    if (tpPrice > 0) {
      tpPnl =
        side === "long"
          ? (tpPrice - executionPrice) * tradeSizeInCoins
          : (executionPrice - tpPrice) * tradeSizeInCoins;
    }
    if (slPrice > 0) {
      slPnl =
        side === "long"
          ? (slPrice - executionPrice) * tradeSizeInCoins
          : (executionPrice - slPrice) * tradeSizeInCoins;
    }

    return { tpPnl, slPnl };
  };

  const { tpPnl, slPnl } = getEstimatedPnl();

  const getRiskRewardRatio = () => {
    if (!tpPnl || !slPnl || slPnl === 0) return "--";
    const profit = Math.abs(tpPnl);
    const loss = Math.abs(slPnl);
    const ratio = profit / loss;
    return `1:${ratio.toFixed(1)}`;
  };

  // Liquidation Price calculation helper
  const getLiquidationPrice = () => {
    if (!executionPrice) return 0;
    if (side === "long") {
      return executionPrice * (1 - 0.9 / leverage);
    } else {
      return executionPrice * (1 + 0.9 / leverage);
    }
  };

  // Adjust input rates step indicators
  const getTickSize = () => {
    if (price > 10000) return 10;
    if (price > 1000) return 1;
    if (price > 100) return 0.1;
    return 0.01;
  };

  const handleOrderSubmit = () => {
    if (quantity < minQty) {
      setFormError(`Minimum quantity is ${minQty} ${quantityUnit}.`);
      setTimeout(() => setFormError(null), 3000);
      return;
    }
    if (isOverMargin) {
      setFormError("❌ Insufficient Margin Asset Balance!");
      setTimeout(() => setFormError(null), 3000);
      return;
    }

    const tpValue = addTpSl && tpPriceStr ? parseFloat(tpPriceStr) : undefined;
    const slValue = addTpSl && slPriceStr ? parseFloat(slPriceStr) : undefined;

    if (addTpSl) {
      if (tpValue && tpValue <= 0) {
        setFormError("Invalid Take Profit target price.");
        setTimeout(() => setFormError(null), 3000);
        return;
      }
      if (slValue && slValue <= 0) {
        setFormError("Invalid Stop Loss trigger price.");
        setTimeout(() => setFormError(null), 3000);
        return;
      }
    }

    // Submit using final tradeSizeInCoins
    executeTrade(
      side,
      tradeSizeInCoins,
      leverage,
      orderType,
      executionPrice,
      tpValue,
      slValue,
    );

    // Append to dynamic completed transactions log list
    const newTx = {
      id: `tx-${Date.now()}`,
      pair: selectedPair,
      type: side === "long" ? "Buy Long" : "Sell Short",
      amount: quantityStr,
      price: executionPrice,
      status: "Filled",
      time: new Date().toLocaleTimeString(undefined, {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      }),
      date: new Date().toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
      }),
    };
    setRecentTransactions((prev) => [newTx, ...prev]);

    setFormSuccess(
      `Order Filled: Successfully entered ${side.toUpperCase()} position standard lots!`,
    );
    setTimeout(() => setFormSuccess(null), 4000);

    setQuantityStr("1");
    setTpPriceStr("");
    setSlPriceStr("");
    setAddTpSl(false);
  };

  const triggerConfirmFlow = (orderSide: "long" | "short") => {
    setSide(orderSide);
    if (quantity < minQty) {
      setFormError(`Minimum quantity is ${minQty} ${quantityUnit}.`);
      setTimeout(() => setFormError(null), 3000);
      return;
    }
    if (isOverMargin) {
      setFormError("❌ Insufficient Margin Asset Balance!");
      setTimeout(() => setFormError(null), 3000);
      return;
    }
    const tpValue = addTpSl && tpPriceStr ? parseFloat(tpPriceStr) : undefined;
    const slValue = addTpSl && slPriceStr ? parseFloat(slPriceStr) : undefined;
    if (addTpSl) {
      if (tpValue && tpValue <= 0) {
        setFormError("Invalid Take Profit target price.");
        setTimeout(() => setFormError(null), 3000);
        return;
      }
      if (slValue && slValue <= 0) {
        setFormError("Invalid Stop Loss trigger price.");
        setTimeout(() => setFormError(null), 3000);
        return;
      }
    }
    setShowConfirmModal(true);
  };

  const handleClosePositionWithTx = (
    posId: string,
    pair: string,
    side: string,
    qty: number,
    price: number,
  ) => {
    closePosition(posId);

    const closedTx = {
      id: `tx-close-${Date.now()}`,
      pair: pair,
      type: "Close",
      amount: qty.toString(),
      price: price,
      status: "Completed",
      time: new Date().toLocaleTimeString(undefined, {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      }),
      date: new Date().toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
      }),
    };
    setRecentTransactions((prev) => [closedTx, ...prev]);
    setFormSuccess(`Settle Position Closed on ${pair}`);
    setTimeout(() => setFormSuccess(null), 3000);
  };

  const handleOrderBookPriceClick = (clickedPrice: number) => {
    setOrderType("Limit");
    setCustomPrice(clickedPrice);
    setFormSuccess(`Target Price point loaded: ${formatUSD(clickedPrice)}`);
    setTimeout(() => setFormSuccess(null), 2000);
  };

  const handleQuickLeverageSelect = (levValue: number) => {
    setLeverage(levValue);
    setShowLeverageModal(false);
  };

  const handleModifyQuantity = (change: number) => {
    const current = parseFloat(quantityStr) || 0;
    const nextVal = Math.max(minQty, current + change * minQty);

    // Formatting based on minimum quantity precision
    const precision =
      minQty < 1 ? minQty.toString().split(".")[1]?.length || 1 : 0;
    setQuantityStr(nextVal.toFixed(precision));
  };

  const handleSnapPercentClick = (percent: number) => {
    const basePriceForMargin = tickers[selectedPair]?.openingPrice || price;
    if (basePriceForMargin <= 0 || !leverage) return;

    // Allocate exactly the percent of our wallet as margin
    const bufferFactor = percent === 100 ? 0.999 : 1.0;
    const targetMargin = accountBalance.usd * (percent / 100) * bufferFactor;

    // tradeSizeInCoins = (targetMargin * leverage) / basePriceForMargin
    const tradeSizeInCoins = (targetMargin * leverage) / basePriceForMargin;

    let targetQty = 0;
    if (quantityUnit === "Lot") {
      targetQty = tradeSizeInCoins / activeMultiplier;
    } else {
      targetQty = tradeSizeInCoins;
    }

    const precision =
      minQty < 1 ? minQty.toString().split(".")[1]?.length || 1 : 0;

    const formattedQuantity = Math.max(minQty, targetQty).toFixed(precision);
    setQuantityStr(formattedQuantity);
  };

  const triggerRefreshEstimatedCost = () => {
    setIsRefreshingCost(true);
    setTimeout(() => setIsRefreshingCost(false), 800);
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
    });
  };

  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString(undefined, {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  };

  const renderAssetLogo = (pair: string) => {
    const cleanName = pair.replace("USDT", "").replace("USD", "");
    let colors = "from-amber-500 to-orange-600 shadow-amber-500/10";
    if (pair.includes("ETH")) {
      colors = "from-indigo-500 to-violet-600 shadow-indigo-500/10";
    } else if (pair.includes("SOL")) {
      colors = "from-emerald-400 to-teal-600 shadow-emerald-500/10";
    } else if (pair.length > 7) {
      colors = "from-fuchsia-500 to-pink-600 shadow-fuchsia-500/10";
    }
    return (
      <div
        className={`w-8 h-8 rounded-xl bg-gradient-to-br ${colors} flex items-center justify-center text-white text-xs font-semibold tracking-tight shrink-0 shadow-md`}
      >
        {cleanName.substring(0, 3)}
      </div>
    );
  };

  const generateOrderBookData = () => {
    const asks: { price: number; qty: number; total: number }[] = [];
    const bids: { price: number; qty: number; total: number }[] = [];

    if (price === 0) return { asks, bids };

    const spreadFraction = 0.0003;
    const tick = price * 0.00015;

    let cumulativeAsk = 0;
    // Generated 6 ask prices
    for (let i = 6; i >= 1; i--) {
      const p = price * (1 + spreadFraction) + (i - 1) * tick;
      const noise = Math.sin(orderBookSeed + i) * 1.5;
      const qty = Math.max(10.15, 120 + i * i * 4.8 + noise);
      cumulativeAsk += qty;
      asks.push({
        price: Math.round(p * 100) / 100,
        qty,
        total: cumulativeAsk,
      });
    }

    let cumulativeBid = 0;
    // Generated 6 bid prices
    for (let i = 1; i <= 6; i++) {
      const p = price * (1 - spreadFraction) - (i - 1) * tick;
      const noise = Math.cos(orderBookSeed + i) * 1.8;
      const qty = Math.max(9.5, 115 + (7 - i) * 5.2 + noise);
      cumulativeBid += qty;
      bids.push({
        price: Math.round(p * 100) / 100,
        qty,
        total: cumulativeBid,
      });
    }

    return { asks, bids };
  };

  const { asks: mobileAsks, bids: mobileBids } = generateOrderBookData();
  const maxCumulativeDepth =
    Math.max(
      mobileAsks.reduce((max, x) => Math.max(max, x.total), 0),
      mobileBids.reduce((max, x) => Math.max(max, x.total), 0),
    ) || 1;

  if (profile?.status === 'suspended') {
    return (
      <div className="flex flex-col min-h-screen relative w-full bg-[#faf5ef] text-slate-800">
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center max-w-md mx-auto">
          <div className="w-16 h-16 bg-red-50 border border-red-101 rounded-full flex items-center justify-center text-red-500 animate-pulse mb-6">
            <AlertCircle size={28} />
          </div>
          <h2 className="text-xl font-black text-slate-900 mb-2">Trading Terminal Suspended</h2>
          <p className="text-xs text-slate-500 leading-relaxed mb-6">
            Your trading account is currently suspended due to verification flags or policy restriction. Buying, selling, or position closures are disabled. Please contact our support desk to resolve this.
          </p>
          <button 
            onClick={() => {
              if (setIsProfileOpen) setIsProfileOpen(true);
            }}
            className="px-6 py-2.5 bg-red-50 hover:bg-red-100 text-red-600 border border-red-100 rounded-xl font-bold text-xs uppercase tracking-wider transition-colors cursor-pointer"
          >
            Open Helpdesk Desk
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`flex flex-col min-h-screen relative w-full bg-bg-base text-text-main transition-all duration-300`}
    >
      {/* Action alerts overlay notification */}
      <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 w-full max-w-md px-4 pointer-events-none">
        <AnimatePresence>
          {formError && (
            <motion.div
              initial={{ opacity: 0, y: -20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.95 }}
              className="bg-rose-50 border border-rose-200   p-4 rounded-2xl shadow-xl text-sm text-rose-700  font-medium flex items-start gap-2.5 pointer-events-auto"
            >
              <AlertCircle className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
              <div className="flex-1">
                <span className="block font-semibold uppercase text-[10px] tracking-wider text-rose-500">
                  Execution Error
                </span>
                {formError}
              </div>
              <button
                onClick={() => setFormError(null)}
                className="text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X size={16} />
              </button>
            </motion.div>
          )}

          {formSuccess && (
            <motion.div
              initial={{ opacity: 0, y: -20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.95 }}
              className="bg-emerald-50 border border-emerald-250   p-4 rounded-2xl shadow-xl text-sm text-emerald-800  font-medium flex items-start gap-2.5 pointer-events-auto"
            >
              <CheckCircle className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
              <div className="flex-1">
                <span className="block font-semibold uppercase text-[10px] tracking-wider text-emerald-600 font-mono">
                  Confirmed Block
                </span>
                {formSuccess}
              </div>
              <button
                onClick={() => setFormSuccess(null)}
                className="text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X size={16} />
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ========================================================================
          1. SYSTEM DESKTOP SYSTEM LAYOUT (LARGE VIEWPORTS)
          ======================================================================== */}
      <div
        className="hidden lg:flex flex-col w-full min-h-screen px-4 pt-3 pb-20 gap-4 relative"
        style={{
          background:
            "linear-gradient(180deg, rgba(255,145,0,0.06) 0%, rgba(255,145,0,0.01) 100%)",
        }}
      >
        {/* Upper Ribbon Header */}
        <div className="relative bg-white/95 backdrop-blur-md rounded-[14px] border border-orange-200 shadow-md px-6 py-4 flex items-center justify-between gap-6 select-none w-full max-w-[1920px] mx-auto z-10">
          {/* Left section: Selector & Favorite */}
          <div className="flex items-center gap-4 shrink-0">
            <button
              onClick={() => setShowMarketSelector(true)}
              className="group flex items-center gap-3 px-4 py-2 hover:bg-orange-50 transition-all rounded-[14px] border border-orange-200 shadow-sm select-none text-left"
            >
              {renderAssetLogo(selectedPair)}
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="text-[20px] font-semibold tracking-tight text-slate-900 font-mono leading-none">
                    {cleanDisplayPair}
                  </span>
                  <ChevronDown
                    size={18}
                    className="text-orange-500 transition-transform group-hover:translate-y-0.5"
                  />
                </div>
                <span className="text-[14px] text-slate-500 font-medium block mt-1">
                  {getPerpetualDesc(selectedPair)}
                </span>
              </div>
            </button>

            <button
              onClick={toggleFavorite}
              className={`p-3 rounded-[14px] active:scale-95 transition-all bg-white border shadow-sm hover:text-amber-500 hover:bg-amber-50 ${isFavorite ? "text-amber-500 border-amber-300" : "text-slate-400 border-slate-200"}`}
            >
              <Star
                size={18}
                fill={isFavorite ? "#f59e0b" : "none"}
                strokeWidth={2.5}
              />
            </button>
          </div>

          {/* Center Section: Premium Statistics - Redesigned for Maximum Clarity */}
          <div className="flex items-center gap-5 flex-1 overflow-x-auto no-scrollbar px-2 divide-x divide-slate-200/60">
            {/* Last Price */}
            <div className="flex flex-col shrink-0 pl-0 whitespace-nowrap min-w-[70px]">
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-0.5 leading-none">
                Last Price
              </span>
              <span
                className={`text-[15px] font-mono font-bold leading-none ${isPositive ? "text-emerald-600" : "text-rose-500"}`}
              >
                {price ? formatUSD(price) : "--"}
              </span>
            </div>

            {/* 24h Change */}
            <div className="flex flex-col shrink-0 pl-5 whitespace-nowrap min-w-[70px]">
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-0.5 leading-none">
                24h Change
              </span>
              <span
                className={`text-[14px] font-mono font-bold leading-none flex items-center gap-0.5 ${isPositive ? "text-emerald-600" : "text-rose-500"}`}
              >
                {isPositive ? "+" : ""}
                {ticker?.priceChangePercent?.toFixed(2)}%
              </span>
            </div>

            {/* Index Price */}
            <div className="flex flex-col shrink-0 pl-5 whitespace-nowrap">
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-0.5 leading-none">
                Index Price
              </span>
              <span className="text-[14px] font-mono text-slate-700 font-bold leading-none">
                {price ? formatUSD(price * 1.0001) : "--"}
              </span>
            </div>

            {/* 24h High */}
            <div className="flex flex-col shrink-0 pl-5 whitespace-nowrap">
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-0.5 leading-none">
                24h High
              </span>
              <span className="text-[14px] font-mono text-slate-700 font-bold leading-none">
                {ticker?.dailyHigh ? formatUSD(ticker.dailyHigh) : "--"}
              </span>
            </div>

            {/* 24h Low */}
            <div className="flex flex-col shrink-0 pl-5 whitespace-nowrap">
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-0.5 leading-none">
                24h Low
              </span>
              <span className="text-[14px] font-mono text-slate-700 font-bold leading-none">
                {ticker?.dailyLow ? formatUSD(ticker.dailyLow) : "--"}
              </span>
            </div>

            {/* 24H Volume */}
            <div className="flex flex-col shrink-0 pl-5 whitespace-nowrap">
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-0.5 leading-none">
                24h Vol
              </span>
              <span className="text-[14px] font-mono text-slate-700 font-bold leading-none">
                {formatCompactUSD(ticker?.volume || 0)}
              </span>
            </div>

            {/* Lot Value */}
            <div className="flex flex-col shrink-0 pl-5 whitespace-nowrap">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1 leading-none">
                Lot Value
              </span>
              <span className="text-[15px] font-mono text-[#FF8A00] font-bold leading-none">
                1 Lot = {ticker?.lotValue || 1} {ticker?.category === 'Crypto' || ticker?.symbol.endsWith('USD') ? ticker.symbol.replace('USDT', '').replace('USD', '') : 'Units'}
              </span>
            </div>

            {/* Trading Status */}
            <div className="flex flex-col shrink-0 pl-5 whitespace-nowrap">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1 leading-none">
                Market Status
              </span>
              <span className="text-[15px] font-sans text-green-600 font-bold leading-none flex items-center gap-1">
                <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                Live: Open
              </span>
            </div>

            {/* OI */}
            <div className="flex flex-col shrink-0 pl-5 whitespace-nowrap">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1 leading-none">
                Open Interest
              </span>
              <span className="text-[15px] font-mono text-slate-700 font-bold leading-none">
                {formatCompactUSD((ticker?.volume || 0) * 0.45)}
              </span>
            </div>

            {/* Funding Rate */}
            <div className="flex flex-col shrink-0 pl-5 pr-2 whitespace-nowrap">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1 leading-none">
                Funding / Countdown
              </span>
              <span className="text-[15px] font-mono text-slate-700 font-bold leading-none">
                0.0100% /{" "}
                <span className="text-orange-500">{countdownStr}</span>
              </span>
            </div>
          </div>

          {/* User Account Switcher in ribbon */}
          <div className="flex items-center gap-3 shrink-0">
             <button 
                onClick={() => setAccountMode(accountMode === 'demo' ? 'real' : 'demo')}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl border transition-all ${accountMode === 'real' ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-amber-50 border-amber-200 text-amber-700'}`}
             >
                <div className={`w-2 h-2 rounded-full animate-pulse ${accountMode === 'real' ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                <span className="text-[12px] font-bold uppercase tracking-wider">{accountMode === 'real' ? 'Real' : 'Demo'}</span>
             </button>
          </div>
        </div>

        {/* Professional 12-Column Grid Layout: Side-by-side Chart and Order Panel, Full-width Positions below */}
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-3 w-full max-w-[1920px] mx-auto pb-8 items-start relative select-none">
          {/* TV Chart: Takes 9 out of 12 columns, order-1 */}
          <div className="col-span-1 xl:col-span-9 order-1 min-w-0 flex flex-col">
            <div className="bg-white rounded-[14px] border border-orange-200 shadow-sm flex flex-col min-h-[720px] h-[720px] relative animate-fadeIn overflow-hidden">
              {/* Elegant header block with display pair and explicit TradingView analysis link */}
              <div className="flex items-center justify-between px-5 py-3 bg-slate-50 border-b border-orange-150/40 select-none shrink-0">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                  <span className="text-xs font-black uppercase text-slate-800 tracking-wider">
                    {cleanDisplayPair} <span className="text-slate-450 font-normal lowercase ml-1">(15m timeframe chart)</span>
                  </span>
                </div>
                <a 
                  href={getTradingViewLink(selectedPair, tickers[selectedPair]?.category || 'Crypto')}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-[11px] font-black text-orange-600 bg-orange-50 hover:bg-orange-100 px-3 py-1.5 rounded-xl border border-orange-100 transition-all shadow-3xs"
                >
                  <span>Open Live TradingView Chart</span>
                  <ArrowUpRight size={13} className="stroke-[3]" />
                </a>
              </div>
              <div className="flex-1 w-full relative">
                <TradingChart
                  pair={selectedPair}
                  timeframe="15"
                  containerId="tv-chart-desktop"
                />
              </div>
            </div>
          </div>

          {/* Positions / Orders / History: Spans all 12 columns on physical Row 2, order-3 */}
          <div className="col-span-1 xl:col-span-12 order-3 w-full flex flex-col animate-fadeIn">
            <div className="bg-white rounded-[14px] border border-orange-300 shadow-sm flex flex-col w-full min-h-[280px]">
              <div className="flex border-b border-brand/10 bg-bg-base  px-5 py-2.5 justify-between items-center shrink-0 rounded-t-[14px] gap-4">
                <div className="flex bg-surface  p-1 border border-brand/35 rounded-full shadow-inner relative justify-start items-center overflow-x-auto no-scrollbar max-w-full md:max-w-[1000px] gap-1 shrink-0 flex-nowrap">
                  {[
                    {
                      id: "positions",
                      label: "Positions",
                      count: positions.length,
                    },
                    {
                      id: "open-orders",
                      label: "Open Orders",
                      count: pendingOrders.filter(
                        (o) => !o.type.includes("Stop"),
                      ).length,
                    },
                    {
                      id: "stop-orders",
                      label: "Stop Orders",
                      count: pendingOrders.filter((o) =>
                        o.type.includes("Stop"),
                      ).length,
                    },
                    { id: "fills", label: "Fills", count: tradeHistory.length },
                    {
                      id: "order-history",
                      label: "Order History",
                      count: orderHistory.length,
                    },
                    {
                      id: "history",
                      label: "Closed Log",
                      count: positionHistory.length,
                    },
                  ].map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => setTradeSubTab(tab.id as any)}
                      className={`relative z-10 px-4 py-2 rounded-full text-[15px] font-bold tracking-tight transition-all flex items-center justify-center gap-1.5 flex-1 min-w-[90px] lg:min-w-[125px] text-center whitespace-nowrap ${
                        tradeSubTab === tab.id
                          ? "text-white bg-[#FF8A00] shadow-md shadow-brand/10"
                          : "text-text-muted hover:text-text-main hover:bg-[#FF863B]/10 rounded-full"
                      }`}
                    >
                      <span>{tab.label}</span>
                      <span className="text-[11px] opacity-90">
                        ({tab.count})
                      </span>
                    </button>
                  ))}
                </div>
                <div className="flex items-center gap-2 text-xs font-bold text-text-muted font-mono bg-bg-sec/50  px-3 py-1.5 rounded-lg border border-brand/10 shrink-0">
                  <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
                  Live Synced
                </div>
              </div>

              {/* Panels rendering workspace */}
              <div className="flex-1 p-5 overflow-y-auto no-scrollbar min-h-0 bg-[#FFFDFB]/40">
                {tradeSubTab === "positions" && <DeltaPositionPanel />}

                {tradeSubTab === "open-orders" &&
                  (pendingOrders.filter((o) => !o.type.includes("Stop"))
                    .length === 0 ? (
                    <div className="flex flex-col items-center justify-center text-center py-20">
                      <div className="w-16 h-16 bg-bg-sec  rounded-full flex items-center justify-center text-orange-500 mb-4 animate-pulse">
                        <Clock size={28} />
                      </div>
                      <h3 className="text-[16px] font-bold text-slate-705 ">
                        No open orders
                      </h3>
                      <p className="text-[14px] text-slate-400 mt-2 max-w-[340px]">
                        Any limit buy or sell orders you initiate will be listed
                        here until executed or cancelled manually.
                      </p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="bg-slate-50  font-bold text-[#FF7072] border-b border-slate-100  uppercase tracking-wider text-[11px]">
                            <th className="p-4 rounded-tl-xl">Market</th>
                            <th className="p-4">Type</th>
                            <th className="p-4">Side</th>
                            <th className="p-4">Leverage</th>
                            <th className="p-4 text-right">Order Price</th>
                            <th className="p-4 text-right">Quantity</th>
                            <th className="p-4 text-right">Total Est. (USD)</th>
                            <th className="p-4 text-center">Timestamp</th>
                            <th className="p-4 text-center rounded-tr-xl">
                              Action
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100  bg-surface">
                          {pendingOrders
                            .filter((o) => !o.type.includes("Stop"))
                            .map((o) => (
                              <tr
                                key={`open-ord-${o.id}`}
                                className="hover:bg-slate-50/40  text-[16px] text-text-main"
                              >
                                <td className="p-4 font-bold flex items-center gap-2">
                                  {renderAssetLogo(o.pair)}
                                  <span className="font-mono">{o.pair}</span>
                                </td>
                                <td className="p-4 font-semibold text-text-muted">
                                  {o.type}
                                </td>
                                <td className="p-4 select-none">
                                  <span
                                    className={`px-2.5 py-1 rounded text-[11px] font-semibold uppercase tracking-wider ${
                                      o.side === "long"
                                        ? "bg-success/10 text-success"
                                        : "bg-danger/10 text-danger"
                                    }`}
                                  >
                                    {o.side === "long"
                                      ? "BUY LONG"
                                      : "SELL SHORT"}
                                  </span>
                                </td>
                                <td className="p-4 font-mono text-text-muted">
                                  {o.leverage}x
                                </td>
                                <td className="p-4 text-right font-mono font-bold">
                                  {formatUSD(o.price)}
                                </td>
                                <td className="p-4 text-right font-mono font-bold">
                                  {o.quantity.toFixed(4)} Lots
                                </td>
                                <td className="p-4 text-right font-mono text-text-muted">
                                  {formatUSD(o.price * o.quantity)}
                                </td>
                                <td className="p-4 text-center font-mono text-text-muted text-xs">
                                  {formatDate(o.timestamp)}{" "}
                                  {formatTime(o.timestamp)}
                                </td>
                                <td className="p-4 text-center">
                                  <button
                                    onClick={() => cancelPendingOrder(o.id)}
                                    className="p-1.5 hover:bg-danger/10 text-text-muted hover:text-danger rounded-lg transition-colors inline-flex items-center justify-center-95"
                                    title="Cancel Order"
                                  >
                                    <Trash2 size={16} />
                                  </button>
                                </td>
                              </tr>
                            ))}
                        </tbody>
                      </table>
                    </div>
                  ))}

                {tradeSubTab === "stop-orders" &&
                  (pendingOrders.filter((o) => o.type.includes("Stop"))
                    .length === 0 ? (
                    <div className="flex flex-col items-center justify-center text-center py-20">
                      <div className="w-16 h-16 bg-bg-sec  rounded-full flex items-center justify-center text-orange-500 mb-4 animate-pulse">
                        <AlertCircle size={28} />
                      </div>
                      <h3 className="text-[16px] font-bold text-slate-705 ">
                        No stop / conditional orders
                      </h3>
                      <p className="text-[14px] text-slate-400 mt-2 max-w-[340px]">
                        Safety Stop Loss or Take Profit orders you specify will
                        list here.
                      </p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="bg-slate-50  font-bold text-[#FF7072] border-b border-slate-100  uppercase tracking-wider text-[11px]">
                            <th className="p-4 rounded-tl-xl mr-2">Market</th>
                            <th className="p-4">Trigger Type</th>
                            <th className="p-4">Side</th>
                            <th className="p-4">Leverage</th>
                            <th className="p-4 text-right">
                              Trigger Condition Price
                            </th>
                            <th className="p-4 text-right">Size</th>
                            <th className="p-4 text-center">Timestamp</th>
                            <th className="p-4 text-center rounded-tr-xl">
                              Action
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100  bg-surface">
                          {pendingOrders
                            .filter((o) => o.type.includes("Stop"))
                            .map((o) => (
                              <tr
                                key={`stop-ord-${o.id}`}
                                className="hover:bg-slate-50/40  text-[16px] text-text-main"
                              >
                                <td className="p-4 font-bold flex items-center gap-2">
                                  {renderAssetLogo(o.pair)}
                                  <span className="font-mono">{o.pair}</span>
                                </td>
                                <td className="p-4 font-semibold text-orange-500 flex items-center gap-1">
                                  <span className="inline-block w-2 h-2 rounded-full bg-orange-500 anim-pulse mr-0.5"></span>
                                  {o.type}
                                </td>
                                <td className="p-4 select-none">
                                  <span
                                    className={`px-2.5 py-1 rounded text-[11px] font-semibold uppercase tracking-wider ${
                                      o.side === "long"
                                        ? "bg-success/10 text-success"
                                        : "bg-danger/10 text-danger"
                                    }`}
                                  >
                                    {o.side === "long"
                                      ? "BUY LONG"
                                      : "SELL SHORT"}
                                  </span>
                                </td>
                                <td className="p-4 font-mono text-text-muted">
                                  {o.leverage}x
                                </td>
                                <td className="p-4 text-right font-mono font-bold text-orange-600 ">
                                  ≤ {formatUSD(o.price)}
                                </td>
                                <td className="p-4 text-right font-mono font-bold">
                                  {o.quantity.toFixed(4)} Lots
                                </td>
                                <td className="p-4 text-center font-mono text-text-muted text-xs">
                                  {formatDate(o.timestamp)}{" "}
                                  {formatTime(o.timestamp)}
                                </td>
                                <td className="p-4 text-center">
                                  <button
                                    onClick={() => cancelPendingOrder(o.id)}
                                    className="p-1.5 hover:bg-danger/10 text-text-muted hover:text-danger rounded-lg transition-colors inline-flex items-center justify-center-95"
                                    title="Cancel Trigger"
                                  >
                                    <Trash2 size={16} />
                                  </button>
                                </td>
                              </tr>
                            ))}
                        </tbody>
                      </table>
                    </div>
                  ))}

                {tradeSubTab === "fills" &&
                  (tradeHistory.length === 0 ? (
                    <div className="flex flex-col items-center justify-center text-center py-20">
                      <div className="w-16 h-16 bg-bg-sec  rounded-full flex items-center justify-center text-emerald-500 mb-4 animate-pulse">
                        <CheckCircle size={28} />
                      </div>
                      <h3 className="text-[16px] font-bold text-slate-705 ">
                        No matched fills yet
                      </h3>
                      <p className="text-[14px] text-slate-400 mt-2 max-w-[340px]">
                        Any matched market order executions or limit fillings
                        will display in this list.
                      </p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="bg-slate-50  font-bold text-[#FF7072] border-b border-slate-100  uppercase tracking-wider text-[11px]">
                            <th className="p-4 rounded-tl-xl">
                              Ref Exchange-ID
                            </th>
                            <th className="p-4">Market</th>
                            <th className="p-4">Trade Side</th>
                            <th className="p-4 text-right">Execution Price</th>
                            <th className="p-4 text-right">Quantity filled</th>
                            <th className="p-4 text-right">
                              Total match (USD)
                            </th>
                            <th className="p-4 text-right">Estimated Fee</th>
                            <th className="p-4 text-center rounded-tr-xl">
                              Execution Time
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100  bg-surface">
                          {tradeHistory.map((t) => (
                            <tr
                              key={`fill-${t.id}`}
                              className="hover:bg-slate-50/40  text-[16px] text-text-main"
                            >
                              <td className="p-4 font-mono text-text-muted text-[12px]">
                                #{t.id}
                              </td>
                              <td className="p-4 font-bold flex items-center gap-2">
                                {renderAssetLogo(t.pair)}
                                <span className="font-mono">{t.pair}</span>
                              </td>
                              <td className="p-4 select-none">
                                <span
                                  className={`px-2.5 py-1 rounded text-[11px] font-semibold uppercase tracking-wider ${
                                    t.side === "long"
                                      ? "bg-success/10 text-success"
                                      : "bg-danger/10 text-danger"
                                  }`}
                                >
                                  {t.side === "long"
                                    ? "BUY LONG"
                                    : "SELL SHORT"}
                                </span>
                              </td>
                              <td className="p-4 text-right font-mono font-bold text-[#1EC776] whitespace-nowrap">
                                {formatUSD(t.price)}
                              </td>
                              <td className="p-4 text-right font-mono font-bold whitespace-nowrap">
                                {t.quantity.toFixed(4)} Lots
                              </td>
                              <td className="p-4 text-right font-mono font-bold whitespace-nowrap">
                                {formatUSD(t.price * t.quantity)}
                              </td>
                              <td className="p-4 text-right font-mono text-text-muted whitespace-nowrap">
                                {formatUSD(t.fee)}
                              </td>
                              <td className="p-4 text-center font-mono text-text-muted text-xs">
                                {formatDate(t.timestamp)}{" "}
                                {formatTime(t.timestamp)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ))}

                {tradeSubTab === "order-history" &&
                  (orderHistory.length === 0 ? (
                    <div className="flex flex-col items-center justify-center text-center py-20">
                      <div className="w-16 h-16 bg-bg-sec  rounded-full flex items-center justify-center text-indigo-500 mb-4 animate-pulse">
                        <Clock size={28} />
                      </div>
                      <h3 className="text-[16px] font-bold text-slate-705 ">
                        Order Logs Empty
                      </h3>
                      <p className="text-[14px] text-slate-400 mt-2 max-w-[340px]">
                        A record of all your submitted, cancelled, or expired
                        orders will be stored here.
                      </p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="bg-slate-50  font-bold text-[#FF7072] border-b border-slate-100  uppercase tracking-wider text-[11px]">
                            <th className="p-4 rounded-tl-xl mr-2">Order ID</th>
                            <th className="p-4">Market</th>
                            <th className="p-4">Type</th>
                            <th className="p-4">Side</th>
                            <th className="p-4 text-right">Rate Price</th>
                            <th className="p-4 text-right">Order Size</th>
                            <th className="p-4 text-center">Status</th>
                            <th className="p-4 text-center rounded-tr-xl">
                              Logged Timestamp
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100  bg-surface bg-surface">
                          {orderHistory.map((o) => (
                            <tr
                              key={`ord-hist-${o.id}`}
                              className="hover:bg-slate-50/40  text-[16px] text-text-main"
                            >
                              <td className="p-4 font-mono text-text-muted text-[12px]">
                                #{o.id}
                              </td>
                              <td className="p-4 font-bold flex items-center gap-2">
                                {renderAssetLogo(o.pair)}
                                <span className="font-mono">{o.pair}</span>
                              </td>
                              <td className="p-4 font-semibold text-text-muted">
                                {o.type}
                              </td>
                              <td className="p-4 select-none">
                                <span
                                  className={`px-2.5 py-1 rounded text-[11px] font-semibold uppercase tracking-wider ${
                                    o.side === "long"
                                      ? "bg-success/10 text-success"
                                      : "bg-danger/10 text-danger"
                                  }`}
                                >
                                  {o.side === "long"
                                    ? "BUY LONG"
                                    : "SELL SHORT"}
                                </span>
                              </td>
                              <td className="p-4 text-right font-mono font-bold mr-1 whitespace-nowrap">
                                {formatUSD(o.price)}
                              </td>
                              <td className="p-4 text-right font-mono font-bold whitespace-nowrap">
                                {o.quantity.toFixed(4)} Lots
                              </td>
                              <td className="p-4 text-center select-none">
                                <span
                                  className={`px-2.5 py-1 rounded-full text-[11.5px] font-bold uppercase ${
                                    o.status === "Filled"
                                      ? "bg-success/15 text-success"
                                      : o.status === "Cancelled"
                                        ? "bg-amber-500/15 text-amber-600 "
                                        : "bg-danger/15 text-danger"
                                  }`}
                                >
                                  {o.status}
                                </span>
                              </td>
                              <td className="p-4 text-center font-mono text-text-muted text-xs">
                                {formatDate(o.timestamp)}{" "}
                                {formatTime(o.timestamp)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ))}

                {tradeSubTab === "history" &&
                  (positionHistory.length === 0 ? (
                    <div className="flex flex-col items-center justify-center text-center py-20">
                      <div className="w-16 h-16 bg-bg-sec rounded-full flex items-center justify-center text-brand mb-4">
                        <CheckCircle size={28} />
                      </div>
                      <h3 className="text-[16px] font-bold text-text-main">
                        No closed log history
                      </h3>
                      <p className="text-[14px] text-text-muted mt-2">
                        Historical closed indexes log here upon settlement.
                      </p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto w-full">
                      <table className="w-full border-separate border-spacing-0">
                        <thead>
                          <tr className="text-left text-slate-400 text-[12px] uppercase tracking-wider border-b border-slate-100">
                            <th className="p-4 bg-slate-50/50 rounded-tl-xl">Symbol</th>
                            <th className="p-4 bg-slate-50/50">Side</th>
                            <th className="p-4 bg-slate-50/50">Quantity</th>
                            <th className="p-4 bg-slate-50/50">Entry Price</th>
                            <th className="p-4 bg-slate-50/50">Exit Price</th>
                            <th className="p-4 bg-slate-50/50">P&L</th>
                            <th className="p-4 bg-slate-50/50">Fees (Hold)</th>
                            <th className="p-4 bg-slate-50/50 rounded-tr-xl text-right">Close Time</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                          {positionHistory.map((h) => {
                            const isProfit = h.pnl >= 0;
                            return (
                              <tr key={`hist-row-${h.id}`} className="hover:bg-slate-50/30 transition-all">
                                <td className="p-4">
                                  <div className="flex items-center gap-2">
                                    {renderAssetLogo(h.pair)}
                                    <span className="font-black text-slate-900">{h.pair}</span>
                                  </div>
                                </td>
                                <td className="p-4">
                                  <span className={`text-[11px] font-black uppercase px-2 py-1 rounded ${h.side === 'long' ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>
                                    {h.side} {h.leverage}x
                                  </span>
                                </td>
                                <td className="p-4 font-mono font-bold text-slate-700">{h.quantity.toFixed(4)} Lot</td>
                                <td className="p-4 font-mono font-bold text-slate-700 whitespace-nowrap">{formatUSD(h.entryPrice)}</td>
                                <td className="p-4 font-mono font-bold text-slate-700 whitespace-nowrap">{formatUSD(h.exitPrice)}</td>
                                <td className="p-4 whitespace-nowrap">
                                  <span className={`font-mono font-black text-[15px] ${isProfit ? 'text-emerald-500' : 'text-red-500'}`}>
                                    {isProfit ? '+' : ''}{formatUSD(h.pnl)}
                                  </span>
                                </td>
                                <td className="p-4 font-mono font-bold text-slate-500">
                                   ₹{h.closeFee} (<span className="text-orange-400">₹{h.holdingFee}</span>)
                                </td>
                                <td className="p-4 text-right text-slate-400 font-bold text-[12px]">
                                   {new Date(h.closeTime).toLocaleString()}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  ))}
              </div>
            </div>
          </div>

          {/* Right Column: Sticky Order Entry (Takes 3 out of 12 columns), order-2 */}
          <div className="col-span-1 xl:col-span-3 order-2 w-full sticky top-4 self-start z-10 animate-fadeIn">
            {/* EXACT MATCH REFERENCE ORDER PANEL - PREMIUM STYLING */}
            <div className="bg-white rounded-[20px] border border-orange-100 shadow-[0_8px_40px_rgb(255,140,66,0.06)] p-5 flex flex-col gap-4 w-full">
              {/* 1. Buy/Sell Switcher */}
              <div className="flex bg-[#F8FAFC] rounded-[14px] p-1 h-[54px] shrink-0 border border-slate-100">
                <button
                  type="button"
                  onClick={() => setSide("long")}
                  className={`flex-1 text-[16px] font-bold uppercase tracking-wider rounded-[12px] transition-all flex items-center justify-center ${
                    side === "long"
                      ? "bg-[#ff8c2a] text-white shadow-lg shadow-[#ff8c2a]/20"
                      : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  Buy
                </button>
                <button
                  type="button"
                  onClick={() => setSide("short")}
                  className={`flex-1 text-[16px] font-bold uppercase tracking-wider rounded-[12px] transition-all flex items-center justify-center ${
                    side === "short"
                      ? "bg-[#ef4444] text-white shadow-lg shadow-[#ef4444]/20"
                      : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  Sell
                </button>
              </div>

              {/* 2. Order Type */}
              <div className="flex gap-2 p-1 bg-slate-100/50 rounded-xl border border-slate-100">
                {["Market", "Limit"].map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => {
                      setOrderType(type as any);
                      if (type === "Market") setCustomPrice(null);
                      else if (!customPrice) setCustomPrice(price);
                    }}
                    className={`flex-1 py-2 text-[13px] font-bold uppercase tracking-widest rounded-lg transition-all ${
                      orderType === type
                        ? "bg-white text-slate-900 shadow-sm border border-slate-200"
                        : "text-slate-400 hover:text-slate-600"
                    }`}
                  >
                    {type}
                  </button>
                ))}
              </div>

              {/* 3. Limit Price Input */}
              {orderType === "Limit" && (
                <div className="flex flex-col gap-1.5 animate-fadeIn">
                  <div className="flex justify-between items-center px-1">
                    <span className="text-[11px] uppercase font-black text-slate-400 tracking-widest">
                      Price (USDT)
                    </span>
                    <button 
                       onClick={() => setCustomPrice(price)}
                       className="text-[11px] text-[#ff8c2a] font-bold hover:underline"
                    >
                      {formatUSD(price)}
                    </button>
                  </div>
                  <div className="flex items-center px-4 py-3 bg-[#fffaf4] border border-orange-100 rounded-[14px] focus-within:border-[#ff8c2a] transition-all">
                    <input
                      type="number"
                      step="0.01"
                      value={customPrice !== null ? customPrice : price}
                      onChange={(e) => setCustomPrice(parseFloat(e.target.value) || null)}
                      className="text-[16px] text-slate-900 font-mono font-bold outline-none bg-transparent w-full"
                    />
                    <span className="text-[12px] font-bold text-slate-400 ml-2">USDT</span>
                  </div>
                </div>
              )}

              {/* 4. Quantity Section (Image Match Redesign Part 1) */}
              <div className="flex flex-col gap-2">
                <div 
                   className="bg-[#fffaf4] border border-orange-100/80 rounded-[24px] p-5 shadow-sm focus-within:border-[#ff8c2a] transition-all relative overflow-hidden"
                >
                  <div className="flex justify-between items-start">
                    <div className="flex flex-col gap-1 flex-1">
                      <input
                        type="number"
                        step={minQty}
                        value={quantityStr}
                        onChange={(e) => setQuantityStr(e.target.value)}
                        placeholder="0"
                        className="text-[28px] font-black text-slate-900 leading-none outline-none bg-transparent w-full font-sans"
                      />
                      <span className="text-[13px] font-extrabold text-slate-400 tracking-tight font-mono mt-2 flex items-center gap-1">
                        ≈ {(quantityUnit === "Lot" ? quantity * activeMultiplier : quantity).toFixed(4)} {selectedPair.replace("USDT", "").replace("USD", "")}
                      </span>
                    </div>
                    
                    <button 
                      onClick={() => setShowQuantityUnitMenu(!showQuantityUnitMenu)}
                      className="bg-white border border-orange-100/60 px-4 py-2 rounded-[16px] flex items-center gap-2 shadow-xs active:scale-95 transition-all text-[#ff8c2a] hover:border-[#ff8c2a]"
                    >
                      <span className="text-[14px] font-black">{quantityUnit}</span>
                      <ChevronDown size={14} className="text-[#ff8c2a]" strokeWidth={3} />
                    </button>
                  </div>
                  
                  {showQuantityUnitMenu && (
                    <div className="absolute right-5 top-[65px] bg-white border border-slate-100 rounded-xl shadow-xl z-50 overflow-hidden flex flex-col min-w-[90px]">
                      {["Lot", "Units"].map(u => (
                        <button
                          key={u}
                          onClick={() => {
                            setQuantityUnit(u as any);
                            setShowQuantityUnitMenu(false);
                          }}
                          className="px-4 py-2 text-[13px] font-bold text-slate-700 hover:bg-orange-50 hover:text-[#ff8c2a] text-left transition-colors"
                        >
                          {u}
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Percentage buttons integrated into bottom of quantity card */}
                  <div className="grid grid-cols-5 border-t border-orange-100/50 mt-5 -mx-5 -mb-5 bg-white divide-x divide-slate-100">
                    {[10, 25, 50, 75, 100].map((pct, idx) => (
                      <button
                        key={`pct-${pct}`}
                        type="button"
                        onClick={() => handleSnapPercentClick(pct)}
                        className={`py-3.5 text-[12px] font-black text-slate-400 hover:text-[#ff8c2a] hover:bg-orange-50/50 transition-all ${idx === 0 ? 'rounded-bl-[20px]' : ''} ${idx === 4 ? 'rounded-br-[20px]' : ''}`}
                      >
                        {pct}%
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* 5. Fund Required & Balance Section Redesign (Image Match Redesign Part 2) */}
              <div className="bg-[#fffaf4] border border-orange-100/80 rounded-[20px] p-4 md:p-4.5 flex flex-col gap-3 mt-1 select-none w-full">
                {/* Row 1: Leverage Selection */}
                <div className="flex flex-col gap-1.5 w-full bg-transparent">
                  <div className="flex justify-between items-center bg-transparent">
                    <span className="text-[12px] md:text-[13px] font-semibold text-slate-400">Leverage</span>
                    <button
                      type="button"
                      onClick={() => setShowLeverageModal(true)}
                      className="bg-white border border-orange-100/60 px-2.5 py-1 rounded-[10px] flex items-center gap-1.5 shadow-xs text-[#ff8c2a] font-extrabold text-[12px] hover:border-[#ff8c2a] active:scale-95 transition-all cursor-pointer"
                    >
                      <span>{leverage}x</span>
                      <ChevronDown size={11} className="text-[#ff8c2a]" strokeWidth={3} />
                    </button>
                  </div>
                  {/* Account Badge professionally below leverage */}
                  <div className="flex justify-start">
                    <button 
                      type="button"
                      onClick={() => setAccountMode(accountMode === 'demo' ? 'real' : 'demo')}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[10px] text-[11px] font-bold tracking-wider transition-all active:scale-95 border shrink-0 uppercase leading-none shadow-xs cursor-pointer ${
                        accountMode === 'real' 
                          ? 'bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100/50' 
                          : 'bg-amber-50 border-amber-200 text-amber-700 hover:bg-amber-100/50'
                      }`}
                    >
                      <span className="text-[7.5px] shrink-0 animate-pulse">🟢</span>
                      <span className="leading-none">{accountMode === 'real' ? 'Real Account' : 'Demo Account'}</span>
                    </button>
                  </div>
                </div>

                <div className="h-[1px] bg-orange-100/10 w-full" />

                {/* Row 2: Available with clean layout */}
                <div className="flex justify-between items-center bg-transparent gap-2">
                  <span className="text-[12px] md:text-[13px] font-semibold text-slate-500 text-left whitespace-nowrap pl-0">Available</span>
                  <span className="text-[12px] md:text-[13px] font-bold text-slate-800 font-mono leading-none whitespace-nowrap">
                    {accountBalance.usd.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} <span className="text-[10px] font-semibold text-slate-500 ml-1">USDT</span>
                  </span>
                </div>

                {/* Row 3: Funds Required */}
                <div className="flex justify-between items-center bg-transparent gap-2">
                  <span className="text-[12px] md:text-[13px] font-semibold text-slate-500 border-b border-dashed border-slate-300 pb-0.5 whitespace-nowrap pl-0">
                    Funds req.
                  </span>
                  <span className={`text-[12px] md:text-[13px] font-mono leading-none whitespace-nowrap ${isOverMargin ? 'text-red-500 font-semibold' : 'text-slate-850 font-bold'}`}>
                    {calculatedMargin.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} <span className={`text-[10px] ml-1 font-semibold ${isOverMargin ? 'text-red-400' : 'text-slate-500'}`}>USDT</span>
                  </span>
                </div>
              </div>

              {/* 7. Take Profit / Stop Loss Toggle */}
              <div className="flex flex-col gap-2 mt-1">
                <button
                  type="button"
                  onClick={() => setShowTpSlModal(true)}
                  className={`w-full py-2.5 px-4 flex justify-between items-center rounded-xl border transition-all ${
                    addTpSl && (tpPriceStr || slPriceStr)
                      ? "bg-green-50/50 border-green-200 text-green-700"
                      : "bg-[#fffaf4] border-orange-100 text-[#ff8c2a] dashed"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Target size={14} />
                    <span className="text-[13px] font-bold">TP/SL</span>
                  </div>
                  <div className="text-[12px] font-bold font-mono">
                    {addTpSl && (tpPriceStr || slPriceStr) ? "Configured" : "+ Set"}
                  </div>
                </button>
              </div>

              {/* 8. Action Button */}
              <div className="mt-2 flex flex-col gap-3">
                <button
                  type="button"
                  onClick={() => (user ? triggerConfirmFlow(side) : setIsProfileOpen(true))}
                  className={`w-full h-[56px] rounded-[16px] text-white font-black text-[18px] uppercase tracking-[0.05em] transition-all shadow-xl active:scale-95 flex items-center justify-center ${
                    side === "long"
                      ? "bg-[#ff8c2a] hover:bg-[#e67512] shadow-[#ff8c2a]/20"
                      : "bg-[#ef4444] hover:bg-[#d93a3a] shadow-[#ef4444]/20"
                  }`}
                >
                  {side === "long" ? "Buy / Long" : "Sell / Short"}
                </button>
                
                <div className="flex justify-center items-center gap-2">
                  <input
                    type="checkbox"
                    checked={reduceOnly}
                    onChange={(e) => setReduceOnly(e.target.checked)}
                    id="reduce-only-desk"
                    className="accent-[#ff8c2a] w-4 h-4 cursor-pointer"
                  />
                  <label htmlFor="reduce-only-desk" className="text-[12px] font-bold text-slate-500 cursor-pointer select-none">
                    Reduce Only
                  </label>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================
          2. MOBILE & TABLET SYSTEM LAYOUT
          (Redesigned to perfectly match the uploaded image's compact, responsive look)
          ======================================================================== */}
      <div className="lg:hidden flex flex-col w-full px-3 py-3 pb-24 gap-3 max-w-md mx-auto relative">
        <div className="relative z-10 -mx-3 px-3 pt-2 pb-3 bg-white/95 backdrop-blur-md border-b border-orange-100 shadow-sm transition-all duration-300">
          {/* MOBILE TOPBAR COMPONENT (Matches Image) */}
          <div className="flex justify-between items-start pt-1 px-1">
            {/* Symbol selection details */}
            <div className="flex items-start gap-1">
              <button onClick={toggleFavorite} className="mt-0.5">
                <Star
                  size={16}
                  fill={isFavorite ? "var(--color-brand)" : "transparent"}
                  stroke="var(--color-brand)"
                  strokeWidth={2}
                />
              </button>
              <div className="flex flex-col">
                <button
                  onClick={() => setShowMarketSelector(true)}
                  className="flex items-center gap-1 text-[18px] font-bold font-sans text-text-main leading-none"
                >
                  {cleanDisplayPair}
                  <ChevronDown size={14} className="text-brand mt-0.5" />
                </button>
                <span className="text-[10.5px] text-text-muted font-bold tracking-tight mt-1">
                  {getPerpetualDesc(selectedPair)}
                </span>
              </div>
            </div>

            {/* Pricing parameters display */}
            <div className="flex flex-col items-end text-right">
              <AnimatedPriceBox
                price={price}
                priceChangePercent={ticker?.priceChangePercent || 0}
              />
            </div>
          </div>

          {/* STATS DECK: Separate custom Market Stats cards (Matches Image requirements) */}
          <div className="grid grid-cols-3 gap-2 mt-3">
            {/* Card 1: Mark Price */}
            <div className="bg-orange-50/50 border border-orange-100/50 rounded-lg p-2 flex flex-col justify-between shadow-xs">
              <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">
                Mark Price
              </span>
              <span
                className={`text-[12px] font-bold ${isPositive ? "text-success" : "text-danger"}`}
              >
                {price ? formatUSD(price) : "--"}
              </span>
            </div>

            {/* Card 2: OI (Open Interest) */}
            <div className="bg-orange-50/50 border border-orange-100/50 rounded-lg p-2 flex flex-col justify-between shadow-xs">
              <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">
                OI
              </span>
              <span className="text-[12px] text-slate-700 font-bold flex items-center gap-1">
                $36.4M
                <span className="w-1 h-1 rounded-full bg-[#22C55E] animate-pulse inline-block" />
              </span>
            </div>

            {/* Card 3: Funding Rate */}
            <div className="bg-orange-50/50 border border-orange-100/50 rounded-lg p-2 flex flex-col justify-between shadow-xs">
              <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">
                Funding/Next
              </span>
              <span className="text-[12px] text-slate-700 font-bold leading-none whitespace-nowrap">
                {countdownStr}
              </span>
            </div>
          </div>
        </div>

        {/* Floating action row for mobile bells & chart selectors */}
        <div className="flex justify-between items-center mt-1 px-0.5">
          <div className="flex gap-1.5">
            <button
              type="button"
              onClick={() => {
                setFormSuccess("Notification alerts scheduled successfully!");
                setTimeout(() => setFormSuccess(null), 2000);
              }}
              className="px-2.5 py-1.5 bg-slate-50 border border-[#FF8C42]/20 hover:border-[#FF8C42] text-[#FF8C42] rounded-lg flex items-center justify-center gap-1 text-[10.5px] font-extrabold tracking-wide uppercase"
            >
              <Bell size={12} />
              <span>Price Alert</span>
            </button>
          </div>

          <button
            type="button"
            onClick={() => setShowMobileChart(!showMobileChart)}
            className={`px-2.5 py-1.5 rounded-lg font-bold text-[10.5px] transition-all flex items-center gap-1 border uppercase tracking-wide ${
              showMobileChart
                ? "bg-[#FF8C42] text-white border-[#FF8C42]"
                : "bg-white text-[#FF8C42] border-[#FF8C42]/20"
            }`}
          >
            <BarChart2 size={12} />
            {showMobileChart ? "Hide Chart" : "Show Chart"}
          </button>
        </div>

        {/* INTERACTIVE TV CHART EXPANSE (Slide-down toggleable on Mobile) */}
        <AnimatePresence>
          {showMobileChart && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 420, opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="w-full bg-white rounded-[14px] border border-orange-200 shadow-sm overflow-hidden flex flex-col mt-2 min-h-[420px]"
            >
              <div className="flex items-center justify-between px-4 py-3 bg-slate-50 border-b border-orange-100 shrink-0 select-none">
                <div className="flex items-center gap-1.5 justify-start">
                  <span className="text-[13px] font-black uppercase text-slate-850 tracking-wider">
                    {cleanDisplayPair} Chart
                  </span>
                  <a 
                    href={getTradingViewLink(selectedPair, tickers[selectedPair]?.category || 'Crypto')}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-0.5 text-[9px] font-black text-orange-600 bg-orange-50 px-1.5 py-0.5 rounded border border-orange-100 transition-all ml-1 shadow-3xs"
                  >
                    <span>Live</span>
                    <ArrowUpRight size={10} className="stroke-[3]" />
                  </a>
                </div>
                <button 
                  onClick={() => setShowMobileChart(false)}
                  className="w-7 h-7 rounded-full bg-white border border-slate-200/60 text-slate-500 hover:text-slate-800 flex items-center justify-center transition-colors cursor-pointer"
                >
                  <X size={15} />
                </button>
              </div>
              <div className="flex-1 w-full relative">
                <TradingChart
                  pair={selectedPair}
                  timeframe="15"
                  containerId="tv-chart-mobile"
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* DOUBLE COLUMN TERMINAL LAYOUT (Order Book and Trade Form side-by-side) */}
        <div className="grid grid-cols-12 gap-3 items-stretch mt-3 px-1.5 pb-4">
          {/* LEFT 58% COLUMN: COMPACT TRADING FORM */}
          <div className="col-span-7 flex flex-col font-sans">
            {/* Buy / Sell Tabs */}
            <div className="flex bg-slate-100 rounded-lg p-0.5 border border-slate-200/50">
              <button
                type="button"
                onClick={() => setSide("long")}
                className={`flex-1 py-1.5 text-[12.5px] rounded-md font-bold transition-all text-center leading-none tracking-wide ${
                  side === "long"
                    ? "bg-[#1EC776] text-white shadow-xs"
                    : "text-slate-500 hover:text-text-main hover:bg-slate-200/40"
                }`}
              >
                Buy
              </button>
              <button
                type="button"
                onClick={() => setSide("short")}
                className={`flex-1 py-1.5 text-[12.5px] rounded-md font-bold transition-all text-center leading-none tracking-wide ${
                  side === "short"
                    ? "bg-[#EF4444] text-white shadow-xs"
                    : "text-slate-500 hover:text-text-main hover:bg-slate-200/40"
                }`}
              >
                Sell
              </button>
            </div>

            {/* Order Type Selector Mobile (Vibrant Orange Highlights matching Delta Exchange) */}
            <div className="grid grid-cols-2 bg-slate-100 rounded-xl p-0.5 h-[30px] shrink-0 mt-1.5 select-none">
              <button
                type="button"
                onClick={() => {
                  setOrderType("Market");
                  setCustomPrice(null);
                }}
                className={`text-[11px] font-bold rounded-lg transition-all text-center flex items-center justify-center ${
                  orderType === "Market"
                    ? "bg-[#FF810A] text-white shadow-xs"
                    : "text-slate-500 hover:text-slate-700"
                }`}
              >
                Market
              </button>
              <button
                type="button"
                onClick={() => {
                  setOrderType("Limit");
                  if (!customPrice) {
                    setCustomPrice(price);
                  }
                }}
                className={`text-[11px] font-bold rounded-lg transition-all text-center flex items-center justify-center ${
                  orderType === "Limit"
                    ? "bg-[#FF810A] text-white shadow-xs"
                    : "text-slate-500 hover:text-slate-700"
                }`}
              >
                Limit
              </button>
            </div>

            {/* Custom Limit Price Input Box Mobile */}
            {orderType === "Limit" && (
              <div className="flex flex-col gap-1 mt-1.5 select-none animate-fadeIn">
                <div className="flex items-center justify-between px-2.5 py-1.5 bg-white border border-[#FFD8A8]/60 rounded-xl shadow-xs">
                  <span className="text-[10px] font-bold text-slate-400 font-sans tracking-wide uppercase mr-1">
                    Limit:
                  </span>
                  <input
                    type="number"
                    step="0.01"
                    value={customPrice !== null ? customPrice : price}
                    onChange={(e) =>
                      setCustomPrice(parseFloat(e.target.value) || null)
                    }
                    className="text-[13px] text-[#2D2D2D] font-mono font-bold outline-none bg-transparent w-full"
                  />
                  <button
                    type="button"
                    onClick={() => setCustomPrice(price)}
                    className="text-[10px] uppercase font-bold text-[#FF810A] hover:text-[#E28525]"
                  >
                    Mark
                  </button>
                </div>
              </div>
            )}

            {/* Premium Mobile Quantity Selector Widget */}
            {/* Premium Mobile Quantity Selector Widget */}
            <div className="flex flex-col gap-1.5 mt-2.5 select-none w-full">
              <div
                className="bg-[#fffaf4] border border-orange-100/80 rounded-[20px] p-4 shadow-sm focus-within:border-[#ff8c2a] transition-all relative overflow-hidden flex flex-col"
              >
                {/* Micro Input Row with Unit Dropdown */}
                <div className="flex items-center justify-between bg-transparent">
                  <div className="flex flex-col gap-0.5 flex-1 min-w-0 select-none">
                    <input
                      type="number"
                      step={minQty}
                      min={minQty}
                      value={quantityStr}
                      onChange={(e) => setQuantityStr(e.target.value)}
                      placeholder="0"
                      className="text-[22px] font-black text-slate-900 leading-none outline-none bg-transparent w-full font-sans"
                    />
                    <span className="text-[11px] font-extrabold text-slate-400 font-mono mt-1 whitespace-nowrap overflow-hidden text-ellipsis">
                      ≈ {(quantityUnit === "Lot" ? quantity * activeMultiplier : quantity).toFixed(4)} {selectedPair.replace("USDT", "").replace("USD", "")}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => setQuantityUnit(quantityUnit === "Lot" ? "Units" : "Lot")}
                    className="flex items-center gap-1 text-[12px] font-black text-[#ff8c2a] bg-white border border-orange-100/60 rounded-xl px-3 py-1.5 cursor-pointer transition-all active:scale-95 whitespace-nowrap"
                  >
                    <span>{quantityUnit}</span>
                    <ChevronDown size={11} className="text-[#ff8c2a]" strokeWidth={3} />
                  </button>
                </div>

                {/* Bottom Row Percentages Grid */}
                <div className="grid grid-cols-5 border-t border-orange-100/50 mt-4 -mx-4 -mb-4 bg-white divide-x divide-slate-100">
                  {[10, 25, 50, 75, 100].map((pct, idx) => (
                    <button
                      key={`slider-mob-pct-${pct}`}
                      type="button"
                      onClick={() => handleSnapPercentClick(pct)}
                      className={`py-2 text-[11px] font-black text-slate-400 hover:text-[#ff8c2a] hover:bg-orange-50/50 transition-colors active:scale-95 cursor-pointer col-span-1 ${idx === 0 ? 'rounded-bl-[20px]' : ''} ${idx === 4 ? 'rounded-br-[20px]' : ''}`}
                    >
                      {pct}%
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Margin Calculation Info & Leverage & Balance Card Mobile */}
            <div className="bg-[#fffaf4] border border-orange-100/80 rounded-[20px] p-4 flex flex-col gap-3 mt-2.5 select-none w-full">
              {/* Row 1: Leverage Section Mobile */}
              <div className="flex flex-col gap-1.5 w-full bg-transparent">
                <div className="flex justify-between items-center bg-transparent">
                  <span className="text-[12px] font-semibold text-slate-400">Leverage</span>
                  <button
                    type="button"
                    onClick={() => setShowLeverageModal(true)}
                    className="bg-white border border-orange-100/60 px-2.5 py-1 rounded-[10px] flex items-center gap-1 shadow-xs text-[#ff8c2a] font-extrabold text-[12px] hover:border-[#ff8c2a] active:scale-95 transition-all cursor-pointer"
                  >
                    <span>{leverage}x</span>
                    <ChevronDown size={11} className="text-[#ff8c2a]" strokeWidth={3} />
                  </button>
                </div>
                {/* Account Badge professionally below leverage */}
                <div className="flex justify-start">
                  <button 
                    type="button"
                    onClick={() => setAccountMode(accountMode === 'demo' ? 'real' : 'demo')}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[10px] text-[11px] font-bold tracking-wider transition-all active:scale-95 border shrink-0 uppercase leading-none shadow-xs cursor-pointer ${
                      accountMode === 'real' 
                        ? 'bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100/50' 
                        : 'bg-amber-50 border-amber-200 text-amber-700 hover:bg-amber-100/50'
                    }`}
                  >
                    <span className="text-[7.5px] shrink-0 animate-pulse">🟢</span>
                    <span className="leading-none">{accountMode === 'real' ? 'Real Account' : 'Demo Account'}</span>
                  </button>
                </div>
              </div>

              <div className="h-[1px] bg-orange-100/10 w-full" />

              {/* Row 2: Available Mobile */}
              <div className="flex justify-between items-center bg-transparent gap-2">
                <span className="text-[12px] font-semibold text-slate-500 text-left whitespace-nowrap pl-0">Available</span>
                <span className="text-[12px] font-bold text-slate-800 font-mono leading-none whitespace-nowrap">
                  {accountBalance.usd.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} <span className="text-[10px] font-semibold text-slate-500 ml-1">USDT</span>
                </span>
              </div>

              {/* Row 3: Funds Required Mobile */}
              <div className="flex justify-between items-center bg-transparent gap-2">
                <span className="text-[12px] font-semibold text-slate-500 border-b border-dashed border-slate-300 pb-0.5 whitespace-nowrap pl-0">
                  Funds req.
                </span>
                <span className={`text-[12px] font-mono leading-none whitespace-nowrap ${isOverMargin ? 'text-red-500 font-semibold' : 'text-slate-850 font-bold'}`}>
                  {calculatedMargin.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} <span className={`text-[10px] ml-1 font-semibold ${isOverMargin ? 'text-red-400' : 'text-slate-500'}`}>USDT</span>
                </span>
              </div>
            </div>

            {/* Bracket Order Mobile */}
            <div className="flex flex-col gap-1 mt-2.5 select-none shrink-0">
              <div className="flex justify-between items-center select-none py-0.5 shrink-0">
                <span className="text-[9.5px] font-bold text-slate-400 uppercase tracking-widest leading-none">
                  Bracket Order
                </span>
              </div>

              <div className="bg-[#FFF8F1] border border-[#FFD8A8]/50 rounded-xl p-0.5 flex justify-between items-center">
                <span
                  className="text-[11.5px] font-bold text-slate-500 px-2 cursor-pointer select-none truncate"
                  onClick={() => setShowTpSlModal(true)}
                >
                  {addTpSl && (tpPriceStr || slPriceStr) ? (
                    <span className="text-[#2D2D2D]">
                      {tpPriceStr ? `TP: ${tpPriceStr}` : ""}{" "}
                      {tpPriceStr && slPriceStr ? "|" : ""}{" "}
                      {slPriceStr ? `SL: ${slPriceStr}` : ""}
                    </span>
                  ) : (
                    "Set TP/SL"
                  )}
                </span>

                <div className="flex items-center gap-1 pr-0.5">
                  <button
                    type="button"
                    onClick={() => setShowTpSlModal(true)}
                    className="text-[10px] bg-white border border-[#FFD8A8]/45 text-[#FF9F43] px-2.5 py-1.5 rounded-lg font-bold uppercase tracking-wider hover:bg-[#FFF4E8] active:scale-95 transition-all cursor-pointer shadow-xs"
                  >
                    {addTpSl ? "EDIT" : "ADD"}
                  </button>
                  {addTpSl && (
                    <button
                      type="button"
                      onClick={() => {
                        setAddTpSl(false);
                        setTpPriceStr("");
                        setSlPriceStr("");
                      }}
                      className="text-[10px] text-slate-400 px-1.5 py-1 hover:text-red-500 transition-colors uppercase font-bold"
                    >
                      Clear
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Action Button */}
            <div className="flex flex-col items-center w-full mt-2">
              <button
                type="button"
                onClick={() =>
                  user ? triggerConfirmFlow(side) : setIsProfileOpen(true)
                }
                className={`w-[85%] max-w-[260px] h-[36px] rounded-lg text-[13px] font-bold uppercase tracking-wide text-white transition-all duration-200 select-none flex items-center justify-center leading-none active:scale-[0.98] shadow-md ${
                  !user
                    ? "bg-gradient-to-r from-[#FF9F43] to-[#E28525]"
                    : side === "long"
                      ? "bg-gradient-to-r from-[#10B981] to-[#059669] shadow-emerald-500/10"
                      : "bg-gradient-to-r from-[#EF4444] to-[#DC2626] shadow-red-500/10"
                }`}
              >
                {!user
                  ? "Log In"
                  : side === "long"
                    ? "Buy / Long"
                    : "Sell / Short"}
              </button>
            </div>
          </div>

          {/* RIGHT 42% COLUMN: MOBILE ORDER BOOK */}
          <div className="col-span-5 flex flex-col justify-between font-sans relative pr-0.5">
            <div className="flex justify-between text-[9px] text-slate-400 font-bold uppercase tracking-wider mb-2 leading-[1.2]">
              <span className="flex flex-col items-start gap-[1px]">
                <span>Price</span>
                <span>(USDT)</span>
              </span>
              <span className="flex flex-col items-end text-right gap-[1px]">
                <span>Amount</span>
                <span>({selectedPair.split("/")[0]})</span>
              </span>
            </div>

            {/* Asks (Red) */}
            <div className="flex-1 flex flex-col justify-end space-y-[4px]">
              {mobileAsks.slice(0, 6).map((ask, i) => {
                const percent = Math.min(
                  100,
                  Math.round((ask.total / maxCumulativeDepth) * 100),
                );
                return (
                  <div
                    key={`mob-ask-clean-${i}`}
                    onClick={() => handleOrderBookPriceClick(ask.price)}
                    className="relative flex justify-between items-center h-[18px] text-[11px] font-mono cursor-pointer group"
                  >
                    <div
                      className="absolute right-0 top-0 bottom-0 bg-[#EF4444]/12 pointer-events-none transition-all group-hover:bg-[#EF4444]/20"
                      style={{ width: `${percent}%` }}
                    />
                    <span className="text-[#EF4444] font-bold z-10 leading-none">
                      {ask.price.toFixed(2)}
                    </span>
                    <span className="text-[#2B2B2B] font-bold z-10 text-right leading-none">
                      {ask.qty.toFixed(3)}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Center Price marker */}
            <div className="py-1.5 flex flex-col items-center justify-center my-0.5 relative border-y border-slate-100/60">
              <span
                className={`text-[15px] font-bold font-mono leading-none tracking-tight ${isPositive ? "text-[#1EC776]" : "text-[#EF4444]"}`}
              >
                {price ? price.toFixed(2) : "--"}
              </span>
              <span className="text-[10px] font-bold text-[#A0A0A0] mt-0.5 flex items-center justify-center w-full relative">
                ≈ ${price ? price.toFixed(2) : "--"}
              </span>
            </div>

            {/* Bids (Green) */}
            <div className="flex-1 flex flex-col justify-start space-y-[4px]">
              {mobileBids.slice(0, 6).map((bid, i) => {
                const percent = Math.min(
                  100,
                  Math.round((bid.total / maxCumulativeDepth) * 100),
                );
                return (
                  <div
                    key={`mob-bid-clean-${i}`}
                    onClick={() => handleOrderBookPriceClick(bid.price)}
                    className="relative flex justify-between items-center h-[18px] text-[11px] font-mono cursor-pointer group"
                  >
                    <div
                      className="absolute right-0 top-0 bottom-0 bg-[#1EC776]/12 pointer-events-none transition-all group-hover:bg-[#1EC776]/20"
                      style={{ width: `${percent}%` }}
                    />
                    <span className="text-[#1EC776] font-bold z-10 leading-none">
                      {bid.price.toFixed(2)}
                    </span>
                    <span className="text-[#2B2B2B] font-bold z-10 text-right leading-none">
                      {bid.qty.toFixed(3)}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Ratio Bar */}
            <div className="mt-2.5 mb-1 mx-0 flex items-center justify-between text-[9px] font-bold relative px-0">
              <span className="text-[#1EC776] z-10 bg-white/95 text-[9.5px]">
                17.6%
              </span>
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none px-[32px]">
                <div className="flex h-1 w-full rounded-full flex-row overflow-hidden shadow-xs opacity-80">
                  <div className="h-full bg-[#1EC776] w-[18%]" />
                  <div className="h-full bg-[#EF4444] w-[82%]" />
                </div>
              </div>
              <span className="text-[#EF4444] z-10 bg-white/95 text-[9.5px]">
                82.4%
              </span>
            </div>
          </div>
        </div>

        {/* BOTTOM POSITIONS SECTION (Exactly like Delta Exchange Bottom section) */}
        <div className="mt-3 bg-white rounded-xl border border-slate-150 p-2.5 shadow-xs">
          <div className="flex flex-col gap-2 pb-2 select-none">
            <div className="flex justify-between items-center px-0.5">
              <span className="text-[13px] font-bold text-slate-800 font-mono tracking-wide uppercase">
                {cleanDisplayPair}
              </span>
              <span className="text-[11px] font-bold text-slate-400">
                Positions / Orders
              </span>
            </div>
            {/* Direct Tab button links */}
            <div className="flex bg-slate-50 p-0.5 border border-slate-200/50 rounded-full w-full overflow-x-auto no-scrollbar flex-nowrap gap-0.5">
              {[
                {
                  id: "positions",
                  label: "Positions",
                  count: positions.length,
                },
                {
                  id: "open-orders",
                  label: "Open",
                  count: pendingOrders.filter((o) => !o.type.includes("Stop"))
                    .length,
                },
                {
                  id: "stop-orders",
                  label: "Stops",
                  count: pendingOrders.filter((o) => o.type.includes("Stop"))
                    .length,
                },
                { id: "fills", label: "Fills", count: tradeHistory.length },
                {
                  id: "order-history",
                  label: "Orders",
                  count: orderHistory.length,
                },
                {
                  id: "history",
                  label: "Closed",
                  count: positionHistory.length,
                },
              ].map((tab) => (
                <button
                  key={`mobile-${tab.id}`}
                  onClick={() => setTradeSubTab(tab.id as any)}
                  className={`px-3 py-1 rounded-full text-[11px] font-extrabold transition-all flex items-center justify-center whitespace-nowrap ${
                    tradeSubTab === tab.id
                      ? "text-white bg-[#FF810A] shadow-xs"
                      : "text-slate-500 hover:text-slate-700"
                  }`}
                >
                  <span>{tab.label}</span>
                  <span className="opacity-90 ml-1 text-[10px]">
                    ({tab.count})
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Settle position list details */}
          <div className="pt-3">
            {tradeSubTab === "positions" && <DeltaPositionPanel />}

            {tradeSubTab === "open-orders" &&
              (pendingOrders.filter((o) => !o.type.includes("Stop")).length ===
              0 ? (
                <div className="text-center py-10 bg-surface rounded-[16px] border border-brand/10 p-6 text-[15px] text-text-muted">
                  ⚡ No open limit orders listed.
                </div>
              ) : (
                <div className="space-y-4">
                  {pendingOrders
                    .filter((o) => !o.type.includes("Stop"))
                    .map((o) => (
                      <div
                        key={`mob-list-open-ord-${o.id}`}
                        className="bg-white border border-orange-200 rounded-[14px] p-4 shadow-sm"
                      >
                        <div className="flex justify-between items-center mb-4">
                          <div className="flex items-center gap-2">
                            {renderAssetLogo(o.pair)}
                            <div>
                              <span className="text-[17px] font-semibold text-slate-900 leading-tight block font-mono">
                                {o.pair}
                              </span>
                              <span className="text-[14px] text-slate-500 font-medium block">
                                {o.type} Limit Order
                              </span>
                            </div>
                          </div>
                          <button
                            onClick={() => cancelPendingOrder(o.id)}
                            className="px-3 py-1.5 bg-red-50 text-red-600 rounded-[8px] text-[13px] font-semibold transition-all active:scale-95"
                          >
                            Cancel
                          </button>
                        </div>

                        <div className="grid grid-cols-2 gap-4 bg-orange-50 p-3.5 rounded-[12px] mb-2">
                          <div className="flex flex-col">
                            <span className="text-[14px] text-slate-500 font-medium">
                              Side
                            </span>
                            <span
                              className={`font-mono font-semibold uppercase ${o.side === "long" ? "text-green-600" : "text-red-500"}`}
                            >
                              {o.side === "long" ? "BUY LONG" : "SELL SHORT"}
                            </span>
                          </div>
                          <div className="flex flex-col text-right">
                            <span className="text-[14px] text-slate-500 font-medium">
                              Limit Price
                            </span>
                            <span className="font-mono text-slate-900 font-semibold text-[16px]">
                              {formatUSD(o.price)}
                            </span>
                          </div>
                          <div className="flex flex-col">
                            <span className="text-[14px] text-slate-500 font-medium">
                              Lots Size
                            </span>
                            <span className="font-mono text-slate-900 font-semibold text-[16px]">
                              {o.quantity.toFixed(4)} Lots
                            </span>
                          </div>
                          <div className="flex flex-col text-right">
                            <span className="text-[14px] text-slate-500 font-medium">
                              Total Est.
                            </span>
                            <span className="font-mono text-slate-900 font-semibold text-[16px]">
                              {formatUSD(o.price * o.quantity)}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              ))}

            {tradeSubTab === "stop-orders" &&
              (pendingOrders.filter((o) => o.type.includes("Stop")).length ===
              0 ? (
                <div className="text-center py-10 bg-surface rounded-[16px] border border-brand/10 p-6 text-[15px] text-text-muted">
                  ⚡ No pending stop triggers.
                </div>
              ) : (
                <div className="space-y-4">
                  {pendingOrders
                    .filter((o) => o.type.includes("Stop"))
                    .map((o) => (
                      <div
                        key={`mob-list-stop-ord-${o.id}`}
                        className="bg-white border border-orange-200 rounded-[14px] p-4 shadow-sm"
                      >
                        <div className="flex justify-between items-center mb-4">
                          <div className="flex items-center gap-2">
                            {renderAssetLogo(o.pair)}
                            <div>
                              <span className="text-[17px] font-semibold text-slate-900 leading-tight block font-mono">
                                {o.pair}
                              </span>
                              <span className="text-[14px] text-orange-600 font-medium block">
                                {o.type}
                              </span>
                            </div>
                          </div>
                          <button
                            onClick={() => cancelPendingOrder(o.id)}
                            className="px-3 py-1.5 bg-red-50 text-red-600 rounded-[8px] text-[13px] font-semibold transition-all active:scale-95"
                          >
                            Cancel
                          </button>
                        </div>

                        <div className="grid grid-cols-2 gap-4 bg-orange-50 p-3.5 rounded-[12px] mb-2">
                          <div className="flex flex-col">
                            <span className="text-[14px] text-slate-500 font-medium">
                              Side
                            </span>
                            <span
                              className={`font-mono font-semibold uppercase ${o.side === "long" ? "text-green-600" : "text-red-500"}`}
                            >
                              {o.side === "long" ? "BUY LONG" : "SELL SHORT"}
                            </span>
                          </div>
                          <div className="flex flex-col text-right">
                            <span className="text-[14px] text-slate-500 font-medium">
                              Trigger condition
                            </span>
                            <span className="font-mono text-orange-600 font-semibold">
                              ≤ {formatUSD(o.price)}
                            </span>
                          </div>
                          <div className="flex flex-col">
                            <span className="text-[14px] text-slate-500 font-medium">
                              Size
                            </span>
                            <span className="font-mono text-slate-900 font-semibold text-[16px]">
                              {o.quantity.toFixed(4)} Lots
                            </span>
                          </div>
                          <div className="flex flex-col text-right">
                            <span className="text-[14px] text-slate-500 font-medium">
                              Status
                            </span>
                            <span className="font-mono text-orange-600 font-semibold">
                              Awaiting Trigger
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              ))}

            {tradeSubTab === "fills" &&
              (tradeHistory.length === 0 ? (
                <div className="text-center py-10 bg-surface rounded-[16px] border border-brand/10 p-6 text-[15px] text-text-muted">
                  ⚡ No matched trade fills yet.
                </div>
              ) : (
                <div className="space-y-4">
                  {tradeHistory.map((t) => (
                    <div
                      key={`mob-list-fill-${t.id}`}
                      className="bg-surface border border-zinc-150  rounded-[16px] p-4 shadow-xs"
                    >
                      <div className="flex justify-between items-center mb-3">
                        <div className="flex items-center gap-2">
                          {renderAssetLogo(t.pair)}
                          <div>
                            <span className="text-[16px] font-bold text-text-main block">
                              {t.pair}
                            </span>
                            <span className="text-[10px] text-text-muted font-mono leading-none">
                              #{t.id}
                            </span>
                          </div>
                        </div>
                        <span className="text-[11px] text-text-muted font-mono">
                          {formatDate(t.timestamp)} {formatTime(t.timestamp)}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-1.5 text-xs">
                        <div className="flex justify-between py-1 border-b border-zinc-100  col-span-2">
                          <span className="text-text-muted">Side:</span>
                          <span
                            className={`font-mono font-bold ${t.side === "long" ? "text-success" : "text-danger"}`}
                          >
                            {t.side === "long" ? "BUY LONG" : "SELL SHORT"}
                          </span>
                        </div>
                        <div className="flex justify-between py-1 border-b border-zinc-100  col-span-2">
                          <span className="text-text-muted">Exec Price:</span>
                          <span className="font-mono text-text-main font-bold whitespace-nowrap">
                            {formatUSD(t.price)}
                          </span>
                        </div>
                        <div className="flex justify-between py-1 border-b border-zinc-100  col-span-2">
                          <span className="text-text-muted">Lots Filled:</span>
                          <span className="font-mono text-text-main font-bold whitespace-nowrap">
                            {t.quantity.toFixed(4)} Lots
                          </span>
                        </div>
                        <div className="flex justify-between py-1 col-span-2">
                          <span className="text-text-muted">Fee Paid:</span>
                          <span className="font-mono text-text-muted whitespace-nowrap">
                            {formatUSD(t.fee)}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ))}

            {tradeSubTab === "order-history" &&
              (orderHistory.length === 0 ? (
                <div className="text-center py-10 bg-surface rounded-[16px] border border-brand/10 p-6 text-[15px] text-text-muted">
                  ⚡ Order history log is currently empty.
                </div>
              ) : (
                <div className="space-y-4">
                  {orderHistory.map((o) => (
                    <div
                      key={`mob-list-ord-hist-${o.id}`}
                      className="bg-surface border border-zinc-150  rounded-[16px] p-4 shadow-xs"
                    >
                      <div className="flex justify-between items-center mb-2">
                        <div className="flex items-center gap-2">
                          {renderAssetLogo(o.pair)}
                          <span className="text-[16px] font-bold text-text-main">
                            {o.pair}
                          </span>
                        </div>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[14px] font-medium text-slate-500 uppercase ${
                            o.status === "Filled"
                              ? "bg-success/15 text-success"
                              : o.status === "Cancelled"
                                ? "bg-amber-500/15 text-amber-600 "
                                : "bg-danger/15 text-danger"
                          }`}
                        >
                          {o.status}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-1.5 text-xs text-text-muted p-2 rounded-xl bg-bg-sec/45">
                        <div className="flex justify-between col-span-2 border-b border-slate-100  pb-1">
                          <span>Side / Type:</span>
                          <span className="font-bold text-text-main">
                            {o.side.toUpperCase()} ({o.type})
                          </span>
                        </div>
                        <div className="flex justify-between col-span-2 border-b border-slate-100  pb-1">
                          <span>Rate Limit Price:</span>
                          <span className="font-mono text-text-main font-bold whitespace-nowrap">
                            {formatUSD(o.price)}
                          </span>
                        </div>
                        <div className="flex justify-between col-span-2">
                          <span>Lots Quantity:</span>
                          <span className="font-mono text-text-main font-bold">
                            {o.quantity.toFixed(4)} Lots
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ))}

            {tradeSubTab === "history" &&
              (positionHistory.length === 0 ? (
                <div className="text-center py-10 bg-surface rounded-[16px] border border-brand/10 p-6 text-[15px] text-text-muted">
                  ⚡ No historical closed transactions logged.
                </div>
              ) : (
                <div className="space-y-4">
                  {positionHistory.map((h) => {
                    const isProfit = h.pnl >= 0;
                    return (
                      <div
                        key={`mob-hist-${h.id}`}
                        className="bg-surface border border-[#FF8C42]/25 p-4 rounded-[16px] relative overflow-hidden shadow-sm transition-all"
                      >
                        <div className="flex justify-between items-center mb-3 border-b border-brand/10 pb-3">
                          <div className="flex items-center gap-2">
                            {renderAssetLogo(h.pair)}
                            <div>
                              <span className="font-bold text-[16px] text-text-main block">
                                {h.pair}
                              </span>
                              <div className="text-[11px] text-text-muted font-bold uppercase tracking-wider block mt-0.5">
                                Settle closed log
                              </div>
                            </div>
                          </div>
                          <div className="flex flex-col items-end gap-1.5">
                            <span
                              className={`px-2.5 py-0.5 rounded-md text-[15px] font-bold uppercase ${
                                h.side === "long"
                                  ? "bg-success/15 text-success"
                                  : "bg-danger/15 text-danger"
                              }`}
                            >
                              {h.side}
                            </span>
                            <span
                              className={`text-[11px] font-bold px-2.5 py-0.5 rounded-lg uppercase leading-none shadow-sm ${
                                h.status === "TP Hit"
                                  ? "bg-success/15 text-success border border-success/20"
                                  : h.status === "SL Hit"
                                    ? "bg-danger/15 text-danger border border-danger/20"
                                    : "bg-brand/15 text-brand border border-brand/20"
                              }`}
                            >
                              {h.status}
                            </span>
                          </div>
                        </div>

                        <div className="flex flex-col gap-2">
                          <div className="flex justify-between items-center">
                            <span className="text-[12px] text-text-muted font-bold block">
                              Entry Rate
                            </span>
                            <span className="font-mono text-text-main font-bold text-[16px] whitespace-nowrap">
                              {formatUSD(h.entryPrice)}
                            </span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-[12px] text-text-muted font-bold block">
                              Exit Rate
                            </span>
                            <span className="font-mono text-text-main font-bold text-[16px] whitespace-nowrap">
                              {formatUSD(h.exitPrice)}
                            </span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-[12px] text-text-muted font-bold block">
                              Lot Size
                            </span>
                            <span className="font-mono text-text-main font-bold text-[16px]">
                              {h.quantity} Lots
                            </span>
                          </div>

                          <div className="mt-1.5 flex justify-between items-center bg-bg-sec/55  p-3 rounded-xl border border-brand/5">
                            <span className="text-[12px] font-bold text-text-muted uppercase tracking-wider">
                              Realized gain
                            </span>
                            <span
                              className={`font-bold font-mono text-[17px] whitespace-nowrap ${isProfit ? "text-success" : "text-danger"}`}
                            >
                              {isProfit ? "+" : ""}
                              {formatUSD(h.pnl)}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ))}
          </div>
        </div>
      </div>

      {/* ========================================================================
          3. INTERACTIVE GENERAL BOTTOM DRAWER / MODAL SHEETS
          ======================================================================== */}
      <AnimatePresence>
        {showLeverageModal && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[150] flex items-center justify-center p-4">
            <div
              className="absolute inset-0 z-0 bg-[#000000]/10"
              onClick={() => setShowLeverageModal(false)}
            />

            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-[380px] bg-white  border border-slate-200  rounded-2xl z-10 flex flex-col overflow-hidden relative p-5 md:p-6 shadow-[0_24px_64px_rgba(0,0,0,0.15)]  select-none"
            >
              {/* Header */}
              <div className="flex items-center justify-center pb-4 border-b border-slate-100  relative">
                <span className="text-[17px] font-medium text-slate-900  tracking-wide">
                  Set Leverage
                </span>
                <button
                  onClick={() => setShowLeverageModal(false)}
                  className="absolute right-0 w-8 h-8 rounded-lg bg-slate-100  hover:bg-slate-200  text-slate-500  flex items-center justify-center transition-all active:scale-95 cursor-pointer"
                >
                  <X size={16} strokeWidth={2} />
                </button>
              </div>

              <div className="flex flex-col gap-2 mt-5">
                <div className="text-[14px] text-slate-500  font-medium">
                  Leverage
                </div>
                <div className="bg-slate-50  border border-orange-500  rounded-sm px-4 py-3 flex items-center justify-end select-none shadow-sm">
                  <span className="text-[18px] text-slate-900  font-medium">
                    {leverage}x
                  </span>
                </div>
              </div>

              {/* Precise discrete slider bar section matching image exactly */}
              <div className="relative pt-6 pb-10 select-none mt-4">
                {/* Micro slider base track */}
                <div className="h-[6px] bg-slate-200  rounded-full relative w-full">
                  {/* Slider active track (Matches image: track stays gray, only thumb is colored) */}
                </div>

                {/* Snaps dots & labels */}
                <div className="absolute inset-x-0 top-[24px] h-1 w-full">
                  {[1, 2, 5, 10, 25, 50, 100, 200].map((option, idx) => {
                    const isCurrent = leverage === option;
                    const percentage = (idx / 7) * 100;

                    return (
                      <div
                        key={option}
                        className="absolute -translate-x-1/2 flex flex-col items-center cursor-pointer group"
                        style={{ left: `${percentage}%` }}
                        onClick={() => setLeverage(option)}
                      >
                        {isCurrent ? (
                          <div className="w-[12px] h-[20px] bg-orange-500  rounded-[3px] border-[1.5px] border-white  flex items-center justify-center -mt-[8px] hover:scale-110 transition-transform cursor-pointer shadow-sm shadow-orange-500/40" />
                        ) : (
                          <div className="w-2.5 h-2.5 rounded-full bg-slate-300  -mt-[2px] group-hover:scale-125 transition-transform cursor-pointer" />
                        )}

                        <span
                          className={`text-[15px] mt-[18px] select-none transition-colors ${isCurrent ? "text-slate-900  font-medium" : "text-slate-500  group-hover:text-slate-700 "}`}
                        >
                          {option}x
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Dynamic reference mapping block matching screenshot's numerical formula exactly */}
              <div className="flex justify-between items-center mt-3 pb-3 select-none">
                <span
                  className="text-[14px] text-slate-500  border-b border-dashed border-slate-300  pb-[1px] cursor-help"
                  title="Maximum allowed overall position trade contract capacity given current tier parameters"
                >
                  Max position at {leverage}x
                </span>
                <span className="text-[16px] text-slate-900  font-medium">
                  {(9499.999 * leverage).toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}{" "}
                  USD
                </span>
              </div>

              {/* Action Button: Light Theme = light orange background, Dark Theme = dark orange-brown background */}
              <button
                onClick={() => setShowLeverageModal(false)}
                className="w-full mt-5 py-3.5 rounded-sm bg-orange-500  hover:bg-orange-600  text-white  font-medium text-[16px] transition-all cursor-pointer"
              >
                Set to {leverage}x
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Floating Modals for selector, calculator, fees standard definitions */}
      <MarketSelectorModal
        isOpen={showMarketSelector}
        selectedPair={selectedPair}
        onClose={() => setShowMarketSelector(false)}
        onSelectPair={(pair) => {
          setSelectedPair(pair);
          setShowMarketSelector(false);
        }}
      />

      <CalculatorModal
        isOpen={showCalculatorModal}
        onClose={() => setShowCalculatorModal(false)}
        defaultPrice={price}
        pair={selectedPair}
      />

      <FeesModal
        isOpen={showFeesModal}
        onClose={() => setShowFeesModal(false)}
      />

      <TpSlModal
        isOpen={showTpSlModal}
        onClose={() => setShowTpSlModal(false)}
        entryPrice={executionPrice}
        side={side}
        tradeSizeInCoins={tradeSizeInCoins}
        initialTpPrice={tpPriceStr}
        initialSlPrice={slPriceStr}
        onConfirm={(tp, sl) => {
          setTpPriceStr(tp);
          setSlPriceStr(sl);
          setAddTpSl(!!(tp || sl));
          setShowTpSlModal(false);
        }}
      />

      {/* ==================== CONFIRM ORDER PARAMETERS POPUP MODAL ==================== */}
      <AnimatePresence>
        {showConfirmModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-surface border border-brand/40 rounded-[20px] p-6 max-w-sm w-full shadow-2xl relative"
            >
              <h3 className="text-[16px] font-bold text-text-main border-b border-[#FFD2A8]  pb-3 uppercase tracking-wider flex items-center gap-2">
                <CheckCircle size={18} className="text-brand" />
                Order Summary
              </h3>

              <div className="my-5 flex flex-col gap-3.5">
                <div className="flex justify-between items-center text-[16px]">
                  <span className="text-text-muted font-bold">Asset</span>
                  <span className="font-mono text-text-main font-bold">
                    {selectedPair}
                  </span>
                </div>
                <div className="flex justify-between items-center text-[16px]">
                  <span className="text-text-muted font-bold">Direction</span>
                  <span
                    className={`font-bold uppercase px-2.5 py-0.5 rounded-md ${side === "long" ? "bg-[#1EC776]/15 text-[#1EC776]" : "bg-[#EF4444]/15 text-[#EF4444]"}`}
                  >
                    {side === "long" ? "BUY" : "SELL"}
                  </span>
                </div>
                <div className="flex justify-between items-center text-[16px]">
                  <span className="text-text-muted font-bold">Quantity</span>
                  <span className="font-mono text-text-main font-bold">
                    {quantityStr} Lot
                  </span>
                </div>
                <div className="flex justify-between items-center text-[16px]">
                  <span className="text-text-muted font-bold">Leverage</span>
                  <span className="font-mono text-text-main font-bold">
                    {leverage}x
                  </span>
                </div>
                <div className="flex justify-between items-center text-[16px]">
                  <span className="text-text-muted font-bold">Entry Price</span>
                  <span className="font-mono text-text-main font-bold">
                    {formatUSD(executionPrice)}
                  </span>
                </div>
                <div className="flex justify-between items-center text-[16px]">
                  <span className="text-text-muted font-bold">
                    Required Margin
                  </span>
                  <span className="font-mono text-brand font-bold">
                    {formatUSD(calculatedMargin)}
                  </span>
                </div>
                <div className="flex justify-between items-center text-[16px]">
                  <span className="text-text-muted font-bold">
                    Est. Liq Price
                  </span>
                  <span className="font-mono text-red-650 font-bold bg-red-50 px-1.5 py-0.5 rounded border border-red-200">
                    {formatUSD(
                      side === "long"
                        ? executionPrice * (1 - 0.9 / leverage)
                        : executionPrice * (1 + 0.9 / leverage)
                    )}
                  </span>
                </div>

                {addTpSl && (
                  <div className="border-t border-dashed border-[#FFD2A8]  pt-3 mt-1 flex flex-col gap-2 text-sm">
                    {tpPriceStr && (
                      <div className="flex justify-between items-center">
                        <span className="text-text-muted font-bold">
                          Take Profit (TP)
                        </span>
                        <div className="text-right">
                          <span className="font-mono font-bold block">
                            {formatUSD(parseFloat(tpPriceStr))}
                          </span>
                          {tpPnl > 0 && (
                            <span className="font-mono text-[11px] text-[#1EC776] block">
                              Est: +{formatUSD(tpPnl)}
                            </span>
                          )}
                        </div>
                      </div>
                    )}
                    {slPriceStr && (
                      <div className="flex justify-between items-center">
                        <span className="text-text-muted font-bold">
                          Stop Loss (SL)
                        </span>
                        <div className="text-right">
                          <span className="font-mono font-bold block">
                            {formatUSD(parseFloat(slPriceStr))}
                          </span>
                          {slPnl < 0 && (
                            <span className="font-mono text-[11px] text-[#EF4444] block">
                              Est: {formatUSD(slPnl)}
                            </span>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Action row with the full-width, orange, 12px rounded confirm button */}
              <div className="flex flex-col gap-3 mt-5">
                <button
                  onClick={() => {
                    handleOrderSubmit();
                    setShowConfirmModal(false);
                  }}
                  className="w-full py-3 rounded-[12px] text-[16px] font-bold text-white bg-brand hover:bg-brand-hover shadow-lg shadow-brand/20 transition-all active:scale-95 leading-none uppercase tracking-wider"
                >
                  Confirm Order
                </button>
                <button
                  onClick={() => setShowConfirmModal(false)}
                  className="w-full py-2.5 rounded-[12px] text-[15px] font-bold text-text-muted hover:text-text-main transition-colors text-center"
                >
                  Cancel and Adjust Settings
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
