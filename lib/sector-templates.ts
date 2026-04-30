import type { Market, SectorTemplate } from "@/types";

export const SECTOR_TEMPLATES: SectorTemplate[] = [
  {
    id: "tw-abf",
    name: "ABF 載板",
    description: "IC 封裝載板三雄與後進廠",
    members: [
      { symbol: "3037", name: "欣興", market: "TW" },
      { symbol: "3189", name: "景碩", market: "TW" },
      { symbol: "8046", name: "南電", market: "TW" },
    ],
  },
  {
    id: "tw-ccl",
    name: "CCL 銅箔基板",
    description: "高速銅箔基板（AI 伺服器原料）",
    members: [
      { symbol: "2383", name: "台光電", market: "TW" },
      { symbol: "6213", name: "聯茂", market: "TW" },
      { symbol: "2368", name: "金像電", market: "TW" },
      { symbol: "6274", name: "台燿", market: "TW" },
    ],
  },
  {
    id: "tw-ai-server",
    name: "AI 伺服器供應鏈",
    description: "AI 伺服器組裝、ODM 與供應商",
    members: [
      { symbol: "2308", name: "台達電", market: "TW" },
      { symbol: "2382", name: "廣達", market: "TW" },
      { symbol: "3231", name: "緯創", market: "TW" },
      { symbol: "2356", name: "英業達", market: "TW" },
      { symbol: "6669", name: "緯穎", market: "TW" },
    ],
  },
  {
    id: "tw-ip",
    name: "矽智財 IP",
    description: "ASIC 設計服務與矽智財",
    members: [
      { symbol: "3661", name: "世芯-KY", market: "TW" },
      { symbol: "3035", name: "智原", market: "TW" },
      { symbol: "3443", name: "創意", market: "TW" },
      { symbol: "3529", name: "力旺", market: "TW" },
    ],
  },
  {
    id: "tw-cooling",
    name: "散熱模組",
    description: "AI 伺服器散熱（液冷/3DVC）",
    members: [
      { symbol: "3017", name: "奇鋐", market: "TW" },
      { symbol: "3324", name: "雙鴻", market: "TW" },
      { symbol: "6230", name: "超眾", market: "TW" },
      { symbol: "2421", name: "建準", market: "TW" },
    ],
  },
  {
    id: "tw-foundry",
    name: "晶圓代工",
    description: "晶圓製造廠",
    members: [
      { symbol: "2330", name: "台積電", market: "TW" },
      { symbol: "2303", name: "聯電", market: "TW" },
      { symbol: "5347", name: "世界", market: "TW" },
      { symbol: "6770", name: "力積電", market: "TW" },
    ],
  },
  {
    id: "tw-memory",
    name: "記憶體",
    description: "DRAM、Flash 模組廠",
    members: [
      { symbol: "2408", name: "南亞科", market: "TW" },
      { symbol: "3260", name: "威剛", market: "TW" },
      { symbol: "8299", name: "群聯", market: "TW" },
      { symbol: "2344", name: "華邦電", market: "TW" },
    ],
  },
];

export function findTemplate(id: string): SectorTemplate | undefined {
  return SECTOR_TEMPLATES.find((t) => t.id === id);
}

export function findTemplatesContaining(symbol: string, market: Market): SectorTemplate[] {
  return SECTOR_TEMPLATES.filter((t) =>
    t.members.some((m) => m.symbol === symbol && m.market === market)
  );
}
