"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { ShieldCheck } from "lucide-react";

export default function TwoFactorPage() {
  const router = useRouter();
  const [factorId,setFactorId]=useState("");
  const [qr,setQr]=useState("");
  const [secret,setSecret]=useState("");
  const [code,setCode]=useState("");
  const [message,setMessage]=useState("");
  const [busy,setBusy]=useState(false);

  useEffect(()=>{ (async()=>{
    try {
      const supabase=createClient();
      const {data:{user}}=await supabase.auth.getUser();
      if(!user){router.replace("/login");return;}
      const {data:listed}=await supabase.auth.mfa.listFactors();
      const verified=listed?.totp?.find(f=>f.status==="verified");
      if(verified){router.replace("/painel");return;}
      const pending=listed?.totp?.find(f=>f.status==="unverified");
      if(pending){setFactorId(pending.id);return;}
      const {data,error}=await supabase.auth.mfa.enroll({factorType:"totp",friendlyName:"CHAMA VIVA - Aplicativo autenticador"});
      if(error) throw error;
      setFactorId(data.id);setQr(data.totp.qr_code);setSecret(data.totp.secret);
    } catch(e){setMessage(e instanceof Error?e.message:"Não foi possível preparar a autenticação.");}
  })(); },[router]);

  async function verify(){
    setBusy(true);setMessage("");
    try{
      const supabase=createClient();
      const challenge=await supabase.auth.mfa.challenge({factorId});
      if(challenge.error) throw challenge.error;
      const result=await supabase.auth.mfa.verify({factorId,challengeId:challenge.data.id,code:code.replace(/\s/g,"")});
      if(result.error) throw result.error;
      router.replace("/painel");router.refresh();
    }catch(e){setMessage(e instanceof Error?e.message:"Código inválido. Confira o aplicativo autenticador.");}
    finally{setBusy(false);}
  }

  return <main className="auth-shell"><section className="auth-card">
    <div className="auth-brand"><span><ShieldCheck size={27}/></span><div><b>CHAMA VIVA</b><small>VERIFICAÇÃO EM DUAS ETAPAS</small></div></div>
    <h1>Proteja sua conta</h1><p className="auth-muted">Cadastre o CHAMA VIVA em um aplicativo autenticador, como Google Authenticator, Microsoft Authenticator ou 1Password.</p>
    {qr && <div className="qr-wrap"><img src={qr} alt="QR Code para cadastrar o autenticador"/><small>Escaneie o QR Code no aplicativo autenticador.</small></div>}
    {secret && <p className="auth-secret">Chave manual: <code>{secret}</code></p>}
    <label className="auth-code-label">Código de 6 dígitos<input className="auth-code" inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={code} onChange={e=>setCode(e.target.value.replace(/\D/g,"").slice(0,6))}/></label>
    {message&&<p className="auth-error" role="alert">{message}</p>}
    <button disabled={busy||code.length!==6||!factorId} onClick={verify}>{busy?"Verificando...":"Ativar verificação e continuar"}</button>
  </section></main>;
}
