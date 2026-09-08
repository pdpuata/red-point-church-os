import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, Text, View } from 'react-native';
import { approveAssignmentCommunication, approveRosterRecommendation, createAssignmentCommunication, evaluateServiceTimeline, getCommunicationQueue, getMusicServices, getRosterRecommendations, getServiceAssignments, planRoster, rejectRosterRecommendation, runRosterAgent, saveRosterRecommendations, sendAssignmentCommunication } from './os';

const card = { borderWidth: 1, borderColor: '#ddd', borderRadius: 18, padding: 18, marginBottom: 12, backgroundColor: '#fff' } as const;
const button = { borderRadius: 11, paddingVertical: 12, paddingHorizontal: 14, alignItems: 'center' } as const;

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
  const [verified, setVerified] = useState<boolean | null>(null);

  const selected = useMemo(() => services.find(s => s.id === serviceId), [services, serviceId]);
  const serviceComms = communications.filter(c => !serviceId || c.service_id === serviceId);
  const proposed = recommendations.filter(r => r.status === 'proposed');

  const refresh = useCallback(async () => {
    setError('');
    try {
      const nextServices = await getMusicServices();
      setServices(nextServices);
      const nextId = serviceId || nextServices[0]?.id || '';
      if (nextId) {
        setServiceId(nextId);
        const [r, a, c] = await Promise.all([getRosterRecommendations(nextId), getServiceAssignments(nextId), getCommunicationQueue()]);
        setRecommendations(r); setAssignments(a); setCommunications(c);
      }
    } catch (e: any) { setError(e?.message || 'We could not load the Sunday team.'); }
  }, [serviceId]);

  useEffect(() => { refresh(); }, [refresh]);

  const chooseService = async (id: string) => {
    setServiceId(id); setError(''); setVerified(null);
    try {
      const [r, a, c] = await Promise.all([getRosterRecommendations(id), getServiceAssignments(id), getCommunicationQueue()]);
      setRecommendations(r); setAssignments(a); setCommunications(c);
    } catch (e: any) { setError(e?.message || 'We could not load that service.'); }
  };

  const runIntelligence = async () => {
    if (!serviceId) return;
    setBusy(true); setError(''); setVerified(null);
    try {
      const [agentResult, planResult] = await Promise.all([runRosterAgent(serviceId), planRoster(serviceId)]);
      if (planResult?.candidates?.length) {
        const candidates = planResult.candidates.map((c: any) => ({ ...c, responsibility: c.responsibility || c.primary_capability || c.primary_capability_name || 'musician' }));
        await saveRosterRecommendations(serviceId, candidates);
      }
      const [r, a, c] = await Promise.all([getRosterRecommendations(serviceId), getServiceAssignments(serviceId), getCommunicationQueue()]);
      setRecommendations(r); setAssignments(a); setCommunications(c);
      Alert.alert('Team check complete', agentResult?.blockers?.length ? `${agentResult.blockers.length} thing${agentResult.blockers.length === 1 ? '' : 's'} need attention.` : 'No problems were found with the team.');
    } catch (e: any) { setError(e?.message || 'The team check could not be completed.'); }
    finally { setBusy(false); }
  };

  const decide = async (id: string, approve: boolean) => {
    setDecisionBusy(id); setError('');
    try {
      if (approve) await approveRosterRecommendation(id);
      else await rejectRosterRecommendation(id, 'Rejected by administrator during roster review');
      setRecommendations(await getRosterRecommendations(serviceId));
      setAssignments(await getServiceAssignments(serviceId));
    } catch (e: any) { setError(e?.message || 'We could not save that decision.'); }
    finally { setDecisionBusy(null); }
  };

  const createMessage = async (assignmentId: string) => {
    setCommunicationBusy(assignmentId); setError('');
    try { await createAssignmentCommunication(assignmentId); setCommunications(await getCommunicationQueue()); }
    catch (e: any) { setError(e?.message || 'We could not prepare the message.'); }
    finally { setCommunicationBusy(null); }
  };

  const approveMessage = async (id: string) => {
    setCommunicationBusy(id); setError('');
    try { await approveAssignmentCommunication(id); setCommunications(await getCommunicationQueue()); }
    catch (e: any) { setError(e?.message || 'We could not approve that message.'); }
    finally { setCommunicationBusy(null); }
  };

  const sendMessage = async (communication: any) => {
    setCommunicationBusy(communication.id); setError('');
    try { await sendAssignmentCommunication(communication); setCommunications(await getCommunicationQueue()); }
    catch (e: any) { setError(e?.message || 'We could not send that message.'); }
    finally { setCommunicationBusy(null); }
  };

  const verify = async () => {
    if (!serviceId) return;
    setBusy(true); setError('');
    try {
      const result = await evaluateServiceTimeline(serviceId);
      const ok = result?.ok === true || result?.ready === true || result?.status === 'ready' || result?.passed === true;
      setVerified(ok);
      setAssignments(await getServiceAssignments(serviceId));
    } catch (e: any) { setError(e?.message || 'We could not check the final roster.'); }
    finally { setBusy(false); }
  };

  return <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40 }}>
    <Pressable accessibilityRole="button" accessibilityLabel="Return to church admin" onPress={onBack} style={{ marginBottom: 13, paddingVertical: 5 }}><Text style={{ fontSize: 13, fontWeight: '800', textDecorationLine: 'underline' }}>‹ BACK TO ADMIN</Text></Pressable>
    <Text style={{ fontSize: 12, fontWeight: '800', letterSpacing: 1.2, color: '#666' }}>MUSIC & BANDS</Text>
    <Text style={{ fontSize: 30, fontWeight: '800', marginTop: 4 }}>Sunday team</Text>
    <Text style={{ color: '#666', fontSize: 15, lineHeight: 22, marginTop: 6, marginBottom: 17 }}>Check who is serving, review any suggested changes, and make sure everyone has been told.</Text>

    <View style={card}>
      <Text style={{ fontSize: 19, fontWeight: '800' }}>Which Sunday?</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 11 }}>
        {services.map(s => <Pressable key={s.id} accessibilityRole="button" accessibilityLabel={`Choose ${s.title || 'Sunday service'} ${s.service_date || ''}`} onPress={() => chooseService(s.id)} style={{ borderWidth: 1, borderColor: s.id === serviceId ? '#171717' : '#ddd', borderRadius: 11, padding: 11, marginRight: 8, backgroundColor: s.id === serviceId ? '#171717' : '#fff' }}><Text style={{ fontWeight: '800', color: s.id === serviceId ? '#fff' : '#222' }}>{s.title || 'Sunday'}</Text><Text style={{ marginTop: 3, color: s.id === serviceId ? '#ddd' : '#666' }}>{s.service_date}</Text></Pressable>)}
      </ScrollView>
    </View>

    {selected ? <View style={card}>
      <Text style={{ fontSize: 19, fontWeight: '800' }}>Who is serving?</Text>
      <Text style={{ color: '#666', marginTop: 3 }}>{selected.title} · {selected.service_date}</Text>
      {assignments.length === 0 ? <Text style={{ color: '#777', marginTop: 12, lineHeight: 20 }}>Nobody is currently assigned. Run the team check below to get suggestions.</Text> : assignments.map(a => <View key={a.id} style={{ borderTopWidth: 1, borderTopColor: '#eee', paddingTop: 11, marginTop: 11 }}><Text style={{ fontSize: 16, fontWeight: '800' }}>{a.responsibility || 'Team member'}</Text><Text style={{ color: '#666', marginTop: 3 }}>{String(a.confirmation_status || 'pending').toLowerCase()} · {a.assignment_status || 'assigned'}</Text><Pressable accessibilityRole="button" accessibilityLabel={`Prepare message for ${a.responsibility || 'team member'}`} disabled={communicationBusy === a.id} onPress={() => createMessage(a.id)} style={{ marginTop: 8, alignSelf: 'flex-start', borderWidth: 1, borderColor: '#171717', borderRadius: 10, paddingVertical: 9, paddingHorizontal: 11 }}><Text style={{ fontSize: 12, fontWeight: '800' }}>{communicationBusy === a.id ? 'PREPARING…' : 'PREPARE MESSAGE'}</Text></Pressable></View>)}
    </View> : null}

    <View style={card}>
      <Text style={{ fontSize: 19, fontWeight: '800' }}>Check the team</Text>
      <Text style={{ color: '#666', marginTop: 4, lineHeight: 20 }}>The computer will look for gaps and suggest people. You decide whether to accept each suggestion.</Text>
      <Pressable accessibilityRole="button" accessibilityLabel="Check the Sunday team" disabled={!serviceId || busy} onPress={runIntelligence} style={{ ...button, marginTop: 12, backgroundColor: '#171717', opacity: (!serviceId || busy) ? .55 : 1 }}><Text style={{ color: '#fff', fontWeight: '800' }}>{busy ? 'CHECKING…' : 'CHECK TEAM'}</Text></Pressable>
    </View>

    {proposed.length > 0 ? <View style={card}>
      <Text style={{ fontSize: 19, fontWeight: '800' }}>Suggested changes</Text>
      <Text style={{ color: '#666', marginTop: 4, lineHeight: 20 }}>Nothing changes until you choose.</Text>
      {proposed.slice(0, 12).map(r => <View key={r.id} style={{ borderTopWidth: 1, borderTopColor: '#eee', paddingTop: 12, marginTop: 12 }}><Text style={{ fontSize: 16, fontWeight: '800' }}>{r.responsibility || 'Team member'}</Text><Text style={{ color: '#555', marginTop: 4, lineHeight: 20 }}>{r.reason || r.rationale || 'Suggested for this Sunday.'}</Text><View style={{ flexDirection: 'row', gap: 8, marginTop: 10 }}><Pressable accessibilityRole="button" accessibilityLabel="Accept suggested change" disabled={decisionBusy === r.id} onPress={() => decide(r.id, true)} style={{ ...button, flex: 1, backgroundColor: '#171717' }}><Text style={{ color: '#fff', fontWeight: '800' }}>{decisionBusy === r.id ? '…' : 'ACCEPT'}</Text></Pressable><Pressable accessibilityRole="button" accessibilityLabel="Decline suggested change" disabled={decisionBusy === r.id} onPress={() => decide(r.id, false)} style={{ ...button, flex: 1, borderWidth: 1, borderColor: '#171717' }}><Text style={{ fontWeight: '800' }}>DECLINE</Text></Pressable></View></View>)}
    </View> : null}

    {serviceComms.length > 0 ? <View style={card}>
      <Text style={{ fontSize: 19, fontWeight: '800' }}>Messages</Text>
      <Text style={{ color: '#666', marginTop: 4, lineHeight: 20 }}>Review messages before they are sent.</Text>
      {serviceComms.slice(0, 10).map(c => <View key={c.id} style={{ borderTopWidth: 1, borderTopColor: '#eee', paddingTop: 11, marginTop: 11 }}><Text style={{ fontSize: 15, fontWeight: '800' }}>{c.title || 'Team message'}</Text><Text style={{ color: '#555', marginTop: 3, lineHeight: 20 }}>{c.body || ''}</Text><Text style={{ color: '#777', marginTop: 4, fontSize: 12 }}>Status: {String(c.status || 'pending').toLowerCase()}</Text>{String(c.status) === 'approved' ? <Pressable disabled={communicationBusy === c.id} onPress={() => sendMessage(c)} style={{ ...button, marginTop: 8, backgroundColor: '#171717' }}><Text style={{ color: '#fff', fontWeight: '800' }}>{communicationBusy === c.id ? 'SENDING…' : 'SEND MESSAGE'}</Text></Pressable> : <Pressable disabled={communicationBusy === c.id} onPress={() => approveMessage(c.id)} style={{ ...button, marginTop: 8, borderWidth: 1, borderColor: '#171717' }}><Text style={{ fontWeight: '800' }}>{communicationBusy === c.id ? 'SAVING…' : 'APPROVE MESSAGE'}</Text></Pressable>}</View>)}
    </View> : null}

    <View style={card}>
      <Text style={{ fontSize: 19, fontWeight: '800' }}>Finished?</Text>
      <Text style={{ color: '#666', marginTop: 4, lineHeight: 20 }}>Check the service one last time after making your decisions.</Text>
      <Pressable accessibilityRole="button" accessibilityLabel="Check that the Sunday team is ready" disabled={!serviceId || busy} onPress={verify} style={{ ...button, marginTop: 12, borderWidth: 1, borderColor: '#171717', opacity: (!serviceId || busy) ? .55 : 1 }}><Text style={{ fontWeight: '800' }}>{busy ? 'CHECKING…' : 'CHECK AGAIN'}</Text></Pressable>
      {verified !== null ? <View style={{ marginTop: 11, borderRadius: 11, padding: 12, backgroundColor: verified ? '#f1f1ed' : '#fff7f5' }}><Text style={{ fontSize: 16, fontWeight: '800' }}>{verified ? '✓ Sunday team looks ready' : 'There may still be something to fix'}</Text><Text style={{ color: '#666', marginTop: 3 }}>{verified ? 'The final check completed successfully.' : 'Review the team and suggested changes above.'}</Text></View> : null}
    </View>

    {error ? <View style={{ backgroundColor: '#fff7f5', borderWidth: 1, borderColor: '#f0d5cf', borderRadius: 12, padding: 13 }}><Text style={{ fontWeight: '800' }}>We could not complete that</Text><Text style={{ color: '#666', marginTop: 4, lineHeight: 20 }}>{error}</Text></View> : null}
  </ScrollView>;
}
