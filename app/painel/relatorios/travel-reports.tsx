"use client";
import {useEffect,useState} from "react";
import {createClient} from "@/lib/supabase/client";
import {BusFront,Users,Clock3,MapPin,FileText} from "lucide-react";
type Trip={id:string;title:string;origin:string|null;destination:string|null;departure_at:string|null;expected_arrival_at:string|null;status:string;driver_id:string|null;tracking_ended_at:string|null};
type Profile={id:string;full_name:string};
export default function TravelReports(){
 const [trips,setTrips]=useState<Trip[]>([]),[drivers,setDrivers]=useState<Record<string,string>>({}),[counts,setCounts]=useState<Record<string,number>>({}),[last,setLast]=useState<Record<string,string>>({});
 useEffect(()=>{(async()=>{const db=createClient();const {data:t}=await db.from("trips").select("id,title,origin,destination,departure_at,expected_arrival_at,status,driver_id,tracking_ended_at").order("departure_at",{ascending:false}).limit(100);const list=t||[];setTrips(list);
  const ids=list.map(x=>x.id);const driverIds=[...new Set(list.map(x=>x.driver_id).filter(Boolean))] as string[];
  if(driverIds.length){const {data:p}=await db.from("profiles").select("id,full_name").in("id",driverIds);const map:Record<string,string>={};(p as Profile[]||[]).forEach(x=>map[x.id]=x.full_name);setDrivers(map);}
  if(ids.length){const [passengers,locations]=await Promise.all([db.from("trip_passengers").select("trip_id"),db.from("live_locations").select("trip_id,recorded_at").in("trip_id",ids).order("recorded_at",{ascending:false})]);const count:Record<string,number>={};(passengers.data||[]).forEach(x=>count[x.trip_id]=(count[x.trip_id]||0)+1);setCounts(count);const times:Record<string,string>={};(locations.data||[]).forEach(x=>{if(x.trip_id&&!times[x.trip_id])times[x.trip_id]=x.recorded_at;});setLast(times);}
 })();},[]);
 const label:Record<string,string>={scheduled:"Programada",awaiting_departure:"Aguardando saída",in_progress:"Em deslocamento",arrived:"Chegou",completed:"Concluída",issue:"Com ocorrência",cancelled:"Cancelada"};
 return <section className="travel-report"><div className="travel-report-head"><div><FileText size={18}/><div><b>Relatório de viagens</b><small>Informações operacionais da sua igreja/região.</small></div></div><span>{trips.length} viagem(ns)</span></div>
 {trips.length===0?<p className="data-empty">Nenhuma viagem registrada.</p>:trips.map(t=><article className="travel-report-card" key={t.id}><div className="travel-report-title"><b><BusFront size={16}/>{t.title}</b><span className={"user-status "+t.status}>{label[t.status]||t.status}</span></div><div className="travel-route"><span><MapPin size={13}/>{t.origin||"Origem não informada"}</span><span><MapPin size={13}/>{t.destination||"Destino não informado"}</span></div><div className="travel-report-meta"><span><Users size={13}/>{counts[t.id]||0} passageiro(s)</span><span><Clock3 size={13}/>{t.departure_at?new Date(t.departure_at).toLocaleString("pt-BR"):"Saída não definida"}</span><span>Motorista: {t.driver_id?drivers[t.driver_id]||"Designado":"A definir"}</span></div>{last[t.id]&&<small className="travel-last-location">Última posição GPS: {new Date(last[t.id]).toLocaleString("pt-BR")}</small>}</article>)}
 </section>;
}
