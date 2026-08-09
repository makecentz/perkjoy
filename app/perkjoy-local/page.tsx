import type { Metadata } from "next";
import { AppShell } from "@/components/app/AppShell";
export const metadata: Metadata = { title: "PerkJoy Local" };
export default function Page() { return <AppShell view="perkjoy-local" />; }
