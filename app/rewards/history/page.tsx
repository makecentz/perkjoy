import type { Metadata } from "next";
import { RewardHistoryPage } from "@/components/app/SecondaryPages";

export const metadata: Metadata = { title: "Reward History" };
export default function Page() { return <RewardHistoryPage />; }
