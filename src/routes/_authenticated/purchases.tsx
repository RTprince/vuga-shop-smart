import * as React from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useT } from "@/lib/i18n";
import { useCan } from "@/lib/auth";
import { money, shortDate } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/purchases")({ component: PurchasesPage });

function PurchasesPage() {
  const { t } = useT();
  const can = useCan();
  const queryClient = useQueryClient();
  const [productId, setProductId] = React.useState("");
  const [quantity, setQuantity] = React.useState("");
  const [price, setPrice] = React.useState("");

  const products = useQuery({
    queryKey: ["purchase-products"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("id, name, purchase_price")
        .eq("is_active", true)
        .order("name")
        .limit(200);
      if (error) throw error;
      return data ?? [];
    },
  });

  const recent = useQuery({
    queryKey: ["recent-purchases"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("purchases")
        .select("id, total_amount, purchase_date, invoice_number")
        .order("purchase_date", { ascending: false })
        .limit(10);
      if (error) throw error;
      return data ?? [];
    },
  });

  const save = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.rpc("create_purchase", {
        p_items: [{ product_id: productId, quantity: Number(quantity), unit_price: Number(price || 0) }],
        p_source: "MANUAL",
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(t("saved"));
      setQuantity("");
      setPrice("");
      void queryClient.invalidateQueries();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-5">
      {can.manageStock && (
        <section className="space-y-3 rounded-3xl border bg-card p-4">
          <h2 className="font-bold">{t("receiveStock")}</h2>
          <div className="space-y-2">
            <Label>{t("products")}</Label>
            <select
              className="h-12 w-full rounded-md border bg-background px-3"
              value={productId}
              onChange={(e) => {
                setProductId(e.target.value);
                const p = products.data?.find((x) => x.id === e.target.value);
                if (p) setPrice(String(p.purchase_price ?? ""));
              }}
            >
              <option value="">—</option>
              {(products.data ?? []).map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>{t("quantity")}</Label>
              <Input className="h-12" inputMode="decimal" value={quantity} onChange={(e) => setQuantity(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>{t("purchasePrice")}</Label>
              <Input className="h-12" inputMode="decimal" value={price} onChange={(e) => setPrice(e.target.value)} />
            </div>
          </div>
          <Button
            className="h-14 w-full"
            disabled={!productId || !Number(quantity) || save.isPending}
            onClick={() => save.mutate()}
          >
            {t("confirm")}
          </Button>
        </section>
      )}

      <section className="rounded-3xl border bg-card p-4">
        <h2 className="font-bold">{t("recentPurchases")}</h2>
        <ul className="mt-3 space-y-2 text-sm">
          {(recent.data ?? []).map((r) => (
            <li key={r.id} className="flex items-center justify-between">
              <span className="text-muted-foreground">
                {shortDate(r.purchase_date)} {r.invoice_number ?? ""}
              </span>
              <span className="font-semibold">{money(r.total_amount)}</span>
            </li>
          ))}
          {recent.data?.length === 0 && <li className="text-muted-foreground">{t("none")}</li>}
        </ul>
      </section>
    </div>
  );
}