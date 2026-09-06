import React, { useEffect, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { getEventFabricHealth, publishOperationalEvent } from './os';

export default function EventFabricOS() {
  const [health, setHealth] = useState<any>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const load = async () => { try { setHealth(await getEventFabricHealth()); } catch (e:any) { setError(e?.message || String(e)); } };
  useEffect(() => { load(); }, []);
  const test = async () => {
    setBusy(true); setError(''); setMessage('');
    try {
      const r = await publishOperationalEvent('OS_RUNTIME_HEARTBEAT', 'system', undefined, 'control_tower', `heartbeat:${new Date().toISOString()}`, { source: 'v9_control_tower' });
      setMessage(`Event ${r.event_id || 'created'} published. ${r.deliveries || 0} workflow delivery(s) generated.`); await load();
    } catch (e:any) { setError(e?.message || String(e)); }
    finally { setBusy(false); }
  };
  return <View style={{ borderWidth:1, borderColor:'#e3e3e0', borderRadius:18, padding:16, marginBottom:14 }}>
    <Text style={{ fontSize:18, fontWeight:'800' }}>Event & State Fabric · v9</Text>
    <Text style={{ color:'#666', marginTop:4, lineHeight:20 }}>Operational changes become durable events. Subscriptions can dispatch workflows without hard-wiring every producer to every consumer. Events are idempotent, auditable and separate from agent authority.</Text>
    <Pressable disabled={busy} onPress={test} style={{ borderWidth:1, borderColor:'#171717', borderRadius:10, padding:10, alignSelf:'flex-start', marginTop:12 }}><Text style={{ fontWeight:'800' }}>{busy ? 'PUBLISHING…' : 'PUBLISH TEST EVENT'}</Text></Pressable>
    {message ? <Text style={{ color:'#067647', marginTop:9, fontWeight:'700' }}>{message}</Text> : null}
    {error ? <Text style={{ color:'#B42318', marginTop:9 }}>{error}</Text> : null}
    {health ? <Text style={{ color:'#555', marginTop:10 }}>{health.events} events · {health.active_subscriptions} active subscriptions · {health.queued_deliveries} queued deliveries · {health.failed_deliveries} failed · last event {health.last_event_at ? new Date(health.last_event_at).toLocaleString() : '—'}</Text> : null}
    <Text style={{ color:'#777', fontSize:12, marginTop:10 }}>v9 invariant: publishing an event never grants execution authority. Consumers still pass through workflow and agent permission gates.</Text>
  </View>;
}
