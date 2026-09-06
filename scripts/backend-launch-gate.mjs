import fs from 'node:fs';
import path from 'node:path';
const root = process.cwd();
const required = [
  'supabase/config.toml',
  'supabase/migrations/20260903_000001_red_point_baseline.sql',
  'supabase/migrations/20260903_000002_production_backend.sql',
  'supabase/functions/register-device/index.ts',
  'supabase/functions/submit-visitor/index.ts',
  'supabase/functions/send-push/index.ts',
  'supabase/functions/sync-youtube-sermons/index.ts',
  'supabase/functions/_shared/cors.ts',
  'supabase/functions/_shared/supabase.ts',
  'V7.3.md',
];
let failures=0;
for (const file of required) {
  if (fs.existsSync(path.join(root,file))) console.log(`PASS ${file}`);
  else { console.error(`FAIL ${file}`); failures++; }
}
const config=fs.readFileSync(path.join(root,'supabase/config.toml'),'utf8');
for (const fn of ['register-device','submit-visitor','send-push','sync-youtube-sermons']) {
  if (!config.includes(`[functions.${fn}]`)) { console.error(`FAIL config missing ${fn}`); failures++; }
}
if (failures) process.exit(1);
console.log('\nBackend launch gate passed. Credentials and live deployment are intentionally not tested here.');
