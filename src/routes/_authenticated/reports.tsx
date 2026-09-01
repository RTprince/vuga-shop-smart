import * as React from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowDownRight, ArrowUpRight, TrendingUp } from "lucide-react";
import { money } from "@/lib/format";
import { useT } from "@/lib/i18n";
import { fetchReport } from "@/lib/business";

export const Route = createFileRoute("/_authenticated/reports")({
  head: () => ({
    meta: [
      { title: "Raporo | RTFlow" },
      { name: "description", content: "Raporo y'ubucuruzi: igurisha, amafaranga yinjiye, ibyakoreshejwe n'inyungu." },
      { property: "og:title", content: "Raporo | RTFlow" },
      { property: "og:description", content: "Daily, weekly and monthly business reports in RTFlow." },
    ],
  }),
  component: ReportsPage,
});

const PERIODS = [
  { key: "day", rw: "Uyu munsi", en: "Today" },
  { key: "week", rw: "Iki cyumweru", en: "This week" },
  { key: "month", rw: "Uku kwezi", en: "This month" },
] as const;

function ReportsPage() {
  const { lang } = useT();
  const [period, setPeriod] = React.useState<"day" | "week" | "month">("day");
  const report = useQuery({ queryKey: ["business-report", period], queryFn: () => fetchReport(period) });
  const r = report.data;
  const rw = lang === "rw";

  const delta =
    r && Number(r.prev_sales_total) > 0
      ? Math.round(((Number(r.sales_total) - Number(r.prev_sales_total)) / Number(r.prev_sales_total)) * 100)
      : null;

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-3 gap-2">
        {PERIODS.map((p) => (
          <button
            key={p.key}
            type="button"
            onClick={() => setPeriod(p.key)}
            className={`h-11 rounded-2xl border text-sm font-semibold ${period === p.key ? "border-primary bg-primary text-primary-foreground" : "bg-background"}`}
          >
            {rw ? p.rw : p.en}
          </button>
        ))}
      </div>

      <section className="rounded-3xl bg-primary p-5 text-primary-foreground shadow">
        <p className="text-sm opacity-90">{rw ? "Igurisha" : "Sales"}</p>
        <p className="mt-1 text-4xl font-extrabold">{money(r?.sales_total ?? 0)}</p>
        {delta !== null && (
          <p className="mt-2 flex items-center gap-1 text-sm font-semibold">
            {delta >= 0 ? <ArrowUpRight className="h-4 w-4" /> : <ArrowDownRight className="h-4 w-4" />}
            {Math.abs(delta)}% {rw ? "ugereranyije n'igihe gishize" : "vs previous period"}
          </p>
        )}
      </section>

      <div className="grid grid-cols-2 gap-3">
        <Stat label={rw ? "Amafaranga yinjiye" : "Cash collected"} value={money(r?.collected ?? 0)} />
        <Stat label={rw ? "Byagurishijwe ku mwenda" : "Sold on credit"} value={money(r?.credit ?? 0)} />
        <Stat label={rw ? "Ibyaguzwe" : "Purchases"} value={money(r?.purchases ?? 0)} />
        <Stat label={rw ? "Ibyakoreshejwe" : "Expenses"} value={money(r?.expenses ?? 0)} />
      </div>

      <section className="rounded-3xl border bg-card p-5">
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <TrendingUp className="h-4 w-4 text-primary" />
          {rw ? "Inyungu (nyuma y'ibyakoreshejwe)" : "Profit after expenses"}
        </p>
        <p className="mt-1 text-3xl font-extrabold">
          {money(Number(r?.gross_profit ?? 0) - Number(r?.expenses ?? 0))}
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          {rw ? "Inyungu ku bicuruzwa" : "Gross margin on goods"}: {money(r?.gross_profit ?? 0)}
        </p>
      </section>

      <section className="rounded-3xl border bg-card p-4">
        <h2 className="font-bold">{rw ? "Ibicuruzwa bigenda cyane" : "Top products"}</h2>
        <ul className="mt-3 space-y-2 text-sm">
          {(r?.top_products ?? []).map((p) => (
            <li key={p.name} className="flex items-center justify-between">
              <span className="truncate">{p.name}</span>
              <span className="font-semibold">{money(p.revenue)}</span>
            </li>
          ))}
          {(r?.top_products ?? []).length === 0 && (
            <li className="text-muted-foreground">{rw ? "Nta bicuruzwa byagurishijwe" : "No sales yet"}</li>
          )}
        </ul>
      </section>

      <section className="rounded-3xl border bg-card p-4">
        <h2 className="font-bold">{rw ? "Ibyakoreshejwe mu byiciro" : "Expenses by category"}</h2>
        <ul className="mt-3 space-y-2 text-sm">
          {(r?.expenses_by_category ?? []).map((c) => (
            <li key={c.category} className="flex items-center justify-between">
              <span>{c.category}</span>
              <span className="font-semibold">{money(c.amount)}</span>
            </li>
          ))}
          {(r?.expenses_by_category ?? []).length === 0 && (
            <li className="text-muted-foreground">{rw ? "Nta kiguzi" : "None"}</li>
          )}
        </ul>
      </section>

      <section className="rounded-3xl border bg-card p-4">
        <h2 className="font-bold">{rw ? "Ibicuruzwa bidakora" : "Dead stock"}</h2>
        <ul className="mt-3 space-y-2 text-sm">
          {(r?.dead_stock ?? []).map((d) => (
            <li key={d.name} className="flex items-center justify-between">
              <span className="truncate">{d.name}</span>
              <span className="font-semibold">{money(d.tied_value)}</span>
            </li>
          ))}
          {(r?.dead_stock ?? []).length === 0 && (
            <li className="text-muted-foreground">{rw ? "Nta na kimwe" : "None"}</li>
          )}
        </ul>
      </section>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border bg-card p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-lg font-bold">{value}</p>
    </div>
  );
}
