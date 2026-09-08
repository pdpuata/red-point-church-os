import React, { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import ElderDashboard, { ElderDashboardAction } from './ElderDashboard';
import MusicBandsAdminOS from './MusicBandsAdminOS';
import PeopleCapabilityLegacyOS from './PeopleCapabilityLegacyOS';

export default function PeopleCapabilityOS() {
  const [area, setArea] = useState<ElderDashboardAction | null>(null);

  const openArea = (action: ElderDashboardAction) => {
    if (action === 'music' || action === 'visitors' || action === 'sunday') setArea(action);
  };

  if (area === 'music') return <MusicBandsAdminOS onBack={() => setArea(null)} />;

  if (area === 'visitors') return <View style={{ flex: 1 }}>
    <Pressable onPress={() => setArea(null)} style={{ marginHorizontal: 20, marginTop: 8, marginBottom: 4 }}><Text style={{ fontSize: 12, fontWeight: '800', textDecorationLine: 'underline' }}>‹ ADMIN HOME</Text></Pressable>
    <PeopleCapabilityLegacyOS />
  </View>;

  if (area === 'sunday') return <View style={{ flex: 1 }}>
    <Pressable onPress={() => setArea(null)} style={{ marginHorizontal: 20, marginTop: 8, marginBottom: 4 }}><Text style={{ fontSize: 12, fontWeight: '800', textDecorationLine: 'underline' }}>‹ ADMIN HOME</Text></Pressable>
    <View style={{ marginHorizontal: 20, borderWidth: 1, borderColor: '#e3e3e0', borderRadius: 16, padding: 16, backgroundColor: '#fff' }}>
      <Text style={{ fontSize: 12, fontWeight: '800', letterSpacing: 1.2, color: '#666' }}>SUNDAY</Text>
      <Text style={{ fontSize: 26, fontWeight: '800', marginTop: 4 }}>Sunday readiness</Text>
      <Text style={{ color: '#555', fontSize: 15, lineHeight: 22, marginTop: 6 }}>Use the Control Tower's Sunday operating loop to inspect the next service, surface blockers and run the human-approved readiness workflow.</Text>
      <Text style={{ color: '#777', marginTop: 12, lineHeight: 20 }}>The detailed operating controls remain in the Control Tower so there is one source of truth rather than a second, disconnected Sunday dashboard.</Text>
    </View>
  </View>;

  return <View style={{ flex: 1 }}>
    <ElderDashboard onAction={openArea} />
  </View>;
}
