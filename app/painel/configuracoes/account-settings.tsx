"use client";
import type { FormEvent } from "react";
import {useEffect,useState} from "react";
import {createClient} from "@/lib/supabase/client";
import {UserRound,KeyRound,Save,ShieldCheck} from "lucide-react";
export default function AccountSettings(){
 const [name,setName]=useState(""),[email,setEmail]=useState(""),[password,setPassword]=useState(""),[confirm,setConfirm]=useState("");
 const [matricula,setMatricula]=useState(""),[busy,setBusy]=useState(false),[error,setError]=useState(""),[success,setSuccess]=useState("");
 useEffect(()=>{(async()=>{const db=createClient();const {data:{user}}=await db.auth.getUser();if(!user)return;setEmail(user.email?.endsWith("@matricula.chamaviva.invalid") ? "" : user.email||"");const {data}=await db.from("profiles").select("full_name,matricula").eq("id",user.id).single();setName(data?.full_name||"");setMatricula(data?.matricula||"");})();},[]);
 async function saveName(){setBusy(true);setError("");setSuccess("");try{const r=await fetch("/api/profile",{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({full_name:name})});const d=await r.json();if(!r.ok)throw new Error(d.error||"Não foi possível salvar.");setSuccess("Nome atualizado.");}catch(e){setError(e instanceof Error?e.message:"Erro ao atualizar.");}finally{setBusy(false);}}
 async function changePassword(e:FormEvent){e.preventDefault();setBusy(true);setError("");setSuccess("");try{if(password.length<10)throw new Error("Use uma senha com pelo menos 10 caracteres.");if(password!==confirm)throw new Error("As senhas não coincidem.");const db=createClient();const {error}=await db.auth.updateUser({password});if(error)throw error;setPassword("");setConfirm("");setSuccess("Senha alterada com sucesso.");}catch(e){setError(e instanceof Error?e.message:"Não foi possível alterar a senha.");}finally{setBusy(false);}}
 return <section className="account-settings">
  <div className="settings-card"><div className="settings-title"><UserRound size={18}/><div><b>Dados da conta</b><small>Informações básicas do seu acesso.</small></div></div><label>Nome completo<input value={name} onChange={e=>setName(e.target.value)} maxLength={120}/></label><label>{email ? "E-mail" : "Forma de acesso"}<input value={email || (matricula ? "Matrícula: " + matricula : "Acesso por matrícula")} disabled/><small>O ADM gerencia seu e-mail ou número de matrícula.</small></label><button className="module-primary" onClick={saveName} disabled={busy||!name.trim()}><Save size={15}/> Salvar nome</button></div>
  <form className="settings-card" onSubmit={changePassword}><div className="settings-title"><KeyRound size={18}/><div><b>Alterar senha</b><small>Use uma senha longa e exclusiva.</small></div></div><label>Nova senha<input type="password" autoComplete="new-password" minLength={10} value={password} onChange={e=>setPassword(e.target.value)} required/></label><label>Confirmar nova senha<input type="password" autoComplete="new-password" minLength={10} value={confirm} onChange={e=>setConfirm(e.target.value)} required/></label><button className="module-primary" disabled={busy}><KeyRound size={15}/> Alterar senha</button></form>
  <div className="settings-security"><ShieldCheck size={18}/><div><b>Acesso individual</b><small>Seu acesso usa e-mail ou matrícula e senha. O ADM é responsável por criar, bloquear e remover contas.</small></div></div>
  {error&&<p className="module-error">{error}</p>}{success&&<p className="module-success">{success}</p>}
 </section>;
}
