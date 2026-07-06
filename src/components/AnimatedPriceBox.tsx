import React, { useEffect, useRef, useState } from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface Props {
  price: number;
  priceChangePercent: number;
}

export default function AnimatedPriceBox({ price, priceChangePercent }: Props) {
  const prevPriceRef = useRef<number>(price);
  const [flash, setFlash] = useState<'up' | 'down' | null>(null);

  useEffect(() => {
    if (price !== prevPriceRef.current && prevPriceRef.current !== 0) {
      const isUp = price > prevPriceRef.current;
      setFlash(isUp ? 'up' : 'down');
      
      const timer = setTimeout(() => {
        setFlash(null);
      }, 400);

      return () => clearTimeout(timer);
    }
    prevPriceRef.current = price;
  }, [price]);

  const isPositive = (priceChangePercent || 0) >= 0;

  return (
    <div className="flex flex-col items-end text-right">
      <div className="flex items-center gap-1.5 overflow-visible">
        <div className="w-[18px]">
          <AnimatePresence mode="popLayout">
            {flash === 'up' && (
              <motion.div
                initial={{ y: 10, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: -10, opacity: 0 }}
                className="text-success"
              >
                <TrendingUp size={18} strokeWidth={3} />
              </motion.div>
            )}
            {flash === 'down' && (
              <motion.div
                initial={{ y: -10, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: 10, opacity: 0 }}
                className="text-danger"
              >
                <TrendingDown size={18} strokeWidth={3} />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        
        <span 
          className={`text-[20px] sm:text-[24px] font-extrabold font-mono leading-none tracking-tight ${isPositive ? 'text-success' : 'text-danger'}`}
        >
          {price ? price.toFixed(2) : '--'}
        </span>
      </div>
      
      <span className={`text-[12px] sm:text-[13px] font-mono font-bold mt-0.5 inline-block ${isPositive ? 'text-success' : 'text-danger'}`}>
        {isPositive ? '+' : ''}{(priceChangePercent || 0).toFixed(2)}%
      </span>
    </div>
  );
}
