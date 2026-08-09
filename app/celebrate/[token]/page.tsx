import type { Metadata } from "next";
import { CelebrationProfileForm } from "@/components/profile/CelebrationProfileForm";

export const metadata: Metadata = { title: "Create Your Celebration Profile", robots: { index: false, follow: false } };

export default async function Page({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  return <CelebrationProfileForm token={token} />;
}
