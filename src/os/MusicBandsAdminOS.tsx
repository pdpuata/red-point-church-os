import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, Text, View } from 'react-native';
import {
  approveAssignmentCommunication,
  approveRosterRecommendation,
  createAssignmentCommunication,
  evaluateServiceTimeline,
  getCommunicationQueue,
  getMusicServices,
  getRosterRecommendations,
  getServiceAssignments,
  getServiceTimeline,
  planRoster,
  rejectRosterRecommendation,
  runRosterAgent,
  saveRosterRecommendations,
  sendAssignmentCommunication,
} from './os';

const card = { borderWidth: 1, borderColor: '#e3e3e0', borderRadius: 16, padding: 16, marginBottom: 12, backgroundColor: '#fff' } as const;
const button = { borderRadius: 10, paddingVertical: 11, paddingHorizontal: 13, alignItems: 'center' } as const;

export default function MusicBandsAdminOS({ onBack }: { onBack: () => void }) {
  const [services, setServices] = useState<any[]>([]);
  const [serviceId, setServiceId] = useState('');
  const [recommendations, setRecommendations] = useState<any[]>([]);
  const [assignments, setAssignments] = useState<any[]>([]);
  const [communications, setCommunications] = useState<any[]>([]);
  const [busy, setBusy] = useState(false);
  const [decisionBusy, setDecisionBusy] = useState<string | null>(null);
  const [communicationBusy, setCommunicationBusy] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [verification, setVerification] = useState<any>(null);

  const selected = useMemo(() => services.find(s => s.id === serviceId), [services, serviceId]);
  const load = useCallback(async () => {
    setError('');
    try {
      const nextServices = await getMusicServices();
      setServices(nextServices);
      const nextId = serviceId || nextServices[0]?.id || '';
      if (nextId) {
        setServiceId(nextId);
        const [r, a, c] = await Promise.all([
          getRosterRecommendations(nextId),
          getServiceAssignments(nextId),
          getCommunicationQueue(),
        ]);
        setRecommendations(r);
        setAssignments(a);
        setCommunications(c);
      }
    } catch (e: any) { setError(e?.message || String(e)); }
  }, [serviceId]);

  useEffect(() => { load(); }, [load]);

  const chooseService = async (id: string) => {
    setServiceId(id); setError(''); setVerification(null);
    try {
      const [r, a, c] = await Promise.all([getRosterRecommendations(id), getServiceAssignments(id), getCommunicationQueue()]);
      setRecommendations(r); setAssignments(a); setCommunications(c);
    } catch (e: any) { setError(e?.message || String(e)); }
  };

  const runIntelligence = async () => {
    if (!serviceId) return;
    setBusy(true); setError(''); setVerification(null);
    try {
      const [agentResult, planResult] = await Promise.all([runRosterAgent(serviceId), planRoster(serviceId)]);
      if (planResult?.candidates?.length) {
        const candidates = planResult.candidates.map((c: any) => ({ ...c, responsibility: c.responsibility || c.primary_capability || c.primary_capability_name || 'musician' }));
        await saveRosterRecommendations(serviceId, candidates);
      }
      const [r, a, c] = await Promise.all([getRosterRecommendations(serviceId), getServiceAssignments(serviceId), getCommunicationQueue()]);
      setRecommendations(r); setAssignments(a); setCommunications(c);
      Alert.alert('Roster intelligence complete', agentResult?.blockers?.length ? `${agentResult.blockers.length} blocker(s) found.` : 'No roster blockers found.');
    } catch (e: any) { setError(e?.message || String(e)); }
    finally { setBusy(false); }
  };

  const decide = async (id: string, approve: boolean) => {
    setDecisionBusy(id); setError('');
    try {
      if (approve) await approveRosterRecommendation(id);
      else await rejectRosterRecommendation(id, 'Rejected by administrator during roster review');
      setRecommendations(await getRosterRecommendations(serviceId));
      setAssignments(await getServiceAssignments(serviceId));
    } catch (e: any) { setError(e?.message || String(e)); }
    finally { setDecisionBusy(null); }
  };

  const createMessage = async (assignmentId: string) => {
    setCommunicationBusy(assignmentId); setError('');
    try { await createAssignmentCommunication(assignmentId); setCommunications(await getCommunicationQueue()); }
    catch (e: any) { setError(e?.message || String(e)); }
    finally { setCommunicationBusy(null); }
  };

  const approveMessage = async (id: string) => {
    setCommunicationBusy(id); setError('');
    try { await approveAssignmentCommunication(id); setCommunications(await getCommunicationQueue()); }
    catch (e: any) { setError(e?.message || String(e)); }
    finally { setCommunicationBusy(null); }
  };

  const sendMessage = async (communication: any) => {
    setCommunicationBusy(communication.id); setError('');
    try { await sendAssignmentCommunication(communication); setCommunications(await getCommunicationQueue()); }
    catch (e: any) { setError(e?.message || String(e)); }
    finally { setCommunicationBusy(null); }
  };

  const verify = async () => {
    if (!serviceId) return;
    setBusy(true); setError('');
    try {
      const result = await evaluateServiceTimeline(serviceId);
      setVerification(result);
      setAssignments(await getServiceAssignments(serviceId));
    } catch (e: any) { setError(e?.message || String(e)); }
    finally { setBusy(false); }
  };

  return <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40 }}>
    <Pressable onPress={onBack} style={{ marginBottom: 12 }}><Text style={{ fontSize: 12, fontWeight: '800', textDecorationLine: 'underline' }}>‹ ADMIN HOME</Text></Pressable>
    <Text style={{ fontSize: 12, fontWeight: '800', letterSpacing: 1.2, color: '#666' }}>MUSIC & BANDS</Text>
    <Text style={{ fontSize: 30, fontWeight: '800', marginTop: 4 }}>Roster operations</Text>
    <Text style={{ color: '#555', fontSize: 15, lineHeight: 22, marginTop: 6, marginBottom: 16 }}>One focused workspace for the next service: inspect the roster, run intelligence, make human decisions, prepare notifications and verify the result.</Text>

    <View style={card}>
      <Text style={{ fontSize: 17, fontWeight: '800' }}>1 · Choose a service</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 10 }}>
        {services.map(s => <Pressable key={s.id} onPress={() => chooseService(s.id)} style={{ borderWidth: 1, borderColor: s.id === serviceId ? '#171717' : '#ddd', borderRadius: 10, padding: 10, marginRight: 8, backgroundColor: s.id === serviceId ? '#171717' : '#fff' }}><Text style={{ fontWeight: '800', color: s.id === serviceId ? '#fff' : '#222' }}>{s.title || 'Sunday Service'}</Text><Text style={{ marginTop: 3, color: s.id === serviceId ? '#ddd' : '#666' }}>{s.service_date}</Text></Pressable>)}
      </ScrollView>
    </View>

    {selected ? <View style={card}>
      <Text style={{ fontSize: 17, fontWeight: '800' }}>2 · Current roster</Text>
      <Text style={{ color: '#666', marginTop: 4 }}>{selected.title} · {selected.service_date}</Text>
      {assignments.length === 0 ? <Text style={{ color: '#777', marginTop: 12 }}>No assignments are currently recorded for this service.</Text> : assignments.map(a => <View key={a.id} style={{ borderTopWidth: 1, borderTopColor: '#eee', paddingVertical: 10, marginTop: 8 }}><View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8 }}><Text style={{ fontWeight: '800', flex: 1 }}>{a.responsibility || 'Assignment'}</Text><Text style={{ fontSize: 12, fontWeight: '800' }}>{String(a.confirmation_status || 'pending').toUpperCase()}</Text></View><Text style={{ color: '#666', marginTop: 3 }}>{a.assignment_status || 'assigned'} · {a.notes || 'No notes'}</Text><Pressable disabled={communicationBusy === a.id} onPress={() => createMessage(a.id)} style={{ marginTop: 8, alignSelf: 'flex-start', borderWidth: 1, borderColor: '#171717', borderRadius: 9, paddingVertical: 8, paddingHorizontal: 10 }}><Text style={{ fontSize: 12, fontWeight: '800' }}>{communicationBusy === a.id ? '…' : 'PREPARE MESSAGE'}</Text></Pressable></View>)}
    </View> : null}

    <View style={card}>
      <Text style={{ fontSize: 17, fontWeight: '800' }}>3 · AI roster intelligence</Text>
      <Text style={{ color: '#666', marginTop: 4 }}>AI proposes; a human approves or rejects. Nothing here silently finalises a consequential assignment.</Text>
      <Pressable disabled={!serviceId || busy} onPress={runIntelligence} style={{ ...button, marginTop: 12, backgroundColor: '#171717', opacity: (!serviceId || busy) ? .55 : 1 }}><Text style={{ color: '#fff', fontWeight: '800' }}>{busy ? 'WORKING…' : 'RUN ROSTER INTELLIGENCE'}</Text></Pressable>
      {recommendations.filter(r => r.status === 'proposed').length === 0 ? <Text style={{ color: '#777', marginTop: 12 }}>No pending recommendations.</Text> : recommendations.filter(r => r.status === 'proposed').slice(0, 12).map(r => <View key={r.id} style={{ borderTopWidth: 1, borderTopColor: '#eee', paddingTop: 12, marginTop: 12 }}><Text style={{ fontWeight: '800' }}>{r.responsibility || 'Musician'}</Text><Text style={{ color: '#555', marginTop: 3 }}>{r.reason || r.rationale || 'Recommended for this service.'}</Text><Text style={{ color: '#666', marginTop: 3 }}>Score: {typeof r.score === 'number' ? Math.round(r.score * 100) + '%' : '—'}</Text><View style={{ flexDirection: 'row', gap: 8, marginTop: 9 }}><Pressable disabled={decisionBusy === r.id} onPress={() => decide(r.id, true)} style={{ ...button, flex: 1, backgroundColor: '#171717' }}><Text style={{ color: '#fff', fontWeight: '800' }}>{decisionBusy === r.id ? '…' : 'APPROVE'}</Text></Pressable><Pressable disabled={decisionBusy === r.id} onPress={() => decide(r.id, false)} style={{ ...button, flex: 1, borderWidth: 1, borderColor: '#171717' }}><Text style={{ fontWeight: '800' }}>REJECT</Text></Pressable></View></View>)}
    </View>

    <View style={card}>
      <Text style={{ fontSize: 17, fontWeight: '800' }}>4 · Verify</Text>
      <Text style={{ color: '#666', marginTop: 4 }}>Re-check the service timeline and current assignments after decisions.</Text>
      <Pressable disabled={!serviceId || busy} onPress={verify} style={{ ...button, marginTop: 12, borderWidth: 1, borderColor: '#171717', opacity: (!serviceId || busy) ? .55 : 1 }}><Text style={{ fontWeight: '800' }}>{busy ? 'VERIFYING…' : 'VERIFY SERVICE STATE'}</Text></Pressable>
      {verification ? <View style={{ marginTop: 10, backgroundColor: '#f1f1ed', borderRadius: 10, padding: 11 }}><Text style={{ fontWeight: '800' }}>VERIFICATION RESULT</Text><Text style={{ color: '#555', marginTop: 4 }}>{JSON.stringify(verification.summary || verification)}</Text></View> : null}
    </View>

    <View style={card}>
      <Text style={{ fontSize: 17, fontWeight: '800' }}>5 · Communication queue</Text>
      <Text style={{ color: '#666', marginTop: 4 }}>Messages remain human-approved before push delivery.</Text>
      {communications.filter(c => !serviceId || c.service_id === serviceId).slice(0, 10).map(c => <View key={c.id} style={{ borderTopWidth: 1, borderTopColor: '#eee', paddingTop: 11, marginTop: 11 }}><Text style={{ fontWeight: '800' }}>{c.title || 'Assignment message'}</Text><Text style={{ color: '#555', marginTop: 3 }}>{c.body || ''}</Text><Text style={{ color: '#777', marginTop: 3, fontSize: 12 }}>Status: {String(c.status || 'pending').toUpperCase()}</Text><View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>{String(c.status) === 'draft' || String(c.status) === 'pending' ? <Pressable disabled={communicationBusy === c.id} onPress={() => approveMessage(c.id)} style={{ ...button, flex: 1, borderWidth: 1, borderColor: '#171717' }}><Text style={{ fontWeight: '800' }}>APPROVE MESSAGE</Text></Pressable> : null}{String(c.status) === 'approved' ? <Pressable disabled={communicationBusy === c.id} onPress={() => sendMessage(c)} style={{ ...button, flex: 1, backgroundColor: '#171717' }}><Text style={{ color: '#fff', fontWeight: '800' }}>SEND</Text></Pressable> : null}</View></View>)}
      {communications.filter(c => !serviceId || c.service_id === serviceId).length === 0 ? <Text style={{ color: '#777', marginTop: 12 }}>No communication objects for this service.</Text> : null}
    </View>

    {error ? <View style={{ backgroundColor: '#fff4f2', borderRadius: 12, padding: 12 }}><Text style={{ fontWeight: '800', color: '#B42318' }}>Operation failed</Text><Text style={{ color: '#666', marginTop: 4 }}>{error}</Text></View> : null}
  </ScrollView>;
}
