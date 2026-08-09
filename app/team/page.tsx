import type { Metadata } from "next";
import { AppShell } from "@/components/app/AppShell";
export const metadata: Metadata = { title: "Team" };
export default function Page() { return <AppShell view="team" />; }
