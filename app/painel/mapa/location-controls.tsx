"use client";
import {useEffect,useRef,useState} from "react";
import {createClient} from "@/lib/supabase/client";
import {Radio,MapPin,BusFront,Users,Square,Wifi,ShieldCheck} from "lucide-react";

type Trip={id:string;title:string;status:string;destination:string|null;departure_at:string|null};
type Group={id:string;name:string;status:string;trip_id:string|null};
type Active={kind:"trip"|"group";id:string;label:string};
export default function LocationControls(){
 const [trips,setTrips]=useState<Trip[]>([]),[groups,setGroups]=useState<Group[]>([]);
 const [kind,setKind]=useState<"trip"|"group">("trip"),[selectedId,setSelectedId]=useState("");
 const [active,setActive]=useState<Active|null>(null),[message,setMessage]=useState(""),[busy,setBusy]=useState(false),[finishStatus,setFinishStatus]=useState("completed");
 const watchRef=useRef<number|null>(null),lastSent=useRef(0);
 const db=createClient();
 async function load(){
  const {data:{user}}=await db.auth.getUser();if(!user)return;
  const [t,g]=await Promise.all([
   db.from("trips").select("id,title,status,destination,departure_at").eq("driver_id",user.id).in("status",["scheduled","awaiting_departure","in_progress"]),
   db.from("evangelism_groups").select("id,name,status,trip_id").eq("leader_id",user.id).in("status",["planned","active"])
  ]);
  setTrips(t.data||[]);setGroups(g.data||[]);
 }
 useEffect(()=>{load();return()=>{if(watchRef.current!==null)navigator.geolocation?.clearWatch(watchRef.current);};},[]);
 const options=kind==="trip"?trips:groups;
 useEffect(()=>{if(!options.some(x=>x.id===selectedId))setSelectedId(options[0]?.id||"");},[kind,trips,groups]);
 async function start(){
  const item=options.find(x=>x.id===selectedId);if(!item)return;
  if(!navigator.geolocation){setMessage("Este dispositivo não oferece GPS pelo navegador.");return;}
  if(!window.isSecureContext){setMessage("O GPS exige uma conexão HTTPS segura.");return;}
  if(!confirm("Autorizo o CHAMA VIVA a compartilhar minha localização somente durante esta atividade?"))return;
  setBusy(true);setMessage("");
  try{
   const initial=await new Promise<GeolocationPosition>((resolve,reject)=>navigator.geolocation.getCurrentPosition(resolve,reject,{enableHighAccuracy:true,maximumAge:5000,timeout:20000}));
   const alreadyActive=kind==="trip"?(item as Trip).status==="in_progress":(item as Group).status==="active";
   if(!alreadyActive){const rpc=await db.rpc(kind==="trip"?"start_trip_tracking":"start_group_sharing",kind==="trip"?{target_trip:item.id}:{target_group:item.id});if(rpc.error)throw rpc.error;}
   setActive({kind,id:item.id,label:kind==="trip"?(item as Trip).title:(item as Group).name});lastSent.current=Date.now();
   const {data:{user}}=await db.auth.getUser();if(user){
    const row={user_id:user.id,latitude:initial.coords.latitude,longitude:initial.coords.longitude,accuracy_m:initial.coords.accuracy,...(kind==="trip"?{trip_id:item.id}:{group_id:item.id})};
    const {error}=await db.from("live_locations").insert(row as never);if(error)throw error;
   }
   watchRef.current=navigator.geolocation.watchPosition(async(position)=>{
    const now=Date.now();if(now-lastSent.current<10000)return;lastSent.current=now;
    const {data:{user}}=await db.auth.getUser();if(!user)return;
    const row={user_id:user.id,latitude:position.coords.latitude,longitude:position.coords.longitude,accuracy_m:position.coords.accuracy,...(kind==="trip"?{trip_id:item.id}:{group_id:item.id})};
    const {error}=await db.from("live_locations").insert(row as never);if(error)setMessage("Não foi possível enviar a posição: "+error.message);else setMessage("Localização compartilhada. Último envio: "+new Date().toLocaleTimeString("pt-BR"));
   },error=>setMessage("GPS indisponível: "+error.message),{enableHighAccuracy:true,maximumAge:5000,timeout:20000});
   setMessage("Atividade iniciada. Mantenha esta tela aberta para enviar posições.");
  }catch(e){setMessage(e instanceof Error?e.message:"Não foi possível iniciar o GPS.");}
  finally{setBusy(false);}
 }
 async function stop(){
  if(!active)return;setBusy(true);
  try{
   if(watchRef.current!==null)navigator.geolocation.clearWatch(watchRef.current);watchRef.current=null;
   const {error}=await db.rpc(active.kind==="trip"?"finish_trip_tracking":"finish_group_sharing",active.kind==="trip"?{target_trip:active.id,final_status:finishStatus}:{target_group:active.id});
   if(error)throw error;
   setMessage("Atividade encerrada e compartilhamento de localização interrompido.");setActive(null);await load();
  }catch(e){setMessage(e instanceof Error?e.message:"Não foi possível encerrar a atividade.");}
  finally{setBusy(false);}
 }
 return <section className="gps-controls">
  <div className="gps-heading"><ShieldCheck size={18}/><div><b>Iniciar atividade</b><small>Uma única tela para iniciar uma viagem ou um evangelismo. O GPS só é compartilhado após sua autorização.</small></div></div>
  {active?<div className="gps-active"><span><i/> ATIVIDADE EM ANDAMENTO</span><b>{active.kind==="trip"?"Viagem: ":"Evangelismo: "}{active.label}</b>{active.kind==="trip"&&<select className="gps-finish-status" value={finishStatus} onChange={e=>setFinishStatus(e.target.value)}><option value="arrived">Cheguei ao destino</option><option value="completed">Viagem concluída</option><option value="issue">Registrar problema</option></select>}<button onClick={stop} disabled={busy}><Square size={14} fill="currentColor"/> Encerrar atividade e parar GPS</button></div>:<div className="gps-options">
   <div className="gps-option"><div><BusFront size={18}/><b>Tipo de atividade</b></div><select value={kind} onChange={e=>{setKind(e.target.value as "trip"|"group");setSelectedId("");}}><option value="trip">Viagem</option><option value="group">Evangelismo de grupo</option></select>
    <label style={{display:"block",fontSize:11,fontWeight:700,margin:"10px 0 5px"}}>{kind==="trip"?"Escolha a viagem":"Escolha seu grupo"}</label>
    <select value={selectedId} onChange={e=>setSelectedId(e.target.value)}><option value="">Selecione</option>{options.map(x=><option key={x.id} value={x.id}>{kind==="trip"?(x as Trip).title:(x as Group).name}</option>)}</select>
    <button disabled={!selectedId||busy} onClick={start}><Radio size={15}/> {options.find(x=>x.id===selectedId)?.status==="in_progress"||options.find(x=>x.id===selectedId)?.status==="active"?"Retomar atividade":"Autorizar e iniciar atividade"}</button>
   </div>
   {!options.length&&<p className="data-empty">{kind==="trip"?"Nenhuma viagem atribuída a você está aguardando ou em andamento.":"Nenhum grupo ativo ou planejado foi atribuído a você."}</p>}
  </div>}
  {message&&<p className="gps-message"><Wifi size={14}/>{message}</p>}
  <p className="gps-note"><MapPin size={14}/> Para manter o envio, deixe o CHAMA VIVA aberto e com permissão de localização. Navegadores móveis podem suspender o GPS em segundo plano ou quando a tela é bloqueada.</p>
 </section>;
}
