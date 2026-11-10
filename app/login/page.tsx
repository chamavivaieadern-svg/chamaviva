"use client";

import { type FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Flame, LockKeyhole, UserRound } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [blocked, setBlocked] = useState(false);
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [recovering, setRecovering] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setBlocked(params.get("blocked") === "1");
    if (params.get("error") === "auth") setError("O link é inválido ou expirou. Solicite um novo.");
    if (params.get("invite") === "accepted") setNotice("Convite confirmado. Você já pode entrar.");
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(""); setNotice(""); setBusy(true);
    try {
      const response = await fetch("/api/auth/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ identifier, password }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Não foi possível entrar.");
      const next = new URLSearchParams(window.location.search).get("next");
      router.push(next?.startsWith("/") && !next.startsWith("//") ? next : "/painel");
      router.refresh();
    } catch (e) { setError(e instanceof Error ? e.message : "Não foi possível entrar."); }
    finally { setBusy(false); }
  }

  async function recoverPassword() {
    setError(""); setNotice("");
    if (!identifier.includes("@")) { setError("Para recuperar a senha, informe o e-mail cadastrado. Se sua conta usa matrícula, procure o ADM."); return; }
    setRecovering(true);
    try {
      const { createClient } = await import("@/lib/supabase/client");
      const supabase = createClient();
      const { error: recoveryError } = await supabase.auth.resetPasswordForEmail(identifier.trim(), { redirectTo: `${window.location.origin}/auth/callback?next=/auth/reset-password` });
      if (recoveryError) throw recoveryError;
      setNotice("Se o e-mail estiver cadastrado, enviaremos um link de recuperação. Verifique também o spam.");
    } catch (e) { setError(e instanceof Error ? e.message : "Não foi possível solicitar a recuperação."); }
    finally { setRecovering(false); }
  }

  return <main className="auth-shell"><section className="auth-card">
    <a href="/" className="auth-back-link">← Página inicial</a>
    <div className="auth-brand"><span><Flame size={27} fill="currentColor"/></span><div><b>CHAMA VIVA</b><small>GESTÃO E EVANGELISMO</small></div></div>
    <p className="auth-kicker">ACESSO SEGURO</p><h1>Bem-vindo de volta</h1><p className="auth-muted">Entre com seu e-mail ou número de matrícula e sua senha.</p>
    {blocked && <p className="auth-error">Esta conta está bloqueada. Procure o administrador.</p>}
    <form onSubmit={submit} className="auth-form">
      <label>E-mail ou número de matrícula<div className="auth-input"><UserRound size={17}/><input type="text" autoComplete="username" required value={identifier} onChange={e=>setIdentifier(e.target.value)} placeholder="Seu e-mail ou matrícula"/></div></label>
      <label>Senha<div className="auth-input"><LockKeyhole size={17}/><input type="password" autoComplete="current-password" required value={password} onChange={e=>setPassword(e.target.value)} placeholder="Sua senha"/></div></label>
      {error && <p className="auth-error" role="alert">{error}</p>}{notice && <p className="auth-muted" role="status">{notice}</p>}
      <button disabled={busy}>{busy ? "Entrando..." : "Entrar no CHAMA VIVA"}</button>
    </form>
    <button type="button" className="auth-link-button" onClick={recoverPassword} disabled={recovering}>{recovering ? "Enviando..." : "Esqueci minha senha"}</button>
    <p className="auth-foot">Acesso somente por convite do administrador.</p>
  </section></main>;
}
