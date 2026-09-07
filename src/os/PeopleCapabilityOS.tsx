import React from 'react';
import BandsOS from './BandsOS';
import PeopleCapabilityLegacyOS from './PeopleCapabilityLegacyOS';
import SongSelectMusicOS from './SongSelectMusicOS';
import AIOperatingModelOS from './AIOperatingModelOS';

export default function PeopleCapabilityOS() {
  return <>
    <AIOperatingModelOS />
    <SongSelectMusicOS />
    <BandsOS />
    <PeopleCapabilityLegacyOS />
  </>;
}
