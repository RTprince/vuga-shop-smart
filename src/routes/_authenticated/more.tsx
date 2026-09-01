import { createFileRoute, Link } from "@tanstack/react-router";
import { useQueryClient, useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { Lightbulb, HandCoins, Receipt, BarChart3 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useT } from "@/lib/i18n";
import { useAuth, useCan, signOutEverywhere } from "@/lib/auth";
import { ADVICE_FREQUENCIES, useAdviceSettings } from "@/lib/advice-settings";

export const Route = createFileRoute("/_authenticated/more")({ component: MorePage });

function MorePage() {
  const { t, lang } = useT();
  const { membership } = useAuth();
  const can = useCan();
  const queryClient = useQueryClient();
  const { settings, setFrequency } = useAdviceSettings();

  const seed = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.rpc("seed_demo_data");
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(t("saved"));
      void queryClient.invalidateQueries();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-4">
      <section className="rounded-3xl border bg-card p-4">
        <h2 className="font-bold">{membership?.business.name}</h2>
        <p className="text-sm text-muted-foreground">{membership?.business.phone ?? ""}</p>
        <p className="mt-1 text-sm text-muted-foreground">{can.role ? t(can.role) : ""}</p>
      </section>

      <nav className="grid grid-cols-2 gap-3">
        {[
          { to: "/debtors" as const, icon: HandCoins, rw: "Imyenda", en: "Debtors" },
          { to: "/expenses" as const, icon: Receipt, rw: "Ibyakoreshejwe", en: "Expenses" },
          { to: "/reports" as const, icon: BarChart3, rw: "Raporo", en: "Reports" },
        ].map((item) => (
          <Link
            key={item.to}
            to={item.to}
            className="flex flex-col gap-2 rounded-3xl border bg-card p-4 font-semibold"
          >
            <item.icon className="h-5 w-5 text-primary" />
            {lang === "rw" ? item.rw : item.en}
          </Link>
        ))}
      </nav>

      <Link
        to="/advisor"
        className="flex items-center gap-3 rounded-3xl border bg-card p-4 font-semibold"
      >
        <Lightbulb className="h-5 w-5 text-primary" />
        {t("advisor")}
      </Link>

      <section className="rounded-3xl border bg-card p-4">
        <h3 className="font-bold">{t("adviceFrequency")}</h3>
        <div className="mt-3 grid grid-cols-2 gap-2">
          {ADVICE_FREQUENCIES.map((f) => {
            const active = (settings?.frequency ?? "daily") === f;
            return (
              <button
                key={f}
                type="button"
                onClick={() => setFrequency.mutate(f)}
                className={`h-12 rounded-2xl border text-sm font-semibold ${active ? "border-primary bg-primary text-primary-foreground" : "bg-background"}`}
              >
                {t(f)}
              </button>
            );
          })}
        </div>
      </section>

      {can.manageProducts && (
        <Button variant="outline" className="h-14 w-full" disabled={seed.isPending} onClick={() => seed.mutate()}>
          {t("importNow")}
        </Button>
      )}

      <Button variant="ghost" className="h-14 w-full" onClick={() => void signOutEverywhere(queryClient)}>
        {t("signOut")}
      </Button>
    </div>
  );
}