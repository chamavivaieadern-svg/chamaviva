import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

const allowedRoles = ["pastor","leader","driver","director","preacher","musician"];

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });

    const { data: assurance } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
    if (assurance?.currentLevel !== "aal2") return NextResponse.json({ error: "Confirme sua autenticação de dois fatores." }, { status: 403 });

    const { data: profile } = await supabase.from("profiles").select("role,status").eq("id",user.id).single();
    if (profile?.role !== "admin" || profile.status !== "active") return NextResponse.json({ error: "Somente o ADM pode convidar usuários." }, { status: 403 });

    const body = await request.json() as { email?: string; full_name?: string; role?: string; church_id?: string };
    const email = body.email?.trim().toLowerCase();
    const fullName = body.full_name?.trim();
    if (!email || !fullName || !body.role || !allowedRoles.includes(body.role) || !body.church_id) return NextResponse.json({ error: "Informe nome, e-mail e uma função válida." }, { status: 400 });

    const admin = createAdminClient();
    const { data: church, error: churchError } = await admin
      .from("churches")
      .select("id")
      .eq("id", body.church_id)
      .maybeSingle();
    if (churchError) throw churchError;
    if (!church) return NextResponse.json({ error: "A igreja selecionada não foi encontrada. Atualize a lista e tente novamente." }, { status: 404 });

    const { data, error } = await admin.auth.admin.inviteUserByEmail(email, { data: { full_name: fullName }, redirectTo: new URL("/auth/callback", request.url).toString() });
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });

    const { error: profileError } = await admin.from("profiles").upsert({ id: data.user.id, full_name: fullName, role: body.role, status: "active" });
    if (profileError) return NextResponse.json({ error: "Convite enviado, mas não foi possível configurar o perfil. Contate o administrador técnico." }, { status: 500 });

    const { error: membershipError } = await admin
      .from("church_memberships")
      .upsert(
        { user_id: data.user.id, church_id: body.church_id, membership_role: body.role },
        { onConflict: "church_id,user_id" }
      );
    if (membershipError) {
      // A conta fica sem acesso até o ADM corrigir o vínculo obrigatório.
      await admin.from("profiles").update({ status: "invited" }).eq("id", data.user.id);
      return NextResponse.json({ error: "O convite foi criado, mas o vínculo com a igreja falhou. A conta permanecerá sem acesso até a correção pelo ADM." }, { status: 500 });
    }
    await admin.from("audit_logs").insert({ actor_id: user.id, action: "user.invited", target_table: "profiles", target_id: data.user.id, details: { email, role: body.role, church_id: body.church_id ?? null } });
    return NextResponse.json({ ok: true, invited: email });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Erro interno." }, { status: 500 });
  }
}
