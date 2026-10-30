"use client";

import { FormEvent, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Flame, LockKeyhole, Mail } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const params = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(""); setBusy(true);
    try {
      const supabase = createClient();
      const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
      if (signInError) throw signInError;
      const { data: assurance } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
      if (assurance.nextLevel === "aal2" && assurance.currentLevel !== "aal2") {
        router.push("/seguranca/2fa"); return;
      }
      router.push(params.get("next") || "/painel"); router.refresh();
    } catch (e) { setError(e instanceof Error ? e.message : "Não foi possível entrar."); }
    finally { setBusy(false); }
  }

  return <main className="auth-shell"><section className="auth-card">
    <div className="auth-brand"><span><Flame size={27} fill="currentColor"/></span><div><b>CHAMA VIVA</b><small>GESTÃO E EVANGELISMO</small></div></div>
    <p className="auth-kicker">ACESSO SEGURO</p><h1>Bem-vindo de volta</h1><p className="auth-muted">Entre com seu e-mail e sua senha individuais.</p>
    <form onSubmit={submit} className="auth-form">
      <label>E-mail<div className="auth-input"><Mail size={17}/><input type="email" autoComplete="username" required value={email} onChange={e=>setEmail(e.target.value)} placeholder="voce@exemplo.com"/></div></label>
      <label>Senha<div className="auth-input"><LockKeyhole size={17}/><input type="password" autoComplete="current-password" required value={password} onChange={e=>setPassword(e.target.value)} placeholder="Sua senha"/></div></label>
      {error && <p className="auth-error" role="alert">{error}</p>}
      <button disabled={busy}>{busy ? "Entrando..." : "Entrar no CHAMA VIVA"}</button>
    </form>
    <p className="auth-foot">Acesso somente por convite do administrador.</p>
  </section></main>;
}
