"use client";
import {useEffect,useState} from "react";
import {useRouter} from "next/navigation";
import {createClient} from "@/lib/supabase/client";
import type {RealtimeChannel} from "@supabase/supabase-js";
import {Bell,Check,ExternalLink} from "lucide-react";
type Notice={id:string;title:string;body:string;href:string|null;read_at:string|null;created_at:string};
export default function NotificationBell(){
 const [items,setItems]=useState<Notice[]>([]),[open,setOpen]=useState(false);
 const router=useRouter();
 async function load(){const db=createClient();const {data:{user}}=await db.auth.getUser();if(!user)return;const {data}=await db.from("notifications").select("id,title,body,href,read_at,created_at").eq("user_id",user.id).order("created_at",{ascending:false}).limit(20);setItems(data||[]);}
 useEffect(()=>{const db=createClient();let channel:RealtimeChannel|undefined;let active=true;(async()=>{const {data:{user}}=await db.auth.getUser();if(!user||!active)return;await load();channel=db.channel("user-notifications-"+user.id).on("postgres_changes",{event:"INSERT",schema:"public",table:"notifications",filter:"user_id=eq."+user.id},()=>load()).subscribe();})();return()=>{active=false;if(channel)db.removeChannel(channel);};},[]);
 async function markRead(item:Notice){const db=createClient();if(!item.read_at){await db.from("notifications").update({read_at:new Date().toISOString()}).eq("id",item.id);setItems(old=>old.map(x=>x.id===item.id?{...x,read_at:new Date().toISOString()}:x));}if(item.href){setOpen(false);router.push(item.href);}}
 async function markAll(){const db=createClient();const unread=items.filter(x=>!x.read_at).map(x=>x.id);if(unread.length){await db.from("notifications").update({read_at:new Date().toISOString()}).in("id",unread);setItems(old=>old.map(x=>({...x,read_at:x.read_at||new Date().toISOString()})));}}
 const unread=items.filter(x=>!x.read_at).length;
 return <div className="notification-wrap"><button className="icon-button notification-button" onClick={()=>setOpen(!open)} aria-label="Notificações"><Bell size={19}/>{unread>0&&<i className="notification-dot"/>}</button>{open&&<div className="notification-popover"><div className="popover-head"><strong>Notificações</strong><span>{unread} não lida(s)</span></div>{items.length===0?<p className="notification-empty">Você não tem notificações.</p>:items.map(item=><button key={item.id} className={"notification-item "+(!item.read_at?"unread":"")} onClick={()=>markRead(item)}><b>{item.title}</b><small>{item.body}</small><time>{new Date(item.created_at).toLocaleString("pt-BR")}</time>{item.href&&<ExternalLink size={13}/>}</button>)}{unread>0&&<button className="notification-mark-all" onClick={markAll}><Check size={13}/> Marcar todas como lidas</button>}</div>}</div>;
}
