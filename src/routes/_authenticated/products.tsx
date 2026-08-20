import * as React from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { Plus, Search } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useT } from "@/lib/i18n";
import { useAuth, useCan } from "@/lib/auth";
import { money, qty } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/products")({ component: ProductsPage });

function ProductsPage() {
  const { t } = useT();
  const can = useCan();
  const [term, setTerm] = React.useState("");
  const [open, setOpen] = React.useState(false);

  const products = useQuery({
    queryKey: ["products", term],
    queryFn: async () => {
      let q = supabase
        .from("products")
        .select("id, name, unit, selling_price, purchase_price, current_stock, min_stock_level")
        .eq("is_active", true)
        .order("name")
        .limit(100);
      if (term.trim()) q = q.ilike("name", `%${term.trim()}%`);
      const { data, error } = await q;
      if (error) throw error;
      return data ?? [];
    },
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-3.5 h-5 w-5 text-muted-foreground" />
          <Input
            className="h-12 pl-10"
            placeholder={t("search")}
            value={term}
            onChange={(e) => setTerm(e.target.value)}
          />
        </div>
        {can.manageProducts && (
          <Button className="h-12" onClick={() => setOpen(true)}>
            <Plus className="h-5 w-5" />
          </Button>
        )}
      </div>

      <ul className="space-y-2">
        {(products.data ?? []).map((p) => (
          <li key={p.id} className="flex items-center justify-between rounded-2xl border bg-card p-3">
            <div>
              <p className="font-semibold">{p.name}</p>
              <p className="text-xs text-muted-foreground">
                {qty(p.current_stock)} {p.unit} · {t("minStock")}: {qty(p.min_stock_level)}
              </p>
            </div>
            <p className="font-bold">{money(p.selling_price)}</p>
          </li>
        ))}
        {products.data?.length === 0 && <li className="text-sm text-muted-foreground">{t("none")}</li>}
      </ul>

      <NewProductSheet open={open} onOpenChange={setOpen} />
    </div>
  );
}

function NewProductSheet({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const { t } = useT();
  const { membership } = useAuth();
  const queryClient = useQueryClient();
  const [name, setName] = React.useState("");
  const [unit, setUnit] = React.useState("pcs");
  const [purchase, setPurchase] = React.useState("");
  const [selling, setSelling] = React.useState("");
  const [stock, setStock] = React.useState("");

  const save = useMutation({
    mutationFn: async () => {
      if (!membership) throw new Error("no business");
      const { error } = await supabase.from("products").insert({
        business_id: membership.business_id,
        name: name.trim(),
        unit,
        purchase_price: Number(purchase || 0),
        selling_price: Number(selling || 0),
        current_stock: Number(stock || 0),
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(t("saved"));
      void queryClient.invalidateQueries({ queryKey: ["products"] });
      setName("");
      setPurchase("");
      setSelling("");
      setStock("");
      onOpenChange(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="rounded-t-3xl">
        <SheetHeader>
          <SheetTitle>{t("addProduct")}</SheetTitle>
        </SheetHeader>
        <div className="space-y-3 px-4 pb-8">
          <div className="space-y-2">
            <Label>{t("productName")}</Label>
            <Input className="h-12" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>{t("unit")}</Label>
              <Input className="h-12" value={unit} onChange={(e) => setUnit(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>{t("currentStock")}</Label>
              <Input className="h-12" inputMode="decimal" value={stock} onChange={(e) => setStock(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>{t("purchasePrice")}</Label>
              <Input className="h-12" inputMode="decimal" value={purchase} onChange={(e) => setPurchase(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>{t("sellingPrice")}</Label>
              <Input className="h-12" inputMode="decimal" value={selling} onChange={(e) => setSelling(e.target.value)} />
            </div>
          </div>
          <Button className="h-14 w-full" disabled={!name.trim() || save.isPending} onClick={() => save.mutate()}>
            {t("save")}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}