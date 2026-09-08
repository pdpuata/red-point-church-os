import fs from 'node:fs/promises';

const RSS_URL = 'https://www.redpointchurch.com/pinetown-podcast-feed?format=rss';
const SUPABASE_URL = process.env.SUPABASE_E2E_URL || 'https://gvyqluwtzujefernhvfd.supabase.co';
const PROXY_URL = `${SUPABASE_URL.replace(/\/$/, '')}/functions/v1/sermon-rss`;
const APP_FILE = new URL('../App.tsx', import.meta.url);

function fail(message) { throw new Error(message); }

function decodeXml(value) {
  return value.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/<[^>]+>/g, '').trim();
}

function tag(xml, name) {
  const match = xml.match(new RegExp(`<${name}[^>]*>([\\s\\S]*?)</${name}>`, 'i'));
  return match ? decodeXml(match[1]) : '';
}

function attr(xml, name) {
  const match = xml.match(new RegExp(`${name}=["']([^"']+)["']`, 'i'));
  return match ? decodeXml(match[1]) : '';
}

function parseItems(xml) {
  return (xml.match(/<item[\s\S]*?<\/item>/gi) || []).map((item, index) => {
    const enclosure = item.match(/<enclosure[^>]*>/i)?.[0] || '';
    const media = item.match(/<media:content[^>]*>/i)?.[0] || '';
    const link = tag(item, 'link') || tag(item, 'guid');
    const guid = tag(item, 'guid') || link || `rss-${index}`;
    const published = tag(item, 'pubDate');
    const date = published && !Number.isNaN(Date.parse(published)) ? new Date(published) : null;
    return { title: tag(item, 'title'), guid, link, published, date, audio: attr(enclosure, 'url') || attr(media, 'url') };
  }).filter(item => item.title);
}

function checkAudioUrl(url, label) {
  if (!url) fail(`${label}: latest sermon has no audio URL`);
  const parsed = new URL(url);
  if (!['http:', 'https:'].includes(parsed.protocol)) fail(`${label}: audio URL is not HTTP(S)`);
}

async function requestRange(url, label) {
  const response = await fetch(url, { headers: { Range: 'bytes=0-1023' }, redirect: 'follow' });
  if (![200, 206].includes(response.status)) fail(`${label}: audio range request returned HTTP ${response.status}`);
  const type = response.headers.get('content-type') || '';
  if (!type.toLowerCase().startsWith('audio/') && !/octet-stream/i.test(type)) fail(`${label}: audio response has unexpected Content-Type ${type || '(missing)'}`);
  return { status: response.status, type, contentRange: response.headers.get('content-range') || '' };
}

async function main() {
  console.log('SERMON SYSTEM PREFLIGHT');
  console.log(`Source RSS: ${RSS_URL}`);
  console.log(`Supabase proxy: ${PROXY_URL}`);

  const sourceResponse = await fetch(RSS_URL, { headers: { Accept: 'application/rss+xml, application/xml, text/xml' }, redirect: 'follow' });
  if (!sourceResponse.ok) fail(`Red Point RSS returned HTTP ${sourceResponse.status}`);
  const sourceXml = await sourceResponse.text();
  if (!/<rss/i.test(sourceXml) && !/<feed/i.test(sourceXml)) fail('Red Point RSS response is not RSS/XML');

  const sourceItems = parseItems(sourceXml).sort((a, b) => (b.date?.getTime() || 0) - (a.date?.getTime() || 0));
  if (!sourceItems.length) fail('Red Point RSS contains no sermon items');
  const latest = sourceItems[0];
  checkAudioUrl(latest.audio, 'Red Point RSS');

  console.log(`✓ Red Point RSS reachable (${sourceItems.length} items)`);
  console.log(`✓ Latest: ${latest.title}`);
  console.log(`✓ Latest GUID: ${latest.guid}`);
  console.log(`✓ Latest date: ${latest.published || '(no pubDate)'}`);
  console.log(`✓ Direct audio URL: ${latest.audio}`);

  const directAudio = await requestRange(latest.audio, 'Red Point direct audio');
  console.log(`✓ Direct audio playable: HTTP ${directAudio.status}, ${directAudio.type}`);

  const proxyResponse = await fetch(PROXY_URL, { method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, body: '{}', redirect: 'follow' });
  if (!proxyResponse.ok) fail(`Supabase sermon-rss proxy returned HTTP ${proxyResponse.status}`);
  const proxyBody = await proxyResponse.json();
  if (!proxyBody || proxyBody.ok !== true || typeof proxyBody.xml !== 'string') fail('Supabase sermon-rss proxy did not return { ok: true, xml }');

  const proxyItems = parseItems(proxyBody.xml).sort((a, b) => (b.date?.getTime() || 0) - (a.date?.getTime() || 0));
  if (!proxyItems.length) fail('Supabase sermon-rss proxy returned no sermon items');
  const proxyLatest = proxyItems.find(item => item.guid === latest.guid) || proxyItems[0];
  if (proxyLatest.guid !== latest.guid) fail(`Proxy latest GUID mismatch: source=${latest.guid} proxy=${proxyLatest.guid}`);
  if (proxyLatest.title !== latest.title) fail(`Proxy latest title mismatch: source=${latest.title} proxy=${proxyLatest.title}`);
  checkAudioUrl(proxyLatest.audio, 'Supabase proxy RSS');

  const proxyAudioUrl = new URL(proxyLatest.audio);
  const proxyBase = new URL(PROXY_URL);
  if (proxyAudioUrl.origin !== proxyBase.origin || proxyAudioUrl.pathname !== proxyBase.pathname) fail(`Latest proxy audio is not routed through sermon-rss: ${proxyLatest.audio}`);

  console.log(`✓ Supabase proxy reachable (${proxyItems.length} visible items)`);
  console.log('✓ Proxy latest matches Red Point RSS');
  console.log(`✓ Proxy audio URL: ${proxyLatest.audio}`);

  const proxiedAudio = await requestRange(proxyLatest.audio, 'Supabase proxied audio');
  console.log(`✓ Proxied audio playable: HTTP ${proxiedAudio.status}, ${proxiedAudio.type}`);

  const appSource = await fs.readFile(APP_FILE, 'utf8');
  const requiredAppContracts = [
    ['authoritative RSS URL', RSS_URL],
    ['web sermon-rss proxy URL', 'const proxyUrl ='],
    ['web sermon-rss POST', "method: 'POST'"],
    ['RSS audio extraction', 'const audio ='],
    ['web HTML audio player', "React.createElement('audio'"],
    ['audio-first latest CTA', 'LISTEN TO SERMON'],
    ['Home listen button', 'LISTEN TO SERMON'],
  ];
  for (const [label, needle] of requiredAppContracts) if (!appSource.includes(needle)) fail(`App contract missing: ${label}`);
  if (/youtube_url:\s*link\s*,\s*published:\s*true/.test(appSource)) fail('App parser still treats every RSS link as a YouTube URL');
  console.log('✓ App source contracts present');

  console.log('');
  console.log('PASS: Red Point RSS → Supabase proxy → audio proxy → app contract');
  console.log(`Latest sermon verified: ${latest.title}`);
}

main().catch((error) => {
  console.error('');
  console.error(`FAIL: ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
});