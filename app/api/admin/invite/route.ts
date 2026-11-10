import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

const allowedRoles = ["pastor", "leader", "driver", "director", "preacher", "musician"];

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });

    const { data: profile } = await supabase.from("profiles").select("role,status").eq("id", user.id).single();
    if (profile?.role !== "admin" || profile.status !== "active") {
      return NextResponse.json({ error: "Somente o ADM pode criar usuários." }, { status: 403 });
    }

    const body = await request.json() as {
      email?: string;
      password?: string;
      full_name?: string;
      role?: string;
      church_id?: string;
    };

    const email = body.email?.trim().toLowerCase();
    const fullName = body.full_name?.trim();
    const password = body.password;

    if (!email || !fullName || !password || !body.role || !allowedRoles.includes(body.role) || !body.church_id) {
      return NextResponse.json({ error: "Preencha nome, e-mail, senha, função e igreja." }, { status: 400 });
    }
    if (password.length < 8) {
      return NextResponse.json({ error: "A senha inicial precisa ter pelo menos 8 caracteres." }, { status: 400 });
    }

    // Valida a igreja usando a sessão autenticada e as políticas RLS do ADM.
    const { data: church, error: churchError } = await supabase
      .from("churches")
      .select("id")
      .eq("id", body.church_id)
      .maybeSingle();

    if (churchError) {
      return NextResponse.json({ error: "Não foi possível validar a igreja. Atualize a página e entre novamente." }, { status: 403 });
    }
    if (!church) {
      return NextResponse.json({ error: "A igreja selecionada não está acessível para sua sessão. Atualize a lista e tente novamente." }, { status: 404 });
    }

    const admin = createAdminClient();
    const { data, error } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: fullName },
    });

    if (error || !data.user) {
      const message = error?.message ?? "Não foi possível criar a conta.";
      const duplicate = /already|registered|exists/i.test(message);
      return NextResponse.json({
        error: duplicate ? "Já existe uma conta cadastrada com este e-mail." : message,
      }, { status: 400 });
    }

    const userId = data.user.id;

    const { error: profileError } = await admin.from("profiles").upsert({
      id: userId,
      full_name: fullName,
      role: body.role,
      status: "active",
    });

    if (profileError) {
      await admin.auth.admin.deleteUser(userId);
      return NextResponse.json({ error: "Não foi possível configurar o perfil. A conta criada foi cancelada; tente novamente." }, { status: 500 });
    }

    const { error: membershipError } = await admin.from("church_memberships").upsert(
      { user_id: userId, church_id: body.church_id, membership_role: body.role },
      { onConflict: "church_id,user_id" }
    );

    if (membershipError) {
      await admin.auth.admin.deleteUser(userId);
      return NextResponse.json({ error: "Não foi possível vincular o usuário à igreja. A criação foi cancelada; tente novamente." }, { status: 500 });
    }

    await admin.from("audit_logs").insert({
      actor_id: user.id,
      action: "user.created_by_admin",
      target_table: "profiles",
      target_id: userId,
      details: { email, role: body.role, church_id: body.church_id },
    });

    return NextResponse.json({ ok: true, created: email });
  } catch (error) {
    return NextResponse.json({
      error: error instanceof Error ? error.message : "Erro interno ao criar usuário.",
    }, { status: 500 });
  }
}
