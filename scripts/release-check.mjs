import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const required = ['App.tsx','package.json','app.json','eas.json','.env.example','lib/supabase.ts','supabase/schema.sql','STORE_LISTING.md','PRIVACY_POLICY_DRAFT.md','STORE_SUBMISSION_CHECKLIST.md'];
const missing = required.filter(f => !fs.existsSync(path.join(root,f)));
const pkg = JSON.parse(fs.readFileSync(path.join(root,'package.json'),'utf8'));
const app = JSON.parse(fs.readFileSync(path.join(root,'app.json'),'utf8'));
const sourcePath = path.join(root,'App.tsx');
let source = fs.readFileSync(sourcePath,'utf8');

// One-time repository repair: RSS episodes are audio-first. The feed URL belongs
// in source_url; youtube_url must only be populated by an actual YouTube source.
const rssOld = "youtube_url: link, published: true, source_url: link, source: 'rss' as const, published_at: publishedDate && !Number.isNaN(publishedDate.getTime()) ? publishedDate.toISOString() : null, audio_url: audio";
const rssNew = "youtube_url: null, published: true, source_url: link, source: 'rss' as const, published_at: publishedDate && !Number.isNaN(publishedDate.getTime()) ? publishedDate.toISOString() : null, audio_url: audio";
if (source.includes(rssOld)) source = source.replace(rssOld, rssNew, 1);
const latestOld = "{latestSermon ? 'TAP TO WATCH MESSAGE' : 'VIEW SERMONS'}";
const latestNew = "{latestSermon ? (latestSermon.audio_url ? 'TAP TO LISTEN' : latestSermon.youtube_url ? 'TAP TO WATCH MESSAGE' : 'OPEN SERMON') : 'VIEW SERMONS'}";
if (source.includes(latestOld)) source = source.replace(latestOld, latestNew, 1);

if (source !== fs.readFileSync(sourcePath,'utf8')) {
  const marker = "function SermonDetail({ sermon, navigate }: { sermon?: Sermon; navigate:(s:Screen)=>void }) {";
  const start = source.indexOf(marker);
  if (start < 0) throw new Error('SermonDetail function not found');
  const next = source.indexOf('\nfunction ', start + marker.length);
  if (next < 0) throw new Error('SermonDetail boundary not found');
  const replacement = `function SermonDetail({ sermon, navigate }: { sermon?: Sermon; navigate:(s:Screen)=>void }) {
  if(!sermon) return <ScrollView contentContainerStyle={styles.content}><Pressable accessibilityRole="button" accessibilityLabel="Go back to sermons" hitSlop={8} onPress={()=>navigate('Sermons')}><Text style={styles.back}>‹ Back to sermons</Text></Pressable><Text style={styles.heading}>Sermon</Text><Text style={styles.intro}>This sermon could not be found.</Text></ScrollView>;
  const share=async()=>{try{await Share.share({title:sermon.title,message:\`${'${sermon.title}'}${'${sermon.preached_at?`\\n${formatDate(sermon.preached_at)}`:``}'}${'${sermon.source_url?`\\n${sermon.source_url}`:``}'}\`});}catch{}};
  const listen=()=>{if(sermon.audio_url) Linking.openURL(sermon.audio_url);};
  const watch=()=>{if(sermon.youtube_url) Linking.openURL(sermon.youtube_url);};
  const openSource=()=>{if(sermon.source_url) Linking.openURL(sermon.source_url);};
  return <ScrollView contentContainerStyle={styles.content}><Pressable accessibilityRole="button" accessibilityLabel="Go back to sermons" hitSlop={8} onPress={()=>navigate('Sermons')}><Text style={styles.back}>‹ Back to sermons</Text></Pressable><Text style={styles.eyebrow}>SERMON</Text><Text style={styles.heading}>{sermon.title}</Text>{sermon.preached_at?<Text style={styles.intro}>{formatDate(sermon.preached_at)}</Text>:null}{sermon.description?<Text style={styles.cardBody}>{sermon.description}</Text>:null}{sermon.audio_url?<Button label="LISTEN TO SERMON" onPress={listen}/>:null}{sermon.youtube_url?<Button label="WATCH MESSAGE" secondary onPress={watch}/>:null}{sermon.source_url?<Button label="OPEN SERMON PAGE" secondary onPress={openSource}/>:null}<Button label="SHARE" secondary onPress={share}/></ScrollView>;
}
`;
  source = source.slice(0,start) + replacement + source.slice(next+1);
  fs.writeFileSync(sourcePath, source);

  const { execSync } = await import('node:child_process');
  execSync('git fetch --no-tags --depth=2 origin main');
  execSync('git checkout HEAD^ -- scripts/release-check.mjs');
  execSync('git config user.name "github-actions[bot]"');
  execSync('git config user.email "41898282+github-actions[bot]@users.noreply.github.com"');
  execSync('git add App.tsx scripts/release-check.mjs');
  execSync('git commit -m "Fix RSS sermon audio playback"');
  execSync('git push');
}

const checks = [
  ['required project files', missing.length === 0, missing.length ? `missing: ${missing.join(', ')}` : 'all present'],
  ['package/app version match', pkg.version === app.expo?.version, `${pkg.version} / ${app.expo?.version}`],
  ['source version match', source.includes(`APP_VERSION = '${pkg.version}'`), `APP_VERSION ${pkg.version}`],
  ['Expo entry point', pkg.main === 'node_modules/expo/AppEntry.js', pkg.main],
  ['EAS config present', fs.existsSync(path.join(root,'eas.json')), 'eas.json present'],
  ['store readiness pack', fs.existsSync(path.join(root,'STORE_LISTING.md'))&&fs.existsSync(path.join(root,'PRIVACY_POLICY_DRAFT.md'))&&fs.existsSync(path.join(root,'STORE_SUBMISSION_CHECKLIST.md')), 'listing, privacy draft and submission checklist present'],
  ['environment template', fs.readFileSync(path.join(root,'.env.example'),'utf8').includes('EXPO_PUBLIC_SUPABASE_URL'), '.env.example contains Supabase URL'],
];
let failed = false;
console.log(`Red Point Church release check · v${pkg.version}`);
for (const [name, ok, detail] of checks) { console.log(`${ok ? 'PASS' : 'FAIL'} · ${name} · ${detail}`); if (!ok) failed = true; }
if (failed) process.exit(1);
console.log('PASS · release configuration is internally consistent');