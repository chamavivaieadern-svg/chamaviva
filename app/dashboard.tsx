"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import NotificationBell from "./components/notification-bell";
import { createClient } from "@/lib/supabase/client";
import "./dashboard.css";
import {
  BusFront, CalendarDays, ChevronDown, ChevronRight,
  Church, Compass, FileText, Flame, LayoutDashboard,
  MapPinned, Menu, MessageSquare, Music2, Search, Settings, ShieldCheck,
  Users, X, ArrowUpRight, Clock3, MapPin, CircleCheck, CircleAlert, LogOut,
  Plus, MoreHorizontal, Route, ChartNoAxesCombined
} from "lucide-react";

type NavItem = { label: string; icon: typeof LayoutDashboard; group: string };
const navItems: NavItem[] = [
  { label: "Visão geral", icon: LayoutDashboard, group: "PRINCIPAL" },
  { label: "Igrejas e regiões", icon: Church, group: "GESTÃO" },
  { label: "Usuários e equipes", icon: Users, group: "GESTÃO" },
  { label: "Cultos e programação", icon: CalendarDays, group: "EVENTOS" },
  { label: "Músicas e repertório", icon: Music2, group: "EVENTOS" },
  { label: "Viagens e ônibus", icon: BusFront, group: "LOGÍSTICA" },
  { label: "Mapa ao vivo", icon: MapPinned, group: "LOGÍSTICA" },
  { label: "Evangelismo", icon: Compass, group: "LOGÍSTICA" },
  { label: "Mensagens e avisos", icon: MessageSquare, group: "COMUNICAÇÃO" },
  { label: "Relatórios", icon: ChartNoAxesCombined, group: "SISTEMA" },
  { label: "Documentos e logos", icon: FileText, group: "SISTEMA" },
  { label: "Configurações", icon: Settings, group: "SISTEMA" },
];

const events = [
  { day: "02", month: "NOV", title: "Culto de celebração", church: "Igreja Central • Região Norte", time: "19:00", status: "Confirmado", tone: "green" },
  { day: "05", month: "NOV", title: "Cruzada Chama Viva", church: "Praça da Bíblia • Região Sul", time: "18:30", status: "Em organização", tone: "orange" },
  { day: "08", month: "NOV", title: "Evangelismo regional", church: "Ponto de encontro: Igreja Central", time: "08:00", status: "Planejado", tone: "blue" },
];

const activities = [
  { icon: Music2, title: "Letra enviada para aprovação", detail: "Equipe de louvor • Igreja Central", time: "Há 8 min", color: "orange" },
  { icon: BusFront, title: "Viagem programada", detail: "Ônibus 01 • Região Norte", time: "Há 24 min", color: "blue" },
  { icon: MessageSquare, title: "Nova observação do pastor", detail: "Pastor da Região Sul", time: "Há 42 min", color: "purple" },
];

export default function Home() {
  const router = useRouter();
  const [role,setRole] = useState("pending");
  const [profileName,setProfileName] = useState("Usuário");
  const [churchName,setChurchName] = useState("Minha igreja");
  const roleLabels:Record<string,string>={admin:"Administrador geral",pastor:"Pastor",leader:"Líder de grupo",driver:"Motorista",director:"Dirigente",preacher:"Pregador",musician:"Músico"};
  const rolePages:Record<string,string[]>={admin:navItems.map(x=>x.label),pastor:["Visão geral","Igrejas e regiões","Cultos e programação","Músicas e repertório","Viagens e ônibus","Mapa ao vivo","Evangelismo","Mensagens e avisos","Relatórios","Documentos e logos","Configurações"],leader:["Visão geral","Viagens e ônibus","Mapa ao vivo","Evangelismo","Mensagens e avisos"],driver:["Visão geral","Viagens e ônibus","Mapa ao vivo","Mensagens e avisos"],director:["Visão geral","Cultos e programação","Músicas e repertório","Mensagens e avisos"],preacher:["Visão geral","Cultos e programação","Mensagens e avisos"],musician:["Visão geral","Cultos e programação","Músicas e repertório","Mensagens e avisos"]};
  const [active, setActive] = useState("Visão geral");
  const navigate = (label:string) => { const paths:Record<string,string>={"Visão geral":"/painel","Igrejas e regiões":"/painel/igrejas","Usuários e equipes":"/painel/usuarios","Cultos e programação":"/painel/programacao","Músicas e repertório":"/painel/musicas","Viagens e ônibus":"/painel/viagens","Mapa ao vivo":"/painel/mapa","Evangelismo":"/painel/evangelismo","Mensagens e avisos":"/painel/mensagens","Relatórios":"/painel/relatorios","Documentos e logos":"/painel/documentos","Configurações":"/painel/configuracoes"}; setActive(label); setMobileOpen(false); router.push(paths[label]||"/painel"); };
  const logout = async () => { const db=createClient(); await db.auth.signOut(); router.replace("/login"); router.refresh(); };
  const [mobileOpen, setMobileOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [showWelcome, setShowWelcome] = useState(true);
  useEffect(()=>{(async()=>{const db=createClient();const {data:{user}}=await db.auth.getUser();if(!user)return;const {data:p}=await db.from("profiles").select("full_name,role").eq("id",user.id).single();if(p){setRole(p.role);setProfileName(p.full_name||"Usuário");if(p.role==="admin")setChurchName("Todas as regiões");else{const {data:c}=await db.from("churches").select("name").limit(1).maybeSingle();if(c?.name)setChurchName(c.name);}}})();},[]);
  const visibleNavItems=rolePages[role]||["Visão geral"];
  const initials=profileName.split(" ").filter(Boolean).slice(0,2).map(x=>x[0]).join("").toUpperCase();

  const grouped = useMemo(() => {
    const filtered = navItems.filter((item) => visibleNavItems.includes(item.label) && item.label.toLowerCase().includes(search.toLowerCase()));
    return [...new Set(filtered.map((item) => item.group))].map((group) => ({
      group,
      items: filtered.filter((item) => item.group === group),
    }));
  }, [search,role]);

  const current = navItems.find((item) => item.label === active) ?? navItems[0];
  const isOverview = active === "Visão geral";

  return (
    <main className="app-shell">
      {mobileOpen && <button className="mobile-scrim" aria-label="Fechar menu" onClick={() => setMobileOpen(false)} />}
      <aside className={`sidebar ${mobileOpen ? "sidebar-open" : ""}`}>
        <div className="brand">
          <div className="brand-mark"><Flame size={23} fill="currentColor" /></div>
          <div><strong>CHAMA VIVA</strong><span>GESTÃO E EVANGELISMO</span></div>
          <button className="icon-button mobile-close" onClick={() => setMobileOpen(false)} aria-label="Fechar menu"><X size={19}/></button>
        </div>
        <div className="workspace-switch">
          <div className="workspace-icon"><Church size={18}/></div>
          <div className="workspace-copy"><strong>{role==="admin"?"Administração geral":churchName}</strong><span>{roleLabels[role]||"Área autorizada"}</span></div>
          <ChevronDown size={16} className="muted-icon"/>
        </div>
        <label className="sidebar-search"><Search size={16}/><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar página..." /></label>
        <nav className="side-nav">
          {grouped.map(({ group, items }) => (
            <div className="nav-group" key={group}>
              <p className="nav-label">{group}</p>
              {items.map(({ label, icon: Icon }) => (
                <button key={label} className={`nav-link ${active === label ? "nav-link-active" : ""}`} onClick={() => navigate(label)}>
                  <Icon size={18}/><span>{label}</span>{label === "Mensagens e avisos" && <i className="nav-count">3</i>}
                </button>
              ))}
            </div>
          ))}
          {grouped.length === 0 && <p className="empty-search">Nenhuma página encontrada.</p>}
        </nav>
        <div className="sidebar-bottom">
          <div className="security-note"><ShieldCheck size={17}/><div><strong>Acesso protegido</strong><span>Área administrativa</span></div></div>
          <button className="profile-row" onClick={() => navigate("Configurações")}>
            <div className="avatar avatar-admin">{initials}</div><div className="profile-copy"><strong>{profileName}</strong><span>{roleLabels[role]||"Usuário"}</span></div><MoreHorizontal size={18}/>
          </button>
          <button className="logout-button" onClick={logout}><LogOut size={15}/> Sair da conta</button>
        </div>
      </aside>

      <section className="main-area">
        <header className="topbar">
          <div className="topbar-left">
            <button className="icon-button mobile-menu" onClick={() => setMobileOpen(true)} aria-label="Abrir menu"><Menu size={21}/></button>
            <div className="breadcrumb">CHAMA VIVA <ChevronRight size={14}/> <strong>{active}</strong></div>
          </div>
          <div className="topbar-actions">
            <div className="today-label"><CalendarDays size={16}/> {new Date().toLocaleDateString("pt-BR",{weekday:"long",day:"2-digit",month:"long"})}</div>
            <NotificationBell/>
            <div className="avatar avatar-admin top-avatar">{initials}</div>
          </div>
        </header>

        <div className="page-content">
          {isOverview ? <>
            {showWelcome && <section className="welcome-banner">
              <div className="welcome-copy"><span className="eyebrow"><Flame size={14}/> PAINEL ADMINISTRATIVO</span><h1>Olá, {profileName.split(" ")[0]}! Bem-vindo ao <em>CHAMA VIVA.</em></h1><p>Uma visão completa das igrejas, programações e equipes em um só lugar.</p></div>
              <div className="welcome-art"><div className="art-ring ring-one"/><div className="art-ring ring-two"/><Flame size={82} strokeWidth={1.15}/></div>
              <button className="banner-close" onClick={() => setShowWelcome(false)} aria-label="Fechar boas-vindas"><X size={17}/></button>
            </section>}

            <div className="section-heading"><div><span className="eyebrow muted-eyebrow">ACOMPANHAMENTO GERAL</span><h2>Visão geral</h2><p>Acompanhe o que está acontecendo em todas as regiões.</p></div><button className="button-primary" onClick={() => navigate("Cultos e programação")}><Plus size={17}/> Nova programação</button></div>

            <section className="stats-grid">
              <StatCard icon={Church} label="Igrejas cadastradas" value="—" helper="Cadastre suas regiões" tint="orange"/>
              <StatCard icon={Users} label="Pessoas e equipes" value="—" helper="Usuários serão carregados" tint="yellow"/>
              <StatCard icon={CalendarDays} label="Próximos eventos" value="03" helper="Exemplos de demonstração" tint="red"/>
              <StatCard icon={BusFront} label="Viagens em andamento" value="—" helper="GPS ainda não conectado" tint="blue"/>
            </section>

            <section className="content-grid">
              <div className="panel events-panel">
                <div className="panel-heading"><div><h3>Próximas programações</h3><p>Agenda geral das regiões</p></div><button className="text-button" onClick={() => setActive("Cultos e programação")}>Ver calendário <ArrowUpRight size={15}/></button></div>
                <div className="event-list">{events.map((event) => <div className="event-row" key={event.title}><div className="date-tile"><strong>{event.day}</strong><span>{event.month}</span></div><div className="event-info"><strong>{event.title}</strong><span><MapPin size={13}/>{event.church}</span></div><div className="event-meta"><span className="event-time"><Clock3 size={13}/>{event.time}</span><span className={`status-pill status-${event.tone}`}>{event.status}</span></div><ChevronRight className="event-chevron" size={17}/></div>)}</div>
                <button className="panel-footer-button" onClick={() => setActive("Cultos e programação")}>Abrir programação completa <ArrowUpRight size={15}/></button>
              </div>
              <div className="panel activity-panel">
                <div className="panel-heading"><div><h3>Atividade recente</h3><p>Movimentações do sistema</p></div><button className="icon-button subtle-icon" aria-label="Mais opções"><MoreHorizontal size={19}/></button></div>
                <div className="activity-list">{activities.map(({icon: Icon,title,detail,time,color}) => <div className="activity-row" key={title}><div className={`activity-icon activity-${color}`}><Icon size={17}/></div><div className="activity-copy"><strong>{title}</strong><span>{detail}</span><small>{time}</small></div></div>)}</div>
                <button className="panel-footer-button" onClick={() => navigate("Relatórios")}>Ver histórico de atividades <ArrowUpRight size={15}/></button>
              </div>
            </section>

            <section className="content-grid lower-grid">
              <div className="panel map-panel">
                <div className="panel-heading"><div><h3>Central de localização</h3><p>Ônibus, equipes e pontos de cruzada</p></div><span className="live-label"><i/> AO VIVO</span></div>
                <div className="map-placeholder"><div className="map-roads road-a"/><div className="map-roads road-b"/><div className="map-roads road-c"/><div className="map-block block-a"/><div className="map-block block-b"/><div className="map-block block-c"/><div className="map-pin pin-bus"><BusFront size={16}/></div><div className="map-pin pin-team"><Users size={15}/></div><div className="map-pin pin-cross"><Church size={16}/></div><div className="map-caption"><MapPinned size={15}/> O mapa será ativado após configurar a integração.</div></div>
                <div className="map-legend"><span><i className="legend-bus"/> Ônibus</span><span><i className="legend-team"/> Grupos</span><span><i className="legend-cross"/> Cruzada</span></div>
              </div>
              <div className="panel quick-panel">
                <div className="panel-heading"><div><h3>Acesso rápido</h3><p>Atalhos para tarefas frequentes</p></div></div>
                <div className="quick-actions">
                  <QuickAction icon={Church} label="Cadastrar igreja" onClick={() => navigate("Igrejas e regiões")}/>
                  <QuickAction icon={Users} label="Convidar usuário" onClick={() => navigate("Usuários e equipes")}/>
                  <QuickAction icon={CalendarDays} label="Criar programação" onClick={() => setActive("Cultos e programação")}/>
                  <QuickAction icon={Route} label="Organizar viagem" onClick={() => navigate("Viagens e ônibus")}/>
                </div>
              </div>
            </section>
            <div className="demo-disclaimer"><CircleAlert size={16}/><span>Prévia inicial: os números, eventos e atividades exibidos são demonstrativos. Os dados reais aparecerão após conectar o Supabase e configurar os acessos.</span></div>
          </> : <ModulePlaceholder title={active} icon={current.icon} onBack={() => setActive("Visão geral")}/>}
          <footer className="app-footer"><span><Flame size={14} fill="currentColor"/> CHAMA VIVA</span><span>Organização com propósito.</span><span>Versão inicial • 0.1.0</span></footer>
        </div>
      </section>
    </main>
  );
}

function StatCard({icon: Icon,label,value,helper,tint}:{icon:typeof Church;label:string;value:string;helper:string;tint:string}) {
  return <div className="stat-card"><div className={`stat-icon stat-${tint}`}><Icon size={19}/></div><span className="stat-label">{label}</span><strong className="stat-value">{value}</strong><span className="stat-helper">{helper}</span></div>;
}
function QuickAction({icon: Icon,label,onClick}:{icon:typeof Church;label:string;onClick:()=>void}) {
  return <button className="quick-action" onClick={onClick}><span><Icon size={18}/></span><strong>{label}</strong><ChevronRight size={16}/></button>;
}
function ModulePlaceholder({title,icon:Icon,onBack}:{title:string;icon:typeof Church;onBack:()=>void}) {
  return <section className="module-placeholder"><div className="module-icon"><Icon size={27}/></div><span className="eyebrow muted-eyebrow">MÓDULO DO CHAMA VIVA</span><h1>{title}</h1><p>Esta área já está prevista na estrutura do projeto. A próxima etapa é implementar suas telas, regras de acesso e integração com o Supabase.</p><div className="module-checklist"><div><CircleCheck size={17}/> Interface adaptada para computador e celular</div><div><CircleCheck size={17}/> Permissões específicas por perfil e igreja</div><div><CircleCheck size={17}/> Registro de alterações e atualizações em tempo real</div></div><button className="button-primary" onClick={onBack}>Voltar para visão geral</button></section>;
}
