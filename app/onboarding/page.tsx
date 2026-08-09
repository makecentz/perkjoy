import type { Metadata } from "next";
import { OnboardingWizard } from "@/components/onboarding/OnboardingWizard";

export const metadata: Metadata = { title: "Set up PerkJoy" };
export default function Page() { return <OnboardingWizard />; }
