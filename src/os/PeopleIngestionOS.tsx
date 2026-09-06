import React, { useEffect, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { getPeopleIngestionReadiness, registerPeopleSource } from './os';

export default function PeopleIngestionOS() {
  const [sources,setSources]=useState<any[]>([]); const [busy,setBusy]=useState(false); const [message,setMessage]=useState(''); const [error,setError]=useState('');
  const load=async()=>{try{setSources(await getPeopleIngestionReadiness());}catch(e:any){setError(e?.message||String(e));}};
  useEffect(()=>{load();},[]);
  const register=async(key:string,type:string,name:string)=>{setBusy(true);setError('');setMessage('');try{const r=await registerPeopleSource(key,type,name);if(!r?.ok)throw new Error(r?.reason||'Registration failed');setMessage(`${name} source boundary is registered.`);await load();}catch(e:any){setError(e?.message||String(e));}finally{setBusy(false);}};
  return <View style={{borderWidth:1,borderColor:'#e3e3e0',borderRadius:18,padding:16,marginBottom:14}}>
    <Text style={{fontSize:18,fontWeight:'800'}}>People Ingestion OS</Text>
    <Text style={{color:'#666',marginTop:4,lineHeight:20}}>This is the source-system boundary. It lets Church OS accept people data from real systems later without coupling the operating graph directly to Planning Center, Sheets, or a file format.</Text>
    <View style={{flexDirection:'row',gap:8,marginTop:12,flexWrap:'wrap'}}>
      <Pressable disabled={busy} onPress={()=>register('planning_center','planning_center','Planning Center People')} style={{borderWidth:1,borderColor:'#171717',borderRadius:10,padding:10}}><Text style={{fontWeight:'800'}}>REGISTER PLANNING CENTER</Text></Pressable>
      <Pressable disabled={busy} onPress={()=>register('google_sheets','google_sheets','Google Sheets People/Roster')} style={{borderWidth:1,borderColor:'#171717',borderRadius:10,padding:10}}><Text style={{fontWeight:'800'}}>REGISTER GOOGLE SHEETS</Text></Pressable>
    </View>
    {message?<Text style={{color:'#067647',marginTop:9,fontWeight:'700'}}>{message}</Text>:null}{error?<Text style={{color:'#B42318',marginTop:9}}>{error}</Text>:null}
    {sources.map(s=><View key={s.id} style={{borderTopWidth:1,borderTopColor:'#eee',paddingVertical:10,marginTop:10}}><View style={{flexDirection:'row',justifyContent:'space-between'}}><Text style={{fontWeight:'800'}}>{s.display_name}</Text><Text style={{fontWeight:'800'}}>{String(s.status).toUpperCase()}</Text></View><Text style={{color:'#666',marginTop:3}}>{s.source_type} · {s.import_runs} runs · {s.rows_received} rows · {s.rows_matched} matched · {s.rows_ambiguous} ambiguous · {s.rows_unmatched} unmatched · {s.mappings} mappings</Text></View>)}
    <Text style={{color:'#777',fontSize:12,marginTop:10}}>Security boundary: source registration and import creation are admin-only; source credentials are not stored in the mobile app.</Text>
  </View>;
}
