"use client";

import { memo, useEffect, useRef } from "react";
import type { Market } from "@/types";

// 觀察名單裡屬於上櫃（TPEX）的台股代號；其餘預設走 TWSE
const TW_TPEX_SYMBOLS = new Set(["8033", "8299", "3260", "6285"]);

function toTvSymbol(symbol: string, market: Market): string {
  if (market === "JP") return `TSE:${symbol}`;
  if (market === "TW") {
    return TW_TPEX_SYMBOLS.has(symbol) ? `TPEX:${symbol}` : `TWSE:${symbol}`;
  }
  return symbol; // US：TradingView 自動解析
}

interface Props {
  symbol: string;
  market: Market;
}

function TradingViewChartImpl({ symbol, market }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    container.innerHTML = "";

    const script = document.createElement("script");
    script.src =
      "https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js";
    script.async = true;
    script.type = "text/javascript";
    script.innerHTML = JSON.stringify({
      autosize: true,
      symbol: toTvSymbol(symbol, market),
      interval: "D",
      timezone: market === "US" ? "America/New_York" : market === "JP" ? "Asia/Tokyo" : "Asia/Taipei",
      theme: "dark",
      style: "1",
      locale: "zh_TW",
      backgroundColor: "rgba(0, 0, 0, 0)",
      gridColor: "rgba(50, 50, 50, 0.5)",
      hide_side_toolbar: false,
      allow_symbol_change: false,
      withdateranges: true,
      details: false,
      hotlist: false,
      calendar: false,
      studies: ["STD;MA%1Cross", "STD;BB"],
      support_host: "https://www.tradingview.com",
    });
    container.appendChild(script);

    return () => {
      container.innerHTML = "";
    };
  }, [symbol, market]);

  return (
    <div ref={containerRef} className="tradingview-widget-container h-full w-full" />
  );
}

// memo + 由 parent 傳 key={market:symbol} 確保切股票時整個重 mount
export const TradingViewChart = memo(TradingViewChartImpl);
