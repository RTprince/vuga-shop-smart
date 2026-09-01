/**
 * Stock engine client gateway.
 *
 * Every stock change in the app goes through these helpers, which call the
 * atomic Postgres functions (`create_sale`, `create_purchase`, `adjust_stock`,
 * `record_return`). Those functions are the ONLY place where
 * `products.current_stock` is written, and each one writes an
 * `inventory_movements` row in the same transaction.
 *
 * Never write `products.current_stock` directly from a component.
 */
import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";

export type PaymentMethod = "CASH" | "MOBILE_MONEY" | "BANK" | "OTHER";

export type StockLine = { product_id: string; quantity: number; unit_price?: number };

export type StockErrorCode =
  | "INSUFFICIENT_STOCK"
  | "PRODUCT_NOT_FOUND"
  | "FORBIDDEN"
  | "EMPTY_CART"
  | "INVALID_QUANTITY"
  | "NO_BUSINESS"
  | "ACCESS_EXPIRED"
  | "UNKNOWN";

export class StockError extends Error {
  code: StockErrorCode;
  product?: string | undefined;
  available?: number | undefined;
  requested?: number | undefined;
  constructor(
    code: StockErrorCode,
    message: string,
    extra?: { product?: string | undefined; available?: number | undefined; requested?: number | undefined },
  ) {
    super(message);
    this.code = code;
    this.product = extra?.product;
    this.available = extra?.available;
    this.requested = extra?.requested;
  }
}

/** Maps a Postgres error into a typed StockError (INSUFFICIENT_STOCK carries real numbers). */
export function toStockError(err: unknown): StockError {
  const message = (err as { message?: string })?.message ?? String(err);
  if (message.includes("INSUFFICIENT_STOCK")) {
    const raw = message.slice(message.indexOf("INSUFFICIENT_STOCK"));
    const [, product, available, requested] = raw.split("|");
    return new StockError("INSUFFICIENT_STOCK", message, {
      product: product?.trim(),
      available: Number(available),
      requested: Number(requested),
    });
  }
  for (const code of ["PRODUCT_NOT_FOUND", "FORBIDDEN", "EMPTY_CART", "INVALID_QUANTITY", "NO_BUSINESS", "ACCESS_EXPIRED"] as const) {
    if (message.includes(code)) return new StockError(code, message);
  }
  return new StockError("UNKNOWN", message);
}

/** Idempotency token: a resubmitted request returns the first transaction instead of doubling stock. */
export function newToken() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `t-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export type PaymentStatus = "PAID" | "PARTIAL" | "CREDIT";

export async function createSale(input: {
  items: StockLine[];
  paymentMethod?: PaymentMethod;
  customerName?: string | null;
  source?: string;
  token: string;
  paymentStatus?: PaymentStatus;
  amountPaid?: number | null;
  debtorName?: string | null;
  debtorPhone?: string | null;
  dueDate?: string | null;
}): Promise<string> {
  const { data, error } = await supabase.rpc("create_sale", {
    p_items: input.items as unknown as Json,
    p_payment_method: input.paymentMethod ?? "CASH",
    p_source: input.source ?? "MANUAL",
    p_client_token: input.token,
    p_payment_status: input.paymentStatus ?? "PAID",
    ...(input.customerName ? { p_customer_name: input.customerName } : {}),
    ...(input.amountPaid != null ? { p_amount_paid: input.amountPaid } : {}),
    ...(input.debtorName ? { p_debtor_name: input.debtorName } : {}),
    ...(input.debtorPhone ? { p_debtor_phone: input.debtorPhone } : {}),
    ...(input.dueDate ? { p_due_date: input.dueDate } : {}),
  });
  if (error) throw toStockError(error);
  return data as unknown as string;
}

export async function createPurchase(input: {
  items: StockLine[];
  supplierId?: string | null;
  invoiceNumber?: string | null;
  purchaseDate?: string | null;
  imagePath?: string | null;
  notes?: string | null;
  source?: string;
  token: string;
}): Promise<string> {
  const { data, error } = await supabase.rpc("create_purchase", {
    p_items: input.items as unknown as Json,
    p_source: input.source ?? "MANUAL",
    p_client_token: input.token,
    ...(input.supplierId ? { p_supplier_id: input.supplierId } : {}),
    ...(input.invoiceNumber ? { p_invoice_number: input.invoiceNumber } : {}),
    ...(input.purchaseDate ? { p_purchase_date: input.purchaseDate } : {}),
    ...(input.imagePath ? { p_image_url: input.imagePath } : {}),
    ...(input.notes ? { p_notes: input.notes } : {}),
  });
  if (error) throw toStockError(error);
  return data as unknown as string;
}

export async function adjustStock(productId: string, newStock: number, note?: string) {
  const { data, error } = await supabase.rpc("adjust_stock", {
    p_product_id: productId,
    p_new_stock: newStock,
    ...(note ? { p_note: note } : {}),
  });
  if (error) throw toStockError(error);
  return Number(data);
}

export async function recordReturn(productId: string, quantity: number, direction: "IN" | "OUT", note?: string) {
  const { data, error } = await supabase.rpc("record_return", {
    p_product_id: productId,
    p_quantity: quantity,
    p_direction: direction,
    ...(note ? { p_note: note } : {}),
  });
  if (error) throw toStockError(error);
  return Number(data);
}

/** Uploads a receipt/invoice photo into the private `invoices` bucket, business-scoped. */
export async function uploadInvoiceImage(businessId: string, file: File): Promise<string> {
  const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
  const path = `${businessId}/${Date.now()}-${Math.random().toString(16).slice(2)}.${ext}`;
  const { error } = await supabase.storage.from("invoices").upload(path, file, {
    contentType: file.type || "image/jpeg",
    upsert: false,
  });
  if (error) throw new StockError("UNKNOWN", error.message);
  return path;
}

export async function signedInvoiceUrl(path: string) {
  const { data } = await supabase.storage.from("invoices").createSignedUrl(path, 60 * 60);
  return data?.signedUrl ?? null;
}

export type Movement = {
  id: string;
  movement_type: string;
  quantity: number;
  previous_stock: number;
  new_stock: number;
  note: string | null;
  sale_id: string | null;
  purchase_id: string | null;
  created_at: string;
};

export async function fetchMovements(productId: string, limit = 50): Promise<Movement[]> {
  const { data, error } = await supabase
    .from("inventory_movements")
    .select("id, movement_type, quantity, previous_stock, new_stock, note, sale_id, purchase_id, created_at")
    .eq("product_id", productId)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []) as Movement[];
}

export type CatalogueProduct = {
  id: string;
  name: string;
  unit: string;
  current_stock: number;
  selling_price: number;
  purchase_price: number;
  times_sold?: number;
};

const SELECT_PRODUCT = "id, name, unit, current_stock, selling_price, purchase_price, times_sold";

/** Free-text catalogue search used by the POS and the voice product picker. */
export async function searchProducts(term: string, limit = 20): Promise<CatalogueProduct[]> {
  const cleaned = term.trim();
  let q = supabase.from("products").select(SELECT_PRODUCT).eq("is_active", true);
  if (cleaned) q = q.ilike("name", `%${cleaned}%`);
  const { data } = await q.order("times_sold", { ascending: false }).limit(limit);
  return (data ?? []) as CatalogueProduct[];
}

const STOP = new Set(["the", "a", "of", "na", "ya", "y", "cya", "mu", "ku", "za", "bya"]);

function tokens(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .split(/\s+/)
    .filter((w) => w.length >= 3 && !STOP.has(w));
}

/**
 * Matches a spoken/typed product name against the catalogue.
 * 1. exact-ish substring match, 2. word-overlap match. Returns null when unsure,
 * which makes the UI ask the user to pick the product instead of guessing.
 */
export async function matchProduct(name: string): Promise<CatalogueProduct | null> {
  const cleaned = name.trim();
  if (!cleaned) return null;

  const direct = await searchProducts(cleaned, 5);
  if (direct.length > 0) return direct[0] ?? null;

  const words = tokens(cleaned);
  if (words.length === 0) return null;

  const { data } = await supabase
    .from("products")
    .select(SELECT_PRODUCT)
    .eq("is_active", true)
    .or(words.map((w) => `name.ilike.%${w}%`).join(","))
    .order("times_sold", { ascending: false })
    .limit(25);

  const candidates = (data ?? []) as CatalogueProduct[];
  let best: CatalogueProduct | null = null;
  let bestScore = 0;
  for (const c of candidates) {
    const cw = tokens(c.name);
    const hits = words.filter((w) => cw.some((x) => x.startsWith(w) || w.startsWith(x))).length;
    const score = hits / words.length + Math.min(Number(c.times_sold ?? 0), 50) / 1000;
    if (hits > 0 && score > bestScore) {
      bestScore = score;
      best = c;
    }
  }
  // Require at least half of the spoken words to match before auto-selecting.
  return bestScore >= 0.5 ? best : null;
}

export function stockStatus(current: number, min: number): "OUT" | "LOW" | "OK" {
  if (Number(current) <= 0) return "OUT";
  if (Number(current) <= Number(min)) return "LOW";
  return "OK";
}
