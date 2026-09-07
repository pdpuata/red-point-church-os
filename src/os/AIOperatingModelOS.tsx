import React, { useCallback, useEffect, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { supabase } from '../../lib/supabase';

export default function AIOperatingModelOS() {
  const [data, setData] = useState<any>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setBusy(true); setError('');
    try {
      const { data: result, error: rpcError } = await supabase.rpc('os_get_ai_operating_model');
      if (rpcError) throw rpcError;
      if (result?.ok === false) throw new Error(result.reason || 'Operating model unavailable');
      setData(result);
    } catch (e: any) { setError(e?.message || 'Could not load operating model.'); }
    finally { setBusy(false); }
  }, []);

  useEffect(() => { load(); }, [load]);
  const counts = data?.counts || {};
  const workflows = Array.isArray(data?.workflows) ? data.workflows : [];
  const pct = counts.total ? Math.round((counts.operational / counts.total) * 100) : 0;

  return <View style={{ borderWidth: 1, borderColor: '#e3e3e0', borderRadius: 18, padding: 16, marginBottom: 14 }}>
    <Text style={{ fontSize: 11, fontWeight: '800', letterSpacing: 1.1, color: '#666' }}>AI OPERATING MODEL</Text>
    <Text style={{ fontSize: 23, fontWeight: '800', marginTop: 6 }}>Build the church around work, not screens.</Text>
    <Text style={{ color: '#666', lineHeight: 21, marginTop: 6 }}>{data?.north_star || 'AI should manage routine workflow; people retain judgement, relationships and consequential decisions.'}</Text>

    <View style={{ flexDirection: 'row', gap: 8, marginTop: 14 }}>
      {[[counts.operational, 'operating'], [counts.partial, 'in progress'], [counts.designed, 'designed']].map(([n, label]) => <View key={String(label)} style={{ flex: 1, backgroundColor: '#f1f1ed', borderRadius: 12, padding: 11 }}><Text style={{ fontSize: 22, fontWeight: '800' }}>{n ?? 0}</Text><Text style={{ fontSize: 11, color: '#666', marginTop: 2 }}>{label}</Text></View>)}
    </View>
    <Text style={{ fontSize: 13, color: '#555', marginTop: 12 }}>{pct}% of mapped workflows have an operational automation path.</Text>

    <View style={{ marginTop: 14 }}>
      {workflows.map((w: any) => <View key={w.key} style={{ borderTopWidth: 1, borderTopColor: '#eee', paddingVertical: 10 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8 }}><Text style={{ fontWeight: '800', flex: 1 }}>{w.name}</Text><Text style={{ fontSize: 11, fontWeight: '800' }}>{String(w.implementation_state).replace('_',' ').toUpperCase()}</Text></View>
        <Text style={{ fontSize: 12, color: '#666', marginTop: 3 }}>{w.domain} · {w.automation_level}{w.human_approval_required ? ' · human approval' : ' · autonomous where safe'}</Text>
      </View>)}
    </View>

    {data?.next_build_order?.length ? <View style={{ marginTop: 8, backgroundColor: '#f8f8f6', borderRadius: 14, padding: 13 }}><Text style={{ fontWeight: '800' }}>Next build order</Text>{data.next_build_order.slice(0,5).map((x: any) => <Text key={x.step} style={{ color: '#555', marginTop: 6 }}>{x.step}. {x.focus}</Text>)}</View> : null}
    <Pressable disabled={busy} onPress={load} style={{ alignSelf: 'flex-start', marginTop: 12, paddingVertical: 8, opacity: busy ? .5 : 1 }}><Text style={{ fontSize: 11, fontWeight: '800', textDecorationLine: 'underline' }}>{busy ? 'UPDATING…' : 'UPDATE OPERATING MODEL'}</Text></Pressable>
    {error ? <Text style={{ color: '#B42318', marginTop: 8 }}>{error}</Text> : null}
  </View>;
}
