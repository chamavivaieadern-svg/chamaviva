import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

const allowedRoles = ["pastor", "leader", "driver", "director", "preacher", "musician"];

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
    const { data: adminProfile } = await supabase.from("profiles").select("role,status").eq("id", user.id).single();
    if (adminProfile?.role !== "admin" || adminProfile.status !== "active") return NextResponse.json({ error: "Somente o ADM pode criar usuários." }, { status: 403 });

    const body = await request.json() as { email?: string; matricula?: string; password?: string; full_name?: string; role?: string; church_id?: string };
    const suppliedEmail = body.email?.trim().toLowerCase() || "";
    const matricula = body.matricula?.trim().toUpperCase().replace(/\s+/g, "") || "";
    const email = suppliedEmail || (matricula ? \`\${matricula.toLowerCase()}@matricula.chamaviva.invalid\` : "");
    const fullName = body.full_name?.trim() || "";
    const password = body.password || "";

    if (!fullName || (!suppliedEmail && !matricula) || !body.role || !allowedRoles.includes(body.role) || !body.church_id) {
      return NextResponse.json({ error: "Preencha nome, e-mail ou matrícula, função e igreja." }, { status: 400 });
    }
    if (suppliedEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(suppliedEmail)) return NextResponse.json({ error: "Informe um e-mail válido." }, { status: 400 });
    if (matricula && !/^[A-Z0-9-]{3,30}$/.test(matricula)) return NextResponse.json({ error: "A matrícula deve ter de 3 a 30 caracteres: letras, números ou hífen." }, { status: 400 });
    if (password.length < 8) return NextResponse.json({ error: "A senha inicial precisa ter pelo menos 8 caracteres." }, { status: 400 });

    const { data: church, error: churchError } = await supabase.from("churches").select("id").eq("id", body.church_id).maybeSingle();
    if (churchError || !church) return NextResponse.json({ error: "Igreja não encontrada ou sem acesso. Atualize a lista e tente novamente." }, { status: 400 });

    const admin = createAdminClient();
    if (matricula) {
      const { data: existing, error } = await admin.from("profiles").select("id").ilike("matricula", matricula).maybeSingle();
      if (error) throw error;
      if (existing) return NextResponse.json({ error: "Este número de matrícula já está cadastrado." }, { status: 409 });
    }
    const { data, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { full_name: fullName } });
    if (error || !data.user) {
      const message = error?.message ?? "Não foi possível criar a conta.";
      return NextResponse.json({ error: /already|registered|exists/i.test(message) ? "Já existe uma conta com este e-mail ou matrícula." : message }, { status: 400 });
    }

    const userId = data.user.id;
    const { error: profileError } = await admin.from("profiles").upsert({ id: userId, full_name: fullName, role: body.role, status: "active", matricula: matricula || null });
    if (profileError) {
      await admin.auth.admin.deleteUser(userId);
      return NextResponse.json({ error: "Não foi possível configurar o perfil. A criação foi cancelada." }, { status: 500 });
    }
    const { error: membershipError } = await admin.from("church_memberships").upsert({ user_id: userId, church_id: body.church_id, membership_role: body.role }, { onConflict: "church_id,user_id" });
    if (membershipError) {
      await admin.auth.admin.deleteUser(userId);
      return NextResponse.json({ error: "Não foi possível vincular o usuário à igreja. A criação foi cancelada." }, { status: 500 });
    }
    await admin.from("audit_logs").insert({ actor_id: user.id, action: "user.created_by_admin", target_table: "profiles", target_id: userId, details: { email: suppliedEmail || null, matricula: matricula || null, role: body.role, church_id: body.church_id } });
    return NextResponse.json({ ok: true, created: fullName, matricula: matricula || null });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Erro interno ao criar usuário." }, { status: 500 });
  }
}
