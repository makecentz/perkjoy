import type { Metadata } from "next";
import { AuthForm } from "@/components/auth/AuthForm";
export const metadata: Metadata = { title: "Start your trial" };
export default function Page() { return <AuthForm mode="signup" />; }
