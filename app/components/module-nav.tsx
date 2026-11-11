"use client";
import Link from "next/link";
import {useEffect,useState} from "react";
import {usePathname,useRouter} from "next/navigation";
import {createClient} from "@/lib/supabase/client";
import {Flame,LayoutDashboard,Church,Users,CalendarDays,Music2,BusFront,MapPinned,Compass,MessageSquare,ShieldCheck,ChartNoAxesCombined,FileText,Settings,LogOut} from "lucide-react";
const items=[
 {label:"Painel",href:"/painel",roles:["admin","pastor","leader","driver","director","preacher","musician","trip_manager"],icon:LayoutDashboard},
 {label:"Igrejas",href:"/painel/igrejas",roles:["admin","pastor"],icon:Church},
 {label:"Usuários",href:"/painel/usuarios",roles:["admin"],icon:Users},
 {label:"Permissões",href:"/painel/permissoes",roles:["admin"],icon:ShieldCheck},
 {label:"Minha gestão",href:"/painel/gestao-viagens",roles:["trip_manager"],icon:BusFront},
 {label:"Programação",href:"/painel/programacao",roles:["admin","pastor","director","preacher","musician","trip_manager"],icon:CalendarDays},
 {label:"Músicas",href:"/painel/musicas",roles:["admin","pastor","director","musician"],icon:Music2},
 {label:"Viagens",href:"/painel/viagens",roles:["admin","pastor","driver","trip_manager"],icon:BusFront},
 {label:"Viagens e evangelismo",href:"/painel/atividades",roles:["leader"],icon:Compass},
 {label:"Mapa",href:"/painel/mapa",roles:["admin","pastor","driver","leader","trip_manager"],icon:MapPinned},
 {label:"Evangelismo",href:"/painel/evangelismo",roles:["admin","pastor"],icon:Compass},
 {label:"Mensagens",href:"/painel/mensagens",roles:["admin","pastor","leader","driver","director","preacher","musician","trip_manager"],icon:MessageSquare},
 {label:"Relatórios",href:"/painel/relatorios",roles:["admin","pastor"],icon:ChartNoAxesCombined},
 {label:"Documentos",href:"/painel/documentos",roles:["admin"],icon:FileText},
 {label:"Configurações",href:"/painel/configuracoes",roles:["admin","pastor","leader","driver","director","preacher","musician","trip_manager"],icon:Settings}
];
export default function ModuleNav(){
 const pathname=usePathname(),router=useRouter();const [role,setRole]=useState("");const [access,setAccess]=useState({can_manage_trips:false,can_manage_participants:false,can_manage_program:false,can_manage_locations:false,can_send_messages:false,can_receive_messages:false});
 useEffect(()=>{(async()=>{const db=createClient();const {data:{user}}=await db.auth.getUser();if(user){const {data}=await db.from("profiles").select("role,can_manage_trips,can_manage_participants,can_manage_program,can_manage_locations,can_send_messages,can_receive_messages").eq("id",user.id).single();setRole(data?.role||"");setAccess({can_manage_trips:Boolean(data?.can_manage_trips),can_manage_participants:Boolean(data?.can_manage_participants),can_manage_program:Boolean(data?.can_manage_program),can_manage_locations:Boolean(data?.can_manage_locations),can_send_messages:Boolean(data?.can_send_messages),can_receive_messages:Boolean(data?.can_receive_messages)});}})();},[]);
 async function logout(){const db=createClient();await db.auth.signOut();router.replace("/login");router.refresh();}
 return <header className="module-nav"><Link href="/painel" className="module-nav-brand"><span><Flame size={17} fill="currentColor"/></span> CHAMA VIVA</Link><nav>{items.filter(i=>i.roles.includes(role)&&(role!=="trip_manager"||(i.href==="/painel/viagens"?(access.can_manage_trips||access.can_manage_participants):i.href==="/painel/programacao"?access.can_manage_program:i.href==="/painel/mapa"?access.can_manage_locations:i.href==="/painel/mensagens"?(access.can_send_messages||access.can_receive_messages):true))).map(({label,href,icon:Icon})=><Link key={href} href={href} className={pathname===href?"active":""}><Icon size={14}/>{label}</Link>)}</nav><button onClick={logout}><LogOut size={14}/> Sair</button></header>;
}
