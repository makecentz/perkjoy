import type { Metadata } from "next";
import { PublicInfoPage } from "@/components/marketing/PublicInfoPage";

export const metadata: Metadata = { title: "Terms of Service", description: "Terms for company accounts, subscriptions, rewards, and local fulfillment through PerkJoy." };
export default function Page() { return <PublicInfoPage kind="terms" />; }
