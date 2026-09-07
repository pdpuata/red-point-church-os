import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { getBands, getPeopleDirectory, getPeopleWorkload, upsertBandMembership, upsertCapability, upsertRole } from './os';

const card = { borderWidth: 1, borderColor: '#e3e3e0', borderRadius: 18, padding: 16, marginBottom: 14 } as const;
const input = { borderWidth: 1, borderColor: '#ccc', borderRadius: 10, padding: 11, marginTop: 8 } as const;

export default function PeopleCapabilityLegacyOS() {
  const [people, setPeople] = useState<any[]>([]);
  const [bands, setBands] = useState<any[]>([]);
  const [workload, setWorkload] = useState<any[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const [capability, setCapability] = useState('');
  const [proficiency, setProficiency] = useState('');
  const [role, setRole] = useState('');
  const [isPrimary, setIsPrimary] = useState(false);
  const [isLeader, setIsLeader] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try { const [p,b,w] = await Promise.all([getPeopleDirectory(), getBands(), getPeopleWorkload()]); setPeople(p); setBands(b); setWorkload(w); if (!selectedId && p[0]?.user_id) setSelectedId(p[0].user_id); }
    catch (e:any) { setError(e?.message || String(e)); }
  }, [selectedId]);
  useEffect(() => { load(); }, [load]);
  const selected = useMemo(() => people.find(p => p.user_id === selectedId), [people, selectedId]);
  const act = async (fn:()=>Promise<any>, ok:string) => { setBusy(true); setError(''); setMessage(''); try { await fn(); setMessage(ok); await load(); } catch(e:any) { setError(e?.message || String(e)); } finally { setBusy(false); } };

  return <View>
    <View style={card}>
      <Text style={{fontSize:18,fontWeight:'800'}}>People & Capability OS</Text>
      <Text style={{color:'#666',marginTop:4}}>This is the authenticated-account capability editor. The canonical volunteer graph is shown above in Bands & Teams.</Text>
      {error ? <Text style={{color:'#B42318',marginTop:10}}>{error}</Text> : null}
      {message ? <Text style={{color:'#067647',marginTop:10,fontWeight:'700'}}>{message}</Text> : null}
      <Text style={{fontWeight:'800',marginTop:14}}>Authenticated people ({people.length})</Text>
      {people.length === 0 ? <View style={{backgroundColor:'#f1f1ed',borderRadius:12,padding:12,marginTop:10}}><Text style={{fontWeight:'800'}}>No authenticated people records available</Text></View> : <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{marginTop:10}}>{people.map(p => <Pressable key={p.user_id} onPress={()=>{setSelectedId(p.user_id);setMessage('')}} style={{borderWidth:1,borderColor:selectedId===p.user_id?'#171717':'#ccc',backgroundColor:selectedId===p.user_id?'#171717':'#fff',borderRadius:12,padding:12,marginRight:8}}><Text style={{fontWeight:'800',color:selectedId===p.user_id?'#fff':'#333'}}>{p.display_name}</Text><Text style={{color:selectedId===p.user_id?'#ddd':'#666',marginTop:3}}>{p.service_count || 0} services</Text></Pressable>)}</ScrollView>}
    </View>
    {selected ? <View style={card}>
      <Text style={{fontSize:18,fontWeight:'800'}}>{selected.display_name}</Text>
      <Text style={{color:'#666',marginTop:4}}>{selected.email || 'No email'}{selected.phone ? ` · ${selected.phone}` : ''}</Text>
      <Text style={{fontWeight:'800',marginTop:14}}>Current authenticated graph</Text>
      <Text style={{color:'#555',marginTop:6}}>Roles: {(selected.roles||[]).map((x:any)=>x.role).join(', ') || 'none'}</Text>
      <Text style={{color:'#555',marginTop:6}}>Bands: {(selected.bands||[]).map((x:any)=>`${x.band_name}${x.is_leader?' (leader)':''}`).join(', ') || 'none'}</Text>
      <Text style={{color:'#555',marginTop:6}}>Capabilities: {(selected.capabilities||[]).map((x:any)=>`${x.capability}${x.proficiency!=null?` (${x.proficiency}/5)`:''}`).join(', ') || 'none'}</Text>
      <Text style={{fontWeight:'800',marginTop:16}}>Add / update capability</Text>
      <TextInput value={capability} onChangeText={setCapability} placeholder="e.g. drums, bass, vocals, worship leading" style={input} />
      <TextInput value={proficiency} onChangeText={setProficiency} placeholder="Proficiency 0–5" keyboardType="number-pad" style={input} />
      <Pressable onPress={()=>setIsPrimary(v=>!v)} style={{marginTop:9,flexDirection:'row',alignItems:'center'}}><View style={{width:20,height:20,borderWidth:1,borderColor:'#777',borderRadius:5,backgroundColor:isPrimary?'#171717':'#fff',alignItems:'center',justifyContent:'center'}}>{isPrimary?<Text style={{color:'#fff',fontSize:13,fontWeight:'800'}}>✓</Text>:null}</View><Text style={{marginLeft:8,fontWeight:'700'}}>Primary capability</Text></Pressable>
      <Pressable onPress={()=>act(()=>upsertCapability(selectedId,capability,proficiency.trim()?Number(proficiency):null,isPrimary,null),'Capability saved')} style={{marginTop:10,backgroundColor:'#171717',borderRadius:11,padding:12,alignItems:'center',opacity:busy?.55:1}}><Text style={{color:'#fff',fontWeight:'800'}}>SAVE CAPABILITY</Text></Pressable>
      <Text style={{fontWeight:'800',marginTop:18}}>Add role</Text>
      <TextInput value={role} onChangeText={setRole} placeholder="e.g. worship_leader, musician, sound_engineer" style={input} />
      <Pressable disabled={busy || !role.trim()} onPress={()=>act(()=>upsertRole(selectedId,role),'Role saved')} style={{marginTop:10,borderWidth:1,borderColor:'#171717',borderRadius:11,padding:12,alignItems:'center',opacity:busy?.55:1}}><Text style={{fontWeight:'800'}}>SAVE ROLE</Text></Pressable>
      <Text style={{fontWeight:'800',marginTop:18}}>Add to authenticated band</Text>
      <Pressable onPress={()=>setIsLeader(v=>!v)} style={{marginTop:9,flexDirection:'row',alignItems:'center'}}><View style={{width:20,height:20,borderWidth:1,borderColor:'#777',borderRadius:5,backgroundColor:isLeader?'#171717':'#fff',alignItems:'center',justifyContent:'center'}}>{isLeader?<Text style={{color:'#fff',fontSize:13,fontWeight:'800'}}>✓</Text>:null}</View><Text style={{marginLeft:8,fontWeight:'700'}}>Mark selected person as band leader</Text></Pressable>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{marginTop:9}}>{bands.map(b=><Pressable key={b.id} disabled={busy} onPress={()=>act(()=>upsertBandMembership(b.id,selectedId,isLeader),`${selected.display_name} added to ${b.name}${isLeader?' as leader':''}`)} style={{borderWidth:1,borderColor:'#ccc',borderRadius:10,padding:10,marginRight:8}}><Text style={{fontWeight:'800'}}>{b.name}</Text></Pressable>)}</ScrollView>
    </View> : null}
    <View style={card}><Text style={{fontSize:17,fontWeight:'800'}}>Workload & Fairness Intelligence</Text><Text style={{color:'#555',lineHeight:21,marginTop:6}}>The roster engine treats workload as an operational signal: recent service load, recency, availability and capability can inform recommendations without allowing AI to make the final people decision.</Text>{workload.length === 0 ? <Text style={{color:'#777',marginTop:10}}>No authenticated service history exists yet.</Text> : workload.slice(0,12).map((w:any)=><View key={w.user_id} style={{marginTop:10,padding:11,borderWidth:1,borderColor:'#e3e3e0',borderRadius:12}}><View style={{flexDirection:'row',justifyContent:'space-between'}}><Text style={{fontWeight:'800',flex:1}}>{w.display_name}</Text><Text style={{fontWeight:'800'}}>{w.workload_band}</Text></View><Text style={{color:'#666',marginTop:4}}>8 weeks: {w.services_8w} · 4 weeks: {w.services_4w} · 2 weeks: {w.services_2w}</Text><Text style={{color:'#666',marginTop:3}}>Last served: {w.last_service_date || 'never'} · Bands: {w.band_count}</Text></View>)}</View>
    <View style={card}><Text style={{fontSize:17,fontWeight:'800'}}>Why this matters</Text><Text style={{color:'#555',lineHeight:21,marginTop:6}}>The canonical People → Band → Role graph is now independent of app login. This editor remains useful for authenticated accounts, while Bands & Teams is the operational source of truth.</Text></View>
  </View>;
}
