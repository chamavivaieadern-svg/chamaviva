"use client";
import {useEffect,useState} from "react";
import {createClient} from "@/lib/supabase/client";
import {jsPDF} from "jspdf";
import {BusFront,Users,Clock3,MapPin,FileText,Archive,Download,Trash2,AlertCircle} from "lucide-react";
type Trip={id:string;title:string;origin:string|null;destination:string|null;departure_at:string|null;expected_arrival_at:string|null;status:string;driver_id:string|null;tracking_ended_at:string|null};
type Profile={id:string;full_name:string};
type ArchiveRow={id:string;trip_id:string;church_id:string;trip_title:string;report:Record<string,unknown>;archived_at:string};
const value=(v:unknown)=>v===null||v===undefined||v===""?"—":String(v);
export default function TravelReports(){
 const [trips,setTrips]=useState<Trip[]>([]),[archives,setArchives]=useState<ArchiveRow[]>([]),[drivers,setDrivers]=useState<Record<string,string>>({}),[counts,setCounts]=useState<Record<string,number>>({}),[last,setLast]=useState<Record<string,string>>({});
 const [role,setRole]=useState(""),[busy,setBusy]=useState(""),[error,setError]=useState(""),[notice,setNotice]=useState("");
 const db=createClient();
 async function load(){
  setError("");
  const {data:{user}}=await db.auth.getUser();
  if(user){const {data:p}=await db.from("profiles").select("role").eq("id",user.id).maybeSingle();setRole(p?.role||"");}
  const [tripResult,archiveResult]=await Promise.all([
   db.from("trips").select("id,title,origin,destination,departure_at,expected_arrival_at,status,driver_id,tracking_ended_at").order("departure_at",{ascending:false}).limit(100),
   db.from("trip_reports_archive").select("id,trip_id,church_id,trip_title,report,archived_at").order("archived_at",{ascending:false}).limit(100)
  ]);
  if(tripResult.error)setError(tripResult.error.message);
  if(archiveResult.error)setError(archiveResult.error.message);
  const list=tripResult.data||[];setTrips(list);setArchives((archiveResult.data||[]) as ArchiveRow[]);
  const ids=list.map(x=>x.id);const driverIds=[...new Set(list.map(x=>x.driver_id).filter(Boolean))] as string[];
  if(driverIds.length){const {data:p}=await db.from("profiles").select("id,full_name").in("id",driverIds);const map:Record<string,string>={};(p as Profile[]||[]).forEach(x=>map[x.id]=x.full_name);setDrivers(map);}
  if(ids.length){const [passengers,locations]=await Promise.all([db.from("trip_passengers").select("trip_id").in("trip_id",ids),db.from("live_locations").select("trip_id,recorded_at").in("trip_id",ids).order("recorded_at",{ascending:false})]);const count:Record<string,number>={};(passengers.data||[]).forEach(x=>count[x.trip_id]=(count[x.trip_id]||0)+1);setCounts(count);const times:Record<string,string>={};(locations.data||[]).forEach(x=>{if(x.trip_id&&!times[x.trip_id])times[x.trip_id]=x.recorded_at;});setLast(times);}
 }
 useEffect(()=>{load();},[]);
 async function archiveAndDelete(trip:Trip){
  if(!confirm("O relatório completo será arquivado antes de excluir esta viagem e seus dados operacionais ativos. Deseja continuar?"))return;
  setBusy(trip.id);setError("");setNotice("");
  const {error}=await db.rpc("archive_and_delete_trip",{target_trip:trip.id});
  if(error)setError(error.message);else{setNotice("Relatório arquivado. A viagem foi removida da lista ativa.");await load();}
  setBusy("");
 }
 function downloadReport(row:ArchiveRow){
  const doc=new jsPDF({unit:"mm",format:"a4"});const report=row.report||{};const trip=(report.trip||{}) as Record<string,unknown>;
  const passengers=Array.isArray(report.passengers)?report.passengers as Record<string,unknown>[]:[];
  const groups=Array.isArray(report.groups)?report.groups as Record<string,unknown>[]:[];
  const calls=Array.isArray(report.roll_calls)?report.roll_calls as Record<string,unknown>[]:[];
  let y=18;
  const line=(text:string)=>{const wrapped=doc.splitTextToSize(text,180);if(y+wrapped.length*6>280){doc.addPage();y=18;}doc.text(wrapped,15,y);y+=wrapped.length*6+2;};
  doc.setFont("helvetica","bold");doc.setFontSize(16);line("CHAMA VIVA — RELATÓRIO GERAL DA VIAGEM");
  doc.setFont("helvetica","normal");doc.setFontSize(10);
  line("Viagem: "+value(trip.title||row.trip_title));line("Origem: "+value(trip.origin));line("Destino: "+value(trip.destination));
  line("Saída: "+value(trip.departure_at));line("Situação final: "+value(trip.status));line("Motorista: "+value(trip.driver_id));line("Arquivado em: "+new Date(row.archived_at).toLocaleString("pt-BR"));
  y+=4;doc.setFont("helvetica","bold");line("PASSAGEIROS ("+passengers.length+")");doc.setFont("helvetica","normal");
  passengers.forEach((p,i)=>line((i+1)+". "+value(p.full_name)+" — "+value(p.boarding_status)+(p.notes?" — "+value(p.notes):"")));
  y+=4;doc.setFont("helvetica","bold");line("GRUPOS DE EVANGELISMO ("+groups.length+")");doc.setFont("helvetica","normal");
  groups.forEach(g=>{line("Grupo: "+value(g.name)+" | Situação: "+value(g.status));const members=Array.isArray(g.participants)?g.participants as Record<string,unknown>[]:[];members.forEach(p=>{const passenger=(p.passenger||{}) as Record<string,unknown>;line("  • "+value(passenger.full_name));});const checklist=Array.isArray(g.checklist)?g.checklist as Record<string,unknown>[]:[];checklist.forEach(item=>line("  Checklist: "+value(item.label)+" — "+(item.is_done?"Concluído":"Pendente")));});
  y+=4;doc.setFont("helvetica","bold");line("CHAMADAS ("+calls.length+")");doc.setFont("helvetica","normal");
  calls.forEach(call=>{line(value(call.title));const entries=Array.isArray(call.entries)?call.entries as Record<string,unknown>[]:[];entries.forEach(entry=>line("  • "+value(entry.passenger_name)+" — "+value(entry.status)));});
  const gps=(report.gps_summary||{}) as Record<string,unknown>;y+=4;line("GPS: "+value(gps.points)+" registro(s). Última posição: "+value(gps.last_recorded_at));
  doc.save("relatorio-viagem-"+row.trip_title.toLowerCase().replace(/[^a-z0-9]+/g,"-")+".pdf");
 }
 const label:Record<string,string>={scheduled:"Programada",awaiting_departure:"Aguardando saída",in_progress:"Em deslocamento",arrived:"Chegou",completed:"Concluída",issue:"Com ocorrência",cancelled:"Cancelada"};
 return <section className="travel-report">
  <div className="travel-report-head"><div><FileText size={18}/><div><b>Relatório de viagens</b><small>Informações operacionais da sua igreja/região.</small></div></div><span>{trips.length} ativa(s)</span></div>
  {error&&<p className="module-error"><AlertCircle size={14}/>{error}</p>}{notice&&<p className="module-success">{notice}</p>}
  {trips.length===0?<p className="data-empty">Nenhuma viagem ativa registrada.</p>:trips.map(t=><article className="travel-report-card" key={t.id}><div className="travel-report-title"><b><BusFront size={16}/>{t.title}</b><span className={"user-status "+t.status}>{label[t.status]||t.status}</span></div><div className="travel-route"><span><MapPin size={13}/>{t.origin||"Origem não informada"}</span><span><MapPin size={13}/>{t.destination||"Destino não informado"}</span></div><div className="travel-report-meta"><span><Users size={13}/>{counts[t.id]||0} passageiro(s)</span><span><Clock3 size={13}/>{t.departure_at?new Date(t.departure_at).toLocaleString("pt-BR"):"Saída não definida"}</span><span>Motorista: {t.driver_id?drivers[t.driver_id]||"Designado":"A definir"}</span></div>{last[t.id]&&<small className="travel-last-location">Última posição GPS: {new Date(last[t.id]).toLocaleString("pt-BR")}</small>}{role==="admin"&&(t.status==="completed"||t.status==="cancelled")&&<button type="button" className="danger-action" disabled={busy===t.id} onClick={()=>archiveAndDelete(t)} style={{marginTop:10}}><Archive size={14}/>{busy===t.id?"Arquivando...":"Arquivar relatório e excluir viagem ativa"}</button>}</article>)}
  <div className="travel-report-head" style={{marginTop:24}}><div><Archive size={18}/><div><b>Arquivo de relatórios</b><small>Relatórios preservados antes da remoção das viagens ativas.</small></div></div><span>{archives.length} arquivado(s)</span></div>
  {archives.length===0?<p className="data-empty">Nenhum relatório arquivado ainda.</p>:archives.map(row=><article className="travel-report-card" key={row.id}><div className="travel-report-title"><b><FileText size={16}/>{row.trip_title}</b><small>{new Date(row.archived_at).toLocaleString("pt-BR")}</small></div><div className="travel-report-meta"><span>Passageiros: {Array.isArray(row.report.passengers)?row.report.passengers.length:0}</span><span>Grupos: {Array.isArray(row.report.groups)?row.report.groups.length:0}</span></div><button type="button" className="module-primary" onClick={()=>downloadReport(row)}><Download size={14}/> Baixar relatório PDF</button></article>)}
 </section>;
}
