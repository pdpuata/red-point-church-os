#!/usr/bin/env node
/**
 * Static contract checker for the Admin operational surface.
 * This does not claim runtime correctness; it verifies that the repository
 * still exposes the expected Admin modes and operational hooks.
 */
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const app = fs.readFileSync(path.join(root, 'App.tsx'), 'utf8');
const migrationDir = path.join(root, 'supabase', 'migrations');
const migrations = fs.readdirSync(migrationDir).filter(x => x.endsWith('.sql')).map(x => fs.readFileSync(path.join(migrationDir, x), 'utf8')).join('\n');

const checks = [
  ['admin_component', /function Admin\(/.test(app), 'Admin component exists'],
  ['admin_ai_operations', /AI Operations/.test(app), 'AI Operations surface exists'],
  ['admin_snapshot_rpc', /admin_operational_snapshot/.test(app) && migrations.includes('admin_operational_snapshot'), 'Operational snapshot RPC is wired and migrated'],
  ['qa_runs', /admin_qa_runs/.test(app) && migrations.includes('admin_qa_runs'), 'QA runs are wired'],
  ['qa_results', /admin_qa_results/.test(app) && migrations.includes('admin_qa_results'), 'QA results are wired'],
  ['repair_queue', migrations.includes('admin_repair_queue'), 'Repair queue exists'],
  ['events', /mode==='event'/.test(app), 'Events mode exists'],
  ['announcements', /mode==='announcement'/.test(app), 'Announcements mode exists'],
  ['sermons', /mode==='sermon'/.test(app), 'Sermons mode exists'],
  ['visitors', /mode==='visitors'/.test(app), 'Visitors mode exists'],
  ['ministries', /mode==='ministry'/.test(app), 'Ministries mode exists'],
  ['leaders', /mode==='leader'/.test(app), 'Leaders mode exists'],
  ['home', /mode==='home'/.test(app), 'Home mode exists'],
  ['contact', /mode==='contact'/.test(app), 'Contact mode exists'],
  ['notify', /mode==='notify'/.test(app), 'Notifications mode exists'],
  ['sunday', /mode==='sunday'/.test(app), 'Sunday Readiness mode exists'],
  ['release', /mode==='release'/.test(app), 'Release Check mode exists'],
];

const failed = checks.filter(([, ok]) => !ok);
const report = {
  protocol: 'red-point-admin-surface-check/v1',
  checked_at: new Date().toISOString(),
  status: failed.length ? 'failed' : 'passed',
  checks: checks.map(([key, ok, detail]) => ({ key, status: ok ? 'passed' : 'failed', detail })),
  note: 'Static contract only; runtime database/device verification remains required.'
};
fs.mkdirSync(path.join(root, 'artifacts'), { recursive: true });
const file = path.join(root, 'artifacts', `admin-surface-check-${Date.now()}.json`);
fs.writeFileSync(file, JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
process.exit(failed.length ? 1 : 0);
