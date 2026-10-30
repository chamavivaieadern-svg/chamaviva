"use client";
import {useEffect,useState} from "react";
import {createClient} from "@/lib/supabase/client";
import {Plus,Upload,Send,CalendarPlus,MapPin,Music2,BusFront,Users,Church} from "lucide-react";

type Choice={id:string;name:string};
export default function ModuleActions({section,onCreated}:{section:string;onCreated:()=>void}){
 const [churches,setChurches]=useState<Choice[]>([]),[people,setPeople]=useState<Choice[]>([]),[userId,setUserId]=useState("");
 const [form,setForm]=useState<Record<string,string>>({event_type:"service"}),[file,setFile]=useState<File|null>(null);
 const [busy,setBusy]=useState(false),[error,setError]=useState(""),[success,setSuccess]=useState("");
 const set=(key:string,value:string)=>setForm(v=>({...v,[key]:value}));
 useEffect(()=>{(async()=>{const db=createClient();const {data:{user}}=await db.auth.getUser();if(user)setUserId(user.id);
  const [c,p]=await Promise.all([db.from("churches").select("id,name").order("name"),db.from("profiles").select("id,full_name").in("role",["driver","leader","pastor","director","preacher","musician"])]);
  setChurches(c.data||[]);setPeople((p.data||[]).map(x=>({id:x.id,name:x.full_name||x.id.slice(0,8)})));
 })();},[]);
 const allowed:Record<string,string[]>={igrejas:["admin"],programacao:["admin","pastor","director"],musicas:["musician"],viagens:["admin","pastor"],evangelismo:["admin","pastor"],mensagens:["admin","pastor","leader","driver","director","preacher","musician"],mapa:["admin","pastor"],documentos:["admin"]};
 const [role,setRole]=useState("");
 useEffect(()=>{(async()=>{const db=createClient();const {data:{user}}=await db.auth.getUser();if(user){const {data}=await db.from("profiles").select("role").eq("id",user.id).single();setRole(data?.role||"");}})();},[]);
 if(!allowed[section]?.includes(role))return null;
 async function submit(e:React.FormEvent){e.preventDefault();setBusy(true);setError("");setSuccess("");
  try{const db=createClient();let result;
   if(section==="igrejas")result=await db.from("churches").insert({name:form.name,region:form.region||null,city:form.city||null,address:form.address||null,created_by:userId});
   if(section==="programacao")result=await db.from("events").insert({church_id:form.church_id,title:form.title,event_type:form.event_type,starts_at:new Date(form.starts_at).toISOString(),venue:form.venue||null,description:form.description||null,created_by:userId});
   if(section==="musicas")result=await db.from("songs").insert({church_id:form.church_id,title:form.title,artist:form.artist||null,lyrics:form.lyrics,submitted_by:userId});
   if(section==="viagens")result=await db.from("trips").insert({church_id:form.church_id,title:form.title,origin:form.origin||null,destination:form.destination||null,departure_at:form.departure_at?new Date(form.departure_at).toISOString():null,driver_id:form.driver_id||null,created_by:userId});
   if(section==="evangelismo")result=await db.from("evangelism_groups").insert({church_id:form.church_id,name:form.name,leader_id:form.leader_id});
   if(section==="mensagens")result=await db.from("messages").insert({sender_id:userId,recipient_id:form.recipient_id,subject:form.subject||null,body:form.body});
   if(section==="mapa")result=await db.from("crossada_locations").insert({church_id:form.church_id,name:form.name,address:form.address||null,latitude:form.latitude?Number(form.latitude):null,longitude:form.longitude?Number(form.longitude):null,created_by:userId});
   if(section==="documentos"){
    if(!file)throw new Error("Selecione um arquivo.");
    const path=userId+"/"+Date.now()+"-"+file.name.replace(/[^a-zA-Z0-9._-]/g,"_");
    const upload=await db.storage.from("chama-viva-assets").upload(path,file,{upsert:false});
    if(upload.error)throw upload.error;
    result=await db.from("brand_assets").insert({label:form.label||file.name,storage_path:path,is_official:form.is_official==="yes",uploaded_by:userId});
   }
   if(result?.error)throw result.error;
   setSuccess("Registro salvo com sucesso.");setForm({event_type:"service"});setFile(null);onCreated();
  }catch(e){setError(e instanceof Error?e.message:"Não foi possível salvar.");}
  finally{setBusy(false);}
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
 {section==="musicas"&&<>{churchField}{field("Nome da música","title","Título da música")}{field("Cantor/intérprete","artist","Nome do cantor","text",false)}{text("Letra da música","lyrics","Cole a letra para o dirigente revisar")}</>}
 {section==="viagens"&&<>{churchField}{field("Nome da viagem","title","Ex.: Cruzada Regional")}{field("Origem","origin","Local de saída","text",false)}{field("Destino","destination","Destino")}{field("Data e horário de saída","departure_at","","datetime-local",false)}<label>Motorista<select value={form.driver_id||""} onChange={e=>set("driver_id",e.target.value)}><option value="">A definir</option>{people.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select></label></>}
 {section==="evangelismo"&&<>{churchField}{field("Nome do grupo","name","Ex.: Grupo de evangelismo 1")}<label>Líder responsável<select required value={form.leader_id||""} onChange={e=>set("leader_id",e.target.value)}><option value="">Selecione o líder</option>{people.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select></label></>}
 {section==="mensagens"&&<><label>Destinatário<select required value={form.recipient_id||""} onChange={e=>set("recipient_id",e.target.value)}><option value="">Selecione a pessoa</option>{people.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select></label>{field("Assunto","subject","Assunto","text",false)}{text("Mensagem ou observação","body","Escreva sua mensagem particular")}</>}
 {section==="mapa"&&<>{churchField}{field("Nome do local","name","Ex.: Cruzada Chama Viva")}{field("Endereço","address","Rua, bairro, cidade","text",false)}{field("Latitude","latitude","Ex.: -5.79","number",false)}{field("Longitude","longitude","Ex.: -35.21","number",false)}</>}
 {section==="documentos"&&<>{field("Nome do arquivo","label","Logo oficial ou logo da igreja","text",false)}<label>Arquivo<input type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml,application/pdf" onChange={e=>setFile(e.target.files?.[0]||null)} required/></label><label>Logo oficial CHAMA VIVA?<select value={form.is_official||"no"} onChange={e=>set("is_official",e.target.value)}><option value="no">Não</option><option value="yes">Sim</option></select></label></>}
 </div>{error&&<p className="module-error">{error}</p>}{success&&<p className="module-success">{success}</p>}<button className="module-primary" disabled={busy}>{busy?"Salvando...":title}</button></form>;
}
