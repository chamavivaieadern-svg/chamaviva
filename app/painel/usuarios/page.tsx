import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import UsersAdmin from "./users-client";
export default async function UsersPage(){
 const db=await createClient();const {data:{user}}=await db.auth.getUser();if(!user)redirect("/login");
 const {data:p}=await db.from("profiles").select("role,status").eq("id",user.id).single();
 if(p?.role!=="admin"||p.status!=="active")redirect("/painel");
 const {data:a}=await db.auth.mfa.getAuthenticatorAssuranceLevel();if(a.currentLevel!=="aal2")redirect("/seguranca/2fa");
 return <main className="module-page"><UsersAdmin/></main>;
}
