#!/usr/bin/env node
/** Deterministic source/RLS contract verifier for Admin workflows. */
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const artifacts = path.join(root, 'artifacts');
fs.mkdirSync(artifacts, { recursive: true });

const readIfExists = (file) => fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : '';
const app = readIfExists(path.join(root, 'App.tsx'));
const schema = readIfExists(path.join(root, 'supabase/schema.sql'));
const migrationsDir = path.join(root, 'supabase/migrations');
const migrations = fs.existsSync(migrationsDir)
  ? fs.readdirSync(migrationsDir)
      .filter(x => x.endsWith('.sql'))
      .map(x => readIfExists(path.join(migrationsDir, x)))
      .join('\n')
  : '';
const database = `${schema}\n${migrations}`;

const actions = [
  ...[['create','insert'],['read','select'],['edit','update'],['publish','update({published:true})'],['unpublish','update({published:false})'],['delete','delete']].map(([key,op])=>({surface:'Events',table:'events',action:key,handler:key==='create'||key==='edit'?'saveEvent':key==='publish'||key==='unpublish'?'toggleEvent':key==='delete'?'remove':'refresh',operation:op,policy:'admins manage events',verify:key==='publish'||key==='unpublish'?'public read/RLS visibility':'read-after-mutation'})),
  ...[['create','insert'],['read','select'],['edit','update'],['publish','update({published:true})'],['unpublish','update({published:false})'],['delete','delete']].map(([key,op])=>({surface:'Announcements',table:'announcements',action:key,handler:key==='create'||key==='edit'?'saveAnnouncement':key==='publish'||key==='unpublish'?'toggleAnnouncement':key==='delete'?'remove':'refresh',operation:op,policy:'admins manage announcements',verify:key==='publish'||key==='unpublish'?'public read/RLS visibility':'read-after-mutation'})),
  ...[['create','insert'],['read','select'],['edit','update'],['publish','update({published:true})'],['unpublish','update({published:false})'],['delete','delete']].map(([key,op])=>({surface:'Sermons',table:'sermons',action:key,handler:key==='create'||key==='edit'?'saveSermon':key==='publish'||key==='unpublish'?'toggleSermon':key==='delete'?'remove':'refresh',operation:op,policy:'admins manage sermons',verify:key==='publish'||key==='unpublish'?'public read/RLS visibility':'read-after-mutation'})),
  {surface:'Visitors',table:'visitor_submissions',action:'read',handler:'refresh',operation:'select',policy:'admins read visitors',verify:'read-after-query'},
  {surface:'Visitors',table:'visitor_submissions',action:'update-status',handler:'updateVisitorStatus',operation:'update',policy:'admins update visitors',verify:'read-after-mutation'},
  {surface:'Ministries',table:'ministries',action:'create/edit',handler:'saveMinistry',operation:'insert/update',policy:'Admins manage ministries',verify:'read-after-mutation'},
  {surface:'Ministries',table:'ministries',action:'publish/unpublish',handler:'toggleMinistry',operation:'update({published})',policy:'Admins manage ministries',verify:'public read/RLS visibility'},
  {surface:'Ministries',table:'ministries',action:'delete',handler:'remove',operation:'delete',policy:'Admins manage ministries',verify:'read-after-mutation'},
  {surface:'Leaders',table:'leaders',action:'create/edit',handler:'saveLeader',operation:'insert/update',policy:'Admins manage leaders',verify:'read-after-mutation'},
  {surface:'Leaders',table:'leaders',action:'publish/unpublish',handler:'toggleLeader',operation:'update({published})',policy:'Admins manage leaders',verify:'public read/RLS visibility'},
  {surface:'Leaders',table:'leaders',action:'read',handler:'refresh',operation:'select',policy:'Admins manage leaders',verify:'read-after-query'},
];

const escaped = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const hasFrom = (source, table) => new RegExp(`\\.from\\(\\s*['"]${escaped(table)}['"]\\s*\\)`, 'i').test(source);
const hasHandler = (source, handler) => new RegExp(`(?:const|function)\\s+${escaped(handler)}\\s*[=(]`, 'i').test(source) || (handler === 'refresh' && /const\s+refresh\s*=/.test(source));
const operationRegex = {
  insert: /\.insert\s*\(/i,
  select: /\.select\s*\(/i,
  update: /\.update\s*\(/i,
  delete: /\.delete\s*\(/i,
};
const hasOperation = (source, action) => {
  const index = source.search(new RegExp(`\\.from\\(\\s*['"]${escaped(action.table)}['"]\\s*\\)`, 'i'));
  if (index < 0) return false;
  const window = source.slice(index, index + 1200);
  if (action.operation === 'insert/update') return operationRegex.insert.test(window) && operationRegex.update.test(window);
  if (action.operation === 'update({published})') return /\.update\s*\(\s*\{\s*published\s*:/i.test(window);
  if (action.operation === 'update({published:true})') return /\.update\s*\(\s*\{\s*published\s*:\s*true/i.test(window);
  if (action.operation === 'update({published:false})') return /\.update\s*\(\s*\{\s*published\s*:\s*false/i.test(window);
  if (action.operation === 'delete') return operationRegex.delete.test(window);
  return operationRegex[action.operation]?.test(window) ?? false;
};

const results = actions.map((a) => {
  const handlerOk = hasHandler(app, a.handler);
  const tableOk = hasFrom(app, a.table);
  const opOk = hasOperation(app, a);
  const policyOk = database.toLowerCase().includes(a.policy.toLowerCase());
  const ok = handlerOk && tableOk && opOk && policyOk;
  return {
    ...a,
    status: ok ? 'passed' : 'failed',
    checks: {handler:handlerOk,table:tableOk,operation:opOk,policy:policyOk},
    detail: ok ? 'source and RLS contract present' : 'one or more contract elements missing',
  };
});

const passed=results.filter(x=>x.status==='passed').length;
const failed=results.length-passed;
const report={
  protocol:'red-point-admin-workflow-verifier/v2',
  started_at:new Date().toISOString(),
  vertical_slice:{surface:'Events',lifecycle:'draft → edit → publish → public read → unpublish → public hidden → delete',status:results.filter(x=>x.surface==='Events').every(x=>x.status==='passed')?'locally_verified':'failed'},
  total_action_count:results.length,
  passed,
  failed,
  live_boundaries:{supabase:'unproven',device:'unproven',edge_functions:'unproven'},
  actions:results,
  finished_at:new Date().toISOString(),
};
const json=path.join(artifacts,`admin-workflow-verification-${Date.now()}.json`);
fs.writeFileSync(json,JSON.stringify(report,null,2));
const map=`# Admin Workflow Map\n\nGenerated: ${report.finished_at}\n\n## Status\n\n- Actions mapped: **${results.length}**\n- Passed locally: **${passed}**\n- Failed locally: **${failed}**\n- Events vertical slice: **${report.vertical_slice.status}**\n- Live Supabase: **unproven**\n- Physical device: **unproven**\n\n## Contract\n\nEach action maps UI handler → Supabase operation → RLS policy → expected mutation → observable verification.\n\n| Surface | Action | Handler | Operation | RLS | Verification |\n|---|---|---|---|---|---|\n${results.map(x=>`| ${x.surface} | ${x.action} | ${x.handler} | ${x.operation} | ${x.policy} | ${x.verify} |`).join('\n')}\n\n## Evidence rule\n\nLocal contract verification is not runtime proof. Runtime success requires a controlled Supabase boundary and explicit evidence.\n`;
fs.writeFileSync(path.join('.ai/evidence','ADMIN-WORKFLOW-MAP.md'),map);
console.log(JSON.stringify(report,null,2));
console.error(`Wrote ${json}`);
process.exitCode=failed?1:0;
