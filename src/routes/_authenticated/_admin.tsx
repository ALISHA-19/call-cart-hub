import { createFileRoute, redirect, Outlet } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { getMe } from "@/lib/marketplace.functions";

export const Route = createFileRoute("/_authenticated/_admin")({
  beforeLoad: async () => {
    const { data } = await supabase.auth.getUser();
    if (!data.user) throw redirect({ to: "/login" });
    const me = await getMe();
    if (!me.isAdmin) throw redirect({ to: "/dashboard" });
  },
  component: () => <Outlet />,
});
