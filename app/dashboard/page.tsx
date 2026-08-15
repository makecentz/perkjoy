import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/app/AppShell";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { ensureVendorAccount } from "@/lib/supabase/vendor-account";
export const metadata: Metadata = { title: "Dashboard" };
export default async function Page() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (user) {
    if (user.user_metadata?.account_type === "vendor") {
      await ensureVendorAccount(user);
      redirect("/vendor");
    }
    const membership = await supabase.from("vendor_members").select("vendor_id").eq("user_id", user.id).limit(1).maybeSingle();
    if (membership.data) redirect("/vendor");
  }
  return <AppShell view="dashboard" />;
}
