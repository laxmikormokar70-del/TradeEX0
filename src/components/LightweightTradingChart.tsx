import React, { useEffect, useRef } from "react";
import { createChart, IChartApi, ISeriesApi, LineStyle, CandlestickSeries } from "lightweight-charts";
import { useTradingContext } from "../store/TradingContext";

export default function LightweightTradingChart({
  pair,
  theme = "light",
}: {
  pair: string;
  theme?: "light" | "dark";
}) {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const linesRef = useRef<any[]>([]);

  const { positions, currentPrices } = useTradingContext();

  useEffect(() => {
    if (!chartContainerRef.current) return;

    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { type: "solid" as any, color: theme === "light" ? "#FFFFFF" : "#1e293b" },
        textColor: theme === "light" ? "#334155" : "#94a3b8",
      },
      grid: {
        vertLines: { color: theme === "light" ? "#f1f5f9" : "#334155" },
        horzLines: { color: theme === "light" ? "#f1f5f9" : "#334155" },
      },
      timeScale: {
        timeVisible: true,
        secondsVisible: false,
      },
      crosshair: {
        mode: 1,
      },
    });

    const series = chart.addSeries(CandlestickSeries, {
      upColor: "#22c55e",
      downColor: "#ef4444",
      borderVisible: false,
      wickUpColor: "#22c55e",
      wickDownColor: "#ef4444",
    });

    chartRef.current = chart;
    seriesRef.current = series;

    // Generate mock historical data backwards from live price
    const data = [];
    const barCount = 500; 
    let time = Math.floor(Date.now() / 1000); 
    
    // Get live price anchor or default
    let anchorPrice = currentPrices[pair] || 100;
    
    // Generate backwards so the final candle closes exactly at our anchor
    data.push({
      time: time,
      open: anchorPrice * 0.999,
      high: anchorPrice * 1.002,
      low: anchorPrice * 0.998,
      close: anchorPrice
    });

    let previousClose = anchorPrice * 0.999;
    
    for (let i = 1; i < barCount; i++) {
        time -= 3600; // 1 hr step backwards
        const volatility = previousClose * 0.005;
        const close = previousClose;
        const open = close + (Math.random() - 0.5) * volatility;
        const high = Math.max(open, close) + Math.random() * volatility * 0.5;
        const low = Math.min(open, close) - Math.random() * volatility * 0.5;
        
        data.push({
            time,
            open,
            high,
            low,
            close
        });
        
        previousClose = open;
    }

    // Reverse to chronological order and set data
    series.setData(data.reverse() as any);

    const resizeObserver = new ResizeObserver(entries => {
      if (entries.length === 0 || entries[0].target !== chartContainerRef.current) {
        return;
      }
      const newRect = entries[0].contentRect;
      chart.applyOptions({ height: newRect.height, width: newRect.width });
    });

    resizeObserver.observe(chartContainerRef.current);

    return () => {
      resizeObserver.disconnect();
      chart.remove();
    };
    // Include currentPrices initially so we get an accurate anchor if possible
    // but don't re-run the whole setup on every tick, so just depend on pair
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pair, theme]);

  // Update current tick
  useEffect(() => {
    if (!seriesRef.current) return;
    const price = currentPrices[pair];
    if (price) {
        const now = Math.floor(Date.now() / 1000);
        seriesRef.current.update({
            time: now as any,
            open: price,
            high: price * 1.001,
            low: price * 0.999,
            close: price
        });
    }
  }, [currentPrices, pair]);

  // Sync Position Markers (Lines)
  useEffect(() => {
      if (!seriesRef.current) return;
      const series = seriesRef.current;
      
      // Clear old lines
      linesRef.current.forEach(line => {
          series.removePriceLine(line);
      });
      linesRef.current = [];

      // Add lines for current pair positions
      const activePositions = positions.filter(p => p.pair === pair);
      
      activePositions.forEach(pos => {
          const isLong = pos.side === 'long';
          const entryColor = isLong ? "#22c55e" : "#ef4444";
          
          const entryLine = series.createPriceLine({
            price: pos.entryPrice,
            color: entryColor,
            lineWidth: 2,
            lineStyle: LineStyle.Solid,
            axisLabelVisible: true,
            title: `${pos.side.toUpperCase()} ${pos.quantity} @ ${pos.entryPrice}`,
          });
          linesRef.current.push(entryLine);

          if (pos.tp) {
              const tpLine = series.createPriceLine({
                  price: pos.tp,
                  color: "#3b82f6", // Blue for TP
                  lineWidth: 1,
                  lineStyle: LineStyle.Dashed,
                  axisLabelVisible: true,
                  title: `TP`,
              });
              linesRef.current.push(tpLine);
          }

          if (pos.sl) {
              const slLine = series.createPriceLine({
                  price: pos.sl,
                  color: "#f59e0b", // Amber for SL
                  lineWidth: 1,
                  lineStyle: LineStyle.Dashed,
                  axisLabelVisible: true,
                  title: `SL`,
              });
              linesRef.current.push(slLine);
          }
      });
  }, [positions, pair]);

  return <div ref={chartContainerRef} className="w-full h-full" />;
}
