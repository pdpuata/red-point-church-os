import fs from 'node:fs';

const appPath = 'App.tsx';
let app = fs.readFileSync(appPath, 'utf8');

// Red Point Church's website is the sole sermon source. YouTube is never used for sermon discovery or playback.
app = app.replace(
  /youtube_url:\s*link && \/\(\?:youtube\\\.com\|youtu\\\.be\)\/i\.test\(link\) \? link : null,/,
  'youtube_url: null,'
);

// Force a fresh cache namespace after the rebuild so stale sermon records cannot hide the site's audio.
app = app.replace(/const SERMON_RSS_CACHE_KEY = '[^']+';/, "const SERMON_RSS_CACHE_KEY = 'red-point.sermon-rss-library.v4';");

// Never make YouTube the fallback. The latest sermon action always opens the sermon detail/audio player.
app = app.replace(
  /const listenLatestSermon = \(\) => \{[^}]*\};/,
  "const listenLatestSermon = () => { if (latestSermon) { selectSermon(latestSermon); navigate('SermonDetail'); } else navigate('Sermons'); };"
);

// Add native/web audio playback powered by expo-audio.
const importNeedle = "import * as ImagePicker from 'expo-image-picker';";
if (!app.includes("from 'expo-audio'")) {
  app = app.replace(importNeedle, `${importNeedle}\nimport { setAudioModeAsync, useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';`);
}

const playerComponent = `
function SermonAudioPlayer({ audioUrl, title }: { audioUrl: string; title: string }) {
  const player = useAudioPlayer(audioUrl, { updateInterval: 500 });
  const status = useAudioPlayerStatus(player);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setAudioModeAsync({ playsInSilentMode: true, shouldPlayInBackground: false }).catch(() => undefined);
    return () => {
      try { player.pause(); } catch {}
    };
  }, [player]);

  const toggle = async () => {
    try {
      setError(null);
      if (status.playing) player.pause();
      else player.play();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not play this sermon.');
    }
  };

  const restart = () => {
    try { player.seekTo(0); player.play(); setError(null); }
    catch (e) { setError(e instanceof Error ? e.message : 'Could not restart this sermon.'); }
  };

  const duration = Number(status.duration || 0);
  const current = Number(status.currentTime || 0);
  const pct = duration > 0 ? Math.min(100, Math.max(0, (current / duration) * 100)) : 0;
  const fmt = (seconds: number) => {
    const s = Math.max(0, Math.floor(seconds));
    return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
  };

  return <View style={styles.card}>
    <Text style={styles.eyebrow}>RED POINT AUDIO</Text>
    <Text style={styles.cardTitle}>{title}</Text>
    <Text style={styles.cardBody}>Audio from the Red Point Church sermon feed.</Text>
    <View style={{ height: 8, backgroundColor: '#e5e5e5', borderRadius: 4, overflow: 'hidden', marginTop: 12, marginBottom: 8 }}>
      <View style={{ width: `${pct}%`, height: '100%', backgroundColor: '#111' }} />
    </View>
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 }}>
      <Text style={styles.fieldHint}>{fmt(current)}</Text>
      <Text style={styles.fieldHint}>{fmt(duration)}</Text>
    </View>
    <View style={{ flexDirection: 'row', gap: 10 }}>
      <View style={{ flex: 1 }}><Button label={status.playing ? 'PAUSE' : 'PLAY SERMON'} onPress={toggle} /></View>
      <View style={{ flex: 1 }}><Button label="RESTART" onPress={restart} secondary /></View>
    </View>
    {error ? <Text style={{ marginTop: 10, color: '#a00' }}>{error}</Text> : null}
  </View>;
}
`;

if (!app.includes('function SermonAudioPlayer')) {
  app = app.replace(/function SermonDetail\(/, `${playerComponent}\nfunction SermonDetail(`);
}

// Replace the whole sermon detail screen with a deterministic website-audio screen.
const detailReplacement = `function SermonDetail({ sermon, navigate }: { sermon?: Sermon; navigate:(s:Screen)=>void }) {
  if (!sermon) return <ScrollView contentContainerStyle={styles.content}><SectionCard eyebrow="SERMON" title="No sermon selected" body="Return to the sermon library and choose a message." action="BACK TO SERMONS" onPress={()=>navigate('Sermons')} /></ScrollView>;
  return <ScrollView contentContainerStyle={styles.content}>
    <Pressable onPress={()=>navigate('Sermons')}><Text style={styles.eventLink}>‹ BACK TO SERMONS</Text></Pressable>
    {sermon.image_url ? <Image source={{uri: sermon.image_url}} style={styles.heroImage} /> : null}
    <Text style={styles.eyebrow}>SERMON</Text>
    <Text style={styles.heading}>{sermon.title}</Text>
    {sermon.preached_at ? <Text style={styles.fieldHint}>{formatDate(sermon.preached_at)}</Text> : null}
    {sermon.description ? <Text style={styles.intro}>{sermon.description}</Text> : null}
    {sermon.audio_url ? <SermonAudioPlayer audioUrl={sermon.audio_url} title={sermon.title} /> : <SectionCard eyebrow="AUDIO" title="Audio unavailable" body="This sermon is listed by the Red Point Church website but the website did not provide an audio file in its feed." />}
    {sermon.source_url ? <Pressable onPress={()=>Linking.openURL(sermon.source_url!)}><Text style={styles.eventLink}>OPEN SERMON ON RED POINT WEBSITE ›</Text></Pressable> : null}
  </ScrollView>;
}`;

app = app.replace(/function SermonDetail\([\s\S]*?\n}\n(?=function |const |export )/, `${detailReplacement}\n`);

// Remove any remaining YouTube-specific sermon CTA logic while retaining YouTube only as a general church property if other app features need it.
app = app.replace(/\{latestSermon\?\.youtube_url\s*\?\s*<Button label="WATCH MESSAGE"[\s\S]*?:\s*<Button label="VIEW SERMON"/,
  '<Button label="VIEW SERMON"');

fs.writeFileSync(appPath, app);
console.log('Sermon rebuild patch applied.');
