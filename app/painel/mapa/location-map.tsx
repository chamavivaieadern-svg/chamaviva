"use client";
import {useEffect,useMemo,useState} from "react";
import {MapContainer,TileLayer,CircleMarker,Popup,useMap} from "react-leaflet";
import {createClient} from "@/lib/supabase/client";

type Point={id:number;trip_id:string|null;group_id:string|null;latitude:number;longitude:number;recorded_at:string};
type Cross={id:string;name:string;latitude:number|null;longitude:number|null;address:string|null};
function Recenter({center}:{center:[number,number]}){const map=useMap();useEffect(()=>{map.setView(center,map.getZoom());},[center,map]);return null;}
export default function LocationMap(){
 const [points,setPoints]=useState<Point[]>([]),[crosses,setCrosses]=useState<Cross[]>([]),[error,setError]=useState("");
 useEffect(()=>{const db=createClient();let alive=true;
  async function load(){const [p,c]=await Promise.all([db.from("live_locations").select("id,trip_id,group_id,latitude,longitude,recorded_at").order("recorded_at",{ascending:false}).limit(500),db.from("crossada_locations").select("id,name,latitude,longitude,address")]);if(!alive)return;if(p.error)setError(p.error.message);else setPoints(p.data||[]);if(!c.error)setCrosses(c.data||[]);}
  load();const channel=db.channel("chama-live-locations").on("postgres_changes",{event:"INSERT",schema:"public",table:"live_locations"},()=>load()).on("postgres_changes",{event:"INSERT",schema:"public",table:"crossada_locations"},()=>load()).subscribe();
  return()=>{alive=false;db.removeChannel(channel);};
 },[]);
 const latest=useMemo(()=>{const seen=new Set<string>();return points.filter(p=>{const key=p.trip_id?"trip:"+p.trip_id:"group:"+p.group_id;if(seen.has(key))return false;seen.add(key);return true;});},[points]);
 const first=latest[0];const firstCross=crosses.find(c=>c.latitude!==null&&c.longitude!==null);
 const center:[number,number]=first?[first.latitude,first.longitude]:firstCross?[firstCross.latitude!,firstCross.longitude!]:[-5.7945,-35.211];
 return <section className="live-map-card"><div className="live-map-head"><div><b>Mapa de operações</b><small>Última posição recebida de cada ônibus e grupo</small></div><span><i/> ATUALIZAÇÃO AO VIVO</span></div>
  {error&&<p className="module-error">{error}</p>}
  <MapContainer center={center} zoom={12} scrollWheelZoom style={{height:360,width:"100%",borderRadius:12}}>
   <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"/>
   <Recenter center={center}/>
   {latest.map(p=><CircleMarker key={p.id} center={[p.latitude,p.longitude]} radius={9} pathOptions={{color:p.trip_id?"#ea6a20":"#d6a900",fillColor:p.trip_id?"#ea6a20":"#d6a900",fillOpacity:.9}}><Popup><b>{p.trip_id?"Ônibus / viagem":"Grupo de evangelismo"}</b><br/>Última atualização: {new Date(p.recorded_at).toLocaleString("pt-BR")}</Popup></CircleMarker>)}
   {crosses.filter(c=>c.latitude!==null&&c.longitude!==null).map(c=><CircleMarker key={c.id} center={[c.latitude!,c.longitude!]} radius={10} pathOptions={{color:"#c92f2f",fillColor:"#dc2626",fillOpacity:.9}}><Popup><b>{c.name}</b><br/>{c.address}</Popup></CircleMarker>)}
  </MapContainer>
  <div className="live-map-legend"><span><i className="legend-bus"/> Ônibus</span><span><i className="legend-team"/> Grupo</span><span><i className="legend-cross"/> Cruzada</span><small>{latest.length} localização(ões) recente(s) • {crosses.length} ponto(s) de cruzada</small></div>
 </section>;
}
