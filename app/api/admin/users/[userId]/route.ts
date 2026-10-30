import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function PATCH(request:Request,{params}:{params:Promise<{userId:string}>}){
  try{
    const supabase=await createClient();
    const {data:{user}}=await supabase.auth.getUser();
    if(!user)return NextResponse.json({error:"Não autenticado."},{status:401});
    const {data:assurance}=await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
    if(assurance?.currentLevel!=="aal2")return NextResponse.json({error:"Confirme o segundo fator."},{status:403});
    const {data:profile}=await supabase.from("profiles").select("role,status").eq("id",user.id).single();
    if(profile?.role!=="admin"||profile.status!=="active")return NextResponse.json({error:"Somente o ADM pode administrar usuários."},{status:403});
    const {userId}=await params;
    if(userId===user.id)return NextResponse.json({error:"Você não pode bloquear sua própria conta."},{status:400});
    const body=await request.json() as {status?:string};
    if(!["active","blocked"].includes(body.status||""))return NextResponse.json({error:"Status inválido."},{status:400});
    const admin=createAdminClient();
    const {error}=await admin.from("profiles").update({status:body.status}).eq("id",userId);
    if(error)throw error;
    await admin.from("audit_logs").insert({actor_id:user.id,action:body.status==="blocked"?"user.blocked":"user.unblocked",target_table:"profiles",target_id:userId});
    return NextResponse.json({ok:true});
  }catch(e){return NextResponse.json({error:e instanceof Error?e.message:"Erro interno."},{status:500});}
}

export async function DELETE(_request:Request,{params}:{params:Promise<{userId:string}>}){
  try{
    const supabase=await createClient();
    const {data:{user}}=await supabase.auth.getUser();
    if(!user)return NextResponse.json({error:"Não autenticado."},{status:401});
    const {data:assurance}=await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
    if(assurance?.currentLevel!=="aal2")return NextResponse.json({error:"Confirme o segundo fator."},{status:403});
    const {data:profile}=await supabase.from("profiles").select("role,status").eq("id",user.id).single();
    if(profile?.role!=="admin"||profile.status!=="active")return NextResponse.json({error:"Somente o ADM pode remover usuários."},{status:403});
    const {userId}=await params;
    if(userId===user.id)return NextResponse.json({error:"Você não pode remover sua própria conta."},{status:400});
    const admin=createAdminClient();
    await admin.from("audit_logs").insert({actor_id:user.id,action:"user.removed",target_table:"profiles",target_id:userId});
    const {error}=await admin.auth.admin.deleteUser(userId);
    if(error)throw error;
    return NextResponse.json({ok:true});
  }catch(e){return NextResponse.json({error:e instanceof Error?e.message:"Erro interno."},{status:500});}
}
