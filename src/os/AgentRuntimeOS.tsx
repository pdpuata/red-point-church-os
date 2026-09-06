import React, { useEffect, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { getAgentRuntimeHealth, claimAgentActions, approveAgentAction } from './os';

export default function AgentRuntimeOS() {
  const [rows, setRows] = useState<any[]>([]);
  const [actions, setActions] = useState<any[]>([]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const load = async () => {
    try { const r = await getAgentRuntimeHealth(); setRows(r.health || []); setActions(r.pending || []); }
    catch (e: any) { setError(e?.message || String(e)); }
  };
  useEffect(() => { load(); }, []);
  const claim = async () => {
    setBusy(true); setError(''); setMessage('');
    try { const r = await claimAgentActions(10); setMessage(`${r.length} agent action(s) claimed.`); await load(); }
    catch (e: any) { setError(e?.message || String(e)); }
    finally { setBusy(false); }
  };
  const approve = async (id: string) => {
    setBusy(true); setError('');
    try { await approveAgentAction(id); setMessage('Human-approved action returned to the execution queue.'); await load(); }
    catch (e: any) { setError(e?.message || String(e)); }
    finally { setBusy(false); }
  };
  return <View style={{ borderWidth: 1, borderColor: '#e3e3e0', borderRadius: 18, padding: 16, marginBottom: 14 }}>
    <Text style={{ fontSize: 18, fontWeight: '800' }}>Universal Agent Runtime · v8</Text>
    <Text style={{ color: '#666', marginTop: 4, lineHeight: 20 }}>Agents now have an explicit contract: permission → tool → action → verification → outcome → audit. AI cannot bypass the permission boundary or turn a recommendation into an execution silently.</Text>
    <Pressable disabled={busy} onPress={claim} style={{ borderWidth: 1, borderColor: '#171717', borderRadius: 10, padding: 10, alignSelf: 'flex-start', marginTop: 12 }}><Text style={{ fontWeight: '800' }}>CLAIM AGENT WORK</Text></Pressable>
    {message ? <Text style={{ color: '#067647', marginTop: 9, fontWeight: '700' }}>{message}</Text> : null}
    {error ? <Text style={{ color: '#B42318', marginTop: 9 }}>{error}</Text> : null}
    {actions.filter(a => a.approval_status === 'pending').slice(0, 5).map(a => <View key={a.id} style={{ borderTopWidth: 1, borderTopColor: '#eee', marginTop: 12, paddingTop: 10 }}>
      <Text style={{ fontWeight: '800' }}>{a.agent_name} → {a.tool_name}</Text>
      <Text style={{ color: '#666', marginTop: 3 }}>{a.requested_mode} · {a.status} · {a.entity_type || 'no entity'}</Text>
      <Pressable disabled={busy} onPress={() => approve(a.id)} style={{ borderWidth: 1, borderColor: '#171717', borderRadius: 8, padding: 8, alignSelf: 'flex-start', marginTop: 7 }}><Text style={{ fontWeight: '800' }}>APPROVE EXECUTION</Text></Pressable>
    </View>)}
    {rows.map(r => <View key={r.id} style={{ borderTopWidth: 1, borderTopColor: '#eee', paddingVertical: 10, marginTop: 10 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}><Text style={{ fontWeight: '800' }}>{r.name}</Text><Text style={{ fontWeight: '800' }}>{r.enabled ? 'ENABLED' : 'DISABLED'}</Text></View>
      <Text style={{ color: '#666', marginTop: 3 }}>{r.mode} · {r.enabled_tools} tools · {r.open_actions} open · {r.completed_actions} completed · {r.failed_actions} failed</Text>
    </View>)}
    <Text style={{ color: '#777', fontSize: 12, marginTop: 10 }}>Safety invariant: no generic “AI can do anything” tool exists. Every executable action must map to a registered tool and explicit agent permission.</Text>
  </View>;
}
