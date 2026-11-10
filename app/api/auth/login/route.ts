import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

function normalizeMatricula(value: string) {
  return value.trim().toUpperCase().replace(/\s+/g, "");
}

export async function POST(request: Request) {
  try {
    const body = await request.json() as { identifier?: string; password?: string };
    const identifier = body.identifier?.trim() || "";
    const password = body.password || "";
    if (!identifier || !password) return NextResponse.json({ error: "Informe seu e-mail ou número de matrícula e a senha." }, { status: 400 });

    let email = identifier.toLowerCase();
    if (!identifier.includes("@")) {
      const matricula = normalizeMatricula(identifier);
      if (!/^[A-Z0-9-]{3,30}$/.test(matricula)) return NextResponse.json({ error: "Número de matrícula inválido." }, { status: 400 });
      const admin = createAdminClient();
      const { data: profile, error } = await admin.from("profiles").select("id,status").ilike("matricula", matricula).maybeSingle();
      if (error) throw error;
      if (!profile) return NextResponse.json({ error: "E-mail/matrícula ou senha incorretos." }, { status: 401 });
      if (profile.status !== "active") return NextResponse.json({ error: "Esta conta não está ativa. Procure o administrador." }, { status: 403 });
      const { data: authData, error: authLookupError } = await admin.auth.admin.getUserById(profile.id);
      if (authLookupError || !authData.user?.email) return NextResponse.json({ error: "Não foi possível localizar o acesso desta matrícula." }, { status: 401 });
      email = authData.user.email;
    }

    const supabase = await createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return NextResponse.json({ error: "E-mail/matrícula ou senha incorretos." }, { status: 401 });
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Não foi possível confirmar o acesso." }, { status: 401 });
    const admin = createAdminClient();
    const { data: profile } = await admin.from("profiles").select("status").eq("id", user.id).maybeSingle();
    if (profile?.status !== "active") {
      await supabase.auth.signOut();
      return NextResponse.json({ error: "Esta conta não está ativa. Procure o administrador." }, { status: 403 });
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Não foi possível entrar." }, { status: 500 });
  }
}
