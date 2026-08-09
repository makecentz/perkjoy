import type { Metadata } from "next";
import { PublicInfoPage } from "@/components/marketing/PublicInfoPage";

export const metadata: Metadata = { title: "Privacy", description: "How PerkJoy handles company and employee celebration information." };
export default function Page() { return <PublicInfoPage kind="privacy" />; }
