"use client";
import {useEffect,useRef,useState} from "react";
import {createClient} from "@/lib/supabase/client";
import {Radio,MapPin,BusFront,Users,Square,Wifi,ShieldCheck} from "lucide-react";

type Trip={id:string;title:string;status:string;destination:string|null;departure_at:string|null};
type Group={id:string;name:string;status:string;trip_id:string|null};
type Active={kind:"trip"|"group";id:string;label:string};
export default function LocationControls(){
 const [trips,setTrips]=useState<Trip[]>([]),[groups,setGroups]=useState<Group[]>([]);
 const [selectedTrip,setSelectedTrip]=useState(""),[selectedGroup,setSelectedGroup]=useState("");
 const [active,setActive]=useState<Active|null>(null),[message,setMessage]=useState(""),[busy,setBusy]=useState(false),[finishStatus,setFinishStatus]=useState("completed");
 const watchRef=useRef<number|null>(null),lastSent=useRef(0);
 useEffect(()=>{let alive=true;(async()=>{const db=createClient();const {data:{user}}=await db.auth.getUser();if(!user)return;
  const [t,g]=await Promise.all([db.from("trips").select("id,title,status,destination,departure_at").eq("driver_id",user.id).in("status",["scheduled","awaiting_departure","in_progress"]),db.from("evangelism_groups").select("id,name,status,trip_id").eq("leader_id",user.id).in("status",["planned","active"])]);
  if(alive){setTrips(t.data||[]);setGroups(g.data||[]);}
 })();return()=>{alive=false;if(watchRef.current!==null)navigator.geolocation?.clearWatch(watchRef.current);};},[]);
 async function start(kind:"trip"|"group",id:string,label:string){
  if(!navigator.geolocation){setMessage("Este dispositivo não oferece GPS pelo navegador.");return;}
  if(!window.isSecureContext){setMessage("O GPS exige uma conexão HTTPS segura.");return;}
  if(!confirm("Autorizo o CHAMA VIVA a compartilhar minha localização somente durante esta atividade?"))return;
  setBusy(true);setMessage("");
  try{
   const initial=await new Promise<GeolocationPosition>((resolve,reject)=>navigator.geolocation.getCurrentPosition(resolve,reject,{enableHighAccuracy:true,maximumAge:5000,timeout:20000}));
   const db=createClient();const alreadyActive=kind==="trip"?trips.some(t=>t.id===id&&t.status==="in_progress"):groups.some(g=>g.id===id&&g.status==="active");
   if(!alreadyActive){const rpc=await db.rpc(kind==="trip"?"start_trip_tracking":"start_group_sharing",kind==="trip"?{target_trip:id}:{target_group:id});if(rpc.error)throw rpc.error;}
   setActive({kind,id,label});lastSent.current=Date.now();
   const {data:{user}}=await db.auth.getUser();if(user){
    const row={user_id:user.id,latitude:initial.coords.latitude,longitude:initial.coords.longitude,accuracy_m:initial.coords.accuracy,...(kind==="trip"?{trip_id:id}:{group_id:id})};
    const {error}=await db.from("live_locations").insert(row as never);if(error)setMessage("Atividade iniciada, mas não foi possível enviar a primeira posição: "+error.message);
   }
   watchRef.current=navigator.geolocation.watchPosition(async(position)=>{
    const now=Date.now();if(now-lastSent.current<10000)return;lastSent.current=now;
    const {data:{user}}=await db.auth.getUser();if(!user)return;
    const row={user_id:user.id,latitude:position.coords.latitude,longitude:position.coords.longitude,accuracy_m:position.coords.accuracy,...(kind==="trip"?{trip_id:id}:{group_id:id})};
    const {error}=await db.from("live_locations").insert(row as never);if(error)setMessage("Não foi possível enviar a posição: "+error.message);else setMessage("Localização compartilhada. Último envio: "+new Date().toLocaleTimeString("pt-BR"));
   },(error)=>setMessage("GPS indisponível: "+error.message),{enableHighAccuracy:true,maximumAge:5000,timeout:20000});
   setMessage("Compartilhamento iniciado. Mantenha esta tela aberta para enviar posições.");
  }catch(e){setMessage(e instanceof Error?e.message:"Não foi possível iniciar o GPS.");}
  finally{setBusy(false);}
 }
 async function stop(){
  if(!active)return;setBusy(true);
  try{
   if(watchRef.current!==null)navigator.geolocation.clearWatch(watchRef.current);watchRef.current=null;
   const db=createClient();const {error}=await db.rpc(active.kind==="trip"?"finish_trip_tracking":"finish_group_sharing",active.kind==="trip"?{target_trip:active.id,final_status:finishStatus}:{target_group:active.id});
   if(error)throw error;setMessage("Compartilhamento encerrado.");setActive(null);
   const [t,g]=await Promise.all([db.from("trips").select("id,title,status,destination,departure_at").eq("driver_id",(await db.auth.getUser()).data.user?.id||"").in("status",["scheduled","awaiting_departure","in_progress"]),db.from("evangelism_groups").select("id,name,status,trip_id").eq("leader_id",(await db.auth.getUser()).data.user?.id||"").in("status",["planned","active"])]);
   setTrips(t.data||[]);setGroups(g.data||[]);
  }catch(e){setMessage(e instanceof Error?e.message:"Não foi possível encerrar o compartilhamento.");}
  finally{setBusy(false);}
 }
 return <section className="gps-controls">
  <div className="gps-heading"><ShieldCheck size={18}/><div><b>Compartilhamento de localização</b><small>O GPS só é enviado após sua autorização e durante uma atividade ativa.</small></div></div>
  {active?<div className="gps-active"><span><i/> COMPARTILHAMENTO ATIVO</span><b>{active.label}</b>{active.kind==="trip"&&<select className="gps-finish-status" value={finishStatus} onChange={e=>setFinishStatus(e.target.value)}><option value="arrived">Cheguei ao destino</option><option value="completed">Viagem concluída</option><option value="issue">Registrar problema</option></select>}<button onClick={stop} disabled={busy}><Square size={14} fill="currentColor"/> Encerrar e parar GPS</button></div>:<div className="gps-options">
   <div className="gps-option"><div><BusFront size={18}/><b>Sou motorista</b></div><select value={selectedTrip} onChange={e=>setSelectedTrip(e.target.value)}><option value="">Selecione sua viagem</option>{trips.map(t=><option key={t.id} value={t.id}>{t.title} • {t.departure_at?new Date(t.departure_at).toLocaleString("pt-BR"):"horário a definir"} • {t.status}</option>)}</select><button disabled={!selectedTrip||busy} onClick={()=>{const t=trips.find(x=>x.id===selectedTrip);if(t)start("trip",t.id,t.title);}}><Radio size={15}/> {trips.find(t=>t.id===selectedTrip)?.status==="in_progress"?"Retomar compartilhamento":trips.find(t=>t.id===selectedTrip)?.departure_at&&new Date(trips.find(t=>t.id===selectedTrip)!.departure_at!).getTime()<=Date.now()?"Confirmar início programado":"Iniciar manualmente"}</button></div>
   <div className="gps-option"><div><Users size={18}/><b>Sou líder de grupo</b></div><select value={selectedGroup} onChange={e=>setSelectedGroup(e.target.value)}><option value="">Selecione seu grupo</option>{groups.map(g=><option key={g.id} value={g.id}>{g.name} • {g.status}</option>)}</select><button disabled={!selectedGroup||busy} onClick={()=>{const g=groups.find(x=>x.id===selectedGroup);if(g)start("group",g.id,g.name);}}><Radio size={15}/> {groups.find(g=>g.id===selectedGroup)?.status==="active"?"Retomar compartilhamento":"Autorizar e iniciar evangelismo"}</button></div>
  </div>}
  {message&&<p className="gps-message"><Wifi size={14}/>{message}</p>}
  <p className="gps-note"><MapPin size={14}/> Para manter o envio, deixe o CHAMA VIVA aberto e com permissão de localização. Navegadores móveis podem suspender o GPS em segundo plano ou quando a tela é bloqueada.</p>
 </section>;
}
