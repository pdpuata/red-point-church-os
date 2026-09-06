import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const root = process.cwd();
const requiredMobile = [
  'EXPO_PUBLIC_SUPABASE_URL',
  'EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY',
  'EXPO_PUBLIC_VISITOR_FUNCTION_URL',
  'EXPO_PUBLIC_REGISTER_DEVICE_FUNCTION_URL',
  'EXPO_PUBLIC_SEND_PUSH_FUNCTION_URL',
  'EXPO_PUBLIC_SYNC_YOUTUBE_FUNCTION_URL',
  'EXPO_PUBLIC_EAS_PROJECT_ID',
];
const requiredServer = [
  'SUPABASE_PROJECT_REF',
  'VISITOR_EMAIL_TO',
  'RESEND_API_KEY',
  'RESEND_FROM_EMAIL',
  'YOUTUBE_API_KEY',
];
function readEnv(file){
  return Object.fromEntries(fs.readFileSync(file,'utf8').split(/\r?\n/).map(x=>x.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)).filter(Boolean).map(m=>[m[1],m[2].replace(/^['"]|['"]$/g,'')]));
}
function placeholders(v){ return !v || /YOUR_|your-domain\.example|example\.com/i.test(v); }
console.log('Red Point Church — V7.2 Production Setup Assistant');
console.log('This assistant never prints secret values.');
console.log('\n1. Local files');
for (const f of ['.env.example','.supabase.production.env.example','supabase/DEPLOYMENT_ORDER.md','supabase/functions/register-device/index.ts','supabase/functions/send-push/index.ts','supabase/functions/submit-visitor/index.ts','supabase/functions/sync-youtube-sermons/index.ts']) {
  console.log(`${fs.existsSync(path.join(root,f)) ? 'PASS' : 'FAIL'} ${f}`);
}
console.log('\n2. Mobile environment');
const envFile=path.join(root,'.env');
if (!fs.existsSync(envFile)) console.log('NOT READY .env is missing. Copy .env.example to .env and fill the real mobile values.');
else {
 const env=readEnv(envFile); const missing=requiredMobile.filter(k=>placeholders(env[k]));
 console.log(missing.length ? `NOT READY missing/placeholders: ${missing.join(', ')}` : 'PASS mobile .env is populated');
}
console.log('\n3. Server environment');
const serverFile=path.join(root,'.supabase.production.env');
if (!fs.existsSync(serverFile)) console.log('NOT READY .supabase.production.env is missing. Copy the example and fill server-only values.');
else {
 const env=readEnv(serverFile); const missing=requiredServer.filter(k=>placeholders(env[k]));
 console.log(missing.length ? `NOT READY missing/placeholders: ${missing.join(', ')}` : 'PASS server environment is populated');
}
console.log('\n4. Supabase CLI');
const cli=spawnSync('npx',['supabase','--version'],{cwd:root,stdio:'pipe',shell:true,encoding:'utf8'});
if(cli.status===0) console.log(`PASS Supabase CLI available: ${cli.stdout.trim()}`); else console.log('NOT READY Supabase CLI is not available yet. Run: npx supabase --version');
console.log('\n5. Deployment order');
console.log('Run `npm run deploy:backend` only after both environment files are populated and reviewed.');
console.log('Then run `npm run check:live` and test the app on a real iPhone and Android device.');
