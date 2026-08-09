import type { Metadata } from "next";
import { PublicInfoPage } from "@/components/marketing/PublicInfoPage";

export const metadata: Metadata = { title: "Contact PerkJoy", description: "Talk with PerkJoy about employee celebration automation, local fulfillment, or support." };
export default function Page() { return <PublicInfoPage kind="contact" />; }
