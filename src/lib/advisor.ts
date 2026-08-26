/**
 * Business Advisor.
 *
 * All numbers come from the `business_advisor()` Postgres function, which reads
 * real sales, sale_items, products and stock data for the current business.
 * This module only turns those numbers into short sentences — it never invents
 * data. When a metric is missing, the related advice is simply not shown.
 */
import { supabase } from "@/integrations/supabase/client";
import type { Lang } from "@/lib/i18n";
import { money, qty as fmtQty, shortDate } from "@/lib/format";

export type AdviceFrequency = "daily" | "weekly" | "monthly" | "off";

export type ProductRef = {
  id: string;
  name: string;
  unit?: string | null;
  current_stock?: number | null;
  qty_7d?: number | null;
  qty_30d?: number | null;
  days_left?: number | null;
  profit_30d?: number | null;
  revenue_30d?: number | null;
  tied_value?: number | null;
  last_sold_at?: string | null;
  min_stock_level?: number | null;
};

export type AdvisorData = {
  generated_at: string;
  sales_7d: number;
  sales_prev_7d: number;
  sales_count_7d: number;
  profit_30d: number;
  profit_prev_30d: number;
  revenue_30d: number;
  revenue_prev_30d: number;
  best_day: { day: string; amount: number } | null;
  best_seller: ProductRef | null;
  top_profit: ProductRef | null;
  profit_drop_driver: ProductRef | null;
  restock: ProductRef[];
  fast_movers: ProductRef[];
  stale: ProductRef[];
  out_of_stock: number;
  low_stock: number;
  critical_items: ProductRef[];
};

export type InsightTone = "good" | "warn" | "bad" | "neutral";

export type Insight = {
  id: string;
  kind:
    | "SALES_TREND"
    | "BEST_SELLER"
    | "RESTOCK"
    | "SLOW_STOCK"
    | "PROFIT_TREND"
    | "STRONG_PROFIT"
    | "BEST_DAY"
    | "CRITICAL_STOCK"
    | "NO_DATA";
  tone: InsightTone;
  /** Big number shown above the sentence (already formatted). */
  value?: string;
  title: string;
  detail: string;
  /** Short motivation chip, e.g. "Best Seller". */
  badge?: string;
  /** Critical warnings bypass the advice-frequency setting. */
  critical?: boolean;
};

export async function fetchAdvisor(): Promise<AdvisorData> {
  const { data, error } = await supabase.rpc("business_advisor");
  if (error) throw error;
  return data as unknown as AdvisorData;
}

const num = (v: unknown) => Number(v ?? 0);

function pct(now: number, before: number): number | null {
  if (!before) return null;
  return Math.round(((now - before) / Math.abs(before)) * 100);
}

type Copy = { rw: string; en: string };
const pick = (c: Copy, lang: Lang) => c[lang];

/** Turns real advisor numbers into short, low-literacy-friendly sentences. */
export function buildInsights(d: AdvisorData | undefined, lang: Lang): Insight[] {
  if (!d) return [];
  const out: Insight[] = [];

  // --- critical operational warnings (always shown) ---
  const critNames = (d.critical_items ?? []).slice(0, 3).map((p) => p.name).join(", ");
  if (num(d.out_of_stock) > 0) {
    out.push({
      id: "out-of-stock",
      kind: "CRITICAL_STOCK",
      tone: "bad",
      critical: true,
      value: String(num(d.out_of_stock)),
      title: pick({ rw: "Ibicuruzwa byashize", en: "Out of stock" }, lang),
      detail: pick(
        {
          rw: `Ibicuruzwa ${num(d.out_of_stock)} byarangiye mu bubiko. Ugomba kubigura vuba: ${critNames}.`,
          en: `${num(d.out_of_stock)} product(s) are finished. Buy them soon: ${critNames}.`,
        },
        lang,
      ),
      badge: pick({ rw: "Gura vuba", en: "Restock Soon" }, lang),
    });
  } else if (num(d.low_stock) > 0) {
    out.push({
      id: "low-stock",
      kind: "CRITICAL_STOCK",
      tone: "warn",
      critical: true,
      value: String(num(d.low_stock)),
      title: pick({ rw: "Bikeya mu bubiko", en: "Low stock" }, lang),
      detail: pick(
        {
          rw: `Ibicuruzwa ${num(d.low_stock)} biri hafi kurangira: ${critNames}.`,
          en: `${num(d.low_stock)} product(s) are almost finished: ${critNames}.`,
        },
        lang,
      ),
      badge: pick({ rw: "Gura vuba", en: "Restock Soon" }, lang),
    });
  }

  // --- sales trend ---
  const s7 = num(d.sales_7d);
  const sPrev = num(d.sales_prev_7d);
  const salesPct = pct(s7, sPrev);
  if (s7 > 0 || sPrev > 0) {
    const up = s7 >= sPrev;
    out.push({
      id: "sales-trend",
      kind: "SALES_TREND",
      tone: up ? "good" : "warn",
      value: money(s7),
      title: pick({ rw: "Igurisha ry'iki cyumweru", en: "Sales this week" }, lang),
      detail: up
        ? pick(
            {
              rw: `Igurisha ryawe ryazamutse${salesPct !== null ? ` na ${salesPct}%` : ""} ugereranyije n'icyumweru gishize (${money(sPrev)}).`,
              en: `Your sales are improving${salesPct !== null ? ` by ${salesPct}%` : ""} compared with last week (${money(sPrev)}).`,
            },
            lang,
          )
        : pick(
            {
              rw: `Igurisha ryawe ryagabanutse${salesPct !== null ? ` na ${Math.abs(salesPct)}%` : ""} ugereranyije n'icyumweru gishize (${money(sPrev)}).`,
              en: `Your sales went down${salesPct !== null ? ` by ${Math.abs(salesPct)}%` : ""} compared with last week (${money(sPrev)}).`,
            },
            lang,
          ),
      ...(up && sPrev > 0 ? { badge: pick({ rw: "Byiyongereye", en: "Sales Improved" }, lang) } : {}),
    });
  }

  // --- gross profit trend ---
  const p30 = num(d.profit_30d);
  const pPrev = num(d.profit_prev_30d);
  const profitPct = pct(p30, pPrev);
  if (p30 !== 0 || pPrev !== 0) {
    const up = p30 >= pPrev;
    const driver = d.profit_drop_driver;
    out.push({
      id: "profit-trend",
      kind: "PROFIT_TREND",
      tone: up ? "good" : "bad",
      value: money(p30),
      title: pick({ rw: "Inyungu y'ukwezi", en: "Gross profit this month" }, lang),
      detail: up
        ? pick(
            {
              rw: `Inyungu yawe yazamutse${profitPct !== null ? ` na ${profitPct}%` : ""} ugereranyije n'ukwezi gushize (${money(pPrev)}).`,
              en: `Your gross profit improved${profitPct !== null ? ` by ${profitPct}%` : ""} compared with last month (${money(pPrev)}).`,
            },
            lang,
          )
        : pick(
            {
              rw: `Inyungu yawe yagabanutse${profitPct !== null ? ` na ${Math.abs(profitPct)}%` : ""} (ukwezi gushize: ${money(pPrev)}).${driver ? ` Impamvu nyamukuru: ${driver.name} yatanze inyungu ya ${money(num(driver.profit_30d))}.` : ""}`,
              en: `Your gross profit decreased${profitPct !== null ? ` by ${Math.abs(profitPct)}%` : ""} (last month: ${money(pPrev)}).${driver ? ` The main reason is ${driver.name}, which returned ${money(num(driver.profit_30d))} profit.` : ""}`,
            },
            lang,
          ),
      ...(up && pPrev > 0 ? { badge: pick({ rw: "Inyungu yiyongereye", en: "Profit Improved" }, lang) } : {}),
    });
  }

  // --- best seller ---
  if (d.best_seller && num(d.best_seller.qty_7d) > 0) {
    const b = d.best_seller;
    out.push({
      id: "best-seller",
      kind: "BEST_SELLER",
      tone: "good",
      value: `${fmtQty(num(b.qty_7d))} ${b.unit ?? ""}`.trim(),
      title: b.name,
      detail: pick(
        {
          rw: `${b.name} nicyo kigurishwa cyane muri iki cyumweru (${fmtQty(num(b.qty_7d))} ${b.unit ?? ""}). Ibisigaye mu bubiko: ${fmtQty(num(b.current_stock))}.`,
          en: `${b.name} is selling quickly this week (${fmtQty(num(b.qty_7d))} ${b.unit ?? ""}). Stock left: ${fmtQty(num(b.current_stock))}.`,
        },
        lang,
      ),
      badge: pick({ rw: "Kigurishwa cyane", en: "Best Seller" }, lang),
    });
  }

  // --- restock ---
  const r = d.restock?.[0];
  if (r) {
    out.push({
      id: "restock",
      kind: "RESTOCK",
      tone: "warn",
      value: r.days_left != null ? `${fmtQty(num(r.days_left))}` : fmtQty(num(r.current_stock)),
      title: pick({ rw: "Bishobora gushira vuba", en: "May run out soon" }, lang),
      detail: pick(
        {
          rw: `${r.name} kigurishwa vuba. ${r.days_left != null ? `Gishobora gushira mu minsi ${fmtQty(num(r.days_left))}.` : ""} Tekereza kongera ububiko.`,
          en: `${r.name} is selling quickly.${r.days_left != null ? ` It may run out in ${fmtQty(num(r.days_left))} days.` : ""} You may need to restock soon.`,
        },
        lang,
      ),
      badge: pick({ rw: "Gura vuba", en: "Restock Soon" }, lang),
    });
  }

  // --- slow stock ---
  const st = d.stale?.[0];
  if (st) {
    out.push({
      id: "slow-stock",
      kind: "SLOW_STOCK",
      tone: "warn",
      value: money(num(st.tied_value)),
      title: pick({ rw: "Ibidagurishwa", en: "Slow stock" }, lang),
      detail: pick(
        {
          rw: `${st.name} ntikiragurishwa mu minsi 30. Amafaranga ${money(num(st.tied_value))} ari mu bubiko budakora.`,
          en: `${st.name} has not moved for 30 days. ${money(num(st.tied_value))} of your money is tied up in slow stock.`,
        },
        lang,
      ),
      badge: pick({ rw: "Bidagenda", en: "Slow Stock" }, lang),
    });
  }

  // --- strongest profit product ---
  if (d.top_profit && num(d.top_profit.profit_30d) > 0) {
    const tp = d.top_profit;
    out.push({
      id: "top-profit",
      kind: "STRONG_PROFIT",
      tone: "good",
      value: money(num(tp.profit_30d)),
      title: tp.name,
      detail: pick(
        {
          rw: `${tp.name} gitanga inyungu nziza: ${money(num(tp.profit_30d))} mu minsi 30.`,
          en: `${tp.name} generates strong gross profit: ${money(num(tp.profit_30d))} in the last 30 days.`,
        },
        lang,
      ),
      badge: pick({ rw: "Inyungu nziza", en: "Strong Profit Product" }, lang),
    });
  }

  // --- best sales day ---
  if (d.best_day) {
    out.push({
      id: "best-day",
      kind: "BEST_DAY",
      tone: "good",
      value: money(num(d.best_day.amount)),
      title: pick({ rw: "Umunsi wagurishijeho cyane", en: "Best sales day" }, lang),
      detail: pick(
        {
          rw: `Ku ${shortDate(d.best_day.day)} wagurishije ${money(num(d.best_day.amount))}. Ni wo munsi mwiza mu minsi 30.`,
          en: `On ${shortDate(d.best_day.day)} you sold ${money(num(d.best_day.amount))} — your best day in 30 days.`,
        },
        lang,
      ),
      badge: pick({ rw: "Umunsi mwiza", en: "Best Sales Day" }, lang),
    });
  }

  if (out.length === 0) {
    out.push({
      id: "no-data",
      kind: "NO_DATA",
      tone: "neutral",
      title: pick({ rw: "Nta makuru ahagije", en: "Not enough data yet" }, lang),
      detail: pick(
        {
          rw: "Andika amagurisha n'ibyaguzwe kugira ngo tuguhe inama zishingiye ku bucuruzi bwawe.",
          en: "Record some sales and purchases and we will start giving advice based on your real numbers.",
        },
        lang,
      ),
    });
  }

  return out;
}

const ORDER: Record<Insight["kind"], number> = {
  CRITICAL_STOCK: 0,
  SALES_TREND: 1,
  PROFIT_TREND: 2,
  RESTOCK: 3,
  BEST_SELLER: 4,
  SLOW_STOCK: 5,
  STRONG_PROFIT: 6,
  BEST_DAY: 7,
  NO_DATA: 8,
};

export function sortInsights(list: Insight[]): Insight[] {
  return [...list].sort((a, b) => ORDER[a.kind] - ORDER[b.kind]);
}

const MS = { daily: 24 * 3600e3, weekly: 7 * 24 * 3600e3, monthly: 30 * 24 * 3600e3 };

/**
 * Frequency gate: normal advice is shown only when the chosen interval has
 * passed since the user last acknowledged advice. Critical warnings always show.
 */
export function isAdviceDue(frequency: AdviceFrequency, seenAt: string | null): boolean {
  if (frequency === "off") return false;
  if (!seenAt) return true;
  const elapsed = Date.now() - new Date(seenAt).getTime();
  return elapsed >= MS[frequency];
}

export function visibleInsights(
  list: Insight[],
  frequency: AdviceFrequency,
  seenAt: string | null,
): Insight[] {
  const due = isAdviceDue(frequency, seenAt);
  return due ? list : list.filter((i) => i.critical);
}
