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

export function VoiceSheet({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const { t, lang } = useT();
  const { membership } = useAuth();
  const queryClient = useQueryClient();
  const interpret = useServerFn(interpretVoice);
  const [listening, setListening] = React.useState(false);
  const [transcript, setTranscript] = React.useState("");
  const [action, setAction] = React.useState<VoiceAction | null>(null);
  const stopRef = React.useRef<() => void>(() => {});
  const supported = typeof window !== "undefined" && browserSpeech.isSupported();

  React.useEffect(() => {
    if (!open) {
      setTranscript("");
      setAction(null);
      setListening(false);
      stopRef.current();
    }
  }, [open]);

  const interpretMutation = useMutation({
    mutationFn: async (text: string) => {
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
          structured_action: result as unknown as Record<string, unknown>,
          status: "AWAITING_CONFIRMATION",
        });
      }
      return result;
    },
    onSuccess: (result) => setAction(result),
    onError: () => toast.error(t("voiceNotUnderstood")),
  });

  const run = useMutation({
    mutationFn: async (a: VoiceAction) => {
      const name = (a.product ?? "").trim();
      if (!name) throw new Error("no product");
      const { data: found } = await supabase
        .from("products")
        .select("id, name, current_stock, selling_price, purchase_price")
        .ilike("name", `%${name}%`)
        .limit(1)
        .maybeSingle();

      if (a.intent === "GET_STOCK") {
        if (!found) throw new Error("NOT_FOUND");
        return `${found.name}: ${found.current_stock}`;
      }
      if (a.intent === "CREATE_PRODUCT") {
        const { error } = await supabase.from("products").insert({
          business_id: membership!.business_id,
          name,
          unit: a.unit ?? "pcs",
          purchase_price: a.purchase_price ?? 0,
          selling_price: a.selling_price ?? 0,
          current_stock: a.quantity ?? 0,
        });
        if (error) throw error;
        return t("saved");
      }
      if (!found) throw new Error("NOT_FOUND");
      if (a.intent === "CREATE_SALE") {
        const { error } = await supabase.rpc("create_sale", {
          p_items: [{ product_id: found.id, quantity: a.quantity ?? 1 }],
          p_source: "VOICE",
        });
        if (error) throw error;
        return t("saleDone");
      }
      if (a.intent === "CREATE_PURCHASE") {
        const { error } = await supabase.rpc("create_purchase", {
          p_items: [
            { product_id: found.id, quantity: a.quantity ?? 1, unit_price: a.purchase_price ?? 0 },
          ],
          p_source: "VOICE",
        });
        if (error) throw error;
        return t("saved");
      }
      if (a.intent === "UPDATE_PRODUCT") {
        const patch: Record<string, number> = {};
        if (a.selling_price) patch["selling_price"] = a.selling_price;
        if (a.purchase_price) patch["purchase_price"] = a.purchase_price;
        const { error } = await supabase.from("products").update(patch).eq("id", found.id);
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
      if (e.message === "NOT_FOUND") toast.error(t("notFoundBarcode"));
      else if (e.message.includes("INSUFFICIENT")) toast.error(t("insufficientStock"));
      else toast.error(t("voiceNotUnderstood"));
    },
  });

  function startListening() {
    setAction(null);
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

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="rounded-t-3xl">
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

          {action && action.intent !== "UNKNOWN" && (
            <div className="rounded-2xl border bg-card p-4">
              <p className="text-sm font-semibold">{t("voiceUnderstood")}</p>
              <ul className="mt-2 space-y-1 text-sm">
                <li className="font-medium">{action.intent}</li>
                {action.product && <li>{action.product}</li>}
                {action.quantity != null && (
                  <li>
                    {t("quantity")}: {action.quantity}
                  </li>
                )}
                {action.purchase_price != null && (
                  <li>
                    {t("purchasePrice")}: {money(action.purchase_price)}
                  </li>
                )}
                {action.selling_price != null && (
                  <li>
                    {t("sellingPrice")}: {money(action.selling_price)}
                  </li>
                )}
              </ul>
              <div className="mt-4 flex gap-2">
                <Button className="h-12 flex-1" onClick={() => run.mutate(action)} disabled={run.isPending}>
                  {t("confirm")}
                </Button>
                <Button variant="outline" className="h-12" onClick={() => setAction(null)}>
                  {t("edit")}
                </Button>
                <Button variant="ghost" className="h-12" onClick={() => onOpenChange(false)}>
                  {t("cancel")}
                </Button>
              </div>
            </div>
          )}
          {action && action.intent === "UNKNOWN" && (
            <p className="rounded-2xl bg-muted p-4 text-center text-sm">{t("voiceNotUnderstood")}</p>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}