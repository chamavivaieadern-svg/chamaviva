"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Church, Plus, Pencil, Save, X, Users, MapPin, RefreshCw, Trash2, UserPlus } from "lucide-react";

type ChurchRow={id:string;name:string;region:string|null;city:string|null;state:string|null;address:string|null;pastor_id:string|null;created_at:string};
type ProfileRow={id:string;full_name:string;role:string;status:string};
type Membership={id:string;church_id:string;user_id:string;membership_role:string;created_at:string};
const roles=[{value:"pastor",label:"Pastor"},{value:"leader",label:"Líder"},{value:"driver",label:"Motorista"},{value:"director",label:"Dirigente"},{value:"preacher",label:"Pregador"},{value:"musician",label:"Músico"}];
const empty={name:"",region:"",city:"",state:"",address:"",pastor_id:""};
export default function ChurchesManager(){
 const [rows,setRows]=useState<ChurchRow[]>([]),[people,setPeople]=useState<ProfileRow[]>([]),[members,setMembers]=useState<Membership[]>([]);
 const [selected,setSelected]=useState(""),[form,setForm]=useState(empty),[editing,setEditing]=useState(false),[adding,setAdding]=useState(false);
 const [memberUser,setMemberUser]=useState(""),[memberRole,setMemberRole]=useState("leader"),[role,setRole]=useState("");
 const [loading,setLoading]=useState(true),[busy,setBusy]=useState(false),[error,setError]=useState(""),[notice,setNotice]=useState("");
 const db=createClient();
 const load=useCallback(async()=>{
  setLoading(true);setError("");
  const {data:{user}}=await db.auth.getUser();
  if(user){const {data:p}=await db.from("profiles").select("role").eq("id",user.id).maybeSingle();setRole(p?.role||"");}
  const {data,error:e}=await db.from("churches").select("id,name,region,city,state,address,pastor_id,created_at").order("region").order("name");
  if(e){setError(e.message);setLoading(false);return;}
  setRows((data||[]) as ChurchRow[]);
  const {data:profiles}=await db.from("profiles").select("id,full_name,role,status").eq("status","active").order("full_name");
  setPeople((profiles||[]) as ProfileRow[]);
  setSelected(current=>current&&data?.some(c=>c.id===current)?current:(data?.[0]?.id||""));
  setLoading(false);
 },[]);
 useEffect(()=>{load();const channel=db.channel("churches-regions-live").on("postgres_changes",{event:"*",schema:"public",table:"churches"},load).on("postgres_changes",{event:"*",schema:"public",table:"church_memberships"},load).subscribe();return()=>{db.removeChannel(channel);};},[load]);
 useEffect(()=>{if(!selected){setMembers([]);return;}let active=true;(async()=>{const {data,error:e}=await db.from("church_memberships").select("id,church_id,user_id,membership_role,created_at").eq("church_id",selected).order("created_at");if(!active)return;if(e)setError(e.message);else setMembers((data||[]) as Membership[]);})();const channel=db.channel("church-members-"+selected).on("postgres_changes",{event:"*",schema:"public",table:"church_memberships",filter:"church_id=eq."+selected},()=>{db.from("church_memberships").select("id,church_id,user_id,membership_role,created_at").eq("church_id",selected).then(({data})=>setMembers((data||[]) as Membership[]));}).subscribe();return()=>{active=false;db.removeChannel(channel);};},[selected]);
 const chosen=rows.find(c=>c.id===selected);
 const grouped=useMemo(()=>{const map=new Map<string,ChurchRow[]>();rows.forEach(c=>{const key=c.region?.trim()||"Sem região definida";map.set(key,[...(map.get(key)||[]),c]);});return [...map.entries()];},[rows]);
 const log=async(action:string,target:string,details:Record<string,unknown>)=>{const {data:{user}}=await db.auth.getUser();if(user)await db.from("audit_logs").insert({actor_id:user.id,action,target_table:"churches",target_id:target,details});};
 function startEdit(c?:ChurchRow){setForm(c?{name:c.name,region:c.region||"",city:c.city||"",state:c.state||"",address:c.address||"",pastor_id:c.pastor_id||""}:empty);setAdding(!c);setEditing(!!c);setError("");setNotice("");}
 async function save(e:React.FormEvent){e.preventDefault();setBusy(true);setError("");setNotice("");try{const payload={name:form.name.trim(),region:form.region.trim()||null,city:form.city.trim()||null,state:form.state.trim().toUpperCase()||null,address:form.address.trim()||null,pastor_id:form.pastor_id||null};if(!payload.name)throw new Error("Informe o nome da igreja.");
  let result;if(editing&&chosen)result=await db.from("churches").update(payload).eq("id",chosen.id);else result=await db.from("churches").insert({...payload,created_by:(await db.auth.getUser()).data.user?.id});
  if(result.error)throw result.error;await log(editing?"church.updated":"church.created",chosen?.id||payload.name,payload);setNotice(editing?"Igreja atualizada.":"Igreja cadastrada.");setEditing(false);setAdding(false);await load();
 }catch(e){setError(e instanceof Error?e.message:"Não foi possível salvar.");}finally{setBusy(false);}}
 async function addMember(e:React.FormEvent){e.preventDefault();if(!selected||!memberUser)return;setBusy(true);setError("");try{const {error:e}=await db.from("church_memberships").insert({church_id:selected,user_id:memberUser,membership_role:memberRole});if(e)throw e;await log("church.member_added",selected,{user_id:memberUser,membership_role:memberRole});setMemberUser("");setNotice("Pessoa vinculada à igreja.");const {data}=await db.from("church_memberships").select("id,church_id,user_id,membership_role,created_at").eq("church_id",selected);setMembers((data||[]) as Membership[]);}catch(e){setError(e instanceof Error?e.message:"Não foi possível vincular a pessoa.");}finally{setBusy(false);}}
 async function removeMember(m:Membership){if(!confirm("Remover o vínculo desta pessoa com a igreja?"))return;const {error:e}=await db.from("church_memberships").delete().eq("id",m.id);if(e){setError(e.message);return;}await log("church.member_removed",selected,{user_id:m.user_id});setMembers(v=>v.filter(x=>x.id!==m.id));setNotice("Vínculo removido.");}
 const nameOf=(id:string)=>people.find(p=>p.id===id)?.full_name||"Usuário";
 return <div className="churches-manager">
  <div className="churches-toolbar"><div><span className="auth-kicker">GESTÃO TERRITORIAL</span><h2>Igrejas e regiões</h2><p>Cadastre igrejas, organize regiões e controle quem pertence a cada unidade.</p></div>{role==="admin"&&<button className="module-primary" onClick={()=>startEdit()}><Plus size={16}/> Nova igreja</button>}</div>
  <div className="churches-summary"><div><b>{rows.length}</b><span>Igrejas</span></div><div><b>{grouped.length}</b><span>Regiões</span></div><div><b>{members.length}</b><span>Vínculos na igreja selecionada</span></div></div>
  {(adding||editing)&&<form className="module-action-form" onSubmit={save}><div className="module-action-heading"><Church size={18}/><b>{editing?"Editar igreja":"Cadastrar igreja"}</b></div><div className="module-action-fields">
   <label>Nome da igreja<input required value={form.name} onChange={e=>setForm(v=>({...v,name:e.target.value}))}/></label>
   <label>Região<input value={form.region} onChange={e=>setForm(v=>({...v,region:e.target.value}))} placeholder="Ex.: Região Metropolitana"/></label>
   <label>Cidade<input value={form.city} onChange={e=>setForm(v=>({...v,city:e.target.value}))}/></label>
   <label>Estado (UF)<input maxLength={2} value={form.state} onChange={e=>setForm(v=>({...v,state:e.target.value}))}/></label>
   <label className="action-full">Endereço<input value={form.address} onChange={e=>setForm(v=>({...v,address:e.target.value}))}/></label>
   <label className="action-full">Pastor responsável<select value={form.pastor_id} onChange={e=>setForm(v=>({...v,pastor_id:e.target.value}))}><option value="">Não definido</option>{people.filter(p=>p.role==="pastor").map(p=><option key={p.id} value={p.id}>{p.full_name}</option>)}</select></label>
  </div><div className="churches-actions"><button className="module-primary" disabled={busy}><Save size={15}/>{busy?"Salvando...":"Salvar igreja"}</button><button type="button" className="module-refresh" onClick={()=>{setAdding(false);setEditing(false);}}><X size={15}/> Cancelar</button></div></form>}
  <div className="churches-layout"><aside className="churches-list"><h3>Regiões e igrejas</h3>{loading?<p className="data-empty">Carregando igrejas...</p>:grouped.length===0?<p className="data-empty">Nenhuma igreja cadastrada ainda.</p>:grouped.map(([region,churches])=><div className="church-region" key={region}><h4>{region}</h4>{churches.map(c=><button key={c.id} className={selected===c.id?"church-select active":"church-select"} onClick={()=>{setSelected(c.id);setNotice("");}}><Church size={16}/><span><b>{c.name}</b><small>{[c.city,c.state].filter(Boolean).join(" / ")||"Localização não informada"}</small></span></button>)}</div>)}</aside>
   <section className="church-detail">{!chosen?<div className="data-empty">Selecione uma igreja para ver os detalhes.</div>:<><div className="church-detail-head"><div><h3>{chosen.name}</h3><p><MapPin size={14}/> {[chosen.region,chosen.city,chosen.state].filter(Boolean).join(" • ")||"Região não informada"}</p></div>{role==="admin"&&<button className="module-refresh" onClick={()=>startEdit(chosen)}><Pencil size={15}/> Editar</button>}</div>
    <div className="church-detail-grid"><div><small>Endereço</small><b>{chosen.address||"Não informado"}</b></div><div><small>Pastor responsável</small><b>{chosen.pastor_id?nameOf(chosen.pastor_id):"Não definido"}</b></div><div><small>Cadastro</small><b>{new Date(chosen.created_at).toLocaleDateString("pt-BR")}</b></div></div>
    <div className="church-members-head"><div><h4><Users size={17}/> Pessoas vinculadas</h4><p>Os usuários vinculados só acessam os dados desta igreja conforme seu perfil.</p></div><span>{members.length}</span></div>
    {members.length===0?<p className="data-empty">Nenhuma pessoa vinculada a esta igreja.</p>:<div className="church-members-list">{members.map(m=>{const person=people.find(p=>p.id===m.user_id);return <div className="church-member" key={m.id}><span className="church-member-avatar">{(person?.full_name||"U").slice(0,1).toUpperCase()}</span><span><b>{person?.full_name||"Usuário"}</b><small>{roles.find(r=>r.value===m.membership_role)?.label||m.membership_role}</small></span>{role==="admin"&&<button className="danger-action" title="Remover vínculo" onClick={()=>removeMember(m)}><Trash2 size={15}/></button>}</div>;})}</div>}
    {role==="admin"&&<form className="church-member-form" onSubmit={addMember}><h4><UserPlus size={16}/> Vincular usuário à igreja</h4><select required value={memberUser} onChange={e=>setMemberUser(e.target.value)}><option value="">Selecione uma pessoa ativa</option>{people.filter(p=>p.id!==chosen.pastor_id&&!members.some(m=>m.user_id===p.id)).map(p=><option key={p.id} value={p.id}>{p.full_name} — {p.role}</option>)}</select><select value={memberRole} onChange={e=>setMemberRole(e.target.value)}>{roles.map(r=><option key={r.value} value={r.value}>{r.label}</option>)}</select><button className="module-primary" disabled={busy||!memberUser}><Plus size={15}/> Vincular</button></form>}
   </>}</section></div>
  {error&&<p className="module-error">{error}</p>}{notice&&<p className="module-success">{notice}</p>}
  <div className="church-audit-note"><RefreshCw size={15}/><span>Lista sincronizada em tempo real. Alterações de cadastro e vínculos são registradas no histórico de auditoria.</span></div>
 </div>;
}
