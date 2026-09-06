import React, { useEffect, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { getAdaptiveLearningHealth, runLearningCycle, getLearningProposals, approveLearningProposal } from './os';

export default function AdaptiveLearningOS() {
  const [health, setHealth] = useState<any>(null); const [proposals, setProposals] = useState<any[]>([]); const [busy, setBusy] = useState(false); const [message, setMessage] = useState('');
  const load = async () => { try { const [h,p] = await Promise.all([getAdaptiveLearningHealth(), getLearningProposals()]); setHealth(h); setProposals(p); } catch(e:any) { setMessage(e?.message || String(e)); } };
  useEffect(() => { load(); }, []);
  const cycle = async () => { setBusy(true); setMessage(''); try { const r=await runLearningCycle(); setMessage(`Learning cycle observed ${r.runs_observed ?? 0} run(s) and created ${r.proposals_created ?? 0} proposal(s).`); await load(); } catch(e:any) { setMessage(e?.message || String(e)); } finally { setBusy(false); } };
  return <View style={{ borderWidth:1, borderColor:'#e3e3e0', borderRadius:18, padding:16, marginBottom:14 }}>
    <Text style={{ fontSize:18, fontWeight:'800' }}>Adaptive Learning & Governance · v12</Text>
    <Text style={{ color:'#666', marginTop:4, lineHeight:20 }}>The OS evaluates verified workflow outcomes and can propose safer runtime-policy changes. Learning proposes; humans approve policy changes.</Text>
    {health ? <Text style={{ color:'#555', marginTop:10 }}>{health.evaluations_30d} evaluations / 30d · score {Number(health.average_score_30d || 0).toFixed(2)} · intervention {Math.round(Number(health.intervention_rate_30d || 0)*100)}% · {health.pending_proposals} pending proposal(s)</Text> : null}
    <Pressable disabled={busy} onPress={cycle} style={{ marginTop:11, borderWidth:1, borderColor:'#171717', borderRadius:10, padding:10, alignItems:'center', opacity:busy?.55:1 }}><Text style={{ fontWeight:'800' }}>{busy?'WORKING…':'RUN LEARNING CYCLE'}</Text></Pressable>
    {message ? <Text style={{ color:'#666', marginTop:9 }}>{message}</Text> : null}
    {proposals.slice(0,6).map(p => <View key={p.id} style={{ borderTopWidth:1, borderTopColor:'#eee', marginTop:12, paddingTop:11 }}><Text style={{ fontWeight:'800' }}>{p.policy_key}</Text><Text style={{ color:'#555', marginTop:4 }}>{p.reason}</Text><Text style={{ color:'#777', marginTop:4 }}>Proposed: {JSON.stringify(p.proposed_value)}</Text><Pressable disabled={busy} onPress={async()=>{setBusy(true);try{await approveLearningProposal(p.id);await load();}catch(e:any){setMessage(e?.message||String(e));}finally{setBusy(false);}}} style={{ marginTop:11, borderWidth:1, borderColor:'#171717', borderRadius:10, padding:10, alignItems:'center' }}><Text style={{ fontWeight:'800' }}>APPROVE POLICY CHANGE</Text></Pressable></View>)}
    <Text style={{ color:'#777', fontSize:12, marginTop:10 }}>Invariant: no learning cycle can silently rewrite autonomy policy. Every policy promotion creates an auditable human approval event.</Text>
  </View>;
}
