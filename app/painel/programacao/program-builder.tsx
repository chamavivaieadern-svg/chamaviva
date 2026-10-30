"use client";
import type { FormEvent } from "react";
import {useEffect,useState} from "react";
import {createClient} from "@/lib/supabase/client";
import {jsPDF} from "jspdf";
import {Plus,ArrowUp,ArrowDown,Trash2,FileDown,CheckCircle2} from "lucide-react";

type EventRow={id:string;title:string;starts_at:string;venue:string|null;status:string};
type Item={id:string;title:string;participant_name:string|null;item_type:string;starts_at:string|null;duration_minutes:number|null;sort_order:number;notes:string|null;lyrics:string|null};
type Asset={label:string;storage_path:string;is_official:boolean};
async function imageData(url:string):Promise<string>{const response=await fetch(url);const blob=await response.blob();if(blob.type.includes("svg")){const objectUrl=URL.createObjectURL(blob);try{const img=new Image();await new Promise<void>((resolve,reject)=>{img.onload=()=>resolve();img.onerror=()=>reject(new Error("Logo SVG inválida."));img.src=objectUrl;});const canvas=document.createElement("canvas");canvas.width=img.naturalWidth||600;canvas.height=img.naturalHeight||240;const ctx=canvas.getContext("2d");if(!ctx)throw new Error("Não foi possível processar a logo.");ctx.drawImage(img,0,0,canvas.width,canvas.height);return canvas.toDataURL("image/png");}finally{URL.revokeObjectURL(objectUrl);}}return await new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(String(reader.result));reader.onerror=reject;reader.readAsDataURL(blob);});}
export default function ProgramBuilder(){
 const [events,setEvents]=useState<EventRow[]>([]),[eventId,setEventId]=useState(""),[items,setItems]=useState<Item[]>([]);
 const [role,setRole]=useState("");
 const [form,setForm]=useState({title:"",participant_name:"",item_type:"other",time:"",duration_minutes:"",notes:""});
 const [busy,setBusy]=useState(false),[message,setMessage]=useState(""),[error,setError]=useState("");
 async function loadEvents(){const db=createClient();const {data:{user}}=await db.auth.getUser();if(!user)return;
  const {data:p}=await db.from("profiles").select("role").eq("id",user.id).single();setRole(p?.role||"");
  const {data:e}=await db.from("events").select("id,title,starts_at,venue,status").order("starts_at",{ascending:true});setEvents(e||[]);
  if(e?.length&&!eventId)setEventId(e[0].id);
 }
 async function loadItems(id:string){if(!id){setItems([]);return;}const db=createClient();const {data,error}=await db.from("program_items").select("id,title,participant_name,item_type,starts_at,duration_minutes,sort_order,notes,lyrics").eq("event_id",id).order("sort_order");if(error)setError(error.message);else setItems(data||[]);}
 useEffect(()=>{loadEvents();},[]);
 useEffect(()=>{loadItems(eventId);},[eventId]);
 async function addItem(e:FormEvent){e.preventDefault();setBusy(true);setError("");setMessage("");try{
  const db=createClient();const event=events.find(x=>x.id===eventId);if(!event)throw new Error("Selecione uma programação.");
  const date=new Date(event.starts_at);if(form.time){const [h,m]=form.time.split(":").map(Number);date.setHours(h,m,0,0);}
  const {error}=await db.from("program_items").insert({event_id:eventId,title:form.title,participant_name:form.participant_name||null,item_type:form.item_type,starts_at:form.time?date.toISOString():null,duration_minutes:form.duration_minutes?Number(form.duration_minutes):null,sort_order:items.length,notes:form.notes||null});
  if(error)throw error;setForm({title:"",participant_name:"",item_type:"other",time:"",duration_minutes:"",notes:""});setMessage("Participação adicionada à programação.");await loadItems(eventId);
 }catch(e){setError(e instanceof Error?e.message:"Erro ao adicionar.");}finally{setBusy(false);}}
 async function move(item:Item,index:number,direction:number){const target=index+direction;if(target<0||target>=items.length)return;const next=[...items];[next[index],next[target]]=[next[target],next[index]];const db=createClient();
  for(let i=0;i<next.length;i++){const {error}=await db.from("program_items").update({sort_order:i}).eq("id",next[i].id);if(error){setError(error.message);return;}}
  setItems(next.map((x,i)=>({...x,sort_order:i})));
 }
 async function remove(id:string){if(!confirm("Remover esta participação da programação?"))return;const db=createClient();const {error}=await db.from("program_items").delete().eq("id",id);if(error)setError(error.message);else loadItems(eventId);}
 async function publish(){if(!eventId||!["admin","director"].includes(role))return;if(!confirm("Publicar esta programação para os usuários autorizados da igreja?"))return;setBusy(true);setError("");const db=createClient();const {error}=await db.from("events").update({status:"published"}).eq("id",eventId);if(error)setError(error.message);else{setMessage("Programação publicada e notificações enviadas.");await loadEvents();}setBusy(false);}
 async function downloadPdf(){
  if(!["admin","director"].includes(role)){setError("Somente ADM e dirigente podem baixar o PDF.");return;}
  const event=events.find(x=>x.id===eventId);if(!event)return;setBusy(true);setError("");
  try{
   const db=createClient();const {data:assets}=await db.from("brand_assets").select("label,storage_path,is_official").order("is_official",{ascending:false});
   const pdf=new jsPDF({unit:"mm",format:"a4"});let y=15;
   const logos=(assets||[]).filter((a:Asset)=>/\.(png|jpe?g|svg)$/i.test(a.storage_path)).slice(0,4);
   for(const asset of logos){const signed=await db.storage.from("chama-viva-assets").createSignedUrl(asset.storage_path,90);if(signed.data?.signedUrl){try{const data=await imageData(signed.data.signedUrl);pdf.addImage(data,data.startsWith("data:image/jpeg")?"JPEG":"PNG",14,y,25,18,"","FAST");}catch{/* logo opcional */}}}
   pdf.setTextColor(185,75,22);pdf.setFont("helvetica","bold");pdf.setFontSize(18);pdf.text("CHAMA VIVA",pdf.internal.pageSize.getWidth()-14,22,{align:"right"});
   y=43;pdf.setTextColor(40,30,24);pdf.setFontSize(16);pdf.text(event.title,14,y);y+=8;
   pdf.setFont("helvetica","normal");pdf.setFontSize(10);pdf.text("Data: "+new Date(event.starts_at).toLocaleString("pt-BR"),14,y);y+=6;if(event.venue){pdf.text("Local: "+event.venue,14,y);y+=6;}
   y+=5;pdf.setFont("helvetica","bold");pdf.setFontSize(11);pdf.text("ORDEM DA PROGRAMAÇÃO",14,y);y+=7;
   for(let i=0;i<items.length;i++){const item=items[i];if(y>265){pdf.addPage();y=18;}
    pdf.setFont("helvetica","bold");pdf.setFontSize(10);const time=item.starts_at?new Date(item.starts_at).toLocaleTimeString("pt-BR",{hour:"2-digit",minute:"2-digit"}):"—";
    pdf.text((i+1)+". "+time+"  "+item.title,14,y);y+=5;
    pdf.setFont("helvetica","normal");pdf.setFontSize(9);const detail=[item.participant_name,item.duration_minutes?item.duration_minutes+" min":null,item.item_type].filter(Boolean).join(" • ");if(detail){pdf.text(detail,19,y);y+=5;}
    if(item.notes){const lines=pdf.splitTextToSize(item.notes,175);pdf.text(lines,19,y);y+=lines.length*4.5;}
    if(item.lyrics){const lyricsLines=pdf.splitTextToSize("LETRA: "+item.lyrics,175);for(const line of lyricsLines){if(y>275){pdf.addPage();y=18;}pdf.text(line,19,y);y+=4.2;}}
    y+=3;
   }
   pdf.setFontSize(8);pdf.setTextColor(120,110,100);pdf.text("Documento gerado pelo CHAMA VIVA",14,286);
   pdf.save("programacao-chama-viva.pdf");setMessage("PDF gerado.");
  }catch(e){setError(e instanceof Error?e.message:"Não foi possível gerar o PDF.");}
  finally{setBusy(false);}
 }
 const canDownload=role==="admin"||role==="director";
 const canEdit=canDownload;
 return <section className="program-builder">
  <div className="program-head"><div><b>Montar programação do culto</b><small>Defina a ordem, os participantes, horários e duração.</small></div><div className="program-head-actions">{canDownload&&<button className="module-primary" onClick={publish} disabled={!eventId||busy}><CheckCircle2 size={15}/> Publicar</button>}{canDownload&&<button className="module-primary" onClick={downloadPdf} disabled={!eventId||busy}><FileDown size={15}/> Baixar PDF</button>}</div></div>
  <label className="program-event-select">Programação<select value={eventId} onChange={e=>setEventId(e.target.value)}><option value="">Selecione um evento</option>{events.map(e=><option key={e.id} value={e.id}>{e.title} — {new Date(e.starts_at).toLocaleDateString("pt-BR")}</option>)}</select></label>
  {eventId&&<>{canEdit&&<form className="program-item-form" onSubmit={addItem}><b><Plus size={15}/> Adicionar participação</b><div className="program-fields">
   <label>Atividade<input required value={form.title} onChange={e=>setForm(v=>({...v,title:e.target.value}))} placeholder="Ex.: Saudação, louvor, pregação"/></label>
   <label>Responsável<input value={form.participant_name} onChange={e=>setForm(v=>({...v,participant_name:e.target.value}))} placeholder="Nome do participante"/></label>
   <label>Tipo<select value={form.item_type} onChange={e=>setForm(v=>({...v,item_type:e.target.value}))}><option value="opening">Abertura</option><option value="worship">Louvor</option><option value="greeting">Saudação</option><option value="preaching">Pregação</option><option value="prayer">Oração</option><option value="other">Outro</option></select></label>
   <label>Horário<input type="time" value={form.time} onChange={e=>setForm(v=>({...v,time:e.target.value}))}/></label>
   <label>Duração (minutos)<input type="number" min="1" value={form.duration_minutes} onChange={e=>setForm(v=>({...v,duration_minutes:e.target.value}))} placeholder="Ex.: 10"/></label>
   <label className="program-notes">Observações<input value={form.notes} onChange={e=>setForm(v=>({...v,notes:e.target.value}))} placeholder="Orientações para o participante"/></label>
  </div><button className="module-primary" disabled={busy}><Plus size={15}/> Adicionar à ordem</button></form>}
  <div className="program-order"><div className="program-order-head"><b>Ordem oficial</b><small>{items.length} participação(ões)</small></div>
   {items.length===0?<p className="data-empty">Nenhuma participação cadastrada para este evento.</p>:items.map((item,i)=><div className="program-row" key={item.id}><span className="program-number">{String(i+1).padStart(2,"0")}</span><div className="program-row-main"><b>{item.title}</b><small>{item.participant_name||"Responsável a definir"} • {item.starts_at?new Date(item.starts_at).toLocaleTimeString("pt-BR",{hour:"2-digit",minute:"2-digit"}):"Horário a definir"}{item.duration_minutes?" • "+item.duration_minutes+" min":""}</small>{item.notes&&<small>{item.notes}</small>}{item.lyrics&&<details className="program-lyrics"><summary>Ver letra aprovada</summary><p>{item.lyrics}</p></details>}</div>{canEdit&&<div className="program-row-actions"><button onClick={()=>move(item,i,-1)} disabled={i===0} title="Subir"><ArrowUp size={14}/></button><button onClick={()=>move(item,i,1)} disabled={i===items.length-1} title="Descer"><ArrowDown size={14}/></button><button className="danger-action" onClick={()=>remove(item.id)} title="Remover"><Trash2 size={14}/></button></div>}</div>)}
  </div></>}
  {error&&<p className="module-error">{error}</p>}{message&&<p className="module-success"><CheckCircle2 size={14}/>{message}</p>}
 </section>;
}
