import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export default async function WaitingPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role,status")
      .eq("id", user.id)
      .maybeSingle();

    // O administrador geral não precisa estar vinculado a uma igreja.
    if (profile?.role === "admin" && profile.status === "active") {
      redirect("/painel");
    }
  }

  return (
    <main className="auth-shell">
      <section className="auth-card">
        <div className="auth-brand">
          <span>🔥</span>
          <div><b>CHAMA VIVA</b><small>ACESSO PENDENTE</small></div>
        </div>
        <h1>Aguardando liberação</h1>
        <p className="auth-muted">
          Sua conta foi criada, mas ainda não recebeu uma função e o vínculo com sua igreja.
          Peça ao ADM para concluir seu cadastro.
        </p>
        <Link href="/login" className="waiting-link">Voltar ao login</Link>
      </section>
    </main>
  );
}
