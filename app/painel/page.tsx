import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import Home from "../dashboard";

export default async function ProtectedDashboard() {
  const supabase=await createClient();
  const {data:{user}}=await supabase.auth.getUser();
  if(!user) redirect("/login");
  const {data:profile}=await supabase.from("profiles").select("role,status").eq("id",user.id).maybeSingle();
  if(profile?.status==="blocked") redirect("/login?blocked=1");
  if(!profile || profile.status!=="active" || profile.role==="pending") redirect("/aguardando");
  const {data:factors}=await supabase.auth.mfa.listFactors();
  const hasTotp=factors?.totp?.some(f=>f.status==="verified");
  const {data:assurance}=await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  if(!hasTotp || assurance?.currentLevel!=="aal2") redirect("/seguranca/2fa");
  return <Home/>;
}
