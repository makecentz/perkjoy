import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { VendorDashboard } from "@/components/vendor/VendorDashboard";
import { createServerSupabaseClient } from "@/lib/supabase/server";
export const metadata: Metadata = { title: "Vendor Dashboard" };
export default async function Page() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const membership = await supabase.from("vendor_members").select("vendor_id").eq("user_id", user.id).limit(1).maybeSingle();
  if (!membership.data) redirect("/dashboard");
  return <VendorDashboard />;
}
