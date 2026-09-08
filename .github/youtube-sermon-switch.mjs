import fs from 'node:fs';

const path = 'App.tsx';
let app = fs.readFileSync(path, 'utf8');

app = app.replace("import { setAudioModeAsync, useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';\n", '');

app = app.replace(/function SermonAudioPlayer\([\s\S]*?\n}\n\nfunction SermonDetail/, `function youtubeSearchUrl(title) {
  return 'https://www.youtube.com/results?search_query=' + encodeURIComponent(title + ' Red Point Church');
}

function SermonDetail`);

app = app.replace(/function SermonDetail\([\s\S]*?\n}\nfunction Announcements/, `function SermonDetail({ sermon, navigate }: { sermon?: Sermon; navigate:(s:Screen)=>void }) {
  if (!sermon) return <ScrollView contentContainerStyle={styles.content}><SectionCard eyebrow="SERMON" title="No sermon selected" body="Return to the sermon library and choose a message." action="BACK TO SERMONS" onPress={()=>navigate('Sermons')} /></ScrollView>;
  const youtubeUrl = youtubeSearchUrl(sermon.title);
  return <ScrollView contentContainerStyle={styles.content}>
    <Pressable onPress={()=>navigate('Sermons')}><Text style={styles.eventLink}>‹ BACK TO SERMONS</Text></Pressable>
    {sermon.image_url ? <Image source={{uri: sermon.image_url}} style={{ width: '100%', height: 220, borderRadius: 16, marginBottom: 16 }} /> : null}
    <Text style={styles.eyebrow}>SERMON</Text><Text style={styles.heading}>{sermon.title}</Text>
    {sermon.preached_at ? <Text style={styles.fieldHint}>{formatDate(sermon.preached_at)}</Text> : null}
    {sermon.description ? <Text style={styles.intro}>{sermon.description}</Text> : null}
    <SectionCard eyebrow="VIDEO" title="Watch this sermon on YouTube" body="Red Point sermons are currently sourced from the church's YouTube channel." action="WATCH ON YOUTUBE" onPress={()=>Linking.openURL(youtubeUrl)} />
    {sermon.source_url ? <Pressable onPress={()=>Linking.openURL(sermon.source_url!)}><Text style={styles.eventLink}>OPEN SERMON ON RED POINT WEBSITE ›</Text></Pressable> : null}
  </ScrollView>;
}
function Announcements`);

// Make the YouTube channel the primary sermon destination from the home screen.
app = app.replace(/const listenLatestSermon = \(\) => \{[\s\S]*?\};/, "const listenLatestSermon = () => { if (latestSermon) { selectSermon(latestSermon); navigate('SermonDetail'); } else navigate('Sermons'); };");

fs.writeFileSync(path, app);
console.log('Switched sermon viewing to YouTube.');
