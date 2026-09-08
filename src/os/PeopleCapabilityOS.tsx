import React, { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import ElderDashboard, { ElderDashboardAction } from './ElderDashboard';
import BandsOS from './BandsOS';
import PeopleCapabilityLegacyOS from './PeopleCapabilityLegacyOS';
import SongSelectMusicOS from './SongSelectMusicOS';
import AIOperatingModelOS from './AIOperatingModelOS';
import ChurchOSControlTower from './ChurchOSControlTower';

type Area = 'music' | 'visitors' | 'sunday' | null;

const areaMeta = {
  music: { title: 'MUSIC & BANDS', body: 'People, bands, roster and worship readiness' },
  visitors: { title: 'PEOPLE', body: 'Visitors and people who need a response' },
  sunday: { title: 'SUNDAY', body: 'The live Sunday operating controls' },
} as const;

export default function PeopleCapabilityOS() {
  const [area, setArea] = useState<Area>(null);

  const openArea = (action: ElderDashboardAction) => {
    if (action === 'music' || action === 'visitors' || action === 'sunday') setArea(action);
  };

  return <View style={{ flex: 1 }}>
    <View style={{ position: 'relative', zIndex: 100, elevation: 100 }}>
      <ElderDashboard onAction={openArea} />
    </View>

    {area ? <View style={{ marginHorizontal: 20, marginBottom: 14, borderWidth: 1, borderColor: '#e3e3e0', borderRadius: 14, padding: 14, backgroundColor: '#f7f7f4' }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 11, fontWeight: '800', letterSpacing: 1, color: '#666' }}>CHURCH AREA</Text>
          <Text style={{ fontSize: 19, fontWeight: '800', marginTop: 3 }}>{areaMeta[area].title}</Text>
          <Text style={{ fontSize: 14, color: '#666', marginTop: 2 }}>{areaMeta[area].body}</Text>
        </View>
        <Pressable accessibilityRole="button" accessibilityLabel="Back to all church areas" onPress={() => setArea(null)} hitSlop={8} style={({ pressed }) => ({ borderWidth: 1, borderColor: '#171717', borderRadius: 10, paddingVertical: 9, paddingHorizontal: 11, opacity: pressed ? 0.6 : 1 })}>
          <Text style={{ fontSize: 11, fontWeight: '800' }}>ALL AREAS</Text>
        </Pressable>
      </View>
    </View> : null}

    {(!area || area === 'music') ? <>
      <AIOperatingModelOS />
      <SongSelectMusicOS />
      <BandsOS />
    </> : null}

    {(!area || area === 'visitors') ? <PeopleCapabilityLegacyOS /> : null}

    {(!area || area === 'sunday') ? <ChurchOSControlTower /> : null}
  </View>;
}
