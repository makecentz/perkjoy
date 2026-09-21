import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { authenticateSupabaseRequest } from "@/lib/supabase/request";

async function context(request: Request) {
  const auth = await authenticateSupabaseRequest(request);
  if (!auth) return null;
  const membership = await auth.client.from("organization_members").select("organization_id").eq("user_id", auth.user.id).limit(1).maybeSingle();
  if (!membership.data) return null;
  return { auth, organizationId: membership.data.organization_id };
}

export async function GET(request: Request) {
  const value = await context(request);
  if (!value) return Response.json({ error: "Sign in to contact support." }, { status: 401 });
  const admin = createAdminSupabaseClient();
  const conversations = await admin.from("support_conversations").select("id,subject,status,priority,last_message_at,created_at").eq("organization_id", value.organizationId).order("last_message_at", { ascending: false });
  if (conversations.error) return Response.json({ error: conversations.error.message }, { status: 500 });
  const ids = (conversations.data || []).map((item: { id: string }) => item.id);
  const messages = ids.length ? await admin.from("support_messages").select("id,conversation_id,sender_role,body,created_at").in("conversation_id", ids).order("created_at") : { data: [], error: null };
  if (messages.error) return Response.json({ error: messages.error.message }, { status: 500 });
  return Response.json({ conversations: conversations.data || [], messages: messages.data || [] });
}

export async function POST(request: Request) {
  const value = await context(request);
  if (!value) return Response.json({ error: "Sign in to contact support." }, { status: 401 });
  const body = await request.json() as { action?: "create" | "reply"; conversationId?: string; subject?: string; message?: string };
  const message = body.message?.trim();
  if (!message || message.length > 4000) return Response.json({ error: "Enter a message up to 4,000 characters." }, { status: 400 });
  const admin = createAdminSupabaseClient();
  let conversationId = body.conversationId;
  if (body.action === "create") {
    const subject = body.subject?.trim();
    if (!subject || subject.length > 180) return Response.json({ error: "Enter a subject up to 180 characters." }, { status: 400 });
    const created = await admin.from("support_conversations").insert({ organization_id: value.organizationId, opened_by: value.auth.user.id, subject }).select("id").single();
    if (created.error) return Response.json({ error: created.error.message }, { status: 500 });
    conversationId = created.data.id;
  } else {
    if (!conversationId) return Response.json({ error: "Conversation is required." }, { status: 400 });
    const conversation = await admin.from("support_conversations").select("id,status").eq("id", conversationId).eq("organization_id", value.organizationId).maybeSingle();
    if (!conversation.data) return Response.json({ error: "Support conversation not found." }, { status: 404 });
    if (conversation.data.status === "closed") return Response.json({ error: "This conversation is closed. Start a new one instead." }, { status: 409 });
  }
  if (!conversationId) return Response.json({ error: "Unable to create conversation." }, { status: 500 });
  const inserted = await admin.from("support_messages").insert({ conversation_id: conversationId, sender_id: value.auth.user.id, sender_role: "client", body: message });
  if (inserted.error) return Response.json({ error: inserted.error.message }, { status: 500 });
  await admin.from("support_conversations").update({ status: "open", last_message_at: new Date().toISOString(), resolved_at: null, closed_at: null }).eq("id", conversationId);
  return Response.json({ conversationId }, { status: 201 });
}
