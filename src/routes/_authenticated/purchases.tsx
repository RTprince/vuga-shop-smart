import * as React from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { Loader2, Plus } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useT } from "@/lib/i18n";
import { useAuth, useCan } from "@/lib/auth";
import { money, shortDate } from "@/lib/format";
import { LineEditor, type EditableLine } from "@/components/StockLines";
import { createPurchase, newToken, toStockError, uploadInvoiceImage } from "@/lib/stock";

export const Route = createFileRoute("/_authenticated/purchases")({ component: PurchasesPage });

function PurchasesPage() {
  const { t } = useT();
  const can = useCan();
  const { membership } = useAuth();
  const queryClient = useQueryClient();
  const [lines, setLines] = React.useState<EditableLine[]>([]);
  const [productId, setProductId] = React.useState("");
  const [supplierId, setSupplierId] = React.useState("");
  const [invoiceNumber, setInvoiceNumber] = React.useState("");
  const [notes, setNotes] = React.useState("");
  const [file, setFile] = React.useState<File | null>(null);
  const tokenRef = React.useRef(newToken());

  const products = useQuery({
    queryKey: ["purchase-products"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("id, name, unit, purchase_price, current_stock")
        .eq("is_active", true)
        .order("name")
        .limit(300);
      if (error) throw error;
      return data ?? [];
    },
  });

  const suppliers = useQuery({
    queryKey: ["suppliers"],
    queryFn: async () => {
      const { data, error } = await supabase.from("suppliers").select("id, name").order("name").limit(200);
      if (error) throw error;
      return data ?? [];
    },
  });

  const recent = useQuery({
    queryKey: ["recent-purchases"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("purchases")
        .select("id, total_amount, purchase_date, invoice_number, image_url")
        .order("purchase_date", { ascending: false })
        .limit(10);
      if (error) throw error;
      return data ?? [];
    },
  });

  function addLine() {
    const p = products.data?.find((x) => x.id === productId);
    if (!p) return;
    if (lines.some((l) => l.product_id === p.id)) return;
    setLines((prev) => [
      ...prev,
      {
        key: `${p.id}-${Date.now()}`,
        product_id: p.id,
        name: p.name,
        unit: p.unit,
        current_stock: Number(p.current_stock),
        quantity: 1,
        unit_price: Number(p.purchase_price ?? 0),
      },
    ]);
    setProductId("");
  }

  const total = lines.reduce((s, l) => s + l.quantity * l.unit_price, 0);

  const save = useMutation({
    mutationFn: async () => {
      // Image first: if upload fails we never create a half-linked purchase.
      let imagePath: string | null = null;
      if (file && membership) imagePath = await uploadInvoiceImage(membership.business_id, file);
      return createPurchase({
        items: lines
          .filter((l) => l.product_id && l.quantity > 0)
          .map((l) => ({ product_id: l.product_id as string, quantity: l.quantity, unit_price: l.unit_price })),
        supplierId: supplierId || null,
        invoiceNumber: invoiceNumber.trim() || null,
        notes: notes.trim() || null,
        imagePath,
        source: "MANUAL",
        token: tokenRef.current,
      });
    },
    onSuccess: () => {
      toast.success(t("purchaseDone"));
      setLines([]);
      setInvoiceNumber("");
      setNotes("");
      setFile(null);
      setSupplierId("");
      tokenRef.current = newToken();
      void queryClient.invalidateQueries();
    },
    onError: (e: Error) => {
      const err = toStockError(e);
      toast.error(err.code === "FORBIDDEN" ? t("noPermission") : err.message);
    },
  });

  return (
    <div className="space-y-5">
      {can.manageStock && (
        <section className="space-y-3 rounded-3xl border bg-card p-4">
          <h2 className="font-bold">{t("receiveStock")}</h2>

          <div className="flex items-end gap-2">
            <div className="flex-1 space-y-2">
              <Label>{t("products")}</Label>
              <select
                className="h-12 w-full rounded-md border bg-background px-3"
                value={productId}
                onChange={(e) => setProductId(e.target.value)}
              >
                <option value="">—</option>
                {(products.data ?? []).map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
            <Button className="h-12" disabled={!productId} onClick={addLine} aria-label={t("addItem")}>
              <Plus className="h-5 w-5" />
            </Button>
          </div>

          {lines.length > 0 && (
            <>
              <p className="text-sm font-semibold">{t("review")}</p>
              <LineEditor lines={lines} onChange={setLines} priceLabel={t("purchasePrice")} showStock />
            </>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>{t("supplier")}</Label>
              <select
                className="h-12 w-full rounded-md border bg-background px-3"
                value={supplierId}
                onChange={(e) => setSupplierId(e.target.value)}
              >
                <option value="">—</option>
                {(suppliers.data ?? []).map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label>{t("invoiceNumber")}</Label>
              <Input className="h-12" value={invoiceNumber} onChange={(e) => setInvoiceNumber(e.target.value)} />
            </div>
          </div>

          <div className="space-y-2">
            <Label>{t("notes")}</Label>
            <Input className="h-12" value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>

          <div className="space-y-2">
            <Label>{t("invoiceImage")}</Label>
            <Input
              type="file"
              accept="image/*"
              capture="environment"
              className="h-12"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
            <p className="text-xs text-muted-foreground">{t("ocrNotConnected")}</p>
          </div>

          <div className="flex items-center justify-between border-t pt-2">
            <span className="font-semibold">{t("total")}</span>
            <span className="text-lg font-bold">{money(total)}</span>
          </div>

          <Button
            className="h-14 w-full"
            disabled={lines.length === 0 || save.isPending}
            onClick={() => save.mutate()}
          >
            {save.isPending ? <Loader2 className="h-5 w-5 animate-spin" /> : t("confirm")}
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
