import React, { useEffect, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { getInstitutionalMemoryHealth, refreshInstitutionalMemory } from './os';

export default function InstitutionalMemoryOS() {
  const [health, setHealth] = useState<any>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const load = async () => { try { setHealth(await getInstitutionalMemoryHealth()); } catch (e:any) { setMessage(e?.message || String(e)); } };
  useEffect(() => { load(); }, []);
  const refresh = async () => { setBusy(true); setMessage(''); try { const r = await refreshInstitutionalMemory(); setMessage(`${r.nodes ?? 0} active knowledge nodes · ${r.edges ?? 0} operational relationships refreshed.`); await load(); } catch (e:any) { setMessage(e?.message || String(e)); } finally { setBusy(false); } };
  return <View style={{ borderWidth:1, borderColor:'#e3e3e0', borderRadius:18, padding:16, marginBottom:14 }}>
    <Text style={{ fontSize:18, fontWeight:'800' }}>Institutional Memory · v11</Text>
    <Text style={{ color:'#666', marginTop:4, lineHeight:20 }}>The OS now maintains a durable operational graph connecting services, workflows and agents instead of relying on screens or human memory as the system of record.</Text>
    {health ? <Text style={{ color:'#555', marginTop:10 }}>{health.active_nodes} active nodes · {health.edges} relationships · {health.service_nodes} services · {health.workflow_nodes} workflows · {health.agent_nodes} agents</Text> : null}
    <Text style={{ color:'#777', fontSize:12, marginTop:9 }}>Memory stores operational state and provenance; it does not invent people, permissions, theology or pastoral decisions.</Text>
    <Text style={{ color:'#666', marginTop:7 }}>{message || (health?.last_refreshed_at ? `Last refreshed ${new Date(health.last_refreshed_at).toLocaleString('en-ZA')}` : '')}</Text>
    <Pressable disabled={busy} onPress={refresh} style={{ marginTop:11, backgroundColor:'#171717', borderRadius:10, padding:11, alignItems:'center', opacity:busy?.55:1 }}><Text style={{ color:'#fff', fontWeight:'800' }}>{busy ? 'REFRESHING…' : 'REFRESH INSTITUTIONAL MEMORY'}</Text></Pressable>
  </View>;
}
