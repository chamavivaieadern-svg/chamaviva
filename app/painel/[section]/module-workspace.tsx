"use client";
import { useEffect,useState } from "react";
import dynamic from "next/dynamic";
import { createClient } from "@/lib/supabase/client";
import LocationControls from "../mapa/location-controls";
import ModuleActions from "./module-actions";
import ModuleNav from "@/app/components/module-nav";
import AccountSettings from "../configuracoes/account-settings";
import ProgramBuilder from "../programacao/program-builder";
import TripPassengers from "../viagens/passengers";
import VehicleManager from "../viagens/vehicle-manager";
import TravelReports from "../relatorios/travel-reports";
const LocationMap=dynamic(()=>import("../mapa/location-map"),{ssr:false,loading:()=> <div className="data-empty">Carregando mapa...</div>});
import { RefreshCw,MapPin,BusFront,Users,CalendarDays,Music2,MessageSquare,FileText,Church,CheckCircle2,AlertCircle } from "lucide-react";

const modules:Record<string,{title:string;description:string;table:string;icon:string;columns:string[]}> = {
 igrejas:{title:"Igrejas e regiões",description:"Igrejas vinculadas à sua área de acesso.",table:"churches",icon:"church",columns:["name","region","city","state"]},
 programacao:{title:"Cultos e programação",description:"Agenda e eventos das igrejas autorizadas.",table:"events",icon:"calendar",columns:["title","event_type","starts_at","status"]},
 musicas:{title:"Músicas e repertório",description:"Envie letras e acompanhe a aprovação do dirigente.",table:"songs",icon:"music",columns:["title","artist","lyrics","status","created_at"]},
 viagens:{title:"Viagens e ônibus",description:"Viagens, destinos, motoristas e situação atual.",table:"trips",icon:"bus",columns:["title","origin","destination","status","departure_at"]},
 evangelismo:{title:"Grupos de evangelismo",description:"Equipes, líderes e atividades em andamento.",table:"evangelism_groups",icon:"users",columns:["name","status","leader_id","trip_id"]},
 mensagens:{title:"Mensagens e avisos",description:"Mensagens particulares enviadas e recebidas.",table:"messages",icon:"message",columns:["subject","body","sender_id","recipient_id","created_at"]},
 documentos:{title:"Documentos e logos",description:"Arquivos institucionais e logos enviados pelo ADM.",table:"brand_assets",icon:"file",columns:["label","storage_path","is_official","created_at"]},
 mapa:{title:"Mapa ao vivo",description:"Últimas posições compartilhadas durante viagens e evangelismos ativos.",table:"live_locations",icon:"map",columns:["trip_id","group_id","latitude","longitude","recorded_at"]},
 relatorios:{title:"Relatórios",description:"Relatórios operacionais das viagens da sua igreja/região.",table:"trips",icon:"file",columns:["title","origin","destination","status","departure_at"]},
 configuracoes:{title:"Configurações",description:"Dados básicos da sua conta no CHAMA VIVA.",table:"profiles",icon:"file",columns:["full_name","role","status","created_at"]},
};
const labels:Record<string,string>={name:"Nome",region:"Região",city:"Cidade",state:"Estado",title:"Título",event_type:"Tipo",starts_at:"Início",status:"Situação",artist:"Artista",lyrics:"Letra enviada",created_at:"Criado em",origin:"Origem",destination:"Destino",departure_at:"Saída",leader_id:"Líder (ID)",trip_id:"Viagem (ID)",subject:"Assunto",body:"Mensagem",sender_id:"De",recipient_id:"Para",label:"Descrição",storage_path:"Arquivo",is_official:"Logo oficial",group_id:"Grupo",latitude:"Latitude",longitude:"Longitude",recorded_at:"Atualizado em"};
function fmt(v:unknown){if(v===null||v===undefined||v==="")return "—";if(typeof v==="boolean")return v?"Sim":"Não";if(typeof v==="string"&&/^\d{4}-\d\d-\d\dT/.test(v))return new Date(v).toLocaleString("pt-BR");const statusLabels:Record<string,string>={draft:"Rascunho",published:"Publicada",pending:"Aguardando aprovação",approved:"Aprovada",rejected:"Rejeitada",scheduled:"Programada",awaiting_departure:"Aguardando saída",in_progress:"Em deslocamento",arrived:"Chegou ao destino",completed:"Concluída",issue:"Com ocorrência",active:"Ativo",planned:"Planejado",cancelled:"Cancelada",blocked:"Bloqueado",expected:"Aguardando",boarded:"Embarcou",disembarked:"Desembarcou",absent:"Não compareceu"};if(typeof v==="string"&&statusLabels[v])return statusLabels[v];if(typeof v==="string"&&v.length>42)return v.slice(0,39)+"…";return String(v);}
export default function ModuleWorkspace({section}:{section:string}){
 const config=modules[section];const [rows,setRows]=useState<Record<string,unknown>[]>([]);const [loading,setLoading]=useState(true);const [error,setError]=useState("");const [role,setRole]=useState("");
 async function load(){setLoading(true);setError("");try{const db=createClient();const {data:{user}}=await db.auth.getUser();if(user){const {data:p}=await db.from("profiles").select("role").eq("id",user.id).maybeSingle();setRole(p?.role||"");}
  let query=db.from(config.table).select(config.columns.join(",")).order(section==="mapa"?"recorded_at":"created_at",{ascending:false}).limit(100);
  if(section==="mensagens"&&user)query=query.or("sender_id.eq."+user.id+",recipient_id.eq."+user.id);
  const {data,error}=await query;if(error)throw error;
  let records=(data||[]) as Record<string,unknown>[];
  if(section==="mensagens"&&records.length){const ids=[...new Set(records.flatMap(r=>[String(r.sender_id||""),String(r.recipient_id||"")]).filter(Boolean))];const {data:profiles}=await db.from("profiles").select("id,full_name").in("id",ids);const names:Record<string,string>={};(profiles||[]).forEach(p=>names[p.id]=p.full_name||p.id.slice(0,8));records=records.map(r=>({...r,sender_id:names[String(r.sender_id)]||"Usuário",recipient_id:names[String(r.recipient_id)]||"Usuário"}));}
  setRows(records);
 }catch(e){setError(e instanceof Error?e.message:"Não foi possível carregar os dados.");}finally{setLoading(false);}}
 useEffect(()=>{load();},[section]);
 useEffect(()=>{const db=createClient();const channel=db.channel("module-live-"+section).on("postgres_changes",{event:"*",schema:"public",table:config.table},()=>load()).subscribe();return()=>{db.removeChannel(channel);};},[section]);
 const Icon=config.icon==="church"?Church:config.icon==="calendar"?CalendarDays:config.icon==="music"?Music2:config.icon==="bus"?BusFront:config.icon==="users"?Users:config.icon==="message"?MessageSquare:config.icon==="file"?FileText:MapPin;
 async function approve(id:unknown,status:string){const db=createClient();const {error}=await db.rpc("review_song",{target_song:String(id),decision:status});if(error)setError(error.message);else load();}
 return <main className="module-page"><ModuleNav/><div className="workspace-head"><div className="workspace-icon-large"><Icon size={24}/></div><div><span className="auth-kicker">CHAMA VIVA • MÓDULO</span><h1>{config.title}</h1><p>{config.description}</p></div><button className="module-refresh" onClick={load}><RefreshCw size={15}/> Atualizar</button></div>
 {section!=="relatorios"&&section!=="configuracoes"&&<ModuleActions section={section} onCreated={load}/>}
 {section==="programacao"&&<ProgramBuilder/>}
 {section==="viagens"&&<VehicleManager/>}
 {section==="viagens"&&<TripPassengers/>}
 {section==="relatorios"&&<TravelReports/>}
 {section==="configuracoes"&&<AccountSettings/>}
 {(section==="mapa"||section==="evangelismo")&&<LocationControls/>}
 {(section==="mapa"||section==="evangelismo")&&<LocationMap/>}
 {section==="mapa"&&<div className="map-info-card"><MapPin size={19}/><div><b>Localização compartilhada com consentimento</b><p>As posições são registradas somente durante viagens ou evangelismos ativos. A tabela abaixo mostra o horário real da última atualização; não representa rastreamento em tempo real enquanto não houver um dispositivo enviando GPS.</p></div></div>}
 {section==="musicas"&&["admin","director"].includes(role)&&<div className="map-info-card"><CheckCircle2 size={18}/><div><b>Aprovação do dirigente</b><p>Somente letras aprovadas podem entrar na programação oficial.</p></div></div>}
 {error&&<p className="module-error"><AlertCircle size={15}/>{error}</p>}
 <section className="data-panel"><div className="data-panel-head"><b>Registros</b><span>{rows.length} registro(s)</span></div>
 {loading?<p className="data-empty">Carregando...</p>:rows.length===0?<div className="data-empty">Nenhum registro encontrado. Quando houver dados cadastrados e vinculados ao seu perfil, eles aparecerão aqui.</div>:<div className="data-table-wrap"><table><thead><tr>{config.columns.map(c=><th key={c}>{labels[c]||c}</th>)}{section==="musicas"&&role==="director"&&<th>Aprovação</th>}</tr></thead><tbody>{rows.map((row,i)=><tr key={String(row.id||i)}>{config.columns.map(c=><td key={c}>{c==="status"?<span className={"user-status "+String(row[c])}>{fmt(row[c])}</span>:fmt(row[c])}</td>)}{section==="musicas"&&role==="director"&&<td>{row.status==="pending"?<div className="user-actions"><button onClick={()=>approve(row.id,"approved")} title="Aprovar"><CheckCircle2 size={15}/></button><button className="danger-action" onClick={()=>approve(row.id,"rejected")} title="Rejeitar"><AlertCircle size={15}/></button></div>:fmt(row.status)}</td>}</tr>)}</tbody></table></div>}
 </section>
 </main>;
}
