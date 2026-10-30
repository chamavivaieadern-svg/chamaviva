"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { ShieldCheck } from "lucide-react";

export default function TwoFactorPage() {
  const router=useRouter();
  const [factorId,setFactorId]=useState("");
  const [qr,setQr]=useState("");
  const [secret,setSecret]=useState("");
  const [mode,setMode]=useState<"loading"|"enroll"|"challenge">("loading");
  const [code,setCode]=useState("");
  const [message,setMessage]=useState("");
  const [busy,setBusy]=useState(false);

  useEffect(()=>{let alive=true;(async()=>{
    try{
      const supabase=createClient();
      const {data:{user}}=await supabase.auth.getUser();
      if(!user){router.replace("/login");return;}
      const {data:listed,error}=await supabase.auth.mfa.listFactors();
      if(error)throw error;
      const verified=listed?.totp?.find(f=>f.status==="verified");
      if(verified){if(alive){setFactorId(verified.id);setMode("challenge");}return;}
      const pending=listed?.all?.find(f=>f.factor_type==="totp"&&f.status==="unverified");
      if(pending)await supabase.auth.mfa.unenroll({factorId:pending.id});
      const {data,error:enrollError}=await supabase.auth.mfa.enroll({factorType:"totp",friendlyName:"CHAMA VIVA - Aplicativo autenticador"});
      if(enrollError)throw enrollError;
      if(alive){setFactorId(data.id);setQr(data.totp.qr_code);setSecret(data.totp.secret);setMode("enroll");}
    }catch(e){if(alive)setMessage(e instanceof Error?e.message:"Não foi possível preparar a autenticação.");}
  })();return()=>{alive=false;};},[router]);

  async function verify(){
    setBusy(true);setMessage("");
    try{
      const supabase=createClient();
      const challenge=await supabase.auth.mfa.challenge({factorId});
      if(challenge.error)throw challenge.error;
      const result=await supabase.auth.mfa.verify({factorId,challengeId:challenge.data.id,code});
      if(result.error)throw result.error;
      router.replace("/painel");router.refresh();
    }catch(e){setMessage(e instanceof Error?e.message:"Código inválido. Confira o aplicativo autenticador.");}
    finally{setBusy(false);}
  }
  return <main className="auth-shell"><section className="auth-card">
    <div className="auth-brand"><span><ShieldCheck size={27}/></span><div><b>CHAMA VIVA</b><small>VERIFICAÇÃO EM DUAS ETAPAS</small></div></div>
    <h1>{mode==="challenge"?"Confirme sua identidade":"Proteja sua conta"}</h1>
    <p className="auth-muted">{mode==="challenge"?"Digite o código atual do seu aplicativo autenticador para continuar.":"Cadastre sua conta em um aplicativo autenticador, como Google Authenticator ou Microsoft Authenticator."}</p>
    {mode==="enroll"&&qr&&<div className="qr-wrap"><img src={qr} alt="QR Code para cadastrar o autenticador"/><small>Escaneie o QR Code no aplicativo autenticador.</small></div>}
    {mode==="enroll"&&secret&&<p className="auth-secret">Chave manual: <code>{secret}</code></p>}
    {mode!=="loading"&&<label className="auth-code-label">Código de 6 dígitos<input className="auth-code" inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={code} onChange={e=>setCode(e.target.value.replace(/[^0-9]/g,"").slice(0,6))}/></label>}
    {message&&<p className="auth-error" role="alert">{message}</p>}
    {mode==="loading"&&!message&&<p className="auth-muted">Preparando autenticação segura...</p>}
    <button disabled={busy||code.length!==6||!factorId||mode==="loading"} onClick={verify}>{busy?"Verificando...":mode==="challenge"?"Confirmar e entrar":"Ativar verificação e continuar"}</button>
  </section></main>;
}
