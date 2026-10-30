"use client";
import Link from "next/link";
import {useEffect,useState} from "react";
import {usePathname,useRouter} from "next/navigation";
import {createClient} from "@/lib/supabase/client";
import {Flame,LayoutDashboard,Church,Users,CalendarDays,Music2,BusFront,MapPinned,Compass,MessageSquare,ChartNoAxesCombined,FileText,Settings,LogOut} from "lucide-react";
const items=[
 {label:"Painel",href:"/painel",roles:["admin","pastor","leader","driver","director","preacher","musician"],icon:LayoutDashboard},
 {label:"Igrejas",href:"/painel/igrejas",roles:["admin","pastor"],icon:Church},
 {label:"Usuários",href:"/painel/usuarios",roles:["admin"],icon:Users},
 {label:"Programação",href:"/painel/programacao",roles:["admin","pastor","director","preacher","musician"],icon:CalendarDays},
 {label:"Músicas",href:"/painel/musicas",roles:["admin","pastor","director","musician"],icon:Music2},
 {label:"Viagens",href:"/painel/viagens",roles:["admin","pastor","driver","leader"],icon:BusFront},
 {label:"Mapa",href:"/painel/mapa",roles:["admin","pastor","driver","leader"],icon:MapPinned},
 {label:"Evangelismo",href:"/painel/evangelismo",roles:["admin","pastor","leader"],icon:Compass},
 {label:"Mensagens",href:"/painel/mensagens",roles:["admin","pastor","leader","driver","director","preacher","musician"],icon:MessageSquare},
 {label:"Relatórios",href:"/painel/relatorios",roles:["admin","pastor"],icon:ChartNoAxesCombined},
 {label:"Documentos",href:"/painel/documentos",roles:["admin","pastor"],icon:FileText},
 {label:"Configurações",href:"/painel/configuracoes",roles:["admin","pastor","leader","driver","director","preacher","musician"],icon:Settings}
];
export default function ModuleNav(){
 const pathname=usePathname(),router=useRouter();const [role,setRole]=useState("");
 useEffect(()=>{(async()=>{const db=createClient();const {data:{user}}=await db.auth.getUser();if(user){const {data}=await db.from("profiles").select("role").eq("id",user.id).single();setRole(data?.role||"");}})();},[]);
 async function logout(){const db=createClient();await db.auth.signOut();router.replace("/login");router.refresh();}
 return <header className="module-nav"><Link href="/painel" className="module-nav-brand"><span><Flame size={17} fill="currentColor"/></span> CHAMA VIVA</Link><nav>{items.filter(i=>i.roles.includes(role)).map(({label,href,icon:Icon})=><Link key={href} href={href} className={pathname===href?"active":""}><Icon size={14}/>{label}</Link>)}</nav><button onClick={logout}><LogOut size={14}/> Sair</button></header>;
}
