import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ShoppingCart, Truck, Camera, AlertTriangle, Lightbulb } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useT } from "@/lib/i18n";
import { money, dateTime } from "@/lib/format";
import { AdviceCard } from "@/components/AdviceCard";
import { buildInsights, fetchAdvisor, sortInsights, visibleInsights } from "@/lib/advisor";
import { useAdviceSettings } from "@/lib/advice-settings";

export const Route = createFileRoute("/_authenticated/dashboard")({ component: Dashboard });

type Summary = {
  today_sales: number;
  today_sales_count: number;
  today_purchases: number;
  stock_value: number;
  product_count: number;
  low_stock: number;
  out_of_stock: number;
};

function Dashboard() {
  const { t, lang } = useT();
  const { settings } = useAdviceSettings();

  const advisor = useQuery({ queryKey: ["business-advisor"], queryFn: fetchAdvisor });
  const shopToday = visibleInsights(
    sortInsights(buildInsights(advisor.data, lang)),
    settings?.frequency ?? "daily",
    settings?.seenAt ?? null,
  ).slice(0, 3);

  const summary = useQuery({
    queryKey: ["dashboard-summary"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("dashboard_summary");
      if (error) throw error;
      return data as unknown as Summary;
    },
  });

  const low = useQuery({
    queryKey: ["low-stock-list"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("id, name, current_stock, min_stock_level")
        .eq("is_active", true)
        .order("current_stock")
        .limit(6);
      if (error) throw error;
      return (data ?? []).filter((p) => Number(p.current_stock) <= Number(p.min_stock_level));
    },
  });

  const recent = useQuery({
    queryKey: ["recent-sales"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sales")
        .select("id, total_amount, created_at, payment_method")
        .order("created_at", { ascending: false })
        .limit(5);
      if (error) throw error;
      return data ?? [];
    },
  });

  const s = summary.data;

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3">
        <Link to="/sales" className="col-span-2 flex items-center gap-3 rounded-3xl bg-primary p-5 text-primary-foreground shadow">
          <ShoppingCart className="h-8 w-8" />
          <span className="text-lg font-bold">{t("newSale")}</span>
        </Link>
        <Link to="/purchases" className="flex flex-col gap-2 rounded-3xl bg-secondary p-4 text-secondary-foreground">
          <Truck className="h-6 w-6" />
          <span className="font-semibold leading-tight">{t("receiveStock")}</span>
        </Link>
        <Link to="/more" className="flex flex-col gap-2 rounded-3xl bg-accent p-4 text-accent-foreground">
          <Camera className="h-6 w-6" />
          <span className="font-semibold leading-tight">{t("takePhoto")}</span>
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Stat label={t("todaySales")} value={money(s?.today_sales ?? 0)} />
        <Stat label={t("todayPurchases")} value={money(s?.today_purchases ?? 0)} />
        <Stat label={t("stockValue")} value={money(s?.stock_value ?? 0)} />
        <Stat label={t("products")} value={String(s?.product_count ?? 0)} />
      </div>

      <section className="rounded-3xl border bg-card p-4">
        <h2 className="flex items-center gap-2 font-bold">
          <AlertTriangle className="h-5 w-5 text-warning" />
          {t("lowStock")}
        </h2>
        <ul className="mt-3 space-y-2">
          {(low.data ?? []).map((p) => (
            <li key={p.id} className="flex items-center justify-between rounded-xl bg-muted px-3 py-2 text-sm">
              <span className="font-medium">{p.name}</span>
              <span className={Number(p.current_stock) <= 0 ? "text-destructive" : "text-warning-foreground"}>
                {p.current_stock} / {p.min_stock_level}
              </span>
            </li>
          ))}
          {low.data?.length === 0 && <li className="text-sm text-muted-foreground">{t("none")}</li>}
        </ul>
      </section>

      <section className="rounded-3xl border bg-card p-4">
        <h2 className="font-bold">{t("recentSales")}</h2>
        <ul className="mt-3 space-y-2">
          {(recent.data ?? []).map((r) => (
            <li key={r.id} className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">{dateTime(r.created_at)}</span>
              <span className="font-semibold">{money(r.total_amount)}</span>
            </li>
          ))}
          {recent.data?.length === 0 && <li className="text-sm text-muted-foreground">{t("none")}</li>}
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