import React from 'react';
import BandsOS from './BandsOS';
import PeopleCapabilityLegacyOS from './PeopleCapabilityLegacyOS';
import SongSelectMusicOS from './SongSelectMusicOS';

export default function PeopleCapabilityOS() {
  return <>
    <SongSelectMusicOS />
    <BandsOS />
    <PeopleCapabilityLegacyOS />
  </>;
}
