import React, { useCallback, useEffect, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { supabase } from '../../lib/supabase';

export type ElderDashboardAction = 'sunday' | 'music' | 'visitors' | 'content' | 'admin';
type Props = { onAction?: (action: ElderDashboardAction) => void };
const card = { backgroundColor: '#fff', borderWidth: 1, borderColor: '#e3e3e0', borderRadius: 16, padding: 16, marginBottom: 12 } as const;

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
      if (result?.ok === false) throw new Error(result.reason || 'Dashboard unavailable');
      setData(result);
    } catch (e: any) { setError(e?.message || 'Could not load the church readiness summary.'); }
    finally { setBusy(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const readiness = Number(data?.readiness_percent ?? 0);
  const service = data?.service;
  const attention = Array.isArray(data?.attention) ? data.attention : [];
  const ready = data?.status === 'ready' && attention.length === 0;

  return <View style={{ padding: 20, paddingBottom: 24 }}>
    <Text style={{ fontSize: 12, fontWeight: '800', letterSpacing: 1.2, color: '#666' }}>CHURCH ADMIN</Text>
    <Text style={{ fontSize: 30, fontWeight: '800', color: '#171717', marginTop: 4 }}>What needs a decision?</Text>
    <Text style={{ fontSize: 15, lineHeight: 22, color: '#666', marginTop: 5, marginBottom: 16 }}>Choose one area. Everything else stays out of your way.</Text>

    <View style={card}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 11, fontWeight: '800', letterSpacing: 1, color: '#666' }}>SUNDAY READINESS</Text>
          <Text style={{ fontSize: 38, fontWeight: '800', marginTop: 3 }}>{readiness}%</Text>
          <Text style={{ fontSize: 14, color: '#555', marginTop: 1 }}>{service ? `${service.title} · ${service.service_date}` : 'No upcoming service scheduled'}</Text>
          {service ? <Text style={{ fontSize: 13, color: '#777', marginTop: 5 }}>{service.band_name || 'Band not assigned'} · {service.assignments} assigned · {service.confirmed} confirmed</Text> : null}
        </View>
        {onAction ? <Pressable accessibilityRole="button" accessibilityLabel="Review Sunday readiness" onPress={() => onAction('sunday')} style={({ pressed }) => ({ borderWidth: 1, borderColor: '#171717', borderRadius: 10, paddingVertical: 9, paddingHorizontal: 11, opacity: pressed ? .55 : 1 })}><Text style={{ fontSize: 12, fontWeight: '800' }}>REVIEW</Text></Pressable> : null}
      </View>
    </View>

    <Text style={{ fontSize: 11, fontWeight: '800', letterSpacing: 1, color: '#666', marginBottom: 8 }}>WORK AREAS</Text>
    {onAction ? <>
      <Pressable accessibilityRole="button" accessibilityLabel="Open Music and Bands" onPress={() => onAction('music')} style={({ pressed }) => [card, { marginBottom: 10, opacity: pressed ? .6 : 1 }]}>
        <Text style={{ fontSize: 19, fontWeight: '800' }}>Music & Bands</Text>
        <Text style={{ color: '#666', marginTop: 4, lineHeight: 20 }}>Roster, AI recommendations, approvals, communications and verification.</Text>
        <Text style={{ fontSize: 12, fontWeight: '800', marginTop: 9 }}>OPEN ROSTER OPERATIONS ›</Text>
      </Pressable>
      <Pressable accessibilityRole="button" accessibilityLabel="Open People" onPress={() => onAction('visitors')} style={({ pressed }) => [card, { marginBottom: 10, opacity: pressed ? .6 : 1 }]}>
        <Text style={{ fontSize: 19, fontWeight: '800' }}>People</Text>
        <Text style={{ color: '#666', marginTop: 4, lineHeight: 20 }}>Visitor follow-up and people who need a response.</Text>
        <Text style={{ fontSize: 12, fontWeight: '800', marginTop: 9 }}>OPEN PEOPLE ›</Text>
      </Pressable>
      <Pressable accessibilityRole="button" accessibilityLabel="Open Sunday" onPress={() => onAction('sunday')} style={({ pressed }) => [card, { marginBottom: 10, opacity: pressed ? .6 : 1 }]}>
        <Text style={{ fontSize: 19, fontWeight: '800' }}>Sunday</Text>
        <Text style={{ color: '#666', marginTop: 4, lineHeight: 20 }}>Service readiness, blockers and the Sunday operating loop.</Text>
        <Text style={{ fontSize: 12, fontWeight: '800', marginTop: 9 }}>OPEN SUNDAY ›</Text>
      </Pressable>
    </> : null}

    {!ready && attention.length ? <View style={{ ...card, backgroundColor: '#fafaf8' }}>
      <Text style={{ fontSize: 16, fontWeight: '800' }}>Needs attention</Text>
      {attention.slice(0, 3).map((item: any) => <View key={item.key} style={{ borderTopWidth: 1, borderTopColor: '#e8e8e5', paddingTop: 9, marginTop: 9 }}><Text style={{ fontWeight: '800' }}>{item.title}</Text><Text style={{ color: '#666', marginTop: 2, lineHeight: 19 }}>{item.detail}</Text></View>)}
    </View> : <View style={{ ...card, backgroundColor: '#f1f1ed' }}><Text style={{ fontSize: 16, fontWeight: '800' }}>✓ No current decisions</Text><Text style={{ color: '#666', marginTop: 3 }}>The operating summary is clear.</Text></View>}

    <Pressable onPress={load} disabled={busy} style={{ alignSelf: 'center', padding: 10, opacity: busy ? .5 : 1 }}><Text style={{ fontSize: 12, fontWeight: '800', letterSpacing: 1, textDecorationLine: 'underline' }}>{busy ? 'UPDATING…' : 'REFRESH SUMMARY'}</Text></Pressable>
    {error ? <View style={{ ...card, backgroundColor: '#fff4f2' }}><Text style={{ fontWeight: '800' }}>Couldn't update the summary</Text><Text style={{ color: '#666', marginTop: 4 }}>{error}</Text></View> : null}
  </View>;
}
