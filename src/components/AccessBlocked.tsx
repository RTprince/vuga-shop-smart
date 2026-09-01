import { Boxes, Wallet, ShieldCheck, Sparkles, Timer, Mail, Phone, LogOut } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { useT } from "@/lib/i18n";
import { signOutEverywhere } from "@/lib/auth";
import type { AccessState } from "@/lib/access";

const VALUE = [
  {
    icon: Boxes,
    rw: { t: "MENYA UBUBIKO BWAWE", d: "Reka guhanahana: menya neza icyo ufite mu iduka." },
    en: { t: "KNOW YOUR STOCK", d: "Stop guessing what is available." },
  },
  {
    icon: Wallet,
    rw: { t: "MENYA AMAFARANGA YAWE", d: "Reba igurisha, ibyakoreshejwe, inyungu n'imyenda mu buryo bwumvikana." },
    en: { t: "KNOW YOUR MONEY", d: "See sales, expenses, profit, and unpaid credit clearly." },
  },
  {
    icon: ShieldCheck,
    rw: { t: "RINDA UBUCURUZI BWAWE", d: "Amakuru y'iduka ryawe abikwa neza kandi ari ayawe wenyine." },
    en: { t: "PROTECT YOUR BUSINESS", d: "Keep business records organised and securely separated." },
  },
  {
    icon: Sparkles,
    rw: { t: "FATA IBYEMEZO BYIZA", d: "Baza umujyanama w'ubucuruzi ku makuru nyayo y'iduka ryawe." },
    en: { t: "MAKE BETTER DECISIONS", d: "Ask the Business Analyst questions about your real business data." },
  },
  {
    icon: Timer,
    rw: { t: "ZIGAMA UMWANYA", d: "Andika igurisha n'ibyaguzwe vuba, nta mabaruwa aremereye." },
    en: { t: "SAVE TIME", d: "Record sales and purchases quickly without complicated spreadsheets." },
  },
];

export function AccessBlocked({ access }: { access: AccessState }) {
  const { lang } = useT();
  const queryClient = useQueryClient();
  const rw = lang === "rw";
  const suspended = access.status === "SUSPENDED";

  return (
    <div className="min-h-screen bg-gradient-to-b from-secondary/40 via-background to-background">
      <div className="mx-auto w-full max-w-2xl px-5 py-10">
        <div className="flex items-center justify-between">
          <span className="text-xl font-extrabold text-primary">RTFlow</span>
          <Button variant="ghost" size="sm" onClick={() => void signOutEverywhere(queryClient)}>
            <LogOut className="mr-1 h-4 w-4" />
            {rw ? "Sohoka" : "Sign out"}
          </Button>
        </div>

        <div className="mt-8 rounded-3xl border bg-card p-6 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-primary">
            {suspended ? (rw ? "Konti yahagaritswe" : "Account suspended") : rw ? "Igihe cy'ikizamini kirangiye" : "Trial ended"}
          </p>
          <h1 className="mt-2 text-3xl font-extrabold leading-tight">
            {rw ? "Iduka ryawe rikeneye kugenzurwa neza." : "Your shop deserves better control."}
          </h1>
          <p className="mt-3 text-muted-foreground">
            {rw
              ? "RTFlow igufasha kumenya ibyo ufite, ibyo wagurishije, abakurimo umwenda, n'aho amafaranga yawe ajya — byose ahantu hamwe."
              : "RTFlow helps you know what you have, what you sold, who owes you, and where your money is going — all in one simple place."}
          </p>
        </div>

        <ul className="mt-5 grid gap-3 sm:grid-cols-2">
          {VALUE.map((v) => {
            const copy = rw ? v.rw : v.en;
            const Icon = v.icon;
            return (
              <li key={copy.t} className="rounded-2xl border bg-card p-4">
                <Icon className="h-6 w-6 text-primary" />
                <p className="mt-3 text-sm font-bold">{copy.t}</p>
                <p className="mt-1 text-sm text-muted-foreground">{copy.d}</p>
              </li>
            );
          })}
        </ul>

        <div className="mt-6 rounded-3xl border bg-card p-6 text-center shadow-sm">
          <p className="text-lg font-bold">
            {suspended
              ? rw
                ? "Konti yawe yahagaritswe by'agateganyo."
                : "Your account is currently suspended."
              : rw
                ? "Igihe cyawe cy'ikizamini cy'iminsi 5 kirangiye."
                : "Your free trial has ended."}
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            {rw
              ? "Amakuru y'iduka ryawe yose arabitswe. Vugana na nyiri RTFlow kugira ngo ukomeze."
              : "All your shop data is safely kept. Contact the RTFlow owner to continue using the service."}
          </p>

          <div className="mt-4 space-y-2">
            {access.owner_email ? (
              <a
                href={`mailto:${access.owner_email}`}
                className="flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 font-semibold text-primary-foreground"
              >
                <Mail className="h-4 w-4" />
                {access.owner_email}
              </a>
            ) : null}
            {access.owner_phone ? (
              <a
                href={`tel:${access.owner_phone}`}
                className="flex items-center justify-center gap-2 rounded-xl border px-4 py-3 font-semibold"
              >
                <Phone className="h-4 w-4" />
                {access.owner_phone}
              </a>
            ) : null}
            {!access.owner_email && !access.owner_phone ? (
              <p className="rounded-xl border border-dashed p-3 text-sm text-muted-foreground">
                {rw
                  ? "Aderesi ya nyiri serivisi ntiratangwa. Nyiri urubuga agomba kuyandika mu igenamiterere rya platform."
                  : "Owner contact is not configured yet. The platform admin must set it in platform settings."}
              </p>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
