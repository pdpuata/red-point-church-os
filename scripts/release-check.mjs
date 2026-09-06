import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const required = ['App.tsx','package.json','app.json','eas.json','.env.example','lib/supabase.ts','supabase/schema.sql','STORE_LISTING.md','PRIVACY_POLICY_DRAFT.md','STORE_SUBMISSION_CHECKLIST.md'];
const missing = required.filter(f => !fs.existsSync(path.join(root,f)));
const pkg = JSON.parse(fs.readFileSync(path.join(root,'package.json'),'utf8'));
const app = JSON.parse(fs.readFileSync(path.join(root,'app.json'),'utf8'));
const source = fs.readFileSync(path.join(root,'App.tsx'),'utf8');
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
