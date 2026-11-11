"use client";
import {useEffect,useMemo,useState} from "react";
import {createClient} from "@/lib/supabase/client";
import {ClipboardCheck,Users,CheckCircle2,AlertCircle,Plus,RefreshCw,ClipboardList} from "lucide-react";

type Trip={id:string;title:string;church_id:string};
type Group={id:string;name:string;trip_id:string;church_id:string;leader_id:string};
type Passenger={id:string;full_name:string};
type Session={id:string;trip_id:string;group_id:string|null;phase:"departure"|"return"|"group";title:string};
type Entry={id:string;passenger_id:string;status:"pending"|"present"|"absent";passenger?:Passenger};
type Checklist={id:string;label:string;is_done:boolean;sort_order:number};
type DepartureEntry={passenger_id:string;status:string};

export default function AttendanceManager(){
 const [trips,setTrips]=useState<Trip[]>([]),[groups,setGroups]=useState<Group[]>([]),[passengers,setPassengers]=useState<Passenger[]>([]);
 const [tripId,setTripId]=useState(""),[groupId,setGroupId]=useState(""),[phase,setPhase]=useState<"departure"|"return"|"group">("departure");
 const [session,setSession]=useState<Session|null>(null),[entries,setEntries]=useState<Entry[]>([]),[checklist,setChecklist]=useState<Checklist[]>([]);
 const [presentForGroups,setPresentForGroups]=useState<Passenger[]>([]),[groupMembers,setGroupMembers]=useState<string[]>([]),[assignId,setAssignId]=useState("");
 const [templates,setTemplates]=useState<{id:string;label:string;active:boolean}[]>([]),[newTemplate,setNewTemplate]=useState("");
 const [userId,setUserId]=useState(""),[role,setRole]=useState(""),[canManageRollCalls,setCanManageRollCalls]=useState(false),[canManageChecklists,setCanManageChecklists]=useState(false);
 const [loading,setLoading]=useState(true),[busy,setBusy]=useState(false),[error,setError]=useState(""),[notice,setNotice]=useState("");
 const db=createClient();
 const trip=trips.find(t=>t.id===tripId),group=groups.find(g=>g.id===groupId);
 const canAdmin=role==="admin"||role==="pastor"||canManageRollCalls;
 
 const counts=useMemo(()=>({present:entries.filter(e=>e.status==="present").length,absent:entries.filter(e=>e.status==="absent").length,pending:entries.filter(e=>e.status==="pending").length}),[entries]);

 async function loadBase(){
  setLoading(true);setError("");
  const {data:{user}}=await db.auth.getUser();setUserId(user?.id||"");
  if(user){const {data:p}=await db.from("profiles").select("role,can_manage_roll_calls,can_manage_checklists").eq("id",user.id).maybeSingle();setRole(p?.role||"");if(p?.role==="leader")setPhase("group");setCanManageRollCalls(Boolean(p?.can_manage_roll_calls));setCanManageChecklists(Boolean(p?.can_manage_checklists));}
  const [t,g,p,templatesResult]=await Promise.all([
   db.from("trips").select("id,title,church_id").order("created_at",{ascending:false}).limit(100),
   db.from("evangelism_groups").select("id,name,trip_id,church_id,leader_id").order("created_at",{ascending:false}).limit(200),
   db.from("trip_passengers").select("id,full_name").order("full_name").limit(1000),
   db.from("group_checklist_templates").select("id,label,active").order("sort_order")
  ]);
  if(t.error)throw t.error;if(g.error)throw g.error;if(p.error)throw p.error;
  setTrips(t.data||[]);setGroups(g.data||[]);setPassengers(p.data||[]);setTemplates(templatesResult.data||[]);
  if(!tripId&&t.data?.length)setTripId(t.data[0].id);
  setLoading(false);
 }
 async function loadGroupData(id:string){
  if(!id){setChecklist([]);setGroupMembers([]);return;}
  const [c,m]=await Promise.all([
   db.from("evangelism_group_checklists").select("id,label,is_done,sort_order").eq("group_id",id).order("sort_order"),
   db.from("evangelism_group_passengers").select("passenger_id").eq("group_id",id)
  ]);
  if(c.error)setError(c.error.message);else setChecklist(c.data||[]);
  if(m.error)setError(m.error.message);else setGroupMembers((m.data||[]).map(x=>x.passenger_id));
 }
 async function loadSession(){
  setError("");setNotice("");setSession(null);setEntries([]);
  if(!tripId)return;
  if(phase==="group"&&!groupId)return;
  let query=db.from("roll_call_sessions").select("id,trip_id,group_id,phase,title").eq("trip_id",tripId).eq("phase",phase);
  query=phase==="group"?query.eq("group_id",groupId):query.is("group_id",null);
  const {data,error}=await query.maybeSingle();
  if(error){setError(error.message);return;}
  if(!data)return;
  setSession(data as Session);
  const {data:rows,error:entriesError}=await db.from("roll_call_entries").select("id,passenger_id,status").eq("session_id",data.id).order("created_at");
  if(entriesError){setError(entriesError.message);return;}
  const ids=(rows||[]).map(x=>x.passenger_id);
  const names=new Map(passengers.map(p=>[p.id,p]));
  setEntries((rows||[]).map(x=>({...x,passenger:names.get(x.passenger_id)})));
 }
 async function loadDeparturePresent(){
  const {data:s,error:sError}=await db.from("roll_call_sessions").select("id").eq("trip_id",tripId).eq("phase","departure").is("group_id",null).maybeSingle();
  if(sError){setError(sError.message);return;}
  if(!s){setPresentForGroups([]);return;}
  const {data:e,error:eError}=await db.from("roll_call_entries").select("passenger_id,status").eq("session_id",s.id).eq("status","present");
  if(eError){setError(eError.message);return;}
  const ids=new Set((e||[]).map(x=>x.passenger_id));setPresentForGroups(passengers.filter(p=>ids.has(p.id)));
 }
 useEffect(()=>{loadBase().catch(e=>{setError(e.message);setLoading(false);});},[]);
 useEffect(()=>{if(phase==="group"&&groupId)loadGroupData(groupId);},[groupId]);
 useEffect(()=>{if(tripId){loadSession();loadDeparturePresent();}else{setSession(null);setEntries([]);}},[tripId,phase,groupId,passengers.length]);
 useEffect(()=>{if(phase==="group"&&groupId){const channel=db.channel("group-checklist-"+groupId).on("postgres_changes",{event:"*",schema:"public",table:"evangelism_group_checklists",filter:"group_id=eq."+groupId},()=>loadGroupData(groupId)).subscribe();return()=>{db.removeChannel(channel);};}},[groupId,phase]);

 async function startSession(){
  if(!tripId||!trip) return;
  setBusy(true);setError("");setNotice("");
  try{
   let eligible:Passenger[]=[];
   if(phase==="departure")eligible=passengers;
   if(phase==="return"){
    const {data:dep,error:depError}=await db.from("roll_call_sessions").select("id").eq("trip_id",tripId).eq("phase","departure").is("group_id",null).maybeSingle();
    if(depError)throw depError;if(!dep)throw new Error("Faça primeiro a chamada principal da saída.");
    const {data:depEntries,error:eError}=await db.from("roll_call_entries").select("passenger_id,status").eq("session_id",dep.id).eq("status","present");
    if(eError)throw eError;const ids=new Set((depEntries||[]).map(x=>x.passenger_id));eligible=passengers.filter(p=>ids.has(p.id));
   }
   if(phase==="group"){
    if(!groupId)throw new Error("Selecione um grupo.");
    const {data:members,error:mError}=await db.from("evangelism_group_passengers").select("passenger_id").eq("group_id",groupId);
    if(mError)throw mError;const ids=new Set((members||[]).map(x=>x.passenger_id));eligible=passengers.filter(p=>ids.has(p.id));
    if(!eligible.length)throw new Error("Adicione primeiro os passageiros presentes na saída a este grupo.");
   }
   if(!eligible.length)throw new Error("Não há passageiros elegíveis para esta chamada.");
   let {data:s,error:sError}=await db.from("roll_call_sessions").insert({trip_id:tripId,group_id:phase==="group"?groupId:null,phase,title:phase==="departure"?"Chamada principal — saída":phase==="return"?"Chamada de retorno":"Chamada do grupo — "+(group?.name||"") ,created_by:userId}).select("id,trip_id,group_id,phase,title").single();
   if(sError&&sError.code==="23505"){
    let existingQuery=db.from("roll_call_sessions").select("id,trip_id,group_id,phase,title").eq("trip_id",tripId).eq("phase",phase);existingQuery=phase==="group"?existingQuery.eq("group_id",groupId):existingQuery.is("group_id",null);const existing=await existingQuery.maybeSingle();s=existing.data as any;sError=existing.error;
   }
   if(sError)throw sError;if(!s)throw new Error("Não foi possível abrir a chamada.");
   const {error:insertError}=await db.from("roll_call_entries").upsert(eligible.map(p=>({session_id:s!.id,passenger_id:p.id,status:"pending"})),{onConflict:"session_id,passenger_id",ignoreDuplicates:true});
   if(insertError)throw insertError;
   setSession(s as Session);await loadSession();setNotice("Chamada iniciada. Marque cada pessoa como presente ou ausente.");
  }catch(e){setError(e instanceof Error?e.message:"Não foi possível iniciar a chamada.");}
  finally{setBusy(false);}
 }
 async function mark(entry:Entry,status:"present"|"absent"){
  setBusy(true);setError("");
  const {error}=await db.from("roll_call_entries").update({status,marked_by:userId,marked_at:new Date().toISOString()}).eq("id",entry.id);
  if(error)setError(error.message);else{setEntries(rows=>rows.map(r=>r.id===entry.id?{...r,status}:r));}
  setBusy(false);
 }
 async function assignPassenger(){
  if(!groupId||!assignId)return;setBusy(true);setError("");
  const {error}=await db.from("evangelism_group_passengers").insert({group_id:groupId,trip_id:tripId,passenger_id:assignId,added_by:userId});
  if(error&&error.code!=="23505")setError(error.message);else{setAssignId("");await loadGroupData(groupId);setNotice("Passageiro vinculado ao grupo.");}
  setBusy(false);
 }
 async function toggleChecklist(item:Checklist){
  const {error}=await db.from("evangelism_group_checklists").update({is_done:!item.is_done,done_by:!item.is_done?userId:null,done_at:!item.is_done?new Date().toISOString():null}).eq("id",item.id);
  if(error)setError(error.message);else setChecklist(rows=>rows.map(r=>r.id===item.id?{...r,is_done:!item.is_done}:r));
 }
 async function addTemplate(){
  if(!newTemplate.trim()||!trip)return;setBusy(true);setError("");
  const {error}=await db.from("group_checklist_templates").insert({label:newTemplate.trim(),church_id:null,created_by:userId,sort_order:templates.length});
  if(error)setError(error.message);else{setNewTemplate("");const {data}=await db.from("group_checklist_templates").select("id,label,active").order("sort_order");setTemplates(data||[]);setNotice("Item incluído para os próximos grupos criados.");}
  setBusy(false);
 }
 async function toggleTemplate(item:{id:string;active:boolean}){
  const {error}=await db.from("group_checklist_templates").update({active:!item.active}).eq("id",item.id);
  if(error)setError(error.message);else setTemplates(rows=>rows.map(r=>r.id===item.id?{...r,active:!item.active}:r));
 }
 const eligibleForGroup=presentForGroups.filter(p=>!groupMembers.includes(p.id));
 if(loading)return <section className="module-action-form"><p className="data-empty">Carregando chamadas e checklists...</p></section>;
 return <section className="module-action-form" style={{marginTop:18}}>
  <div className="module-action-heading"><ClipboardCheck size={19}/><div><b>Chamadas e preparação dos grupos</b><small>Controle de saída, retorno, participantes e checklist de cada equipe.</small></div></div>
  {error&&<p className="module-error"><AlertCircle size={15}/>{error}</p>}{notice&&<p className="module-success">{notice}</p>}
  <label style={{display:"grid",gap:6}}>Viagem<select value={tripId} onChange={e=>{setTripId(e.target.value);setGroupId("");}}><option value="">Selecione uma viagem</option>{trips.map(t=><option key={t.id} value={t.id}>{t.title}</option>)}</select></label>
  <label style={{display:"grid",gap:6,marginTop:10}}>Tipo de chamada<select value={phase} onChange={e=>setPhase(e.target.value as typeof phase)}><option value="departure">1. Saída do ônibus — todos os passageiros</option><option value="return">2. Retorno — somente presentes na saída</option><option value="group">3. Chamada do grupo de evangelismo</option></select></label>
  {phase==="group"&&<label style={{display:"grid",gap:6,marginTop:10}}>Grupo<select value={groupId} onChange={e=>setGroupId(e.target.value)}><option value="">Selecione o grupo</option>{groups.filter(g=>g.trip_id===tripId).map(g=><option key={g.id} value={g.id}>{g.name}</option>)}</select></label>}
  {phase==="group"&&group&&<div style={{marginTop:14,padding:12,border:"1px solid #eee2d8",borderRadius:10}}>
   <b style={{display:"flex",gap:7,alignItems:"center"}}><Users size={16}/> Participantes do grupo</b>
   <small>Somente passageiros marcados como presentes na chamada de saída podem ser vinculados.</small>
   <div style={{display:"flex",gap:8,marginTop:10,flexWrap:"wrap"}}><select value={assignId} onChange={e=>setAssignId(e.target.value)} style={{flex:1,minWidth:180}}><option value="">Escolha um passageiro presente</option>{eligibleForGroup.map(p=><option key={p.id} value={p.id}>{p.full_name}</option>)}</select><button type="button" className="module-primary" disabled={!assignId||busy} onClick={assignPassenger}><Plus size={14}/> Adicionar</button></div>
   <p style={{fontSize:12,marginTop:8}}>Participantes vinculados: {groupMembers.length}</p>
   {checklist.length>0&&<div style={{marginTop:14}}><b style={{display:"flex",gap:7,alignItems:"center"}}><ClipboardList size={16}/> Checklist de preparação</b>{checklist.map(item=><label key={item.id} style={{display:"flex",gap:9,alignItems:"center",padding:"9px 0",borderBottom:"1px solid #f1e9e3"}}><input type="checkbox" checked={item.is_done} onChange={()=>toggleChecklist(item)}/><span style={{textDecoration:item.is_done?"line-through":"none",opacity:item.is_done ? 0.6 : 1}}>{item.label}</span></label>)}</div>}
  </div>}
  {tripId&&phase!=="group"&&<div style={{display:"flex",gap:8,alignItems:"center",marginTop:12,flexWrap:"wrap"}}><button type="button" className="module-primary" disabled={busy} onClick={startSession}><ClipboardCheck size={15}/> {session?"Atualizar lista da chamada":"Iniciar chamada"}</button>{session&&<span style={{fontSize:12,color:"#76685e"}}>{session.title}</span>}</div>}
  {tripId&&phase==="group"&&groupId&&<div style={{display:"flex",gap:8,alignItems:"center",marginTop:12,flexWrap:"wrap"}}><button type="button" className="module-primary" disabled={busy} onClick={startSession}><ClipboardCheck size={15}/> {session?"Atualizar lista da chamada":"Iniciar chamada do grupo"}</button>{session&&<span style={{fontSize:12,color:"#76685e"}}>{session.title}</span>}</div>}
  {session&&<><div style={{display:"flex",gap:8,flexWrap:"wrap",margin:"14px 0"}}><span className="passenger-capacity">Presentes: <b>{counts.present}</b></span><span className="passenger-capacity">Ausentes: <b>{counts.absent}</b></span><span className="passenger-capacity">Pendentes: <b>{counts.pending}</b></span></div>
   {entries.map(entry=><div key={entry.id} style={{display:"flex",gap:8,alignItems:"center",justifyContent:"space-between",padding:"10px 0",borderBottom:"1px solid #f1e9e3",flexWrap:"wrap"}}><b style={{fontSize:13}}>{entry.passenger?.full_name||"Passageiro"}</b><div style={{display:"flex",gap:6}}><button type="button" className={entry.status==="present"?"module-primary":"module-secondary"} disabled={busy} onClick={()=>mark(entry,"present")}>Presente</button><button type="button" className={entry.status==="absent"?"danger-action":"module-secondary"} disabled={busy} onClick={()=>mark(entry,"absent")}>Ausente</button></div></div>)}
  </>}
  {role==="admin"&&<div style={{marginTop:22,paddingTop:16,borderTop:"1px solid #eee2d8"}}><b>Checklist padrão para novos grupos</b><small style={{display:"block",marginTop:4}}>Itens ativos são copiados automaticamente quando um novo grupo é criado.</small><div style={{display:"flex",gap:8,marginTop:10,flexWrap:"wrap"}}><input value={newTemplate} onChange={e=>setNewTemplate(e.target.value)} placeholder="Ex.: Conferir água e materiais" style={{flex:1,minWidth:190}}/><button type="button" className="module-primary" disabled={busy||!newTemplate.trim()} onClick={addTemplate}><Plus size={14}/> Adicionar item</button></div>{templates.map(item=><label key={item.id} style={{display:"flex",gap:8,alignItems:"center",padding:"7px 0"}}><input type="checkbox" checked={item.active} onChange={()=>toggleTemplate(item)}/><span>{item.label}</span></label>)}</div>}
  <button type="button" className="module-secondary" style={{marginTop:12}} onClick={()=>{loadBase();loadSession();}}><RefreshCw size={14}/> Atualizar dados</button>
 </section>;
}
