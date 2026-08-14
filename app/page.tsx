import { MarketingHome } from "@/components/marketing/MarketingHome";
import { redirect } from "next/navigation";

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ code?: string; next?: string }>;
}) {
  const params = await searchParams;
  if (params.code) {
    const callbackParams = new URLSearchParams({ code: params.code });
    if (params.next?.startsWith("/") && !params.next.startsWith("//")) {
      callbackParams.set("next", params.next);
    }
    redirect(`/auth/callback?${callbackParams.toString()}`);
  }

  return <MarketingHome />;
}
