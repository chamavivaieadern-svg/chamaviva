import { createClient } from "npm:@supabase/supabase-js@2";

const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "content-type, x-webhook-secret" };
const escapeHtml = (value: string) => value.replace(/[&<>"']/g, c => ({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;" }[c] || c));

Deno.serve(async (request: Request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (request.method !== "POST") return new Response("Method not allowed", { status: 405, headers: cors });

  const expected = Deno.env.get("EMAIL_WEBHOOK_SECRET");
  if (!expected || request.headers.get("x-webhook-secret") !== expected) {
    return new Response("Unauthorized", { status: 401, headers: cors });
  }

  try {
    const payload = await request.json();
    const notice = payload.record ?? payload;
    if (!notice.send_email) return Response.json({ skipped: true }, { headers: cors });

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const resendKey = Deno.env.get("RESEND_API_KEY");
    const from = Deno.env.get("EMAIL_FROM");
    if (!supabaseUrl || !serviceKey || !resendKey || !from) {
      return new Response("Missing email service configuration", { status: 500, headers: cors });
    }

    const admin = createClient(supabaseUrl, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } });
    const { data, error } = await admin.auth.admin.getUserById(notice.user_id);
    if (error || !data.user?.email) return new Response("Recipient email not found", { status: 404, headers: cors });

    const title = String(notice.title ?? "Aviso do CHAMA VIVA");
    const body = String(notice.body ?? "");
    const html = `<div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;color:#241b17"><div style="background:#e85d1d;color:white;padding:18px 22px;font-weight:bold;letter-spacing:2px">CHAMA VIVA</div><div style="padding:24px"><h2>${escapeHtml(title)}</h2><p style="line-height:1.6">${escapeHtml(body)}</p><p style="color:#8a7b71;font-size:12px">Mensagem automática do sistema CHAMA VIVA.</p></div></div>`;
    const sent = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { "Authorization": `Bearer ${resendKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from, to: [data.user.email], subject: "CHAMA VIVA: " + title, html, text: body }),
    });
    if (!sent.ok) return new Response(await sent.text(), { status: 502, headers: cors });
    return Response.json({ sent: true }, { headers: cors });
  } catch (error) {
    return new Response(error instanceof Error ? error.message : "Unexpected error", { status: 500, headers: cors });
  }
});
