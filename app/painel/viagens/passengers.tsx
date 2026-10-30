"use client";
import {useEffect,useState} from "react";
import {createClient} from "@/lib/supabase/client";
import {Users,UserPlus,BusFront,CheckCircle2,AlertCircle,Trash2} from "lucide-react";
type Trip={id:string;title:string;vehicle_id:string|null};
type Passenger={id:string;full_name:string;boarding_status:string;notes:string|null};
type Vehicle={id:string;name:string;capacity:number};
export default function TripPassengers(){
 const [trips,setTrips]=useState<Trip[]>([]),[vehicles,setVehicles]=useState<Vehicle[]>([]),[tripId,setTripId]=useState("");
 const [people,setPeople]=useState<Passenger[]>([]),[name,setName]=useState(""),[notes,setNotes]=useState("");
 const [busy,setBusy]=useState(false),[error,setError]=useState(""),[success,setSuccess]=useState("");
 async function load(){const db=createClient();const [t,v]=await Promise.all([db.from("trips").select("id,title,vehicle_id").order("created_at",{ascending:false}),db.from("vehicles").select("id,name,capacity")]);setTrips(t.data||[]);setVehicles(v.data||[]);if(!tripId&&t.data?.length)setTripId(t.data[0].id);}
 async function loadPassengers(id:string){if(!id){setPeople([]);return;}const db=createClient();const {data,error}=await db.from("trip_passengers").select("id,full_name,boarding_status,notes").eq("trip_id",id).order("created_at");if(error)setError(error.message);else setPeople(data||[]);}
 useEffect(()=>{load();},[]);
 useEffect(()=>{loadPassengers(tripId);},[tripId]);
 const trip=trips.find(t=>t.id===tripId);const vehicle=vehicles.find(v=>v.id===trip?.vehicle_id);const capacity=vehicle?.capacity||0;
 async function add(e:React.FormEvent){e.preventDefault();if(capacity&&people.length>=capacity){setError("A lista atingiu a capacidade do veículo.");return;}setBusy(true);setError("");setSuccess("");const db=createClient();const {error}=await db.from("trip_passengers").insert({trip_id:tripId,full_name:name.trim(),notes:notes||null});if(error)setError(error.message);else{setName("");setNotes("");setSuccess("Passageiro adicionado.");loadPassengers(tripId);}setBusy(false);}
 async function status(id:string,value:string){const db=createClient();const {error}=await db.from("trip_passengers").update({boarding_status:value}).eq("id",id);if(error)setError(error.message);else loadPassengers(tripId);}
 async function remove(id:string){if(!confirm("Remover passageiro desta lista?"))return;const db=createClient();const {error}=await db.from("trip_passengers").delete().eq("id",id);if(error)setError(error.message);else loadPassengers(tripId);}
 return <section className="passenger-panel"><div className="passenger-head"><div><b><Users size={16}/> Lista de passageiros</b><small>Controle de vagas, embarque e desembarque.</small></div><span>{people.length}{capacity?"/"+capacity:""} vagas</span></div>
 <label className="program-event-select">Viagem<select value={tripId} onChange={e=>setTripId(e.target.value)}><option value="">Selecione a viagem</option>{trips.map(t=><option key={t.id} value={t.id}>{t.title}</option>)}</select></label>
 {trip&&<div className="passenger-capacity"><BusFront size={16}/><span>{vehicle?.name||"Veículo não definido"}</span><b>{capacity?String(Math.max(capacity-people.length,0))+" vagas restantes":"Capacidade não cadastrada"}</b></div>}
 {tripId&&<form className="passenger-add" onSubmit={add}><input required value={name} onChange={e=>setName(e.target.value)} placeholder="Nome completo do passageiro"/><input value={notes} onChange={e=>setNotes(e.target.value)} placeholder="Observação (opcional)"/><button className="module-primary" disabled={busy}><UserPlus size={14}/> Adicionar</button></form>}
 {error&&<p className="module-error"><AlertCircle size={14}/>{error}</p>}{success&&<p className="module-success"><CheckCircle2 size={14}/>{success}</p>}
 <div className="passenger-list">{people.map(p=><div className="passenger-row" key={p.id}><div><b>{p.full_name}</b>{p.notes&&<small>{p.notes}</small>}</div><select value={p.boarding_status} onChange={e=>status(p.id,e.target.value)}><option value="expected">Aguardando</option><option value="boarded">Embarcou</option><option value="disembarked">Desembarcou</option><option value="absent">Não compareceu</option></select><button className="danger-action" onClick={()=>remove(p.id)} title="Remover"><Trash2 size={14}/></button></div>)}{tripId&&people.length===0&&<p className="data-empty">Nenhum passageiro cadastrado nesta viagem.</p>}</div>
 </section>;
}
