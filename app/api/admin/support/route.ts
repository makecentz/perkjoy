import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { authenticateSupabaseRequest } from "@/lib/supabase/request";
import type { Database } from "@/lib/supabase/database.types";

async function authorized(request: Request) {
  const auth = await authenticateSupabaseRequest(request);
  if (!auth) return null;
  const profile = await auth.client.from("profiles").select("is_super_admin").eq("id", auth.user.id).single();
  return profile.data?.is_super_admin ? auth : null;
}

export async function GET(request: Request) {
  if (!await authorized(request)) return Response.json({ error: "Super Admin access is required." }, { status: 403 });
  const admin = createAdminSupabaseClient();
  const conversations = await admin.from("support_conversations").select("id,organization_id,subject,status,priority,last_message_at,created_at").order("last_message_at", { ascending: false });
  if (conversations.error) return Response.json({ error: conversations.error.message }, { status: 500 });
  const ids = (conversations.data || []).map((item: { id: string }) => item.id);
  const orgIds = [...new Set((conversations.data || []).map((item: { organization_id: string }) => item.organization_id))] as string[];
  const [messages, organizations] = await Promise.all([
    ids.length ? admin.from("support_messages").select("id,conversation_id,sender_role,body,created_at").in("conversation_id", ids).order("created_at") : Promise.resolve({ data: [], error: null }),
    orgIds.length ? admin.from("organizations").select("id,name").in("id", orgIds) : Promise.resolve({ data: [], error: null }),
  ]);
  const error = messages.error || organizations.error;
  if (error) return Response.json({ error: error.message }, { status: 500 });
  const names = new Map((organizations.data || []).map((item: { id: string; name: string }) => [item.id, item.name]));
  return Response.json({ conversations: (conversations.data || []).map((item: { organization_id: string }) => ({ ...item, organizationName: names.get(item.organization_id) || "Unknown client" })), messages: messages.data || [] });
}

export async function PATCH(request: Request) {
  const auth = await authorized(request);
  if (!auth) return Response.json({ error: "Super Admin access is required." }, { status: 403 });
  const body = await request.json() as { conversationId?: string; message?: string; status?: string; priority?: string };
  if (!body.conversationId) return Response.json({ error: "Conversation is required." }, { status: 400 });
  const statuses = new Set(["open", "pending", "resolved", "closed"]);
  const priorities = new Set(["low", "normal", "high", "urgent"]);
  if (body.status && !statuses.has(body.status)) return Response.json({ error: "Invalid support status." }, { status: 400 });
  if (body.priority && !priorities.has(body.priority)) return Response.json({ error: "Invalid support priority." }, { status: 400 });
  const admin = createAdminSupabaseClient();
  if (body.message?.trim()) {
    const message = body.message.trim();
    if (message.length > 4000) return Response.json({ error: "Messages must be under 4,000 characters." }, { status: 400 });
    const inserted = await admin.from("support_messages").insert({ conversation_id: body.conversationId, sender_id: auth.user.id, sender_role: "admin", body: message });
    if (inserted.error) return Response.json({ error: inserted.error.message }, { status: 500 });
  }
  const status = body.status || (body.message?.trim() ? "pending" : undefined);
  const now = new Date().toISOString();
  const update: Database["public"]["Tables"]["support_conversations"]["Update"] = { last_message_at: now };
  if (status) { update.status = status; update.resolved_at = status === "resolved" ? now : null; update.closed_at = status === "closed" ? now : null; }
  if (body.priority) update.priority = body.priority;
  const updated = await admin.from("support_conversations").update(update).eq("id", body.conversationId).select("id").single();
  if (updated.error) return Response.json({ error: updated.error.message }, { status: 500 });
  return Response.json({ conversationId: body.conversationId });
}
