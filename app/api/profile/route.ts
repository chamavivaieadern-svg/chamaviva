import {NextResponse} from "next/server";
import {createClient} from "@/lib/supabase/server";
import {createAdminClient} from "@/lib/supabase/admin";
export async function PATCH(request:Request){
 try{
  const db=await createClient();const {data:{user}}=await db.auth.getUser();if(!user)return NextResponse.json({error:"Não autenticado."},{status:401});
  const {data:a}=await db.auth.mfa.getAuthenticatorAssuranceLevel();if(a.currentLevel!=="aal2")return NextResponse.json({error:"Confirme o segundo fator."},{status:403});
  const body=await request.json() as {full_name?:string};const fullName=body.full_name?.trim();if(!fullName||fullName.length>120)return NextResponse.json({error:"Informe um nome válido."},{status:400});
  const admin=createAdminClient();const {error}=await admin.from("profiles").update({full_name:fullName}).eq("id",user.id);if(error)throw error;
  await admin.from("audit_logs").insert({actor_id:user.id,action:"profile.updated",target_table:"profiles",target_id:user.id});
  return NextResponse.json({ok:true});
 }catch(e){return NextResponse.json({error:e instanceof Error?e.message:"Erro interno."},{status:500});}
}
