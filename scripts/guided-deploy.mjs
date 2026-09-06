import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const checkOnly = process.argv.includes('--check');
const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
const checks = [
  ['Node project', 'package.json'],
  ['Expo app config', 'app.json'],
  ['Mobile environment template', '.env.example'],
  ['Server environment template', '.supabase.production.env.example'],
  ['Supabase config', 'supabase/config.toml'],
  ['Migration baseline', 'supabase/migrations/20260903_000001_red_point_baseline.sql'],
  ['Production hardening migration', 'supabase/migrations/20260903_000002_production_backend.sql'],
  ['Visitor function', 'supabase/functions/submit-visitor/index.ts'],
  ['Device registration function', 'supabase/functions/register-device/index.ts'],
  ['Push function', 'supabase/functions/send-push/index.ts'],
  ['YouTube sync function', 'supabase/functions/sync-youtube-sermons/index.ts'],
  ['Deployment order', 'supabase/DEPLOYMENT_ORDER.md'],
  ['Production setup guide', 'supabase/PRODUCTION_SETUP.md'],
];
let failures = 0;
console.log(`\nRed Point Church — Guided Production Deployment v${pkg.version}`);
console.log('This tool never prints secret values. It does not deploy automatically.');
console.log('\nSTEP 0 — Project integrity');
for (const [label, rel] of checks) {
  const ok = fs.existsSync(path.join(root, rel));
  console.log(`${ok ? 'PASS' : 'FAIL'} ${label}: ${rel}`);
  if (!ok) failures++;
}
if (failures) process.exit(1);
console.log('\nSTEP 1 — Prepare local configuration');
console.log('COMPUTER: copy .env.example to .env and enter only mobile/public values.');
console.log('COMPUTER: copy .supabase.production.env.example to .supabase.production.env and enter server-only values.');
console.log('Never put SUPABASE_SERVICE_ROLE_KEY, RESEND_API_KEY, or YOUTUBE_API_KEY in Expo .env.');
console.log('\nSTEP 2 — Authenticate and link Supabase');
console.log('COMPUTER: npx supabase login');
console.log('COMPUTER: npx supabase link --project-ref YOUR_PROJECT_REF');
console.log('\nSTEP 3 — Deploy database');
console.log('COMPUTER: npx supabase db push');
console.log('\nSTEP 4 — Deploy Edge Functions');
console.log('COMPUTER: npx supabase functions deploy submit-visitor');
console.log('COMPUTER: npx supabase functions deploy register-device');
console.log('COMPUTER: npx supabase functions deploy send-push');
console.log('COMPUTER: npx supabase functions deploy sync-youtube-sermons');
console.log('\nSTEP 5 — Configure server secrets');
console.log('COMPUTER: set VISITOR_EMAIL_TO, RESEND_API_KEY, RESEND_FROM_EMAIL, and YOUTUBE_API_KEY in Supabase secrets.');
console.log('Never paste secret values into chat or commit them to Git.');
console.log('\nSTEP 6 — Bootstrap admin');
console.log('COMPUTER: create the staff user in Supabase Authentication, then insert its UUID into public.admin_users.');
console.log('\nSTEP 7 — Verify live backend');
console.log('COMPUTER: npm run check:live');
console.log('\nSTEP 8 — Verify mobile configuration');
console.log('COMPUTER: npm run check:production-config');
console.log('\nSTEP 9 — Build Android preview');
console.log('COMPUTER: npm run build:android:preview');
console.log('\nSTEP 10 — PHONE: install the APK and test Home, Events, Sermons, visitor form, notifications, admin, and recovery from airplane mode.');
console.log('\nGUIDED DEPLOYMENT GATE: project files are ready. Live deployment still requires your Supabase project and credentials.');
if (checkOnly) console.log('CHECK MODE: no deployment commands were executed.');
