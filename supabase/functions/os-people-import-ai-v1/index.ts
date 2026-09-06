import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { optionsResponse, json } from "../_shared/cors.ts";

const schema = {
  type: "object", properties: {
    rows: { type: "array", items: { type: "object", properties: {
      external_key:{type:["string","null"]}, user_id:{type:["string","null"]}, display_name:{type:["string","null"]}, email:{type:["string","null"]}, role:{type:["string","null"]}, capability:{type:["string","null"]}, proficiency:{type:["integer","null"]}, is_primary:{type:"boolean"}, band_id:{type:["string","null"]}, is_leader:{type:"boolean"}, confidence:{type:"number"}, warnings:{type:"array",items:{type:"string"}}
    }, required:["external_key","user_id","display_name","email","role","capability","proficiency","is_primary","band_id","is_leader","confidence","warnings"], additionalProperties:false } },
    summary:{type:"string"}, global_warnings:{type:"array",items:{type:"string"}}
  }, required:["rows","summary","global_warnings"], additionalProperties:false
};

function normalizeDeterministically(input:any[]) {
  const roleMap:Record<string,string>={"worship leader":"worship_leader","band leader":"worship_leader","leader":"worship_leader","musician":"musician","sound engineer":"sound_engineer","sound":"sound_engineer"};
  const capabilityMap:Record<string,string>={"vocals":"vocals","vocal":"vocals","voice":"vocals","keys":"piano","keyboard":"piano","piano":"piano","acoustic guitar":"acoustic_guitar","acoustic":"acoustic_guitar","electric guitar":"electric_guitar","electric":"electric_guitar","bass guitar":"bass","bass":"bass","drums":"drums","drummer":"drums"};
  const rows=input.map((r:any)=>{const rr=String(r?.role??'').trim().toLowerCase(), cc=String(r?.capability??'').trim().toLowerCase(); const warnings:string[]=[]; if(rr&&!roleMap[rr])warnings.push(`Role not normalized: ${r.role}`); if(cc&&!capabilityMap[cc])warnings.push(`Capability not normalized: ${r.capability}`); if(!r?.email&&!r?.user_id)warnings.push('No email or user_id supplied for identity matching'); const p=r?.proficiency===''||r?.proficiency==null?null:Math.max(0,Math.min(5,Number(r.proficiency)||0)); return {external_key:r?.external_key||null,user_id:r?.user_id||null,display_name:r?.display_name||null,email:r?.email?String(r.email).trim().toLowerCase():null,role:roleMap[rr]||(r?.role?String(r.role).trim():null),capability:capabilityMap[cc]||(r?.capability?String(r.capability).trim():null),proficiency:p,is_primary:Boolean(r?.is_primary),band_id:r?.band_id||null,is_leader:Boolean(r?.is_leader),confidence:warnings.length?.7:.9,warnings};});
  return {rows,summary:`Deterministically normalized ${rows.length} row(s).`,global_warnings:['AI provider is not configured; deterministic normalization was used.']};
}

Deno.serve(async(req:Request)=>{
  if(req.method==='OPTIONS')return optionsResponse();
  try{
    const auth=req.headers.get('Authorization'); if(!auth)return json({ok:false,error:'missing_authorization'},401);
    const url=Deno.env.get('SUPABASE_URL')!, anon=Deno.env.get('SUPABASE_ANON_KEY')!;
    const userClient=createClient(url,anon,{global:{headers:{Authorization:auth}}});
    const {data:isAdmin,error:adminError}=await userClient.rpc('is_admin'); if(adminError||!isAdmin)return json({ok:false,error:'admin_required'},403);
    const body=await req.json().catch(()=>({})), rows=body?.rows; if(!Array.isArray(rows))return json({ok:false,error:'rows_must_be_array'},400); if(rows.length>500)return json({ok:false,error:'row_limit_exceeded',limit:500},400);
    const apiKey=Deno.env.get('OPENAI_API_KEY'); if(!apiKey)return json({ok:true,configured:false,...normalizeDeterministically(rows)});
    const model=Deno.env.get('OPENAI_PEOPLE_IMPORT_MODEL')||Deno.env.get('OPENAI_ROSTER_MODEL')||'gpt-5.6-luna';
    const response=await fetch('https://api.openai.com/v1/responses',{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${apiKey}`},body:JSON.stringify({model,input:[{role:'system',content:'You normalize church people import data. Preserve identity facts. Never invent a person, user_id, email, band_id, role, capability, proficiency, or leadership status. Normalize obvious spelling/synonym variants only. If uncertain, preserve the original value and add a warning. This is a proposal only; human approval is required before mutation.'},{role:'user',content:JSON.stringify({rows})}],text:{format:{type:'json_schema',name:'people_import_normalization',strict:true,schema}}})});
    const raw=await response.text(); if(!response.ok)return json({ok:false,configured:true,error:'ai_provider_error',detail:raw.slice(0,500)},502); const payload=JSON.parse(raw); return json({ok:true,configured:true,model,...JSON.parse(payload.output_text)});
  }catch(error){return json({ok:false,error:error instanceof Error?error.message:String(error)},500)}
});
