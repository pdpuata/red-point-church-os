import fs from 'node:fs';

const appPath = 'App.tsx';
let app = fs.readFileSync(appPath, 'utf8');

app = app.replace(/youtube_url:\s*link && \/\(\?:youtube\\\.com\|youtu\\.be\)\/i\.test\(link\) \? link : null,/, 'youtube_url: null,');
app = app.replace(/const SERMON_RSS_CACHE_KEY = '[^']+';/, "const SERMON_RSS_CACHE_KEY = 'red-point.sermon-rss-library.v5';");

// Always route the latest sermon action to the in-app sermon detail/player.
app = app.replace(/const listenLatestSermon = \(\) => \{[\s\S]*?\};/, "const listenLatestSermon = () => { if (latestSermon) { selectSermon(latestSermon); navigate('SermonDetail'); } else navigate('Sermons'); };");

const importNeedle = "import * as ImagePicker from 'expo-image-picker';";
if (!app.includes("from 'expo-audio'")) {
  app = app.replace(importNeedle, `${importNeedle}\nimport { setAudioModeAsync, useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';`);
}

// Keep the injected component free of nested JavaScript template literals so this
// generator itself remains valid Node.js/ESM JavaScript.
const playerComponent = `
function SermonAudioPlayer({ audioUrl, title }: { audioUrl: string; title: string }) {
  const player = useAudioPlayer(audioUrl, { updateInterval: 500 });
  const status = useAudioPlayerStatus(player);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setAudioModeAsync({ playsInSilentMode: true, shouldPlayInBackground: false }).catch(() => undefined);
    return () => { try { player.pause(); } catch {} };
  }, [player]);

  const toggle = () => {
    try { setError(null); if (status.playing) player.pause(); else player.play(); }
    catch (e) { setError(e instanceof Error ? e.message : 'Could not play this sermon.'); }
  };
  const restart = () => {
    try { player.seekTo(0); player.play(); setError(null); }
    catch (e) { setError(e instanceof Error ? e.message : 'Could not restart this sermon.'); }
  };
  const duration = Number(status.duration || 0);
  const current = Number(status.currentTime || 0);
  const pct = duration > 0 ? Math.min(100, Math.max(0, (current / duration) * 100)) : 0;
  const fmt = (seconds: number) => { const s = Math.max(0, Math.floor(seconds)); return String(Math.floor(s / 60)) + ':' + String(s % 60).padStart(2, '0'); };
  return <View style={styles.card}>
    <Text style={styles.eyebrow}>RED POINT AUDIO</Text>
    <Text style={styles.cardTitle}>{title}</Text>
    <Text style={styles.cardBody}>Audio from the Red Point Church sermon feed.</Text>
    <View style={{ height: 8, backgroundColor: '#e5e5e5', borderRadius: 4, overflow: 'hidden', marginTop: 12, marginBottom: 8 }}><View style={{ width: (String(pct) + '%') as any, height: '100%', backgroundColor: '#111' }} /></View>
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 }}><Text style={styles.fieldHint}>{fmt(current)}</Text><Text style={styles.fieldHint}>{fmt(duration)}</Text></View>
    <View style={{ flexDirection: 'row', gap: 10 }}><View style={{ flex: 1 }}><Button label={status.playing ? 'PAUSE' : 'PLAY SERMON'} onPress={toggle} /></View><View style={{ flex: 1 }}><Button label="RESTART" onPress={restart} secondary /></View></View>
    {error ? <Text style={{ marginTop: 10, color: '#a00' }}>{error}</Text> : null}
  </View>;
}
`;
if (!app.includes('function SermonAudioPlayer')) app = app.replace(/function SermonDetail\(/, `${playerComponent}\nfunction SermonDetail(`);

const detailReplacement = `function SermonDetail({ sermon, navigate }: { sermon?: Sermon; navigate:(s:Screen)=>void }) {
  if (!sermon) return <ScrollView contentContainerStyle={styles.content}><SectionCard eyebrow="SERMON" title="No sermon selected" body="Return to the sermon library and choose a message." action="BACK TO SERMONS" onPress={()=>navigate('Sermons')} /></ScrollView>;
  return <ScrollView contentContainerStyle={styles.content}>
    <Pressable onPress={()=>navigate('Sermons')}><Text style={styles.eventLink}>‹ BACK TO SERMONS</Text></Pressable>
    {sermon.image_url ? <Image source={{uri: sermon.image_url}} style={styles.cardImage} /> : null}
    <Text style={styles.eyebrow}>SERMON</Text><Text style={styles.heading}>{sermon.title}</Text>
    {sermon.preached_at ? <Text style={styles.fieldHint}>{formatDate(sermon.preached_at)}</Text> : null}
    {sermon.description ? <Text style={styles.intro}>{sermon.description}</Text> : null}
    {sermon.audio_url ? <SermonAudioPlayer audioUrl={sermon.audio_url} title={sermon.title} /> : <SectionCard eyebrow="AUDIO" title="Audio unavailable" body="This sermon is listed by the Red Point Church website but no audio file was provided in its feed item." />}
    {sermon.source_url ? <Pressable onPress={()=>Linking.openURL(sermon.source_url!)}><Text style={styles.eventLink}>OPEN SERMON ON RED POINT WEBSITE ›</Text></Pressable> : null}
  </ScrollView>;
}`;

// Match the existing function regardless of its current body, up to the next top-level function/const/export.
app = app.replace(/function SermonDetail\([\s\S]*?\n}\n(?=function |const |export )/, `${detailReplacement}\n`);

app = app.replace(/\{latestSermon\?\.youtube_url\s*\?\s*<Button label="WATCH MESSAGE"[\s\S]*?:\s*<Button label="VIEW SERMON"/, '<Button label="VIEW SERMON"');

fs.writeFileSync(appPath, app);
console.log('Sermon rebuild patch applied.');
