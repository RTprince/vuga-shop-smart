import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type AccessStatus = "TRIAL" | "ACTIVE" | "EXPIRED" | "SUSPENDED" | "NONE";

export type AccessState = {
  business_id?: string;
  name?: string;
  status: AccessStatus;
  trial_ends_at?: string;
  days_left?: number;
  employee_mode?: boolean;
  access_ok: boolean;
  owner_email?: string | null;
  owner_phone?: string | null;
  is_platform_admin: boolean;
};

/** Server-computed access state. The database also enforces this on every write. */
export function useAccess() {
  return useQuery({
    queryKey: ["access-state"],
    staleTime: 60_000,
    queryFn: async (): Promise<AccessState> => {
      const { data, error } = await supabase.rpc("business_access_state");
      if (error) throw error;
      return data as unknown as AccessState;
    },
  });
}
