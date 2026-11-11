"use client";
import type { FormEvent } from "react";
import {useEffect,useState} from "react";
import {createClient} from "@/lib/supabase/client";
import {Plus,Upload,Send,CalendarPlus,MapPin,Music2,BusFront,Users,Church} from "lucide-react";

type Choice={id:string;name:string;role?:string;can_receive_messages?:boolean};
type ChurchChoice={id:string;name:string;region:string|null;city:string|null;state:string|null;address:string|null;plus_code:string|null;maps_url:string|null;latitude:number|null;longitude:number|null;pastor_id:string|null};
type VehicleChoice={id:string;name:string;capacity:number};
type EventChoice={id:string;title:string;church_id:string};
type TripChoice={id:string;title:string;church_id:string};
export default function ModuleActions({section,onCreated}:{section:string;onCreated:()=>void}){
 const [churches,setChurches]=useState<ChurchChoice[]>([]),[people,setPeople]=useState<Choice[]>([]),[vehicles,setVehicles]=useState<VehicleChoice[]>([]),[events,setEvents]=useState<EventChoice[]>([]),[trips,setTrips]=useState<TripChoice[]>([]),[userId,setUserId]=useState("");
 const [destinationChurchIds,setDestinationChurchIds]=useState<string[]>([]);
 const [form,setForm]=useState<Record<string,string>>({event_type:"service",origin_mode:"church"}),[file,setFile]=useState<File|null>(null);
 const [busy,setBusy]=useState(false),[error,setError]=useState(""),[success,setSuccess]=useState("");
 const set=(key:string,value:string)=>setForm(v=>({...v,[key]:value,...(key==="church_id"?{event_id:"",trip_id:""}:{})}));
 useEffect(()=>{(async()=>{const db=createClient();const {data:{user}}=await db.auth.getUser();if(user)setUserId(user.id);
  const [c,p,v,e,t]=await Promise.all([db.from("churches").select("id,name,region,city,state,address,plus_code,maps_url,latitude,longitude,pastor_id").order("name"),db.from("profiles").select("id,full_name,role,can_receive_messages").in("role",["driver","leader","pastor","director","preacher","musician","trip_manager"]),db.from("vehicles").select("id,name,capacity").order("name"),db.from("events").select("id,title,church_id").order("starts_at"),db.from("trips").select("id,title,church_id").order("created_at",{ascending:false})]);
  setChurches(c.data||[]);const sede=(c.data||[]).find(x=>x.region?.toLowerCase()==="sede"||x.name.toLowerCase().includes("sede"));if(sede)setForm(v=>({...v,origin_church_id:sede.id,origin_mode:"church"}));setPeople((p.data||[]).map(x=>({id:x.id,name:x.full_name||x.id.slice(0,8),role:x.role,can_receive_messages:Boolean(x.can_receive_messages)})));setVehicles(v.data||[]);setEvents(e.data||[]);setTrips(t.data||[]);
 })();},[]);
 const allowed:Record<string,string[]>={igrejas:["admin"],programacao:["admin","pastor","director","trip_manager"],musicas:["musician"],viagens:["admin","pastor","trip_manager"],evangelismo:["admin","pastor"],mensagens:["admin","pastor","leader","driver","director","preacher","musician","trip_manager"],mapa:["admin","pastor"],documentos:["admin"]};
 const [role,setRole]=useState("");const [permissions,setPermissions]=useState({can_manage_trips:false,can_manage_program:false,can_send_messages:false,can_manage_locations:false,can_manage_participants:false});
 useEffect(()=>{(async()=>{const db=createClient();const {data:{user}}=await db.auth.getUser();if(user){const {data}=await db.from("profiles").select("role,can_manage_trips,can_manage_program,can_send_messages,can_manage_locations,can_manage_participants").eq("id",user.id).single();setRole(data?.role||"");setPermissions({can_manage_trips:Boolean(data?.can_manage_trips),can_manage_program:Boolean(data?.can_manage_program),can_send_messages:Boolean(data?.can_send_messages),can_manage_locations:Boolean(data?.can_manage_locations),can_manage_participants:Boolean(data?.can_manage_participants)});}})();},[]);
 if(!allowed[section]?.includes(role))return null;
 if(role==="trip_manager"&&((section==="viagens"&&!permissions.can_manage_trips)||(section==="programacao"&&!permissions.can_manage_program)||(section==="mensagens"&&!permissions.can_send_messages)))return null;
 async function submit(e:FormEvent){e.preventDefault();setBusy(true);setError("");setSuccess("");
  try{const db=createClient();let result;
   if(section==="igrejas")result=await db.from("churches").insert({name:form.name,region:form.region||null,city:form.city||null,address:form.address||null,created_by:userId});
   if(section==="programacao")result=await db.from("events").insert({church_id:form.church_id,title:form.title,event_type:form.event_type,starts_at:new Date(form.starts_at).toISOString(),venue:form.venue||null,description:form.description||null,created_by:userId});
   if(section==="musicas")result=await db.from("songs").insert({church_id:form.church_id,event_id:form.event_id,title:form.title,artist:form.artist||null,lyrics:form.lyrics,submitted_by:userId});
   if(section==="viagens"){
    const originChurch=form.origin_mode==="church"?churches.find(c=>c.id===form.origin_church_id):undefined;
    if(form.origin_mode==="church"&&!originChurch)throw new Error("Selecione a igreja ou local de saída.");
    if(form.origin_mode==="custom"&&(!form.origin_name?.trim()||!form.origin_location?.trim()))throw new Error("Informe o nome e o Plus Code ou endereço do local de saída.");
    if(destinationChurchIds.length===0)throw new Error("Selecione pelo menos uma igreja destino.");
    const selectedDestinations=destinationChurchIds.map(id=>churches.find(c=>c.id===id)).filter((c):c is ChurchChoice=>Boolean(c));
    if(selectedDestinations.length!==destinationChurchIds.length)throw new Error("Uma das igrejas destino não foi encontrada. Atualize a lista.");
    const originName=originChurch?.name||form.origin_name.trim();
    const originSearch=originChurch?[originChurch.plus_code||originChurch.address||"",originChurch.city,originChurch.state].filter(Boolean).join(" "):form.origin_location.trim();
    const originPoint=originChurch&&originChurch.latitude!==null&&originChurch.longitude!==null?{latitude:originChurch.latitude,longitude:originChurch.longitude}:await resolvePlusCode(originSearch);
    if(!originPoint)throw new Error("Não foi possível localizar o ponto de saída. Confira o Plus Code ou endereço.");
    const destinationPoints=await Promise.all(selectedDestinations.map(async church=>church.latitude!==null&&church.longitude!==null?{latitude:church.latitude,longitude:church.longitude}:await resolvePlusCode([church.plus_code||church.address||"",church.city,church.state].filter(Boolean).join(" "))));
    if(destinationPoints.some(point=>!point))throw new Error("Uma igreja destino está sem localização válida. Cadastre o Plus Code ou endereço no módulo Igrejas.");
    const firstPoint=destinationPoints[0];
    result=await db.from("trips").insert({church_id:form.church_id,title:form.title,origin_church_id:originChurch?.id||null,destination_church_ids:destinationChurchIds,origin:originName,destination:selectedDestinations.map(c=>c.name).join(" → "),origin_latitude:originPoint.latitude,origin_longitude:originPoint.longitude,destination_latitude:firstPoint?.latitude??null,destination_longitude:firstPoint?.longitude??null,departure_at:form.departure_at?new Date(form.departure_at).toISOString():null,driver_id:form.driver_id||null,vehicle_id:form.vehicle_id||null,created_by:userId});
   }
   if(section==="evangelismo")result=await db.from("evangelism_groups").insert({church_id:form.church_id,name:form.name,leader_id:form.leader_id,trip_id:form.trip_id||null});
   if(section==="mensagens")result=await db.from("messages").insert({sender_id:userId,recipient_id:form.recipient_id,subject:form.subject||null,body:form.body});
   if(section==="mapa"){
    const point=await resolvePlusCode(form.plus_code);
    result=await db.from("crossada_locations").insert({church_id:form.church_id,name:form.name,address:form.address||null,latitude:point?.latitude??null,longitude:point?.longitude??null,created_by:userId});
   }
   if(section==="documentos"){
    if(!file)throw new Error("Selecione um arquivo.");
    const path=userId+"/"+Date.now()+"-"+file.name.replace(/[^a-zA-Z0-9._-]/g,"_");
    const upload=await db.storage.from("chama-viva-assets").upload(path,file,{upsert:false});
    if(upload.error)throw upload.error;
    result=await db.from("brand_assets").insert({label:form.label||file.name,storage_path:path,is_official:form.is_official==="yes",uploaded_by:userId});
   }
   if(result?.error)throw result.error;
   setSuccess("Registro salvo com sucesso.");setForm({event_type:"service",origin_mode:"church",origin_church_id:churches.find(c=>c.region?.toLowerCase()==="sede"||c.name.toLowerCase().includes("sede"))?.id||""});setFile(null);setDestinationChurchIds([]);onCreated();
  }catch(e){setError(e instanceof Error?e.message:"Não foi possível salvar.");}
  finally{setBusy(false);}
 }
 async function resolvePlusCode(value:string){
  if(!value.trim())return null;
  const response=await fetch("/api/plus-code/resolve",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({value})});
  const payload=await response.json();
  if(!response.ok)throw new Error(payload.error||"Não foi possível localizar esse Plus Code.");
  return payload as {latitude:number;longitude:number;fullCode:string};
 }
 const churchField=<label>Igreja/região<select required value={form.church_id||""} onChange={e=>set("church_id",e.target.value)}><option value="">Selecione</option>{churches.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select></label>;
 const field=(label:string,key:string,placeholder:string,type="text",required=true)=><label>{label}<input type={type} required={required} value={form[key]||""} onChange={e=>set(key,e.target.value)} placeholder={placeholder}/></label>;
 const text=(label:string,key:string,placeholder:string)=><label className="action-full">{label}<textarea required value={form[key]||""} onChange={e=>set(key,e.target.value)} placeholder={placeholder}/></label>;
 let title="",icon=<Plus size={17}/>;
 if(section==="igrejas"){title="Cadastrar igreja ou região";icon=<Church size={17}/>;}
 if(section==="programacao"){title="Criar programação ou evento";icon=<CalendarPlus size={17}/>;}
 if(section==="musicas"){title="Enviar letra para aprovação";icon=<Music2 size={17}/>;}
 if(section==="viagens"){title="Cadastrar viagem";icon=<BusFront size={17}/>;}
 if(section==="evangelismo"){title="Cadastrar grupo";icon=<Users size={17}/>;}
 if(section==="mensagens"){title="Enviar mensagem particular";icon=<Send size={17}/>;}
 if(section==="mapa"){title="Cadastrar local da cruzada";icon=<MapPin size={17}/>;}
 if(section==="documentos"){title="Enviar logo ou documento";icon=<Upload size={17}/>;}
 return <form className="module-action-form" onSubmit={submit}><div className="module-action-heading">{icon}<div><b>{title}</b><small>Os dados são salvos no Supabase conforme as permissões do seu perfil.</small></div></div><div className="module-action-fields">
 {section==="igrejas"&&<>{field("Nome da igreja","name","Nome da igreja")}{field("Região","region","Região", "text",false)}{field("Cidade","city","Cidade","text",false)}{field("Endereço","address","Endereço","text",false)}</>}
 {section==="programacao"&&<>{churchField}{field("Título","title","Nome do culto ou evento")}{<label>Tipo<select value={form.event_type||"service"} onChange={e=>set("event_type",e.target.value)}><option value="service">Culto</option><option value="crusade">Cruzada</option><option value="evangelism">Evangelismo</option><option value="meeting">Reunião</option></select></label>}{field("Data e horário","starts_at","","datetime-local")}{field("Local","venue","Endereço ou local","text",false)}{text("Descrição","description","Informações adicionais")}</>}
 {section==="musicas"&&<>{churchField}<label>Programação<select required value={form.event_id||""} onChange={e=>set("event_id",e.target.value)}><option value="">Selecione o culto ou evento</option>{events.filter(e=>e.church_id===form.church_id).map(e=><option key={e.id} value={e.id}>{e.title}</option>)}</select></label>{field("Nome da música","title","Título da música")}{field("Cantor/intérprete","artist","Nome do cantor","text",false)}{text("Letra da música","lyrics","Cole a letra para o dirigente revisar")}</>}
 {section==="viagens"&&<>{churchField}{field("Nome da viagem","title","Ex.: Evangelismo em São José de Mipibu")}<div className="action-full" style={{border:"1px solid #eadfd5",borderRadius:12,padding:12,background:"#fffaf5",display:"grid",gap:10}}><div><b style={{display:"block",fontSize:13,marginBottom:4}}>De onde vamos sair?</b><small style={{color:"#85776e"}}>A IEADERN Sede já vem selecionada. Se a saída mudar, basta escolher outro local ou informar um novo.</small></div><label>Local de saída<select value={form.origin_mode==="custom"?"custom":form.origin_church_id||""} onChange={e=>set(e.target.value==="custom"?"origin_mode":"origin_church_id",e.target.value)}><option value={churches.find(c=>c.region?.toLowerCase()==="sede"||c.name.toLowerCase().includes("sede"))?.id||""}>IEADERN Sede (padrão)</option>{churches.filter(c=>!(c.region?.toLowerCase()==="sede"||c.name.toLowerCase().includes("sede"))).map(c=><option key={c.id} value={c.id}>{c.name}{c.city?" — "+c.city:""}</option>)}<option value="custom">Outro local (informar endereço/Plus Code)</option></select></label>{form.origin_mode==="custom"&&<>{field("Nome do local de saída","origin_name","Ex.: Praça central da cidade")}{field("Plus Code ou endereço","origin_location","Ex.: 3PGP+9R2 Parnamirim, RN")}</>}{form.origin_mode!=="custom"&&<small style={{color:"#85776e"}}>Local selecionado: {churches.find(c=>c.id===form.origin_church_id)?.name||"IEADERN Sede"} — {churches.find(c=>c.id===form.origin_church_id)?.plus_code||churches.find(c=>c.id===form.origin_church_id)?.address||"Localização cadastrada da igreja"}</small>}</div><div className="action-full"><b style={{display:"block",fontSize:12,marginBottom:8}}>Igrejas destino — selecione na ordem do percurso</b><div style={{display:"grid",gap:8}}>{churches.filter(c=>!(c.region?.toLowerCase()==="sede"||c.name.toLowerCase().includes("sede"))).map(c=>{const checked=destinationChurchIds.includes(c.id);const pastor=people.find(p=>p.id===c.pastor_id);return <label key={c.id} style={{display:"flex",alignItems:"flex-start",gap:9,border:"1px solid #eee2d8",borderRadius:10,padding:10,cursor:"pointer"}}><input type="checkbox" checked={checked} onChange={()=>setDestinationChurchIds(v=>checked?v.filter(id=>id!==c.id):[...v,c.id])}/><span style={{display:"grid",gap:3}}><b>{checked?(destinationChurchIds.indexOf(c.id)+1)+". ":""}{c.name}</b><small style={{color:"#85776e"}}>{[c.city,c.state].filter(Boolean).join(" / ")||"Cidade não informada"}{c.pastor_id?" • Pastor: "+(pastor?.name||"Responsável cadastrado"):""} </small><small style={{color:"#85776e"}}>{c.plus_code||c.address||"Localização ainda não cadastrada"}</small></span></label>;})}</div><small style={{display:"block",marginTop:8,color:"#85776e"}}>A ordem em que você marcar as igrejas será usada no roteiro. Para mudar a ordem, desmarque e marque novamente na sequência desejada.</small></div>{field("Data e horário de saída","departure_at","","datetime-local",false)}<label>Motorista<select value={form.driver_id||""} onChange={e=>set("driver_id",e.target.value)}><option value="">A definir</option>{people.filter(p=>p.role==="driver").map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select></label><label>Veículo<select value={form.vehicle_id||""} onChange={e=>set("vehicle_id",e.target.value)}><option value="">A definir</option>{vehicles.map(v=><option key={v.id} value={v.id}>{v.name} • {v.capacity} vagas</option>)}</select></label></>}
 {section==="evangelismo"&&<>{churchField}{field("Nome do grupo","name","Ex.: Grupo de evangelismo 1")}<label>Ônibus/viagem vinculada<select value={form.trip_id||""} onChange={e=>set("trip_id",e.target.value)}><option value="">Sem ônibus vinculado</option>{trips.filter(t=>t.church_id===form.church_id).map(t=><option key={t.id} value={t.id}>{t.title}</option>)}</select></label><label>Líder responsável<select required value={form.leader_id||""} onChange={e=>set("leader_id",e.target.value)}><option value="">Selecione o líder</option>{people.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select></label></>}
 {section==="mensagens"&&<><label>Destinatário<select required value={form.recipient_id||""} onChange={e=>set("recipient_id",e.target.value)}><option value="">Selecione a pessoa</option>{people.filter(p=>p.can_receive_messages||p.role==="admin").map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select></label>{field("Assunto","subject","Assunto","text",false)}{text("Mensagem ou observação","body","Escreva sua mensagem particular")}</>}
 {section==="mapa"&&<>{churchField}{field("Nome do local","name","Ex.: Cruzada Chama Viva")}{field("Endereço","address","Rua, bairro, cidade","text",false)}{field("Plus Code do local","plus_code","Ex.: 3PGP+9R2 Parnamirim, RN","text",false)}</>}
 {section==="documentos"&&<>{field("Nome do arquivo","label","Logo oficial ou logo da igreja","text",false)}<label>Arquivo<input type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml,application/pdf" onChange={e=>setFile(e.target.files?.[0]||null)} required/></label><label>Logo oficial CHAMA VIVA?<select value={form.is_official||"no"} onChange={e=>set("is_official",e.target.value)}><option value="no">Não</option><option value="yes">Sim</option></select></label></>}
 </div>{error&&<p className="module-error">{error}</p>}{success&&<p className="module-success">{success}</p>}<button className="module-primary" disabled={busy}>{busy?"Salvando...":title}</button></form>;
}
