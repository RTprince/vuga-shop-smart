import { Volume2, TrendingUp, TrendingDown, AlertTriangle, Package, Star, Coins, CalendarCheck, Info } from "lucide-react";
import type { Insight } from "@/lib/advisor";
import { tts } from "@/lib/tts";
import { useT } from "@/lib/i18n";

const ICONS: Record<Insight["kind"], typeof Info> = {
  SALES_TREND: TrendingUp,
  PROFIT_TREND: Coins,
  BEST_SELLER: Star,
  RESTOCK: Package,
  SLOW_STOCK: TrendingDown,
  STRONG_PROFIT: Coins,
  BEST_DAY: CalendarCheck,
  CRITICAL_STOCK: AlertTriangle,
  NO_DATA: Info,
};

const TONE: Record<Insight["tone"], string> = {
  good: "bg-secondary text-secondary-foreground",
  warn: "bg-accent text-accent-foreground",
  bad: "bg-destructive/10 text-destructive",
  neutral: "bg-muted text-muted-foreground",
};

export function AdviceCard({ insight }: { insight: Insight }) {
  const { lang } = useT();
  const Icon = ICONS[insight.kind];
  const canSpeak = tts.isSupported();

  return (
    <article className="rounded-3xl border bg-card p-4">
      <div className="flex items-start gap-3">
        <span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${TONE[insight.tone]}`}>
          <Icon className="h-6 w-6" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <p className="truncate text-sm font-semibold">{insight.title}</p>
            {canSpeak && (
              <button
                type="button"
                aria-label="listen"
                onClick={() => tts.speak(`${insight.title}. ${insight.detail}`, lang)}
                className="rounded-full p-2 text-muted-foreground active:scale-95"
              >
                <Volume2 className="h-5 w-5" />
              </button>
            )}
          </div>
          {insight.value && <p className="text-2xl font-extrabold leading-tight">{insight.value}</p>}
          <p className="mt-1 text-sm leading-snug text-muted-foreground">{insight.detail}</p>
          {insight.badge && (
            <span className="mt-2 inline-block rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
              {insight.badge}
            </span>
          )}
        </div>
      </div>
    </article>
  );
}
