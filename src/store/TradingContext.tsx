import React, { createContext, useContext, useState, useEffect, ReactNode, useRef } from 'react';
import { useAuth } from './AuthContext';
import { Position, AccountBalance, TickerData, OrderBook, PendingOrder, OrderHistoryItem, TradeHistoryItem, PositionHistoryItem, DailyMarketState } from '../types';

import { db } from '../lib/firebase';
import { onSnapshot, doc } from 'firebase/firestore';

export const formatUSD = (val: number) => {
  if (val === undefined || val === null || isNaN(val)) return '$0.00';
  return new Intl.NumberFormat('en-US', { 
    style: 'currency', 
    currency: 'USD',
    minimumFractionDigits: 2, 
    maximumFractionDigits: 2 
  }).format(val);
};

export const formatINR = (val: number) => {
  if (val === undefined || val === null || isNaN(val)) return '₹0.00';
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 2 }).format(val);
};

interface TradingContextType {
  accountMode: 'real' | 'demo';
  setAccountMode: (mode: 'real' | 'demo') => void;
  accountBalance: AccountBalance; // Points to active one
  realBalance: AccountBalance;
  demoBalance: AccountBalance;
  setRealBalance: React.Dispatch<React.SetStateAction<AccountBalance>>;
  setDemoBalance: React.Dispatch<React.SetStateAction<AccountBalance>>;
  positions: Position[];
  selectedPair: string;
  setSelectedPair: (pair: string) => void;
  executeTrade: (
    side: 'long' | 'short',
    quantity: number,
    leverage: number,
    orderType?: string,
    limitPrice?: number,
    tpPrice?: number,
    slPrice?: number,
    pair?: string
  ) => void;
  closePosition: (id: number) => void;
  closePositionPartial: (id: number, fraction?: number) => void;
  addFunds: (usdAmount: number) => void;
  tickers: Record<string, TickerData>;
  currentPrices: Record<string, number>;
  orderBook: OrderBook;
  preloadedSide: 'long' | 'short' | null;
  setPreloadedSide: (side: 'long' | 'short' | null) => void;
  pendingOrders: PendingOrder[];
  orderHistory: OrderHistoryItem[];
  tradeHistory: TradeHistoryItem[];
  positionHistory: PositionHistoryItem[];
  cancelPendingOrder: (id: number) => void;
  modifyPendingOrder: (id: number, price: number, qty: number) => void;
  updatePositionTpSl: (id: number, tp?: number, sl?: number) => void;
  theme: 'warm' | 'dark';
  toggleTheme: () => void;
  appSettings: { vpa?: string, merchantName?: string, upiActive?: boolean, logoUrl?: string };
}

const TradingContext = createContext<TradingContextType | undefined>(undefined);

const INITIAL_BALANCE = { usd: 0, inr: 0 };

export interface InstrumentConfig {
  minQuantity: number;
  lotMultiplier: number;
  contractSize: number;
}

export interface AssetSpecDetails {
  contractSize: string;
  contractSizeVal: number;
  minQty: number;
  maxQty: number;
  pointValue: string;
  pointValueVal: number;
  leverage: number;
  tradingHours: Record<number, { start: string; end: string }[]>;
  tradingHoursText: string;
}

export const ASSET_SPECS: Record<string, AssetSpecDetails> = {
  // --- Standard Forex Monday - Thursday: 00:01-23:58, Friday: 00:01-23:57 (Leverage 2000, Contract 100k) ---
  'AUD/CAD': { contractSize: '100000 AUD', contractSizeVal: 100000, minQty: 0.01, maxQty: 100, pointValue: '1.0 CAD', pointValueVal: 1.0, leverage: 2000, tradingHours: { 1: [{ start: '00:01', end: '23:58' }], 2: [{ start: '00:01', end: '23:58' }], 3: [{ start: '00:01', end: '23:58' }], 4: [{ start: '00:01', end: '23:58' }], 5: [{ start: '00:01', end: '23:57' }] }, tradingHoursText: 'Mon-Thurs: 00:01-23:58, Fri: 00:01-23:57' },
  'AUD/CHF': { contractSize: '100000 AUD', contractSizeVal: 100000, minQty: 0.01, maxQty: 100, pointValue: '1.0 CHF', pointValueVal: 1.0, leverage: 2000, tradingHours: { 1: [{ start: '00:01', end: '23:58' }], 2: [{ start: '00:01', end: '23:58' }], 3: [{ start: '00:01', end: '23:58' }], 4: [{ start: '00:01', end: '23:58' }], 5: [{ start: '00:01', end: '23:57' }] }, tradingHoursText: 'Mon-Thurs: 00:01-23:58, Fri: 00:01-23:57' },
  'AUD/JPY': { contractSize: '100000 AUD', contractSizeVal: 100000, minQty: 0.01, maxQty: 100, pointValue: '100.0 JPY', pointValueVal: 100.0, leverage: 2000, tradingHours: { 1: [{ start: '00:01', end: '23:58' }], 2: [{ start: '00:01', end: '23:58' }], 3: [{ start: '00:01', end: '23:58' }], 4: [{ start: '00:01', end: '23:58' }], 5: [{ start: '00:01', end: '23:57' }] }, tradingHoursText: 'Mon-Thurs: 00:01-23:58, Fri: 00:01-23:57' },
  'AUD/NZD': { contractSize: '100000 AUD', contractSizeVal: 100000, minQty: 0.01, maxQty: 100, pointValue: '1.0 NZD', pointValueVal: 1.0, leverage: 2000, tradingHours: { 1: [{ start: '00:01', end: '23:58' }], 2: [{ start: '00:01', end: '23:58' }], 3: [{ start: '00:01', end: '23:58' }], 4: [{ start: '00:01', end: '23:58' }], 5: [{ start: '00:01', end: '23:57' }] }, tradingHoursText: 'Mon-Thurs: 00:01-23:58, Fri: 00:01-23:57' },
  'AUD/SGD': { contractSize: '100000 AUD', contractSizeVal: 100000, minQty: 0.01, maxQty: 100, pointValue: '1.0 SGD', pointValueVal: 1.0, leverage: 2000, tradingHours: { 1: [{ start: '00:01', end: '23:58' }], 2: [{ start: '00:01', end: '23:58' }], 3: [{ start: '00:01', end: '23:58' }], 4: [{ start: '00:01', end: '23:58' }], 5: [{ start: '00:01', end: '23:57' }] }, tradingHoursText: 'Mon-Thurs: 00:01-23:58, Fri: 00:01-23:57' },
  'AUD/USD': { contractSize: '100000 AUD', contractSizeVal: 100000, minQty: 0.01, maxQty: 100, pointValue: '1.0 USD', pointValueVal: 1.0, leverage: 2000, tradingHours: { 1: [{ start: '00:01', end: '23:58' }], 2: [{ start: '00:01', end: '23:58' }], 3: [{ start: '00:01', end: '23:58' }], 4: [{ start: '00:01', end: '23:58' }], 5: [{ start: '00:01', end: '23:57' }] }, tradingHoursText: 'Mon-Thurs: 00:01-23:58, Fri: 00:01-23:57' },
  'CAD/CHF': { contractSize: '100000 CAD', contractSizeVal: 100000, minQty: 0.01, maxQty: 100, pointValue: '1.0 CHF', pointValueVal: 1.0, leverage: 2000, tradingHours: { 1: [{ start: '00:01', end: '23:58' }], 2: [{ start: '00:01', end: '23:58' }], 3: [{ start: '00:01', end: '23:58' }], 4: [{ start: '00:01', end: '23:58' }], 5: [{ start: '00:01', end: '23:57' }] }, tradingHoursText: 'Mon-Thurs: 00:01-23:58, Fri: 00:01-23:57' },
  'CAD/JPY': { contractSize: '100000 CAD', contractSizeVal: 100000, minQty: 0.01, maxQty: 100, pointValue: '100.0 JPY', pointValueVal: 100.0, leverage: 2000, tradingHours: { 1: [{ start: '00:01', end: '23:58' }], 2: [{ start: '00:01', end: '23:58' }], 3: [{ start: '00:01', end: '23:58' }], 4: [{ start: '00:01', end: '23:58' }], 5: [{ start: '00:01', end: '23:57' }] }, tradingHoursText: 'Mon-Thurs: 00:01-23:58, Fri: 00:01-23:57' },
  'CHF/JPY': { contractSize: '100000 CHF', contractSizeVal: 100000, minQty: 0.01, maxQty: 100, pointValue: '100.0 JPY', pointValueVal: 100.0, leverage: 2000, tradingHours: { 1: [{ start: '00:01', end: '23:58' }], 2: [{ start: '00:01', end: '23:58' }], 3: [{ start: '00:01', end: '23:58' }], 4: [{ start: '00:01', end: '23:58' }], 5: [{ start: '00:01', end: '23:57' }] }, tradingHoursText: 'Mon-Thurs: 00:01-23:58, Fri: 00:01-23:57' },
  'CHF/SGD': { contractSize: '100000 CHF', contractSizeVal: 100000, minQty: 0.01, maxQty: 100, pointValue: '1.0 SGD', pointValueVal: 1.0, leverage: 2000, tradingHours: { 1: [{ start: '00:01', end: '23:58' }], 2: [{ start: '00:01', end: '23:58' }], 3: [{ start: '00:01', end: '23:58' }], 4: [{ start: '00:01', end: '23:58' }], 5: [{ start: '00:01', end: '23:57' }] }, tradingHoursText: 'Mon-Thurs: 00:01-23:58, Fri: 00:01-23:57' },
  'EUR/AUD': { contractSize: '100000 EUR', contractSizeVal: 100000, minQty: 0.01, maxQty: 100, pointValue: '1.0 AUD', pointValueVal: 1.0, leverage: 2000, tradingHours: { 1: [{ start: '00:01', end: '23:58' }], 2: [{ start: '00:01', end: '23:58' }], 3: [{ start: '00:01', end: '23:58' }], 4: [{ start: '00:01', end: '23:58' }], 5: [{ start: '00:01', end: '23:57' }] }, tradingHoursText: 'Mon-Thurs: 00:01-23:58, Fri: 00:01-23:57' },
  'EUR/CAD': { contractSize: '100000 EUR', contractSizeVal: 100000, minQty: 0.01, maxQty: 100, pointValue: '1.0 CAD', pointValueVal: 1.0, leverage: 2000, tradingHours: { 1: [{ start: '00:01', end: '23:58' }], 2: [{ start: '00:01', end: '23:58' }], 3: [{ start: '00:01', end: '23:58' }], 4: [{ start: '00:01', end: '23:58' }], 5: [{ start: '00:01', end: '23:57' }] }, tradingHoursText: 'Mon-Thurs: 00:01-23:58, Fri: 00:01-23:57' },
  'EUR/CHF': { contractSize: '100000 EUR', contractSizeVal: 100000, minQty: 0.01, maxQty: 100, pointValue: '1.0 CHF', pointValueVal: 1.0, leverage: 2000, tradingHours: { 1: [{ start: '00:01', end: '23:58' }], 2: [{ start: '00:01', end: '23:58' }], 3: [{ start: '00:01', end: '23:58' }], 4: [{ start: '00:01', end: '23:58' }], 5: [{ start: '00:01', end: '23:57' }] }, tradingHoursText: 'Mon-Thurs: 00:01-23:58, Fri: 00:01-23:57' },
  'EUR/CZK': { contractSize: '100000 EUR', contractSizeVal: 100000, minQty: 0.01, maxQty: 100, pointValue: '10.0 CZK', pointValueVal: 10.0, leverage: 20, tradingHours: { 1: [{ start: '00:01', end: '23:58' }], 2: [{ start: '00:01', end: '23:58' }], 3: [{ start: '00:01', end: '23:58' }], 4: [{ start: '00:01', end: '23:58' }], 5: [{ start: '00:01', end: '23:57' }] }, tradingHoursText: 'Mon-Thurs: 00:01-23:58, Fri: 00:01-23:57' },
  'EUR/DKK': { contractSize: '100000 EUR', contractSizeVal: 100000, minQty: 0.01, maxQty: 100, pointValue: '1.0 DKK', pointValueVal: 1.0, leverage: 20, tradingHours: { 1: [{ start: '00:01', end: '23:58' }], 2: [{ start: '00:01', end: '23:58' }], 3: [{ start: '00:01', end: '23:58' }], 4: [{ start: '00:01', end: '23:58' }], 5: [{ start: '00:01', end: '23:57' }] }, tradingHoursText: 'Mon-Thurs: 00:01-23:58, Fri: 00:01-23:57' },
  'EUR/GBP': { contractSize: '100000 EUR', contractSizeVal: 100000, minQty: 0.01, maxQty: 100, pointValue: '1.0 GBP', pointValueVal: 1.0, leverage: 2000, tradingHours: { 1: [{ start: '00:01', end: '23:58' }], 2: [{ start: '00:01', end: '23:58' }], 3: [{ start: '00:01', end: '23:58' }], 4: [{ start: '00:01', end: '23:58' }], 5: [{ start: '00:01', end: '23:57' }] }, tradingHoursText: 'Mon-Thurs: 00:01-23:58, Fri: 00:01-23:57' },
  'EUR/HUF': { contractSize: '100000 EUR', contractSizeVal: 100000, minQty: 0.01, maxQty: 100, pointValue: '100.0 HUF', pointValueVal: 100.0, leverage: 20, tradingHours: { 1: [{ start: '00:01', end: '23:58' }], 2: [{ start: '00:01', end: '23:58' }], 3: [{ start: '00:01', end: '23:58' }], 4: [{ start: '00:01', end: '23:58' }], 5: [{ start: '00:01', end: '23:57' }] }, tradingHoursText: 'Mon-Thurs: 00:01-23:58, Fri: 00:01-23:57' },
  'EUR/JPY': { contractSize: '100000 EUR', contractSizeVal: 100000, minQty: 0.01, maxQty: 100, pointValue: '100.0 JPY', pointValueVal: 100.0, leverage: 2000, tradingHours: { 1: [{ start: '00:01', end: '23:58' }], 2: [{ start: '00:01', end: '23:58' }], 3: [{ start: '00:01', end: '23:58' }], 4: [{ start: '00:01', end: '23:58' }], 5: [{ start: '00:01', end: '23:57' }] }, tradingHoursText: 'Mon-Thurs: 00:01-23:58, Fri: 00:01-23:57' },
  'EUR/NOK': { contractSize: '100000 EUR', contractSizeVal: 100000, minQty: 0.01, maxQty: 100, pointValue: '1.0 NOK', pointValueVal: 1.0, leverage: 10, tradingHours: { 1: [{ start: '00:01', end: '23:58' }], 2: [{ start: '00:01', end: '23:58' }], 3: [{ start: '00:01', end: '23:58' }], 4: [{ start: '00:01', end: '23:58' }], 5: [{ start: '00:01', end: '23:57' }] }, tradingHoursText: 'Mon-Thurs: 00:01-23:58, Fri: 00:01-23:57' },
  'EUR/NZD': { contractSize: '100000 EUR', contractSizeVal: 100000, minQty: 0.01, maxQty: 100, pointValue: '1.0 NZD', pointValueVal: 1.0, leverage: 2000, tradingHours: { 1: [{ start: '00:01', end: '23:58' }], 2: [{ start: '00:01', end: '23:58' }], 3: [{ start: '00:01', end: '23:58' }], 4: [{ start: '00:01', end: '23:58' }], 5: [{ start: '00:01', end: '23:57' }] }, tradingHoursText: 'Mon-Thurs: 00:01-23:58, Fri: 00:01-23:57' },
  'EUR/PLN': { contractSize: '100000 EUR', contractSizeVal: 100000, minQty: 0.01, maxQty: 100, pointValue: '1.0 PLN', pointValueVal: 1.0, leverage: 50, tradingHours: { 1: [{ start: '00:01', end: '23:58' }], 2: [{ start: '00:01', end: '23:58' }], 3: [{ start: '00:01', end: '23:58' }], 4: [{ start: '00:01', end: '23:58' }], 5: [{ start: '00:01', end: '23:57' }] }, tradingHoursText: 'Mon-Thurs: 00:01-23:58, Fri: 00:01-23:57' },
  'EUR/SEK': { contractSize: '100000 EUR', contractSizeVal: 100000, minQty: 0.01, maxQty: 100, pointValue: '1.0 SEK', pointValueVal: 1.0, leverage: 10, tradingHours: { 1: [{ start: '00:01', end: '23:58' }], 2: [{ start: '00:01', end: '23:58' }], 3: [{ start: '00:01', end: '23:58' }], 4: [{ start: '00:01', end: '23:58' }], 5: [{ start: '00:01', end: '23:57' }] }, tradingHoursText: 'Mon-Thurs: 00:01-23:58, Fri: 00:01-23:57' },
  'EUR/SGD': { contractSize: '100000 EUR', contractSizeVal: 100000, minQty: 0.01, maxQty: 100, pointValue: '1.0 SGD', pointValueVal: 1.0, leverage: 2000, tradingHours: { 1: [{ start: '00:01', end: '23:58' }], 2: [{ start: '00:01', end: '23:58' }], 3: [{ start: '00:01', end: '23:58' }], 4: [{ start: '00:01', end: '23:58' }], 5: [{ start: '00:01', end: '23:57' }] }, tradingHoursText: 'Mon-Thurs: 00:01-23:58, Fri: 00:01-23:57' },
  'EUR/TRY': { contractSize: '100000 EUR', contractSizeVal: 100000, minQty: 0.01, maxQty: 100, pointValue: '1.0 TRY', pointValueVal: 1.0, leverage: 20, tradingHours: { 1: [{ start: '00:01', end: '23:58' }], 2: [{ start: '00:01', end: '23:58' }], 3: [{ start: '00:01', end: '23:58' }], 4: [{ start: '00:01', end: '23:58' }], 5: [{ start: '00:01', end: '23:57' }] }, tradingHoursText: 'Mon-Thurs: 00:01-23:58, Fri: 00:01-23:57' },
  'EUR/USD': { contractSize: '100000 EUR', contractSizeVal: 100000, minQty: 0.01, maxQty: 100, pointValue: '1.0 USD', pointValueVal: 1.0, leverage: 2000, tradingHours: { 1: [{ start: '00:01', end: '23:58' }], 2: [{ start: '00:01', end: '23:58' }], 3: [{ start: '00:01', end: '23:58' }], 4: [{ start: '00:01', end: '23:58' }], 5: [{ start: '00:01', end: '23:57' }] }, tradingHoursText: 'Mon-Thurs: 00:01-23:58, Fri: 00:01-23:57' },
  
  'GBP/AUD': { contractSize: '100000 GBP', contractSizeVal: 100000, minQty: 0.01, maxQty: 100, pointValue: '1.0 AUD', pointValueVal: 1.0, leverage: 2000, tradingHours: { 1: [{ start: '00:01', end: '23:58' }], 2: [{ start: '00:01', end: '23:58' }], 3: [{ start: '00:01', end: '23:58' }], 4: [{ start: '00:01', end: '23:58' }], 5: [{ start: '00:01', end: '23:57' }] }, tradingHoursText: 'Mon-Thurs: 00:01-23:58, Fri: 00:01-23:57' },
  'GBP/CAD': { contractSize: '100000 GBP', contractSizeVal: 100000, minQty: 0.01, maxQty: 100, pointValue: '1.0 CAD', pointValueVal: 1.0, leverage: 2000, tradingHours: { 1: [{ start: '00:01', end: '23:58' }], 2: [{ start: '00:01', end: '23:58' }], 3: [{ start: '00:01', end: '23:58' }], 4: [{ start: '00:01', end: '23:58' }], 5: [{ start: '00:01', end: '23:57' }] }, tradingHoursText: 'Mon-Thurs: 00:01-23:58, Fri: 00:01-23:57' },
  'GBP/CHF': { contractSize: '100000 GBP', contractSizeVal: 100000, minQty: 0.01, maxQty: 100, pointValue: '1.0 CHF', pointValueVal: 1.0, leverage: 2000, tradingHours: { 1: [{ start: '00:01', end: '23:58' }], 2: [{ start: '00:01', end: '23:58' }], 3: [{ start: '00:01', end: '23:58' }], 4: [{ start: '00:01', end: '23:58' }], 5: [{ start: '00:01', end: '23:57' }] }, tradingHoursText: 'Mon-Thurs: 00:01-23:58, Fri: 00:01-23:57' },
  'GBP/JPY': { contractSize: '100000 GBP', contractSizeVal: 100000, minQty: 0.01, maxQty: 100, pointValue: '100.0 JPY', pointValueVal: 100.0, leverage: 2000, tradingHours: { 1: [{ start: '00:01', end: '23:58' }], 2: [{ start: '00:01', end: '23:58' }], 3: [{ start: '00:01', end: '23:58' }], 4: [{ start: '00:01', end: '23:58' }], 5: [{ start: '00:01', end: '23:57' }] }, tradingHoursText: 'Mon-Thurs: 00:01-23:58, Fri: 00:01-23:57' },
  'GBP/NZD': { contractSize: '100000 GBP', contractSizeVal: 100000, minQty: 0.01, maxQty: 100, pointValue: '1.0 NZD', pointValueVal: 1.0, leverage: 2000, tradingHours: { 1: [{ start: '00:01', end: '23:58' }], 2: [{ start: '00:01', end: '23:58' }], 3: [{ start: '00:01', end: '23:58' }], 4: [{ start: '00:01', end: '23:58' }], 5: [{ start: '00:01', end: '23:57' }] }, tradingHoursText: 'Mon-Thurs: 00:01-23:58, Fri: 00:01-23:57' },
  'GBP/SGD': { contractSize: '100000 GBP', contractSizeVal: 100000, minQty: 0.01, maxQty: 100, pointValue: '1.0 SGD', pointValueVal: 1.0, leverage: 2000, tradingHours: { 1: [{ start: '00:01', end: '23:58' }], 2: [{ start: '00:01', end: '23:58' }], 3: [{ start: '00:01', end: '23:58' }], 4: [{ start: '00:01', end: '23:58' }], 5: [{ start: '00:01', end: '23:57' }] }, tradingHoursText: 'Mon-Thurs: 00:01-23:58, Fri: 00:01-23:57' },
  'GBP/USD': { contractSize: '100000 GBP', contractSizeVal: 100000, minQty: 0.01, maxQty: 100, pointValue: '1.0 USD', pointValueVal: 1.0, leverage: 2000, tradingHours: { 1: [{ start: '00:01', end: '23:58' }], 2: [{ start: '00:01', end: '23:58' }], 3: [{ start: '00:01', end: '23:58' }], 4: [{ start: '00:01', end: '23:58' }], 5: [{ start: '00:01', end: '23:57' }] }, tradingHoursText: 'Mon-Thurs: 00:01-23:58, Fri: 00:01-23:57' },
  
  'NZD/CAD': { contractSize: '100000 NZD', contractSizeVal: 100000, minQty: 0.01, maxQty: 100, pointValue: '1.0 CAD', pointValueVal: 1.0, leverage: 2000, tradingHours: { 1: [{ start: '00:01', end: '23:58' }], 2: [{ start: '00:01', end: '23:58' }], 3: [{ start: '00:01', end: '23:58' }], 4: [{ start: '00:01', end: '23:58' }], 5: [{ start: '00:01', end: '23:57' }] }, tradingHoursText: 'Mon-Thurs: 00:01-23:58, Fri: 00:01-23:57' },
  'NZD/CHF': { contractSize: '100000 NZD', contractSizeVal: 100000, minQty: 0.01, maxQty: 100, pointValue: '1.0 CHF', pointValueVal: 1.0, leverage: 2000, tradingHours: { 1: [{ start: '00:01', end: '23:58' }], 2: [{ start: '00:01', end: '23:58' }], 3: [{ start: '00:01', end: '23:58' }], 4: [{ start: '00:01', end: '23:58' }], 5: [{ start: '00:01', end: '23:57' }] }, tradingHoursText: 'Mon-Thurs: 00:01-23:58, Fri: 00:01-23:57' },
  'NZD/JPY': { contractSize: '100000 NZD', contractSizeVal: 100000, minQty: 0.01, maxQty: 100, pointValue: '100.0 JPY', pointValueVal: 100.0, leverage: 2000, tradingHours: { 1: [{ start: '00:01', end: '23:58' }], 2: [{ start: '00:01', end: '23:58' }], 3: [{ start: '00:01', end: '23:58' }], 4: [{ start: '00:01', end: '23:58' }], 5: [{ start: '00:01', end: '23:57' }] }, tradingHoursText: 'Mon-Thurs: 00:01-23:58, Fri: 00:01-23:57' },
  'NZD/SGD': { contractSize: '100000 NZD', contractSizeVal: 100000, minQty: 0.01, maxQty: 100, pointValue: '1.0 SGD', pointValueVal: 1.0, leverage: 2000, tradingHours: { 1: [{ start: '00:01', end: '23:58' }], 2: [{ start: '00:01', end: '23:58' }], 3: [{ start: '00:01', end: '23:58' }], 4: [{ start: '00:01', end: '23:58' }], 5: [{ start: '00:01', end: '23:57' }] }, tradingHoursText: 'Mon-Thurs: 00:01-23:58, Fri: 00:01-23:57' },
  'NZD/USD': { contractSize: '100000 NZD', contractSizeVal: 100000, minQty: 0.01, maxQty: 100, pointValue: '1.0 USD', pointValueVal: 1.0, leverage: 2000, tradingHours: { 1: [{ start: '00:01', end: '23:58' }], 2: [{ start: '00:01', end: '23:58' }], 3: [{ start: '00:01', end: '23:58' }], 4: [{ start: '00:01', end: '23:58' }], 5: [{ start: '00:01', end: '23:57' }] }, tradingHoursText: 'Mon-Thurs: 00:01-23:58, Fri: 00:01-23:57' },
  
  'SGD/JPY': { contractSize: '100000 SGD', contractSizeVal: 100000, minQty: 0.01, maxQty: 100, pointValue: '100.0 JPY', pointValueVal: 100.0, leverage: 2000, tradingHours: { 1: [{ start: '00:01', end: '23:58' }], 2: [{ start: '00:01', end: '23:58' }], 3: [{ start: '00:01', end: '23:58' }], 4: [{ start: '00:01', end: '23:58' }], 5: [{ start: '00:01', end: '23:57' }] }, tradingHoursText: 'Mon-Thurs: 00:01-23:58, Fri: 00:01-23:57' },
  
  'USD/CAD': { contractSize: '100000 USD', contractSizeVal: 100000, minQty: 0.01, maxQty: 100, pointValue: '1.0 CAD', pointValueVal: 1.0, leverage: 2000, tradingHours: { 1: [{ start: '00:01', end: '23:58' }], 2: [{ start: '00:01', end: '23:58' }], 3: [{ start: '00:01', end: '23:58' }], 4: [{ start: '00:01', end: '23:58' }], 5: [{ start: '00:01', end: '23:57' }] }, tradingHoursText: 'Mon-Thurs: 00:01-23:58, Fri: 00:01-23:57' },
  'USD/CHF': { contractSize: '100000 USD', contractSizeVal: 100000, minQty: 0.01, maxQty: 100, pointValue: '1.0 CHF', pointValueVal: 1.0, leverage: 2000, tradingHours: { 1: [{ start: '00:01', end: '23:58' }], 2: [{ start: '00:01', end: '23:58' }], 3: [{ start: '00:01', end: '23:58' }], 4: [{ start: '00:01', end: '23:58' }], 5: [{ start: '00:01', end: '23:57' }] }, tradingHoursText: 'Mon-Thurs: 00:01-23:58, Fri: 00:01-23:57' },
  'USD/CNH': { contractSize: '100000 USD', contractSizeVal: 100000, minQty: 0.01, maxQty: 100, pointValue: '1.0 CNH', pointValueVal: 1.0, leverage: 2000, tradingHours: { 1: [{ start: '00:01', end: '23:58' }], 2: [{ start: '00:01', end: '23:58' }], 3: [{ start: '00:01', end: '23:58' }], 4: [{ start: '00:01', end: '23:58' }], 5: [{ start: '00:01', end: '23:57' }] }, tradingHoursText: 'Mon-Thurs: 00:01-23:58, Fri: 00:01-23:57' },
  'USD/CZK': { contractSize: '100000 USD', contractSizeVal: 100000, minQty: 0.01, maxQty: 100, pointValue: '1.0 CZK', pointValueVal: 1.0, leverage: 20, tradingHours: { 1: [{ start: '00:01', end: '23:58' }], 2: [{ start: '00:01', end: '23:58' }], 3: [{ start: '00:01', end: '23:58' }], 4: [{ start: '00:01', end: '23:58' }], 5: [{ start: '00:01', end: '23:57' }] }, tradingHoursText: 'Mon-Thurs: 00:01-23:58, Fri: 00:01-23:57' },
  'USD/DKK': { contractSize: '100000 USD', contractSizeVal: 100000, minQty: 0.01, maxQty: 100, pointValue: '1.0 DKK', pointValueVal: 1.0, leverage: 20, tradingHours: { 1: [{ start: '00:01', end: '23:58' }], 2: [{ start: '00:01', end: '23:58' }], 3: [{ start: '00:01', end: '23:58' }], 4: [{ start: '00:01', end: '23:58' }], 5: [{ start: '00:01', end: '23:57' }] }, tradingHoursText: 'Mon-Thurs: 00:01-23:58, Fri: 00:01-23:57' },
  'USD/HUF': { contractSize: '100000 USD', contractSizeVal: 100000, minQty: 0.01, maxQty: 100, pointValue: '100.0 HUF', pointValueVal: 100.0, leverage: 20, tradingHours: { 1: [{ start: '00:01', end: '23:58' }], 2: [{ start: '00:01', end: '23:58' }], 3: [{ start: '00:01', end: '23:58' }], 4: [{ start: '00:01', end: '23:58' }], 5: [{ start: '00:01', end: '23:57' }] }, tradingHoursText: 'Mon-Thurs: 00:01-23:58, Fri: 00:01-23:57' },
  'USD/ILS': { contractSize: '100000 USD', contractSizeVal: 100000, minQty: 0.01, maxQty: 100, pointValue: '1.0 ILS', pointValueVal: 1.0, leverage: 20, tradingHours: { 1: [{ start: '00:01', end: '23:58' }], 2: [{ start: '00:01', end: '23:58' }], 3: [{ start: '00:01', end: '23:58' }], 4: [{ start: '00:01', end: '23:58' }], 5: [{ start: '00:01', end: '23:57' }] }, tradingHoursText: 'Mon-Thurs: 00:01-23:58, Fri: 00:01-23:57' },
  'USD/JPY': { contractSize: '100000 USD', contractSizeVal: 100000, minQty: 0.01, maxQty: 100, pointValue: '100.0 JPY', pointValueVal: 100.0, leverage: 2000, tradingHours: { 1: [{ start: '00:01', end: '23:58' }], 2: [{ start: '00:01', end: '23:58' }], 3: [{ start: '00:01', end: '23:58' }], 4: [{ start: '00:01', end: '23:58' }], 5: [{ start: '00:01', end: '23:57' }] }, tradingHoursText: 'Mon-Thurs: 00:01-23:58, Fri: 00:01-23:57' },
  'USD/MXN': { contractSize: '100000 USD', contractSizeVal: 100000, minQty: 0.01, maxQty: 100, pointValue: '1.0 MXN', pointValueVal: 1.0, leverage: 10, tradingHours: { 1: [{ start: '00:01', end: '23:58' }], 2: [{ start: '00:01', end: '23:58' }], 3: [{ start: '00:01', end: '23:58' }], 4: [{ start: '00:01', end: '23:58' }], 5: [{ start: '00:01', end: '23:57' }] }, tradingHoursText: 'Mon-Thurs: 00:01-23:58, Fri: 00:01-23:57' },
  'USD/NOK': { contractSize: '100000 USD', contractSizeVal: 100000, minQty: 0.01, maxQty: 100, pointValue: '1.0 NOK', pointValueVal: 1.0, leverage: 2000, tradingHours: { 1: [{ start: '00:01', end: '23:58' }], 2: [{ start: '00:01', end: '23:58' }], 3: [{ start: '00:01', end: '23:58' }], 4: [{ start: '00:01', end: '23:58' }], 5: [{ start: '00:01', end: '23:57' }] }, tradingHoursText: 'Mon-Thurs: 00:01-23:58, Fri: 00:01-23:57' },
  'USD/PLN': { contractSize: '100000 USD', contractSizeVal: 100000, minQty: 0.01, maxQty: 100, pointValue: '1.0 PLN', pointValueVal: 1.0, leverage: 50, tradingHours: { 1: [{ start: '00:01', end: '23:58' }], 2: [{ start: '00:01', end: '23:58' }], 3: [{ start: '00:01', end: '23:58' }], 4: [{ start: '00:01', end: '23:58' }], 5: [{ start: '00:01', end: '23:57' }] }, tradingHoursText: 'Mon-Thurs: 00:01-23:58, Fri: 00:01-23:57' },
  'USD/SEK': { contractSize: '100000 USD', contractSizeVal: 100000, minQty: 0.01, maxQty: 100, pointValue: '1.0 SEK', pointValueVal: 1.0, leverage: 2000, tradingHours: { 1: [{ start: '00:01', end: '23:58' }], 2: [{ start: '00:01', end: '23:58' }], 3: [{ start: '00:01', end: '23:58' }], 4: [{ start: '00:01', end: '23:58' }], 5: [{ start: '00:01', end: '23:57' }] }, tradingHoursText: 'Mon-Thurs: 00:01-23:58, Fri: 00:01-23:57' },
  'USD/SGD': { contractSize: '100000 USD', contractSizeVal: 100000, minQty: 0.01, maxQty: 100, pointValue: '1.0 SGD', pointValueVal: 1.0, leverage: 2000, tradingHours: { 1: [{ start: '00:01', end: '23:58' }], 2: [{ start: '00:01', end: '23:58' }], 3: [{ start: '00:01', end: '23:58' }], 4: [{ start: '00:01', end: '23:58' }], 5: [{ start: '00:01', end: '23:57' }] }, tradingHoursText: 'Mon-Thurs: 00:01-23:58, Fri: 00:01-23:57' },
  'USD/THB': { contractSize: '100000 USD', contractSizeVal: 100000, minQty: 0.01, maxQty: 100, pointValue: '1.0 THB', pointValueVal: 1.0, leverage: 20, tradingHours: { 1: [{ start: '00:01', end: '23:58' }], 2: [{ start: '00:01', end: '23:58' }], 3: [{ start: '00:01', end: '23:58' }], 4: [{ start: '00:01', end: '23:58' }], 5: [{ start: '00:01', end: '23:57' }] }, tradingHoursText: 'Mon-Thurs: 00:01-23:58, Fri: 00:01-23:57' },
  'USD/TRY': { contractSize: '100000 USD', contractSizeVal: 100000, minQty: 0.01, maxQty: 100, pointValue: '1.0 TRY', pointValueVal: 1.0, leverage: 20, tradingHours: { 1: [{ start: '00:01', end: '23:58' }], 2: [{ start: '00:01', end: '23:58' }], 3: [{ start: '00:01', end: '23:58' }], 4: [{ start: '00:01', end: '23:58' }], 5: [{ start: '00:01', end: '23:57' }] }, tradingHoursText: 'Mon-Thurs: 00:01-23:58, Fri: 00:01-23:57' },
  'USD/ZAR': { contractSize: '100000 USD', contractSizeVal: 100000, minQty: 0.01, maxQty: 100, pointValue: '1.0 ZAR', pointValueVal: 1.0, leverage: 10, tradingHours: { 1: [{ start: '00:01', end: '23:58' }], 2: [{ start: '00:01', end: '23:58' }], 3: [{ start: '00:01', end: '23:58' }], 4: [{ start: '00:01', end: '23:58' }], 5: [{ start: '00:01', end: '23:57' }] }, tradingHoursText: 'Mon-Thurs: 00:01-23:58, Fri: 00:01-23:57' },

  // --- Mon-Fri: 03:00-23:59 (AUD/CNH) ---
  'AUD/CNH': { contractSize: '100000 AUD', contractSizeVal: 100000, minQty: 0.01, maxQty: 100, pointValue: '1.0 CNH', pointValueVal: 1.0, leverage: 2000, tradingHours: { 1: [{ start: '03:00', end: '23:59' }], 2: [{ start: '03:00', end: '23:59' }], 3: [{ start: '03:00', end: '23:59' }], 4: [{ start: '03:00', end: '23:59' }], 5: [{ start: '03:00', end: '23:59' }] }, tradingHoursText: 'Mon-Fri: 03:00-23:59' },

  // --- Mon-Fri: 15:31-22:58 (USD/BRL) ---
  'USD/BRL': { contractSize: '100000 USD', contractSizeVal: 100000, minQty: 0.01, maxQty: 100, pointValue: '1.0 BRL', pointValueVal: 1.0, leverage: 20, tradingHours: { 1: [{ start: '15:31', end: '22:58' }], 2: [{ start: '15:31', end: '22:58' }], 3: [{ start: '15:31', end: '22:58' }], 4: [{ start: '15:31', end: '22:58' }], 5: [{ start: '15:31', end: '22:58' }] }, tradingHoursText: 'Mon-Fri: 15:31-22:58' },

  // --- Mon-Fri: 15:50-19:10 (USD/CLP) ---
  'USD/CLP': { contractSize: '100000 USD', contractSizeVal: 100000, minQty: 0.01, maxQty: 100, pointValue: '1000.0 CLP', pointValueVal: 1000.0, leverage: 20, tradingHours: { 1: [{ start: '15:50', end: '19:10' }], 2: [{ start: '15:50', end: '19:10' }], 3: [{ start: '15:50', end: '19:10' }], 4: [{ start: '15:50', end: '19:10' }], 5: [{ start: '15:50', end: '19:10' }] }, tradingHoursText: 'Mon-Fri: 15:50-19:10' },

  // --- Mon-Fri: 17:00-20:50 (USD/COP) ---
  'USD/COP': { contractSize: '100000 USD', contractSizeVal: 100000, minQty: 0.01, maxQty: 100, pointValue: '1000.0 COP', pointValueVal: 1000.0, leverage: 20, tradingHours: { 1: [{ start: '17:00', end: '20:50' }], 2: [{ start: '17:00', end: '20:50' }], 3: [{ start: '17:00', end: '20:50' }], 4: [{ start: '17:00', end: '20:50' }], 5: [{ start: '17:00', end: '20:50' }] }, tradingHoursText: 'Mon-Fri: 17:00-20:50' },

  // --- Mon-Fri: 04:00-23:00 (USD/IDR) ---
  'USD/IDR': { contractSize: '100000 USD', contractSizeVal: 100000, minQty: 0.01, maxQty: 100, pointValue: '10000.0 IDR', pointValueVal: 10000.0, leverage: 20, tradingHours: { 1: [{ start: '04:00', end: '23:00' }], 2: [{ start: '04:00', end: '23:00' }], 3: [{ start: '04:00', end: '23:00' }], 4: [{ start: '04:00', end: '23:00' }], 5: [{ start: '04:00', end: '23:00' }] }, tradingHoursText: 'Mon-Fri: 04:00-23:00' },

  // --- Mon-Fri: 05:00-23:00 (USD/INR) ---
  'USD/INR': { contractSize: '100000 USD', contractSizeVal: 100000, minQty: 0.01, maxQty: 100, pointValue: '100.0 INR', pointValueVal: 100.0, leverage: 20, tradingHours: { 1: [{ start: '05:00', end: '23:00' }], 2: [{ start: '05:00', end: '23:00' }], 3: [{ start: '05:00', end: '23:00' }], 4: [{ start: '05:00', end: '23:00' }], 5: [{ start: '05:00', end: '23:00' }] }, tradingHoursText: 'Mon-Fri: 05:00-23:00' },

  // --- Mon-Fri: 03:00-23:00 (USD/KRW) ---
  'USD/KRW': { contractSize: '100000 USD', contractSizeVal: 100000, minQty: 0.01, maxQty: 100, pointValue: '1000.0 KRW', pointValueVal: 1000.0, leverage: 20, tradingHours: { 1: [{ start: '03:00', end: '23:00' }], 2: [{ start: '03:00', end: '23:00' }], 3: [{ start: '03:00', end: '23:00' }], 4: [{ start: '03:00', end: '23:00' }], 5: [{ start: '03:00', end: '23:00' }] }, tradingHoursText: 'Mon-Fri: 03:00-23:00' },

  // --- Mon-Fri: 03:10-22:00 (USD/TWD) ---
  'USD/TWD': { contractSize: '100000 USD', contractSizeVal: 100000, minQty: 0.01, maxQty: 100, pointValue: '100.0 TWD', pointValueVal: 100.0, leverage: 20, tradingHours: { 1: [{ start: '03:10', end: '22:00' }], 2: [{ start: '03:10', end: '22:00' }], 3: [{ start: '03:10', end: '22:00' }], 4: [{ start: '03:10', end: '22:00' }], 5: [{ start: '03:10', end: '22:00' }] }, tradingHoursText: 'Mon-Fri: 03:10-22:00' },

  // --- Precious Metals: Mon-Thurs: 01:01-23:58, Fri: 01:01-23:57 ---
  'XAG/AUD': { contractSize: '5000 OZ', contractSizeVal: 5000, minQty: 0.01, maxQty: 20, pointValue: '5.0 AUD', pointValueVal: 5.0, leverage: 100, tradingHours: { 1: [{ start: '01:01', end: '23:58' }], 2: [{ start: '01:01', end: '23:58' }], 3: [{ start: '01:01', end: '23:58' }], 4: [{ start: '01:01', end: '23:58' }], 5: [{ start: '01:01', end: '23:57' }] }, tradingHoursText: 'Mon-Thurs: 01:01-23:58, Fri: 01:01-23:57' },
  'XAG/USD': { contractSize: '5000 OZ', contractSizeVal: 5000, minQty: 0.01, maxQty: 20, pointValue: '5.0 USD', pointValueVal: 5.0, leverage: 100, tradingHours: { 1: [{ start: '01:01', end: '23:58' }], 2: [{ start: '01:01', end: '23:58' }], 3: [{ start: '01:01', end: '23:58' }], 4: [{ start: '01:01', end: '23:58' }], 5: [{ start: '01:01', end: '23:57' }] }, tradingHoursText: 'Mon-Thurs: 01:01-23:58, Fri: 01:01-23:57' },
  
  'XAU/AUD': { contractSize: '100 OZ', contractSizeVal: 100, minQty: 0.01, maxQty: 100, pointValue: '1.0 AUD', pointValueVal: 1.0, leverage: 2000, tradingHours: { 1: [{ start: '01:01', end: '23:58' }], 2: [{ start: '01:01', end: '23:58' }], 3: [{ start: '01:01', end: '23:58' }], 4: [{ start: '01:01', end: '23:58' }], 5: [{ start: '01:01', end: '23:57' }] }, tradingHoursText: 'Mon-Thurs: 01:01-23:58, Fri: 01:01-23:57' },
  'XAU/EUR': { contractSize: '100 OZ', contractSizeVal: 100, minQty: 0.01, maxQty: 100, pointValue: '1.0 EUR', pointValueVal: 1.0, leverage: 2000, tradingHours: { 1: [{ start: '01:01', end: '23:58' }], 2: [{ start: '01:01', end: '23:58' }], 3: [{ start: '01:01', end: '23:58' }], 4: [{ start: '01:01', end: '23:58' }], 5: [{ start: '01:01', end: '23:57' }] }, tradingHoursText: 'Mon-Thurs: 01:01-23:58, Fri: 01:01-23:57' },
  'XAU/JPY': { contractSize: '100 OZ', contractSizeVal: 100, minQty: 0.01, maxQty: 100, pointValue: '100.0 JPY', pointValueVal: 100.0, leverage: 2000, tradingHours: { 1: [{ start: '01:01', end: '23:58' }], 2: [{ start: '01:01', end: '23:58' }], 3: [{ start: '01:01', end: '23:58' }], 4: [{ start: '01:01', end: '23:58' }], 5: [{ start: '01:01', end: '23:57' }] }, tradingHoursText: 'Mon-Thurs: 01:01-23:58, Fri: 01:01-23:57' },
  'XAU/USD': { contractSize: '100 OZ', contractSizeVal: 100, minQty: 0.01, maxQty: 100, pointValue: '1.0 USD', pointValueVal: 1.0, leverage: 2000, tradingHours: { 1: [{ start: '01:01', end: '23:58' }], 2: [{ start: '01:01', end: '23:58' }], 3: [{ start: '01:01', end: '23:58' }], 4: [{ start: '01:01', end: '23:58' }], 5: [{ start: '01:01', end: '23:57' }] }, tradingHoursText: 'Mon-Thurs: 01:01-23:58, Fri: 01:01-23:57' },

  // --- Mon-Fri: 01:00-24:00 (XPD/USD, XPT/USD) ---
  'XPD/USD': { contractSize: '10 OZ', contractSizeVal: 10, minQty: 0.1, maxQty: 40, pointValue: '0.1 USD', pointValueVal: 0.1, leverage: 20, tradingHours: { 1: [{ start: '01:00', end: '24:00' }], 2: [{ start: '01:00', end: '24:00' }], 3: [{ start: '01:00', end: '24:00' }], 4: [{ start: '01:00', end: '24:00' }], 5: [{ start: '01:00', end: '24:00' }] }, tradingHoursText: 'Mon-Fri: 01:00-24:00' },
  'XPT/USD': { contractSize: '10 OZ', contractSizeVal: 10, minQty: 0.1, maxQty: 40, pointValue: '0.1 USD', pointValueVal: 0.1, leverage: 20, tradingHours: { 1: [{ start: '01:00', end: '24:00' }], 2: [{ start: '01:00', end: '24:00' }], 3: [{ start: '01:00', end: '24:00' }], 4: [{ start: '01:00', end: '24:00' }], 5: [{ start: '01:00', end: '24:00' }] }, tradingHoursText: 'Mon-Fri: 01:00-24:00' }
};

export const checkIsMarketOpen = (symbol: string, date: Date = new Date()): { isOpen: boolean; reason?: string } => {
  const spec = ASSET_SPECS[symbol];
  if (!spec) return { isOpen: true }; // Crypto and other local/global assets defaulting to open

  const day = date.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
  const hours = spec.tradingHours[day];

  if (!hours || hours.length === 0) {
    return { isOpen: false, reason: "Market is closed on weekends (Saturday, Sunday)" };
  }

  const currentMinutes = date.getHours() * 60 + date.getMinutes();
  
  const inRange = hours.some(range => {
    const [startH, startM] = range.start.split(':').map(Number);
    const [endH, endM] = range.end.split(':').map(Number);
    const startMinutes = startH * 60 + startM;
    const endMinutes = endH * 60 + endM;
    return currentMinutes >= startMinutes && currentMinutes <= endMinutes;
  });

  if (!inRange) {
    return { isOpen: false, reason: `Market is closed. Trading time: ${spec.tradingHoursText}` };
  }

  return { isOpen: true };
};

export const getTradingViewLink = (pair: string, category: string): string => {
  const upperSymbol = pair.toUpperCase().replace('/', '').trim();
  const isIndianStockOrIndex = category === 'Indian Market' || pair.includes('NIFTY') || pair === 'SENSEX' || [
    'RELIANCE', 'TCS', 'INFOSYS', 'HDFC BANK', 'ICICI BANK', 'STATE BANK OF INDIA', 'AXIS BANK', 'KOTAK MAHINDRA BANK', 'ITC', 'BHARTI AIRTEL', 'L&T', 'WIPRO', 'TATA MOTORS', 'TATA STEEL', 'TATA POWER', 'TATA CONSUMER', 'ADANI ENTERPRISES', 'ADANI PORTS', 'ADANI POWER', 'ADANI GREEN', 'HCL TECHNOLOGIES', 'SUN PHARMA', 'ASIAN PAINTS', 'BAJAJ FINANCE', 'MARUTI SUZUKI', 'ULTRATECH CEMENT', 'POWER GRID', 'TITAN', 'NESTLE INDIA', 'JSW STEEL', 'ONGC', 'COAL INDIA', 'GRASIM', 'NTPC', 'HINDALCO', 'BPCL', 'HERO MOTOCORP', 'EICHER MOTORS', 'APOLLO HOSPITALS', 'BAJAJ AUTO', 'CIPLA', 'DIVIS LAB', 'DR REDDYS', 'INDUSIND BANK', 'BRITANNIA'
  ].includes(upperSymbol);

  if (isIndianStockOrIndex) {
    const map: Record<string, string> = {
      'NIFTY 50': 'NSE-NIFTY',
      'BANK NIFTY': 'NSE-BANKNIFTY',
      'FINNIFTY': 'NSE-FINNIFTY',
      'SENSEX': 'BSE-SENSEX',
      'RELIANCE': 'NSE-RELIANCE',
      'TCS': 'NSE-TCS',
      'INFOSYS': 'NSE-INFY',
      'HDFC BANK': 'NSE-HDFCBANK',
      'ICICI BANK': 'NSE-ICICIBANK',
      'STATE BANK OF INDIA': 'NSE-SBIN',
      'AXIS BANK': 'NSE-AXISBANK',
      'KOTAK MAHINDRA BANK': 'NSE-KOTAKBANK',
      'ITC': 'NSE-ITC',
      'BHARTI AIRTEL': 'NSE-BHARTIARTL',
      'L&T': 'NSE-LT',
      'WIPRO': 'NSE-WIPRO',
      'TATA MOTORS': 'NSE-TATAMOTORS',
      'TATA STEEL': 'NSE-TATASTEEL',
      'TATA POWER': 'NSE-TATAPOWER',
      'TATA CONSUMER': 'NSE-TATACONSUM',
      'ADANI ENTERPRISES': 'NSE-ADANIENT',
      'ADANI PORTS': 'NSE-ADANIPORTS',
      'ADANI POWER': 'NSE-ADANIPOWER',
      'ADANI GREEN': 'NSE-ADANIGREEN',
      'HCL TECHNOLOGIES': 'NSE-HCLTECH',
      'SUN PHARMA': 'NSE-SUNPHARMA',
      'ASIAN PAINTS': 'NSE-ASIANPAINT',
      'BAJAJ FINANCE': 'NSE-BAJFINANCE',
      'MARUTI SUZUKI': 'NSE-MARUTI',
      'ULTRATECH CEMENT': 'NSE-ULTRACEMCO'
    };
    const mapped = map[upperSymbol];
    if (mapped) return `https://www.tradingview.com/symbols/${mapped}/`;
    return `https://www.tradingview.com/symbols/NSE-${upperSymbol.replace(' ', '')}/`;
  }
  
  if (category === 'Forex') {
    return `https://www.tradingview.com/symbols/FX-${upperSymbol.replace('/', '')}/`;
  }

  // Crypto
  if (upperSymbol.includes('BTC')) return 'https://www.tradingview.com/symbols/BINANCE-BTCUSDT/';
  if (upperSymbol.includes('ETH')) return 'https://www.tradingview.com/symbols/BINANCE-ETHUSDT/';
  if (upperSymbol.includes('SOL')) return 'https://www.tradingview.com/symbols/BINANCE-SOLUSDT/';
  if (upperSymbol.includes('PAXG')) return 'https://www.tradingview.com/symbols/BINANCE-PAXGUSDT/';
  if (upperSymbol.includes('RIVER')) return 'https://www.tradingview.com/symbols/GATEIO-RIVERUSDT/';
  if (upperSymbol.includes('VVV')) return 'https://www.tradingview.com/symbols/GATEIO-VVVUSDT/';
  if (upperSymbol.includes('JUP')) return 'https://www.tradingview.com/symbols/BINANCE-JUPUSDT/';
  if (upperSymbol.includes('PENGU')) return 'https://www.tradingview.com/symbols/BINANCE-PENGUUSDT/';
  if (upperSymbol.includes('RAVE')) return 'https://www.tradingview.com/symbols/MEXC-RAVEUSDT/';
  if (upperSymbol.includes('SPX')) return 'https://www.tradingview.com/symbols/GATEIO-SPXUSDT/';
  if (upperSymbol.includes('HUSD')) return 'https://www.tradingview.com/symbols/BINANCE-USDCUSDT/';
  return `https://www.tradingview.com/symbols/BINANCE-${upperSymbol.replace('USD', 'USDT')}/`;
};

export const getInstrumentConfig = (pair: string, category: string = 'Crypto', tickers?: Record<string, TickerData>): InstrumentConfig => {
  const upperSymbol = pair.toUpperCase().replace('/', '');
  const pairWithSlash = pair.includes('/') ? pair : (pair.length === 6 ? `${pair.slice(0,3)}/${pair.slice(3)}` : pair);
  
  let minQuantity = 1;
  let lotMultiplier = 1;

  // Resolve category based on the actual asset name or tickers
  let resolvedCategory = category;
  if (tickers && tickers[pair]) {
    resolvedCategory = tickers[pair].category || category;
  } else {
    if (pair.includes('/') || ['EUR', 'USD', 'GBP', 'JPY', 'AUD', 'CAD', 'CHF', 'NZD', 'SGD'].some(c => pair.includes(c) && pair.length === 7)) {
       resolvedCategory = 'Forex';
    } else if (pair.includes('NIFTY') || pair === 'SENSEX' || [
      'RELIANCE', 'TCS', 'INFOSYS', 'HDFC BANK', 'ICICI BANK', 'STATE BANK OF INDIA', 'AXIS BANK', 'KOTAK MAHINDRA BANK', 'ITC', 'BHARTI AIRTEL', 'L&T', 'WIPRO', 'TATA MOTORS', 'TATA STEEL', 'TATA POWER', 'TATA CONSUMER', 'ADANI ENTERPRISES', 'ADANI PORTS', 'ADANI POWER', 'ADANI GREEN', 'HCL TECHNOLOGIES', 'SUN PHARMA', 'ASIAN PAINTS', 'BAJAJ FINANCE', 'MARUTI SUZUKI', 'ULTRATECH CEMENT', 'POWER GRID', 'TITAN', 'NESTLE INDIA', 'JSW STEEL', 'ONGC', 'COAL INDIA', 'GRASIM', 'NTPC', 'HINDALCO', 'BPCL', 'HERO MOTOCORP', 'EICHER MOTORS', 'APOLLO HOSPITALS', 'BAJAJ AUTO', 'CIPLA', 'DIVIS LAB', 'DR REDDYS', 'INDUSIND BANK', 'BRITANNIA'
    ].some(p => upperSymbol.startsWith(p))) {
       resolvedCategory = 'Indian Market';
    } else {
       resolvedCategory = 'Crypto';
    }
  }

  if (resolvedCategory === 'Crypto') {
    minQuantity = 1; // Minimum lot for Crypto is exactly 1
    
    // Set fixed margin requirement per lot at 50x leverage
    let targetFixedMargin = 1.00; 
    if (upperSymbol.includes('BTC')) { targetFixedMargin = 1.36; }
    
    // Attempt to get the base opening price to calculate exact margin requirements
    const basePrice = tickers && tickers[upperSymbol] ? (tickers[upperSymbol].openingPrice || tickers[upperSymbol].lastPrice) : null;
    
    if (basePrice && basePrice > 0) {
       // Calculation: we want margin = (basePrice * lotMultiplier) / 50 == targetFixedMargin
       lotMultiplier = (targetFixedMargin * 50) / basePrice;
    } else {
       // Fallbacks if price is not loaded yet
       if (upperSymbol.includes('BTC')) { lotMultiplier = 0.001; }
       else if (upperSymbol.includes('ETH')) { lotMultiplier = 0.015; }
       else if (upperSymbol.includes('SOL')) { lotMultiplier = 0.333; }
       else if (upperSymbol.includes('PAXG')) { lotMultiplier = 0.021; }
       else if (upperSymbol.includes('HUSD')) { lotMultiplier = 50; }
       else if (upperSymbol.includes('XRP')) { lotMultiplier = 100; }
       else if (upperSymbol.includes('DOGE')) { lotMultiplier = 333; }
       else if (upperSymbol.includes('BNB')) { lotMultiplier = 0.083; }
       else if (upperSymbol.includes('AVAX')) { lotMultiplier = 1.66; }
       else if (upperSymbol.includes('RIVER')) { lotMultiplier = 66; }
       else if (upperSymbol.includes('VVV')) { lotMultiplier = 625; }
       else if (upperSymbol.includes('JUP')) { lotMultiplier = 54; }
       else if (upperSymbol.includes('PENGU')) { lotMultiplier = 416; }
       else if (upperSymbol.includes('RAVE')) { lotMultiplier = 1111; }
       else if (upperSymbol.includes('SPX')) { lotMultiplier = 86; }
       else { lotMultiplier = 1; }
    }
  } else if (resolvedCategory === 'Forex') {
    minQuantity = 0.001; // Minimum lot for Forex is exactly 0.001
    
    const spec = ASSET_SPECS[pair] || ASSET_SPECS[pairWithSlash];
    lotMultiplier = spec ? spec.contractSizeVal : 100000;
  } else if (resolvedCategory === 'Indian Market' || resolvedCategory === 'Stocks') {
    minQuantity = 0.0001; // Minimum lot for Indian Market is dynamically 0.0001
    
    const upperPair = pair.toUpperCase();
    if (upperPair.includes('NIFTY 50')) { lotMultiplier = 50; }
    else if (upperPair.includes('BANK NIFTY')) { lotMultiplier = 15; }
    else if (upperPair.includes('FINNIFTY')) { lotMultiplier = 40; }
    else if (upperPair.includes('MIDCAP NIFTY')) { lotMultiplier = 75; }
    else if (upperPair.includes('SENSEX')) { lotMultiplier = 10; }
    else { lotMultiplier = 1; }
  } else {
    minQuantity = 1;
    lotMultiplier = 1;
  }

  return {
    minQuantity,
    lotMultiplier,
    contractSize: lotMultiplier
  };
};

const MOCK_ASSETS = {
  Commodities: ['Gold'],
  Crypto: [
    'BTCUSD', 'ETHUSD', 'XRPUSD', 'ADAUSD', 'BNBUSD', 'DOGEUSD', 'SOLUSD', 'AVAXUSD', 'LTCUSD', 'BCHUSD',
    'XLMUSD', 'LINKUSD', 'UNIUSD', 'NEARUSD', 'WLDUSD', 'ENJUSD', 'JTOUSD', 'TAOUSD', 'ZECUSD', 'PAXGUSD',
    'XAUTUSD', 'AIOTUSD', 'SKYAIUSD', 'HYPEUSD', 'SIRENUSD', 'EDENUSD', 'ARCUSD', 'VVVUSD', 'BLESSUSD',
    'CHIPUSD', 'BUMUSD', 'SWARMSUSD', 'ANOMAUSD', 'METAXUSD', 'CONXUSD', 'HANAUSD',
    'HUSDUSD', 'RIVERUSD', 'JUPUSD', 'PENGUUSD', 'RAVEUSD', 'SPXUSD'
  ],
  Forex: [
    'AUD/CAD', 'AUD/CHF', 'AUD/CNH', 'AUD/JPY', 'AUD/NZD', 'AUD/SGD', 'AUD/USD',
    'CAD/CHF', 'CAD/JPY', 'CHF/JPY', 'CHF/SGD',
    'EUR/AUD', 'EUR/CAD', 'EUR/CHF', 'EUR/CZK', 'EUR/DKK', 'EUR/GBP', 'EUR/HUF', 'EUR/JPY', 'EUR/NOK', 'EUR/NZD', 'EUR/PLN', 'EUR/SEK', 'EUR/SGD', 'EUR/TRY', 'EUR/USD',
    'GBP/AUD', 'GBP/CAD', 'GBP/CHF', 'GBP/JPY', 'GBP/NZD', 'GBP/SGD', 'GBP/USD',
    'NZD/CAD', 'NZD/CHF', 'NZD/JPY', 'NZD/SGD', 'NZD/USD',
    'SGD/JPY',
    'USD/BRL', 'USD/CAD', 'USD/CHF', 'USD/CLP', 'USD/CNH', 'USD/COP', 'USD/CZK', 'USD/DKK', 'USD/HKD', 'USD/HUF', 'USD/IDR', 'USD/ILS', 'USD/INR', 'USD/JPY', 'USD/KRW', 'USD/MXN', 'USD/NOK', 'USD/PLN', 'USD/SEK', 'USD/SGD', 'USD/THB', 'USD/TRY', 'USD/TWD', 'USD/ZAR',
    'XAG/AUD', 'XAG/USD', 'XAU/AUD', 'XAU/EUR', 'XAU/JPY', 'XAU/USD', 'XPD/USD', 'XPT/USD'
  ],
  'Indian Market': [
    'NIFTY 50', 'BANK NIFTY', 'FINNIFTY', 'MIDCAP NIFTY', 'SENSEX', 
    'Reliance', 'TCS', 'Infosys', 'HDFC Bank', 'ICICI Bank', 'State Bank of India', 'Axis Bank', 'Kotak Mahindra Bank', 'ITC', 'Bharti Airtel', 'L&T', 'Wipro', 'Tata Motors', 'Tata Steel', 'Tata Power', 'Tata Consumer', 'Adani Enterprises', 'Adani Ports', 'Adani Power', 'Adani Green', 'HCL Technologies', 'Sun Pharma', 'Asian Paints', 'Bajaj Finance', 'Maruti Suzuki', 'UltraTech Cement', 'Power Grid', 'Titan', 'Nestle India', 'JSW Steel', 'ONGC', 'Coal India', 'Grasim', 'NTPC', 'Hindalco', 'BPCL', 'Hero MotoCorp', 'Eicher Motors', 'Apollo Hospitals', 'Bajaj Auto', 'Cipla', 'Divis Lab', 'Dr Reddys', 'IndusInd Bank', 'Britannia'
  ]
};

const getRealPriceAnchor = (symbol: string, category: string): number => {
  const upperSymbol = symbol.toUpperCase();
  
  if (category === 'Crypto') {
    if (upperSymbol.includes('BTC')) return 66200.00;
    if (upperSymbol.includes('ETH')) return 3420.00;
    if (upperSymbol.includes('XRP')) return 0.49;
    if (upperSymbol.includes('ADA')) return 0.38;
    if (upperSymbol.includes('BNB')) return 585.00;
    if (upperSymbol.includes('DOGE')) return 0.135;
    if (upperSymbol.includes('SOL')) return 138.00;
    if (upperSymbol.includes('AVAX')) return 28.50;
    if (upperSymbol.includes('LTC')) return 73.20;
    if (upperSymbol.includes('BCH')) return 395.00;
    if (upperSymbol.includes('XLM')) return 0.092;
    if (upperSymbol.includes('LINK')) return 14.80;
    if (upperSymbol.includes('UNI')) return 7.20;
    if (upperSymbol.includes('NEAR')) return 4.85;
    if (upperSymbol.includes('WLD')) return 2.15;
    if (upperSymbol.includes('ENJ')) return 0.185;
    if (upperSymbol.includes('JTO')) return 2.35;
    if (upperSymbol.includes('TAO')) return 325.00;
    if (upperSymbol.includes('ZEC')) return 20.80;
    if (upperSymbol.includes('PAXG')) return 2320.00;
    if (upperSymbol.includes('XAUT')) return 2325.00;
    if (upperSymbol.includes('AIOT')) return 0.85;
    if (upperSymbol.includes('SKYAI')) return 1.25;
    if (upperSymbol.includes('HYPE')) return 4.50;
    if (upperSymbol.includes('SIREN')) return 0.35;
    if (upperSymbol.includes('EDEN')) return 0.15;
    if (upperSymbol.includes('ARC')) return 0.40;
    if (upperSymbol.includes('VVV')) return 0.08;
    if (upperSymbol.includes('BLESS')) return 0.05;
    if (upperSymbol.includes('CHIP')) return 0.12;
    if (upperSymbol.includes('BUM')) return 0.02;
    if (upperSymbol.includes('SWARMS')) return 0.18;
    if (upperSymbol.includes('ANOMA')) return 0.28;
    if (upperSymbol.includes('METAX')) return 0.65;
    if (upperSymbol.includes('CONX')) return 0.55;
    if (upperSymbol.includes('HANA')) return 0.14;
    if (upperSymbol.includes('HUSD')) return 1.00;
    if (upperSymbol.includes('RIVER')) return 0.75;
    if (upperSymbol.includes('JUP')) return 0.92;
    if (upperSymbol.includes('PENGU')) return 0.12;
    if (upperSymbol.includes('RAVE')) return 0.045;
    if (upperSymbol.includes('SPX')) return 0.58;
    return 10.00;
  }
  
  if (category === 'Forex') {
    const anchors: Record<string, number> = {
      'AUD/CAD': 0.9150, 'AUD/CHF': 0.5850, 'AUD/CNH': 4.8200, 'AUD/JPY': 104.50, 'AUD/NZD': 1.0920, 'AUD/SGD': 0.9020, 'AUD/USD': 0.6650,
      'CAD/CHF': 0.6480, 'CAD/JPY': 114.30, 'CHF/JPY': 173.80, 'CHF/SGD': 1.5120,
      'EUR/AUD': 1.6320, 'EUR/CAD': 1.4850, 'EUR/CHF': 0.9620, 'EUR/CZK': 24.800, 'EUR/DKK': 7.4600, 'EUR/GBP': 0.8530, 'EUR/HUF': 392.50, 'EUR/JPY': 169.70, 'EUR/NOK': 11.450, 'EUR/NZD': 1.7750, 'EUR/PLN': 4.3100, 'EUR/SEK': 11.230, 'EUR/SGD': 1.4680, 'EUR/TRY': 35.150, 'EUR/USD': 1.0850,
      'GBP/AUD': 1.9150, 'GBP/CAD': 1.7410, 'GBP/CHF': 1.1280, 'GBP/JPY': 198.95, 'GBP/NZD': 2.0830, 'GBP/SGD': 1.7210, 'GBP/USD': 1.2720,
      'NZD/CAD': 0.8380, 'NZD/CHF': 0.5420, 'NZD/JPY': 95.80, 'NZD/SGD': 0.8250, 'NZD/USD': 0.6120,
      'SGD/JPY': 115.90,
      'USD/BRL': 5.4300, 'USD/CAD': 1.3680, 'USD/CHF': 0.8990, 'USD/CLP': 935.00, 'USD/CNH': 7.2500, 'USD/COP': 4120.00, 'USD/CZK': 22.850, 'USD/DKK': 6.8700, 'USD/HKD': 7.8100, 'USD/HUF': 361.80, 'USD/IDR': 16350.0, 'USD/ILS': 3.7200, 'USD/INR': 83.500, 'USD/JPY': 156.40, 'USD/KRW': 1380.00, 'USD/MXN': 18.450, 'USD/NOK': 10.550, 'USD/PLN': 3.9700, 'USD/SEK': 10.350, 'USD/SGD': 1.3520, 'USD/THB': 36.700, 'USD/TRY': 32.400, 'USD/TWD': 32.350, 'USD/ZAR': 18.250,
      'XAG/AUD': 44.20, 'XAG/USD': 29.40, 'XAU/AUD': 3530.00, 'XAU/EUR': 2165.00, 'XAU/JPY': 365000.00, 'XAU/USD': 2350.00, 'XPD/USD': 980.00, 'XPT/USD': 990.00
    };
    return anchors[upperSymbol] ?? 1.25;
  }
  
  if (category === 'Commodities') {
    if (upperSymbol === 'GOLD') return 2350.00;
    if (upperSymbol === 'SILVER') return 29.40;
    if (upperSymbol === 'CRUDE OIL') return 80.50;
    if (upperSymbol === 'NATURAL GAS') return 2.45;
    if (upperSymbol === 'COPPER') return 4.55;
    if (upperSymbol === 'ALUMINIUM') return 2550.00;
    if (upperSymbol === 'ZINC') return 2850.00;
    if (upperSymbol === 'NICKEL') return 19500.00;
    if (upperSymbol === 'COTTON') return 75.20;
    if (upperSymbol === 'COFFEE') return 220.00;
    if (upperSymbol === 'SUGAR') return 18.50;
    if (upperSymbol === 'WHEAT') return 620.00;
    if (upperSymbol === 'CORN') return 450.00;
    if (upperSymbol === 'SOYBEAN') return 1180.00;
    return 150;
  }
  
  if (category === 'Indian Market' || category === 'Stocks') {
    if (upperSymbol === 'NIFTY 50') return 23100.00;
    if (upperSymbol === 'BANK NIFTY') return 49400.00;
    if (upperSymbol === 'FINNIFTY') return 21800.00;
    if (upperSymbol === 'MIDCAP NIFTY') return 11150.00;
    if (upperSymbol === 'SENSEX') return 75800.00;
    if (upperSymbol === 'NIFTY IT') return 34200.00;
    if (upperSymbol === 'NIFTY AUTO') return 22150.00;
    if (upperSymbol === 'NIFTY FMCG') return 54600.00;
    if (upperSymbol === 'NIFTY PHARMA') return 19050.00;
    if (upperSymbol === 'NIFTY REALTY') return 925.00;
    if (upperSymbol === 'NIFTY METAL') return 9150.00;
    
    if (upperSymbol === 'RELIANCE') return 2950.00;
    if (upperSymbol === 'TCS') return 3850.00;
    if (upperSymbol === 'INFOSYS') return 1420.00;
    if (upperSymbol === 'HDFC BANK') return 1510.00;
    if (upperSymbol === 'ICICI BANK') return 1135.00;
    if (upperSymbol === 'STATE BANK OF INDIA') return 815.00;
    if (upperSymbol === 'AXIS BANK') return 1155.00;
    if (upperSymbol === 'KOTAK MAHINDRA BANK') return 1720.00;
    if (upperSymbol === 'ITC') return 435.00;
    if (upperSymbol === 'BHARTI AIRTEL') return 1390.00;
    if (upperSymbol === 'L&T') return 3550.00;
    if (upperSymbol === 'WIPRO') return 465.00;
    if (upperSymbol === 'TATA MOTORS') return 955.00;
    if (upperSymbol === 'TATA STEEL') return 165.00;
    if (upperSymbol === 'TATA POWER') return 445.00;
    if (upperSymbol === 'TATA CONSUMER') return 1105.00;
    if (upperSymbol === 'ADANI ENTERPRISES') return 3240.00;
    if (upperSymbol === 'ADANI PORTS') return 1320.00;
    if (upperSymbol === 'ADANI POWER') return 710.00;
    if (upperSymbol === 'ADANI GREEN') return 1825.00;
    if (upperSymbol === 'HCL TECHNOLOGIES') return 1320.00;
    if (upperSymbol === 'SUN PHARMA') return 1515.00;
    if (upperSymbol === 'ASIAN PAINTS') return 2820.00;
    if (upperSymbol === 'BAJAJ FINANCE') return 6850.00;
    if (upperSymbol === 'MARUTI SUZUKI') return 12100.00;
    if (upperSymbol === 'ULTRATECH CEMENT') return 9850.00;
    return 500;
  }
  
  if (category === 'Global Stocks') {
    if (upperSymbol === 'APPLE') return 192.50;
    if (upperSymbol === 'MICROSOFT') return 425.00;
    if (upperSymbol === 'GOOGLE') return 176.20;
    if (upperSymbol === 'AMAZON') return 184.80;
    if (upperSymbol === 'META') return 475.00;
    if (upperSymbol === 'TESLA') return 175.50;
    if (upperSymbol === 'NVIDIA') return 912.00;
    if (upperSymbol === 'NETFLIX') return 625.00;
    if (upperSymbol === 'AMD') return 161.20;
    if (upperSymbol === 'INTEL') return 30.80;
    if (upperSymbol === 'ORACLE') return 122.50;
    if (upperSymbol === 'SALESFORCE') return 242.40;
    if (upperSymbol === 'UBER') return 70.50;
    if (upperSymbol === 'AIRBNB') return 146.40;
    return 150;
  }
  
  return 100;
};

const generateInitialMockTickers = () => {
  const result: Record<string, TickerData> = {};
  const prices: Record<string, number> = {};
  
  Object.entries(MOCK_ASSETS).forEach(([category, symbols]) => {
    symbols.forEach((symbol, i) => {
      const basePrice = getRealPriceAnchor(symbol, category);
      
      const lastPrice = basePrice * (1 + (Math.random() * 0.005 - 0.0025));
      const isPositive = Math.random() > 0.5;
      const priceChangePercent = (Math.random() * 2) * (isPositive ? 1 : -1);
      const quoteVolume = 1000000 + Math.random() * 500000000;

      result[symbol] = {
        symbol,
        lastPrice,
        priceChangePercent,
        quoteVolume,
        category
      };
      prices[symbol] = lastPrice;
    });
  });
  return { tickers: result, prices };
};

export const TradingProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { profile } = useAuth();
  
  const [theme, setTheme] = useState<'warm' | 'dark'>(() => {
    try {
      const saved = localStorage.getItem('app_theme');
      return (saved === 'dark' || saved === 'warm') ? saved : 'warm';
    } catch {
      return 'warm';
    }
  });

  const toggleTheme = () => {
    setTheme(prev => prev === 'warm' ? 'dark' : 'warm');
  };

  useEffect(() => {
    try {
      localStorage.setItem('app_theme', theme);
    } catch (e) {}
    
    const root = window.document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [theme]);

  const [accountMode, setAccountMode] = useState<'real' | 'demo'>('demo');
  const [realBalance, setRealBalance] = useState<AccountBalance>({ usd: 0, inr: 0 });
  const [demoBalance, setDemoBalance] = useState<AccountBalance>(INITIAL_BALANCE);

  const [syncRef, setSyncRef] = useState({ usd: 0, inr: 0 });
  
  useEffect(() => {
    if (profile) {
      const fbUsd = profile.realBalanceUSD || 0;
      const fbInr = profile.realBalanceINR || 0;
      if (fbUsd > syncRef.usd || fbInr > syncRef.inr) {
         setRealBalance(prev => ({
           usd: prev.usd + (fbUsd - syncRef.usd),
           inr: prev.inr + (fbInr - syncRef.inr)
         }));
         setSyncRef({ usd: fbUsd, inr: fbInr });
      }
    }
  }, [profile?.realBalanceUSD, profile?.realBalanceINR]);

  // accountBalance always derives from the active mode
  const accountBalance = accountMode === 'real' ? realBalance : demoBalance;

  // Use a helper that sets the correct active balance
  const setAccountBalance = (updateFn: (prev: AccountBalance) => AccountBalance | AccountBalance) => {
    if (accountMode === 'real') {
       setRealBalance(updateFn);
    } else {
       setDemoBalance(updateFn);
    }
  };

  const [realPositions, setRealPositions] = useState<Position[]>([]);
  const [demoPositions, setDemoPositions] = useState<Position[]>([]);
  
  const positions = accountMode === 'real' ? realPositions : demoPositions;
  const setPositions = (val: any) => accountMode === 'real' ? setRealPositions(val) : setDemoPositions(val);
  const [selectedPair, setSelectedPair] = useState('BTCUSD');
  
  const [tickers, setTickers] = useState<Record<string, TickerData>>({});
  const [currentPrices, setCurrentPrices] = useState<Record<string, number>>({});
  const [orderBook, setOrderBook] = useState<OrderBook>({ bids: [], asks: [] });

  const [preloadedSide, setPreloadedSide] = useState<'long' | 'short' | null>(null);
  const [realPendingOrders, setRealPendingOrders] = useState<PendingOrder[]>([]);
  const [demoPendingOrders, setDemoPendingOrders] = useState<PendingOrder[]>([]);
  
  const [realOrderHistory, setRealOrderHistory] = useState<OrderHistoryItem[]>([]);
  const [demoOrderHistory, setDemoOrderHistory] = useState<OrderHistoryItem[]>([]);
  
  const [realTradeHistory, setRealTradeHistory] = useState<TradeHistoryItem[]>([]);
  const [demoTradeHistory, setDemoTradeHistory] = useState<TradeHistoryItem[]>([]);
  
  const [realPositionHistory, setRealPositionHistory] = useState<PositionHistoryItem[]>([]);
  const [demoPositionHistory, setDemoPositionHistory] = useState<PositionHistoryItem[]>([]);

  // Active getters
  const pendingOrders = accountMode === 'real' ? realPendingOrders : demoPendingOrders;
  const orderHistory = accountMode === 'real' ? realOrderHistory : demoOrderHistory;
  const tradeHistory = accountMode === 'real' ? realTradeHistory : demoTradeHistory;
  const positionHistory = accountMode === 'real' ? realPositionHistory : demoPositionHistory;

  // Active setters
  const setPendingOrders = (val: any) => accountMode === 'real' ? setRealPendingOrders(val) : setDemoPendingOrders(val);
  const setOrderHistory = (val: any) => accountMode === 'real' ? setRealOrderHistory(val) : setDemoOrderHistory(val);
  const setTradeHistory = (val: any) => accountMode === 'real' ? setRealTradeHistory(val) : setDemoTradeHistory(val);
  const setPositionHistory = (val: any) => accountMode === 'real' ? setRealPositionHistory(val) : setDemoPositionHistory(val);

  // Add a simulation loop for non-WebSocket data
  const [dailyMarketStates, setDailyMarketStates] = useState<Record<string, DailyMarketState>>({});
  const dailyMarketStatesRef = useRef<Record<string, DailyMarketState>>({});

  const updateDailyMarketStates = (newStates: Record<string, DailyMarketState>) => {
    setDailyMarketStates(newStates);
    dailyMarketStatesRef.current = newStates;
  };

  // Function to generate daily parameters for a symbol
  const generateDailyState = (symbol: string, category: string, i: number): DailyMarketState => {
    const basePrice = getRealPriceAnchor(symbol, category);

    const openingPrice = basePrice * (1 + (Math.random() * 0.02 - 0.01)); // +/- 1% from base
    const movementRange = 0.01 + Math.random() * 0.04; // 1% to 5% range
    
    // Determine lot value based on category and price
    let lotValue = 1;
    if (category === 'Crypto') {
      lotValue = 1;
    } else if (category === 'Indian Market') {
      if (symbol.includes('NIFTY 50')) lotValue = 50;
      else if (symbol.includes('BANK NIFTY')) lotValue = 15;
      else lotValue = 25;
    }

    return {
      symbol,
      basePrice,
      openingPrice,
      movementRange,
      lotValue,
      pnlRatio: 1,
      volatility: 0.2 + Math.random() * 0.8,
      updatedAt: new Date().toISOString()
    };
  };

  useEffect(() => {
    const today = new Date().toISOString().split('T')[0];
    const savedStatesStr = localStorage.getItem('daily_market_states');
    let states: Record<string, DailyMarketState> = {};
    let shouldRegenerate = false;

    if (savedStatesStr) {
      try {
        const parsed = JSON.parse(savedStatesStr);
        // Check if the saved date is today. If not, we should regenerate.
        // Also check if any asset is missing.
        const firstKey = Object.keys(parsed)[0];
        const allNewAssetsExist = Object.values(MOCK_ASSETS).flat().every(sym => parsed[sym] !== undefined);
        if ((firstKey && parsed[firstKey].updatedAt.split('T')[0] !== today) || !allNewAssetsExist) {
          shouldRegenerate = true;
        } else {
          states = parsed;
        }
      } catch (e) {
        shouldRegenerate = true;
      }
    } else {
      shouldRegenerate = true;
    }

    if (shouldRegenerate) {
      states = {};
      Object.entries(MOCK_ASSETS).forEach(([category, symbols]) => {
        symbols.forEach((symbol, i) => {
          states[symbol] = generateDailyState(symbol, category, i);
        });
      });
      localStorage.setItem('daily_market_states', JSON.stringify(states));
    }

    updateDailyMarketStates(states);    // Initialize tickers and prices from daily states
    const initialTickers: Record<string, TickerData> = {};
    const initialPrices: Record<string, number> = {};

    Object.entries(states).forEach(([symbol, state]) => {
      const isPositive = Math.random() > 0.5;
      const priceChangePercent = (Math.random() * state.movementRange * 100) * (isPositive ? 1 : -1);
      
      initialTickers[symbol] = {
        symbol,
        lastPrice: state.openingPrice,
        priceChangePercent,
        quoteVolume: 1000000 + Math.random() * 500000000,
        category: Object.keys(MOCK_ASSETS).find(cat => (MOCK_ASSETS as any)[cat].includes(symbol)),
        dailyHigh: state.openingPrice * (1 + Math.random() * state.movementRange),
        dailyLow: state.openingPrice * (1 - Math.random() * state.movementRange),
        lotValue: state.lotValue,
        status: 'Open',
        openingPrice: state.openingPrice
      };
      initialPrices[symbol] = state.openingPrice;
    });

    setTickers(initialTickers);
    setCurrentPrices(initialPrices);
    
    const interval = setInterval(() => {
      setTickers(prev => {
        const next = { ...prev };
        const batchPrices: Record<string, number> = {};
        let updated = false;
        
        Object.keys(next).forEach(symbol => {
          const state = dailyMarketStatesRef.current[symbol] || states[symbol];
          if (!state) return;

          // Simulation fallback for all assets ensures constant price movement even if WS is slow or blocked
          // We use a smaller volatility for assets that might be updated by WS to avoid jarring jumps
          const isCrypto = next[symbol].category === 'Crypto';
          const simVolatility = isCrypto ? 0.05 : 1.0; 

          const currentPrice = next[symbol].lastPrice || state.openingPrice;
          
          // Professional price movement: move towards base price but with controlled randomness
          const maxPrice = state.openingPrice * (1 + state.movementRange);
          const minPrice = state.openingPrice * (1 - state.movementRange);
          
          // Random walk factor
          const walk = (Math.random() * 0.0006 - 0.0003) * state.volatility * simVolatility;
          let nextPrice = currentPrice * (1 + walk);

          // Reversion to mean (opening price) if drifting too far
          const drift = (nextPrice - state.openingPrice) / state.openingPrice;
          if (Math.abs(drift) > state.movementRange * 0.8) {
             nextPrice = nextPrice * (1 - drift * 0.015);
          }

          // Hard clamp
          nextPrice = Math.max(minPrice, Math.min(maxPrice, nextPrice));

          const pctChange = ((nextPrice - state.openingPrice) / state.openingPrice) * 100;

          const high = next[symbol].dailyHigh ? Math.max(next[symbol].dailyHigh!, nextPrice) : nextPrice;
          const low = next[symbol].dailyLow ? Math.min(next[symbol].dailyLow!, nextPrice) : nextPrice;

          next[symbol] = {
            ...next[symbol],
            lastPrice: nextPrice,
            priceChangePercent: pctChange,
            dailyHigh: high,
            dailyLow: low
          };
          batchPrices[symbol] = nextPrice;
          updated = true;
        });
        
        if (updated) {
          setCurrentPrices(prevPrices => ({ ...prevPrices, ...batchPrices }));
        }
        return next;
      });
    }, 1000); // Dynamic 1-second updates for highly real-time feel
    
    return () => clearInterval(interval);
  }, []);

  // Sync real live prices periodically for our major assets like BTC, ETH, SOL, and Gold, and realign the daily state opening price so the simulation is anchored around these true values
  useEffect(() => {
    const fetchRealPrices = async () => {
      try {
        let data = null;

        // 1. Try our server proxy first
        try {
          const proxyRes = await fetch('/api/binance-prices');
          if (proxyRes.ok) {
            const body = await proxyRes.json();
            if (body.success && Array.isArray(body.data)) {
              data = body.data;
            }
          }
        } catch (e) {
          console.warn('Backend proxy API not responding yet, falling back to direct browser requests:', e);
        }

        // 2. If proxy didn't work, try direct browser requests using multiple Binance mirrors
        if (!data) {
          const mirrors = [
            'https://api.binance.com/api/v3/ticker/price?symbols=%5B%22BTCUSDT%22,%22ETHUSDT%22,%22SOLUSDT%22,%22PAXGUSDT%22%5D',
            'https://api1.binance.com/api/v3/ticker/price?symbols=%5B%22BTCUSDT%22,%22ETHUSDT%22,%22SOLUSDT%22,%22PAXGUSDT%22%5D',
            'https://api2.binance.com/api/v3/ticker/price?symbols=%5B%22BTCUSDT%22,%22ETHUSDT%22,%22SOLUSDT%22,%22PAXGUSDT%22%5D',
            'https://api3.binance.com/api/v3/ticker/price?symbols=%5B%22BTCUSDT%22,%22ETHUSDT%22,%22SOLUSDT%22,%22PAXGUSDT%22%5D',
            'https://data-api.binance.vision/api/v3/ticker/price?symbols=%5B%22BTCUSDT%22,%22ETHUSDT%22,%22SOLUSDT%22,%22PAXGUSDT%22%5D'
          ];
          for (const url of mirrors) {
            try {
              const controller = new AbortController();
              const timeoutId = setTimeout(() => controller.abort(), 3000);
              const res = await fetch(url, { signal: controller.signal });
              clearTimeout(timeoutId);
              if (res.ok) {
                data = await res.json();
                break;
              }
            } catch (err) {
              // Ignore and try the next mirror
            }
          }
        }

        if (Array.isArray(data)) {
          const fetchedPrices: Record<string, number> = {};
          data.forEach((item: any) => {
            const rawSym = item.symbol;
            const price = parseFloat(item.price);
            
            // Map PAXGUSDT to our PAXGUSD ticker, and binance USDT pairs to our USD pairs
            if (rawSym === 'PAXGUSDT') {
              fetchedPrices['PAXGUSD'] = price;
            } else if (rawSym.endsWith('USDT')) {
              const ourSym = rawSym.replace(/USDT$/, 'USD');
              if (MOCK_ASSETS.Crypto.includes(ourSym)) {
                fetchedPrices[ourSym] = price;
              }
            }
          });

          // Sync with our state
          setTickers(prev => {
            const next = { ...prev };
            Object.entries(fetchedPrices).forEach(([symbol, price]) => {
              if (next[symbol]) {
                next[symbol].lastPrice = price;
              }
            });
            return next;
          });

          setCurrentPrices(prev => ({ ...prev, ...fetchedPrices }));

          // Align the daily states so simulation walk works from the real price
          if (dailyMarketStatesRef.current) {
            Object.entries(fetchedPrices).forEach(([symbol, price]) => {
              const currentRef = dailyMarketStatesRef.current[symbol];
              if (currentRef) {
                currentRef.basePrice = price;
                currentRef.openingPrice = price;
              }
            });
          }
        } else {
          console.warn('Could not sync live prices; continuing seamlessly with highly precise browser-side generators.');
        }
      } catch (err) {
        console.warn('Silent note: Failed to sync live prices from Binance, falling back to local simulation setup:', err);
      }
    };

    fetchRealPrices();
    // Run periodically every 12 seconds to keep it aligned
    const interval = setInterval(fetchRealPrices, 12000);
    return () => clearInterval(interval);
  }, []);

  // Connect to Binance WebSocket for multiple streams
  useEffect(() => {
    let ws: WebSocket;
    let reconnectTimer: NodeJS.Timeout;

    const isCrypto = MOCK_ASSETS.Crypto.includes(selectedPair);

    const connectWS = () => {
      ws = new WebSocket('wss://stream.binance.com:9443/ws');
      
      ws.onopen = () => {
        const params = ["!ticker@arr"];
        if (isCrypto) {
          // Convert our symbol like BTCUSD to binance spot equivalent btcusdt
          const binanceSymbol = selectedPair.endsWith('USD') && !selectedPair.includes('USDT')
            ? selectedPair.toLowerCase().replace(/usd$/, 'usdt')
            : selectedPair.toLowerCase();
          params.push(`${binanceSymbol}@depth20@100ms`);
          params.push(`${binanceSymbol}@trade`);
        }
        const subscribeMsg = {
          method: "SUBSCRIBE",
          params,
          id: 1
        };
        ws.send(JSON.stringify(subscribeMsg));
      };

      ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        
        if (Array.isArray(data)) {
          const batchTickers: Record<string, TickerData> = {};
          const batchPrices: Record<string, number> = {};
          
          data.forEach((t: any) => {
            const mapped = t.s.endsWith('USDT') ? t.s.replace(/USDT$/, 'USD') : t.s;
            const targetSymbol = MOCK_ASSETS.Crypto.includes(t.s) ? t.s : (MOCK_ASSETS.Crypto.includes(mapped) ? mapped : null);

            if (targetSymbol) {
              const price = parseFloat(t.c);
              batchTickers[targetSymbol] = {
                symbol: targetSymbol,
                lastPrice: price,
                priceChangePercent: parseFloat(t.P),
                quoteVolume: parseFloat(t.q),
                category: 'Crypto'
              };
              batchPrices[targetSymbol] = price;

              // Keep the simulator baseline updated to prevent drift reversion pull-back
              const currentRef = dailyMarketStatesRef.current[targetSymbol];
              if (currentRef) {
                currentRef.openingPrice = price;
                currentRef.basePrice = price;
              }
            } else if (t.s === 'PAXGUSDT') {
              const price = parseFloat(t.c);
              
              // update PAXGUSD
              batchTickers['PAXGUSD'] = {
                symbol: 'PAXGUSD',
                lastPrice: price,
                priceChangePercent: parseFloat(t.P),
                quoteVolume: parseFloat(t.q),
                category: 'Crypto'
              };
              batchPrices['PAXGUSD'] = price;

              const currentRef = dailyMarketStatesRef.current['PAXGUSD'];
              if (currentRef) {
                currentRef.openingPrice = price;
                currentRef.basePrice = price;
              }
              
              // Also update 'Gold' (so Commodity stays in sync)
              batchTickers['Gold'] = {
                symbol: 'Gold',
                lastPrice: price,
                priceChangePercent: parseFloat(t.P),
                quoteVolume: parseFloat(t.q),
                category: 'Commodities'
              };
              batchPrices['Gold'] = price;

              const goldRef = dailyMarketStatesRef.current['Gold'];
              if (goldRef) {
                goldRef.openingPrice = price;
                goldRef.basePrice = price;
              }
            }
          });
          
          setTickers(prev => ({ ...prev, ...batchTickers }));
          setCurrentPrices(prev => ({ ...prev, ...batchPrices }));
        }
        
        if (data.b && data.a) {
          setOrderBook({
            bids: data.b.map((b: string[]) => [parseFloat(b[0]), parseFloat(b[1])]).slice(0, 15),
            asks: data.a.map((a: string[]) => [parseFloat(a[0]), parseFloat(a[1])]).slice(0, 15).reverse(),
          });
        }
        
        if (data.e === 'trade') {
          const binanceSymbol = selectedPair.endsWith('USD') && !selectedPair.includes('USDT')
            ? selectedPair.replace(/USD$/, 'USDT')
            : selectedPair;
            
          if (data.s === binanceSymbol || data.s === selectedPair) {
            const priceVal = parseFloat(data.p);
            setCurrentPrices(prev => ({ ...prev, [selectedPair]: priceVal }));
            setTickers(prev => ({
              ...prev,
              [selectedPair]: {
                ...(prev[selectedPair] || { symbol: selectedPair, priceChangePercent: 0, quoteVolume: 0, category: 'Crypto' }),
                lastPrice: priceVal
              }
            }));

            // Keep the simulator baseline updated to prevent drift reversion pull-back
            const currentRef = dailyMarketStatesRef.current[selectedPair];
            if (currentRef) {
              currentRef.openingPrice = priceVal;
              currentRef.basePrice = priceVal;
            }
          }
        }
      };

      ws.onclose = () => {
        reconnectTimer = setTimeout(() => connectWS(), 3000);
      };

      ws.onerror = () => {
        ws.close();
      };
    };

    connectWS();

    return () => {
      if (ws) ws.close();
      if (reconnectTimer) clearTimeout(reconnectTimer);
    };
  }, [selectedPair]); 

  // Also fetch initial 24h tickers so we don't wait for ws
  // Removed API call as it was causing fetch errors in the sandbox environment, 
  // and mock data is sufficient for initialization.
  useEffect(() => {
    //
  }, []);

  const executeTrade = (
    side: 'long' | 'short',
    quantity: number,
    leverage: number,
    orderType: string = 'Market',
    limitPrice?: number,
    tpPrice?: number,
    slPrice?: number,
    pair?: string
  ) => {
    const symbolToUse = pair || selectedPair;
    
    // Check if market is open
    const marketOpenCheck = checkIsMarketOpen(symbolToUse);
    if (!marketOpenCheck.isOpen) {
      alert(marketOpenCheck.reason || "Market is currently closed for this asset.");
      return;
    }

    const currentPrice = currentPrices[symbolToUse];
    if (!currentPrice) {
      alert("Fetching price, please wait.");
      return;
    }

    const priceToUse = orderType === 'Limit' ? (limitPrice || currentPrice) : currentPrice;
    let margin = (priceToUse * quantity) / leverage;
    if (margin > 0 && margin < 0.05) {
      margin = 0.05;
    }
    const feeRate = orderType === 'Limit' ? 0.05 : 0.1;
    const feeUsd = (priceToUse * quantity) * feeRate;
    const totalMarginToDeduct = margin + feeUsd; 
    
    if (totalMarginToDeduct > accountBalance.usd) {
       alert("Insufficient balance (Margin + Fee)!");
       return;
    }

    // Opens position immediately of either Market or Limit order type
    const newPosition: Position = {
      id: Date.now(),
      pair: symbolToUse,
      side,
      quantity,
      entryPrice: priceToUse,
      leverage,
      margin,
      timestamp: Date.now(),
      tp: tpPrice,
      sl: slPrice
    };

    setPositions([...positions, newPosition]);
    setAccountBalance(prev => ({
      ...prev,
      usd: prev.usd - totalMarginToDeduct,
      inr: (prev.usd - totalMarginToDeduct) * 83.5
    }));

    // Save to order history
    const orderLog: OrderHistoryItem = {
      id: Date.now(),
      pair: symbolToUse,
      side,
      type: orderType || 'Market',
      quantity,
      price: priceToUse,
      status: 'Filled',
      timestamp: Date.now()
    };
    setOrderHistory(prev => [orderLog, ...prev]);

    // Save to trade history
    const tradeLog: TradeHistoryItem = {
      id: Date.now() + 1,
      pair: symbolToUse,
      side,
      quantity,
      price: priceToUse,
      timestamp: Date.now(),
      fee: priceToUse * quantity * (orderType === 'Limit' ? 0.05 : 0.1)
    };
    setTradeHistory(prev => [tradeLog, ...prev]);
  };

  const positionsRef = React.useRef(positions);
  useEffect(() => {
    positionsRef.current = positions;
  }, [positions]);

  useEffect(() => {
    const interval = setInterval(() => {
      const currentPositions = positionsRef.current;
      if (currentPositions.length === 0) return;
      
      currentPositions.forEach(pos => {
        const currentPrice = currentPrices[pos.pair];
        if (!currentPrice) return;

        let shouldClose = false;
        let exitStatus: 'TP' | 'SL' | null = null;
        let executePrice = currentPrice;

        if (pos.side === 'long') {
          if (pos.tp && currentPrice >= pos.tp) { shouldClose = true; exitStatus = 'TP'; executePrice = pos.tp; }
          if (pos.sl && currentPrice <= pos.sl) { shouldClose = true; exitStatus = 'SL'; executePrice = pos.sl; }
        } else {
          if (pos.tp && currentPrice <= pos.tp) { shouldClose = true; exitStatus = 'TP'; executePrice = pos.tp; }
          if (pos.sl && currentPrice >= pos.sl) { shouldClose = true; exitStatus = 'SL'; executePrice = pos.sl; }
        }

        // Liquidation Check
        const marginVal = pos.margin;
        const notional = pos.entryPrice * pos.quantity;
        const mm = notional * 0.005; // 0.5% maintenance margin
        const pnl = pos.side === 'long' ? (currentPrice - pos.entryPrice) * pos.quantity : (pos.entryPrice - currentPrice) * pos.quantity;
        if (marginVal + pnl < mm && !shouldClose) {
          shouldClose = true;
          exitStatus = 'SL'; // Liquidation
          executePrice = currentPrice;
        }

        if (shouldClose) {
          const closedId = pos.id;
          
          const diff = executePrice - pos.entryPrice;
          const finalPnl = pos.side === 'long' ? diff * pos.quantity : -diff * pos.quantity;
          
          const closeFeeUsd = (executePrice * pos.quantity) * 0.1; // Closing is usually Market/Taker
          const closeFeeInr = closeFeeUsd * 83.5;

          setPositions(prev => prev.filter(p => p.id !== closedId));
          
          setAccountBalance(prev => {
            const newUsd = prev.usd + pos.margin + finalPnl - closeFeeUsd;
            return {
              ...prev,
              usd: newUsd,
              inr: newUsd * 83.5
            };
          });

          const closedItem: PositionHistoryItem = {
            id: Date.now() + Math.floor(Math.random() * 1000),
            pair: pos.pair,
            side: pos.side,
            leverage: pos.leverage,
            quantity: pos.quantity,
            entryPrice: pos.entryPrice,
            exitPrice: executePrice,
            openTime: pos.timestamp,
            closeTime: Date.now(),
            pnl: finalPnl,
            status: exitStatus === 'TP' ? 'TP Hit' : (exitStatus === 'SL' ? 'SL Hit' : 'Closed'),
            holdingFee: pos.holdingFee || 0,
            closeFee: closeFeeInr
          };
          setPositionHistory(prev => [closedItem, ...prev]);

          const closeTradeLog: TradeHistoryItem = {
            id: Date.now() + Math.floor(Math.random() * 1000) + 1,
            pair: pos.pair,
            side: pos.side === 'long' ? 'short' : 'long',
            quantity: pos.quantity,
            price: executePrice,
            timestamp: Date.now(),
            fee: executePrice * pos.quantity * 0.1
          };
          setTradeHistory(prev => [closeTradeLog, ...prev]);
          
          console.log(`Auto Closed Position ${closedId} due to ${exitStatus}`);
        }
      });
    }, 1000);
    
    return () => clearInterval(interval);
  }, [currentPrices]);

  // Provide partial close
  const closePositionPartial = (id: number, fraction: number = 1) => {
    const pos = positions.find(p => p.id === id);
    if (!pos) return;
    
    // Safety check for fraction
    fraction = Math.min(Math.max(fraction, 0.01), 1);
    
    const currentPrice = currentPrices[pos.pair];
    if(!currentPrice) return;

    const qtyToClose = pos.quantity * fraction;
    const marginToRelease = pos.margin * fraction;

    const diff = currentPrice - pos.entryPrice;
    const pnl = pos.side === 'long' ? diff * qtyToClose : -diff * qtyToClose;

    const closeFeeUsd = (currentPrice * qtyToClose) * 0.1;
    const closeFeeInr = closeFeeUsd * 83.5;
    const msPerDay = 1000 * 60 * 60 * 24;
    const daysOpen = Math.max(1, Math.ceil((Date.now() - pos.timestamp) / msPerDay));
    const holdingFeeInr = 0; // Removed holding fee as per simplified request
    
    const totalFeeUsd = closeFeeUsd;
    const totalFeeInr = totalFeeUsd * 83.5;

    if (fraction === 1) {
      setPositions(prev => prev.filter(p => p.id !== id));
    } else {
      setPositions(prev => prev.map(p => {
        if (p.id === id) {
          return {
            ...p,
            quantity: p.quantity - qtyToClose,
            margin: p.margin - marginToRelease
          };
        }
        return p;
      }));
    }
    
    setAccountBalance(prev => {
      const newUsd = prev.usd + marginToRelease + pnl - totalFeeUsd;
      return {
        ...prev,
        usd: newUsd,
        inr: newUsd * 83.5
      };
    });

    const exitStatus = 'Closed';

    const closedItem: PositionHistoryItem = {
      id: Date.now(),
      pair: pos.pair,
      side: pos.side,
      leverage: pos.leverage,
      quantity: qtyToClose,
      entryPrice: pos.entryPrice,
      exitPrice: currentPrice,
      openTime: pos.timestamp,
      closeTime: Date.now(),
      pnl,
      holdingFee: holdingFeeInr,
      closeFee: closeFeeInr,
      status: exitStatus
    };
    setPositionHistory(prev => [closedItem, ...prev]);

    const closeTradeLog: TradeHistoryItem = {
      id: Date.now() + 2,
      pair: pos.pair,
      side: pos.side === 'long' ? 'short' : 'long',
      quantity: qtyToClose,
      price: currentPrice,
      timestamp: Date.now(),
      fee: currentPrice * qtyToClose * 0.1
    };
    setTradeHistory(prev => [closeTradeLog, ...prev]);
  };

  const closePosition = (id: number) => {
    closePositionPartial(id, 1);
  };


  const cancelPendingOrder = (id: number) => {
    const order = pendingOrders.find(o => o.id === id);
    if (!order) return;
    setPendingOrders(prev => prev.filter(o => o.id !== id));
    
    const logItem: OrderHistoryItem = {
      id: Date.now(),
      pair: order.pair,
      side: order.side,
      type: order.type,
      quantity: order.quantity,
      price: order.price,
      status: 'Cancelled',
      timestamp: Date.now()
    };
    setOrderHistory(prev => [logItem, ...prev]);
  };

  const modifyPendingOrder = (id: number, price: number, qty: number) => {
    setPendingOrders(prev => prev.map(o => o.id === id ? { ...o, price, quantity: qty } : o));
  };

  const addFunds = (amount: number) => {
    setAccountBalance(prev => {
      const newUsd = prev.usd + amount;
      return { usd: newUsd, inr: newUsd * 83.5 };
    });
  };

  const updatePositionTpSl = (id: number, tp?: number, sl?: number) => {
    setPositions(prev => prev.map(p => p.id === id ? { ...p, tp, sl } : p));
  };

  const [appSettings, setAppSettings] = useState({ vpa: '', merchantName: '', upiActive: true, logoUrl: '' });

  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'app_settings', 'payment'), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setAppSettings({
          vpa: data.vpa || '',
          merchantName: data.merchantName || '',
          upiActive: data.upiActive ?? true,
          logoUrl: data.logoUrl || ''
        });
      }
    });
    return () => unsub();
  }, []);

  return (
    <TradingContext.Provider value={{
      accountMode,
      setAccountMode,
      accountBalance,
      realBalance,
      demoBalance,
      setRealBalance,
      setDemoBalance,
      positions,
      selectedPair,
      setSelectedPair,
      executeTrade,
      closePosition,
      closePositionPartial,
      addFunds,
      tickers,
      currentPrices,
      orderBook,
      preloadedSide,
      setPreloadedSide,
      pendingOrders,
      orderHistory,
      tradeHistory,
      positionHistory,
      cancelPendingOrder,
      modifyPendingOrder,
      updatePositionTpSl,
      theme,
      toggleTheme,
      appSettings
    }}>
      {children}
    </TradingContext.Provider>
  );
};

export const useTradingContext = () => {
  const context = useContext(TradingContext);
  if (!context) throw new Error("useTradingContext must be used within TradingProvider");
  return context;
};
