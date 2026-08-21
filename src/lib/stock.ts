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

export type PaymentMethod = "CASH" | "MOBILE_MONEY" | "BANK" | "OTHER";

export type StockLine = { product_id: string; quantity: number; unit_price?: number };

export type StockErrorCode =
  | "INSUFFICIENT_STOCK"
  | "PRODUCT_NOT_FOUND"
  | "FORBIDDEN"
  | "EMPTY_CART"
  | "INVALID_QUANTITY"
  | "NO_BUSINESS"
  | "UNKNOWN";

export class StockError extends Error {
  code: StockErrorCode;
  product?: string;
  available?: number;
  requested?: number;
  constructor(code: StockErrorCode, message: string, extra?: { product?: string; available?: number; requested?: number }) {
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
  for (const code of ["PRODUCT_NOT_FOUND", "FORBIDDEN", "EMPTY_CART", "INVALID_QUANTITY", "NO_BUSINESS"] as const) {
    if (message.includes(code)) return new StockError(code, message);
  }
  return new StockError("UNKNOWN", message);
}

/** Idempotency token: a resubmitted request returns the first transaction instead of doubling stock. */
export function newToken() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `t-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export async function createSale(input: {
  items: StockLine[];
  paymentMethod?: PaymentMethod;
  customerName?: string | null;
  source?: string;
  token: string;
}): Promise<string> {
  const { data, error } = await supabase.rpc("create_sale", {
    p_items: input.items as unknown as never,
    p_payment_method: input.paymentMethod ?? "CASH",
    p_customer_name: input.customerName ?? undefined,
    p_source: input.source ?? "MANUAL",
    p_client_token: input.token,
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
    p_items: input.items as unknown as never,
    p_supplier_id: input.supplierId ?? undefined,
    p_invoice_number: input.invoiceNumber ?? undefined,
    p_purchase_date: input.purchaseDate ?? undefined,
    p_image_url: input.imagePath ?? undefined,
    p_source: input.source ?? "MANUAL",
    p_notes: input.notes ?? undefined,
    p_client_token: input.token,
  });
  if (error) throw toStockError(error);
  return data as unknown as string;
}

export async function adjustStock(productId: string, newStock: number, note?: string) {
  const { data, error } = await supabase.rpc("adjust_stock", {
    p_product_id: productId,
    p_new_stock: newStock,
    p_note: note ?? undefined,
  });
  if (error) throw toStockError(error);
  return Number(data);
}

export async function recordReturn(productId: string, quantity: number, direction: "IN" | "OUT", note?: string) {
  const { data, error } = await supabase.rpc("record_return", {
    p_product_id: productId,
    p_quantity: quantity,
    p_direction: direction,
    p_note: note ?? undefined,
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

/** Matches a spoken/typed product name against the catalogue. Returns null when unsure. */
export async function matchProduct(name: string) {
  const cleaned = name.trim();
  if (!cleaned) return null;
  const { data } = await supabase
    .from("products")
    .select("id, name, unit, current_stock, selling_price, purchase_price")
    .eq("is_active", true)
    .ilike("name", `%${cleaned}%`)
    .order("times_sold", { ascending: false })
    .limit(1);
  return data?.[0] ?? null;
}

export function stockStatus(current: number, min: number): "OUT" | "LOW" | "OK" {
  if (Number(current) <= 0) return "OUT";
  if (Number(current) <= Number(min)) return "LOW";
  return "OK";
}
