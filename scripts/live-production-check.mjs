import fs from 'node:fs';

const root = process.cwd();
const envPath = process.env.PRODUCTION_ENV_FILE || '.env';

function readEnv(file) {
  if (!fs.existsSync(file)) return {};
  return Object.fromEntries(
    fs.readFileSync(file, 'utf8')
      .split(/\r?\n/)
      .map(line => line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/))
      .filter(Boolean)
      .map(m => [m[1], m[2].replace(/^['"]|['"]$/g, '')])
  );
}

const env = { ...readEnv(envPath), ...process.env };
const required = [
  'EXPO_PUBLIC_SUPABASE_URL',
  'EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY',
  'EXPO_PUBLIC_VISITOR_FUNCTION_URL',
  'EXPO_PUBLIC_REGISTER_DEVICE_FUNCTION_URL',
  'EXPO_PUBLIC_SEND_PUSH_FUNCTION_URL',
  'EXPO_PUBLIC_SYNC_YOUTUBE_FUNCTION_URL',
];

const missing = required.filter(k => !env[k] || /YOUR_|example\.com|placeholder/i.test(env[k]));
if (missing.length) {
  console.error(`FAIL: missing or placeholder production values: ${missing.join(', ')}`);
  process.exit(1);
}

const checks = [];
async function check(label, url, options = {}, accepted = [200, 204, 400, 401, 403, 405]) {
  try {
    const response = await fetch(url, { ...options, redirect: 'manual' });
    const ok = accepted.includes(response.status);
    checks.push({ label, ok, detail: `HTTP ${response.status}` });
  } catch (error) {
    checks.push({ label, ok: false, detail: error?.message || 'network error' });
  }
}

const supabase = env.EXPO_PUBLIC_SUPABASE_URL.replace(/\/$/, '');
const key = env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const headers = { apikey: key, Authorization: `Bearer ${key}` };

console.log('Red Point Church — V7.1 Live Production Check');
console.log(`Environment file: ${envPath}`);
console.log('Secret values are never printed.');

await check('Supabase API reachable', `${supabase}/rest/v1/`, { headers }, [200, 404]);
await check('Published events endpoint', `${supabase}/rest/v1/events?select=id&published=eq.true&limit=1`, { headers }, [200]);
await check('Published announcements endpoint', `${supabase}/rest/v1/announcements?select=id&published=eq.true&limit=1`, { headers }, [200]);
await check('Published sermons endpoint', `${supabase}/rest/v1/sermons?select=id&published=eq.true&limit=1`, { headers }, [200]);
await check('Published leaders endpoint', `${supabase}/rest/v1/leaders?select=id&published=eq.true&limit=1`, { headers }, [200]);

for (const [name, url] of [
  ['Visitor function reachable', env.EXPO_PUBLIC_VISITOR_FUNCTION_URL],
  ['Device registration function reachable', env.EXPO_PUBLIC_REGISTER_DEVICE_FUNCTION_URL],
  ['Push function reachable', env.EXPO_PUBLIC_SEND_PUSH_FUNCTION_URL],
  ['YouTube sync function reachable', env.EXPO_PUBLIC_SYNC_YOUTUBE_FUNCTION_URL],
]) {
  await check(name, url, { method: 'OPTIONS' }, [200, 204, 400, 401, 403, 405]);
}

let failures = 0;
for (const result of checks) {
  console.log(`${result.ok ? 'PASS' : 'FAIL'}  ${result.label} — ${result.detail}`);
  if (!result.ok) failures++;
}

console.log(`\n${checks.length - failures}/${checks.length} live checks passed.`);
if (failures) {
  console.error('Live production verification failed. Fix the failed endpoint(s) before building the store candidate.');
  process.exit(1);
}
console.log('Live production endpoints are reachable. Continue with real visitor, media, YouTube, notification and device tests.');
