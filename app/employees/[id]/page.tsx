import type { Metadata } from "next";
import { EmployeeDetailPage } from "@/components/app/SecondaryPages";

export const metadata: Metadata = { title: "Employee Profile" };
export default function Page() { return <EmployeeDetailPage />; }
