#!/usr/bin/env node
/**
 * Red Point Church Admin Agent Protocol
 * Deterministic, machine-readable loop for repeated AI-assisted operations.
 * Safe by default: inspect/verify only. Mutations require explicit command + confirmation.
 */
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const out = path.join(root, 'artifacts');
fs.mkdirSync(out, { recursive: true });

const surfaces = [
  ['events','Events','read,create,edit,publish,unpublish,delete'],
  ['announcements','Announcements','read,create,edit,publish,unpublish,delete'],
  ['sermons','Sermons','read,create,edit,publish,unpublish,delete'],
  ['visitor_submissions','Visitors','read,update-status'],
  ['ministries','Ministries','read,create,edit,publish,unpublish,delete'],
  ['leaders','Leaders','read,create,edit,publish,unpublish,delete'],
  ['site_settings','Home/Contact','read,upsert'],
  ['notification_history','Notifications','read,insert'],
  ['device_tokens','Notifications','read-count'],
  ['admin_qa_runs','QA Runs','read,write'],
  ['admin_qa_results','QA Results','read,write'],
  ['admin_repair_queue','Repair Queue','read,write'],
];

function result(status, test, surface, detail='') {
  return { status, test, surface, detail, checked_at: new Date().toISOString() };
}

const mode = process.argv[2] || 'verify';
const report = {
  protocol: 'red-point-admin-agent/v1',
  mode,
  started_at: new Date().toISOString(),
  principle: 'Observe -> verify -> diagnose -> propose -> approve -> change -> verify -> record',
  safety: 'No destructive or consequential mutation is performed by this script.',
  surfaces: surfaces.map(([table,surface,operations]) => ({table,surface,operations:operations.split(',')})),
  checks: [],
  next_actions: [],
};

const files = [
  'App.tsx',
  'supabase/schema.sql',
  'supabase/migrations/20260905_admin_ai_operational_loop.sql',
  'scripts/admin-agent.mjs',
];
for (const file of files) {
  const exists = fs.existsSync(path.join(root, file));
  report.checks.push(result(exists ? 'passed' : 'failed', 'artifact_exists', 'system', file));
}

const pkg = JSON.parse(fs.readFileSync(path.join(root,'package.json'),'utf8'));
report.checks.push(result(pkg.scripts?.typecheck ? 'passed' : 'failed', 'typecheck_script', 'system', 'npm run typecheck'));
report.checks.push(result(pkg.scripts?.['release-check'] ? 'passed' : 'failed', 'release_check_script', 'system', 'npm run release-check'));

if (mode === 'plan') {
  report.next_actions = [
    'Run npm run typecheck.',
    'Run npm run release-check.',
    'Run the Admin Database Test from the app.',
    'Inspect admin_qa_results and admin_repair_queue.',
    'Only after approval, execute one bounded repair and rerun verification.',
  ];
} else {
  report.next_actions = [
    'Run npm run typecheck.',
    'Run npm run release-check.',
    'Use Admin > AI Operations to run the database verification loop.',
    'Resolve every failed result before declaring the release green.',
  ];
}

report.finished_at = new Date().toISOString();
report.status = report.checks.every(x => x.status === 'passed') ? 'ready_for_runtime_verification' : 'blocked';

const file = path.join(out, `admin-agent-${Date.now()}.json`);
fs.writeFileSync(file, JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
console.error(`Wrote ${file}`);
