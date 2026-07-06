import React from 'react';
import { useTradingContext } from '../store/TradingContext';

interface TradeEXLogoProps {
  className?: string;
  size?: number | string;
}

export default function TradeEXLogo({ className = "", size = 40 }: TradeEXLogoProps) {
  const context = useTradingContext();
  const dynamicLogoUrl = context?.appSettings?.logoUrl;

  const logoSrc = dynamicLogoUrl || "https://i.ibb.co/W4zjpw4c/upscalemedia-transformed.png";

  return (
    <img 
      src={logoSrc} 
      alt="TradeEX Logo" 
      className={className} 
      style={{ width: size ? size : '100%', height: size ? size : '100%', objectFit: 'contain' }}
    />
  );
}
