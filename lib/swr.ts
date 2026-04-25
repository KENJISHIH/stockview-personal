"use client";

export const fetcher = async (url: string) => {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return r.json();
};

export const SWR_OPTS = {
  refreshInterval: 60_000, // 60 秒輪詢
  revalidateOnFocus: true,
  refreshWhenHidden: false, // 分頁不可見時不打 API（省 Yahoo 額度）
  dedupingInterval: 15_000,
};
