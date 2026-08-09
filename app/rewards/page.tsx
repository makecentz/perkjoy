import type { Metadata } from "next";
import { AppShell } from "@/components/app/AppShell";
export const metadata: Metadata = { title: "Rewards" };
export default function Page() { return <AppShell view="rewards" />; }
