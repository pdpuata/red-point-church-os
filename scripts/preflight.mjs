import fs from 'node:fs';
import path from 'node:path';
const root=process.cwd();
const required=['App.tsx','package.json','app.json','eas.json','.env.example','lib/supabase.ts','supabase/schema.sql','supabase/v6.2_security_hardening.sql','supabase/functions/send-push/index.ts','supabase/functions/register-device/index.ts','supabase/functions/submit-visitor/index.ts'];
const missing=required.filter(f=>!fs.existsSync(path.join(root,f)));
const source=fs.readFileSync(path.join(root,'App.tsx'),'utf8');
const pkg=JSON.parse(fs.readFileSync(path.join(root,'package.json'),'utf8'));
const app=JSON.parse(fs.readFileSync(path.join(root,'app.json'),'utf8'));
const checks=[
 ['required production files',!missing.length,missing.length?`missing: ${missing.join(', ')}`:'all present'],
 ['version consistency',pkg.version===app.expo?.version&&source.includes(`APP_VERSION = '${pkg.version}'`),`${pkg.version} / ${app.expo?.version}`],
 ['no prayer-request feature',!(/REQUEST PRAYER|PRAYER REQUEST/i.test(source)), 'no prayer-request UI text detected'],
 ['native package alignment',pkg.main==='node_modules/expo/AppEntry.js'&&pkg.dependencies?.expo&&pkg.dependencies?.['react-native'],'Expo entry point and native dependencies present'],
 ['security hardening',fs.existsSync(path.join(root,'V6.2.md'))&&fs.existsSync(path.join(root,'supabase/v6.2_security_hardening.sql')),'security/privacy hardening present'],
 ['store readiness pack',fs.existsSync(path.join(root,'STORE_LISTING.md'))&&fs.existsSync(path.join(root,'PRIVACY_POLICY_DRAFT.md'))&&fs.existsSync(path.join(root,'STORE_SUBMISSION_CHECKLIST.md')),'store listing, privacy draft and submission checklist present'],
 ['release metadata',fs.existsSync(path.join(root,'RELEASE.md'))&&fs.existsSync(path.join(root,'BUILD.md')),'release and build guides present'],
];
let failed=false; console.log(`Red Point Church preflight - v${pkg.version}`);
for(const [n,ok,d] of checks){console.log(`${ok?'PASS':'FAIL'} - ${n} - ${d}`);if(!ok)failed=true}
process.exit(failed?1:0);
