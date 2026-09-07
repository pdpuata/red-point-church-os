import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { supabase } from '../../lib/supabase';

const card = { borderWidth: 1, borderColor: '#e3e3e0', borderRadius: 18, padding: 16, marginBottom: 14 } as const;
const pill = { borderWidth: 1, borderColor: '#ddd', borderRadius: 10, paddingVertical: 8, paddingHorizontal: 11, marginRight: 8 } as const;

export default function BandsOS() {
  const [bands, setBands] = useState<any[]>([]);
  const [members, setMembers] = useState<any[]>([]);
  const [services, setServices] = useState<any[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    if (!supabase) return;
    setBusy(true); setError('');
    try {
      const [{ data: b, error: be }, { data: r, error: re }, { data: s, error: se }] = await Promise.all([
        supabase.from('bands').select('id,name,description,active').eq('active', true).order('name'),
        supabase.from('music_person_band_roles').select('id,person_id,band_id,role,is_leader,created_at').order('role'),
        supabase.from('music_services').select('id,title,service_date,status,band_id').order('service_date', { ascending: true }),
      ]);
      if (be) throw be; if (re) throw re; if (se) throw se;
      const peopleIds = Array.from(new Set((r || []).map((x:any) => x.person_id).filter(Boolean)));
      let p: any[] = [];
      if (peopleIds.length) {
        const { data, error: pe } = await supabase.from('music_people').select('id,display_name,status,linked_user_id').in('id', peopleIds).order('display_name');
        if (pe) throw pe; p = data || [];
      }
      const personMap = new Map(p.map(x => [x.id, x]));
      setBands(b || []);
      setMembers((r || []).map((x:any) => ({ ...x, person: personMap.get(x.person_id) })));
      setServices(s || []);
      if (!selectedId && b?.[0]?.id) setSelectedId(b[0].id);
    } catch (e:any) { setError(e?.message || String(e)); }
    finally { setBusy(false); }
  }, [selectedId]);

  useEffect(() => { load(); }, [load]);

  const selected = useMemo(() => bands.find(b => b.id === selectedId), [bands, selectedId]);
  const selectedMembers = useMemo(() => members.filter(x => x.band_id === selectedId), [members, selectedId]);
  const selectedServices = useMemo(() => services.filter(x => x.band_id === selectedId), [services, selectedId]);
  const roles = useMemo(() => {
    const map = new Map<string, any[]>();
    selectedMembers.forEach((m:any) => { const key = m.role || 'Other'; if (!map.has(key)) map.set(key, []); map.get(key)!.push(m); });
    return Array.from(map.entries());
  }, [selectedMembers]);

  const formatDate = (v:string) => new Intl.DateTimeFormat('en-ZA', { weekday:'short', day:'numeric', month:'short', year:'numeric' }).format(new Date(`${v}T12:00:00`));

  return <View style={card}>
    <View style={{ flexDirection:'row', justifyContent:'space-between', alignItems:'center', gap:10 }}>
      <View style={{ flex:1 }}>
        <Text style={{ fontSize:18, fontWeight:'800' }}>Bands & Teams</Text>
        <Text style={{ color:'#666', marginTop:4 }}>Live operational view of the four canonical worship bands. People exist independently of app accounts.</Text>
      </View>
      <Pressable onPress={load} disabled={busy} style={{ borderWidth:1, borderColor:'#171717', borderRadius:10, padding:9, opacity:busy?.55:1 }}><Text style={{ fontWeight:'800' }}>{busy ? '…' : 'REFRESH'}</Text></Pressable>
    </View>
    {error ? <View style={{ backgroundColor:'#fff4f2', borderRadius:12, padding:11, marginTop:12 }}><Text style={{ color:'#B42318', fontWeight:'700' }}>{error}</Text></View> : null}

    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop:14 }}>
      {bands.map(b => <Pressable key={b.id} onPress={() => setSelectedId(b.id)} style={[pill, selectedId===b.id && { backgroundColor:'#171717', borderColor:'#171717' }]}>
        <Text style={{ fontWeight:'800', color:selectedId===b.id?'#fff':'#222' }}>{b.name}</Text>
        <Text style={{ marginTop:3, color:selectedId===b.id?'#ddd':'#666' }}>{members.filter(m => m.band_id===b.id).length} people</Text>
      </Pressable>)}
    </ScrollView>

    {selected ? <View style={{ marginTop:14, backgroundColor:'#f1f1ed', borderRadius:14, padding:14 }}>
      <Text style={{ fontSize:22, fontWeight:'800' }}>{selected.name}</Text>
      <Text style={{ color:'#555', marginTop:4 }}>{selected.description}</Text>
      <Text style={{ color:'#333', fontWeight:'800', marginTop:12 }}>{selectedMembers.length} role assignments · {selectedServices.length} upcoming services</Text>
    </View> : null}

    {roles.map(([role, rows]) => <View key={role} style={{ borderTopWidth:1, borderTopColor:'#eee', paddingTop:12, marginTop:12 }}>
      <Text style={{ fontWeight:'800' }}>{role}</Text>
      {rows.map((m:any) => <View key={m.id} style={{ flexDirection:'row', justifyContent:'space-between', alignItems:'center', paddingVertical:8 }}>
        <Text style={{ flex:1, fontWeight:'700' }}>{m.person?.display_name || 'Unknown person'}</Text>
        {m.is_leader ? <Text style={{ fontSize:12, fontWeight:'800' }}>LEADER</Text> : null}
        {m.person?.status === 'to_be_confirmed' ? <Text style={{ marginLeft:8, color:'#B42318', fontSize:12, fontWeight:'800' }}>TBC</Text> : null}
      </View>)}
    </View>)}

    <View style={{ borderTopWidth:1, borderTopColor:'#eee', marginTop:14, paddingTop:14 }}>
      <Text style={{ fontWeight:'800', fontSize:16 }}>Upcoming services</Text>
      {selectedServices.length === 0 ? <Text style={{ color:'#777', marginTop:8 }}>No services currently linked to this band.</Text> : selectedServices.slice(0,12).map((s:any) => <View key={s.id} style={{ paddingVertical:9 }}>
        <View style={{ flexDirection:'row', justifyContent:'space-between', gap:10 }}><Text style={{ fontWeight:'700', flex:1 }}>{formatDate(s.service_date)}</Text><Text style={{ fontSize:12, fontWeight:'800' }}>{String(s.status).toUpperCase()}</Text></View>
        <Text style={{ color:'#666', marginTop:3 }}>{s.title}</Text>
      </View>)}
    </View>

    <View style={{ marginTop:14, backgroundColor:'#fafaf8', borderRadius:12, padding:12 }}>
      <Text style={{ fontWeight:'800' }}>Operational truth</Text>
      <Text style={{ color:'#555', lineHeight:20, marginTop:4 }}>Band membership is read from the canonical People → Band → Role graph. This surface does not depend on Supabase Auth, so volunteers without app accounts still appear here.</Text>
    </View>
  </View>;
}
