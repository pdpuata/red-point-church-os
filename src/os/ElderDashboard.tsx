import React, { useCallback, useEffect, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { supabase } from '../../lib/supabase';

export type ElderDashboardAction = 'sunday' | 'music' | 'visitors' | 'content' | 'admin';
type Props = { onAction?: (action: ElderDashboardAction) => void };
const card={backgroundColor:'#fff',borderWidth:1,borderColor:'#e3e3e0',borderRadius:18,padding:18,marginBottom:14} as const;

export default function ElderDashboard({onAction}:Props){
 const [data,setData]=useState<any>(null); const [busy,setBusy]=useState(false); const [error,setError]=useState('');
 const load=useCallback(async()=>{if(!supabase)return;setBusy(true);setError('');try{const {data:result,error:rpcError}=await supabase.rpc('os_get_elder_dashboard');if(rpcError)throw rpcError;if(result?.ok===false)throw new Error(result.reason||'Dashboard unavailable');setData(result);}catch(e:any){setError(e?.message||'Could not load the church readiness summary.');}finally{setBusy(false);}},[]);
 useEffect(()=>{load();},[load]);
 const readiness=Number(data?.readiness_percent??0); const service=data?.service; const attention=Array.isArray(data?.attention)?data.attention:[]; const ready=data?.status==='ready'&&attention.length===0;
 const areaButton={borderTopWidth:1,borderTopColor:'#e8e8e5',paddingVertical:14,minHeight:62,zIndex:20} as const;
 return <View style={{padding:20,paddingBottom:24}}>
  <Text style={{fontSize:12,fontWeight:'800',letterSpacing:1.2,color:'#666'}}>RED POINT</Text>
  <Text style={{fontSize:32,fontWeight:'800',color:'#171717',marginTop:5}}>Good morning</Text>
  <Text style={{fontSize:18,lineHeight:27,color:'#555',marginTop:6,marginBottom:18}}>Here is what needs your attention. Everything else is being watched by the system.</Text>
  <View style={card}>
   <Text style={{fontSize:12,fontWeight:'800',letterSpacing:1,color:'#666'}}>SUNDAY READINESS</Text>
   <Text style={{fontSize:42,fontWeight:'800',color:'#171717',marginTop:6}}>{readiness}%</Text>
   <Text style={{fontSize:16,lineHeight:23,color:'#555',marginTop:2}}>{service?`${service.title} · ${new Intl.DateTimeFormat('en-ZA',{weekday:'long',day:'numeric',month:'long'}).format(new Date(`${service.service_date}T12:00:00`))}`:'No upcoming service is scheduled.'}</Text>
   {service?<Text style={{fontSize:14,color:'#666',marginTop:9}}>{service.band_name||'Band not assigned'} · {service.assignments} people assigned · {service.confirmed} confirmed</Text>:null}
   {onAction?<Pressable accessibilityRole="button" accessibilityLabel="Review Sunday readiness" onPress={()=>onAction('sunday')} style={{marginTop:14,borderWidth:1,borderColor:'#171717',borderRadius:12,padding:13,alignItems:'center',zIndex:20}}><Text style={{fontWeight:'800'}}>REVIEW SUNDAY</Text></Pressable>:null}
  </View>
  {ready?<View style={{...card,backgroundColor:'#f1f1ed'}}><Text style={{fontSize:17,fontWeight:'800'}}>✓ Everything is under control</Text><Text style={{fontSize:15,lineHeight:22,color:'#555',marginTop:5}}>There are no current decisions waiting for you.</Text></View>:<View style={card}><Text style={{fontSize:19,fontWeight:'800'}}>What needs my attention?</Text>{attention.map((item:any)=><Pressable key={item.key} accessibilityRole={onAction?'button':undefined} disabled={!onAction} onPress={()=>{if(item.key==='visitor_followup')onAction?.('visitors');else if(item.key==='roster_confirmation'||item.key==='roster_missing'||item.key==='setlist_missing')onAction?.('music');else onAction?.('sunday');}} style={{borderTopWidth:1,borderTopColor:'#e8e8e5',paddingVertical:14,marginTop:10,zIndex:20}}><Text style={{fontSize:11,fontWeight:'800',letterSpacing:1,color:item.severity==='high'?'#B42318':'#666'}}>{item.severity==='high'?'NEEDS ATTENTION':'REVIEW'}</Text><Text style={{fontSize:17,fontWeight:'800',color:'#171717',marginTop:4}}>{item.title}</Text><Text style={{fontSize:14,lineHeight:20,color:'#555',marginTop:3}}>{item.detail}</Text>{onAction?<Text style={{fontSize:13,fontWeight:'800',marginTop:7}}>REVIEW ›</Text>:null}</Pressable>)}</View>}
  <View style={card}>
   <Text style={{fontSize:19,fontWeight:'800'}}>Church areas</Text>
   <Text style={{fontSize:14,lineHeight:21,color:'#666',marginTop:4,marginBottom:8}}>Open an area only when you need to make a decision.</Text>
   {onAction ? <>
    <Pressable accessibilityRole="button" accessibilityLabel="Open Music and Bands" onPress={()=>onAction('music')} hitSlop={6} style={({pressed})=>[areaButton,pressed&&{opacity:0.6}]}><Text style={{fontSize:16,fontWeight:'800'}}>MUSIC & BANDS</Text><Text style={{fontSize:14,color:'#666',marginTop:3}}>People, bands, roster and worship readiness</Text></Pressable>
    <Pressable accessibilityRole="button" accessibilityLabel="Open People" onPress={()=>onAction('visitors')} hitSlop={6} style={({pressed})=>[areaButton,pressed&&{opacity:0.6}]}><Text style={{fontSize:16,fontWeight:'800'}}>PEOPLE</Text><Text style={{fontSize:14,color:'#666',marginTop:3}}>Visitors and people who need a response</Text></Pressable>
    <Pressable accessibilityRole="button" accessibilityLabel="Open Sunday" onPress={()=>onAction('sunday')} hitSlop={6} style={({pressed})=>[areaButton,pressed&&{opacity:0.6}]}><Text style={{fontSize:16,fontWeight:'800'}}>SUNDAY</Text><Text style={{fontSize:14,color:'#666',marginTop:3}}>The simple pre-Sunday checklist</Text></Pressable>
   </> : <>
    <View style={areaButton}><Text style={{fontSize:16,fontWeight:'800'}}>MUSIC & BANDS</Text><Text style={{fontSize:14,color:'#666',marginTop:3}}>People, bands, roster and worship readiness</Text></View>
    <View style={areaButton}><Text style={{fontSize:16,fontWeight:'800'}}>PEOPLE</Text><Text style={{fontSize:14,color:'#666',marginTop:3}}>Visitors and people who need a response</Text></View>
    <View style={areaButton}><Text style={{fontSize:16,fontWeight:'800'}}>SUNDAY</Text><Text style={{fontSize:14,color:'#666',marginTop:3}}>The simple pre-Sunday checklist</Text></View>
   </>}
  </View>
  <Pressable onPress={load} disabled={busy} style={{alignSelf:'center',padding:12,opacity:busy?.5:1}}><Text style={{fontSize:12,fontWeight:'800',letterSpacing:1,textDecorationLine:'underline'}}>{busy?'UPDATING…':'UPDATE SUMMARY'}</Text></Pressable>
  {error?<View style={{...card,backgroundColor:'#fff4f2'}}><Text style={{fontWeight:'800'}}>We couldn't update the summary</Text><Text style={{color:'#666',marginTop:4}}>{error}</Text><Pressable onPress={load} style={{marginTop:10}}><Text style={{fontWeight:'800',textDecorationLine:'underline'}}>TRY AGAIN</Text></Pressable></View>:null}
 </View>;
}
