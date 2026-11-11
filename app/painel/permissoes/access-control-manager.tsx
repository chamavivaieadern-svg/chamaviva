"use client";
import {useEffect,useState} from "react";
import {createClient} from "@/lib/supabase/client";
import {ShieldCheck,Save,RefreshCw,MessageSquare,MapPin,BusFront,Users,CalendarDays,ClipboardCheck} from "lucide-react";

type Person={id:string;full_name:string;role:string;status:string;trip_manager_previous_role:string|null;can_manage_trips:boolean;can_manage_participants:boolean;can_manage_program:boolean;can_manage_locations:boolean;can_send_messages:boolean;can_receive_messages:boolean;can_manage_roll_calls:boolean;can_manage_checklists:boolean};
const empty={can_manage_trips:false,can_manage_participants:false,can_manage_program:false,can_manage_locations:false,can_send_messages:false,can_receive_messages:false,can_manage_roll_calls:false,can_manage_checklists:false};
const permissions:{key:keyof typeof empty;label:string;detail:string;icon:typeof BusFront}[]=[
 {key:"can_manage_trips",label:"Cadastrar e editar viagens",detail:"Criar e alterar viagens da igreja vinculada",icon:BusFront},
 {key:"can_manage_participants",label:"Participantes",detail:"Adicionar, editar e organizar passageiros",icon:Users},
 {key:"can_manage_program",label:"Programação",detail:"Criar e editar a programação autorizada",icon:CalendarDays},
 {key:"can_manage_locations",label:"Mapa e locais",detail:"Editar rotas, pontos de desembarque e raios dos grupos",icon:MapPin},
 {key:"can_send_messages",label:"Enviar mensagens",detail:"Autoriza iniciar conversas e enviar observações",icon:MessageSquare},
 {key:"can_receive_messages",label:"Receber mensagens",detail:"Autoriza receber mensagens de outros usuários",icon:MessageSquare},
 {key:"can_manage_roll_calls",label:"Gerenciar chamadas",detail:"Fazer ou delegar chamadas de saída, retorno e grupos",icon:Users},
 {key:"can_manage_checklists",label:"Gerenciar checklists",detail:"Acompanhar e editar checklists de preparação dos grupos",icon:ClipboardCheck}
];
export default function AccessControlManager(){
 const [people,setPeople]=useState<Person[]>([]),[selected,setSelected]=useState(""),[currentUser,setCurrentUser]=useState(""),[draft,setDraft]=useState(empty),[original,setOriginal]=useState<Person|null>(null),[loading,setLoading]=useState(true),[busy,setBusy]=useState(false),[error,setError]=useState(""),[notice,setNotice]=useState("");
 const db=createClient();
 async function load(){setLoading(true);setError("");const {data:{user}}=await db.auth.getUser();setCurrentUser(user?.id||"");const {data,error}=await db.from("profiles").select("id,full_name,role,status,trip_manager_previous_role,can_manage_trips,can_manage_participants,can_manage_program,can_manage_locations,can_send_messages,can_receive_messages,can_manage_roll_calls,can_manage_checklists").order("full_name");if(error)setError(error.message);const rows=(data||[]) as Person[];setPeople(rows);const person=rows.find(p=>p.id===selected&&p.id!==user?.id)||rows.find(p=>p.id!==user?.id&&p.status==="active");if(person){setSelected(person.id);setOriginal(person);setDraft(Object.fromEntries(Object.keys(empty).map(k=>[k,Boolean(person[k as keyof Person])])) as typeof empty);}setLoading(false);}
 useEffect(()=>{load();},[]);
 function choose(id:string){setSelected(id);const p=people.find(x=>x.id===id);if(p){setOriginal(p);setDraft(Object.fromEntries(Object.keys(empty).map(k=>[k,Boolean(p[k as keyof Person])])) as typeof empty);}setNotice("");}
 async function save(){if(!original)return;setBusy(true);setError("");setNotice("");try{const hasTrip= draft.can_manage_trips||draft.can_manage_participants||draft.can_manage_program||draft.can_manage_locations||draft.can_manage_roll_calls||draft.can_manage_checklists;const nextRole=hasTrip?"trip_manager":original.role==="trip_manager"?(original.trip_manager_previous_role||"leader"):original.role;const previousRole=hasTrip?(original.role==="trip_manager"?original.trip_manager_previous_role:original.role):null;
 const {error}=await db.from("profiles").update({...draft,role:nextRole,trip_manager_previous_role:previousRole}).eq("id",original.id);if(error)throw error;
 const {data:{user}}=await db.auth.getUser();if(user)await db.from("audit_logs").insert({actor_id:user.id,action:"permissions.updated",target_table:"profiles",target_id:original.id,details:{...draft,role:nextRole}});
 setNotice("Permissões salvas. O acesso do usuário foi atualizado.");await load();
 }catch(e){setError(e instanceof Error?e.message:"Não foi possível salvar as permissões.");}finally{setBusy(false);}}
 const chosen=people.find(p=>p.id===selected);
 return <section className="module-action-form" style={{marginTop:18}}>
  <div className="module-action-heading"><ShieldCheck size={19}/><div><b>Controle de permissões</b><small>Somente o ADM pode liberar ou retirar acessos especiais.</small></div></div>
  {loading?<p className="data-empty">Carregando usuários...</p>:<><label style={{display:"grid",gap:7,maxWidth:520}}>Usuário<select value={selected} onChange={e=>choose(e.target.value)}><option value="">Selecione</option>{people.filter(p=>p.status==="active"&&p.id!==currentUser).map(p=><option key={p.id} value={p.id}>{p.full_name} — {p.role==="trip_manager"?"Gestor de viagens":p.role}</option>)}</select></label>
  {chosen&&<><div style={{display:"grid",gap:10,marginTop:18}}>{permissions.map(item=>{const Icon=item.icon;return <label key={item.key} style={{display:"flex",gap:12,alignItems:"center",border:"1px solid #eee2d8",borderRadius:10,padding:12,cursor:"pointer"}}><input type="checkbox" checked={draft[item.key]} onChange={e=>setDraft(v=>({...v,[item.key]:e.target.checked}))}/><Icon size={18}/><span style={{display:"grid",gap:3,flex:1}}><b style={{fontSize:12}}>{item.label}</b><small style={{fontSize:10,color:"#8b7b70"}}>{item.detail}</small></span></label>;})}</div>
  <p style={{fontSize:11,color:"#8b7b70",lineHeight:1.5}}>Quando qualquer permissão de gestão de viagens estiver ativa, o usuário recebe o perfil limitado de Gestor de Viagens. Ao retirar todas essas permissões, o perfil anterior é restaurado. As permissões de mensagens são independentes.</p>
  <button className="module-primary" disabled={busy} onClick={save}><Save size={15}/>{busy?"Salvando...":"Salvar permissões"}</button></>}
  </>}
  {error&&<p className="module-error">{error}</p>}{notice&&<p className="module-success">{notice}</p>}
  <div className="church-audit-note"><RefreshCw size={14}/>Toda alteração é registrada no histórico de auditoria.</div>
 </section>;
}
