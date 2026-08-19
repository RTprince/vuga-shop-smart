import { createServerFn } from "@tanstack/react-start";

const GATEWAY = "https://ai.gateway.lovable.dev/v1/chat/completions";
const MODEL = "google/gemini-3.5-flash";

export type VoiceAction = {
  intent:
    | "CREATE_PRODUCT"
    | "CREATE_SALE"
    | "CREATE_PURCHASE"
    | "GET_STOCK"
    | "UPDATE_PRODUCT"
    | "UNKNOWN";
  product?: string;
  quantity?: number;
  purchase_price?: number;
  selling_price?: number;
  unit?: string;
  confidence?: number;
  clarification?: string;
};

const SYSTEM = `You convert a shopkeeper's spoken sentence (Kinyarwanda or English) into ONE structured business command for a Rwandan shop app.
Return ONLY compact JSON, no markdown, with keys:
intent: one of CREATE_PRODUCT | CREATE_SALE | CREATE_PURCHASE | GET_STOCK | UPDATE_PRODUCT | UNKNOWN
product: product name as spoken (string, optional)
quantity: number (optional)
purchase_price: number RWF (optional)
selling_price: number RWF (optional)
unit: string (optional)
confidence: 0..1
clarification: short question in the same language if you are unsure (optional)
Kinyarwanda hints: "ongeramo"=add product, "ndagurishije"/"nagurishije"=sale, "naguze"=purchase, "mfite zingahe"=check stock, "hindura igiciro"=update price.
Kinyarwanda numbers: rimwe=1, ebyiri=2, bitatu=3, bine=4, bitanu=5, esheshatu=6, birindwi=7, umunani=8, icyenda=9, icumi=10, makumyabiri=20.
If the sentence is not a business command, use UNKNOWN with a clarification.`;

async function callGateway(body: unknown): Promise<string> {
  const key = process.env["LOVABLE_API_KEY"];
  if (!key) throw new Error("AI_NOT_CONFIGURED");
  const res = await fetch(GATEWAY, {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${key}` },
    body: JSON.stringify(body),
  });
  if (res.status === 429) throw new Error("RATE_LIMIT");
  if (res.status === 402) throw new Error("NO_CREDITS");
  if (!res.ok) throw new Error(`AI_ERROR_${res.status}`);
  const json = (await res.json()) as { choices?: { message?: { content?: string } }[] };
  return json.choices?.[0]?.message?.content ?? "";
}

function parseJson<T>(raw: string): T | null {
  const cleaned = raw.replace(/```json|```/g, "").trim();
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start < 0 || end < 0) return null;
  try {
    return JSON.parse(cleaned.slice(start, end + 1)) as T;
  } catch {
    return null;
  }
}

/** VOICE: transcript -> structured action. Never touches the database. */
export const interpretVoice = createServerFn({ method: "POST" })
  .inputValidator((input: { transcript: string; knownProducts?: string[] }) => input)
  .handler(async ({ data }): Promise<VoiceAction> => {
    const catalogue = (data.knownProducts ?? []).slice(0, 120).join(", ");
    try {
      const raw = await callGateway({
        model: MODEL,
        messages: [
          { role: "system", content: SYSTEM },
          {
            role: "user",
            content:
              (catalogue ? `Known products: ${catalogue}\n\n` : "") + `Sentence: ${data.transcript}`,
          },
        ],
      });
      const parsed = parseJson<VoiceAction>(raw);
      if (!parsed) return { intent: "UNKNOWN", confidence: 0 };
      return parsed;
    } catch {
      return { intent: "UNKNOWN", confidence: 0, clarification: "AI_UNAVAILABLE" };
    }
  });

export type OcrResult = {
  supplier_name?: string;
  invoice_number?: string;
  date?: string;
  items: { name: string; quantity: number; unit_price: number; total?: number }[];
  total?: number;
  confidence: number;
  mocked?: boolean;
};

const MOCK: OcrResult = {
  supplier_name: "ABC Ltd",
  invoice_number: "INV-1042",
  date: new Date().toISOString().slice(0, 10),
  items: [
    { name: "Sima (Cimerwa 50kg)", quantity: 20, unit_price: 12000, total: 240000 },
    { name: "Imisumari 3 inch", quantity: 10, unit_price: 1500, total: 15000 },
  ],
  total: 255000,
  confidence: 0.55,
  mocked: true,
};

/**
 * OCR: invoice photo -> extracted data. Results are NEVER written directly;
 * the UI always shows a review screen first.
 * TODO: swap the gateway call for a dedicated OCR provider when one is configured.
 */
export const extractInvoice = createServerFn({ method: "POST" })
  .inputValidator((input: { imageBase64: string }) => input)
  .handler(async ({ data }): Promise<OcrResult> => {
    try {
      const raw = await callGateway({
        model: MODEL,
        messages: [
          {
            role: "system",
            content: `Extract purchase invoice data. Return ONLY JSON: {"supplier_name":string,"invoice_number":string,"date":"YYYY-MM-DD","items":[{"name":string,"quantity":number,"unit_price":number,"total":number}],"total":number,"confidence":0..1}. Amounts are Rwandan Francs. If unreadable, return confidence 0 and empty items.`,
          },
          {
            role: "user",
            content: [
              { type: "text", text: "Read this supplier invoice." },
              { type: "image_url", image_url: { url: data.imageBase64 } },
            ],
          },
        ],
      });
      const parsed = parseJson<OcrResult>(raw);
      if (!parsed || !Array.isArray(parsed.items)) return { ...MOCK };
      return { ...parsed, items: parsed.items ?? [], confidence: parsed.confidence ?? 0.5 };
    } catch {
      return { ...MOCK };
    }
  });