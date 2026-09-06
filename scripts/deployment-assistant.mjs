import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const root = process.cwd();
const pkg = JSON.parse(fs.readFileSync(path.join(root,'package.json'),'utf8'));
const envExample = path.join(root,'.env.example');
const envFile = path.join(root,'.env');
const required = [
  'EXPO_PUBLIC_SUPABASE_URL',
  'EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY',
  'EXPO_PUBLIC_VISITOR_FUNCTION_URL',
  'EXPO_PUBLIC_REGISTER_DEVICE_FUNCTION_URL',
  'EXPO_PUBLIC_SEND_PUSH_FUNCTION_URL',
  'EXPO_PUBLIC_SYNC_YOUTUBE_FUNCTION_URL',
  'EXPO_PUBLIC_EAS_PROJECT_ID'
];
function readEnv(file){
  if(!fs.existsSync(file)) return {};
  return Object.fromEntries(fs.readFileSync(file,'utf8').split(/\r?\n/).map(x=>x.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)).filter(Boolean).map(m=>[m[1],m[2].replace(/^['"]|['"]$/g,'')]));
}
function run(label, command, args){
  console.log(`\n▶ ${label}`); console.log(`  ${command} ${args.join(' ')}`);
  const r=spawnSync(command,args,{cwd:root,stdio:'inherit',shell:true});
  if(r.status!==0) process.exit(r.status ?? 1);
}
console.log(`\nRed Point Church — Production Deployment Assistant v${pkg.version}`);
console.log('This assistant never prints secret values.');
console.log('\nSTEP 1 — local configuration');
if(!fs.existsSync(envFile)){
  console.log('FAIL: .env does not exist.');
  console.log('Create it from .env.example and enter the real production values.');
  process.exit(1);
}
const env=readEnv(envFile); const bad=required.filter(k=>!env[k]||/YOUR_|example\.com|your_project/i.test(env[k]));
if(bad.length){ console.log(`FAIL: ${bad.length} production values are missing or placeholders.`); bad.forEach(k=>console.log(`  - ${k}`)); process.exit(1); }
console.log('PASS: required production configuration is present.');
console.log('\nSTEP 2 — project verification');
run('Preflight','npm',['run','preflight']);
run('Release check','npm',['run','release-check']);
run('Production config check','npm',['run','check:production-config']);
console.log('\nSTEP 3 — choose your build');
const target=process.argv[2] || 'android-preview';
const targets={
 'android-preview':['Android preview APK','npx',['eas','build','--platform','android','--profile','preview']],
 'android-production':['Android production','npx',['eas','build','--platform','android','--profile','production']],
 'ios-production':['iOS production / TestFlight path','npx',['eas','build','--platform','ios','--profile','production']],
};
if(!targets[target]){console.error(`Unknown target: ${target}. Use android-preview, android-production, or ios-production.`);process.exit(1);}
const [label,cmd,args]=targets[target];
console.log(`Selected: ${label}`);
console.log('EAS may prompt for Apple/Google credentials and project linking.');
run(label,cmd,args);
console.log('\nDONE — EAS completed the requested build.');
