import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const file = path.join(root, '.supabase.production.env');
const example = path.join(root, '.supabase.production.env.example');
const required = ['SUPABASE_PROJECT_REF','VISITOR_EMAIL_TO','RESEND_API_KEY','RESEND_FROM_EMAIL','YOUTUBE_API_KEY'];
const placeholder = /YOUR_|your-domain\.example|example\.com/i;
function readEnv(p){
  if(!fs.existsSync(p)) return {};
  return Object.fromEntries(fs.readFileSync(p,'utf8').split(/\r?\n/).map(x=>x.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)).filter(Boolean).map(m=>[m[1],m[2].replace(/^['"]|['"]$/g,'')]));
}
const checks=[];
const ex=readEnv(example);
checks.push(['server example contains required keys', required.every(k=>Object.hasOwn(ex,k)), required.filter(k=>!Object.hasOwn(ex,k)).join(', ')||'all present']);
checks.push(['server secrets file is git-ignored', fs.existsSync(path.join(root,'.gitignore')) && fs.readFileSync(path.join(root,'.gitignore'),'utf8').split(/\r?\n/).includes('.supabase.production.env'), 'server secrets must stay local']);
if(!fs.existsSync(file)) checks.push(['server secrets configured', false, '.supabase.production.env not found']);
else {
  const env=readEnv(file); const bad=required.filter(k=>!env[k]||placeholder.test(env[k]));
  checks.push(['server secrets configured', bad.length===0, bad.length?`missing/placeholders: ${bad.join(', ')}`:'all required server values look configured']);
}
let failed=false; console.log('Red Point Church server backend configuration check');
for(const [n,ok,d] of checks){console.log(`${ok?'PASS':'FAIL'} - ${n} - ${d}`);if(!ok)failed=true}
process.exit(failed?1:0);
