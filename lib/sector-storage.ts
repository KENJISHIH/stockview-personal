import type { SectorGroup, SectorMember, SectorTemplate } from "@/types";

const KEY = "stockview.sectors.v1";

function isBrowser(): boolean {
  return typeof window !== "undefined";
}

function uuid(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `g_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function memberKey(m: { symbol: string; market: string }): string {
  return `${m.market}:${m.symbol}`;
}

export function loadSectors(): SectorGroup[] {
  if (!isBrowser()) return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as SectorGroup[];
    return parsed.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  } catch {
    return [];
  }
}

function persist(groups: SectorGroup[]): void {
  if (!isBrowser()) return;
  window.localStorage.setItem(KEY, JSON.stringify(groups));
}

export function createGroup(name: string, members: SectorMember[] = [], templateId?: string): SectorGroup {
  const groups = loadSectors();
  const now = new Date().toISOString();
  const next: SectorGroup = {
    id: uuid(),
    name: name.trim() || "未命名群組",
    members,
    templateId,
    createdAt: now,
    updatedAt: now,
  };
  persist([...groups, next]);
  return next;
}

export function deleteGroup(id: string): void {
  persist(loadSectors().filter((g) => g.id !== id));
}

export function renameGroup(id: string, name: string): void {
  const groups = loadSectors().map((g) =>
    g.id === id ? { ...g, name: name.trim() || g.name, updatedAt: new Date().toISOString() } : g
  );
  persist(groups);
}

export function addMember(groupId: string, member: SectorMember): SectorGroup | null {
  const groups = loadSectors();
  const target = groups.find((g) => g.id === groupId);
  if (!target) return null;
  if (target.members.some((m) => memberKey(m) === memberKey(member))) return target;
  const updated: SectorGroup = {
    ...target,
    members: [...target.members, member],
    updatedAt: new Date().toISOString(),
  };
  persist(groups.map((g) => (g.id === groupId ? updated : g)));
  return updated;
}

export function removeMember(groupId: string, symbol: string, market: string): SectorGroup | null {
  const groups = loadSectors();
  const target = groups.find((g) => g.id === groupId);
  if (!target) return null;
  const updated: SectorGroup = {
    ...target,
    members: target.members.filter((m) => !(m.symbol === symbol && m.market === market)),
    updatedAt: new Date().toISOString(),
  };
  persist(groups.map((g) => (g.id === groupId ? updated : g)));
  return updated;
}

export function applyTemplate(template: SectorTemplate): SectorGroup {
  const existing = loadSectors().find((g) => g.templateId === template.id);
  if (existing) return existing;
  return createGroup(template.name, template.members, template.id);
}
