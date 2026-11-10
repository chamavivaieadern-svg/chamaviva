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

export async function PATCH(request: Request, { params }: { params: Promise<{ userId: string }> }) {
  try {
    const auth = await requireAdmin();
    if (auth.error) return auth.error;
    const { user, supabase } = auth;
    const { userId } = await params;
    if (userId === user.id) return NextResponse.json({ error: "Use as configurações da sua própria conta para alterar seus dados." }, { status: 400 });
    const body = await request.json() as { status?: string; full_name?: string; email?: string; role?: string; church_id?: string; new_password?: string };
    const admin = createAdminClient();

    if (body.status !== undefined) {
      if (!["active", "blocked"].includes(body.status)) return NextResponse.json({ error: "Status inválido." }, { status: 400 });
      const { error } = await admin.from("profiles").update({ status: body.status }).eq("id", userId);
      if (error) throw error;
      await admin.from("audit_logs").insert({ actor_id: user.id, action: body.status === "blocked" ? "user.blocked" : "user.unblocked", target_table: "profiles", target_id: userId });
      return NextResponse.json({ ok: true });
    }

    const fullName = body.full_name?.trim();
    const email = body.email?.trim().toLowerCase();
    if (!fullName || !body.role || !roles.includes(body.role) || !body.church_id) return NextResponse.json({ error: "Informe nome, função e igreja." }, { status: 400 });
    if (body.email !== undefined && (!email || !email.includes("@"))) return NextResponse.json({ error: "Informe um e-mail válido ou deixe o campo vazio para manter o atual." }, { status: 400 });
    if (body.new_password && body.new_password.length < 8) return NextResponse.json({ error: "A nova senha precisa ter pelo menos 8 caracteres." }, { status: 400 });
    const { data: church, error: churchError } = await supabase.from("churches").select("id").eq("id", body.church_id).maybeSingle();
    if (churchError || !church) return NextResponse.json({ error: "Igreja não encontrada ou sem acesso." }, { status: 400 });

    const authUpdate: { email?: string; email_confirm?: boolean; password?: string; user_metadata: { full_name: string } } = { user_metadata: { full_name: fullName } };
    if (email) { authUpdate.email = email; authUpdate.email_confirm = true; }
    if (body.new_password) authUpdate.password = body.new_password;
    const { error: authError } = await admin.auth.admin.updateUserById(userId, authUpdate);
    if (authError) return NextResponse.json({ error: authError.message }, { status: 400 });

    const { error: profileError } = await admin.from("profiles").update({ full_name: fullName, role: body.role }).eq("id", userId);
    if (profileError) return NextResponse.json({ error: "Falha ao atualizar o perfil: " + profileError.message }, { status: 500 });

    // Garante que cada usuário comum permaneça vinculado somente à igreja selecionada.
    const { error: membershipError } = await admin.from("church_memberships").upsert(
      { user_id: userId, church_id: body.church_id, membership_role: body.role },
      { onConflict: "church_id,user_id" }
    );
    if (membershipError) return NextResponse.json({ error: "Perfil atualizado, mas não foi possível atualizar a igreja: " + membershipError.message }, { status: 500 });

    const { error: oldMembershipsError } = await admin
      .from("church_memberships")
      .delete()
      .eq("user_id", userId)
      .neq("church_id", body.church_id);
    if (oldMembershipsError) return NextResponse.json({ error: "Perfil atualizado, mas não foi possível remover o vínculo antigo com outra igreja: " + oldMembershipsError.message }, { status: 500 });

    await admin.from("audit_logs").insert({
      actor_id: user.id, action: "user.updated", target_table: "profiles", target_id: userId,
      details: { email_changed: Boolean(email), role: body.role, church_id: body.church_id, password_changed: Boolean(body.new_password) },
    });
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
