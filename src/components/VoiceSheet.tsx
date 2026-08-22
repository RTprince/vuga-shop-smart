import * as React from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Mic, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useT } from "@/lib/i18n";
import { money } from "@/lib/format";
import { interpretVoice, type VoiceAction } from "@/lib/ai.functions";
import { browserSpeech } from "@/lib/speech";
import { LineEditor, type EditableLine } from "@/components/StockLines";
import { createPurchase, createSale, matchProduct, newToken, toStockError } from "@/lib/stock";

type Draft = { action: VoiceAction; lines: EditableLine[]; token: string };

export function VoiceSheet({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const { t, lang } = useT();
  const { membership } = useAuth();
  const queryClient = useQueryClient();
  const interpret = useServerFn(interpretVoice);
  const [listening, setListening] = React.useState(false);
  const [transcript, setTranscript] = React.useState("");
  const [draft, setDraft] = React.useState<Draft | null>(null);
  const [unknown, setUnknown] = React.useState(false);
  const stopRef = React.useRef<() => void>(() => {});
  const supported = typeof window !== "undefined" && browserSpeech.isSupported();

  React.useEffect(() => {
    if (!open) {
      setTranscript("");
      setDraft(null);
      setUnknown(false);
      setListening(false);
      stopRef.current();
    }
  }, [open]);

  const interpretMutation = useMutation({
    mutationFn: async (text: string): Promise<Draft> => {
      const { data: products } = await supabase.from("products").select("name").limit(120);
      const result = await interpret({
        data: { transcript: text, knownProducts: (products ?? []).map((p) => p.name) },
      });
      if (membership) {
        await supabase.from("voice_commands").insert({
          business_id: membership.business_id,
          transcript: text,
          language: lang,
          intent: result.intent,
          structured_action: JSON.parse(JSON.stringify(result)),
          status: "AWAITING_CONFIRMATION",
        });
      }
      const lines: EditableLine[] = [];
      for (const [i, item] of (result.items ?? []).entries()) {
        const spoken = (item.product ?? "").trim();
        const found = spoken ? await matchProduct(spoken) : null;
        lines.push({
          key: `${i}-${spoken}`,
          product_id: found?.id ?? null,
          name: found?.name ?? spoken,
          spoken,
          unit: found?.unit ?? item.unit ?? "pcs",
          current_stock: Number(found?.current_stock ?? 0),
          quantity: Number(item.quantity ?? 1),
          unit_price: Number(
            result.intent === "CREATE_PURCHASE"
              ? (item.purchase_price ?? found?.purchase_price ?? 0)
              : (item.selling_price ?? found?.selling_price ?? 0),
          ),
        });
      }
      return { action: result, lines, token: newToken() };
    },
    onSuccess: (d) => {
      setUnknown(d.action.intent === "UNKNOWN" || d.lines.length === 0);
      setDraft(d.action.intent === "UNKNOWN" ? null : d);
    },
    onError: () => toast.error(t("voiceNotUnderstood")),
  });

  const run = useMutation({
    mutationFn: async (d: Draft) => {
      const usable = d.lines.filter((l) => l.product_id && l.quantity > 0);
      const items = usable.map((l) => ({
        product_id: l.product_id as string,
        quantity: l.quantity,
        unit_price: l.unit_price,
      }));

      if (d.action.intent === "GET_STOCK") {
        const first = d.lines[0];
        if (!first?.product_id) throw new Error("NOT_FOUND");
        return `${first.name}: ${first.current_stock} ${first.unit ?? ""}`;
      }

      if (d.action.intent === "CREATE_PRODUCT") {
        const first = d.lines[0];
        if (!first) throw new Error("UNKNOWN");
        const { error } = await supabase.rpc("create_product", {
          p_name: first.name || (first.spoken ?? ""),
          p_unit: first.unit ?? "pcs",
          p_purchase_price: d.action.items[0]?.purchase_price ?? 0,
          p_selling_price: first.unit_price || (d.action.items[0]?.selling_price ?? 0),
          p_initial_stock: first.quantity,
        });
        if (error) throw toStockError(error);
        return t("saved");
      }

      if (items.length === 0) throw new Error("NOT_FOUND");

      if (d.action.intent === "CREATE_SALE") {
        await createSale({ items, source: "VOICE", token: d.token });
        return t("saleDone");
      }
      if (d.action.intent === "CREATE_PURCHASE") {
        await createPurchase({ items, source: "VOICE", token: d.token });
        return t("purchaseDone");
      }
      if (d.action.intent === "UPDATE_PRODUCT") {
        const first = usable[0];
        if (!first) throw new Error("NOT_FOUND");
        const patch: { selling_price?: number; purchase_price?: number } = {};
        const item = d.action.items[0];
        if (first.unit_price) patch.selling_price = first.unit_price;
        if (item?.purchase_price) patch.purchase_price = item.purchase_price;
        const { error } = await supabase.from("products").update(patch).eq("id", first.product_id as string);
        if (error) throw error;
        return t("saved");
      }
      throw new Error("UNKNOWN");
    },
    onSuccess: (msg) => {
      toast.success(msg);
      void queryClient.invalidateQueries();
      onOpenChange(false);
    },
    onError: (e: Error) => {
      const stock = toStockError(e);
      if (e.message === "NOT_FOUND") toast.error(t("productNotMatched"));
      else if (stock.code === "INSUFFICIENT_STOCK")
        toast.error(`${t("insufficientStock")}: ${stock.product} (${stock.available})`);
      else if (stock.code === "FORBIDDEN") toast.error(t("noPermission"));
      else toast.error(t("voiceNotUnderstood"));
    },
  });

  function startListening() {
    setDraft(null);
    setUnknown(false);
    setTranscript("");
    setListening(true);
    stopRef.current = browserSpeech.start({
      lang: lang === "rw" ? "rw-RW" : "en-US",
      onResult: (text, isFinal) => {
        setTranscript(text);
        if (isFinal) interpretMutation.mutate(text);
      },
      onError: () => {
        setListening(false);
        toast.error(t("voiceUnsupported"));
      },
      onEnd: () => setListening(false),
    });
  }

  const total = draft?.lines.reduce((s, l) => s + l.quantity * l.unit_price, 0) ?? 0;
  const isTransaction =
    draft?.action.intent === "CREATE_SALE" || draft?.action.intent === "CREATE_PURCHASE";

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="max-h-[92vh] overflow-y-auto rounded-t-3xl">
        <SheetHeader>
          <SheetTitle>{t("voice")}</SheetTitle>
        </SheetHeader>
        <div className="space-y-4 px-4 pb-8">
          {supported ? (
            <button
              type="button"
              onClick={startListening}
              className={`mx-auto flex h-28 w-28 items-center justify-center rounded-full text-primary-foreground shadow-lg transition ${listening ? "animate-pulse bg-destructive" : "bg-primary"}`}
              aria-label={t("voice")}
            >
              <Mic className="h-12 w-12" />
            </button>
          ) : (
            <p className="text-center text-sm text-muted-foreground">{t("voiceUnsupported")}</p>
          )}
          <p className="text-center text-sm text-muted-foreground">
            {listening ? t("voiceListening") : t("voiceHint")}
          </p>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (transcript.trim()) interpretMutation.mutate(transcript.trim());
            }}
            className="flex gap-2"
          >
            <Input
              value={transcript}
              onChange={(e) => setTranscript(e.target.value)}
              placeholder={t("typeCommand")}
              className="h-12"
            />
            <Button type="submit" className="h-12" disabled={interpretMutation.isPending}>
              {interpretMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "→"}
            </Button>
          </form>

          {draft && (
            <div className="space-y-3 rounded-2xl border bg-card p-4">
              <p className="text-sm font-semibold">{t("voiceUnderstood")}</p>
              <p className="text-xs text-muted-foreground">{draft.action.intent}</p>
              <LineEditor
                lines={draft.lines}
                onChange={(lines) => setDraft({ ...draft, lines })}
                priceLabel={draft.action.intent === "CREATE_PURCHASE" ? t("purchasePrice") : t("sellingPrice")}
                showStock
              />
              {isTransaction && (
                <div className="flex items-center justify-between border-t pt-2">
                  <span className="font-semibold">{t("total")}</span>
                  <span className="text-lg font-bold">{money(total)}</span>
                </div>
              )}
              <div className="flex gap-2">
                <Button
                  className="h-12 flex-1"
                  onClick={() => run.mutate(draft)}
                  disabled={run.isPending || draft.lines.length === 0}
                >
                  {run.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : t("confirm")}
                </Button>
                <Button variant="ghost" className="h-12" onClick={() => onOpenChange(false)}>
                  {t("cancel")}
                </Button>
              </div>
            </div>
          )}
          {unknown && <p className="rounded-2xl bg-muted p-4 text-center text-sm">{t("voiceNotUnderstood")}</p>}
        </div>
      </SheetContent>
    </Sheet>
  );
}
