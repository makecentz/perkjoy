import type { Metadata } from "next";
import { AppShell } from "@/components/app/AppShell";
export const metadata: Metadata = { title: "Celebrations" };
export default function Page() { return <AppShell view="celebrations" />; }
