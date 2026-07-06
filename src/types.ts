export interface Position {
  id: number;
  pair: string;
  side: 'long' | 'short';
  quantity: number;
  entryPrice: number;
  leverage: number;
  margin: number;
  timestamp: number;
  tp?: number;
  sl?: number;
}

export interface AccountBalance {
  inr: number;
  usd: number;
}

export interface TickerData {
  symbol: string;
  lastPrice: number;
  priceChangePercent: number;
  quoteVolume: number;
  category?: string;
  dailyHigh?: number;
  dailyLow?: number;
  lotValue?: number;
  status?: 'Open' | 'Closed';
  openingPrice?: number;
}

export interface DailyMarketState {
  symbol: string;
  basePrice: number;
  movementRange: number; // e.g. 0.03 for 3%
  lotValue: number;
  pnlRatio: number;
  volatility: number;
  openingPrice: number;
  updatedAt: string;
}

export interface OrderBook {
  bids: [number, number][]; // price, size
  asks: [number, number][];
}

export interface PendingOrder {
  id: number;
  pair: string;
  side: 'long' | 'short';
  type: string; // 'Limit' | 'Market'
  price: number;
  quantity: number;
  leverage: number;
  timestamp: number;
}

export interface OrderHistoryItem {
  id: number;
  pair: string;
  side: 'long' | 'short';
  type: string; // 'Limit' | 'Market'
  quantity: number;
  price: number;
  status: 'Filled' | 'Cancelled' | 'Expired';
  timestamp: number;
}

export interface TradeHistoryItem {
  id: number;
  pair: string;
  side: 'long' | 'short';
  quantity: number;
  price: number;
  timestamp: number;
  fee: number;
}

export interface PositionHistoryItem {
  id: number;
  pair: string;
  side: 'long' | 'short';
  leverage: number;
  quantity: number;
  entryPrice: number;
  exitPrice: number;
  openTime: number;
  closeTime: number;
  pnl: number;
  holdingFee: number;
  closeFee: number;
  status: 'Closed' | 'TP Hit' | 'SL Hit';
}

