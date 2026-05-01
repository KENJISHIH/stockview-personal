export type Market = "TW" | "JP" | "US";

export interface WatchlistItem {
  symbol: string;
  name: string;
  market: Market;
  order: number;
  addedAt: string;
}

export interface Quote {
  symbol: string;
  market: Market;
  name: string;
  price: number;
  change: number;
  changePct: number;
  open?: number;
  high?: number;
  low?: number;
  volume?: number;
  marketCap?: number;
  updatedAt: string;
}

export interface DailyRow {
  date: string;
  close: number;
  change: number;
  changePct: number;
  cumPct: number;
}

export interface DailySeries {
  symbol: string;
  market: Market;
  name: string;
  rows: DailyRow[];
  cumulativePct: number;
  baseClose: number;
}

export interface Fundamental {
  pe?: number;
  forwardPe?: number;
  pb?: number;
  roe?: number;
  eps?: number;
  dividendYield?: number;
  grossMargin?: number;
  revenueYoy?: number;
  beta?: number;
  marketCap?: number;
  targetMeanPrice?: number;
}

export interface IndexQuote {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePct: number;
}

export interface SectorMember {
  symbol: string;
  name: string;
  market: Market;
}

export interface SectorGroup {
  id: string;
  name: string;
  members: SectorMember[];
  templateId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface SectorTemplate {
  id: string;
  name: string;
  description: string;
  members: SectorMember[];
}

export interface PeerRow {
  symbol: string;
  name: string;
  market: Market;
  price?: number;
  changePct?: number;
  eps?: number;
  pe?: number;
  forwardPe?: number;
  marketCap?: number;
  error?: string;
}
