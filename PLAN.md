---
name: 個人投資介面工具
codename: stockview-personal
owner: Kenji Shih (kenjishih@gmail.com)
created: 2026-04-25
handoff_to: Claude Sonnet 4.6
current_phase: Phase 0 規劃完成，待啟動 Phase 1
last_updated: 2026-04-25
---

# 個人投資介面工具 — 開發執行書

---

## 0. 專案快覽

| 項目 | 內容 |
|---|---|
| 中文名稱 | 個人投資介面工具 |
| 代號 | stockview-personal |
| 專案位置 | `~/Documents/KJ-agent/stockview-personal/` |
| 主語言 | TypeScript |
| 框架 | Next.js 14 (App Router) |
| UI | shadcn/ui + Tailwind CSS |
| 圖表 | TradingView Advanced Chart Widget（embed） |
| 部署目標 | Vercel |
| 使用者 | **單人桌機模式**：Kenji 本人，桌面瀏覽器（1440px+） |
| 不做的事 | 手機版 RWD（桌機優先設計，手機可開但不保證體驗） |

---

## 1. 背景與目標

### 1.1 要解決什麼問題

Kenji 平常用銀行 App 看台美股觀察名單，痛點：
1. **手機切頁籤切到煩**：個股要逐一點進去看詳細
2. **資訊散落**：技術面在 TradingView、基本面要去 Yahoo / Goodinfo
3. **常用視圖做不到**：「這檔最近 10 個工作天的收盤、每天漲幅、累積漲幅」這種快查在 SaaS 裡幾乎沒有
4. **訂閱費**：付費平台（如 STOCKVIEW PRO 類）每月固定支出

### 1.2 使用情境

```
桌機瀏覽器 ─→ 開啟 dashboard
                │
                ├─ 頂部指數列：一眼看大盤情緒
                ├─ 左側 watchlist：點台積電
                │       ↓
                ├─ 中間：K線（TradingView widget）
                ├─ 右上：最近 10 天收盤 + 每日漲幅 + 累積漲幅
                └─ 右下：基本面（PE/ROE/EPS/殖利率…）
```

點擊 watchlist 任一檔 → 中間 + 右側整片切換，**不重新載入整頁**。

### 1.3 設計原則

1. **不做手機版**：桌機 only，佈局塞越多有用資訊越好
2. **減少點擊**：常用資訊不要藏在分頁後面，預設就顯示
3. **成本為零**：免費 API + Vercel 免費方案 + localStorage（不開資料庫）
4. **無登入**：單機 / 單人使用，不做帳號系統

---

## 2. 整體架構

```
┌────────────────────────────────────────────────────────────┐
│                  瀏覽器（桌機，1440px+）                     │
│  Next.js 14 App Router + shadcn/ui + Tailwind             │
│  Watchlist 存 localStorage                                 │
└───────────────────────┬────────────────────────────────────┘
                        │ fetch
            ┌───────────┴───────────┐
            ▼                       ▼
   ┌─────────────────┐     ┌─────────────────┐
   │  /api/tw/*      │     │  /api/us/*      │
   │  Next.js Route  │     │  Next.js Route  │
   │  Handler        │     │  Handler        │
   └────────┬────────┘     └────────┬────────┘
            │                       │
   ┌────────▼────────┐     ┌────────▼────────┐
   │  FinMind API    │     │ yahoo-finance2  │
   │  (台股全套)      │     │  (Node 套件)     │
   │  + twstock      │     │                 │
   │  (即時補強)      │     │                 │
   └────────┬────────┘     └────────┬────────┘
            │                       │
            └───────────┬───────────┘
                        │
                ┌───────▼────────┐
                │  Vercel KV     │
                │  (60s 快取)     │
                └────────────────┘

圖表：TradingView Advanced Chart Widget（直接 client-side embed，不過 API）
```

---

## 3. 觀察名單 Seed

### 3.1 台股（10 檔）

| 代號 | 名稱 | 類型 |
|---|---|---|
| 0050 | 元大台灣 50 | ETF |
| 00878 | 國泰永續高股息 | ETF |
| 2330 | 台積電 | 個股 |
| 8033 | 雷虎 | 個股 |
| 3491 | 昇達科 | 個股 |
| 2368 | 金像電 | 個股 |
| 2313 | 華通 | 個股 |
| 8299 | 群聯 | 個股 |
| 3260 | 威剛 | 個股 |
| 6285 | 啟碁 | 個股 |

### 3.2 美股（8 檔）

| 代號 | 名稱 | 類型 |
|---|---|---|
| MU | Micron 美光 | 個股 |
| TSM | TSMC ADR 台積電 | 個股 |
| AAPL | Apple 蘋果 | 個股 |
| GOOGL | Alphabet A 谷歌 | 個股 |
| SPY | S&P 500 ETF | ETF |
| RKLB | Rocket Lab | 個股 |
| ONDS | Ondas Holdings | 個股 |
| RCAT | Red Cat Holdings | 個股 |

### 3.3 全球指數（頂部常駐列）

| 代號 | 顯示名稱 | 來源 |
|---|---|---|
| TAIEX | 加權指數 | FinMind |
| OTC | 櫃買指數 | FinMind |
| ^GSPC | S&P 500 | yahoo-finance2 |
| ^IXIC | 納斯達克 | yahoo-finance2 |
| ^DJI | 道瓊 | yahoo-finance2 |
| ^SOX | 費城半導體 | yahoo-finance2 |
| ^VIX | VIX 恐慌指數 | yahoo-finance2 |
| DX-Y.NYB | 美元指數 | yahoo-finance2 |

---

## 4. 佈局設計（桌機 1440px+）

```
┌──────────────────────────────────────────────────────────────────────────┐
│ [搜尋框 2330/NVDA] [📊 加權 38932 +3.23%] [S&P +0.5%] [VIX 14.2] ...     │  60px
├────────────┬─────────────────────────────────────┬───────────────────────┤
│            │  台積電 (2330) ｜ TWSE              │  最近 10 個工作天      │
│ Watchlist  │  ─────────────────────────────────  │  ───────────────────  │
│ 282px      │  NT$ 2,185.00  +105.00 (+5.05%)    │  日期    收  日%  累%  │
│            │  ┌─────────────────────────────┐    │  04/24  2185 +5.0 +8.3│
│ ─ 台股 ─    │  │                             │    │  04/23  2080 -1.2 +3.0│
│ ★0050      │  │   TradingView Advanced      │    │  04/22  2105 +0.5 +4.3│
│   89.95    │  │   Chart Widget (K線)         │    │  ...                 │
│   +4.17%   │  │   日K / 週K / 月K            │    │                      │
│ ★2330      │  │   MA / 布林 / RSI / MACD     │    │  368px               │
│  2185.00   │  │                             │    ├───────────────────────┤
│  +5.05% ●  │  └─────────────────────────────┘    │  基本面               │
│ ★8033      │                                     │  ───────────────────  │
│   154.50   │  指標切換：[MA][布林][RSI][MACD]    │  PE       22.5x      │
│   -3.13%   │                                     │  PB       4.8x       │
│ ...        │                                     │  ROE      31.2%      │
│            │                                     │  EPS      NT$54.7    │
│ ─ 美股 ─    │                                     │  殖利率   1.8%       │
│ ★MU        │                                     │  毛利率   53.4%      │
│ ★TSM       │                                     │  營收年增 +25.7%     │
│ ★AAPL      │                                     │  Beta     1.05       │
│ ★GOOGL ●   │                                     │  市值     56.7T      │
│ ...        │                                     │                      │
│            │                                     │                      │
│ [+ 新增]   │                                     │                      │
│ [⚙ 編輯]   │                                     │                      │
└────────────┴─────────────────────────────────────┴───────────────────────┘

● = 選中（highlight）
★ = 已加入 watchlist
```

### 4.1 互動規格

- **點 watchlist 任一檔**：中、右整片切換（client-side state，不換 URL）
- **頂部搜尋框**：輸入代號 + Enter，臨時切換查詢（不加進 watchlist）
- **+ 新增**：彈窗輸入代號，自動偵測台股 / 美股，加入 localStorage
- **⚙ 編輯**：拖曳排序 / 刪除 watchlist 項目
- **配色規則**：
  - 台股：紅漲綠跌（台灣習慣）
  - 美股：綠漲紅跌（美國習慣）
  - 由 `market` 欄位驅動，不寫死

### 4.2 響應式策略

- 1280px 以下：右側欄位收進 tab（10 天 / 基本面 切換）
- 1024px 以下：顯示「請用桌機開啟」訊息
- **不做手機版**

---

## 5. API 規劃

### 5.1 Route Handlers（`app/api/`）

| 路由 | 方法 | 用途 | 來源 | 快取 |
|---|---|---|---|---|
| `/api/tw/quote/[symbol]` | GET | 台股即時報價 | twstock | 30s |
| `/api/tw/daily/[symbol]?days=10` | GET | 台股日線歷史 | FinMind | 5min |
| `/api/tw/fundamental/[symbol]` | GET | 台股基本面 | FinMind | 1day |
| `/api/us/quote/[symbol]` | GET | 美股即時報價 | yahoo-finance2 | 30s |
| `/api/us/daily/[symbol]?days=10` | GET | 美股日線 | yahoo-finance2 | 5min |
| `/api/us/fundamental/[symbol]` | GET | 美股基本面 | yahoo-finance2 | 1day |
| `/api/index/global` | GET | 全球指數一次拉 | 混合 | 60s |

### 5.2 統一回傳格式

```ts
// /api/{tw,us}/daily/[symbol]?days=10
{
  symbol: "2330",
  market: "TW" | "US",
  name: "台積電",
  rows: [
    { date: "2026-04-24", close: 2185, change: 105,  change_pct: 5.05 },
    { date: "2026-04-23", close: 2080, change: -25,  change_pct: -1.19 },
    // ...10 筆
  ],
  cumulative_pct: 8.31,  // 從第一筆到最後一筆
  base_close: 2017       // rows[0] 前一天，用來算 row[0] 的 daily change
}
```

### 5.3 環境變數

```bash
# .env.local
FINMIND_TOKEN=             # FinMind 登入後拿，免費版每日 600 次
KV_URL=                    # Vercel KV（自動生成）
KV_REST_API_TOKEN=
KV_REST_API_READ_ONLY_TOKEN=
```

---

## 6. 資料 Schema（前端 store）

```ts
// lib/types.ts
export type Market = "TW" | "US";

export interface WatchlistItem {
  symbol: string;       // "2330" | "AAPL"
  name: string;         // "台積電" | "Apple"
  market: Market;
  order: number;        // 拖曳排序
  added_at: string;     // ISO date
}

export interface Quote {
  symbol: string;
  market: Market;
  name: string;
  price: number;
  change: number;
  change_pct: number;
  open: number;
  high: number;
  low: number;
  volume: number;
  market_cap?: number;
  updated_at: string;
}

export interface DailyRow {
  date: string;
  close: number;
  change: number;
  change_pct: number;
}

export interface Fundamental {
  pe?: number;
  forward_pe?: number;
  pb?: number;
  roe?: number;
  eps?: number;
  dividend_yield?: number;
  gross_margin?: number;
  revenue_yoy?: number;
  beta?: number;
  market_cap?: number;
}
```

---

## 7. Phase 任務拆解

### Phase 0：環境與骨架（半天）

- [ ] `npx create-next-app@latest stockview-personal --ts --tailwind --app`
- [ ] 安裝 shadcn/ui，初始化主題（深色為主）
- [ ] 建立資料夾結構：`app/`、`components/`、`lib/`、`types/`
- [ ] 寫 `lib/watchlist-seed.ts`（把上面 18 檔塞進去）
- [ ] 寫 `lib/storage.ts`：localStorage 讀寫 watchlist、首次載入時用 seed
- [ ] 設定 Git，建 GitHub Repo（依 CLAUDE.md：Public、用 `gh` CLI）
- [ ] 部署到 Vercel，確認 hello world 起得來

**驗收**：開瀏覽器看到空白 dashboard 殼 + watchlist 已從 seed 顯示在左側

### Phase 1：資料層 + 報價（1.5 天）

- [ ] 申請 FinMind token，存 `.env.local`
- [ ] 安裝 `yahoo-finance2`、`finmind` (or 自寫 fetch)
- [ ] 實作 `/api/tw/quote/[symbol]`（先回 mock 測通）
- [ ] 實作 `/api/us/quote/[symbol]`
- [ ] 實作 `/api/index/global`
- [ ] 接 Vercel KV 做 60s 快取（API 內 wrapping 邏輯）
- [ ] 頂部指數列元件（`<IndexBar />`）：拉 `/api/index/global`，每 60s 重打
- [ ] Watchlist 各列顯示即時報價（每 60s 重打）

**驗收**：頂部指數正常跳動，watchlist 每檔顯示當前價 + 漲幅

### Phase 2：10 天收盤表（半天，**最高頻需求**）

- [ ] 實作 `/api/tw/daily/[symbol]?days=10`
- [ ] 實作 `/api/us/daily/[symbol]?days=10`
- [ ] `<TenDayTable />` 元件：日期 / 收盤 / 日%/ 累% 四欄
- [ ] 紅綠配色（依 market）
- [ ] 累積漲幅計算：`(rows[last].close - rows[0].close) / rows[0].close`
- [ ] 點選 watchlist → 切換股票 → 表格自動換

**驗收**：點任一檔，右上立刻看到該股最近 10 工作天的收盤+漲幅

### Phase 3：TradingView 圖表 + 中間詳細頁（1 天）

- [ ] `npm i react-ts-tradingview-widgets`
- [ ] `<StockDetail />` 元件：價格大字、即時漲跌、開高低成交量
- [ ] 嵌入 TradingView Advanced Chart Widget
  - 台股 symbol 格式：`TWSE:2330`、`TPEX:8299`
  - 美股 symbol 格式：`NASDAQ:AAPL`、`NYSE:TSM`
- [ ] 指標切換按鈕：MA / 布林 / RSI / MACD（widget 參數）
- [ ] 切股票時 widget 不重 mount（用 `key` 控制）

**驗收**：點 watchlist 任一檔，中間出現該股 K 線、可切指標

### Phase 4：基本面卡片（1 天）

- [ ] 實作 `/api/tw/fundamental/[symbol]`：FinMind 財報資料
- [ ] 實作 `/api/us/fundamental/[symbol]`：yahoo-finance2 quoteSummary
- [ ] `<FundamentalCard />` 元件：PE / PB / ROE / EPS / 殖利率 / 毛利率 / 營收 YoY / Beta / 市值
- [ ] 缺值顯示 `—`
- [ ] 1 day 快取（基本面變動慢）

**驗收**：右下基本面卡片顯示 9 項指標

### Phase 5：Watchlist 編輯 + 搜尋（1 天）

- [ ] 「+ 新增」彈窗：輸入代號 → 自動偵測市場 → 驗證有效 → 寫入 localStorage
- [ ] 「⚙ 編輯」模式：拖曳排序（dnd-kit）、刪除按鈕
- [ ] 頂部搜尋框：輸入代號 Enter → 臨時切換（不入 watchlist）
- [ ] 偵測邏輯：純 4-6 碼數字 → 台股；字母 → 美股；含 `.` → 國際

**驗收**：可以新增、刪除、排序 watchlist；搜尋框查得到沒在名單裡的股

### Phase 6（選配，之後再說）：價格警示

- 觸及條件：突破 N 日新高/低、跌破 MA20、漲停、跌停
- 通知：Telegram Bot（沿用 Kenji 既有 bot 基礎建設）
- 不在這次 MVP 範圍

---

## 8. 部署與成本

| 項目 | 方案 | 月費 |
|---|---|---|
| Hosting | Vercel Hobby | $0 |
| Vercel KV | 30k commands/month 免費額度 | $0 |
| FinMind | 免費版 600 calls/**hour** | $0 |
| Yahoo Finance | yahoo-finance2 套件免費 | $0 |
| TradingView Widget | 免費 embed | $0 |
| 網域 | 用 vercel.app 子網域即可 | $0 |
| **合計** | | **$0** |

**FinMind 額度估算（修正：免費 600/hour 不是 /day）**：
- 18 檔 × 每 5 分鐘輪詢 1 次 = 216 calls/hour，**直接走 FinMind 也夠**
- 但仍建議：報價走 twstock（無限流，更即時）、FinMind 用在歷史日線 + 基本面
- 實際 FinMind 呼叫：開盤一次 18 檔 + 滾動 5min 快取 ≈ 50 calls/hour，使用率 ~8%

---

## 9. 風險與備援

| 風險 | 影響 | 對策 |
|---|---|---|
| Yahoo Finance 被擋 | 美股報價斷 | 後端 try/catch，顯示「資料源異常」、保留上次值 |
| FinMind 免費額度撞牆 | 台股歷史/基本面斷 | 1 day 快取 + 升級 60 USD/year（夠便宜可接受） |
| TradingView widget 載入慢 | 圖表延遲 | Skeleton loading、widget 用 `next/dynamic` lazy load |
| 收盤後 vs 盤中價差 | 顯示混亂 | API 回傳加 `is_market_open` 欄位，UI 加「盤後」標籤 |
| 台股 4-6 碼代號衝突 | 搜尋誤判 | 內建已知 ETF 代號表（00xxx）優先比對 |

---

## 10. 檔案結構（Phase 0 結束時）

```
~/Documents/KJ-agent/stockview-personal/
├── app/
│   ├── api/
│   │   ├── tw/
│   │   │   ├── quote/[symbol]/route.ts
│   │   │   ├── daily/[symbol]/route.ts
│   │   │   └── fundamental/[symbol]/route.ts
│   │   ├── us/
│   │   │   ├── quote/[symbol]/route.ts
│   │   │   ├── daily/[symbol]/route.ts
│   │   │   └── fundamental/[symbol]/route.ts
│   │   └── index/global/route.ts
│   ├── layout.tsx
│   └── page.tsx                  # 主 dashboard
├── components/
│   ├── IndexBar.tsx
│   ├── Watchlist.tsx
│   ├── WatchlistItem.tsx
│   ├── StockDetail.tsx
│   ├── TradingViewChart.tsx
│   ├── TenDayTable.tsx
│   ├── FundamentalCard.tsx
│   └── SearchBox.tsx
├── lib/
│   ├── storage.ts                # localStorage 操作
│   ├── watchlist-seed.ts         # 初始 18 檔
│   ├── finmind.ts                # FinMind client
│   ├── yahoo.ts                  # yahoo-finance2 wrapper
│   ├── twstock.ts                # 即時報價
│   ├── kv-cache.ts               # Vercel KV 快取 wrapper
│   └── format.ts                 # 數字 / 百分比 / 日期格式化
├── types/
│   └── index.ts
├── .env.local.example
├── .gitignore
├── README.md
├── PLAN.md
├── next.config.js
├── tailwind.config.ts
└── package.json
```

---

## 11. README.md 必備區塊（依 CLAUDE.md 規範）

- 簡介：解決什麼問題（個人投資觀察名單儀表板）
- Stack：Next.js 14 / TypeScript / shadcn/ui / TradingView / FinMind / yahoo-finance2
- Setup：`.env.local.example` 說明
- 啟動：`npm install && npm run dev`
- 測試：（Phase 1 之後補）

---

## 12. 後續擴充（不在 MVP 內）

- 多時間框架 K 線快速切換（1 分 / 5 分 / 1 小時 / 日 / 週 / 月）
- 三大法人買賣超（FinMind 有）
- 月營收公布日曆 + 自動高亮即將公布的個股
- 籌碼面：融資融券、外資持股率
- 警示通知（Phase 6）
- 多 layout 切換（密集模式 / 重點模式）
- 自定義技術指標（用 TradingView Lightweight Charts 自繪）

---

## 13. 開工前 checklist

- [ ] FinMind 免費帳號註冊，token 取得
- [ ] Vercel 帳號確認可登入（沿用既有）
- [ ] GitHub `gh auth status` 確認登入
- [ ] 確認專案資料夾建立完成

開工指令：

```bash
cd ~/Documents/KJ-agent/stockview-personal
npx create-next-app@latest . --ts --tailwind --app --no-src-dir --no-import-alias
npx shadcn@latest init
```
