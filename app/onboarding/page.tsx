import type { Metadata } from "next";
import { OnboardingWizard } from "@/components/onboarding/OnboardingWizard";
import { VendorDashboard } from "@/components/vendor/VendorDashboard";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { ensureVendorAccount } from "@/lib/supabase/vendor-account";

export const metadata: Metadata = { title: "Set up PerkJoy" };
export default async function Page() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (user) {
    if (user.user_metadata?.account_type === "vendor") {
      await ensureVendorAccount(user);
      return <VendorDashboard onboarding />;
    }
    const membership = await supabase.from("vendor_members").select("vendor_id").eq("user_id", user.id).limit(1).maybeSingle();
    if (membership.data) return <VendorDashboard onboarding />;
  }
  return <OnboardingWizard />;
}
