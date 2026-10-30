"use client";

import { useMemo, useState } from "react";
import {
  Activity, Bell, BusFront, CalendarDays, ChevronDown, ChevronRight,
  Church, ClipboardList, Compass, FileText, Flame, LayoutDashboard,
  MapPinned, Menu, MessageSquare, Music2, Search, Settings, ShieldCheck,
  Users, X, ArrowUpRight, Clock3, MapPin, CircleCheck, CircleAlert,
  Plus, MoreHorizontal, Radio, UserRound, Route, ChartNoAxesCombined
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
  const [active, setActive] = useState("Visão geral");
  const [mobileOpen, setMobileOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [showWelcome, setShowWelcome] = useState(true);

  const grouped = useMemo(() => {
    const filtered = navItems.filter((item) => item.label.toLowerCase().includes(search.toLowerCase()));
    return [...new Set(filtered.map((item) => item.group))].map((group) => ({
      group,
      items: filtered.filter((item) => item.group === group),
    }));
  }, [search]);

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
          <div className="workspace-copy"><strong>Administração geral</strong><span>Todas as regiões</span></div>
          <ChevronDown size={16} className="muted-icon"/>
        </div>
        <label className="sidebar-search"><Search size={16}/><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar página..." /></label>
        <nav className="side-nav">
          {grouped.map(({ group, items }) => (
            <div className="nav-group" key={group}>
              <p className="nav-label">{group}</p>
              {items.map(({ label, icon: Icon }) => (
                <button key={label} className={`nav-link ${active === label ? "nav-link-active" : ""}`} onClick={() => { setActive(label); setMobileOpen(false); }}>
                  <Icon size={18}/><span>{label}</span>{label === "Mensagens e avisos" && <i className="nav-count">3</i>}
                </button>
              ))}
            </div>
          ))}
          {grouped.length === 0 && <p className="empty-search">Nenhuma página encontrada.</p>}
        </nav>
        <div className="sidebar-bottom">
          <div className="security-note"><ShieldCheck size={17}/><div><strong>Acesso protegido</strong><span>Área administrativa</span></div></div>
          <button className="profile-row" onClick={() => setActive("Configurações")}>
            <div className="avatar avatar-admin">AD</div><div className="profile-copy"><strong>Administrador</strong><span>Administrador geral</span></div><MoreHorizontal size={18}/>
          </button>
        </div>
      </aside>

      <section className="main-area">
        <header className="topbar">
          <div className="topbar-left">
            <button className="icon-button mobile-menu" onClick={() => setMobileOpen(true)} aria-label="Abrir menu"><Menu size={21}/></button>
            <div className="breadcrumb">CHAMA VIVA <ChevronRight size={14}/> <strong>{active}</strong></div>
          </div>
          <div className="topbar-actions">
            <div className="today-label"><CalendarDays size={16}/> Sexta-feira, 30 de outubro</div>
            <div className="notification-wrap">
              <button className={`icon-button notification-button ${notificationsOpen ? "pressed" : ""}`} onClick={() => setNotificationsOpen(!notificationsOpen)} aria-label="Notificações">
                <Bell size={19}/><i className="notification-dot"/>
              </button>
              {notificationsOpen && <div className="notification-popover"><div className="popover-head"><strong>Notificações</strong><span>3 novas</span></div><p><b>Nova letra enviada</b><small>Equipe de louvor • há 8 min</small></p><p><b>Viagem adicionada</b><small>Região Norte • há 24 min</small></p><p><b>Observação recebida</b><small>Pastor • há 42 min</small></p><button onClick={() => { setActive("Mensagens e avisos"); setNotificationsOpen(false); }}>Ver central de comunicação</button></div>}
            </div>
            <div className="avatar avatar-admin top-avatar">AD</div>
          </div>
        </header>

        <div className="page-content">
          {isOverview ? <>
            {showWelcome && <section className="welcome-banner">
              <div className="welcome-copy"><span className="eyebrow"><Flame size={14}/> PAINEL ADMINISTRATIVO</span><h1>Olá! Bem-vindo ao <em>CHAMA VIVA.</em></h1><p>Uma visão completa das igrejas, programações e equipes em um só lugar.</p></div>
              <div className="welcome-art"><div className="art-ring ring-one"/><div className="art-ring ring-two"/><Flame size={82} strokeWidth={1.15}/></div>
              <button className="banner-close" onClick={() => setShowWelcome(false)} aria-label="Fechar boas-vindas"><X size={17}/></button>
            </section>}

            <div className="section-heading"><div><span className="eyebrow muted-eyebrow">ACOMPANHAMENTO GERAL</span><h2>Visão geral</h2><p>Acompanhe o que está acontecendo em todas as regiões.</p></div><button className="button-primary" onClick={() => setActive("Cultos e programação")}><Plus size={17}/> Nova programação</button></div>

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
                <button className="panel-footer-button" onClick={() => setActive("Relatórios")}>Ver histórico de atividades <ArrowUpRight size={15}/></button>
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
                  <QuickAction icon={Church} label="Cadastrar igreja" onClick={() => setActive("Igrejas e regiões")}/>
                  <QuickAction icon={Users} label="Convidar usuário" onClick={() => setActive("Usuários e equipes")}/>
                  <QuickAction icon={CalendarDays} label="Criar programação" onClick={() => setActive("Cultos e programação")}/>
                  <QuickAction icon={Route} label="Organizar viagem" onClick={() => setActive("Viagens e ônibus")}/>
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
