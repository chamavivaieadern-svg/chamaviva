"use client";
import {useEffect,useState} from "react";
import {createClient} from "@/lib/supabase/client";
import {UserRound,Mail,KeyRound,Save,ShieldCheck} from "lucide-react";
export default function AccountSettings(){
 const [name,setName]=useState(""),[email,setEmail]=useState(""),[password,setPassword]=useState(""),[confirm,setConfirm]=useState("");
 const [busy,setBusy]=useState(false),[error,setError]=useState(""),[success,setSuccess]=useState("");
 useEffect(()=>{(async()=>{const db=createClient();const {data:{user}}=await db.auth.getUser();if(!user)return;setEmail(user.email||"");const {data}=await db.from("profiles").select("full_name").eq("id",user.id).single();setName(data?.full_name||"");})();},[]);
 async function saveName(){setBusy(true);setError("");setSuccess("");try{const r=await fetch("/api/profile",{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({full_name:name})});const d=await r.json();if(!r.ok)throw new Error(d.error||"Não foi possível salvar.");setSuccess("Nome atualizado.");}catch(e){setError(e instanceof Error?e.message:"Erro ao atualizar.");}finally{setBusy(false);}}
 async function changePassword(e:React.FormEvent){e.preventDefault();setBusy(true);setError("");setSuccess("");try{if(password.length<10)throw new Error("Use uma senha com pelo menos 10 caracteres.");if(password!==confirm)throw new Error("As senhas não coincidem.");const db=createClient();const {error}=await db.auth.updateUser({password});if(error)throw error;setPassword("");setConfirm("");setSuccess("Senha alterada com sucesso.");}catch(e){setError(e instanceof Error?e.message:"Não foi possível alterar a senha.");}finally{setBusy(false);}}
 return <section className="account-settings">
  <div className="settings-card"><div className="settings-title"><UserRound size={18}/><div><b>Dados da conta</b><small>Informações básicas do seu acesso.</small></div></div><label>Nome completo<input value={name} onChange={e=>setName(e.target.value)} maxLength={120}/></label><label>E-mail<input value={email} disabled/><small>O e-mail é gerenciado pela autenticação e não pode ser alterado aqui.</small></label><button className="module-primary" onClick={saveName} disabled={busy||!name.trim()}><Save size={15}/> Salvar nome</button></div>
  <form className="settings-card" onSubmit={changePassword}><div className="settings-title"><KeyRound size={18}/><div><b>Alterar senha</b><small>Use uma senha longa e exclusiva.</small></div></div><label>Nova senha<input type="password" autoComplete="new-password" minLength={10} value={password} onChange={e=>setPassword(e.target.value)} required/></label><label>Confirmar nova senha<input type="password" autoComplete="new-password" minLength={10} value={confirm} onChange={e=>setConfirm(e.target.value)} required/></label><button className="module-primary" disabled={busy}><KeyRound size={15}/> Alterar senha</button></form>
  <div className="settings-security"><ShieldCheck size={18}/><div><b>Autenticação em duas etapas obrigatória</b><small>O CHAMA VIVA exige um aplicativo autenticador para acessar páginas e dados protegidos.</small></div></div>
  {error&&<p className="module-error">{error}</p>}{success&&<p className="module-success">{success}</p>}
 </section>;
}
