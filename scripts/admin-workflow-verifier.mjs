#!/usr/bin/env node
/** Deterministic source/RLS contract verifier for Admin workflows. */
import fs from 'node:fs';
import path from 'node:path';
const root = process.cwd();
const artifacts = path.join(root, 'artifacts');
fs.mkdirSync(artifacts, { recursive: true });
const app = fs.readFileSync(path.join(root, 'App.tsx'), 'utf8');
const migrations = fs.readdirSync(path.join(root, 'supabase/migrations')).filter(x => x.endsWith('.sql')).map(x => fs.readFileSync(path.join(root,'supabase/migrations',x),'utf8')).join('\n');
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
const results = actions.map((a) => {
  const handlerOk = app.includes(`const ${a.handler}=`) || (a.handler==='refresh' && app.includes('const refresh='));
  const tableOk = app.includes(`from('${a.table}')`) || (a.table==='ministries' && app.includes("from('ministries')"));
  const opOk = a.operation==='insert/update' ? app.includes(`from('${a.table}').update`) && app.includes(`from('${a.table}').insert`) : a.operation==='update({published})' ? app.includes(`from('${a.table}').update({published:`) : a.operation==='update({published:true})' ? app.includes(`from('${a.table}').update({published:true})`) : a.operation==='update({published:false})' ? app.includes(`from('${a.table}').update({published:false})`) : a.operation==='delete' ? app.includes('supabase.from(table).delete()') : app.includes(`from('${a.table}').${a.operation}`);
  const policyOk = migrations.toLowerCase().includes(a.policy.toLowerCase());
  const ok = handlerOk && tableOk && opOk && policyOk;
  return {...a,status:ok?'passed':'failed',checks:{handler:handlerOk,table:tableOk,operation:opOk,policy:policyOk},detail:ok?'source and RLS contract present':'one or more contract elements missing'};
});
const passed=results.filter(x=>x.status==='passed').length, failed=results.length-passed;
const report={protocol:'red-point-admin-workflow-verifier/v1',started_at:new Date().toISOString(),vertical_slice:{surface:'Events',lifecycle:'draft → edit → publish → public read → unpublish → public hidden → delete',status:results.filter(x=>x.surface==='Events').every(x=>x.status==='passed')?'locally_verified':'failed'},total_action_count:results.length,passed,failed,live_boundaries:{supabase:'unproven',device:'unproven',edge_functions:'unproven'},actions:results,finished_at:new Date().toISOString()};
const json=path.join(artifacts,`admin-workflow-verification-${Date.now()}.json`);fs.writeFileSync(json,JSON.stringify(report,null,2));
const map=`# Admin Workflow Map\n\nGenerated: ${report.finished_at}\n\n## Status\n\n- Actions mapped: **${results.length}**\n- Passed locally: **${passed}**\n- Failed locally: **${failed}**\n- Events vertical slice: **${report.vertical_slice.status}**\n- Live Supabase: **unproven**\n- Physical device: **unproven**\n\n## Contract\n\nEach action maps UI handler → Supabase operation → RLS policy → expected mutation → observable verification.\n\n| Surface | Action | Handler | Operation | RLS | Verification |\n|---|---|---|---|---|---|\n${results.map(x=>`| ${x.surface} | ${x.action} | ${x.handler} | ${x.operation} | ${x.policy} | ${x.verify} |`).join('\n')}\n\n## Evidence rule\n\nLocal contract verification is not runtime proof. Runtime success requires a controlled Supabase boundary and explicit evidence.\n`;
fs.writeFileSync(path.join('.ai/evidence','ADMIN-WORKFLOW-MAP.md'),map);
console.log(JSON.stringify(report,null,2));console.error(`Wrote ${json}`);process.exitCode=failed?1:0;
