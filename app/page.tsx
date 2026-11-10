import Link from "next/link";
import { ArrowRight, Flame, MapPinned, Users, CalendarDays, ShieldCheck, BusFront, MessageCircle } from "lucide-react";

const features = [
  { icon: CalendarDays, title: "Programação organizada", text: "Cultos, escalas, participantes e músicas em um só lugar." },
  { icon: Users, title: "Equipes e igrejas", text: "Cada pessoa acessa somente as informações da sua função e igreja." },
  { icon: BusFront, title: "Viagens e evangelismo", text: "Organização de viagens, grupos, motoristas e relatórios." },
  { icon: MapPinned, title: "Mapas e localização", text: "Consulte locais e acompanhe atividades autorizadas." },
  { icon: MessageCircle, title: "Comunicação", text: "Avisos e mensagens para manter as equipes alinhadas." },
  { icon: ShieldCheck, title: "Acesso protegido", text: "Contas individuais, permissões por função e controle administrativo." },
];

export default function HomePage() {
  return <main className="landing-page">
    <header className="landing-header"><Link href="/" className="landing-brand"><span><Flame size={24} fill="currentColor"/></span><b>CHAMA VIVA</b></Link><nav><a href="#sobre">Sobre</a><a href="#recursos">Recursos</a><Link href="/login" className="landing-login">Entrar <ArrowRight size={15}/></Link></nav></header>
    <section className="landing-hero"><div className="landing-hero-copy"><span className="landing-eyebrow">GESTÃO E EVANGELISMO</span><h1>Organização que fortalece a <em>missão.</em></h1><p>Uma plataforma para organizar igrejas, programações, viagens e equipes de evangelismo com mais clareza, cuidado e segurança.</p><div className="landing-actions"><Link href="/login" className="landing-primary">Entrar no sistema <ArrowRight size={17}/></Link><a href="#recursos" className="landing-secondary">Conhecer recursos</a></div><div className="landing-trust"><ShieldCheck size={16}/> Acesso individual e protegido para cada equipe</div></div><div className="landing-hero-art" aria-label="Ilustração de chama e luz"><div className="landing-orbit orbit-one"/><div className="landing-orbit orbit-two"/><div className="landing-flame"><Flame size={120} fill="currentColor" strokeWidth={1.1}/></div><span className="landing-art-tag tag-top">FÉ • SERVIÇO • MISSÃO</span><span className="landing-art-tag tag-bottom">CHAMA VIVA</span></div></section>
    <section className="landing-about" id="sobre"><span className="landing-eyebrow">UMA GESTÃO MAIS SIMPLES</span><h2>Tudo conectado para servir melhor.</h2><p>O CHAMA VIVA reúne as ferramentas do dia a dia em um ambiente fácil de usar, acessível pelo computador ou celular.</p></section>
    <section className="landing-features" id="recursos">{features.map(({icon:Icon,title,text})=><article className="landing-feature" key={title}><span><Icon size={21}/></span><h3>{title}</h3><p>{text}</p></article>)}</section>
    <section className="landing-cta"><div><span className="landing-eyebrow">CHAMA VIVA</span><h2>Vamos organizar a missão?</h2><p>Entre com seu e-mail ou número de matrícula.</p></div><Link href="/login" className="landing-primary">Acessar minha conta <ArrowRight size={17}/></Link></section>
    <footer className="landing-footer"><Link href="/" className="landing-brand"><span><Flame size={18} fill="currentColor"/></span><b>CHAMA VIVA</b></Link><small>Gestão e Evangelismo</small><small>© {new Date().getFullYear()} CHAMA VIVA</small></footer>
  </main>;
}
