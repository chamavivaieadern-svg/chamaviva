import { redirect, notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import ModuleWorkspace from "./module-workspace";

const permissions: Record<string, string[]> = {
  igrejas: ["admin", "pastor"],
  programacao: ["admin", "pastor", "director", "preacher", "musician", "trip_manager"],
  musicas: ["admin", "pastor", "director", "musician"],
  viagens: ["admin", "pastor", "driver", "leader", "trip_manager"],
  atividades: ["leader"],
  evangelismo: ["admin", "pastor", "leader"],
  mensagens: ["admin", "pastor", "leader", "driver", "director", "preacher", "musician", "trip_manager"],
  documentos: ["admin"],
  mapa: ["admin", "pastor", "leader", "driver", "trip_manager"],
  relatorios: ["admin", "pastor"],
  configuracoes: ["admin", "pastor", "leader", "driver", "director", "preacher", "musician", "trip_manager"],
  permissoes: ["admin"],
  "gestao-viagens": ["admin", "trip_manager"],
};

export default async function SectionPage({ params }: { params: Promise<{ section: string }> }) {
  const { section } = await params;
  if (!Object.hasOwn(permissions, section)) notFound();

  const db = await createClient();
  const { data: { user } } = await db.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await db
    .from("profiles")
    .select("role,status,can_manage_trips,can_manage_participants,can_manage_program,can_manage_locations,can_send_messages,can_receive_messages")
    .eq("id", user.id)
    .maybeSingle();

  if (profile?.status === "blocked") redirect("/login?blocked=1");
  if (profile?.role === "leader" && (section === "viagens" || section === "evangelismo")) redirect("/painel/atividades");
  if (!profile || profile.status !== "active" || profile.role === "pending") redirect("/aguardando");
  if (!permissions[section].includes(profile.role)) redirect("/painel");
  if (profile.role === "trip_manager") {
    const allowed = section === "viagens" ? profile.can_manage_trips || profile.can_manage_participants
      : section === "programacao" ? profile.can_manage_program
      : section === "mapa" ? profile.can_manage_locations
      : section === "mensagens" ? profile.can_send_messages || profile.can_receive_messages
      : section === "gestao-viagens" ? true : false;
    if (!allowed) redirect("/painel");
  }

  return <ModuleWorkspace section={section} />;
}
