"use client";
import {useState} from "react";
import Link from "next/link";
import ModuleNav from "@/app/components/module-nav";
import {ArrowLeft,ArrowRight,BookOpen,BusFront,CalendarDays,Church,FileText,MapPin,MessageSquare,Music2,Settings,ShieldCheck,Users,Zap,PlayCircle} from "lucide-react";

const pages=[
 {id:"painel",name:"Painel",description:"Resumo geral, indicadores e atalhos de gestão.",icon:BookOpen,details:["Visão geral das atividades","Acompanhamento das operações","Acesso rápido aos módulos"]},
 {id:"igrejas",name:"Igrejas e regiões",description:"Cadastro das igrejas, regiões e vínculos pastorais.",icon:Church,details:["Cadastro e edição de igrejas","Organização por região","Vínculo de pastores"]},
 {id:"usuarios",name:"Usuários",description:"Convites, cadastro, bloqueio e gestão de contas.",icon:Users,details:["Criar e convidar usuários","Definir função e igreja","Bloquear ou reativar acesso"]},
 {id:"permissoes",name:"Permissões",description:"Controle das funções que cada usuário pode executar.",icon:ShieldCheck,details:["Permissões por função","Delegação de tarefas","Controle pelo ADM"]},
 {id:"automacoes",name:"Automações",description:"Avisos automáticos disparados por eventos do sistema.",icon:Zap,details:["Nova viagem cadastrada","Viagem concluída","Checklist e chamada finalizados"]},
 {id:"programacao",name:"Programação",description:"Organização da ordem dos cultos e cruzadas.",icon:CalendarDays,details:["Pregador e participantes","Horários, duração e observações","Publicação e PDF oficial"]},
 {id:"musicas",name:"Músicas",description:"Envio de letras e aprovação do repertório.",icon:Music2,details:["Envio de letras pelos músicos","Aprovação pelo dirigente","Letras aprovadas na programação"]},
 {id:"viagens",name:"Viagens e ônibus",description:"Planejamento de viagens, veículos e passageiros.",icon:BusFront,details:["Origem e destino com Plus Code","Passageiros e embarque","Chamadas de ida e retorno"]},
 {id:"evangelismo",name:"Evangelismo",description:"Grupos, líderes, tarefas e acompanhamento da ação.",icon:Users,details:["Distribuição de grupos","Checklist de preparação","Acompanhamento dos líderes"]},
 {id:"mapa",name:"Mapa e localização",description:"Rotas e localização compartilhada com autorização.",icon:MapPin,details:["Planejamento de rota","Localização durante a atividade","Compartilhamento mediante consentimento"]},
 {id:"mensagens",name:"Mensagens",description:"Comunicação interna entre os participantes.",icon:MessageSquare,details:["Mensagens particulares","Avisos importantes","Notificações internas"]},
 {id:"relatorios",name:"Relatórios",description:"Consulta e arquivamento dos relatórios de viagens.",icon:FileText,details:["Resumo da viagem","Arquivo histórico","Exportação de relatório"]},
 {id:"documentos",name:"Documentos e logos",description:"Arquivos institucionais e identidade visual.",icon:FileText,details:["Logo oficial CHAMA VIVA","Logos adicionais do ADM","Documentos em PDF"]},
 {id:"configuracoes",name:"Configurações",description:"Preferências e dados da conta.",icon:Settings,details:["Dados de perfil","Preferências de acesso","Segurança da conta"]}
];
export default function DemonstrationCenter(){
 const [active,setActive]=useState("painel");
 const current=pages.find(p=>p.id===active)||pages[0];
 const index=pages.findIndex(p=>p.id===active);
 const Icon=current.icon;
 return <main className="module-page">
  <ModuleNav/>
  <div className="workspace-head"><div className="workspace-icon-large"><PlayCircle size={24}/></div><div><span className="auth-kicker">CHAMA VIVA • APRESENTAÇÃO</span><h1>Demonstração do sistema</h1><p>Apresente as áreas e explique como cada parte funciona ao líder geral.</p></div></div>
  <section style={{background:"#fff7ed",border:"1px solid #f5ddc8",borderRadius:13,padding:14,marginBottom:15}}>
   <b style={{fontSize:12,color:"#8d431d"}}>Modo de demonstração — dados ilustrativos</b>
   <p style={{fontSize:10,color:"#806f63",lineHeight:1.6,margin:"5px 0 0"}}>Esta área é somente para apresentação. Os exemplos não são registros reais e os controles abaixo não salvam nem alteram informações do sistema.</p>
  </section>
  <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(155px,1fr))",gap:8,marginBottom:15}}>
   {pages.map((page,i)=>{const PageIcon=page.icon;return <button key={page.id} type="button" onClick={()=>setActive(page.id)} aria-pressed={active===page.id} style={{display:"flex",alignItems:"center",gap:8,textAlign:"left",padding:11,borderRadius:10,border:active===page.id?"1px solid #e87532":"1px solid #eee3da",background:active===page.id?"#fff0e3":"white",color:active===page.id?"#b84e17":"#65564c",cursor:"pointer"}}><PageIcon size={16}/><span style={{fontSize:10,fontWeight:800}}>{i+1}. {page.name}</span></button>})}
  </div>
  <section style={{background:"white",border:"1px solid #f0e5db",borderRadius:14,padding:18}}>
   <div style={{display:"flex",alignItems:"center",gap:11,marginBottom:15}}><div className="workspace-icon-large"><Icon size={22}/></div><div><span className="auth-kicker">ÁREA {String(index+1).padStart(2,"0")} DE {String(pages.length).padStart(2,"0")}</span><h2 style={{fontSize:19,margin:"4px 0"}}>{current.name}</h2><p style={{fontSize:11,color:"#88796f",margin:0}}>{current.description}</p></div></div>
   <div style={{background:"#faf7f3",borderRadius:10,padding:14}}>
    <b style={{fontSize:11}}>O que explicar nesta página</b>
    <ul style={{paddingLeft:18,margin:"9px 0 0",display:"grid",gap:8}}>{current.details.map(item=><li key={item} style={{fontSize:11,color:"#65564c",lineHeight:1.5}}>{item}</li>)}</ul>
   </div>
   <div style={{display:"flex",justifyContent:"space-between",gap:8,marginTop:16}}>
    <button type="button" className="module-secondary" disabled={index===0} onClick={()=>setActive(pages[index-1].id)}><ArrowLeft size={14}/> Anterior</button>
    <button type="button" className="module-primary" disabled={index===pages.length-1} onClick={()=>setActive(pages[index+1].id)}>Próxima página <ArrowRight size={14}/></button>
   </div>
  </section>
  <p style={{fontSize:10,color:"#9b8d83",textAlign:"center",marginTop:12}}>Para abrir uma área real, saia da demonstração e use o menu normal do ADM. As permissões e confirmações de segurança continuam valendo.</p>
  <div style={{display:"flex",justifyContent:"center",marginTop:10}}><Link href="/painel" className="module-secondary">Voltar ao painel do ADM</Link></div>
 </main>;
}
