import type { Metadata } from "next";
import { AppShell } from "@/components/app/AppShell";
export const metadata: Metadata = { title: "Dashboard" };
export default function Page() { return <AppShell view="dashboard" />; }
