import { createFileRoute, Link } from "@tanstack/react-router";
import { Mic, ScanBarcode, Camera, FileSpreadsheet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useT } from "@/lib/i18n";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "RTFlow — Gucunga duka ryawe byoroshye" },
      {
        name: "description",
        content:
          "RTFlow ifasha ba nyiri amaduka mu Rwanda gucunga ibicuruzwa, igurisha, ibyaguzwe n'ububiko — ukoresheje ijwi, barcode n'amafoto.",
      },
      { property: "og:title", content: "RTFlow — Gucunga duka ryawe byoroshye" },
      {
        property: "og:description",
        content: "Ibicuruzwa, igurisha, ibyaguzwe n'ububiko — byoroshye, mu Kinyarwanda.",
      },
    ],
  }),
  component: Landing,
});

const FEATURES = [
  { icon: Mic, rw: "Vuga, byandikwe", en: "Speak, it records" },
  { icon: ScanBarcode, rw: "Soma barcode", en: "Scan barcodes" },
  { icon: Camera, rw: "Fata ifoto y'inyemezabuguzi", en: "Snap invoices" },
  { icon: FileSpreadsheet, rw: "Injiza Excel", en: "Import Excel" },
];

function Landing() {
  const { t, lang, setLang } = useT();
  return (
    <div className="min-h-screen bg-background">
      <header className="flex items-center justify-between px-5 py-4">
        <span className="text-xl font-extrabold text-primary">RTFlow</span>
        <Button variant="ghost" size="sm" onClick={() => setLang(lang === "rw" ? "en" : "rw")}>
          {lang.toUpperCase()}
        </Button>
      </header>
      <main className="mx-auto max-w-2xl px-5 pb-16 pt-6">
        <h1 className="text-4xl font-extrabold leading-tight">
          {lang === "rw"
            ? "Duka ryawe, ricungwe neza kandi vuba."
            : "Your shop, managed fast and simply."}
        </h1>
        <p className="mt-4 text-lg text-muted-foreground">{t("tagline")}</p>
        <Link to="/auth">
          <Button className="mt-6 h-14 w-full text-base sm:w-auto sm:px-10">{t("signIn")}</Button>
        </Link>
        <ul className="mt-10 grid gap-3 sm:grid-cols-2">
          {FEATURES.map((f) => (
            <li key={f.en} className="flex items-center gap-3 rounded-2xl border bg-card p-4">
              <f.icon className="h-6 w-6 shrink-0 text-primary" />
              <span className="font-medium">{lang === "rw" ? f.rw : f.en}</span>
            </li>
          ))}
        </ul>
      </main>
    </div>
  );
}
