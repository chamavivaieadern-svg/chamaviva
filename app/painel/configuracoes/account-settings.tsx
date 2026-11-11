"use client";
import type { FormEvent } from "react";
import {useEffect,useState} from "react";
import {createClient} from "@/lib/supabase/client";
import {UserRound,KeyRound,Save,ShieldCheck,UserCog,ShieldAlert} from "lucide-react";

type AdminUser={id:string;full_name:string;role:string;status:string;admin_previous_role:string|null;matricula:string|null};

export default function AccountSettings(){
 const [name,setName]=useState(""),[email,setEmail]=useState(""),[password,setPassword]=useState(""),[confirm,setConfirm]=useState("");
 const [matricula,setMatricula]=useState(""),[role,setRole]=useState(""),[currentUser,setCurrentUser]=useState("");
 const [adminUsers,setAdminUsers]=useState<AdminUser[]>([]),[adminLoading,setAdminLoading]=useState(false),[adminBusy,setAdminBusy]=useState("");
 const [busy,setBusy]=useState(false),[error,setError]=useState(""),[success,setSuccess]=useState("");
 async function loadAdminUsers(){
  setAdminLoading(true);
  try{const response=await fetch("/api/admin/users",{cache:"no-store"});const data=await response.json();if(!response.ok)throw new Error(data.error||"Não foi possível carregar os usuários.");setAdminUsers((data.users||[]) as AdminUser[]);}
  catch(e){setError(e instanceof Error?e.message:"Erro ao carregar usuários.");}
  finally{setAdminLoading(false);}
 }
 useEffect(()=>{(async()=>{const db=createClient();const {data:{user}}=await db.auth.getUser();if(!user)return;setCurrentUser(user.id);setEmail(user.email?.endsWith("@matricula.chamaviva.invalid") ? "" : user.email||"");const {data}=await db.from("profiles").select("full_name,matricula,role").eq("id",user.id).single();setName(data?.full_name||"");setMatricula(data?.matricula||"");setRole(data?.role||"");if(data?.role==="admin")await loadAdminUsers();})();},[]);
 async function saveName(){setBusy(true);setError("");setSuccess("");try{const r=await fetch("/api/profile",{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({full_name:name})});const d=await r.json();if(!r.ok)throw new Error(d.error||"Não foi possível salvar.");setSuccess("Nome atualizado.");}catch(e){setError(e instanceof Error?e.message:"Erro ao atualizar.");}finally{setBusy(false);}}
 async function changePassword(e:FormEvent){e.preventDefault();setBusy(true);setError("");setSuccess("");try{if(password.length<10)throw new Error("Use uma senha com pelo menos 10 caracteres.");if(password!==confirm)throw new Error("As senhas não coincidem.");const db=createClient();const {error}=await db.auth.updateUser({password});if(error)throw error;setPassword("");setConfirm("");setSuccess("Senha alterada com sucesso.");}catch(e){setError(e instanceof Error?e.message:"Não foi possível alterar a senha.");}finally{setBusy(false);}}
 async function setAdminAccess(person:AdminUser,isAdmin:boolean){
  const action=isAdmin?"conceder acesso de ADM a":"retirar o acesso de ADM de";
  if(!window.confirm("Confirma "+action+" "+person.full_name+"?"))return;
  setAdminBusy(person.id);setError("");setSuccess("");
  try{const response=await fetch("/api/admin/users/"+person.id+"/admin-role",{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({is_admin:isAdmin})});const data=await response.json();if(!response.ok)throw new Error(data.error||"Não foi possível atualizar o acesso.");setSuccess(isAdmin?"Acesso de ADM concedido a "+person.full_name+".":"Acesso de ADM retirado. A função anterior foi restaurada.");await loadAdminUsers();}
  catch(e){setError(e instanceof Error?e.message:"Não foi possível atualizar o acesso.");}
  finally{setAdminBusy("");}
 }
 return <section className="account-settings">
  <div className="settings-card"><div className="settings-title"><UserRound size={18}/><div><b>Dados da conta</b><small>Informações básicas do seu acesso.</small></div></div><label>Nome completo<input value={name} onChange={e=>setName(e.target.value)} maxLength={120}/></label><label>{email ? "E-mail" : "Forma de acesso"}<input value={email || (matricula ? "Matrícula: " + matricula : "Acesso por matrícula")} disabled/><small>O ADM gerencia seu e-mail ou número de matrícula.</small></label><button className="module-primary" onClick={saveName} disabled={busy||!name.trim()}><Save size={15}/> Salvar nome</button></div>
  <form className="settings-card" onSubmit={changePassword}><div className="settings-title"><KeyRound size={18}/><div><b>Alterar senha</b><small>Use uma senha longa e exclusiva.</small></div></div><label>Nova senha<input type="password" autoComplete="new-password" minLength={10} value={password} onChange={e=>setPassword(e.target.value)} required/></label><label>Confirmar nova senha<input type="password" autoComplete="new-password" minLength={10} value={confirm} onChange={e=>setConfirm(e.target.value)} required/></label><button className="module-primary" disabled={busy}><KeyRound size={15}/> Alterar senha</button></form>
  {role==="admin"&&<div className="settings-card" style={{gridColumn:"1 / -1"}}><div className="settings-title"><UserCog size={18}/><div><b>Administradores do sistema</b><small>Escolha um usuário ativo para conceder ou retirar acesso administrativo.</small></div></div>
   <div className="settings-security"><ShieldAlert size={18}/><div><b>Acesso total ao CHAMA VIVA</b><small>Um ADM pode acessar todas as áreas e administrar usuários. A alteração exige uma sessão de ADM ativo, fica registrada no histórico e o sistema mantém pelo menos um ADM ativo.</small></div></div>
   {adminLoading?<p className="data-empty">Carregando usuários...</p>:adminUsers.filter(p=>p.status==="active"&&p.id!==currentUser).length===0?<p className="data-empty">Não há outros usuários ativos cadastrados.</p>:<div style={{display:"grid",gap:10,marginTop:14}}>{adminUsers.filter(p=>p.status==="active"&&p.id!==currentUser).map(person=><div key={person.id} style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:12,flexWrap:"wrap",border:"1px solid #eee2d8",borderRadius:10,padding:12}}><div style={{display:"grid",gap:3}}><b style={{fontSize:13}}>{person.full_name||"Usuário"}</b><small style={{fontSize:11,color:"#8b7b70"}}>{person.matricula?"Matrícula: "+person.matricula+" • ":""}{person.role==="admin"?"Administrador":person.role==="trip_manager"?"Gestor de viagens":person.role}</small></div>{person.role==="admin"?<button type="button" className="module-primary" disabled={adminBusy===person.id||!person.admin_previous_role} title={!person.admin_previous_role?"ADM principal sem função anterior registrada": "Retirar acesso de ADM"} onClick={()=>setAdminAccess(person,false)}>{adminBusy===person.id?"Atualizando...":"Retirar ADM"}</button>:<button type="button" className="module-primary" disabled={adminBusy===person.id} onClick={()=>setAdminAccess(person,true)}>{adminBusy===person.id?"Atualizando...":"Tornar ADM"}</button>}</div>)}</div>}
  </div>}
  <div className="settings-security"><ShieldCheck size={18}/><div><b>Acesso individual</b><small>Seu acesso usa e-mail ou matrícula e senha. O ADM é responsável por criar, bloquear e remover contas.</small></div></div>
  {error&&<p className="module-error">{error}</p>}{success&&<p className="module-success">{success}</p>}
 </section>;
}
