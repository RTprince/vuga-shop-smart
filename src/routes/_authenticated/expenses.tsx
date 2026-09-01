import * as React from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Receipt } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { money, shortDate } from "@/lib/format";
import { useT } from "@/lib/i18n";
import { addExpense, EXPENSE_CATEGORIES, fetchExpenses } from "@/lib/business";

export const Route = createFileRoute("/_authenticated/expenses")({
  head: () => ({
    meta: [
      { title: "Ibyakoreshejwe | RTFlow" },
      { name: "description", content: "Andika ibyakoreshejwe: transport, amashanyarazi, ubukode, imishahara." },
      { property: "og:title", content: "Ibyakoreshejwe | RTFlow" },
      { property: "og:description", content: "Record and review business expenses in RTFlow." },
    ],
  }),
  component: ExpensesPage,
});

const LABELS: Record<string, { rw: string; en: string }> = {
  TRANSPORT: { rw: "Ubwikorezi", en: "Transport" },
  ELECTRICITY: { rw: "Amashanyarazi", en: "Electricity" },
  RENT: { rw: "Ubukode", en: "Rent" },
  SALARIES: { rw: "Imishahara", en: "Salaries" },
  DELIVERY: { rw: "Gutwara ibicuruzwa", en: "Delivery" },
  OTHER: { rw: "Ibindi", en: "Other" },
};

function today() {
  return new Date().toISOString().slice(0, 10);
}

function ExpensesPage() {
  const { t, lang } = useT();
  const queryClient = useQueryClient();
  const [open, setOpen] = React.useState(false);
  const [name, setName] = React.useState("");
  const [amount, setAmount] = React.useState("");
  const [category, setCategory] = React.useState<string>("TRANSPORT");
  const [date, setDate] = React.useState(today());

  const expenses = useQuery({ queryKey: ["expenses"], queryFn: fetchExpenses });

  const monthTotal = (expenses.data ?? [])
    .filter((e) => e.expense_date.slice(0, 7) === today().slice(0, 7))
    .reduce((s, e) => s + Number(e.amount), 0);

  const save = useMutation({
    mutationFn: async () => addExpense({ name: name.trim(), amount: Number(amount), category, date }),
    onSuccess: () => {
      toast.success(t("saved"));
      setName("");
      setAmount("");
      setOpen(false);
      void queryClient.invalidateQueries();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-5">
      <section className="rounded-3xl bg-secondary p-5 text-secondary-foreground">
        <p className="text-sm opacity-90">{lang === "rw" ? "Ibyakoreshejwe uku kwezi" : "Spent this month"}</p>
        <p className="mt-1 text-3xl font-extrabold">{money(monthTotal)}</p>
      </section>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          <Button className="h-14 w-full text-base">
            <Plus className="mr-2 h-5 w-5" />
            {lang === "rw" ? "Andika ikiguzi" : "Add expense"}
          </Button>
        </SheetTrigger>
        <SheetContent side="bottom" className="max-h-[92vh] overflow-y-auto rounded-t-3xl">
          <SheetHeader>
            <SheetTitle>{lang === "rw" ? "Ikiguzi gishya" : "New expense"}</SheetTitle>
          </SheetHeader>
          <div className="mt-4 space-y-4 pb-6">
            <div className="space-y-1">
              <Label>{lang === "rw" ? "Icyo ari cyo" : "What was it for"}</Label>
              <Input className="h-12" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>{lang === "rw" ? "Amafaranga" : "Amount"}</Label>
              <Input
                className="h-12"
                inputMode="decimal"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label>{lang === "rw" ? "Icyiciro" : "Category"}</Label>
              <div className="grid grid-cols-2 gap-2">
                {EXPENSE_CATEGORIES.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setCategory(c)}
                    className={`h-12 rounded-2xl border text-sm font-semibold ${category === c ? "border-primary bg-primary text-primary-foreground" : "bg-background"}`}
                  >
                    {lang === "rw" ? LABELS[c]!.rw : LABELS[c]!.en}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-1">
              <Label>{lang === "rw" ? "Itariki" : "Date"}</Label>
              <Input className="h-12" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
            <Button
              className="h-14 w-full text-base"
              disabled={!name.trim() || !(Number(amount) > 0) || save.isPending}
              onClick={() => save.mutate()}
            >
              {t("save")}
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      <ul className="space-y-2">
        {(expenses.data ?? []).map((e) => (
          <li key={e.id} className="flex items-center justify-between rounded-2xl border bg-card p-4">
            <div className="min-w-0">
              <p className="flex items-center gap-2 font-semibold">
                <Receipt className="h-4 w-4 text-muted-foreground" />
                {e.name}
              </p>
              <p className="text-xs text-muted-foreground">
                {(lang === "rw" ? LABELS[e.category]?.rw : LABELS[e.category]?.en) ?? e.category} ·{" "}
                {shortDate(e.expense_date)}
              </p>
            </div>
            <span className="font-bold">{money(e.amount)}</span>
          </li>
        ))}
        {expenses.data?.length === 0 && (
          <li className="rounded-3xl border border-dashed p-8 text-center text-muted-foreground">
            {lang === "rw" ? "Nta kiguzi cyanditswe" : "No expenses recorded yet"}
          </li>
        )}
      </ul>
    </div>
  );
}
