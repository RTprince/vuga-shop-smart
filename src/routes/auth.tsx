import * as React from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { Eye, EyeOff } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useT } from "@/lib/i18n";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Injira | DukaSmart" },
      { name: "description", content: "Injira muri DukaSmart ucunge duka ryawe: ibicuruzwa, igurisha n'ububiko." },
      { property: "og:title", content: "Injira | DukaSmart" },
      { property: "og:description", content: "Injira muri DukaSmart ucunge duka ryawe." },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const { t } = useT();
  const navigate = useNavigate();
  const { session } = useAuth();
  const [mode, setMode] = React.useState<"in" | "up" | "reset">("in");
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [fullName, setFullName] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [showPassword, setShowPassword] = React.useState(false);

  React.useEffect(() => {
    if (session) void navigate({ to: "/dashboard", replace: true });
  }, [session, navigate]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "in") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      } else if (mode === "up") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { full_name: fullName }, emailRedirectTo: window.location.origin },
        });
        if (error) throw error;
        toast.success(t("saved"));
      } else {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/auth`,
        });
        if (error) throw error;
        toast.success(t("saved"));
      }
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-10">
      <div className="w-full max-w-md space-y-5 rounded-3xl border bg-card p-6 shadow-sm">
        <div>
          <h1 className="text-3xl font-extrabold text-primary">DukaSmart</h1>
          <p className="text-sm text-muted-foreground">{t("tagline")}</p>
        </div>
        <form onSubmit={submit} className="space-y-4">
          {mode === "up" && (
            <div className="space-y-2">
              <Label>{t("fullName")}</Label>
              <Input className="h-12" value={fullName} onChange={(e) => setFullName(e.target.value)} />
            </div>
          )}
          <div className="space-y-2">
            <Label>{t("email")}</Label>
            <Input className="h-12" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          {mode !== "reset" && (
            <div className="space-y-2">
              <Label>{t("password")}</Label>
              <div className="relative">
                <Input
                  className="h-12 pr-12"
                  type={showPassword ? "text" : "password"}
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>
          )}
          <Button type="submit" className="h-14 w-full text-base" disabled={busy}>
            {mode === "in" ? t("signIn") : mode === "up" ? t("signUp") : t("confirm")}
          </Button>
        </form>
        <div className="flex justify-between text-sm">
          <button className="text-primary underline" onClick={() => setMode(mode === "in" ? "up" : "in")}>
            {mode === "in" ? t("signUp") : t("signIn")}
          </button>
          <button className="text-muted-foreground underline" onClick={() => setMode("reset")}>
            {t("forgotPassword")}
          </button>
        </div>
      </div>
    </div>
  );
}