import { listGoodyProducts } from "@/lib/goody/client";
import { authenticateSupabaseRequest } from "@/lib/supabase/request";

export async function GET(request: Request) {
  const auth = await authenticateSupabaseRequest(request);
  if (!auth) return Response.json({ error: "Sign in to browse Goody rewards." }, { status: 401 });

  try {
    const url = new URL(request.url);
    const page = Math.max(1, Number(url.searchParams.get("page") || 1));
    return Response.json(await listGoodyProducts(page, 24), {
      headers: { "Cache-Control": "private, max-age=300" },
    });
  } catch (error) {
    console.error("goody_catalog_failed", error);
    return Response.json({ error: error instanceof Error ? error.message : "Unable to load Goody rewards." }, { status: 502 });
  }
}
