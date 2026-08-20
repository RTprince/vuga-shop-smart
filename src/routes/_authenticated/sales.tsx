import * as React from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { Minus, Plus, Search } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useT } from "@/lib/i18n";
import { money, qty } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/sales")({ component: SalesPage });

type Line = { product_id: string; name: string; unit_price: number; quantity: number };

function SalesPage() {
  const { t } = useT();
  const queryClient = useQueryClient();
  const [term, setTerm] = React.useState("");
  const [lines, setLines] = React.useState<Line[]>([]);

  const products = useQuery({
    queryKey: ["pos-products", term],
    queryFn: async () => {
      let q = supabase
        .from("products")
        .select("id, name, selling_price, current_stock, unit")
        .eq("is_active", true)
        .order("times_sold", { ascending: false })
        .limit(24);
      if (term.trim()) q = q.ilike("name", `%${term.trim()}%`);
      const { data, error } = await q;
      if (error) throw error;
      return data ?? [];
    },
  });

  function add(p: { id: string; name: string; selling_price: number }) {
    setLines((prev) => {
      const found = prev.find((l) => l.product_id === p.id);
      if (found) return prev.map((l) => (l.product_id === p.id ? { ...l, quantity: l.quantity + 1 } : l));
      return [...prev, { product_id: p.id, name: p.name, unit_price: Number(p.selling_price), quantity: 1 }];
    });
  }

  function bump(id: string, delta: number) {
    setLines((prev) =>
      prev
        .map((l) => (l.product_id === id ? { ...l, quantity: l.quantity + delta } : l))
        .filter((l) => l.quantity > 0),
    );
  }

  const total = lines.reduce((sum, l) => sum + l.unit_price * l.quantity, 0);

  const checkout = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.rpc("create_sale", {
        p_items: lines.map((l) => ({ product_id: l.product_id, quantity: l.quantity, unit_price: l.unit_price })),
        p_payment_method: "CASH",
        p_source: "MANUAL",
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(t("saleDone"));
      setLines([]);
      void queryClient.invalidateQueries();
    },
    onError: (e: Error) =>
      toast.error(e.message.includes("INSUFFICIENT") ? t("insufficientStock") : e.message),
  });

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-3 top-3.5 h-5 w-5 text-muted-foreground" />
        <Input className="h-12 pl-10" placeholder={t("search")} value={term} onChange={(e) => setTerm(e.target.value)} />
      </div>

      <div className="grid grid-cols-2 gap-2">
        {(products.data ?? []).map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => add(p)}
            className="rounded-2xl border bg-card p-3 text-left active:scale-95"
          >
            <p className="text-sm font-semibold leading-tight">{p.name}</p>
            <p className="text-xs text-muted-foreground">
              {qty(p.current_stock)} {p.unit}
            </p>
            <p className="mt-1 font-bold">{money(p.selling_price)}</p>
          </button>
        ))}
      </div>

      {lines.length > 0 && (
        <div className="sticky bottom-20 space-y-2 rounded-3xl border bg-card p-4 shadow-lg">
          <p className="font-bold">{t("cart")}</p>
          {lines.map((l) => (
            <div key={l.product_id} className="flex items-center justify-between gap-2 text-sm">
              <span className="flex-1 truncate">{l.name}</span>
              <div className="flex items-center gap-1">
                <Button size="icon" variant="outline" className="h-9 w-9" onClick={() => bump(l.product_id, -1)}>
                  <Minus className="h-4 w-4" />
                </Button>
                <span className="w-6 text-center font-semibold">{l.quantity}</span>
                <Button size="icon" variant="outline" className="h-9 w-9" onClick={() => bump(l.product_id, 1)}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              <span className="w-24 text-right font-semibold">{money(l.unit_price * l.quantity)}</span>
            </div>
          ))}
          <div className="flex items-center justify-between border-t pt-2">
            <span className="font-semibold">{t("total")}</span>
            <span className="text-lg font-bold">{money(total)}</span>
          </div>
          <Button className="h-14 w-full text-base" disabled={checkout.isPending} onClick={() => checkout.mutate()}>
            {t("confirm")}
          </Button>
        </div>
      )}
    </div>
  );
}