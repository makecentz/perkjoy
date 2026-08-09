import type { Metadata } from "next";
import { ResetPasswordForm } from "@/components/auth/ResetPasswordForm";
export const metadata: Metadata = { title: "Choose a new password" };
export default function Page() { return <ResetPasswordForm />; }
