import * as React from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export type Role = "owner" | "manager" | "salesperson";

export type Membership = {
  business_id: string;
  role: Role;
  business: { id: string; name: string; phone: string | null; address: string | null; currency: string };
};

type AuthCtx = {
  session: Session | null;
  loading: boolean;
  membership: Membership | null;
  membershipLoading: boolean;
  refreshMembership: () => void;
};

const Ctx = React.createContext<AuthCtx>({
  session: null,
  loading: true,
  membership: null,
  membershipLoading: true,
  refreshMembership: () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = React.useState<Session | null>(null);
  const [loading, setLoading] = React.useState(true);
  const queryClient = useQueryClient();

  React.useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((event, next) => {
      setSession(next);
      setLoading(false);
      if (event === "SIGNED_IN" || event === "SIGNED_OUT" || event === "USER_UPDATED") {
        queryClient.invalidateQueries();
      }
    });
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });
    return () => sub.subscription.unsubscribe();
  }, [queryClient]);

  const userId = session?.user.id ?? null;

  const membershipQuery = useQuery({
    queryKey: ["membership", userId],
    enabled: !!userId,
    queryFn: async (): Promise<Membership | null> => {
      const { data, error } = await supabase
        .from("business_users")
        .select("business_id, role, business:businesses(id, name, phone, address, currency)")
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      if (!data || !data.business) return null;
      return data as unknown as Membership;
    },
  });

  const value: AuthCtx = {
    session,
    loading,
    membership: membershipQuery.data ?? null,
    membershipLoading: !!userId && membershipQuery.isLoading,
    refreshMembership: () => {
      void queryClient.invalidateQueries({ queryKey: ["membership"] });
    },
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth() {
  return React.useContext(Ctx);
}

export function useRole(): Role | null {
  return useAuth().membership?.role ?? null;
}

export function useCan() {
  const role = useRole();
  return {
    role,
    manageProducts: role === "owner" || role === "manager",
    manageStock: role === "owner" || role === "manager",
    deleteThings: role === "owner" || role === "manager",
    viewReports: role === "owner" || role === "manager",
    manageTeam: role === "owner",
  };
}

export async function signOutEverywhere(queryClient: ReturnType<typeof useQueryClient>) {
  await queryClient.cancelQueries();
  queryClient.clear();
  await supabase.auth.signOut();
}