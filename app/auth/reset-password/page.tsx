"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Flame, LockKeyhole } from "lucide-react";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [checking, setChecking] = useState(true);
  const [hasSession, setHasSession] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const checkSession = async () => {
      const supabase = createClient();
      const { data } = await supabase.auth.getSession();
      setHasSession(Boolean(data.session));
      setChecking(false);
    };
    void checkSession();
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setMessage("");
    if (password.length < 8) {
      setError("A senha precisa ter pelo menos 8 caracteres.");
      return;
    }
    if (password !== confirmation) {
      setError("As senhas não coincidem.");
      return;
    }

    setBusy(true);
    try {
      const supabase = createClient();
      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) throw updateError;
      setMessage("Senha atualizada com sucesso. Entre novamente com sua nova senha.");
      await supabase.auth.signOut();
      window.setTimeout(() => router.replace("/login"), 1200);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Não foi possível atualizar a senha. Solicite um novo link.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="auth-shell">
      <section className="auth-card">
        <div className="auth-brand"><span><Flame size={27} fill="currentColor" /></span><div><b>CHAMA VIVA</b><small>GESTÃO E EVANGELISMO</small></div></div>
        <p className="auth-kicker">RECUPERAÇÃO SEGURA</p>
        <h1>Crie uma nova senha</h1>
        <p className="auth-muted">Escolha uma senha individual com pelo menos 8 caracteres.</p>
        {checking ? <p className="auth-muted">Verificando link de recuperação...</p> : !hasSession ? (
          <div><p className="auth-error" role="alert">Este link é inválido, expirou ou já foi utilizado.</p><a className="auth-link" href="/login">Voltar ao login e solicitar outro link</a></div>
        ) : (
          <form onSubmit={submit} className="auth-form">
            <label>Nova senha<div className="auth-input"><LockKeyhole size={17} /><input type="password" autoComplete="new-password" minLength={8} required value={password} onChange={e => setPassword(e.target.value)} placeholder="Pelo menos 8 caracteres" /></div></label>
            <label>Confirmar nova senha<div className="auth-input"><LockKeyhole size={17} /><input type="password" autoComplete="new-password" minLength={8} required value={confirmation} onChange={e => setConfirmation(e.target.value)} placeholder="Digite novamente" /></div></label>
            {error && <p className="auth-error" role="alert">{error}</p>}
            {message && <p className="auth-muted" role="status">{message}</p>}
            <button disabled={busy}>{busy ? "Salvando..." : "Salvar nova senha"}</button>
          </form>
        )}
      </section>
    </main>
  );
}
