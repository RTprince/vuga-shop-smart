import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { AdviceFrequency } from "@/lib/advisor";

export type AdviceSettings = { frequency: AdviceFrequency; seenAt: string | null };

const FREQS: AdviceFrequency[] = ["daily", "weekly", "monthly", "off"];

export function useAdviceSettings() {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["advice-settings"],
    queryFn: async (): Promise<AdviceSettings> => {
      const { data, error } = await supabase
        .from("profiles")
        .select("advice_frequency, advice_seen_at")
        .maybeSingle();
      if (error) throw error;
      const raw = (data?.advice_frequency ?? "daily") as AdviceFrequency;
      return {
        frequency: FREQS.includes(raw) ? raw : "daily",
        seenAt: data?.advice_seen_at ?? null,
      };
    },
  });

  const setFrequency = useMutation({
    mutationFn: async (frequency: AdviceFrequency) => {
      const { data: auth } = await supabase.auth.getUser();
      const id = auth.user?.id;
      if (!id) throw new Error("NOT_AUTHENTICATED");
      const { error } = await supabase.from("profiles").update({ advice_frequency: frequency }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["advice-settings"] }),
  });

  /** Marks normal advice as seen so it does not reappear until the next interval. */
  const markSeen = useMutation({
    mutationFn: async () => {
      const { data: auth } = await supabase.auth.getUser();
      const id = auth.user?.id;
      if (!id) return;
      const { error } = await supabase
        .from("profiles")
        .update({ advice_seen_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["advice-settings"] }),
  });

  return { settings: query.data, isLoading: query.isLoading, setFrequency, markSeen };
}

export const ADVICE_FREQUENCIES = FREQS;
