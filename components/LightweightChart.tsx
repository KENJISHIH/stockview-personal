"use client";

import { memo, useEffect, useMemo, useRef, useState } from "react";
import useSWR from "swr";
import {
  CandlestickSeries,
  ColorType,
  CrosshairMode,
  HistogramSeries,
  LineSeries,
  createChart,
  type IChartApi,
  type ISeriesApi,
  type Time,
} from "lightweight-charts";
import { fetcher } from "@/lib/swr";
import { Button } from "@/components/ui/button";
import type { Market } from "@/types";

interface OhlcvBar {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

interface Props {
  symbol: string;
  market: Market;
}

type RangeKey = "1M" | "3M" | "6M" | "1Y";
const RANGE_DAYS: Record<RangeKey, number> = {
  "1M": 22,
  "3M": 66,
  "6M": 120,
  "1Y": 250,
};
const RANGE_LABEL: Record<RangeKey, string> = {
  "1M": "1月",
  "3M": "3月",
  "6M": "6月",
  "1Y": "1年",
};

const RED_UP = "#ef4444"; // 漲
const GREEN_DOWN = "#22c55e"; // 跌
const MA5_COLOR = "#a78bfa";
const MA10_COLOR = "#ec4899";
const MA20_COLOR = "#f59e0b";
const BB_UPPER = "#06b6d4";
const BB_LOWER = "#06b6d4";
const BB_MIDDLE = "#94a3b8";

function computeMA(closes: number[], period: number): (number | null)[] {
  return closes.map((_, i) => {
    if (i < period - 1) return null;
    let sum = 0;
    for (let k = i - period + 1; k <= i; k++) sum += closes[k];
    return sum / period;
  });
}

function computeBB(
  closes: number[],
  period: number,
  k: number
): { upper: (number | null)[]; lower: (number | null)[]; middle: (number | null)[] } {
  const upper: (number | null)[] = [];
  const lower: (number | null)[] = [];
  const middle: (number | null)[] = [];
  for (let i = 0; i < closes.length; i++) {
    if (i < period - 1) {
      upper.push(null);
      lower.push(null);
      middle.push(null);
      continue;
    }
    let sum = 0;
    for (let j = i - period + 1; j <= i; j++) sum += closes[j];
    const mean = sum / period;
    let variance = 0;
    for (let j = i - period + 1; j <= i; j++) variance += (closes[j] - mean) ** 2;
    const sd = Math.sqrt(variance / period);
    upper.push(mean + k * sd);
    lower.push(mean - k * sd);
    middle.push(mean);
  }
  return { upper, lower, middle };
}

function LightweightChartImpl({ symbol, market }: Props) {
  const [range, setRange] = useState<RangeKey>("6M");
  const days = RANGE_DAYS[range];
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candleRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const volumeRef = useRef<ISeriesApi<"Histogram"> | null>(null);
  const ma5Ref = useRef<ISeriesApi<"Line"> | null>(null);
  const ma10Ref = useRef<ISeriesApi<"Line"> | null>(null);
  const ma20Ref = useRef<ISeriesApi<"Line"> | null>(null);
  const bbUpperRef = useRef<ISeriesApi<"Line"> | null>(null);
  const bbMiddleRef = useRef<ISeriesApi<"Line"> | null>(null);
  const bbLowerRef = useRef<ISeriesApi<"Line"> | null>(null);

  const [showMA5, setShowMA5] = useState(false);
  const [showMA10, setShowMA10] = useState(false);
  const [showMA20, setShowMA20] = useState(true);
  const [showBB, setShowBB] = useState(false);
  const [showVol, setShowVol] = useState(true);

  const { data, error, isLoading } = useSWR<{ bars: OhlcvBar[] }>(
    `/api/ohlcv/${market}/${encodeURIComponent(symbol)}?days=${days}`,
    fetcher,
    {
      refreshInterval: 5 * 60 * 1000,
      revalidateOnFocus: true,
      dedupingInterval: 60_000,
    }
  );

  // 圖表初始化（只一次）
  useEffect(() => {
    if (!containerRef.current) return;
    const chart = createChart(containerRef.current, {
      autoSize: true,
      layout: {
        background: { type: ColorType.Solid, color: "transparent" },
        textColor: "#94a3b8",
      },
      grid: {
        vertLines: { color: "rgba(148, 163, 184, 0.08)" },
        horzLines: { color: "rgba(148, 163, 184, 0.08)" },
      },
      timeScale: {
        timeVisible: true,
        secondsVisible: false,
        borderColor: "rgba(148, 163, 184, 0.2)",
      },
      rightPriceScale: {
        borderColor: "rgba(148, 163, 184, 0.2)",
        scaleMargins: { top: 0.1, bottom: 0.25 },
      },
      crosshair: { mode: CrosshairMode.Normal },
    });

    const candle = chart.addSeries(CandlestickSeries, {
      upColor: RED_UP,
      downColor: GREEN_DOWN,
      borderUpColor: RED_UP,
      borderDownColor: GREEN_DOWN,
      wickUpColor: RED_UP,
      wickDownColor: GREEN_DOWN,
    });

    const volume = chart.addSeries(HistogramSeries, {
      priceFormat: { type: "volume" },
      priceScaleId: "vol",
      color: "rgba(148, 163, 184, 0.4)",
    });
    chart.priceScale("vol").applyOptions({
      scaleMargins: { top: 0.82, bottom: 0 },
    });

    const ma5 = chart.addSeries(LineSeries, {
      color: MA5_COLOR,
      lineWidth: 1,
      priceLineVisible: false,
      lastValueVisible: false,
    });
    const ma10 = chart.addSeries(LineSeries, {
      color: MA10_COLOR,
      lineWidth: 1,
      priceLineVisible: false,
      lastValueVisible: false,
    });
    const ma20 = chart.addSeries(LineSeries, {
      color: MA20_COLOR,
      lineWidth: 1,
      priceLineVisible: false,
      lastValueVisible: false,
    });

    const bbUpper = chart.addSeries(LineSeries, {
      color: BB_UPPER,
      lineWidth: 1,
      priceLineVisible: false,
      lastValueVisible: false,
    });
    const bbMiddle = chart.addSeries(LineSeries, {
      color: BB_MIDDLE,
      lineWidth: 1,
      lineStyle: 2, // dashed
      priceLineVisible: false,
      lastValueVisible: false,
    });
    const bbLower = chart.addSeries(LineSeries, {
      color: BB_LOWER,
      lineWidth: 1,
      priceLineVisible: false,
      lastValueVisible: false,
    });

    chartRef.current = chart;
    candleRef.current = candle;
    volumeRef.current = volume;
    ma5Ref.current = ma5;
    ma10Ref.current = ma10;
    ma20Ref.current = ma20;
    bbUpperRef.current = bbUpper;
    bbMiddleRef.current = bbMiddle;
    bbLowerRef.current = bbLower;

    return () => {
      chart.remove();
      chartRef.current = null;
    };
  }, []);

  // 餵資料
  const seriesData = useMemo(() => {
    if (!data?.bars || data.bars.length === 0) return null;
    const candles = data.bars.map((b) => ({
      time: b.date as Time,
      open: b.open,
      high: b.high,
      low: b.low,
      close: b.close,
    }));
    const volumes = data.bars.map((b) => ({
      time: b.date as Time,
      value: b.volume,
      color: b.close >= b.open ? "rgba(239, 68, 68, 0.4)" : "rgba(34, 197, 94, 0.4)",
    }));
    const closes = data.bars.map((b) => b.close);
    const ma5Arr = computeMA(closes, 5);
    const ma10Arr = computeMA(closes, 10);
    const ma20Arr = computeMA(closes, 20);
    const bb = computeBB(closes, 20, 2);

    const toLine = (arr: (number | null)[]) =>
      arr
        .map((v, i) =>
          v === null ? null : ({ time: data.bars[i].date as Time, value: v })
        )
        .filter((x): x is { time: Time; value: number } => x !== null);

    return {
      candles,
      volumes,
      ma5: toLine(ma5Arr),
      ma10: toLine(ma10Arr),
      ma20: toLine(ma20Arr),
      bbUpper: toLine(bb.upper),
      bbMiddle: toLine(bb.middle),
      bbLower: toLine(bb.lower),
    };
  }, [data]);

  useEffect(() => {
    if (!seriesData) return;
    candleRef.current?.setData(seriesData.candles);
    volumeRef.current?.setData(showVol ? seriesData.volumes : []);
    ma5Ref.current?.setData(showMA5 ? seriesData.ma5 : []);
    ma10Ref.current?.setData(showMA10 ? seriesData.ma10 : []);
    ma20Ref.current?.setData(showMA20 ? seriesData.ma20 : []);
    bbUpperRef.current?.setData(showBB ? seriesData.bbUpper : []);
    bbMiddleRef.current?.setData(showBB ? seriesData.bbMiddle : []);
    bbLowerRef.current?.setData(showBB ? seriesData.bbLower : []);
    chartRef.current?.timeScale().fitContent();
  }, [seriesData, showMA5, showMA10, showMA20, showBB, showVol]);

  return (
    <div className="relative flex h-full w-full flex-col">
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 border-b border-border/50 px-3 py-2 text-xs">
        <span className="text-muted-foreground">期間：</span>
        {(Object.keys(RANGE_LABEL) as RangeKey[]).map((k) => (
          <Button
            key={k}
            variant={range === k ? "secondary" : "ghost"}
            size="sm"
            className="h-6 px-2 text-xs"
            onClick={() => setRange(k)}
          >
            {RANGE_LABEL[k]}
          </Button>
        ))}
        <span className="ml-3 text-muted-foreground">指標：</span>
        <Toggle on={showMA5} onChange={setShowMA5} color={MA5_COLOR}>
          MA5
        </Toggle>
        <Toggle on={showMA10} onChange={setShowMA10} color={MA10_COLOR}>
          MA10
        </Toggle>
        <Toggle on={showMA20} onChange={setShowMA20} color={MA20_COLOR}>
          MA20
        </Toggle>
        <Toggle on={showBB} onChange={setShowBB} color={BB_UPPER}>
          布林
        </Toggle>
        <Toggle on={showVol} onChange={setShowVol}>
          成交量
        </Toggle>
        <span className="ml-auto text-muted-foreground">
          {data?.bars?.length ? `${data.bars.length} 個交易日` : ""}
        </span>
      </div>
      <div className="relative flex-1">
        <div ref={containerRef} className="h-full w-full" />
        {isLoading && !seriesData && (
          <div className="absolute inset-0 flex items-center justify-center text-sm text-muted-foreground">
            載入中…
          </div>
        )}
        {error && (
          <div className="absolute inset-0 flex items-center justify-center text-sm text-red-500">
            K 線載入失敗
          </div>
        )}
      </div>
    </div>
  );
}

function Toggle({
  on,
  onChange,
  color,
  children,
}: {
  on: boolean;
  onChange: (v: boolean) => void;
  color?: string;
  children: React.ReactNode;
}) {
  return (
    <Button
      variant={on ? "secondary" : "ghost"}
      size="sm"
      className="h-6 gap-1.5 px-2 text-xs"
      onClick={() => onChange(!on)}
    >
      {color && (
        <span
          className="inline-block h-2 w-2 rounded-full"
          style={{ backgroundColor: on ? color : "currentColor", opacity: on ? 1 : 0.3 }}
        />
      )}
      {children}
    </Button>
  );
}

export const LightweightChart = memo(LightweightChartImpl);
