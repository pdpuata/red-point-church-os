import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, Text, View } from 'react-native';
import { runSundayOperatingLoop, getSystemIntegrity, runSystemIntegrityAudit, getServiceTimeline, evaluateServiceTimeline, askAiRoster, approveRosterRecommendation, createAssignmentCommunication, approveAssignmentCommunication, getAttentionQueue, getCommunicationQueue, getControlTower, getOperationalDataReadiness, generateOperationalDataTasks, getOperationalActivation, generateOperationalActivationTasks, getOperationalActivationPlan, getMusicServices, getRosterRecommendations, getServiceAssignments, planRoster, rejectRosterRecommendation, resolveTask, runRosterAgent, saveRosterRecommendations, sendAssignmentCommunication } from './os';
import PeopleCapabilityOS from './PeopleCapabilityOS';
import PeopleActivationOS from './PeopleActivationOS';
import PeopleIngestionOS from './PeopleIngestionOS';
import PeopleReconciliationOS from './PeopleReconciliationOS';
import WorkflowRuntimeOS from './WorkflowRuntimeOS';
import AgentRuntimeOS from './AgentRuntimeOS';
import EventFabricOS from './EventFabricOS';
import AutonomousRuntimeOS from './AutonomousRuntimeOS';
import InstitutionalMemoryOS from './InstitutionalMemoryOS';
import AdaptiveLearningOS from './AdaptiveLearningOS';
import AIExecutiveBrief from './AIExecutiveBrief';

const formatDate = (value: string | null | undefined) => value ? new Intl.DateTimeFormat('en-ZA', { weekday: 'short', day: 'numeric', month: 'short' }).format(new Date(value)) : '—';

export default function ChurchOSControlTower() {
  const [tower, setTower] = useState<any[]>([]);
  const [services, setServices] = useState<any[]>([]);
  const [serviceId, setServiceId] = useState('');
  const [plan, setPlan] = useState<any>(null);
  const [recommendations, setRecommendations] = useState<any[]>([]);
  const [assignments, setAssignments] = useState<any[]>([]);
  const [communications, setCommunications] = useState<any[]>([]);
  const [communicationBusy, setCommunicationBusy] = useState<string | null>(null);
  const [decisionBusy, setDecisionBusy] = useState<string | null>(null);
  const [ai, setAi] = useState<any>(null);
  const [attention, setAttention] = useState<any[]>([]);
  const [resolving, setResolving] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [sundayLoopBusy, setSundayLoopBusy] = useState(false);
  const [sundayLoop, setSundayLoop] = useState<any>(null);
  const [timeline, setTimeline] = useState<any[]>([]);
  const [timelineBusy, setTimelineBusy] = useState(false);
  const [timelineResult, setTimelineResult] = useState<any>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [error, setError] = useState('');
  const [integrity, setIntegrity] = useState<any[]>([]);
  const [integrityBusy, setIntegrityBusy] = useState(false);
  const [integrityResult, setIntegrityResult] = useState<any>(null);
  const [dataReadiness, setDataReadiness] = useState<any[]>([]);
  const [dataReadinessBusy, setDataReadinessBusy] = useState(false);
  const [dataReadinessResult, setDataReadinessResult] = useState<any>(null);
  const [activation, setActivation] = useState<any[]>([]);
  const [activationBusy, setActivationBusy] = useState(false);
  const [activationResult, setActivationResult] = useState<any>(null);

  const load = useCallback(async () => {
    setError('');
    try {
      const [t, s, a, c, i, d, act] = await Promise.all([getControlTower(), getMusicServices(), getAttentionQueue(), getCommunicationQueue(), getSystemIntegrity(), getOperationalDataReadiness(), getOperationalActivation()]);
      setTower(t);
      setAttention(a);
      setServices(s);
      setCommunications(c);
      setIntegrity(i);
      setDataReadiness(d);
      setActivation(act);
      if (serviceId) {
        const [r, a, tl] = await Promise.all([getRosterRecommendations(serviceId), getServiceAssignments(serviceId), getServiceTimeline(serviceId)]);
        setRecommendations(r);
        setAssignments(a);
        setTimeline(tl);
        setCommunications(await getCommunicationQueue());
      }
      if (!serviceId && s[0]?.id) setServiceId(s[0].id);
    } catch (e: any) { setError(e?.message || String(e)); }
  }, [serviceId]);

  useEffect(() => { load(); }, [load]);

  const selected = useMemo(() => services.find(s => s.id === serviceId), [services, serviceId]);
  const roster = tower.find(x => x.workflow_key === 'worship_roster');
  const readiness = tower.find(x => x.workflow_key === 'sunday_readiness');

  const runSundayLoop = async () => {
    if (!serviceId) return;
    setSundayLoopBusy(true); setError('');
    try {
      const result = await runSundayOperatingLoop(serviceId);
      setSundayLoop(result);
      await load();
    } catch (e: any) { setError(e?.message || String(e)); } finally { setSundayLoopBusy(false); }
  };

  const runIntegrityAudit = async () => {
    setIntegrityBusy(true); setError('');
    try {
      const result = await runSystemIntegrityAudit();
      setIntegrityResult(result);
      setIntegrity(await getSystemIntegrity());
    } catch (e: any) { setError(e?.message || String(e)); }
    finally { setIntegrityBusy(false); }
  };

  const generateDataTasks = async () => {
    setDataReadinessBusy(true); setError('');
    try {
      const result = await generateOperationalDataTasks();
      setDataReadinessResult(result);
      await load();
    } catch (e: any) { setError(e?.message || String(e)); }
    finally { setDataReadinessBusy(false); }
  };

  const generateActivationTasks = async () => {
    setActivationBusy(true); setError('');
    try {
      const result = await generateOperationalActivationTasks();
      setActivationResult(result);
      setActivation(await getOperationalActivation());
      await load();
    } catch (e: any) { setError(e?.message || String(e)); } finally { setActivationBusy(false); }
  };

  const runTemporalOperations = async () => {
    if (!serviceId) return;
    setTimelineBusy(true);
    setError('');
    try {
      const result = await evaluateServiceTimeline(serviceId);
      setTimelineResult(result);
      setTimeline(await getServiceTimeline(serviceId));
      await load();
    } catch (e: any) { setError(e?.message || String(e)); } finally { setTimelineBusy(false); }
  };

  const run = async () => {
    if (!serviceId) return;
    setLoading(true); setError('');
    try {
      const [agentResult, planResult] = await Promise.all([runRosterAgent(serviceId), planRoster(serviceId)]);
      setPlan(planResult);
      if (planResult?.candidates?.length) {
        const candidates = planResult.candidates.map((c: any) => ({ ...c, responsibility: c.responsibility || c.primary_capability || c.primary_capability_name || 'musician' }));
        await saveRosterRecommendations(serviceId, candidates);
      }
      const [r, a, tl] = await Promise.all([getRosterRecommendations(serviceId), getServiceAssignments(serviceId), getServiceTimeline(serviceId)]);
      setRecommendations(r);
      setAssignments(a);
      setTimeline(tl);
      await load();
      Alert.alert('Roster operation complete', agentResult?.blockers?.length ? `${agentResult.blockers.length} blocker(s) found.` : 'No roster blockers found.');
    } catch (e: any) { setError(e?.message || String(e)); }
    finally { setLoading(false); }
  };

  const resolve = async (task: any) => {
    setResolving(task.item_id); setError('');
    try { await resolveTask(task.item_id, { resolved_from: 'church_os_control_tower', resolved_at: new Date().toISOString() }); await load(); }
    catch (e: any) { setError(e?.message || String(e)); }
    finally { setResolving(null); }
  };

  const ask = async () => {
    if (!serviceId) return;
    setAiLoading(true); setError('');
    try { setAi(await askAiRoster(serviceId)); }
    catch (e: any) { setError(e?.message || String(e)); }
    finally { setAiLoading(false); }
  };

  return <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
    <PeopleCapabilityOS />
    <PeopleIngestionOS />
    <PeopleReconciliationOS />
    <WorkflowRuntimeOS />
    <AgentRuntimeOS />
    <EventFabricOS />
    <AutonomousRuntimeOS />
    <InstitutionalMemoryOS />
    <AdaptiveLearningOS />
    <AIExecutiveBrief serviceId={serviceId || undefined} />
    <PeopleActivationOS />
    <View style={{ backgroundColor: '#171717', borderRadius: 18, padding: 18, marginBottom: 14 }}>
      <Text style={{ color: '#fff', fontSize: 12, fontWeight: '800', letterSpacing: 1.2 }}>CHURCH OS · CONTROL TOWER</Text>
      <Text style={{ color: '#fff', fontSize: 27, fontWeight: '800', marginTop: 8 }}>Operate the church, not the screens.</Text>
      <Text style={{ color: '#ddd', fontSize: 15, lineHeight: 22, marginTop: 8 }}>The system watches workflows, surfaces exceptions and gives humans the decisions that actually require judgment.</Text>
    </View>

    <View style={{ borderWidth: 1, borderColor: '#e3e3e0', borderRadius: 18, padding: 16, marginBottom: 14 }}>
      <Text style={{ fontSize: 18, fontWeight: '800' }}>System Integrity</Text>
      <Text style={{ color: '#666', marginTop: 4 }}>Operational truth before more features: data, workflow, mutation, security, audit, verification and AI readiness.</Text>
      <Pressable disabled={integrityBusy} onPress={runIntegrityAudit} style={{ marginTop: 12, backgroundColor: '#171717', borderRadius: 10, padding: 11, alignItems: 'center', opacity: integrityBusy ? .55 : 1 }}><Text style={{ color: '#fff', fontWeight: '800' }}>{integrityBusy ? 'AUDITING…' : 'RUN SYSTEM INTEGRITY AUDIT'}</Text></Pressable>
      {integrityResult?.summary ? <Text style={{ color: '#555', marginTop: 10 }}>Last run: {JSON.stringify(integrityResult.summary)}</Text> : null}
      {integrity.map((d: any) => <View key={d.domain_key} style={{ borderTopWidth: 1, borderTopColor: '#eee', paddingVertical: 11 }}>
        <Text style={{ fontWeight: '800' }}>{d.domain_name}</Text>
        <Text style={{ color: d.data_status === 'data_gap' ? '#B42318' : '#555', marginTop: 4 }}>Data: {d.data_status} · Workflow: {d.workflow_status} · Mutation: {d.mutation_status}</Text>
        <Text style={{ color: '#666', marginTop: 3 }}>Security: {d.security_status} · Verification: {d.verification_status} · AI: {d.ai_readiness_status}</Text>
      </View>)}
    </View>


    <View style={{ borderWidth: 1, borderColor: '#e3e3e0', borderRadius: 18, padding: 16, marginBottom: 14 }}>
      <Text style={{ fontSize: 18, fontWeight: '800' }}>Operational Data Readiness</Text>
      <Text style={{ color: '#666', marginTop: 4 }}>The Church OS now measures whether its underlying organisational graph is actually ready for automation. Data gaps are treated as operational blockers, not AI problems.</Text>
      <Pressable disabled={dataReadinessBusy} onPress={generateDataTasks} style={{ marginTop: 12, backgroundColor: '#171717', borderRadius: 10, padding: 11, alignItems: 'center', opacity: dataReadinessBusy ? .55 : 1 }}><Text style={{ color: '#fff', fontWeight: '800' }}>{dataReadinessBusy ? 'GENERATING…' : 'GENERATE DATA READINESS TASKS'}</Text></Pressable>
      {dataReadinessResult ? <Text style={{ color: '#666', marginTop: 9 }}>Created {dataReadinessResult.created_count ?? 0} new task(s).</Text> : null}
      {dataReadiness.map((d: any) => <View key={d.domain_key} style={{ borderTopWidth: 1, borderTopColor: '#eee', paddingVertical: 11 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 10 }}><Text style={{ fontWeight: '800', flex: 1 }}>{d.domain_name}</Text><Text style={{ fontWeight: '800' }}>{String(d.status).toUpperCase()}</Text></View>
        <Text style={{ color: '#666', marginTop: 4 }}>{d.blocker_count ?? 0} blocker(s) · {JSON.stringify(d.evidence)}</Text>
      </View>)}
      <View style={{ marginTop: 14, backgroundColor: '#f1f1ed', borderRadius: 14, padding: 13 }}>
        <Text style={{ fontWeight: '800' }}>Operational Graph Activation</Text>
        <Text style={{ color: '#555', marginTop: 4 }}>This is the onboarding engine for the real church operating graph. It does not invent data; it identifies the first blocked dependency, creates one stable operational task, and unlocks the next phase only after evidence says the prerequisite is ready.</Text>
        <Pressable disabled={activationBusy} onPress={generateActivationTasks} style={{ marginTop: 12, backgroundColor: '#171717', borderRadius: 10, padding: 11, alignItems: 'center', opacity: activationBusy ? .55 : 1 }}><Text style={{ color: '#fff', fontWeight: '800' }}>{activationBusy ? 'ACTIVATING…' : 'RUN ACTIVATION CHECK'}</Text></Pressable>
        {activationResult ? <Text style={{ color: '#666', marginTop: 9 }}>Current phase: {activationResult.current_phase} · {activationResult.created_tasks ?? 0} new task(s)</Text> : null}
        {activation.map((p: any) => <View key={p.phase_key} style={{ marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#ddd' }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8 }}><Text style={{ fontWeight: '800', flex: 1 }}>{p.phase_order}. {p.phase_name}</Text><Text style={{ fontWeight: '800' }}>{String(p.status).replace('_',' ').toUpperCase()}</Text></View>
          <Text style={{ color: '#666', marginTop: 3 }}>{p.purpose}</Text>
          {p.next_action ? <Text style={{ color: '#333', marginTop: 4 }}>Next: {p.next_action}</Text> : null}
          {p.unlocks ? <Text style={{ color: '#666', marginTop: 3 }}>Unlocks: {p.unlocks}</Text> : null}
          {(p.readiness_blockers || 0) > 0 ? <Text style={{ color: '#B42318', marginTop: 3 }}>{p.readiness_blockers} readiness blocker(s)</Text> : null}
        </View>)}
        <Text style={{ color: '#777', marginTop: 10, fontSize: 12 }}>Legacy client projection: {getOperationalActivationPlan(dataReadiness).map((p: any) => `${p.label}: ${p.status}`).join(' · ')}</Text>
      </View>
    </View>

    {error ? <View style={{ backgroundColor: '#fff4f2', borderRadius: 14, padding: 14, marginBottom: 12 }}><Text style={{ fontWeight: '800' }}>Control Tower error</Text><Text style={{ color: '#666', marginTop: 4 }}>{error}</Text></View> : null}

    <View style={{ borderWidth: 1, borderColor: '#e3e3e0', borderRadius: 18, padding: 16, marginBottom: 14 }}>
      <Text style={{ fontSize: 18, fontWeight: '800' }}>Attention queue</Text>
      <Text style={{ color: '#666', marginTop: 4 }}>Only unresolved operational exceptions and decisions belong here.</Text>
      {attention.length === 0 ? <Text style={{ color: '#666', marginTop: 14 }}>Nothing requires intervention right now.</Text> : attention.slice(0, 12).map((item: any) => <View key={`${item.item_type}-${item.item_id}`} style={{ borderTopWidth: 1, borderTopColor: '#eee', paddingTop: 12, marginTop: 12 }}>
        <Text style={{ fontSize: 15, fontWeight: '800' }}>{item.overdue ? 'OVERDUE · ' : ''}{item.title}</Text>
        <Text style={{ color: '#666', marginTop: 4 }}>{item.workflow_name || 'Church operations'} · {item.priority}</Text>
        {item.description ? <Text style={{ color: '#555', marginTop: 4 }}>{item.description}</Text> : null}
        {item.item_type === 'task' ? <Pressable onPress={() => resolve(item)} disabled={resolving === item.item_id} style={{ marginTop: 9, borderWidth: 1, borderColor: '#171717', borderRadius: 10, padding: 10, alignItems: 'center' }}><Text style={{ fontWeight: '800' }}>{resolving === item.item_id ? 'RESOLVING…' : 'MARK RESOLVED'}</Text></Pressable> : <Text style={{ color: '#B42318', fontWeight: '800', marginTop: 8 }}>Human decision required</Text>}
      </View>)}
    </View>

    <View style={{ flexDirection: 'row', gap: 10, marginBottom: 14 }}>
      <View style={{ flex: 1, borderWidth: 1, borderColor: '#e3e3e0', borderRadius: 14, padding: 14 }}><Text style={{ fontSize: 26, fontWeight: '800' }}>{tower.filter(x => x.health === 'attention').length}</Text><Text style={{ color: '#666' }}>Needs attention</Text></View>
      <View style={{ flex: 1, borderWidth: 1, borderColor: '#e3e3e0', borderRadius: 14, padding: 14 }}><Text style={{ fontSize: 26, fontWeight: '800' }}>{readiness?.open_tasks ?? 0}</Text><Text style={{ color: '#666' }}>Readiness tasks</Text></View>
      <View style={{ flex: 1, borderWidth: 1, borderColor: '#e3e3e0', borderRadius: 14, padding: 14 }}><Text style={{ fontSize: 26, fontWeight: '800' }}>{roster?.open_tasks ?? 0}</Text><Text style={{ color: '#666' }}>Roster tasks</Text></View>
    </View>

    <View style={{ borderWidth: 1, borderColor: '#e3e3e0', borderRadius: 18, padding: 16, marginBottom: 14 }}>
      <Text style={{ fontSize: 18, fontWeight: '800' }}>Next service</Text>
      <Text style={{ color: '#666', marginTop: 4 }}>Select the service the operating system should reason about.</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 12 }}>
        {services.map(s => <Pressable key={s.id} onPress={() => { setServiceId(s.id); setPlan(null); setAi(null); }} style={{ borderWidth: 1, borderColor: serviceId === s.id ? '#171717' : '#ccc', backgroundColor: serviceId === s.id ? '#171717' : '#fff', borderRadius: 12, padding: 12, marginRight: 8 }}><Text style={{ color: serviceId === s.id ? '#fff' : '#333', fontWeight: '800' }}>{formatDate(s.service_date)}</Text><Text style={{ color: serviceId === s.id ? '#ddd' : '#666', marginTop: 3 }}>{s.band_id ? 'Band assigned' : 'No band'}</Text></Pressable>)}
      </ScrollView>
      {selected ? <Text style={{ marginTop: 12, color: '#555' }}>{selected.title} · {selected.status}</Text> : null}
      <Pressable onPress={runSundayLoop} disabled={sundayLoopBusy || !serviceId} style={{ marginTop: 10, borderWidth: 1, borderColor: '#B42318', borderRadius: 13, minHeight: 50, alignItems: 'center', justifyContent: 'center', opacity: sundayLoopBusy ? .55 : 1 }}><Text style={{ color: '#B42318', fontWeight: '800' }}>{sundayLoopBusy ? 'RUNNING SUNDAY OS…' : 'RUN SUNDAY OPERATING SYSTEM'}</Text></Pressable>
      <Pressable onPress={run} disabled={loading || !serviceId} style={{ marginTop: 14, backgroundColor: '#B42318', borderRadius: 13, minHeight: 54, alignItems: 'center', justifyContent: 'center', opacity: loading ? .55 : 1 }}><Text style={{ color: '#fff', fontWeight: '800' }}>{loading ? 'RUNNING…' : 'RUN ROSTER INTELLIGENCE'}</Text></Pressable>
    </View>

    <View style={{ borderWidth: 1, borderColor: '#e3e3e0', borderRadius: 18, padding: 16, marginBottom: 14 }}>
      <Text style={{ fontSize: 18, fontWeight: '800' }}>Temporal Operations</Text>
      <Text style={{ color: '#666', marginTop: 4 }}>The Church OS now knows what should be true by when. Future stages are visible; due and overdue stages become operational exceptions only when evaluated.</Text>
      <Pressable onPress={runTemporalOperations} disabled={timelineBusy || !serviceId} style={{ marginTop: 12, backgroundColor: '#171717', borderRadius: 12, minHeight: 48, alignItems: 'center', justifyContent: 'center', opacity: timelineBusy ? .55 : 1 }}>
        <Text style={{ color: '#fff', fontWeight: '800' }}>{timelineBusy ? 'EVALUATING TIMELINE…' : 'RUN TEMPORAL OPERATIONS'}</Text>
      </Pressable>
      {timelineResult ? <Text style={{ color: '#666', marginTop: 9 }}>Evaluated · {timelineResult.active_tasks ?? 0} active · {timelineResult.overdue_tasks ?? 0} overdue · {timelineResult.future_stages ?? 0} future stages</Text> : null}
      {timeline.slice(0, 9).map((t: any) => <View key={t.stage_key} style={{ borderTopWidth: 1, borderTopColor: '#eee', paddingTop: 10, marginTop: 10 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8 }}><Text style={{ fontWeight: '800', flex: 1 }}>{t.stage_name}</Text><Text style={{ fontWeight: '800' }}>{String(t.state).toUpperCase()}</Text></View>
        <Text style={{ color: '#666', marginTop: 3 }}>{t.due_at ? new Date(t.due_at).toLocaleString('en-ZA') : '—'} · {t.priority}</Text>
      </View>)}
    </View>

    {sundayLoop ? <View style={{ borderWidth: 1, borderColor: '#e3e3e0', borderRadius: 18, padding: 16, marginBottom: 14 }}>
      <Text style={{ fontSize: 18, fontWeight: '800' }}>Sunday Operating System</Text>
      <Text style={{ color: '#666', marginTop: 5 }}>{sundayLoop.status || 'snapshot'} · {sundayLoop.blockers ?? 0} blocker(s) · {sundayLoop.warnings ?? 0} warning(s)</Text>
      {(sundayLoop.checks || []).map((c: any, i: number) => <View key={c.key || i} style={{ borderTopWidth: 1, borderTopColor: '#eee', paddingTop: 9, marginTop: 9 }}><Text style={{ fontWeight: '800' }}>{c.key} · {c.status}</Text><Text style={{ color: '#666', marginTop: 3 }}>{c.detail}</Text></View>)}
    </View> : null}

    {selected ? <View style={{ borderWidth: 1, borderColor: '#e3e3e0', borderRadius: 18, padding: 16, marginBottom: 14 }}>
      <Text style={{ fontSize: 18, fontWeight: '800' }}>Roster approval loop</Text>
      <Text style={{ color: '#666', marginTop: 4 }}>AI/deterministic planning proposes. A human approves. The system then creates the assignment and leaves confirmation pending.</Text>
      {recommendations.filter(r => r.status === 'proposed').slice(0, 12).map((r: any) => <View key={r.id} style={{ borderTopWidth: 1, borderTopColor: '#eee', paddingTop: 12, marginTop: 12 }}>
        <Text style={{ fontWeight: '800' }}>{r.responsibility} · {r.score ?? '—'}</Text>
        <Text style={{ color: '#666', marginTop: 4 }}>{r.user_id || 'No person'} · proposed</Text>
        <View style={{ flexDirection: 'row', gap: 8, marginTop: 9 }}>
          <Pressable disabled={decisionBusy === r.id} onPress={async () => { setDecisionBusy(r.id); setError(''); try { await approveRosterRecommendation(r.id); const [rr, aa] = await Promise.all([getRosterRecommendations(serviceId), getServiceAssignments(serviceId)]); setRecommendations(rr); setAssignments(aa); await load(); } catch (e: any) { setError(e?.message || String(e)); } finally { setDecisionBusy(null); } }} style={{ flex: 1, backgroundColor: '#171717', borderRadius: 10, padding: 10, alignItems: 'center' }}><Text style={{ color: '#fff', fontWeight: '800' }}>{decisionBusy === r.id ? '…' : 'APPROVE'}</Text></Pressable>
          <Pressable disabled={decisionBusy === r.id} onPress={async () => { setDecisionBusy(r.id); setError(''); try { await rejectRosterRecommendation(r.id, 'Human reviewer rejected this recommendation'); const rr = await getRosterRecommendations(serviceId); setRecommendations(rr); await load(); } catch (e: any) { setError(e?.message || String(e)); } finally { setDecisionBusy(null); } }} style={{ flex: 1, borderWidth: 1, borderColor: '#171717', borderRadius: 10, padding: 10, alignItems: 'center' }}><Text style={{ fontWeight: '800' }}>REJECT</Text></Pressable>
        </View>
      </View>)}
      {recommendations.filter(r => r.status === 'proposed').length === 0 ? <Text style={{ color: '#666', marginTop: 12 }}>No pending recommendations for this service.</Text> : null}
      {assignments.length ? <View style={{ marginTop: 16 }}><Text style={{ fontWeight: '800' }}>Assignments created</Text>{assignments.map((a: any) => <Text key={a.id} style={{ color: '#555', marginTop: 5 }}>• {a.responsibility} · {a.user_id} · {a.assignment_status} · confirmation {a.confirmation_status}</Text>)}</View> : null}
    </View> : null}

    {plan ? <View style={{ borderWidth: 1, borderColor: '#e3e3e0', borderRadius: 18, padding: 16, marginBottom: 14 }}>
      <Text style={{ fontSize: 18, fontWeight: '800' }}>Roster reasoning context</Text>
      <Text style={{ color: '#666', marginTop: 4 }}>{plan.candidate_count ?? 0} eligible candidate(s). Human approval: {plan.human_approval_required ? 'required' : 'not required'}.</Text>
      {(plan.candidates || []).slice(0, 8).map((c: any, i: number) => <View key={`${c.user_id}-${i}`} style={{ borderTopWidth: 1, borderTopColor: '#eee', paddingTop: 10, marginTop: 10 }}><Text style={{ fontWeight: '800' }}>{c.display_name || 'Unnamed person'} · score {c.score}</Text><Text style={{ color: '#666', marginTop: 3 }}>{c.availability || 'availability unknown'} · {c.recent_service_count ?? 0} recent service(s)</Text></View>)}
      {plan.candidate_count === 0 ? <View style={{ backgroundColor: '#f1f1ed', borderRadius: 12, padding: 12, marginTop: 12 }}><Text style={{ fontWeight: '800' }}>Data gap, not AI failure</Text><Text style={{ color: '#666', marginTop: 4 }}>No band membership records currently exist for this band. The system will not invent people or assignments.</Text></View> : null}
      <Pressable onPress={ask} disabled={aiLoading} style={{ marginTop: 14, borderWidth: 1, borderColor: '#171717', borderRadius: 12, padding: 13, alignItems: 'center', opacity: aiLoading ? .55 : 1 }}><Text style={{ fontWeight: '800' }}>{aiLoading ? 'ASKING AI…' : 'ASK AI TO ANALYZE'}</Text></Pressable>
    </View> : null}


    <View style={{ borderWidth: 1, borderColor: '#e3e3e0', borderRadius: 18, padding: 16, marginBottom: 14 }}>
      <Text style={{ fontSize: 18, fontWeight: '800' }}>Communication execution</Text>
      <Text style={{ color: '#666', marginTop: 4 }}>Assignments become explicit message objects. Human approval is required before routine push delivery.</Text>
      {assignments.length === 0 ? <Text style={{ color: '#666', marginTop: 14 }}>No active assignments yet.</Text> : assignments.map((a: any) => {
        const c = communications.find((x: any) => x.assignment_id === a.id);
        return <View key={a.id} style={{ borderTopWidth: 1, borderTopColor: '#eee', paddingTop: 12, marginTop: 12 }}>
          <Text style={{ fontWeight: '800' }}>{a.responsibility}</Text>
          <Text style={{ color: '#666', marginTop: 3 }}>{a.user_id} · confirmation {a.confirmation_status}</Text>
          {!c ? <Pressable disabled={communicationBusy === a.id} onPress={async () => { setCommunicationBusy(a.id); setError(''); try { await createAssignmentCommunication(a.id); setCommunications(await getCommunicationQueue()); } catch (e: any) { setError(e?.message || String(e)); } finally { setCommunicationBusy(null); } }} style={{ marginTop: 9, borderWidth: 1, borderColor: '#171717', borderRadius: 10, padding: 10, alignItems: 'center' }}><Text style={{ fontWeight: '800' }}>{communicationBusy === a.id ? 'CREATING…' : 'CREATE MESSAGE DRAFT'}</Text></Pressable> : <>
            <Text style={{ color: '#555', marginTop: 8 }}>{c.body}</Text>
            <Text style={{ color: '#666', marginTop: 5 }}>channel {c.channel} · {c.status}</Text>
            {c.status === 'draft' ? <Pressable disabled={communicationBusy === c.communication_id} onPress={async () => { setCommunicationBusy(c.communication_id); setError(''); try { await approveAssignmentCommunication(c.communication_id); setCommunications(await getCommunicationQueue()); } catch (e: any) { setError(e?.message || String(e)); } finally { setCommunicationBusy(null); } }} style={{ marginTop: 9, backgroundColor: '#171717', borderRadius: 10, padding: 10, alignItems: 'center' }}><Text style={{ color: '#fff', fontWeight: '800' }}>{communicationBusy === c.communication_id ? 'APPROVING…' : 'APPROVE MESSAGE'}</Text></Pressable> : null}
            {c.status === 'approved' ? <Pressable disabled={communicationBusy === c.communication_id} onPress={async () => { setCommunicationBusy(c.communication_id); setError(''); try { await sendAssignmentCommunication(c); setCommunications(await getCommunicationQueue()); } catch (e: any) { setError(e?.message || String(e)); } finally { setCommunicationBusy(null); } }} style={{ marginTop: 9, backgroundColor: '#B42318', borderRadius: 10, padding: 10, alignItems: 'center' }}><Text style={{ color: '#fff', fontWeight: '800' }}>{communicationBusy === c.communication_id ? 'SENDING…' : 'SEND PUSH'}</Text></Pressable> : null}
          </>}
        </View>;
      })}
    </View>

    {ai ? <View style={{ borderWidth: 1, borderColor: '#e3e3e0', borderRadius: 18, padding: 16, marginBottom: 14 }}><Text style={{ fontSize: 18, fontWeight: '800' }}>AI analysis</Text>{ai.configured === false ? <Text style={{ color: '#666', marginTop: 8 }}>AI provider is not configured on the backend yet. The deterministic Church OS is still running.</Text> : <><Text style={{ fontWeight: '800', marginTop: 10 }}>{ai.summary || 'Analysis complete.'}</Text>{(ai.risks || []).map((r: any, i: number) => <Text key={i} style={{ color: '#555', marginTop: 7 }}>• {typeof r === 'string' ? r : r.detail || JSON.stringify(r)}</Text>)}</>}</View> : null}

    <View style={{ borderWidth: 1, borderColor: '#e3e3e0', borderRadius: 18, padding: 16 }}>
      <Text style={{ fontSize: 18, fontWeight: '800' }}>Workflow health</Text>
      {tower.map(w => <View key={w.workflow_key} style={{ borderTopWidth: 1, borderTopColor: '#eee', paddingVertical: 11 }}><Text style={{ fontWeight: '800' }}>{w.workflow_name}</Text><Text style={{ color: '#666', marginTop: 3 }}>{w.health} · {w.open_tasks} open · {w.run_count} runs</Text></View>)}
    </View>
  </ScrollView>;
}
