import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

const restorableRoles = ["pastor", "leader", "driver", "director", "preacher", "musician", "trip_manager"];

export async function PATCH(request: Request, { params }: { params: Promise<{ userId: string }> }) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });

    const { data: actor } = await supabase.from("profiles").select("role,status").eq("id", user.id).maybeSingle();
    if (actor?.role !== "admin" || actor.status !== "active") {
      return NextResponse.json({ error: "Somente um ADM ativo pode alterar administradores." }, { status: 403 });
    }
    const { data: assurance, error: assuranceError } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
    if (assuranceError || assurance?.currentLevel !== "aal2") {
      return NextResponse.json({ error: "Confirme seu segundo fator de autenticação antes de continuar." }, { status: 403 });
    }

    const { userId } = await params;
    if (userId === user.id) return NextResponse.json({ error: "Você não pode alterar o seu próprio nível de administrador." }, { status: 400 });
    const body = await request.json() as { is_admin?: boolean };
    if (typeof body.is_admin !== "boolean") return NextResponse.json({ error: "Informe se o usuário deve ser administrador." }, { status: 400 });

    const admin = createAdminClient();
    const { data: target, error: targetError } = await admin.from("profiles")
      .select("id,full_name,role,status,admin_previous_role").eq("id", userId).maybeSingle();
    if (targetError) throw targetError;
    if (!target || target.status !== "active") return NextResponse.json({ error: "O usuário não existe ou não está ativo." }, { status: 404 });

    if (body.is_admin) {
      if (target.role === "admin") return NextResponse.json({ ok: true, unchanged: true });
      if (!restorableRoles.includes(target.role)) return NextResponse.json({ error: "A função atual deste usuário não pode ser promovida com segurança." }, { status: 400 });
      const { error: updateError } = await admin.from("profiles")
        .update({ role: "admin", admin_previous_role: target.role }).eq("id", userId);
      if (updateError) throw updateError;
      const { error: auditError } = await admin.from("audit_logs").insert({
        actor_id: user.id, action: "user.promoted_to_admin", target_table: "profiles", target_id: userId,
        details: { previous_role: target.role, new_role: "admin" },
      });
      if (auditError) {
        await admin.from("profiles").update({ role: target.role, admin_previous_role: null }).eq("id", userId);
        throw auditError;
      }
      return NextResponse.json({ ok: true, role: "admin" });
    }

    if (target.role !== "admin") return NextResponse.json({ ok: true, unchanged: true });
    if (!target.admin_previous_role || !restorableRoles.includes(target.admin_previous_role)) {
      return NextResponse.json({ error: "Este é um ADM principal sem função anterior registrada e não pode ser rebaixado por esta tela." }, { status: 400 });
    }
    const { count, error: countError } = await admin.from("profiles")
      .select("id", { count: "exact", head: true }).eq("role", "admin").eq("status", "active");
    if (countError) throw countError;
    if ((count ?? 0) <= 1) return NextResponse.json({ error: "O sistema precisa manter pelo menos um ADM ativo." }, { status: 409 });

    const restoredRole = target.admin_previous_role;
    const { error: updateError } = await admin.from("profiles")
      .update({ role: restoredRole, admin_previous_role: null }).eq("id", userId);
    if (updateError) throw updateError;
    const { error: auditError } = await admin.from("audit_logs").insert({
      actor_id: user.id, action: "user.admin_access_removed", target_table: "profiles", target_id: userId,
      details: { previous_role: "admin", restored_role: restoredRole },
    });
    if (auditError) {
      await admin.from("profiles").update({ role: "admin", admin_previous_role: restoredRole }).eq("id", userId);
      throw auditError;
    }
    return NextResponse.json({ ok: true, role: restoredRole });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Erro interno." }, { status: 500 });
  }
}