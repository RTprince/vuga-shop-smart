import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useT } from "@/lib/i18n";
import { money, qty as fmtQty, shortDate } from "@/lib/format";
import { AdviceCard } from "@/components/AdviceCard";
import { buildInsights, fetchAdvisor, sortInsights } from "@/lib/advisor";
import { useAdviceSettings } from "@/lib/advice-settings";

export const Route = createFileRoute("/_authenticated/advisor")({
  component: AdvisorPage,
  head: () => ({
    meta: [
      { title: "Business Advisor | RTFlow" },
      {
        name: "description",
        content: "Simple, data-based advice about your shop's sales, profit and stock.",
      },
      { property: "og:title", content: "Business Advisor | RTFlow" },
      { property: "og:description", content: "Simple, data-based advice about your shop's sales, profit and stock." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

function AdvisorPage() {
  const { t, lang } = useT();
  const { markSeen } = useAdviceSettings();

  const advisor = useQuery({ queryKey: ["business-advisor"], queryFn: fetchAdvisor });
  const insights = sortInsights(buildInsights(advisor.data, lang));
  const d = advisor.data;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">{t("advisor")}</h1>
        <Button variant="ghost" size="icon" aria-label={t("refresh")} onClick={() => void advisor.refetch()}>
          <RefreshCw className={`h-5 w-5 ${advisor.isFetching ? "animate-spin" : ""}`} />
        </Button>
      </div>

      {advisor.isLoading && (
        <div className="flex justify-center py-10">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      )}

      {d && (
        <div className="grid grid-cols-2 gap-3">
          <Big label={t("soldThisWeek")} value={money(d.sales_7d)} />
          <Big label={t("lastWeek")} value={money(d.sales_prev_7d)} />
          <Big label={t("grossProfit30")} value={money(d.profit_30d)} />
          <Big label={t("lastMonth")} value={money(d.profit_prev_30d)} />
        </div>
      )}

      <div className="space-y-3">
        {insights.map((i) => (
          <AdviceCard key={i.id} insight={i} />
        ))}
      </div>

      {d && d.fast_movers.length > 0 && (
        <section className="rounded-3xl border bg-card p-4">
          <h2 className="font-bold">{t("fastMovers")}</h2>
          <ul className="mt-2 space-y-1 text-sm">
            {d.fast_movers.map((p) => (
              <li key={p.id} className="flex justify-between">
                <span className="truncate">{p.name}</span>
                <span className="font-semibold">
                  {fmtQty(Number(p.qty_7d ?? 0))} {p.unit ?? ""}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {d && d.stale.length > 0 && (
        <section className="rounded-3xl border bg-card p-4">
          <h2 className="font-bold">{t("notSelling")}</h2>
          <ul className="mt-2 space-y-1 text-sm">
            {d.stale.map((p) => (
              <li key={p.id} className="flex justify-between gap-2">
                <span className="truncate">{p.name}</span>
                <span className="text-muted-foreground">
                  {money(Number(p.tied_value ?? 0))}
                  {p.last_sold_at ? ` · ${shortDate(p.last_sold_at)}` : ""}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {d && (
        <Button variant="outline" className="h-12 w-full" onClick={() => markSeen.mutate()}>
          {t("adviceSeen")}
        </Button>
      )}
    </div>
  );
}

function Big({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border bg-card p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-lg font-bold">{value}</p>
    </div>
  );
}
