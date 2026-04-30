"use client";

import { useEffect, useMemo, useState } from "react";
import useSWR from "swr";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";
import { fetcher } from "@/lib/swr";
import {
  addMember as addMemberToStorage,
  applyTemplate,
  createGroup,
  deleteGroup,
  removeMember as removeMemberFromStorage,
  renameGroup,
} from "@/lib/sector-storage";
import { notifySectorsChanged, useSectors } from "@/lib/use-sectors";
import { SECTOR_TEMPLATES, findTemplatesContaining } from "@/lib/sector-templates";
import type { Market, PeerRow, SectorGroup } from "@/types";
import { detectMarket } from "@/lib/market-detect";
import { changeColorClass, formatPercent, formatPrice } from "@/lib/format";

interface SuggestedStock {
  symbol: string;
  market: Market;
  name: string;
}

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  /** 開啟時預選的群組 id（若提供且存在則優先採用） */
  initialGroupId?: string;
  /** 開啟時建議比對的股票（用來決定要進哪個群組或哪個模板） */
  suggestedStock?: SuggestedStock | null;
}

interface PeerCompareResp {
  rows: PeerRow[];
  updatedAt: string;
}

type SortKey = "pe" | "marketCap" | "changePct";

export function PeerCompareDialog({ open, onOpenChange, initialGroupId, suggestedStock }: Props) {
  const groups = useSectors();
  const [selectedId, setSelectedId] = useState<string | null>(initialGroupId ?? null);
  const [view, setView] = useState<"compare" | "manage" | "templates">("compare");
  const [sortKey, setSortKey] = useState<SortKey>("pe");

  // 開啟時決定要顯示哪一頁
  // 1) 有 initialGroupId 且該群組存在 → 開該群組比價
  // 2) 有 suggestedStock：
  //    a) 該股已在某群組 → 開那個群組
  //    b) 否則 → 開「套用模板」頁（讓使用者選一個含該股的模板）
  // 3) 沒提示，且既有 selectedId 仍有效 → 維持
  // 4) 沒提示也沒 selectedId → 第一個群組或 templates 頁
  useEffect(() => {
    if (!open) return;
    if (initialGroupId && groups.some((g) => g.id === initialGroupId)) {
      setSelectedId(initialGroupId);
      setView("compare");
      return;
    }
    if (suggestedStock) {
      const memberOf = groups.find((g) =>
        g.members.some(
          (m) => m.symbol === suggestedStock.symbol && m.market === suggestedStock.market
        )
      );
      if (memberOf) {
        setSelectedId(memberOf.id);
        setView("compare");
      } else {
        setView("templates");
      }
      return;
    }
    if (selectedId && groups.some((g) => g.id === selectedId)) return;
    if (groups.length > 0) {
      setSelectedId(groups[0].id);
      setView("compare");
    } else {
      setSelectedId(null);
      setView("templates");
    }
  }, [open, groups, initialGroupId, suggestedStock, selectedId]);

  const selected = groups.find((g) => g.id === selectedId) ?? null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="sm:max-w-4xl max-h-[90vh] overflow-y-auto"
      >
        <DialogHeader>
          <DialogTitle>同業比價</DialogTitle>
          <DialogDescription>
            把同產業股票放一組，用 P/E（本益比，股價 ÷ EPS）找誰相對便宜。
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-wrap items-center gap-2">
          <select
            className="rounded border border-border bg-background px-2 py-1 text-sm"
            value={selectedId ?? ""}
            onChange={(e) => {
              setSelectedId(e.target.value || null);
              setView("compare");
            }}
          >
            {groups.length === 0 && <option value="">（尚無群組）</option>}
            {groups.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name}（{g.members.length}）
              </option>
            ))}
          </select>

          <Button
            variant={view === "compare" ? "secondary" : "outline"}
            size="sm"
            onClick={() => setView("compare")}
            disabled={!selected}
          >
            📊 比價
          </Button>
          <Button
            variant={view === "manage" ? "secondary" : "outline"}
            size="sm"
            onClick={() => setView("manage")}
            disabled={!selected}
          >
            ⚙ 管理成員
          </Button>
          <Button
            variant={view === "templates" ? "secondary" : "outline"}
            size="sm"
            onClick={() => setView("templates")}
          >
            📚 套用模板 / 新群組
          </Button>
        </div>

        <Separator />

        {view === "compare" && selected && (
          <CompareView group={selected} sortKey={sortKey} onSortKeyChange={setSortKey} />
        )}
        {view === "manage" && selected && <ManageView group={selected} />}
        {view === "templates" && (
          <TemplatesView
            suggestedStock={suggestedStock ?? null}
            onApplied={(g) => {
              setSelectedId(g.id);
              setView("compare");
            }}
          />
        )}

        {!selected && view !== "templates" && (
          <p className="text-sm text-muted-foreground">尚無群組，先去「📚 套用模板 / 新群組」建立。</p>
        )}
      </DialogContent>
    </Dialog>
  );
}

function CompareView({
  group,
  sortKey,
  onSortKeyChange,
}: {
  group: SectorGroup;
  sortKey: SortKey;
  onSortKeyChange: (k: SortKey) => void;
}) {
  const itemsParam = group.members
    .map((m) => `${m.symbol}:${m.market}:${encodeURIComponent(m.name)}`)
    .join(",");
  const url =
    group.members.length > 0 ? `/api/peer-compare?items=${itemsParam}` : null;
  const { data, isLoading, error } = useSWR<PeerCompareResp>(url, fetcher, {
    refreshInterval: 5 * 60 * 1000,
    revalidateOnFocus: true,
    dedupingInterval: 60 * 1000,
  });

  const rows = data?.rows ?? [];
  const validPe = rows
    .map((r) => r.pe)
    .filter((v): v is number => typeof v === "number" && Number.isFinite(v) && v > 0);
  const avgPe = validPe.length > 0 ? validPe.reduce((a, b) => a + b, 0) / validPe.length : null;
  const medianPe = validPe.length > 0 ? median(validPe) : null;

  const sorted = useMemo(() => {
    const copy = [...rows];
    copy.sort((a, b) => {
      const va = pickSortValue(a, sortKey);
      const vb = pickSortValue(b, sortKey);
      if (va === undefined && vb === undefined) return 0;
      if (va === undefined) return 1;
      if (vb === undefined) return -1;
      // P/E 由低到高，其他由高到低
      return sortKey === "pe" ? va - vb : vb - va;
    });
    return copy;
  }, [rows, sortKey]);

  if (group.members.length === 0) {
    return <p className="text-sm text-muted-foreground">這個群組還沒有成員，去「⚙ 管理成員」加股票。</p>;
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
        <span>💡 P/E 越低代表市場估值越保守。比較同產業才有意義。</span>
        <div className="flex items-center gap-2">
          <span>排序：</span>
          <select
            className="rounded border border-border bg-background px-2 py-0.5 text-xs"
            value={sortKey}
            onChange={(e) => onSortKeyChange(e.target.value as SortKey)}
          >
            <option value="pe">P/E 低 → 高</option>
            <option value="changePct">今日漲跌</option>
            <option value="marketCap">市值</option>
          </select>
        </div>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-12">#</TableHead>
            <TableHead>名稱</TableHead>
            <TableHead className="text-right">EPS (TTM)</TableHead>
            <TableHead className="text-right">現價</TableHead>
            <TableHead className="text-right">P/E</TableHead>
            <TableHead className="text-right">預估 P/E</TableHead>
            <TableHead className="text-right">今日</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sorted.map((r, i) => (
            <TableRow key={`${r.market}:${r.symbol}`}>
              <TableCell className="text-muted-foreground">{i + 1}</TableCell>
              <TableCell>
                <div className="flex flex-col">
                  <span className="font-medium">{r.name}</span>
                  <span className="text-xs text-muted-foreground">
                    {r.symbol} · {r.market}
                  </span>
                </div>
              </TableCell>
              <TableCell className="text-right font-mono">
                {fmtEps(r.eps, r.market)}
              </TableCell>
              <TableCell className="text-right font-mono">
                {formatPrice(r.price, r.market)}
              </TableCell>
              <TableCell className={`text-right font-mono ${peColor(r.pe, avgPe)}`}>
                {fmtPe(r.pe)}
              </TableCell>
              <TableCell className="text-right font-mono text-muted-foreground">
                {fmtPe(r.forwardPe)}
              </TableCell>
              <TableCell className={`text-right font-mono ${changeColorClass(r.changePct)}`}>
                {typeof r.changePct === "number" ? formatPercent(r.changePct) : "—"}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <div className="flex items-center justify-end gap-4 text-xs text-muted-foreground">
        {avgPe !== null && <span>群組平均 P/E：{avgPe.toFixed(1)}</span>}
        {medianPe !== null && <span>中位數：{medianPe.toFixed(1)}</span>}
        {data?.updatedAt && (
          <span>更新：{new Date(data.updatedAt).toLocaleTimeString("zh-TW", { hour12: false })}</span>
        )}
      </div>

      {isLoading && rows.length === 0 && (
        <p className="text-xs text-muted-foreground">載入中…</p>
      )}
      {error && <p className="text-xs text-red-500">資料讀取失敗</p>}
    </div>
  );
}

function ManageView({ group }: { group: SectorGroup }) {
  const [name, setName] = useState(group.name);
  const [input, setInput] = useState("");
  const [market, setMarket] = useState<Market>("TW");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setName(group.name);
  }, [group.id, group.name]);

  function handleInputChange(v: string) {
    setInput(v);
    setError(null);
    const detected = detectMarket(v);
    if (detected.symbol) setMarket(detected.market);
  }

  async function handleAdd() {
    setError(null);
    const detected = detectMarket(input);
    if (!detected.symbol) {
      setError("請輸入股票代號");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch(
        `/api/quote/${market}/${encodeURIComponent(detected.symbol)}`,
        { cache: "no-store" }
      );
      if (!res.ok) {
        setError("找不到此股票，確認代號 / 市場");
        return;
      }
      const data = (await res.json()) as { quote: { name: string } };
      addMemberToStorage(group.id, {
        symbol: detected.symbol,
        name: data.quote.name || detected.symbol,
        market,
      });
      notifySectorsChanged();
      setInput("");
    } catch {
      setError("驗證失敗，請稍後再試");
    } finally {
      setBusy(false);
    }
  }

  function handleRename() {
    const trimmed = name.trim();
    if (!trimmed || trimmed === group.name) return;
    renameGroup(group.id, trimmed);
    notifySectorsChanged();
  }

  function handleDelete() {
    if (!confirm(`確定刪除群組「${group.name}」？這不會影響你的觀察名單。`)) return;
    deleteGroup(group.id);
    notifySectorsChanged();
  }

  function handleRemove(symbol: string, market: Market) {
    removeMemberFromStorage(group.id, symbol, market);
    notifySectorsChanged();
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          onBlur={handleRename}
          className="max-w-xs"
        />
        <Button variant="outline" size="sm" onClick={handleRename}>
          重新命名
        </Button>
        <div className="flex-1" />
        <Button variant="outline" size="sm" onClick={handleDelete}>
          🗑 刪除群組
        </Button>
      </div>

      <div className="rounded border border-border p-3">
        <div className="mb-2 text-xs font-medium text-muted-foreground">新增成員</div>
        <div className="flex flex-wrap items-center gap-2">
          <Input
            placeholder="代號（例：3037、jp:7011、AAPL）"
            value={input}
            onChange={(e) => handleInputChange(e.target.value)}
            className="max-w-xs"
            onKeyDown={(e) => {
              if (e.key === "Enter") handleAdd();
            }}
          />
          {(["TW", "JP", "US"] as Market[]).map((m) => (
            <Button
              key={m}
              variant={market === m ? "secondary" : "outline"}
              size="sm"
              onClick={() => setMarket(m)}
            >
              {m === "TW" ? "台股" : m === "JP" ? "日股" : "美股"}
            </Button>
          ))}
          <Button size="sm" onClick={handleAdd} disabled={busy || !input.trim()}>
            {busy ? "驗證中…" : "加入"}
          </Button>
        </div>
        {error && <p className="mt-2 text-xs text-red-500">{error}</p>}
      </div>

      <div>
        <div className="mb-2 text-xs font-medium text-muted-foreground">
          目前成員（{group.members.length}）
        </div>
        {group.members.length === 0 ? (
          <p className="text-sm text-muted-foreground">尚無成員，從上方新增。</p>
        ) : (
          <div className="flex flex-col divide-y divide-border rounded border border-border">
            {group.members.map((m) => (
              <div key={`${m.market}:${m.symbol}`} className="flex items-center justify-between px-3 py-2 text-sm">
                <div>
                  <span className="font-medium">{m.name}</span>
                  <span className="ml-2 text-xs text-muted-foreground">
                    {m.symbol} · {m.market}
                  </span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-red-500"
                  onClick={() => handleRemove(m.symbol, m.market)}
                >
                  ✕ 移除
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function TemplatesView({
  suggestedStock,
  onApplied,
}: {
  suggestedStock: SuggestedStock | null;
  onApplied: (g: SectorGroup) => void;
}) {
  const [busy, setBusy] = useState<string | null>(null);
  const [customName, setCustomName] = useState("");
  const groups = useSectors();
  const appliedTemplateIds = new Set(groups.map((g) => g.templateId).filter(Boolean));

  const matchedTemplateIds = new Set(
    suggestedStock
      ? findTemplatesContaining(suggestedStock.symbol, suggestedStock.market).map((t) => t.id)
      : []
  );

  // 推薦的模板放最前面
  const sortedTemplates = [...SECTOR_TEMPLATES].sort((a, b) => {
    const am = matchedTemplateIds.has(a.id) ? 0 : 1;
    const bm = matchedTemplateIds.has(b.id) ? 0 : 1;
    return am - bm;
  });

  function handleApply(templateId: string) {
    const tpl = SECTOR_TEMPLATES.find((t) => t.id === templateId);
    if (!tpl) return;
    setBusy(templateId);
    const g = applyTemplate(tpl);
    notifySectorsChanged();
    setBusy(null);
    onApplied(g);
  }

  function handleCreateCustom() {
    const trimmed = customName.trim();
    if (!trimmed) return;
    const members = suggestedStock ? [suggestedStock] : [];
    const g = createGroup(trimmed, members);
    notifySectorsChanged();
    setCustomName("");
    onApplied(g);
  }

  return (
    <div className="flex flex-col gap-4">
      {suggestedStock && matchedTemplateIds.size === 0 && (
        <div className="rounded border border-amber-500/30 bg-amber-500/5 p-3 text-xs">
          <span className="font-medium">{suggestedStock.name}</span>{" "}
          <span className="text-muted-foreground">
            （{suggestedStock.symbol}）不在任何內建模板裡。可以底下「建立自訂群組」開一個新群組（會自動把這檔加進去）。
          </span>
        </div>
      )}
      {suggestedStock && matchedTemplateIds.size > 0 && (
        <div className="rounded border border-emerald-500/30 bg-emerald-500/5 p-3 text-xs">
          <span className="font-medium">{suggestedStock.name}</span>{" "}
          <span className="text-muted-foreground">
            （{suggestedStock.symbol}）內建在以下模板，按一鍵套用就能比同業：
          </span>
        </div>
      )}

      <div className="rounded border border-border p-3">
        <div className="mb-2 text-xs font-medium text-muted-foreground">建立自訂群組</div>
        <div className="flex items-center gap-2">
          <Input
            placeholder={
              suggestedStock
                ? `群組名稱（會把 ${suggestedStock.name} 加進去）`
                : "群組名稱（例：我的價值股）"
            }
            value={customName}
            onChange={(e) => setCustomName(e.target.value)}
            className="max-w-xs"
            onKeyDown={(e) => {
              if (e.key === "Enter") handleCreateCustom();
            }}
          />
          <Button size="sm" onClick={handleCreateCustom} disabled={!customName.trim()}>
            ＋ 建立
          </Button>
        </div>
      </div>

      <div>
        <div className="mb-2 text-xs font-medium text-muted-foreground">套用熱門產業模板</div>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {sortedTemplates.map((tpl) => {
            const applied = appliedTemplateIds.has(tpl.id);
            const matched = matchedTemplateIds.has(tpl.id);
            return (
              <div
                key={tpl.id}
                className={`rounded border p-3 ${
                  matched ? "border-emerald-500/50 bg-emerald-500/5" : "border-border"
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{tpl.name}</span>
                      {matched && (
                        <span className="rounded bg-emerald-500/20 px-1.5 py-0.5 text-[10px] text-emerald-700 dark:text-emerald-400">
                          含 {suggestedStock?.name}
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground">{tpl.description}</div>
                  </div>
                  <Button
                    variant={applied ? "outline" : matched ? "secondary" : "outline"}
                    size="sm"
                    disabled={busy === tpl.id || applied}
                    onClick={() => handleApply(tpl.id)}
                  >
                    {applied ? "已套用" : busy === tpl.id ? "..." : "一鍵套用"}
                  </Button>
                </div>
                <div className="mt-2 flex flex-wrap gap-1 text-xs text-muted-foreground">
                  {tpl.members.map((m) => {
                    const isSuggested =
                      suggestedStock &&
                      m.symbol === suggestedStock.symbol &&
                      m.market === suggestedStock.market;
                    return (
                      <span
                        key={`${m.market}:${m.symbol}`}
                        className={`rounded px-1.5 py-0.5 ${
                          isSuggested
                            ? "bg-emerald-500/20 font-medium text-emerald-700 dark:text-emerald-400"
                            : "bg-muted"
                        }`}
                      >
                        {m.name}
                      </span>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function pickSortValue(r: PeerRow, key: SortKey): number | undefined {
  const v = r[key];
  return typeof v === "number" && Number.isFinite(v) ? v : undefined;
}

function median(arr: number[]): number {
  const sorted = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

function fmtPe(v: number | undefined): string {
  if (typeof v !== "number" || !Number.isFinite(v) || v <= 0) return "—";
  return v.toFixed(1);
}

function fmtEps(v: number | undefined, market: Market): string {
  if (typeof v !== "number" || !Number.isFinite(v)) return "—";
  if (market === "TW") return v.toFixed(2);
  if (market === "JP") return `¥${v.toFixed(0)}`;
  return `$${v.toFixed(2)}`;
}

function peColor(v: number | undefined, avg: number | null): string {
  if (typeof v !== "number" || !Number.isFinite(v) || v <= 0 || avg === null) {
    return "text-muted-foreground";
  }
  // 用台股慣例：相對便宜 = 紅（漲），相對貴 = 綠（跌）— 與看跌偏好相符
  // 但 P/E 高低不是漲跌語意，這裡用中性配色：低=綠（便宜）、高=橘紅（貴）
  if (v < avg * 0.7) return "text-emerald-500 font-semibold";
  if (v > avg * 1.3) return "text-orange-500";
  return "";
}
