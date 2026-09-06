#!/usr/bin/env node
/**
 * Red Point Church OS — repository-side operational loop.
 *
 * This is deliberately deterministic. It does not pretend to be an LLM and it
 * never performs consequential production/database mutations. Its job is to
 * turn repository state into machine-readable evidence and a bounded next task
 * that an AI coding agent can execute repeatedly.
 */
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const root = process.cwd();
const artifacts = path.join(root, 'artifacts');
fs.mkdirSync(artifacts, { recursive: true });

const now = () => new Date().toISOString();
const exists = (p) => fs.existsSync(path.join(root, p));
const read = (p) => {
  try { return fs.readFileSync(path.join(root, p), 'utf8'); }
  catch { return ''; }
};
const has = (p, needle) => read(p).includes(needle);

const required = [
  '.ai/constitution.md',
  '.ai/architecture.md',
  '.ai/domain-model.md',
  '.ai/tests/definition-of-done.md',
  '.ai/tests/repository-gates.md',
  '.ai/workflows/ai-operations-loop.md',
  'AGENTS.md',
  '.github/copilot-instructions.md',
  'App.tsx',
  'package.json',
  'supabase/migrations/20260905_admin_ai_operational_loop.sql',
];

const checks = [];
function check(key, ok, detail, severity = ok ? 'info' : 'high') {
  checks.push({ key, status: ok ? 'passed' : 'failed', severity, detail, checked_at: now() });
}

for (const file of required) check(`artifact:${file}`, exists(file), exists(file) ? 'present' : 'missing');

const pkg = JSON.parse(read('package.json') || '{}');
for (const script of ['admin-agent','admin-surface-check','release-check','typecheck','verify:admin','admin-workflow-check','admin-workflow-e2e']) {
  check(`script:${script}`, Boolean(pkg.scripts?.[script]), pkg.scripts?.[script] || `missing npm script: ${script}`);
}

const app = read('App.tsx');
const migration = read('supabase/migrations/20260905_admin_ai_operational_loop.sql');
const expectedModes = ['event','announcement','sermon','visitors','notify','home','ministries','ministry','leaders','leader','contact','sunday','health','release','ops','preview'];
const modeHits = expectedModes.filter((mode) => app.includes(`'${mode}'`));
check('admin:mode-contract', modeHits.length === expectedModes.length,
  `${modeHits.length}/${expectedModes.length} declared Admin modes detected`);
check('admin:ai-operations-ui', app.includes('runOperationalLoop') && app.includes('admin_qa_runs'),
  'AI Operations loop is wired to QA run persistence');
check('admin:repair-queue', migration.includes('admin_repair_queue'),
  'repair queue migration is present');
check('admin:snapshot-rpc', migration.includes('admin_operational_snapshot'),
  'operational snapshot RPC is present');
check('security:rls', /enable row level security/i.test(migration),
  'RLS enabled on operational tables');
check('security:rpc-auth', migration.includes("if not isadm then"),
  'snapshot RPC contains an explicit admin authorization check');

function run(command, args) {
  const result = spawnSync(command, args, { cwd: root, encoding: 'utf8', timeout: 120000 });
  return {
    code: typeof result.status === 'number' ? result.status : 1,
    stdout: (result.stdout || '').trim(),
    stderr: (result.stderr || '').trim(),
  };
}

const runtime = { dependencies_installed: exists('node_modules') };
if (runtime.dependencies_installed) {
  const typecheck = run(process.platform === 'win32' ? 'npm.cmd' : 'npm', ['run','typecheck']);
  runtime.typecheck = { status: typecheck.code === 0 ? 'passed' : 'failed', output: (typecheck.stderr || typecheck.stdout).slice(-4000) };
  check('runtime:typecheck', typecheck.code === 0, typecheck.code === 0 ? 'TypeScript passed' : 'TypeScript failed; inspect output', 'critical');
} else {
  runtime.typecheck = { status: 'blocked', output: 'node_modules is absent; install pinned dependencies before runtime typecheck.' };
  check('runtime:typecheck', false, 'blocked: node_modules is absent; source-level typecheck cannot be verified here', 'critical');
}

const failed = checks.filter((x) => x.status === 'failed');
const high = failed.filter((x) => ['high','critical'].includes(x.severity));

let nextTask;
if (!exists('node_modules')) {
  nextTask = {
    priority: 'critical',
    title: 'Restore the reproducible dependency environment',
    reason: 'The repository cannot prove TypeScript/runtime integrity without installed pinned dependencies.',
    action: 'Install dependencies from the repository lockfile/package manifest, then run npm run typecheck and npm run ai:loop again.',
    blocked_by: ['dependency installation/environment'],
  };
} else if (high.length) {
  nextTask = {
    priority: 'high',
    title: 'Repair the highest-severity failed repository contract',
    reason: high[0].detail,
    action: `Inspect ${high[0].key}, make the smallest safe repair, rerun npm run ai:loop, and record evidence.`,
    blocked_by: [],
  };
} else {
  const runtimeScriptReady = Boolean(pkg.scripts?.['admin-workflow-e2e']);
  nextTask = {
    priority: 'high',
    title: runtimeScriptReady ? 'Execute controlled Admin runtime E2E verification' : 'Turn the next Admin workflow into a verified end-to-end operation',
    reason: runtimeScriptReady ? 'Source/RLS contracts are green and the reusable Events runtime verifier is ready; the remaining evidence gap is an actual controlled Supabase boundary.' : 'Static contracts are green; the next leverage point is runtime workflow verification rather than another screen.',
    action: runtimeScriptReady ? 'Configure a disposable/staging Supabase environment, satisfy the explicit mutation gates, run npm run admin-workflow-e2e, inspect the evidence artifact, and only then expand the runner to the next Admin surface.' : 'Choose the highest-value unverified Admin path, exercise its read/create/edit/publish or status transition against Supabase, verify the resulting state, and record evidence.',
    blocked_by: runtimeScriptReady ? ['controlled Supabase URL/key and dedicated Admin test account; physical device remains a separate boundary'] : ['live Supabase credentials/access and/or physical device if required'],
  };
}

const report = {
  protocol: 'red-point-ai-operational-loop/v1',
  started_at: now(),
  principle: 'Observe -> Verify -> Diagnose -> Propose -> Approve -> Change -> Verify -> Record',
  safety: 'Deterministic repository verification only; no consequential mutations.',
  repository: {
    package_version: pkg.version || null,
    dependencies_installed: runtime.dependencies_installed,
  },
  checks,
  runtime,
  diagnosis: {
    failed_checks: failed.length,
    high_severity_failures: high.length,
    state: high.length ? 'attention_required' : 'ready_for_next_operational_test',
  },
  next_task: nextTask,
  finished_at: now(),
};

const jsonPath = path.join(artifacts, 'ai-operational-loop.json');
fs.writeFileSync(jsonPath, JSON.stringify(report, null, 2));

const md = `# AI Next Task\n\nGenerated: ${report.finished_at}\n\n## ${nextTask.priority.toUpperCase()} — ${nextTask.title}\n\n**Why:** ${nextTask.reason}\n\n**Action:** ${nextTask.action}\n\n**Blocked by:** ${nextTask.blocked_by.length ? nextTask.blocked_by.join(', ') : 'none identified'}\n\n## Loop\n\nObserve → Verify → Diagnose → Propose → Approve → Change → Verify → Record\n\n## Rule\n\nDo not declare success from static structure alone. Runtime/database/device verification must be evidenced when required.\n`;
fs.writeFileSync(path.join(artifacts, 'AI-NEXT-TASK.md'), md);

console.log(JSON.stringify(report, null, 2));
console.error(`Wrote ${jsonPath}`);
console.error(`Wrote ${path.join(artifacts, 'AI-NEXT-TASK.md')}`);
process.exitCode = high.length ? 2 : 0;
