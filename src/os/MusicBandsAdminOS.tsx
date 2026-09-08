import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, Text, View } from 'react-native';
import { supabase } from '../../lib/supabase';
import { approveAssignmentCommunication, approveRosterRecommendation, createAssignmentCommunication, evaluateServiceTimeline, getCommunicationQueue, getMusicServices, getRosterRecommendations, getServiceAssignments, planRoster, rejectRosterRecommendation, runRosterAgent, saveRosterRecommendations, sendAssignmentCommunication } from './os';
import PeopleCapabilityLegacyOS from './PeopleCapabilityLegacyOS';

const card = { borderWidth: 1, borderColor: '#e3e3e0', borderRadius: 16, padding: 16, marginBottom: 12, backgroundColor: '#fff' } as const;
const button = { borderRadius: 11, minHeight: 48, paddingHorizontal: 14, alignItems: 'center', justifyContent: 'center' } as const;
const today = () => new Date().toISOString().slice(0, 10);
const serviceTime = (s: any) => new Date(`${s.service_date}T${s.starts_at || '12:00:00'}`).getTime();
const titleCase = (value: string) => value.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

export default function MusicBandsAdminOS({ onBack }: { onBack: () => void }) {
  const [services, setServices] = useState<any[]>([]);
  const [serviceId, setServiceId] = useState('');
  const [recommendations, setRecommendations] = useState<any[]>([]);
  const [assignments, setAssignments] = useState<any[]>([]);
  const [people, setPeople] = useState<Record<string, string>>({});
  const [communications, setCommunications] = useState<any[]>([]);
  const [setlist, setSetlist] = useState<any | null>(null);
  const [setlistItems, setSetlistItems] = useState<any[]>([]);
  const [busy, setBusy] = useState(false);
  const [decisionBusy, setDecisionBusy] = useState<string | null>(null);
  const [communicationBusy, setCommunicationBusy] = useState<string | null>(null);
  const [verified, setVerified] = useState<boolean | null>(null);
  const [error, setError] = useState('');
  const [section, setSection] = useState<'overview' | 'team' | 'setlist' | 'people'>('overview');

  const selected = useMemo(() => services.find(s => s.id === serviceId), [services, serviceId]);
  const upcoming = useMemo(() => services.filter(s => s.service_date >= today()).sort((a, b) => serviceTime(a) - serviceTime(b)), [services]);
  const recent = useMemo(() => services.filter(s => s.service_date < today()).sort((a, b) => serviceTime(b) - serviceTime(a)).slice(0, 4), [services]);
  const proposed = recommendations.filter(r => r.status === 'proposed');
  const serviceComms = communications.filter(c => c.service_id === serviceId);
  const leaders = assignments.filter(a => String(a.responsibility || '').toLowerCase().includes('leader'));

  const loadService = useCallback(async (id: string) => {
    const client = supabase;
    if (!client) throw new Error('Supabase is not configured');
    const [r, a, c, sl] = await Promise.all([
      getRosterRecommendations(id),
      getServiceAssignments(id),
      getCommunicationQueue(),
      client.from('music_setlists').select('id,status,notes').eq('service_id', id).order('created_at', { ascending: false }).limit(1).maybeSingle(),
    ]);
    if (sl.error) throw sl.error;
    setRecommendations(r);
    setAssignments(a);
    setCommunications(c);
    setSetlist(sl.data || null);
    if (sl.data) {
      const { data: items, error: itemError } = await client.from('music_setlist_items').select('id,song_id,position,key_override,arrangement,notes').eq('setlist_id', sl.data.id).order('position');
      if (itemError) throw itemError;
      setSetlistItems(items || []);
      const ids = (items || []).map((x: any) => x.song_id).filter(Boolean);
      if (ids.length) {
        const { data: songs, error: songError } = await client.from('music_songs').select('id,title,artist').in('id', ids);
        if (songError) throw songError;
        const songMap = Object.fromEntries((songs || []).map((s: any) => [s.id, s]));
        setSetlistItems((items || []).map((x: any) => ({ ...x, song: songMap[x.song_id] })));
      }
    } else setSetlistItems([]);
    const personIds = (a || []).map((x: any) => x.person_id).filter(Boolean);
    if (personIds.length) {
      const { data: personRows, error: personError } = await client.from('music_people').select('id,display_name').in('id', personIds);
      if (personError) throw personError;
      setPeople(Object.fromEntries((personRows || []).map((p: any) => [p.id, p.display_name])));
    } else setPeople({});
  }, []);

  const refresh = useCallback(async () => {
    setError('');
    try {
      const nextServices = await getMusicServices();
      setServices(nextServices);
      const nextId = serviceId && nextServices.some(s => s.id === serviceId)
        ? serviceId
        : nextServices.filter(s => s.service_date >= today()).sort((a, b) => serviceTime(a) - serviceTime(b))[0]?.id || nextServices[0]?.id || '';
      if (nextId) { setServiceId(nextId); await loadService(nextId); }
    } catch (e: any) { setError(e?.message || 'We could not load Music & Bands.'); }
  }, [serviceId, loadService]);

  useEffect(() => { refresh(); }, [refresh]);

  const chooseService = async (id: string) => {
    setServiceId(id); setVerified(null); setError('');
    try { await loadService(id); } catch (e: any) { setError(e?.message || 'We could not load that Sunday.'); }
  };

  const runIntelligence = async () => {
    if (!serviceId) return;
    setBusy(true); setError(''); setVerified(null);
    try {
      const [agentResult, planResult] = await Promise.all([runRosterAgent(serviceId), planRoster(serviceId)]);
      if (planResult?.candidates?.length) await saveRosterRecommendations(serviceId, planResult.candidates.map((c: any) => ({ ...c, responsibility: c.responsibility || c.primary_capability || c.primary_capability_name || 'musician' })));
      await loadService(serviceId);
      Alert.alert('Team check complete', agentResult?.blockers?.length ? `${agentResult.blockers.length} item(s) need attention.` : 'No roster blockers were found.');
    } catch (e: any) { setError(e?.message || 'The team check could not be completed.'); }
    finally { setBusy(false); }
  };

  const decide = async (id: string, approve: boolean) => {
    setDecisionBusy(id); setError('');
    try {
      if (approve) await approveRosterRecommendation(id);
      else await rejectRosterRecommendation(id, 'Rejected by administrator during roster review');
      await loadService(serviceId);
    } catch (e: any) { setError(e?.message || 'We could not save that decision.'); }
    finally { setDecisionBusy(null); }
  };

  const verify = async () => {
    if (!serviceId) return;
    setBusy(true); setError('');
    try {
      const result = await evaluateServiceTimeline(serviceId);
      setVerified(result?.ok === true || result?.ready === true || result?.status === 'ready' || result?.passed === true);
      await loadService(serviceId);
    } catch (e: any) { setError(e?.message || 'The final check could not be completed.'); }
    finally { setBusy(false); }
  };

  const createMessage = async (id: string) => {
    setCommunicationBusy(id); setError('');
    try { await createAssignmentCommunication(id); setCommunications(await getCommunicationQueue()); }
    catch (e: any) { setError(e?.message || 'We could not prepare the message.'); }
    finally { setCommunicationBusy(null); }
  };

  const approveMessage = async (id: string) => {
    setCommunicationBusy(id); setError('');
    try { await approveAssignmentCommunication(id); setCommunications(await getCommunicationQueue()); }
    catch (e: any) { setError(e?.message || 'We could not approve the message.'); }
    finally { setCommunicationBusy(null); }
  };

  const sendMessage = async (c: any) => {
    setCommunicationBusy(c.id); setError('');
    try { await sendAssignmentCommunication(c); setCommunications(await getCommunicationQueue()); }
    catch (e: any) { setError(e?.message || 'We could not send the message.'); }
    finally { setCommunicationBusy(null); }
  };

  const publishSetlist = () => {
    const client = supabase;
    if (!setlist || !client) return;
    Alert.alert('Publish setlist?', 'This will make the six-song setlist the published setlist for this Sunday.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Publish', onPress: async () => {
        setBusy(true); setError('');
        try {
          const { error: updateError } = await client.from('music_setlists').update({ status: 'published', updated_at: new Date().toISOString() }).eq('id', setlist.id);
          if (updateError) throw updateError;
          await loadService(serviceId);
        } catch (e: any) { setError(e?.message || 'We could not publish the setlist.'); }
        finally { setBusy(false); }
      } },
    ]);
  };

  return <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 50 }}>
    <Pressable accessibilityRole="button" accessibilityLabel="Return to church admin" onPress={onBack} style={{ marginBottom: 12 }}><Text style={{ fontSize: 13, fontWeight: '800', textDecorationLine: 'underline' }}>‹ BACK TO ADMIN</Text></Pressable>
    <Text style={{ fontSize: 12, fontWeight: '800', letterSpacing: 1.2, color: '#666' }}>MUSIC & BANDS</Text>
    <Text style={{ fontSize: 30, fontWeight: '800', marginTop: 4 }}>Sunday team</Text>
    <Text style={{ color: '#666', fontSize: 15, lineHeight: 22, marginTop: 6 }}>See the real roster and setlist for the next Sunday. AI can suggest changes; you make the decision.</Text>

    {error ? <View style={{ backgroundColor: '#fff7f5', borderWidth: 1, borderColor: '#f0d5cf', borderRadius: 12, padding: 13, marginTop: 12 }}><Text style={{ fontWeight: '800' }}>Something needs attention</Text><Text style={{ color: '#666', marginTop: 4 }}>{error}</Text></View> : null}

    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 14, marginBottom: 12 }}>
      {[['overview','OVERVIEW'],['team','SUNDAY TEAM'],['setlist','SETLIST'],['people','PEOPLE & BANDS']].map(([key, label]) => <Pressable key={key} onPress={() => setSection(key as any)} accessibilityRole="button" style={{ ...button, minWidth: '23%', flexGrow: 1, borderWidth: 1, borderColor: section === key ? '#171717' : '#ccc', backgroundColor: section === key ? '#171717' : '#fff' }}><Text style={{ fontSize: 11, fontWeight: '800', color: section === key ? '#fff' : '#222', textAlign: 'center' }}>{label}</Text></Pressable>)}
    </View>

    <View style={card}>
      <Text style={{ fontSize: 18, fontWeight: '800' }}>Next Sunday</Text>
      {upcoming[0] ? <>
        <Text style={{ fontSize: 24, fontWeight: '800', marginTop: 5 }}>{upcoming[0].title || 'Sunday Service'}</Text>
        <Text style={{ color: '#666', marginTop: 3 }}>{upcoming[0].service_date}{upcoming[0].band_id ? ' · Band assigned' : ' · No band assigned'}</Text>
        <Pressable onPress={() => { chooseService(upcoming[0].id); setSection('team'); }} style={{ ...button, marginTop: 12, backgroundColor: '#171717' }}><Text style={{ color: '#fff', fontWeight: '800' }}>OPEN NEXT SUNDAY</Text></Pressable>
      </> : <Text style={{ color: '#666', marginTop: 8 }}>No upcoming Sunday service is available.</Text>}
    </View>

    {section === 'overview' ? <>
      {selected ? <View style={card}>
        <Text style={{ fontSize: 18, fontWeight: '800' }}>{selected.service_date} at a glance</Text>
        <Text style={{ color: '#555', marginTop: 9 }}>Team: {assignments.length} people</Text>
        <Text style={{ color: '#555', marginTop: 4 }}>Band leaders: {leaders.length ? leaders.map(a => people[a.person_id] || 'Named leader').join(', ') : 'None recorded'}</Text>
        <Text style={{ color: '#555', marginTop: 4 }}>Setlist: {setlistItems.length ? `${setlistItems.length} songs · ${setlist?.status === 'published' ? 'Published' : 'Proposed'}` : 'Not entered yet'}</Text>
        <Text style={{ color: '#555', marginTop: 4 }}>People still to confirm: {assignments.filter(a => String(a.confirmation_status || '').toLowerCase() !== 'confirmed').length}</Text>
      </View> : null}
      <View style={card}><Text style={{ fontSize: 18, fontWeight: '800' }}>What do you need?</Text><Pressable onPress={() => setSection('team')} style={{ ...button, marginTop: 10, backgroundColor: '#171717' }}><Text style={{ color: '#fff', fontWeight: '800' }}>VIEW SUNDAY TEAM</Text></Pressable><Pressable onPress={() => setSection('setlist')} style={{ ...button, marginTop: 8, borderWidth: 1, borderColor: '#171717' }}><Text style={{ fontWeight: '800' }}>VIEW SETLIST</Text></Pressable><Pressable onPress={() => setSection('people')} style={{ ...button, marginTop: 8, borderWidth: 1, borderColor: '#171717' }}><Text style={{ fontWeight: '800' }}>VIEW PEOPLE & BANDS</Text></Pressable></View>
    </> : null}

    {section === 'setlist' ? <View style={card}>
      <Text style={{ fontSize: 22, fontWeight: '800' }}>Setlist</Text>
      <Text style={{ color: '#666', marginTop: 3 }}>{selected?.service_date || ''} · {setlist?.status === 'published' ? 'Published' : 'Proposed'}</Text>
      {setlistItems.length ? setlistItems.map((item: any, index: number) => <View key={item.id} style={{ flexDirection: 'row', gap: 12, borderTopWidth: index ? 1 : 0, borderTopColor: '#eee', paddingVertical: 12 }}><Text style={{ fontSize: 18, fontWeight: '800', width: 28 }}>{item.position}.</Text><View style={{ flex: 1 }}><Text style={{ fontSize: 17, fontWeight: '800' }}>{item.song?.title || 'Song'}</Text>{item.song?.artist ? <Text style={{ color: '#777', marginTop: 2 }}>{item.song.artist}</Text> : null}{item.key_override ? <Text style={{ color: '#777', marginTop: 2 }}>Key: {item.key_override}</Text> : null}</View></View>) : <Text style={{ color: '#666', marginTop: 12 }}>There is no setlist for this Sunday yet.</Text>}
      {setlist?.status === 'draft' && setlistItems.length ? <Pressable disabled={busy} onPress={publishSetlist} style={{ ...button, marginTop: 10, backgroundColor: '#171717', opacity: busy ? .55 : 1 }}><Text style={{ color: '#fff', fontWeight: '800' }}>PUBLISH SETLIST</Text></Pressable> : null}
      {setlist?.status === 'draft' ? <Text style={{ color: '#777', marginTop: 8, lineHeight: 20 }}>This is a proposal. Publish it only when the set is final.</Text> : null}
    </View> : null}

    {section === 'team' ? <>
      <View style={card}>
        <Text style={{ fontSize: 18, fontWeight: '800' }}>Choose a Sunday</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 11 }}>
          {upcoming.slice(0, 12).map(s => <Pressable key={s.id} onPress={() => chooseService(s.id)} style={{ borderWidth: 1, borderColor: s.id === serviceId ? '#171717' : '#ddd', borderRadius: 11, padding: 11, marginRight: 8, backgroundColor: s.id === serviceId ? '#171717' : '#fff' }}><Text style={{ fontWeight: '800', color: s.id === serviceId ? '#fff' : '#222' }}>{s.service_date}</Text><Text style={{ marginTop: 3, color: s.id === serviceId ? '#ddd' : '#666' }}>{s.title || 'Sunday Service'}</Text></Pressable>)}
        </ScrollView>
      </View>
      {selected ? <View style={card}>
        <Text style={{ fontSize: 20, fontWeight: '800' }}>Who is serving?</Text>
        <Text style={{ color: '#666', marginTop: 3 }}>{selected.title || 'Sunday Service'} · {selected.service_date}</Text>
        {assignments.length === 0 ? <View style={{ backgroundColor: '#f1f1ed', borderRadius: 11, padding: 12, marginTop: 12 }}><Text style={{ fontWeight: '800' }}>No assignments are recorded</Text><Text style={{ color: '#666', marginTop: 4 }}>The Church OS will not invent a team. Run the team check to compare this Sunday with the available people.</Text></View> : assignments.map(a => <View key={a.id} style={{ borderTopWidth: 1, borderTopColor: '#eee', paddingTop: 12, marginTop: 12 }}><Text style={{ fontSize: 17, fontWeight: '800' }}>{people[a.person_id] || 'Team member'}</Text><Text style={{ color: '#555', marginTop: 3 }}>{titleCase(String(a.responsibility || 'team member'))}</Text><Text style={{ color: '#777', marginTop: 2 }}>{titleCase(String(a.confirmation_status || 'pending'))} · {titleCase(String(a.assignment_status || 'assigned'))}</Text><Pressable disabled={communicationBusy === a.id} onPress={() => createMessage(a.id)} style={{ marginTop: 8, alignSelf: 'flex-start', borderWidth: 1, borderColor: '#171717', borderRadius: 9, paddingVertical: 8, paddingHorizontal: 11 }}><Text style={{ fontSize: 11, fontWeight: '800' }}>{communicationBusy === a.id ? 'PREPARING…' : 'PREPARE MESSAGE'}</Text></Pressable></View>)}
      </View> : null}
      <View style={card}><Text style={{ fontSize: 18, fontWeight: '800' }}>Check the team</Text><Text style={{ color: '#666', marginTop: 4, lineHeight: 20 }}>Find gaps and get suggestions. Nothing is accepted automatically.</Text><Pressable accessibilityRole="button" disabled={!serviceId || busy} onPress={runIntelligence} style={{ ...button, marginTop: 12, backgroundColor: '#171717', opacity: (!serviceId || busy) ? .55 : 1 }}><Text style={{ color: '#fff', fontWeight: '800' }}>{busy ? 'CHECKING…' : 'CHECK TEAM'}</Text></Pressable></View>
      {proposed.length ? <View style={card}><Text style={{ fontSize: 18, fontWeight: '800' }}>Suggested changes</Text><Text style={{ color: '#666', marginTop: 4 }}>You decide whether to accept each suggestion.</Text>{proposed.slice(0, 12).map(r => <View key={r.id} style={{ borderTopWidth: 1, borderTopColor: '#eee', paddingTop: 12, marginTop: 12 }}><Text style={{ fontWeight: '800' }}>{titleCase(String(r.responsibility || 'team member'))}</Text><Text style={{ color: '#555', marginTop: 4 }}>{r.reason || r.rationale || 'Suggested for this Sunday.'}</Text><View style={{ flexDirection: 'row', gap: 8, marginTop: 9 }}><Pressable disabled={decisionBusy === r.id} onPress={() => decide(r.id, true)} style={{ ...button, flex: 1, backgroundColor: '#171717' }}><Text style={{ color: '#fff', fontWeight: '800' }}>{decisionBusy === r.id ? '…' : 'ACCEPT'}</Text></Pressable><Pressable disabled={decisionBusy === r.id} onPress={() => decide(r.id, false)} style={{ ...button, flex: 1, borderWidth: 1, borderColor: '#171717' }}><Text style={{ fontWeight: '800' }}>DECLINE</Text></Pressable></View></View>)}</View> : null}
      {serviceComms.length ? <View style={card}><Text style={{ fontSize: 18, fontWeight: '800' }}>Messages</Text>{serviceComms.slice(0, 10).map(c => <View key={c.id} style={{ borderTopWidth: 1, borderTopColor: '#eee', paddingTop: 11, marginTop: 11 }}><Text style={{ fontWeight: '800' }}>{c.message || c.body || 'Assignment message'}</Text><Text style={{ color: '#777', marginTop: 3 }}>{titleCase(String(c.status || 'prepared'))}</Text>{String(c.status || '').toLowerCase() === 'prepared' ? <Pressable onPress={() => approveMessage(c.id)} style={{ ...button, marginTop: 8, borderWidth: 1, borderColor: '#171717' }}><Text style={{ fontWeight: '800' }}>APPROVE MESSAGE</Text></Pressable> : null}{String(c.status || '').toLowerCase() === 'approved' ? <Pressable onPress={() => sendMessage(c)} style={{ ...button, marginTop: 8, backgroundColor: '#171717' }}><Text style={{ color: '#fff', fontWeight: '800' }}>SEND MESSAGE</Text></Pressable> : null}</View>)}</View> : null}
      <View style={card}><Text style={{ fontSize: 18, fontWeight: '800' }}>Final check</Text><Text style={{ color: '#666', marginTop: 4 }}>Check whether this Sunday is ready.</Text><Pressable disabled={!serviceId || busy} onPress={verify} style={{ ...button, marginTop: 10, borderWidth: 1, borderColor: '#171717', opacity: busy ? .55 : 1 }}><Text style={{ fontWeight: '800' }}>{busy ? 'CHECKING…' : 'CHECK SUNDAY READINESS'}</Text></Pressable>{verified !== null ? <Text style={{ fontWeight: '800', marginTop: 10 }}>{verified ? 'Ready check passed.' : 'There are still items to resolve.'}</Text> : null}</View>
    </> : null}

    {section === 'people' ? <PeopleCapabilityLegacyOS /> : null}
  </ScrollView>;
}
