import { redirect, notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import ModuleWorkspace from "./module-workspace";

const permissions: Record<string, string[]> = {
  igrejas: ["admin", "pastor"],
  programacao: ["admin", "pastor", "director", "preacher", "musician"],
  musicas: ["admin", "pastor", "director", "musician"],
  viagens: ["admin", "pastor", "driver", "leader"],
  evangelismo: ["admin", "pastor", "leader", "driver"],
  mensagens: ["admin", "pastor", "leader", "driver", "director", "preacher", "musician"],
  documentos: ["admin"],
  mapa: ["admin", "pastor", "leader", "driver"],
  relatorios: ["admin", "pastor"],
  configuracoes: ["admin", "pastor", "leader", "driver", "director", "preacher", "musician"],
};

export default async function SectionPage({ params }: { params: Promise<{ section: string }> }) {
  const { section } = await params;
  if (!Object.hasOwn(permissions, section)) notFound();

  const db = await createClient();
  const { data: { user } } = await db.auth.getUser();
  if (!user) redirect("/login");

  const { data: factors } = await db.auth.mfa.listFactors();
  const verified = factors?.totp?.some((factor) => factor.status === "verified");
  const { data: assurance } = await db.auth.mfa.getAuthenticatorAssuranceLevel();
  if (!verified || assurance.currentLevel !== "aal2") redirect("/seguranca/2fa");

  const { data: profile } = await db
    .from("profiles")
    .select("role,status")
    .eq("id", user.id)
    .maybeSingle();

  if (profile?.status === "blocked") redirect("/login?blocked=1");
  if (!profile || profile.status !== "active" || profile.role === "pending") redirect("/aguardando");
  if (!permissions[section].includes(profile.role)) redirect("/painel");

  return <ModuleWorkspace section={section} />;
}
