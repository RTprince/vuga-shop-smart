import * as React from "react";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useT } from "@/lib/i18n";
import { money, qty as fmtQty } from "@/lib/format";

/** One editable transaction line, always bound to a real catalogue product. */
export type EditableLine = {
  key: string;
  product_id: string | null;
  name: string;
  spoken?: string;
  unit?: string;
  current_stock?: number;
  quantity: number;
  unit_price: number;
};

export function LineEditor({
  lines,
  onChange,
  priceLabel,
  showStock,
}: {
  lines: EditableLine[];
  onChange: (next: EditableLine[]) => void;
  priceLabel: string;
  showStock?: boolean;
}) {
  const { t } = useT();

  function patch(key: string, next: Partial<EditableLine>) {
    onChange(lines.map((l) => (l.key === key ? { ...l, ...next } : l)));
  }

  return (
    <ul className="space-y-3">
      {lines.map((l) => (
        <li key={l.key} className="rounded-2xl border bg-card p-3">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="truncate font-semibold">{l.name || l.spoken}</p>
              {l.product_id ? (
                showStock ? (
                  <p className="text-xs text-muted-foreground">
                    {t("stockNow")}: {fmtQty(l.current_stock ?? 0)} {l.unit ?? ""}
                  </p>
                ) : null
              ) : (
                <p className="text-xs text-destructive">{t("productNotMatched")}</p>
              )}
            </div>
            <Button
              size="icon"
              variant="ghost"
              aria-label={t("remove")}
              onClick={() => onChange(lines.filter((x) => x.key !== l.key))}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
          <div className="mt-2 grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">{t("quantity")}</Label>
              <Input
                className="h-11"
                inputMode="decimal"
                value={String(l.quantity)}
                onChange={(e) => patch(l.key, { quantity: Number(e.target.value) || 0 })}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">{priceLabel}</Label>
              <Input
                className="h-11"
                inputMode="decimal"
                value={String(l.unit_price)}
                onChange={(e) => patch(l.key, { unit_price: Number(e.target.value) || 0 })}
              />
            </div>
          </div>
          <p className="mt-2 text-right text-sm font-semibold">{money(l.quantity * l.unit_price)}</p>
        </li>
      ))}
    </ul>
  );
}
