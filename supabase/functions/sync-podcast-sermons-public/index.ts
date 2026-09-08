import { createClient } from "https://esm.sh/@supabase/supabase-js@2.112.4";

const RSS_URL = "https://www.redpointchurch.com/pinetown-podcast-feed?format=rss";
const corsHeaders = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type", "Access-Control-Allow-Methods": "POST, OPTIONS" };
const json = (data: unknown, status = 200) => new Response(JSON.stringify(data), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
const decodeXml = (v:string) => v.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g,"$1").replace(/<[^>]*>/g," ").replace(/&amp;/gi,"&").replace(/&lt;/gi,"<").replace(/&gt;/gi,">").replace(/&quot;/gi,'"').replace(/&#39;/g,"'").replace(/\s+/g," ").trim();
const xmlText = (b:string,t:string) => { const m=b.match(new RegExp(`<${t}[^>]*>([\\s\\S]*?)</${t}>`,"i")); return m?decodeXml(m[1]):null; };
const xmlAttr = (b:string,t:string,a:string) => { const m=b.match(new RegExp(`<${t}\\b[^>]*\\b${a}=["']([^"']+)["']`,"i")); return m?decodeXml(m[1]):null; };
function parseFeed(xml:string){
  return (xml.match(/<item\b[\s\S]*?<\/item>/gi)||[]).map(item=>{
    const source_guid=xmlText(item,"guid"), rawTitle=xmlText(item,"title"), description=xmlText(item,"description"), pub=xmlText(item,"pubDate"), audio_url=xmlAttr(item,"enclosure","url")||xmlAttr(item,"media:content","url");
    if(!source_guid||!rawTitle||!audio_url)return null;
    const d=pub?new Date(pub):null;
    return {source_guid,title:rawTitle.replace(/^(Sunday Sermon|Sermon)\s*\/\/\s*/i,"").trim(),description:description||null,preached_at:d&&!Number.isNaN(d.getTime())?d.toISOString():null,audio_url};
  }).filter(Boolean) as Array<{source_guid:string;title:string;description:string|null;preached_at:string|null;audio_url:string}>;
}
function db(){const url=Deno.env.get("SUPABASE_URL"),key=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");if(!url||!key)throw new Error("Supabase server configuration is incomplete.");return createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});}
Deno.serve(async(req)=>{
  if(req.method==="OPTIONS")return new Response("ok",{headers:corsHeaders});
  if(req.method!=="POST")return json({error:"Method not allowed"},405);
  try{
    const upstream=await fetch(RSS_URL,{headers:{Accept:"application/rss+xml, application/xml, text/xml","User-Agent":"RedPointChurchSermonSync/4.0"}});
    if(!upstream.ok)throw new Error(`RSS responded ${upstream.status}`);
    const episodes=parseFeed(await upstream.text()); if(!episodes.length)throw new Error("RSS feed contained no usable sermon episodes.");
    const client=db();
    const existingResult=await client.from("sermons").select("id,source_guid,audio_url,published"); if(existingResult.error)throw existingResult.error;
    const existing=existingResult.data||[]; const byGuid=new Map(existing.filter(x=>x.source_guid).map(x=>[x.source_guid,x])); const byAudio=new Map(existing.filter(x=>x.audio_url).map(x=>[x.audio_url,x]));
    const rows=episodes.map(e=>{const old=byGuid.get(e.source_guid)||byAudio.get(e.audio_url);return {...e,youtube_url:null,published:old?.published??true};});
    const result=await client.from("sermons").upsert(rows,{onConflict:"source_guid"}); if(result.error)throw result.error;
    const imported=rows.filter(r=>!byGuid.has(r.source_guid)&&!byAudio.has(r.audio_url)).length;
    return json({ok:true,source:RSS_URL,sermonsFound:episodes.length,imported,updated:episodes.length-imported,syncedAt:new Date().toISOString()});
  }catch(error){console.error("Public sermon sync failed",error);return json({ok:false,error:error instanceof Error?error.message:JSON.stringify(error)},500);}
});
