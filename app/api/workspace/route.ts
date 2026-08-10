import { authenticateSupabaseRequest, isServerSupabaseConfigured } from "@/lib/supabase/request";
import { getSupabaseWorkspace, mutateSupabaseWorkspace } from "@/lib/supabase/workspace";

function userError(reason: unknown) {
  const message = reason instanceof Error ? reason.message : "We couldn't complete that request.";
  if (/duplicate key|already exists/i.test(message)) return "That record already exists.";
  if (/row-level security|access denied|permission denied/i.test(message)) return "You don't have permission to make that change.";
  return message;
}
export async function GET(request: Request) {
  if (!isServerSupabaseConfigured()) return Response.json({ error: "Supabase is not configured for this deployment." }, { status: 503 });
  const auth = await authenticateSupabaseRequest(request);
  if (!auth) return Response.json({ error: "Sign in to open your PerkJoy workspace." }, { status: 401 });

  try {
    return Response.json(await getSupabaseWorkspace(auth.client, auth.user), {
      headers: { "Cache-Control": "no-store, private" },
    });
  } catch (reason) {
    console.error("supabase_workspace_get_failed", reason);
    return Response.json({ error: userError(reason) }, { status: 500 });
  }
}

export async function POST(request: Request) {
  if (!isServerSupabaseConfigured()) return Response.json({ error: "Supabase is not configured for this deployment." }, { status: 503 });
  const auth = await authenticateSupabaseRequest(request);
  if (!auth) return Response.json({ error: "Sign in to continue." }, { status: 401 });

  try {
    const payload = await request.json() as Record<string, unknown>;
    return Response.json(await mutateSupabaseWorkspace(auth.client, auth.user, payload), {
      headers: { "Cache-Control": "no-store, private" },
    });
  } catch (reason) {
    console.error("supabase_workspace_mutation_failed", reason);
    return Response.json({ error: userError(reason) }, { status: 400 });
  }
}
