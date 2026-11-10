import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
    const { data: profile } = await supabase.from("profiles").select("role,status").eq("id", user.id).single();
    if (profile?.role !== "admin" || profile.status !== "active") return NextResponse.json({ error: "Somente o ADM pode administrar usuários." }, { status: 403 });

    const admin = createAdminClient();
    const [{ data: profiles, error: profilesError }, { data: memberships, error: membershipsError }, { data: authUsers, error: authError }] = await Promise.all([
      admin.from("profiles").select("id,full_name,matricula,role,status,phone,whatsapp,birth_date,address").order("created_at", { ascending: false }),
      admin.from("church_memberships").select("user_id,church_id"),
      admin.auth.admin.listUsers({ page: 1, perPage: 1000 }),
    ]);
    if (profilesError) throw profilesError;
    if (membershipsError) throw membershipsError;
    if (authError) throw authError;
    const emailById = new Map((authUsers?.users || []).map((u) => [u.id, u.email || ""]));
    const churchByUser = new Map((memberships || []).map((m) => [m.user_id, m.church_id]));
    return NextResponse.json({ users: (profiles || []).map((p) => ({ ...p, email: (emailById.get(p.id) || "").endsWith("@matricula.chamaviva.invalid") ? "" : (emailById.get(p.id) || ""), church_id: churchByUser.get(p.id) || "" })) });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Erro interno." }, { status: 500 });
  }
}
