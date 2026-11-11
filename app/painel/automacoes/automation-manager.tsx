"use client";
import {useEffect,useState} from "react";
import {createClient} from "@/lib/supabase/client";
import {Zap,RefreshCw,CheckCircle2,PauseCircle,AlertCircle,History} from "lucide-react";
type Rule={id:string;event_key:string;name:string;description:string;enabled:boolean;updated_at:string};
type Run={id:string;event_key:string;source_table:string;source_id:string;status:string;message:string;details:Record<string,unknown>;created_at:string};
const eventNames:Record<string,string>={trip_created:"Nova viagem",trip_completed:"Viagem concluída",group_checklist_completed:"Checklist concluído",roll_call_completed:"Chamada finalizada"};
export default function AutomationManager(){
 const [rules,setRules]=useState<Rule[]>([]),[runs,setRuns]=useState<Run[]>([]),[busy,setBusy]=useState(""),[loading,setLoading]=useState(true),[error,setError]=useState(""),[notice,setNotice]=useState("");
 const db=createClient();
 async function load(){
  setLoading(true);setError("");
  const [r,h]=await Promise.all([
   db.from("automation_rules").select("id,event_key,name,description,enabled,updated_at").order("name"),
   db.from("automation_runs").select("id,event_key,source_table,source_id,status,message,details,created_at").order("created_at",{ascending:false}).limit(50)
  ]);
  if(r.error)setError(r.error.message);else setRules(r.data||[]);
  if(h.error)setError(h.error.message);else setRuns((h.data||[]) as Run[]);
  setLoading(false);
 }
 useEffect(()=>{load();},[]);
 async function toggle(rule:Rule){
  setBusy(rule.id);setError("");setNotice("");
  const {error}=await db.from("automation_rules").update({enabled:!rule.enabled,updated_at:new Date().toISOString()}).eq("id",rule.id);
  if(error)setError(error.message);else{setRules(rows=>rows.map(r=>r.id===rule.id?{...r,enabled:!rule.enabled}:r));setNotice("Configuração da automação atualizada.");}
  setBusy("");
 }
 return <section className="module-action-form" style={{marginTop:18}}>
  <div className="module-action-heading"><Zap size={19}/><div><b>Central de automações</b><small>O ADM controla os avisos automáticos e acompanha o histórico de execução.</small></div></div>
  {error&&<p className="module-error"><AlertCircle size={14}/>{error}</p>}{notice&&<p className="module-success">{notice}</p>}
  <div style={{display:"grid",gap:10}}>
   {loading?<p className="data-empty">Carregando automações...</p>:rules.map(rule=><article key={rule.id} style={{display:"flex",gap:12,alignItems:"center",justifyContent:"space-between",border:"1px solid #eee2d8",borderRadius:11,padding:13,flexWrap:"wrap"}}>
    <div style={{display:"grid",gap:4,flex:1,minWidth:190}}><b style={{fontSize:13}}>{rule.name}</b><small style={{fontSize:11,color:"#88796f"}}>{rule.description}</small><small style={{fontSize:10,color:"#a34d13"}}>{eventNames[rule.event_key]||rule.event_key}</small></div>
    <button type="button" className={rule.enabled?"module-primary":"module-secondary"} disabled={busy===rule.id} onClick={()=>toggle(rule)}>{rule.enabled?<><CheckCircle2 size={14}/> Ativa</>:<><PauseCircle size={14}/> Pausada</>}</button>
   </article>)}
  </div>
  <div className="travel-report-head" style={{marginTop:22}}><div><History size={18}/><div><b>Histórico de execuções</b><small>Últimas 50 automações processadas.</small></div></div><span>{runs.length} registro(s)</span></div>
  {runs.length===0&&!loading?<p className="data-empty">Ainda não houve execuções registradas.</p>:runs.map(run=><article key={run.id} className="travel-report-card"><div className="travel-report-title"><b>{eventNames[run.event_key]||run.event_key}</b><span className={"user-status "+run.status}>{run.status==="completed"?"Concluída":run.status==="failed"?"Falhou":"Ignorada"}</span></div><small>{run.message}</small><div className="travel-report-meta"><span>{run.source_table}</span><span>{new Date(run.created_at).toLocaleString("pt-BR")}</span></div></article>)}
  <button type="button" className="module-secondary" style={{marginTop:12}} onClick={load}><RefreshCw size={14}/> Atualizar histórico</button>
 </section>;
}
