import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

const roles = ["pastor", "leader", "driver", "director", "preacher", "musician"];

async function requireAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: NextResponse.json({ error: "Não autenticado." }, { status: 401 }) };
  const { data: profile } = await supabase.from("profiles").select("role,status").eq("id", user.id).single();
  if (profile?.role !== "admin" || profile.status !== "active") return { error: NextResponse.json({ error: "Somente o ADM pode administrar usuários." }, { status: 403 }) };
  return { user, supabase };
}

export async function GET() {
  try {
    const auth = await requireAdmin();
    if (auth.error) return auth.error;
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
    const users = (profiles || []).map((p) => ({
      ...p,
      email: (emailById.get(p.id) || "").endsWith("@matricula.chamaviva.invalid") ? "" : (emailById.get(p.id) || ""),
      church_id: churchByUser.get(p.id) || "",
    }));
    return NextResponse.json({ users });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Erro interno." }, { status: 500 });
  }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ userId: string }> }) {
  try {
    const auth = await requireAdmin();
    if (auth.error) return auth.error;
    const { user, supabase } = auth;
    const { userId } = await params;
    if (userId === user.id) return NextResponse.json({ error: "Use as configurações da sua própria conta para alterar seus dados." }, { status: 400 });
    const body = await request.json() as {
      status?: string; full_name?: string; email?: string; matricula?: string; role?: string; church_id?: string;
      new_password?: string; phone?: string; whatsapp?: string; birth_date?: string | null; address?: string;
    };
    const admin = createAdminClient();
    if (body.status !== undefined) {
      if (!["active", "blocked"].includes(body.status)) return NextResponse.json({ error: "Status inválido." }, { status: 400 });
      const { error } = await admin.from("profiles").update({ status: body.status }).eq("id", userId);
      if (error) throw error;
      await admin.from("audit_logs").insert({ actor_id: user.id, action: body.status === "blocked" ? "user.blocked" : "user.unblocked", target_table: "profiles", target_id: userId });
      return NextResponse.json({ ok: true });
    }

    const fullName = body.full_name?.trim() || "";
    const suppliedEmail = body.email?.trim().toLowerCase() || "";
    const matricula = body.matricula?.trim().toUpperCase().replace(/\s+/g, "") || "";
    const email = suppliedEmail || (matricula ? matricula.toLowerCase() + "@matricula.chamaviva.invalid" : "");
    if (!fullName || !body.role || !roles.includes(body.role) || !body.church_id || (!suppliedEmail && !matricula)) {
      return NextResponse.json({ error: "Informe nome, e-mail ou matrícula, função e igreja." }, { status: 400 });
    }
    if (suppliedEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(suppliedEmail)) return NextResponse.json({ error: "Informe um e-mail válido." }, { status: 400 });
    if (matricula && !/^[A-Z0-9-]{3,30}$/.test(matricula)) return NextResponse.json({ error: "A matrícula deve ter de 3 a 30 caracteres: letras, números ou hífen." }, { status: 400 });
    if (body.new_password && body.new_password.length < 8) return NextResponse.json({ error: "A nova senha precisa ter pelo menos 8 caracteres." }, { status: 400 });
    if (body.birth_date && !/^\d{4}-\d{2}-\d{2}$/.test(body.birth_date)) return NextResponse.json({ error: "Data de nascimento inválida." }, { status: 400 });

    if (matricula) {
      const { data: duplicate, error } = await admin.from("profiles").select("id").ilike("matricula", matricula).neq("id", userId).maybeSingle();
      if (error) throw error;
      if (duplicate) return NextResponse.json({ error: "Este número de matrícula já está cadastrado." }, { status: 409 });
    }
    const { data: church, error: churchError } = await supabase.from("churches").select("id").eq("id", body.church_id).maybeSingle();
    if (churchError || !church) return NextResponse.json({ error: "Igreja não encontrada ou sem acesso." }, { status: 400 });

    const authUpdate: { email: string; email_confirm: boolean; password?: string; user_metadata: { full_name: string } } = { email, email_confirm: true, user_metadata: { full_name: fullName } };
    if (body.new_password) authUpdate.password = body.new_password;
    const { error: authError } = await admin.auth.admin.updateUserById(userId, authUpdate);
    if (authError) return NextResponse.json({ error: authError.message }, { status: 400 });

    const { error: profileError } = await admin.from("profiles").update({
      full_name: fullName, role: body.role, matricula: matricula || null,
      phone: body.phone?.trim() || null, whatsapp: body.whatsapp?.trim() || null,
      birth_date: body.birth_date || null, address: body.address?.trim() || null,
    }).eq("id", userId);
    if (profileError) return NextResponse.json({ error: "Falha ao atualizar o perfil: " + profileError.message }, { status: 500 });

    const { error: membershipError } = await admin.from("church_memberships").upsert({ user_id: userId, church_id: body.church_id, membership_role: body.role }, { onConflict: "church_id,user_id" });
    if (membershipError) return NextResponse.json({ error: "Perfil atualizado, mas não foi possível atualizar a igreja: " + membershipError.message }, { status: 500 });
    const { error: oldMembershipsError } = await admin.from("church_memberships").delete().eq("user_id", userId).neq("church_id", body.church_id);
    if (oldMembershipsError) return NextResponse.json({ error: "Perfil atualizado, mas não foi possível remover o vínculo antigo com outra igreja: " + oldMembershipsError.message }, { status: 500 });

    await admin.from("audit_logs").insert({ actor_id: user.id, action: "user.updated", target_table: "profiles", target_id: userId, details: { email_changed: Boolean(suppliedEmail), matricula_changed: true, role: body.role, church_id: body.church_id, password_changed: Boolean(body.new_password), personal_info_updated: true } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Erro interno." }, { status: 500 });
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ userId: string }> }) {
  try {
    const auth = await requireAdmin();
    if (auth.error) return auth.error;
    const { user } = auth;
    const { userId } = await params;
    if (userId === user.id) return NextResponse.json({ error: "Você não pode remover sua própria conta." }, { status: 400 });
    const admin = createAdminClient();
    await admin.from("audit_logs").insert({ actor_id: user.id, action: "user.removed", target_table: "profiles", target_id: userId });
    const { error } = await admin.auth.admin.deleteUser(userId);
    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Erro interno." }, { status: 500 });
  }
}
