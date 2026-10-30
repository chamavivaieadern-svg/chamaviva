import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(_request:Request,{params}:{params:Promise<{eventId:string}>}){
 try{
  const db=await createClient();
  const {data:{user}}=await db.auth.getUser();
  if(!user)return NextResponse.json({error:"Não autenticado."},{status:401});
  const {data:assurance}=await db.auth.mfa.getAuthenticatorAssuranceLevel();
  if(assurance.currentLevel!=="aal2")return NextResponse.json({error:"Confirme a autenticação em duas etapas."},{status:403});
  const {data:profile}=await db.from("profiles").select("role,status").eq("id",user.id).single();
  if(profile?.status!=="active"||!["admin","director"].includes(profile?.role||""))return NextResponse.json({error:"Somente ADM e dirigente podem exportar a programação oficial."},{status:403});
  const {eventId}=await params;
  const [eventResult,itemsResult,assetsResult]=await Promise.all([
   db.from("events").select("id,title,starts_at,venue").eq("id",eventId).single(),
   db.from("program_items").select("id,title,participant_name,item_type,starts_at,duration_minutes,sort_order,notes,lyrics").eq("event_id",eventId).order("sort_order"),
   db.from("brand_assets").select("label,storage_path,is_official").order("is_official",{ascending:false})
  ]);
  if(eventResult.error)throw eventResult.error;if(itemsResult.error)throw itemsResult.error;
  const logos=[];
  for(const asset of assetsResult.data||[]){
   if(!/\.(png|jpe?g|svg)$/i.test(asset.storage_path))continue;
   const {data}=await db.storage.from("chama-viva-assets").createSignedUrl(asset.storage_path,90);
   if(data?.signedUrl)logos.push({label:asset.label,storage_path:asset.storage_path,is_official:asset.is_official,url:data.signedUrl});
   if(logos.length>=6)break;
  }
  return NextResponse.json({event:eventResult.data,items:itemsResult.data,logos});
 }catch(e){return NextResponse.json({error:e instanceof Error?e.message:"Não foi possível preparar o PDF."},{status:500});}
}
