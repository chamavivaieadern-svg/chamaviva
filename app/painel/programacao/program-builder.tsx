"use client";
import type { FormEvent } from "react";
import {useEffect,useState} from "react";
import {createClient} from "@/lib/supabase/client";
import {jsPDF} from "jspdf";
import {Plus,ArrowUp,ArrowDown,Trash2,FileDown,CheckCircle2,Edit3,Save,X} from "lucide-react";

type EventRow={id:string;title:string;starts_at:string;venue:string|null;status:string};
type Item={id:string;title:string;participant_name:string|null;item_type:string;starts_at:string|null;duration_minutes:number|null;sort_order:number;notes:string|null;lyrics:string|null};
async function imageData(url:string):Promise<string>{const response=await fetch(url);const blob=await response.blob();if(blob.type.includes("svg")){const objectUrl=URL.createObjectURL(blob);try{const img=new Image();await new Promise<void>((resolve,reject)=>{img.onload=()=>resolve();img.onerror=()=>reject(new Error("Logo SVG inválida."));img.src=objectUrl;});const canvas=document.createElement("canvas");canvas.width=img.naturalWidth||600;canvas.height=img.naturalHeight||240;const ctx=canvas.getContext("2d");if(!ctx)throw new Error("Não foi possível processar a logo.");ctx.drawImage(img,0,0,canvas.width,canvas.height);return canvas.toDataURL("image/png");}finally{URL.revokeObjectURL(objectUrl);}}return await new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(String(reader.result));reader.onerror=reject;reader.readAsDataURL(blob);});}
export default function ProgramBuilder(){
 const [events,setEvents]=useState<EventRow[]>([]),[eventId,setEventId]=useState(""),[items,setItems]=useState<Item[]>([]);
 const [role,setRole]=useState("");const [canManageProgram,setCanManageProgram]=useState(false);
 const [form,setForm]=useState({title:"",participant_name:"",item_type:"other",time:"",duration_minutes:"",notes:""});
 const [editingId,setEditingId]=useState<string|null>(null);
 const [editForm,setEditForm]=useState({title:"",participant_name:"",item_type:"other",time:"",duration_minutes:"",notes:""});
 const [busy,setBusy]=useState(false),[message,setMessage]=useState(""),[error,setError]=useState("");
 async function loadEvents(){const db=createClient();const {data:{user}}=await db.auth.getUser();if(!user)return;
  const {data:p}=await db.from("profiles").select("role,can_manage_program").eq("id",user.id).single();setRole(p?.role||"");setCanManageProgram(Boolean(p?.can_manage_program));
  const {data:e}=await db.from("events").select("id,title,starts_at,venue,status").order("starts_at",{ascending:true});setEvents(e||[]);
  if(e?.length&&!eventId)setEventId(e[0].id);
 }
 async function loadItems(id:string){if(!id){setItems([]);return;}const db=createClient();const {data,error}=await db.from("program_items").select("id,title,participant_name,item_type,starts_at,duration_minutes,sort_order,notes,lyrics").eq("event_id",id).order("sort_order");if(error)setError(error.message);else setItems(data||[]);}
 useEffect(()=>{loadEvents();},[]);
 useEffect(()=>{loadItems(eventId);},[eventId]);
 useEffect(()=>{const db=createClient();const channel=db.channel("program-live-"+eventId).on("postgres_changes",{event:"*",schema:"public",table:"program_items",filter:"event_id=eq."+eventId},()=>loadItems(eventId)).on("postgres_changes",{event:"*",schema:"public",table:"events",filter:"id=eq."+eventId},()=>loadEvents()).subscribe();return()=>{db.removeChannel(channel);};},[eventId]);
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
 function startEdit(item:Item){
  const date=item.starts_at?new Date(item.starts_at):null;
  const time=date?String(date.getHours()).padStart(2,"0")+":"+String(date.getMinutes()).padStart(2,"0"):"";
  setEditingId(item.id);setEditForm({title:item.title,participant_name:item.participant_name||"",item_type:item.item_type,time,duration_minutes:item.duration_minutes?String(item.duration_minutes):"",notes:item.notes||""});setError("");setMessage("");
 }
 async function saveEdit(id:string){
  if(!editForm.title.trim()){setError("Informe o nome da atividade.");return;}
  setBusy(true);setError("");setMessage("");
  try{
   const db=createClient();const event=events.find(x=>x.id===eventId);if(!event)throw new Error("Selecione uma programação.");
   const date=new Date(event.starts_at);if(editForm.time){const [h,m]=editForm.time.split(":").map(Number);date.setHours(h,m,0,0);}
   const {error}=await db.from("program_items").update({title:editForm.title.trim(),participant_name:editForm.participant_name.trim()||null,item_type:editForm.item_type,starts_at:editForm.time?date.toISOString():null,duration_minutes:editForm.duration_minutes?Number(editForm.duration_minutes):null,notes:editForm.notes.trim()||null}).eq("id",id);
   if(error)throw error;setEditingId(null);setMessage("Participação atualizada e salva.");await loadItems(eventId);
  }catch(e){setError(e instanceof Error?e.message:"Não foi possível salvar as alterações.");}finally{setBusy(false);}
 }
 async function publish(){if(!eventId||!(["admin","director"].includes(role)||(role==="trip_manager"&&canManageProgram)))return;if(!confirm("Publicar esta programação para os usuários autorizados da igreja?"))return;setBusy(true);setError("");const db=createClient();const {error}=await db.from("events").update({status:"published"}).eq("id",eventId);if(error)setError(error.message);else{setMessage("Programação publicada e notificações enviadas.");await loadEvents();}setBusy(false);}
 async function downloadPdf(){
  if(!["admin","director"].includes(role)){setError("Somente ADM e dirigente podem baixar o PDF.");return;}
  if(!eventId)return;setBusy(true);setError("");setMessage("");
  try{
   const response=await fetch("/api/programacao/"+eventId+"/export");
   const payload=await response.json();
   if(!response.ok)throw new Error(payload.error||"Exportação não autorizada.");
   const event=payload.event as EventRow;
   const pdfItems=payload.items as Item[];
   const logos=payload.logos as {label:string;storage_path:string;is_official:boolean;url:string}[];
   const pdf=new jsPDF({unit:"mm",format:"a4"});
   const pageWidth=pdf.internal.pageSize.getWidth(),pageHeight=pdf.internal.pageSize.getHeight();
   const left=16,right=16,contentWidth=pageWidth-left-right;
   const date=new Date(event.starts_at);
   const dateLabel=date.toLocaleDateString("pt-BR",{weekday:"long",day:"2-digit",month:"long",year:"numeric"});
   const timeLabel=date.toLocaleTimeString("pt-BR",{hour:"2-digit",minute:"2-digit"});
   const kindLabels:Record<string,string>={opening:"Abertura",worship:"Louvor",greeting:"Saudação",preaching:"Mensagem / pregação",prayer:"Oração",other:"Participação"};
   let y=16,logoX=left;
   for(const asset of logos.slice(0,2)){try{const data=await imageData(asset.url);pdf.addImage(data,data.startsWith("data:image/jpeg")?"JPEG":"PNG",logoX,13,22,17,"","FAST");logoX+=25;}catch{/* logo opcional */}}
   pdf.setTextColor(165,65,20);pdf.setFont("helvetica","bold");pdf.setFontSize(17);pdf.text("CHAMA VIVA",pageWidth-right,20,{align:"right"});
   pdf.setTextColor(75,65,55);pdf.setFont("helvetica","normal");pdf.setFontSize(8);pdf.text("PROGRAMAÇÃO OFICIAL",pageWidth-right,25,{align:"right"});
   y=37;pdf.setDrawColor(220,125,45);pdf.setLineWidth(0.8);pdf.line(left,y,pageWidth-right,y);y+=10;
   pdf.setTextColor(35,30,25);pdf.setFont("helvetica","bold");pdf.setFontSize(18);
   const titleLines=pdf.splitTextToSize(event.title.toLocaleUpperCase("pt-BR"),contentWidth);pdf.text(titleLines,left,y);y+=titleLines.length*7+3;
   pdf.setFont("helvetica","normal");pdf.setFontSize(10);pdf.setTextColor(75,70,65);pdf.text(dateLabel+" • "+timeLabel,left,y);y+=6;
   if(event.venue){const venueLines=pdf.splitTextToSize("LOCAL: "+event.venue,contentWidth);pdf.text(venueLines,left,y);y+=venueLines.length*5+2;}
   y+=3;pdf.setFillColor(248,244,238);pdf.roundedRect(left,y,contentWidth,10,2,2,"F");
   pdf.setFont("helvetica","bold");pdf.setFontSize(10);pdf.setTextColor(105,55,25);pdf.text("ORDEM DO CULTO / CRUZADA",left+4,y+6.5);y+=17;
   if(!pdfItems.length){pdf.setFont("helvetica","normal");pdf.setFontSize(10);pdf.setTextColor(90,85,80);pdf.text("A programação ainda não possui participações cadastradas.",left,y);}
   for(let i=0;i<pdfItems.length;i++){
    const item=pdfItems[i],time=item.starts_at?new Date(item.starts_at).toLocaleTimeString("pt-BR",{hour:"2-digit",minute:"2-digit"}):"A definir";
    const detail=[kindLabels[item.item_type]||"Participação",item.participant_name||"Responsável a definir",item.duration_minutes?item.duration_minutes+" min":null].filter(Boolean).join("  •  ");
    const noteLines=item.notes?pdf.splitTextToSize("Orientação: "+item.notes,contentWidth-22):[];
    const itemTitle=pdf.splitTextToSize(item.title,contentWidth-48);
    const cardHeight=Math.max(14,itemTitle.length*4.5+5)+(detail?5:0)+(noteLines.length?noteLines.length*4.2+2:0);
    if(y+cardHeight>pageHeight-22){pdf.addPage();y=18;}
    pdf.setDrawColor(225,218,208);pdf.setLineWidth(0.25);pdf.roundedRect(left,y,contentWidth,cardHeight,2,2,"S");
    pdf.setFillColor(249,239,225);pdf.roundedRect(left+2,y+2,15,10,1.5,1.5,"F");
    pdf.setFont("helvetica","bold");pdf.setFontSize(9);pdf.setTextColor(145,65,20);pdf.text(String(i+1).padStart(2,"0"),left+9.5,y+8.5,{align:"center"});
    pdf.setFont("helvetica","bold");pdf.setFontSize(10.5);pdf.setTextColor(35,30,25);pdf.text(itemTitle,left+21,y+6);
    pdf.setFont("helvetica","normal");pdf.setFontSize(8.5);pdf.setTextColor(90,82,72);pdf.text(time,pageWidth-right-3,y+6,{align:"right"});
    let detailY=y+Math.max(11,itemTitle.length*4.5+7);
    if(detail){pdf.text(pdf.splitTextToSize(detail,contentWidth-25),left+21,detailY);detailY+=5;}
    if(noteLines.length){pdf.setTextColor(85,75,65);pdf.text(noteLines,left+21,detailY);}
    y+=cardHeight+3;
    if(item.lyrics&&item.item_type==="worship"){
     const lyricLines=pdf.splitTextToSize(item.lyrics,contentWidth-12);
     const lyricHeader="LETRA — "+item.title;
     const headerLines=pdf.splitTextToSize(lyricHeader,contentWidth-12);
     const blockHeight=headerLines.length*4.5+5;
     if(y+blockHeight>pageHeight-20){pdf.addPage();y=18;}
     pdf.setFillColor(250,248,244);pdf.roundedRect(left+5,y,contentWidth-10,blockHeight,1.5,1.5,"F");
     pdf.setFont("helvetica","bold");pdf.setFontSize(8.5);pdf.setTextColor(115,65,30);
     pdf.text(headerLines,left+8,y+4.5);y+=blockHeight+2;
     pdf.setFont("helvetica","normal");pdf.setFontSize(8.5);pdf.setTextColor(55,50,45);
     for(const line of lyricLines){
      if(y>pageHeight-19){pdf.addPage();y=18;}
      pdf.text(line,left+8,y);y+=4.2;
     }
     y+=4;
    }
   }
   const pageCount=pdf.getNumberOfPages();
   for(let page=1;page<=pageCount;page++){pdf.setPage(page);pdf.setDrawColor(225,218,208);pdf.setLineWidth(0.3);pdf.line(left,pageHeight-14,pageWidth-right,pageHeight-14);pdf.setFont("helvetica","normal");pdf.setFontSize(8);pdf.setTextColor(125,115,105);pdf.text("CHAMA VIVA • Programação para uso da equipe do púlpito",left,pageHeight-9);pdf.text("Página "+page+" de "+pageCount,pageWidth-right,pageHeight-9,{align:"right"});}
   const safeTitle=event.title.normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"");
   pdf.save("programacao-"+(safeTitle||"culto-cruzada")+".pdf");setMessage("PDF pronto para impressão em A4.");
  }catch(e){setError(e instanceof Error?e.message:"Não foi possível gerar o PDF.");}
  finally{setBusy(false);}
 }
 const canDownload=role==="admin"||role==="director";
 const canPublish=canDownload||(role==="trip_manager"&&canManageProgram);
 const canEdit=canDownload||(role==="trip_manager"&&canManageProgram);
 return <section className="program-builder">
  <div className="program-head"><div><b>Montar programação do culto</b><small>Defina a ordem, os participantes, horários e duração.</small></div><div className="program-head-actions">{canPublish&&<button className="module-primary" onClick={publish} disabled={!eventId||busy}><CheckCircle2 size={15}/> Publicar</button>}{canDownload&&<button className="module-primary" onClick={downloadPdf} disabled={!eventId||busy}><FileDown size={15}/> Baixar PDF</button>}</div></div>
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
   {items.length===0?<p className="data-empty">Nenhuma participação cadastrada para este evento.</p>:items.map((item,i)=><div className="program-row" key={item.id}><span className="program-number">{String(i+1).padStart(2,"0")}</span><div className="program-row-main">{editingId===item.id?<div className="program-edit-form"><label>Atividade<input value={editForm.title} onChange={e=>setEditForm(v=>({...v,title:e.target.value}))}/></label><label>Responsável<input value={editForm.participant_name} onChange={e=>setEditForm(v=>({...v,participant_name:e.target.value}))}/></label><label>Tipo<select value={editForm.item_type} onChange={e=>setEditForm(v=>({...v,item_type:e.target.value}))}><option value="opening">Abertura</option><option value="worship">Louvor</option><option value="greeting">Saudação</option><option value="preaching">Pregação</option><option value="prayer">Oração</option><option value="other">Outro</option></select></label><label>Horário<input type="time" value={editForm.time} onChange={e=>setEditForm(v=>({...v,time:e.target.value}))}/></label><label>Duração (min)<input type="number" min="1" value={editForm.duration_minutes} onChange={e=>setEditForm(v=>({...v,duration_minutes:e.target.value}))}/></label><label className="program-edit-notes">Observações<input value={editForm.notes} onChange={e=>setEditForm(v=>({...v,notes:e.target.value}))}/></label><div className="program-edit-actions"><button type="button" className="module-primary" disabled={busy} onClick={()=>saveEdit(item.id)}><Save size={13}/> Salvar alterações</button><button type="button" className="module-secondary" disabled={busy} onClick={()=>setEditingId(null)}><X size={13}/> Cancelar</button></div></div>:<><b>{item.title}</b><small>{item.participant_name||"Responsável a definir"} • {item.starts_at?new Date(item.starts_at).toLocaleTimeString("pt-BR",{hour:"2-digit",minute:"2-digit"}):"Horário a definir"}{item.duration_minutes?" • "+item.duration_minutes+" min":""}</small>{item.notes&&<small>{item.notes}</small>}{item.lyrics&&<details className="program-lyrics"><summary>Ver letra aprovada</summary><p>{item.lyrics}</p></details>}</>}</div>{canEdit&&<div className="program-row-actions">{editingId!==item.id&&<button onClick={()=>startEdit(item)} title="Editar participação"><Edit3 size={14}/></button>}<button onClick={()=>move(item,i,-1)} disabled={i===0||Boolean(editingId)} title="Subir"><ArrowUp size={14}/></button><button onClick={()=>move(item,i,1)} disabled={i===items.length-1||Boolean(editingId)} title="Descer"><ArrowDown size={14}/></button><button className="danger-action" onClick={()=>remove(item.id)} disabled={Boolean(editingId)} title="Remover"><Trash2 size={14}/></button></div>}</div>)}
  </div></>}
  {error&&<p className="module-error">{error}</p>}{message&&<p className="module-success"><CheckCircle2 size={14}/>{message}</p>}
 </section>;
}
