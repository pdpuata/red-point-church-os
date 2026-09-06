import React, { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import { getAutonomousRuntimeHealth } from './os';

export default function AutonomousRuntimeOS() {
  const [health, setHealth] = useState<any>(null);
  const [error, setError] = useState('');
  const load = async () => { try { setHealth(await getAutonomousRuntimeHealth()); setError(''); } catch (e:any) { setError(e?.message || String(e)); } };
  useEffect(() => { load(); const id = setInterval(load, 30000); return () => clearInterval(id); }, []);
  return <View style={{ borderWidth:1, borderColor:'#e3e3e0', borderRadius:18, padding:16, marginBottom:14 }}>
    <Text style={{ fontSize:18, fontWeight:'800' }}>Autonomous Runtime · v10</Text>
    <Text style={{ color:'#666', marginTop:4, lineHeight:20 }}>The Church OS now has a live execution loop: scheduled runtime tick → service discovery → workflow dispatch → deterministic verification → escalation → audit evidence.</Text>
    {health ? <>
      <Text style={{ color:'#067647', marginTop:10, fontWeight:'800' }}>● RUNTIME ONLINE · 1-minute scheduler</Text>
      <Text style={{ color:'#555', marginTop:7 }}>{health.pending_dispatches} pending workflow dispatches · {health.pending_agent_actions} approved agent actions · {health.pending_event_deliveries} queued event deliveries</Text>
      <Text style={{ color:'#555', marginTop:4 }}>{health.completed_24h} workflow dispatches completed in 24h · {health.failed_24h} failed · last tick {health.last_tick_at ? new Date(health.last_tick_at).toLocaleString() : '—'}</Text>
    </> : null}
    {error ? <Text style={{ color:'#B42318', marginTop:9 }}>{error}</Text> : null}
    <Text style={{ color:'#777', fontSize:12, marginTop:10 }}>v10 invariant: autonomy executes only registered deterministic handlers; unsupported workflows fail closed and human approval boundaries remain intact.</Text>
  </View>;
}
