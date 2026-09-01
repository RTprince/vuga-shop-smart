import { supabase } from "@/integrations/supabase/client";

export type Debt = {
  id: string;
  customer_name: string;
  phone: string | null;
  amount: number;
  amount_paid: number;
  due_date: string | null;
  status: "OPEN" | "PARTIAL" | "PAID";
  created_at: string;
};

export type Expense = {
  id: string;
  name: string;
  amount: number;
  category: string;
  expense_date: string;
  note: string | null;
};

export const EXPENSE_CATEGORIES = [
  "TRANSPORT",
  "ELECTRICITY",
  "RENT",
  "SALARIES",
  "DELIVERY",
  "OTHER",
] as const;
export type ExpenseCategory = (typeof EXPENSE_CATEGORIES)[number];

export type BusinessReport = {
  period: string;
  from: string;
  sales_total: number;
  collected: number;
  credit: number;
  sales_count: number;
  prev_sales_total: number;
  purchases: number;
  expenses: number;
  expenses_by_category: { category: string; amount: number }[];
  gross_profit: number;
  top_products: { name: string; qty: number; revenue: number }[];
  outstanding_debt: number;
  debtor_count: number;
  low_stock: number;
  out_of_stock: number;
  dead_stock: { name: string; stock: number; tied_value: number; last_sold_at: string | null }[];
};

export async function fetchDebts(): Promise<Debt[]> {
  const { data, error } = await supabase
    .from("debts")
    .select("id, customer_name, phone, amount, amount_paid, due_date, status, created_at")
    .order("status")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as Debt[];
}

export async function payDebt(debtId: string, amount: number, method = "CASH") {
  const { data, error } = await supabase.rpc("record_debt_payment", {
    p_debt_id: debtId,
    p_amount: amount,
    p_method: method as "CASH",
  });
  if (error) throw error;
  return data;
}

export async function fetchExpenses(): Promise<Expense[]> {
  const { data, error } = await supabase
    .from("expenses")
    .select("id, name, amount, category, expense_date, note")
    .order("expense_date", { ascending: false })
    .limit(100);
  if (error) throw error;
  return (data ?? []) as Expense[];
}

export async function addExpense(input: {
  name: string;
  amount: number;
  category: string;
  date: string;
  note?: string | null;
}) {
  const { error } = await supabase.rpc("record_expense", {
    p_name: input.name,
    p_amount: input.amount,
    p_category: input.category,
    p_date: input.date,
    ...(input.note ? { p_note: input.note } : {}),
  });
  if (error) throw error;
}

export async function fetchReport(period: "day" | "week" | "month"): Promise<BusinessReport> {
  const { data, error } = await supabase.rpc("business_report", { p_period: period });
  if (error) throw error;
  return data as unknown as BusinessReport;
}

/** Reminder text the shopkeeper copies and sends manually via WhatsApp/SMS. */
export function reminderText(debt: Debt, shopName: string, lang: "rw" | "en") {
  const outstanding = Number(debt.amount) - Number(debt.amount_paid);
  const amount = `${outstanding.toLocaleString("en-US", { maximumFractionDigits: 0 })} RWF`;
  return lang === "rw"
    ? `Muraho ${debt.customer_name}, turakwibutsa ko hasigaye umwenda wa ${amount} ku iduka rya ${shopName}. Mwadufasha mukawishyura. Murakoze.`
    : `Hello ${debt.customer_name}, this is a friendly reminder that ${amount} is still outstanding at ${shopName}. Kindly settle it when you can. Thank you.`;
}
