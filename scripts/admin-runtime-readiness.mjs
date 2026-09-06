#!/usr/bin/env node
/**
 * Deterministic runtime-boundary readiness check.
 * Never mutates Supabase. It verifies configuration, schema contracts,
 * safety gates, and whether the controlled E2E runner is actually runnable.
 */
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const artifacts = path.join(root, 'artifacts');
fs.mkdirSync(artifacts, { recursive: true });
const now = () => new Date().toISOString();
const read = (p) => { try { return fs.readFileSync(path.join(root, p), 'utf8'); } catch { return ''; } };
const checks = [];
const check = (key, passed, detail, severity = passed ? 'info' : 'high') => checks.push({ key, status: passed ? 'passed' : 'failed', severity, detail, checked_at: now() });

const env = {
  url: Boolean(process.env.SUPABASE_E2E_URL),
  anonKey: Boolean(process.env.SUPABASE_E2E_ANON_KEY),
  email: Boolean(process.env.SUPABASE_E2E_ADMIN_EMAIL),
  password: Boolean(process.env.SUPABASE_E2E_ADMIN_PASSWORD),
  allowMutations: process.env.SUPABASE_E2E_ALLOW_MUTATIONS === 'true',
  confirmation: process.env.SUPABASE_E2E_CONFIRM === 'REDPOINT_TEST_DB',
  environment: process.env.SUPABASE_E2E_ENV || '',
};

for (const [key, value] of Object.entries({
  'env:url': env.url,
  'env:anon-key': env.anonKey,
  'env:admin-email': env.email,
  'env:admin-password': env.password,
})) check(key, value, value ? 'configured' : 'missing');
check('env:controlled-environment', env.environment === 'staging' || env.environment === 'local', env.environment ? `SUPABASE_E2E_ENV=${env.environment}` : 'SUPABASE_E2E_ENV must be staging or local');
check('safety:mutation-opt-in', env.allowMutations, env.allowMutations ? 'mutation gate explicitly opened' : 'SUPABASE_E2E_ALLOW_MUTATIONS=true required');
check('safety:confirmation', env.confirmation, env.confirmation ? 'test database confirmation present' : 'SUPABASE_E2E_CONFIRM=REDPOINT_TEST_DB required');

const runner = read('scripts/admin-workflow-e2e.mjs');
const migration = read('supabase/migrations/20260903_000001_red_point_baseline.sql') + read('supabase/migrations/20260903_000002_admin_rls_fix.sql');
check('runner:events', runner.includes("from('events')") && runner.includes("event.public-read-published") && runner.includes("event.public-read-unpublished"), 'Events runtime lifecycle is implemented');
check('runner:no-service-role', !runner.toLowerCase().includes('service_role'), 'E2E runner contains no service-role credential path');
check('schema:events', migration.includes('create table if not exists public.events'), 'events table exists in repository migrations');
check('schema:public-published-policy', migration.includes('public can read published events'), 'public published-event read policy exists');
check('schema:admin-policy', migration.includes('admins manage events'), 'admin event management policy exists');
check('schema:is-admin-helper', migration.includes('create or replace function public.is_admin()'), 'RLS helper exists for admin authorization');

const missing = checks.filter((c) => c.status === 'failed');
const report = {
  protocol: 'red-point-admin-runtime-readiness/v1',
  checked_at: now(),
  mutation_would_be_allowed: env.url && env.anonKey && env.email && env.password && env.allowMutations && env.confirmation && (env.environment === 'staging' || env.environment === 'local'),
  checks,
  status: missing.some((c) => c.severity === 'high') ? 'blocked' : 'ready',
  next_action: missing.length ? 'Configure the missing controlled runtime boundary; do not weaken safety gates.' : 'Run npm run admin-workflow-e2e against the disposable/staging database and inspect the evidence artifact.',
};
const file = path.join(artifacts, `admin-runtime-readiness-${Date.now()}.json`);
fs.writeFileSync(file, JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
console.error(`Wrote ${file}`);
process.exitCode = report.status === 'ready' ? 0 : 2;
