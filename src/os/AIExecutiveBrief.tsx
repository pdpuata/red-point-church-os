import React, { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import { getAgentRuntimeHealth, getLatestWorshipAnalysis } from './os';
import { getExecutiveAttentionFeed } from './ExecutiveAttentionFeed';

export default function AIExecutiveBrief({ serviceId }: { serviceId?: string }) {
  const [health, setHealth] = useState<any>(null);
  const [analysis, setAnalysis] = useState<any>(null);
  const [attention, setAttention] = useState<any>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [h, a, feed] = await Promise.all([
          getAgentRuntimeHealth(),
          serviceId ? getLatestWorshipAnalysis(serviceId) : Promise.resolve(null),
          getExecutiveAttentionFeed(),
        ]);
        if (!cancelled) { setHealth(h); setAnalysis(a); setAttention(feed); }
      } catch (_) {
        if (!cancelled) setHealth(null);
      }
    })();
    return () => { cancelled = true; };
  }, [serviceId]);

  const live = (health?.health || []).filter((x: any) => x.enabled);
  const pending = health?.pending?.length || 0;
  const failed = live.filter((x: any) => Number(x.failed_runs || 0) > 0).length;
  const risks = analysis?.analysis?.risks || analysis?.risks || [];
  const items = attention?.attention || [];

  return <View style={{ borderWidth: 1, borderColor: '#e3e3e0', borderRadius: 18, padding: 16, marginBottom: 14 }}>
    <Text style={{ fontSize: 18, fontWeight: '800' }}>What needs your attention?</Text>
    <Text style={{ color: '#666', marginTop: 4 }}>The operating system filters the current operational state down to the exceptions that need human judgement.</Text>

    <View style={{ marginTop: 12 }}>
      {items.length === 0 ? <Text style={{ color: '#555' }}>Nothing currently requires attention.</Text> : items.slice(0, 6).map((item: any) => (
        <View key={item.id} style={{ paddingVertical: 10, borderTopWidth: 1, borderTopColor: '#ededeb' }}>
          <Text style={{ fontWeight: '800' }}>{item.title}</Text>
          {!!item.description && <Text style={{ color: '#555', marginTop: 3 }}>{item.description}</Text>}
          {!!item.action && <Text style={{ color: '#777', fontSize: 12, marginTop: 4 }}>{item.action}</Text>}
        </View>
      ))}
    </View>

    <View style={{ flexDirection: 'row', gap: 10, marginTop: 12 }}>
      <View style={{ flex: 1 }}><Text style={{ fontSize: 24, fontWeight: '800' }}>{attention?.attention_count ?? 0}</Text><Text style={{ color: '#666' }}>exceptions</Text></View>
      <View style={{ flex: 1 }}><Text style={{ fontSize: 24, fontWeight: '800' }}>{live.length}</Text><Text style={{ color: '#666' }}>agents live</Text></View>
      <View style={{ flex: 1 }}><Text style={{ fontSize: 24, fontWeight: '800' }}>{pending}</Text><Text style={{ color: '#666' }}>approvals</Text></View>
      <View style={{ flex: 1 }}><Text style={{ fontSize: 24, fontWeight: '800' }}>{failed}</Text><Text style={{ color: '#666' }}>failures</Text></View>
    </View>

    {analysis ? <View style={{ marginTop: 14, backgroundColor: '#f1f1ed', borderRadius: 12, padding: 12 }}>
      <Text style={{ fontWeight: '800' }}>Latest setlist intelligence</Text>
      <Text style={{ color: '#555', marginTop: 5 }}>{analysis.analysis?.summary || analysis.summary || 'Analysis available.'}</Text>
      {risks.slice(0, 5).map((r: any, i: number) => <Text key={i} style={{ color: '#555', marginTop: 5 }}>• {typeof r === 'string' ? r : r.detail || JSON.stringify(r)}</Text>)}
    </View> : <Text style={{ color: '#777', marginTop: 12 }}>No completed setlist analysis is available for the selected service yet.</Text>}
    <Text style={{ color: '#777', fontSize: 12, marginTop: 12 }}>AI remains governed: consequential actions require the configured approval boundary.</Text>
  </View>;
}
