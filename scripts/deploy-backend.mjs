import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
const root=process.cwd();
const envFile=path.join(root,'.supabase.production.env');
function readEnv(p){return Object.fromEntries(fs.readFileSync(p,'utf8').split(/\r?\n/).map(x=>x.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)).filter(Boolean).map(m=>[m[1],m[2].replace(/^['"]|['"]$/g,'')]));}
function run(label,args,env={}){console.log(`\n▶ ${label}`);const r=spawnSync('npx',['supabase',...args],{cwd:root,stdio:'inherit',shell:true,env:{...process.env,...env}});if(r.status!==0)process.exit(r.status??1);}
if(!fs.existsSync(envFile)){console.error('FAIL: .supabase.production.env is missing. Copy the example and fill real server values.');process.exit(1);}
const e=readEnv(envFile);const required=['SUPABASE_PROJECT_REF','VISITOR_EMAIL_TO','RESEND_API_KEY','RESEND_FROM_EMAIL','YOUTUBE_API_KEY'];const bad=required.filter(k=>!e[k]||/YOUR_|your-domain\.example|example\.com/i.test(e[k]));if(bad.length){console.error(`FAIL: missing/placeholders: ${bad.join(', ')}`);process.exit(1);}
run('Link Supabase project',['link','--project-ref',e.SUPABASE_PROJECT_REF]);
run('Apply production database migrations',['db','push']);
run('Deploy all Edge Functions',['functions','deploy','--project-ref',e.SUPABASE_PROJECT_REF]);
run('Set server secrets',['secrets','set',`VISITOR_EMAIL_TO=${e.VISITOR_EMAIL_TO}`,`RESEND_API_KEY=${e.RESEND_API_KEY}`,`RESEND_FROM_EMAIL=${e.RESEND_FROM_EMAIL}`,`YOUTUBE_API_KEY=${e.YOUTUBE_API_KEY}`,'--project-ref',e.SUPABASE_PROJECT_REF]);
console.log('\nDONE — backend deployment completed.');
