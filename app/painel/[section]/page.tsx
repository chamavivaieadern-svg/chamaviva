import { redirect,notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import ModuleWorkspace from "./module-workspace";
const allowed=["igrejas","programacao","musicas","viagens","evangelismo","mensagens","documentos","mapa"];
export default async function SectionPage({params}:{params:Promise<{section:string}>}){
 const {section}=await params;if(!allowed.includes(section))notFound();
 const db=await createClient();const {data:{user}}=await db.auth.getUser();if(!user)redirect("/login");
 const {data:p}=await db.from("profiles").select("role,status").eq("id",user.id).single();if(!p||p.status!=="active")redirect("/aguardando");
 const {data:factors}=await db.auth.mfa.listFactors();const verified=factors?.totp?.some(f=>f.status==="verified");const {data:a}=await db.auth.mfa.getAuthenticatorAssuranceLevel();if(!verified||a.currentLevel!=="aal2")redirect("/seguranca/2fa");
 return <ModuleWorkspace section={section}/>;
}
