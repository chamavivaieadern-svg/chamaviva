import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import Home from "../page";

export default async function ProtectedDashboard() {
  const supabase=await createClient();
  const {data:{user}}=await supabase.auth.getUser();
  if(!user) redirect("/login");
  const {data:profile}=await supabase.from("profiles").select("full_name,role,status").eq("id",user.id).maybeSingle();
  if(profile?.status==="blocked") redirect("/login?blocked=1");
  const {data:assurance}=await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  if(assurance.nextLevel==="aal2"&&assurance.currentLevel!=="aal2") redirect("/seguranca/2fa");
  return <Home/>;
}
