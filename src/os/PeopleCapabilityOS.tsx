import React from 'react';
import ElderDashboard from './ElderDashboard';
import BandsOS from './BandsOS';
import PeopleCapabilityLegacyOS from './PeopleCapabilityLegacyOS';
import SongSelectMusicOS from './SongSelectMusicOS';
import AIOperatingModelOS from './AIOperatingModelOS';

export default function PeopleCapabilityOS() {
  return <>
    <ElderDashboard />
    <AIOperatingModelOS />
    <SongSelectMusicOS />
    <BandsOS />
    <PeopleCapabilityLegacyOS />
  </>;
}
