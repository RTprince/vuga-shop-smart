import * as React from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { Home, Package, ShoppingCart, Truck, Mic, LogOut, Languages } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth, signOutEverywhere } from "@/lib/auth";
import { useT } from "@/lib/i18n";
import { VoiceSheet } from "@/components/VoiceSheet";

const NAV = [
  { to: "/dashboard", key: "dashboard", icon: Home },
  { to: "/products", key: "products", icon: Package },
  { to: "/sales", key: "sales", icon: ShoppingCart },
  { to: "/purchases", key: "purchases", icon: Truck },
] as const;

export function AppShell({ children }: { children: React.ReactNode }) {
  const { t, lang, setLang } = useT();
  const { membership } = useAuth();
  const queryClient = useQueryClient();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [voiceOpen, setVoiceOpen] = React.useState(false);

  return (
    <div className="min-h-screen bg-background pb-28">
      <header className="sticky top-0 z-30 flex items-center justify-between border-b bg-card/95 px-4 py-3 backdrop-blur">
        <div>
          <p className="text-xs text-muted-foreground">RTFlow</p>
          <h1 className="text-base font-bold leading-tight">{membership?.business.name ?? "..."}</h1>
        </div>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="sm" onClick={() => setLang(lang === "rw" ? "en" : "rw")}>
            <Languages className="mr-1 h-4 w-4" />
            {lang.toUpperCase()}
          </Button>
          <Button variant="ghost" size="icon" aria-label={t("signOut")} onClick={() => void signOutEverywhere(queryClient)}>
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </header>

      <main className="mx-auto w-full max-w-3xl px-4 py-4">{children}</main>

      <button
        type="button"
        onClick={() => setVoiceOpen(true)}
        className="fixed bottom-24 right-4 z-40 flex h-16 w-16 items-center justify-center rounded-full bg-accent text-accent-foreground shadow-xl active:scale-95"
        aria-label={t("voice")}
      >
        <Mic className="h-7 w-7" />
      </button>

      <nav className="fixed inset-x-0 bottom-0 z-30 border-t bg-card">
        <div className="mx-auto flex max-w-3xl">
          {NAV.map((item) => {
            const active = pathname.startsWith(item.to);
            const Icon = item.icon;
            return (
              <Link
                key={item.to}
                to={item.to}
                className={`flex flex-1 flex-col items-center gap-1 py-3 text-[11px] font-medium ${active ? "text-primary" : "text-muted-foreground"}`}
              >
                <Icon className="h-5 w-5" />
                {t(item.key)}
              </Link>
            );
          })}
          <Link
            to="/more"
            className={`flex flex-1 flex-col items-center gap-1 py-3 text-[11px] font-medium ${pathname.startsWith("/more") ? "text-primary" : "text-muted-foreground"}`}
          >
            <span className="text-lg leading-5">•••</span>
            {t("more")}
          </Link>
        </div>
      </nav>

      <VoiceSheet open={voiceOpen} onOpenChange={setVoiceOpen} />
    </div>
  );
}