import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/AppShell";
import { useAuth } from "@/lib/auth";
import { useT } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import * as React from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/auth" });
    return { user: data.user };
  },
  component: AuthedLayout,
});

function AuthedLayout() {
  const { membership, membershipLoading } = useAuth();
  if (membershipLoading) {
    return <div className="flex min-h-screen items-center justify-center text-muted-foreground">...</div>;
  }
  if (!membership) return <BusinessSetup />;
  return (
    <AppShell>
      <Outlet />
    </AppShell>
  );
}

function BusinessSetup() {
  const { t } = useT();
  const { refreshMembership } = useAuth();
  const [name, setName] = React.useState("");
  const [phone, setPhone] = React.useState("");
  const [address, setAddress] = React.useState("");

  const create = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.rpc("setup_business", {
        p_name: name,
        p_phone: phone || undefined,
        p_address: address || undefined,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(t("saved"));
      refreshMembership();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-md space-y-4 rounded-3xl border bg-card p-6 shadow-sm">
        <h1 className="text-2xl font-bold">{t("setupBusiness")}</h1>
        <div className="space-y-2">
          <Label>{t("businessName")}</Label>
          <Input className="h-12" value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label>{t("phone")}</Label>
          <Input className="h-12" value={phone} onChange={(e) => setPhone(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label>{t("address")}</Label>
          <Input className="h-12" value={address} onChange={(e) => setAddress(e.target.value)} />
        </div>
        <Button
          className="h-14 w-full text-base"
          disabled={!name.trim() || create.isPending}
          onClick={() => create.mutate()}
        >
          {t("confirm")}
        </Button>
      </div>
    </div>
  );
}