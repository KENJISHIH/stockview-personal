# StockView Personal

個人投資介面工具：桌機版的台美股觀察名單儀表板。

## 簡介

解決三個痛點：
1. 手機 App 切頁籤切到煩，個股要逐一點進去看
2. 技術面在 TradingView、基本面要去 Yahoo / Goodinfo，資訊散落
3.「最近 10 個工作天的收盤、每日漲幅、累積漲幅」這種快查 SaaS 做不到

設計為**桌機 only**（1440px+），單人單機、無登入、零成本。

## Stack

| 層 | 技術 |
|---|---|
| 框架 | Next.js 16 (App Router) + TypeScript |
| UI | shadcn/ui + Tailwind CSS v4 |
| 圖表 | TradingView Advanced Chart Widget（embed） |
| 台股資料 | FinMind（歷史/基本面）+ twstock（即時） |
| 美股資料 | yahoo-finance2（Node 套件） |
| 快取 | Vercel KV |
| Watchlist 儲存 | localStorage |
| 部署 | Vercel |

## Setup

```bash
cp .env.local.example .env.local
# 填入：
# FINMIND_TOKEN=...   FinMind 登入後取得（免費 600 calls/day）
# KV_URL=...          Vercel KV 自動生成
```

## 啟動

```bash
npm install
npm run dev    # http://localhost:3000
```

## 測試

```bash
npm run lint     # ESLint
npx tsc --noEmit # TypeScript 型別檢查
npm run build    # 生產 build
```

## Phase 進度

- [x] Phase 0：專案骨架 + 三欄佈局 + watchlist seed
- [ ] Phase 1：資料層 + 即時報價（FinMind / Yahoo Finance）
- [ ] Phase 2：10 天收盤 + 漲幅表
- [ ] Phase 3：TradingView K 線圖
- [ ] Phase 4：基本面卡片
- [ ] Phase 5：Watchlist 編輯 + 搜尋

詳細規劃見 `PLAN.md`。
