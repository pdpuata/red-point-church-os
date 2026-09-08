import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, Text, View } from 'react-native';
import { approveAssignmentCommunication, approveRosterRecommendation, createAssignmentCommunication, evaluateServiceTimeline, getCommunicationQueue, getMusicServices, getRosterRecommendations, getServiceAssignments, planRoster, rejectRosterRecommendation, runRosterAgent, saveRosterRecommendations, sendAssignmentCommunication } from './os';
import AIExecutiveBrief from './AIExecutiveBrief';
import PeopleCapabilityLegacyOS from './PeopleCapabilityLegacyOS';

const card = { borderWidth: 1, borderColor: '#e3e3e0', borderRadius: 16, padding: 16, marginBottom: 12, backgroundColor: '#fff' } as const;
const button = { borderRadius: 11, minHeight: 48, paddingHorizontal: 14, alignItems: 'center', justifyContent: 'center' } as const;

const today = () => new Date().toISOString().slice(0, 10);
const serviceTime = (s: any) => new Date(`${s.service_date}T${s.starts_at || '12:00:00'}`).getTime();

export default function MusicBandsAdminOS({ onBack }: { onBack: () => void }) {
  const [services, setServices] = useState<any[]>([]);
  const [serviceId, setServiceId] = useState('');
  const [recommendations, setRecommendations] = useState<any[]>([]);
  const [assignments, setAssignments] = useState<any[]>([]);
  const [communications, setCommunications] = useState<any[]>([]);
  const [busy, setBusy] = useState(false);
  const [decisionBusy, setDecisionBusy] = useState<string | null>(null);
  const [communicationBusy, setCommunicationBusy] = useState<string | null>(null);
  const [verified, setVerified] = useState<boolean | null>(null);
  const [error, setError] = useState('');
  const [section, setSection] = useState<'overview' | 'team' | 'people'>('overview');

  const selected = useMemo(() => services.find(s => s.id === serviceId), [services, serviceId]);
  const upcoming = useMemo(() => services.filter(s => s.service_date >= today()).sort((a,b) => serviceTime(a)-serviceTime(b)), [services]);
  const recent = useMemo(() => services.filter(s => s.service_date < today()).sort((a,b) => serviceTime(b)-serviceTime(a)).slice(0, 4), [services]);
  const proposed = recommendations.filter(r => r.status === 'proposed');
  const serviceComms = communications.filter(c => c.service_id === serviceId);

  const loadService = useCallback(async (id: string) => {
    const [r, a, c] = await Promise.all([getRosterRecommendations(id), getServiceAssignments(id), getCommunicationQueue()]);
    setRecommendations(r); setAssignments(a); setCommunications(c);
  }, []);

  const refresh = useCallback(async () => {
    setError('');
    try {
      const nextServices = await getMusicServices();
      setServices(nextServices);
      const current = serviceId && nextServices.some(s => s.id === serviceId) ? serviceId : null;
      const nextId = current || nextServices.filter(s => s.service_date >= today()).sort((a,b) => serviceTime(a)-serviceTime(b))[0]?.id || nextServices[0]?.id || '';
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

  return <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40 }}>
    <Pressable accessibilityRole="button" accessibilityLabel="Return to church admin" onPress={onBack} style={{ marginBottom: 12 }}><Text style={{ fontSize: 13, fontWeight: '800', textDecorationLine: 'underline' }}>‹ BACK TO ADMIN</Text></Pressable>
    <Text style={{ fontSize: 12, fontWeight: '800', letterSpacing: 1.2, color: '#666' }}>MUSIC & BANDS</Text>
    <Text style={{ fontSize: 30, fontWeight: '800', marginTop: 4 }}>Sunday team</Text>
    <Text style={{ color: '#666', fontSize: 15, lineHeight: 22, marginTop: 6 }}>One simple place to see the team, fix problems, review music intelligence and finish Sunday ready.</Text>

    {error ? <View style={{ backgroundColor: '#fff7f5', borderWidth: 1, borderColor: '#f0d5cf', borderRadius: 12, padding: 13, marginTop: 12 }}><Text style={{ fontWeight: '800' }}>Something needs attention</Text><Text style={{ color: '#666', marginTop: 4 }}>{error}</Text></View> : null}

    <View style={{ flexDirection: 'row', gap: 8, marginTop: 14, marginBottom: 12 }}>
      {[['overview','OVERVIEW'],['team','SUNDAY TEAM'],['people','PEOPLE & BANDS']].map(([key,label]) => <Pressable key={key} onPress={() => setSection(key as any)} accessibilityRole="button" style={{ flex: 1, ...button, borderWidth: 1, borderColor: section === key ? '#171717' : '#ccc', backgroundColor: section === key ? '#171717' : '#fff' }}><Text style={{ fontSize: 11, fontWeight: '800', color: section === key ? '#fff' : '#222', textAlign: 'center' }}>{label}</Text></Pressable>)}
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
      <View style={card}>
        <Text style={{ fontSize: 18, fontWeight: '800' }}>What can I do here?</Text>
        <Text style={{ color: '#555', lineHeight: 21, marginTop: 8 }}>• Sunday Team — see who is serving and resolve roster issues.</Text>
        <Text style={{ color: '#555', lineHeight: 21, marginTop: 5 }}>• People & Bands — maintain musicians, roles, capabilities and band membership.</Text>
        <Text style={{ color: '#555', lineHeight: 21, marginTop: 5 }}>• Music intelligence — review the latest setlist analysis for the selected Sunday.</Text>
        <Text style={{ color: '#555', lineHeight: 21, marginTop: 5 }}>• Final check — verify the service before Sunday.</Text>
      </View>
      {selected ? <View style={card}><Text style={{ fontSize: 18, fontWeight: '800' }}>Selected Sunday</Text><Text style={{ fontSize: 20, fontWeight: '800', marginTop: 5 }}>{selected.title || 'Sunday Service'}</Text><Text style={{ color: '#666', marginTop: 3 }}>{selected.service_date}</Text><Text style={{ color: '#555', marginTop: 10 }}>Assigned team: {assignments.length}</Text><Text style={{ color: '#555', marginTop: 4 }}>Suggested changes waiting: {proposed.length}</Text><Text style={{ color: '#555', marginTop: 4 }}>Messages: {serviceComms.length}</Text></View> : null}
      <AIExecutiveBrief serviceId={serviceId || undefined} />
    </> : null}

    {section === 'people' ? <PeopleCapabilityLegacyOS /> : null}

    {section === 'team' ? <>
      <View style={card}>
        <Text style={{ fontSize: 18, fontWeight: '800' }}>Choose a Sunday</Text>
        <Text style={{ color: '#666', marginTop: 4 }}>Upcoming Sundays are shown first. The screen never defaults to an old service when a future one exists.</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 11 }}>
          {upcoming.slice(0, 12).map(s => <Pressable key={s.id} onPress={() => chooseService(s.id)} style={{ borderWidth: 1, borderColor: s.id === serviceId ? '#171717' : '#ddd', borderRadius: 11, padding: 11, marginRight: 8, backgroundColor: s.id === serviceId ? '#171717' : '#fff' }}><Text style={{ fontWeight: '800', color: s.id === serviceId ? '#fff' : '#222' }}>{s.service_date}</Text><Text style={{ marginTop: 3, color: s.id === serviceId ? '#ddd' : '#666' }}>{s.title || 'Sunday Service'}</Text></Pressable>)}
        </ScrollView>
        {recent.length ? <Text style={{ color: '#888', marginTop: 10, fontSize: 12 }}>Recent services: {recent.map(s => s.service_date).join(' · ')}</Text> : null}
      </View>

      {selected ? <View style={card}>
        <Text style={{ fontSize: 18, fontWeight: '800' }}>Who is serving?</Text>
        <Text style={{ color: '#666', marginTop: 3 }}>{selected.title || 'Sunday Service'} · {selected.service_date}</Text>
        {assignments.length === 0 ? <View style={{ backgroundColor: '#f1f1ed', borderRadius: 11, padding: 12, marginTop: 12 }}><Text style={{ fontWeight: '800' }}>No assignments are recorded</Text><Text style={{ color: '#666', marginTop: 4 }}>The Church OS will not invent a team. Run the team check to compare the service against the available people and suggest changes.</Text></View> : assignments.map(a => <View key={a.id} style={{ borderTopWidth: 1, borderTopColor: '#eee', paddingTop: 11, marginTop: 11 }}><Text style={{ fontSize: 16, fontWeight: '800' }}>{a.responsibility || 'Team member'}</Text><Text style={{ color: '#666', marginTop: 3 }}>{String(a.confirmation_status || 'pending').toLowerCase()} · {a.assignment_status || 'assigned'}</Text><Pressable accessibilityRole="button" disabled={communicationBusy === a.id} onPress={() => createMessage(a.id)} style={{ marginTop: 8, alignSelf: 'flex-start', borderWidth: 1, borderColor: '#171717', borderRadius: 9, paddingVertical: 8, paddingHorizontal: 11 }}><Text style={{ fontSize: 11, fontWeight: '800' }}>{communicationBusy === a.id ? 'PREPARING…' : 'PREPARE MESSAGE'}</Text></Pressable></View>)}
      </View> : null}

      <View style={card}>
        <Text style={{ fontSize: 18, fontWeight: '800' }}>1. Check the team</Text>
        <Text style={{ color: '#666', marginTop: 4, lineHeight: 20 }}>Find gaps and get suggestions. Nothing is accepted automatically.</Text>
        <Pressable accessibilityRole="button" disabled={!serviceId || busy} onPress={runIntelligence} style={{ ...button, marginTop: 12, backgroundColor: '#171717', opacity: (!serviceId || busy) ? .55 : 1 }}><Text style={{ color: '#fff', fontWeight: '800' }}>{busy ? 'CHECKING…' : 'CHECK TEAM'}</Text></Pressable>
      </View>

      {proposed.length > 0 ? <View style={card}>
        <Text style={{ fontSize: 18, fontWeight: '800' }}>2. Review suggestions</Text>
        <Text style={{ color: '#666', marginTop: 4 }}>You decide. The computer does not make the final people decision.</Text>
        {proposed.slice(0, 12).map(r => <View key={r.id} style={{ borderTopWidth: 1, borderTopColor: '#eee', paddingTop: 12, marginTop: 12 }}><Text style={{ fontWeight: '800' }}>{r.responsibility || 'Team member'}</Text><Text style={{ color: '#555', marginTop: 4, lineHeight: 20 }}>{r.reason || r.rationale || 'Suggested for this Sunday.'}</Text><View style={{ flexDirection: 'row', gap: 8, marginTop: 9 }}><Pressable disabled={decisionBusy === r.id} onPress={() => decide(r.id, true)} style={{ ...button, flex: 1, backgroundColor: '#171717' }}><Text style={{ color: '#fff', fontWeight: '800' }}>{decisionBusy === r.id ? '…' : 'ACCEPT'}</Text></Pressable><Pressable disabled={decisionBusy === r.id} onPress={() => decide(r.id, false)} style={{ ...button, flex: 1, borderWidth: 1, borderColor: '#171717' }}><Text style={{ fontWeight: '800' }}>DECLINE</Text></Pressable></View></View>)}
      </View> : null}

      {serviceComms.length > 0 ? <View style={card}>
        <Text style={{ fontSize: 18, fontWeight: '800' }}>3. Messages</Text>
        <Text style={{ color: '#666', marginTop: 4 }}>Review before sending.</Text>
        {serviceComms.slice(0, 10).map(c => <View key={c.id} style={{ borderTopWidth: 1, borderTopColor: '#eee', paddingTop: 11, marginTop: 11 }}><Text style={{ fontWeight: '800' }}>{c.title || 'Team message'}</Text><Text style={{ color: '#555', marginTop: 3 }}>{c.body || ''}</Text><Text style={{ color: '#777', marginTop: 4, fontSize: 12 }}>Status: {String(c.status || 'pending').toLowerCase()}</Text>{c.status === 'approved' ? <Pressable disabled={communicationBusy === c.id} onPress={() => sendMessage(c)} style={{ ...button, marginTop: 8, backgroundColor: '#171717' }}><Text style={{ color: '#fff', fontWeight: '800' }}>{communicationBusy === c.id ? 'SENDING…' : 'SEND MESSAGE'}</Text></Pressable> : <Pressable disabled={communicationBusy === c.id} onPress={() => approveMessage(c.id)} style={{ ...button, marginTop: 8, borderWidth: 1, borderColor: '#171717' }}><Text style={{ fontWeight: '800' }}>{communicationBusy === c.id ? 'SAVING…' : 'APPROVE MESSAGE'}</Text></Pressable>}</View>)}
      </View> : null}

      <View style={card}>
        <Text style={{ fontSize: 18, fontWeight: '800' }}>4. Final check</Text>
        <Text style={{ color: '#666', marginTop: 4, lineHeight: 20 }}>Run this after making your decisions.</Text>
        <Pressable disabled={!serviceId || busy} onPress={verify} style={{ ...button, marginTop: 12, borderWidth: 1, borderColor: '#171717', opacity: (!serviceId || busy) ? .55 : 1 }}><Text style={{ fontWeight: '800' }}>{busy ? 'CHECKING…' : 'CHECK AGAIN'}</Text></Pressable>
        {verified !== null ? <View style={{ marginTop: 11, borderRadius: 11, padding: 12, backgroundColor: verified ? '#f1f1ed' : '#fff7f5' }}><Text style={{ fontSize: 16, fontWeight: '800' }}>{verified ? '✓ Sunday team looks ready' : 'There may still be something to fix'}</Text><Text style={{ color: '#666', marginTop: 3 }}>{verified ? 'The final operational check completed successfully.' : 'Review the team, suggestions and service timeline.'}</Text></View> : null}
      </View>

      <AIExecutiveBrief serviceId={serviceId || undefined} />
    </> : null}
  </ScrollView>;
}
