import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const requiredMigrations = [
  'supabase/schema.sql',
  'supabase/v2.6_media_upload.sql',
  'supabase/v3.2_ministries.sql',
  'supabase/v3.4_communication.sql',
  'supabase/v3.9_content_health.sql',
  'supabase/v4.0_production_readiness.sql',
  'supabase/v4.1_qa_ux.sql',
  'supabase/v4.7_sermon_library.sql',
  'supabase/v4.8_leadership.sql',
  'supabase/v4.9_contact.sql',
  'supabase/v6.2_security_hardening.sql',
  'supabase/migrations/20260903_000002_production_backend.sql'
];
const functions = ['register-device','send-push','submit-visitor','sync-youtube-sermons'];
let failures = 0;
for (const f of requiredMigrations) {
  if (!fs.existsSync(path.join(root, f))) { console.error(`FAIL missing migration: ${f}`); failures++; }
  else console.log(`PASS migration: ${f}`);
}
for (const fn of functions) {
  const f = `supabase/functions/${fn}/index.ts`;
  if (!fs.existsSync(path.join(root, f))) { console.error(`FAIL missing Edge Function: ${f}`); failures++; }
  else console.log(`PASS Edge Function: ${f}`);
}
for (const f of ['supabase/DEPLOYMENT_ORDER.md','V7.1.md','.env.example']) {
  if (!fs.existsSync(path.join(root, f))) { console.error(`FAIL missing deployment file: ${f}`); failures++; }
  else console.log(`PASS deployment file: ${f}`);
}
if (failures) process.exit(1);
console.log(`\nBackend structure check passed: ${requiredMigrations.length} migrations, ${functions.length} Edge Functions.`);
console.log('This check validates project files only; it does not connect to Supabase or deploy anything.');
