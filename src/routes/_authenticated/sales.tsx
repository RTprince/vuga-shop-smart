import * as React from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { Loader2, Minus, Plus, Search } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useT } from "@/lib/i18n";
import { money, qty } from "@/lib/format";
import { createSale, newToken, toStockError, type PaymentMethod } from "@/lib/stock";

export const Route = createFileRoute("/_authenticated/sales")({ component: SalesPage });

type Line = { product_id: string; name: string; unit_price: number; quantity: number; available: number; unit: string };

const METHODS: PaymentMethod[] = ["CASH", "MOBILE_MONEY", "BANK", "OTHER"];

function SalesPage() {
  const { t } = useT();
  const queryClient = useQueryClient();
  const [term, setTerm] = React.useState("");
  const [lines, setLines] = React.useState<Line[]>([]);
  const [method, setMethod] = React.useState<PaymentMethod>("CASH");
  const [customer, setCustomer] = React.useState("");
  // One idempotency token per cart: retries/double submits collapse into one sale.
  const tokenRef = React.useRef(newToken());

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

  function add(p: { id: string; name: string; selling_price: number; current_stock: number; unit: string }) {
    setLines((prev) => {
      const found = prev.find((l) => l.product_id === p.id);
      const available = Number(p.current_stock);
      if (found) {
        if (found.quantity + 1 > available) {
          toast.error(`${t("insufficientStock")}: ${qty(available)} ${p.unit}`);
          return prev;
        }
        return prev.map((l) => (l.product_id === p.id ? { ...l, quantity: l.quantity + 1, available } : l));
      }
      if (available <= 0) {
        toast.error(t("outOfStockLabel"));
        return prev;
      }
      return [
        ...prev,
        {
          product_id: p.id,
          name: p.name,
          unit_price: Number(p.selling_price),
          quantity: 1,
          available,
          unit: p.unit,
        },
      ];
    });
  }

  function bump(id: string, delta: number) {
    setLines((prev) =>
      prev
        .map((l) => {
          if (l.product_id !== id) return l;
          const next = l.quantity + delta;
          if (next > l.available) {
            toast.error(`${t("insufficientStock")}: ${qty(l.available)} ${l.unit}`);
            return l;
          }
          return { ...l, quantity: next };
        })
        .filter((l) => l.quantity > 0),
    );
  }

  const total = lines.reduce((sum, l) => sum + l.unit_price * l.quantity, 0);

  const checkout = useMutation({
    mutationFn: async () =>
      createSale({
        items: lines.map((l) => ({ product_id: l.product_id, quantity: l.quantity, unit_price: l.unit_price })),
        paymentMethod: method,
        customerName: customer.trim() || null,
        source: "MANUAL",
        token: tokenRef.current,
      }),
    onSuccess: () => {
      toast.success(t("saleDone"));
      setLines([]);
      setCustomer("");
      tokenRef.current = newToken();
      void queryClient.invalidateQueries();
    },
    onError: (e: Error) => {
      const err = toStockError(e);
      if (err.code === "INSUFFICIENT_STOCK")
        toast.error(`${t("insufficientStock")}: ${err.product} (${err.available})`);
      else toast.error(err.message);
      void queryClient.invalidateQueries({ queryKey: ["pos-products"] });
    },
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
            disabled={Number(p.current_stock) <= 0}
            className="rounded-2xl border bg-card p-3 text-left active:scale-95 disabled:opacity-50"
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

          <div className="grid grid-cols-2 gap-3 pt-2">
            <div className="space-y-1">
              <Label className="text-xs">{t("paymentMethod")}</Label>
              <select
                className="h-11 w-full rounded-md border bg-background px-2 text-sm"
                value={method}
                onChange={(e) => setMethod(e.target.value as PaymentMethod)}
              >
                {METHODS.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">{t("customer")}</Label>
              <Input className="h-11" value={customer} onChange={(e) => setCustomer(e.target.value)} />
            </div>
          </div>

          <div className="flex items-center justify-between border-t pt-2">
            <span className="font-semibold">{t("total")}</span>
            <span className="text-lg font-bold">{money(total)}</span>
          </div>
          <Button className="h-14 w-full text-base" disabled={checkout.isPending} onClick={() => checkout.mutate()}>
            {checkout.isPending ? <Loader2 className="h-5 w-5 animate-spin" /> : t("confirm")}
          </Button>
        </div>
      )}
    </div>
  );
}
