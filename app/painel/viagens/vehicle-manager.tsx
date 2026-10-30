"use client";
import {useEffect,useState} from "react";
import {createClient} from "@/lib/supabase/client";
import {BusFront,Plus} from "lucide-react";
type Church={id:string;name:string};type Vehicle={id:string;name:string;plate:string|null;capacity:number;church_id:string};
export default function VehicleManager(){
 const [role,setRole]=useState(""),[churches,setChurches]=useState<Church[]>([]),[vehicles,setVehicles]=useState<Vehicle[]>([]);
 const [church,setChurch]=useState(""),[name,setName]=useState(""),[plate,setPlate]=useState(""),[capacity,setCapacity]=useState("40"),[error,setError]=useState(""),[success,setSuccess]=useState("");
 async function load(){const db=createClient();const {data:{user}}=await db.auth.getUser();if(!user)return;const {data:p}=await db.from("profiles").select("role").eq("id",user.id).single();setRole(p?.role||"");const [c,v]=await Promise.all([db.from("churches").select("id,name").order("name"),db.from("vehicles").select("id,name,plate,capacity,church_id").order("name")]);setChurches(c.data||[]);setVehicles(v.data||[]);if(!church&&c.data?.length)setChurch(c.data[0].id);}
 useEffect(()=>{load();},[]);
 async function add(e:React.FormEvent){e.preventDefault();setError("");setSuccess("");const db=createClient();const {error}=await db.from("vehicles").insert({church_id:church,name,plate:plate||null,capacity:Number(capacity)});if(error)setError(error.message);else{setName("");setPlate("");setSuccess("Veículo cadastrado.");load();}}
 if(role!=="admin")return null;
 return <section className="vehicle-manager"><div><b><BusFront size={16}/> Cadastro de veículos</b><small>Somente o ADM pode cadastrar e administrar a frota.</small></div><form onSubmit={add} className="vehicle-form"><label>Igreja/região<select required value={church} onChange={e=>setChurch(e.target.value)}><option value="">Selecione</option>{churches.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select></label><label>Nome/identificação<input required value={name} onChange={e=>setName(e.target.value)} placeholder="Ônibus 01"/></label><label>Placa<input value={plate} onChange={e=>setPlate(e.target.value)} placeholder="ABC1D23"/></label><label>Capacidade<input required type="number" min="1" max="100" value={capacity} onChange={e=>setCapacity(e.target.value)}/></label><button className="module-primary"><Plus size={14}/> Cadastrar veículo</button></form>{error&&<p className="module-error">{error}</p>}{success&&<p className="module-success">{success}</p>}<div className="vehicle-list">{vehicles.map(v=><div key={v.id}><b>{v.name}</b><small>{v.plate||"Sem placa"} • {v.capacity} lugares • {churches.find(c=>c.id===v.church_id)?.name||"Igreja"}</small></div>)}</div></section>;
}
