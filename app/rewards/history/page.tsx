import type { Metadata } from "next";
import { AppShell } from "@/components/app/AppShell";

export const metadata: Metadata = { title: "Reward History" };
export default function Page() { return <AppShell view="reward-history" />; }
