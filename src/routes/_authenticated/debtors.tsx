import * as React from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Copy, HandCoins, Phone, UserRound } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { money, shortDate } from "@/lib/format";
import { useT } from "@/lib/i18n";
import { useAuth } from "@/lib/auth";
import { fetchDebts, payDebt, reminderText, type Debt } from "@/lib/business";

export const Route = createFileRoute("/_authenticated/debtors")({
  head: () => ({
    meta: [
      { title: "Imyenda | RTFlow" },
      { name: "description", content: "Reba abakurimo umwenda, uko bishyura n'ubutumwa bwo kubibutsa." },
      { property: "og:title", content: "Imyenda | RTFlow" },
      { property: "og:description", content: "Track customer credit and outstanding balances in RTFlow." },
    ],
  }),
  component: DebtorsPage,
});

function DebtorsPage() {
  const { t, lang } = useT();
  const { membership } = useAuth();
  const queryClient = useQueryClient();
  const [paying, setPaying] = React.useState<Debt | null>(null);
  const [amount, setAmount] = React.useState("");

  const debts = useQuery({ queryKey: ["debts"], queryFn: fetchDebts });
  const open = (debts.data ?? []).filter((d) => d.status !== "PAID");
  const paid = (debts.data ?? []).filter((d) => d.status === "PAID");
  const outstanding = open.reduce((s, d) => s + Number(d.amount) - Number(d.amount_paid), 0);

  const pay = useMutation({
    mutationFn: async () => payDebt(paying!.id, Number(amount)),
    onSuccess: () => {
      toast.success(t("saved"));
      setPaying(null);
      setAmount("");
      void queryClient.invalidateQueries();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  async function copyReminder(d: Debt) {
    const text = reminderText(d, membership?.business.name ?? "RTFlow", lang);
    try {
      await navigator.clipboard.writeText(text);
      toast.success(lang === "rw" ? "Ubutumwa bwakoporowe" : "Reminder copied");
    } catch {
      toast.error(text);
    }
  }

  return (
    <div className="space-y-5">
      <section className="rounded-3xl bg-primary p-5 text-primary-foreground shadow">
        <p className="text-sm opacity-90">{lang === "rw" ? "Imyenda itarishyurwa" : "Outstanding credit"}</p>
        <p className="mt-1 text-3xl font-extrabold">{money(outstanding)}</p>
        <p className="mt-1 text-sm opacity-90">
          {open.length} {lang === "rw" ? "abakiriya" : "customers"}
        </p>
      </section>

      {open.length === 0 && (
        <div className="rounded-3xl border border-dashed p-8 text-center text-muted-foreground">
          {lang === "rw" ? "Nta wugufitiye umwenda. Byiza!" : "Nobody owes you money. Nice!"}
        </div>
      )}

      <ul className="space-y-3">
        {open.map((d) => {
          const left = Number(d.amount) - Number(d.amount_paid);
          const overdue = d.due_date ? new Date(d.due_date) < new Date() : false;
          return (
            <li key={d.id} className="rounded-3xl border bg-card p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="flex items-center gap-2 font-bold">
                    <UserRound className="h-4 w-4 text-muted-foreground" />
                    {d.customer_name}
                  </p>
                  {d.phone && (
                    <a href={`tel:${d.phone}`} className="mt-1 flex items-center gap-1 text-sm text-muted-foreground">
                      <Phone className="h-3.5 w-3.5" />
                      {d.phone}
                    </a>
                  )}
                  <p className="mt-1 text-xs text-muted-foreground">
                    {shortDate(d.created_at)}
                    {d.due_date ? ` → ${shortDate(d.due_date)}` : ""}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-extrabold">{money(left)}</p>
                  {overdue && (
                    <span className="mt-1 inline-block rounded-full bg-destructive/10 px-2 py-0.5 text-[11px] font-semibold text-destructive">
                      {lang === "rw" ? "Igihe cyarenze" : "Overdue"}
                    </span>
                  )}
                </div>
              </div>
              <div className="mt-3 flex gap-2">
                <Button className="h-11 flex-1" onClick={() => setPaying(d)}>
                  <HandCoins className="mr-1 h-4 w-4" />
                  {lang === "rw" ? "Yishyuye" : "Record payment"}
                </Button>
                <Button variant="outline" className="h-11 flex-1" onClick={() => void copyReminder(d)}>
                  <Copy className="mr-1 h-4 w-4" />
                  {lang === "rw" ? "Koporora ubutumwa" : "Copy reminder"}
                </Button>
              </div>
            </li>
          );
        })}
      </ul>

      {paid.length > 0 && (
        <section className="rounded-3xl border bg-card p-4">
          <h2 className="font-bold">{lang === "rw" ? "Byishyuwe" : "Settled"}</h2>
          <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
            {paid.slice(0, 10).map((d) => (
              <li key={d.id} className="flex justify-between">
                <span>{d.customer_name}</span>
                <span>{money(d.amount)}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <AlertDialog open={!!paying} onOpenChange={(o) => !o && setPaying(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{paying?.customer_name}</AlertDialogTitle>
            <AlertDialogDescription>
              {lang === "rw" ? "Umwenda usigaye" : "Outstanding"}:{" "}
              {money(Number(paying?.amount ?? 0) - Number(paying?.amount_paid ?? 0))}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-2">
            <Label>{lang === "rw" ? "Amafaranga yishyuwe" : "Amount paid"}</Label>
            <Input
              className="h-12"
              inputMode="decimal"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              autoFocus
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("cancel")}</AlertDialogCancel>
            <AlertDialogAction
              disabled={!(Number(amount) > 0) || pay.isPending}
              onClick={(e) => {
                e.preventDefault();
                pay.mutate();
              }}
            >
              {t("confirm")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
