"use client";
import { useEffect,useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { UserPlus,ShieldCheck,Trash2,Lock,Unlock,RefreshCw } from "lucide-react";

type Profile={id:string;full_name:string;role:string;status:string};
type Church={id:string;name:string};
const roles=[["pastor","Pastor"],["leader","Líder de grupo"],["driver","Motorista"],["director","Dirigente"],["preacher","Pregador"],["musician","Músico"]];
export default function UsersAdmin(){
 const [users,setUsers]=useState<Profile[]>([]),[churches,setChurches]=useState<Church[]>([]);
 const [name,setName]=useState(""),[email,setEmail]=useState(""),[role,setRole]=useState("pastor"),[church,setChurch]=useState("");
 const [busy,setBusy]=useState(false),[notice,setNotice]=useState(""),[error,setError]=useState("");
 async function load(){const db=createClient();const [u,c]=await Promise.all([db.from("profiles").select("id,full_name,role,status").order("created_at",{ascending:false}),db.from("churches").select("id,name").order("name")]);if(u.data)setUsers(u.data);if(c.data)setChurches(c.data);}
 useEffect(()=>{load();},[]);
 async function invite(e:React.FormEvent){e.preventDefault();setBusy(true);setError("");setNotice("");try{const r=await fetch("/api/admin/invite",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({full_name:name,email,role,church_id:church||undefined})});const data=await r.json();if(!r.ok)throw new Error(data.error||"Falha ao convidar.");setNotice("Convite enviado para "+email);setName("");setEmail("");await load();}catch(e){setError(e instanceof Error?e.message:"Erro ao convidar.");}finally{setBusy(false);}}
 async function changeStatus(id:string,status:string){if(!confirm(status==="blocked"?"Bloquear este usuário?":"Reativar este usuário?"))return;const r=await fetch("/api/admin/users/"+id,{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({status})});const d=await r.json();if(!r.ok){setError(d.error);return;}await load();}
 async function remove(id:string){if(!confirm("Remover definitivamente este usuário? Esta ação não pode ser desfeita."))return;const r=await fetch("/api/admin/users/"+id,{method:"DELETE"});const d=await r.json();if(!r.ok){setError(d.error);return;}await load();}
 return <div className="admin-module">
  <div className="module-title-row"><div><span className="auth-kicker">ADMINISTRAÇÃO GERAL</span><h1>Usuários e equipes</h1><p>Somente o ADM pode convidar, bloquear ou remover contas.</p></div><button className="module-refresh" onClick={load}><RefreshCw size={15}/> Atualizar</button></div>
  <form className="invite-panel" onSubmit={invite}><div className="invite-heading"><UserPlus size={19}/><div><b>Convidar usuário</b><small>O convite será enviado por e-mail. A pessoa deverá cadastrar senha e 2FA.</small></div></div>
   <div className="invite-fields"><label>Nome completo<input required value={name} onChange={e=>setName(e.target.value)} placeholder="Nome do usuário"/></label><label>E-mail<input required type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="nome@email.com"/></label><label>Função<select value={role} onChange={e=>setRole(e.target.value)}>{roles.map(([v,l])=><option value={v} key={v}>{l}</option>)}</select></label><label>Igreja/região<select required value={church} onChange={e=>setChurch(e.target.value)}><option value="">Selecione uma igreja</option>{churches.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select></label></div>
   {error&&<p className="module-error">{error}</p>}{notice&&<p className="module-success">{notice}</p>}<button className="module-primary" disabled={busy}><UserPlus size={16}/>{busy?"Enviando convite...":"Enviar convite"}</button>
  </form>
  <section className="users-table-panel"><div className="users-table-heading"><div><b>Contas cadastradas</b><small>{users.length} usuário(s)</small></div><span><ShieldCheck size={15}/> Acesso administrativo</span></div>
   <div className="users-table-scroll"><table><thead><tr><th>Nome</th><th>Função</th><th>Status</th><th>Ações</th></tr></thead><tbody>{users.map(u=><tr key={u.id}><td><b>{u.full_name||"Sem nome"}</b><small>{u.id.slice(0,8)}…</small></td><td>{roles.find(r=>r[0]===u.role)?.[1]||u.role}</td><td><span className={"user-status "+u.status}>{u.status==="active"?"Ativo":u.status==="blocked"?"Bloqueado":"Pendente"}</span></td><td><div className="user-actions">{u.status==="blocked"?<button onClick={()=>changeStatus(u.id,"active")} title="Reativar"><Unlock size={15}/></button>:<button onClick={()=>changeStatus(u.id,"blocked")} title="Bloquear"><Lock size={15}/></button>}<button className="danger-action" onClick={()=>remove(u.id)} title="Remover"><Trash2 size={15}/></button></div></td></tr>)}</tbody></table></div>
  </section>
 </div>;
}
