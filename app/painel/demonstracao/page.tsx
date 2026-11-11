import {redirect} from "next/navigation";
import {createClient} from "@/lib/supabase/server";
import DemonstrationCenter from "./demo-center";

export default async function DemonstrationPage(){
 const db=await createClient();
 const {data:{user}}=await db.auth.getUser();
 if(!user)redirect("/login");
 const {data:profile}=await db.from("profiles").select("role,status").eq("id",user.id).maybeSingle();
 if(profile?.status!=="active"||profile.role!=="admin")redirect("/painel");
 return <DemonstrationCenter/>;
}
