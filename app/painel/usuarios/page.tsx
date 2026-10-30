import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import UsersAdmin from "./users-client";
export default async function UsersPage(){
 const db=await createClient();const {data:{user}}=await db.auth.getUser();if(!user)redirect("/login");
 const {data:factors}=await db.auth.mfa.listFactors();const verified=factors?.totp?.some(f=>f.status==="verified");const {data:a}=await db.auth.mfa.getAuthenticatorAssuranceLevel();if(!verified||a.currentLevel!=="aal2")redirect("/seguranca/2fa");
 const {data:p}=await db.from("profiles").select("role,status").eq("id",user.id).single();
 if(p?.status==="blocked")redirect("/login?blocked=1");
 if(p?.role!=="admin"||p.status!=="active")redirect("/painel");
 return <main className="module-page"><UsersAdmin/></main>;
}
