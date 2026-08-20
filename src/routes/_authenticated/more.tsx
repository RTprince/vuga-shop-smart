import { createFileRoute } from "@tanstack/react-router";
import { useQueryClient, useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useT } from "@/lib/i18n";
import { useAuth, useCan, signOutEverywhere } from "@/lib/auth";

export const Route = createFileRoute("/_authenticated/more")({ component: MorePage });

function MorePage() {
  const { t } = useT();
  const { membership } = useAuth();
  const can = useCan();
  const queryClient = useQueryClient();

  const seed = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.rpc("seed_demo_data");
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(t("saved"));
      void queryClient.invalidateQueries();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-4">
      <section className="rounded-3xl border bg-card p-4">
        <h2 className="font-bold">{membership?.business.name}</h2>
        <p className="text-sm text-muted-foreground">{membership?.business.phone ?? ""}</p>
        <p className="mt-1 text-sm text-muted-foreground">{can.role ? t(can.role) : ""}</p>
      </section>

      {can.manageProducts && (
        <Button variant="outline" className="h-14 w-full" disabled={seed.isPending} onClick={() => seed.mutate()}>
          {t("importNow")}
        </Button>
      )}

      <Button variant="ghost" className="h-14 w-full" onClick={() => void signOutEverywhere(queryClient)}>
        {t("signOut")}
      </Button>
    </div>
  );
}