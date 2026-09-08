import React, { useCallback, useEffect, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { supabase } from '../../lib/supabase';

export type ElderDashboardAction = 'sunday' | 'music' | 'visitors' | 'content' | 'admin';
type Props = { onAction?: (action: ElderDashboardAction) => void };
const card = { backgroundColor: '#fff', borderWidth: 1, borderColor: '#ddd', borderRadius: 18, padding: 18, marginBottom: 12 } as const;

function ActionCard({ title, body, action, onPress }: { title: string; body: string; action: string; onPress: () => void }) {
  return <Pressable accessibilityRole="button" accessibilityLabel={action} onPress={onPress} style={({ pressed }) => [card, { opacity: pressed ? .65 : 1 }]}>
    <Text style={{ fontSize: 21, fontWeight: '800', color: '#171717' }}>{title}</Text>
    <Text style={{ fontSize: 15, lineHeight: 21, color: '#666', marginTop: 5 }}>{body}</Text>
    <View style={{ marginTop: 13, borderRadius: 11, paddingVertical: 12, paddingHorizontal: 14, backgroundColor: '#171717', alignSelf: 'flex-start' }}>
      <Text style={{ color: '#fff', fontSize: 13, fontWeight: '800' }}>{action}</Text>
    </View>
  </Pressable>;
}

export default function ElderDashboard({ onAction }: Props) {
  const [data, setData] = useState<any>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    if (!supabase) return;
    setBusy(true); setError('');
    try {
      const { data: result, error: rpcError } = await supabase.rpc('os_get_elder_dashboard');
      if (rpcError) throw rpcError;
      if (result?.ok === false) throw new Error(result.reason || 'The church summary is unavailable.');
      setData(result);
    } catch (e: any) { setError(e?.message || 'The church summary could not be updated.'); }
    finally { setBusy(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const readiness = Number(data?.readiness_percent ?? 0);
  const service = data?.service;
  const attention = Array.isArray(data?.attention) ? data.attention : [];
  const ready = data?.status === 'ready' && attention.length === 0;

  return <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 36 }}>
    <Text style={{ fontSize: 12, fontWeight: '800', letterSpacing: 1.2, color: '#666' }}>CHURCH ADMIN</Text>
    <Text style={{ fontSize: 30, fontWeight: '800', color: '#171717', marginTop: 4 }}>What would you like to do?</Text>
    <Text style={{ fontSize: 15, lineHeight: 22, color: '#666', marginTop: 5, marginBottom: 17 }}>You do not need to know how the system works. Choose what you want to do.</Text>

    <View style={card}>
      <Text style={{ fontSize: 12, fontWeight: '800', letterSpacing: 1, color: '#666' }}>SUNDAY</Text>
      <Text style={{ fontSize: 25, fontWeight: '800', marginTop: 3 }}>{readiness}% ready</Text>
      <Text style={{ fontSize: 14, color: '#555', marginTop: 3 }}>{service ? `${service.title} · ${service.service_date}` : 'No upcoming service scheduled'}</Text>
      <Text style={{ fontSize: 14, color: ready ? '#555' : '#8a4b00', marginTop: 6 }}>{ready ? 'Everything currently looks ready.' : attention.length ? `${attention.length} thing${attention.length === 1 ? '' : 's'} need your attention.` : 'Check the service before Sunday.'}</Text>
      {onAction ? <Pressable accessibilityRole="button" accessibilityLabel="Check Sunday readiness" onPress={() => onAction('sunday')} style={{ marginTop: 11, alignSelf: 'flex-start', borderWidth: 1, borderColor: '#171717', borderRadius: 11, paddingVertical: 11, paddingHorizontal: 14 }}><Text style={{ fontSize: 13, fontWeight: '800' }}>CHECK SUNDAY</Text></Pressable> : null}
    </View>

    {onAction ? <>
      <ActionCard title="Music & Bands" body="Make sure the people serving in the band are sorted." action="MANAGE SUNDAY TEAM" onPress={() => onAction('music')} />
      <ActionCard title="People" body="See who is new and who needs a follow-up." action="FOLLOW UP PEOPLE" onPress={() => onAction('visitors')} />
      <ActionCard title="Sunday" body="Check whether anything could prevent a smooth Sunday service." action="CHECK SUNDAY" onPress={() => onAction('sunday')} />
    </> : null}

    {attention.length > 0 ? <View style={card}>
      <Text style={{ fontSize: 19, fontWeight: '800' }}>Things that need attention</Text>
      {attention.slice(0, 4).map((item: any) => <View key={item.key} style={{ borderTopWidth: 1, borderTopColor: '#eee', paddingTop: 11, marginTop: 11 }}><Text style={{ fontSize: 15, fontWeight: '800' }}>{item.title}</Text><Text style={{ color: '#666', marginTop: 3, lineHeight: 20 }}>{item.detail}</Text></View>)}
    </View> : null}

    <Pressable accessibilityRole="button" accessibilityLabel="Refresh church summary" onPress={load} disabled={busy} style={{ alignSelf: 'center', padding: 12, opacity: busy ? .5 : 1 }}><Text style={{ fontSize: 12, fontWeight: '800', letterSpacing: 1, textDecorationLine: 'underline' }}>{busy ? 'UPDATING…' : 'UPDATE SUMMARY'}</Text></Pressable>
    {error ? <View style={{ ...card, backgroundColor: '#fff7f5' }}><Text style={{ fontWeight: '800' }}>We could not update this page</Text><Text style={{ color: '#666', marginTop: 4, lineHeight: 20 }}>Please try again. {error}</Text></View> : null}
  </ScrollView>;
}
