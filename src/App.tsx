import React from 'react';
import AppLayout from './components/AppLayout';
import { TradingProvider } from './store/TradingContext';
import { AuthProvider } from './store/AuthContext';

export default function App() {
  return (
    <AuthProvider>
      <TradingProvider>
        <AppLayout />
      </TradingProvider>
    </AuthProvider>
  );
}


