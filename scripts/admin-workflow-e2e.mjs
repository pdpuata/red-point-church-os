#!/usr/bin/env node
/**
 * Red Point Church OS — controlled runtime E2E verifier.
 *
 * This is intentionally opt-in because it performs real database mutations.
 * It only uses a normal authenticated admin session; it never needs a service-role key.
 *
 * Required environment:
 *   SUPABASE_E2E_URL
 *   SUPABASE_E2E_ANON_KEY
 *   SUPABASE_E2E_ADMIN_EMAIL
 *   SUPABASE_E2E_ADMIN_PASSWORD
 *   SUPABASE_E2E_ALLOW_MUTATIONS=true
 *   SUPABASE_E2E_CONFIRM=REDPOINT_TEST_DB
 *   SUPABASE_E2E_ENV=staging
 *
 * Optional:
 *   SUPABASE_E2E_LABEL
 *   SUPABASE_E2E_CLEANUP=true (default)
 */
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const artifacts = path.join(root, 'artifacts');
fs.mkdirSync(artifacts, { recursive: true });

const checkOnly = process.argv.includes('--check');
const required = ['SUPABASE_E2E_URL','SUPABASE_E2E_ANON_KEY','SUPABASE_E2E_ADMIN_EMAIL','SUPABASE_E2E_ADMIN_PASSWORD'];
const missing = required.filter((key) => !process.env[key]);
const allowMutations = process.env.SUPABASE_E2E_ALLOW_MUTATIONS === 'true';
const confirmed = process.env.SUPABASE_E2E_CONFIRM === 'REDPOINT_TEST_DB';
const controlledEnv = process.env.SUPABASE_E2E_ENV === 'staging' || process.env.SUPABASE_E2E_ENV === 'local';
const cleanup = process.env.SUPABASE_E2E_CLEANUP !== 'false';
const normalizeEnvValue = (value) => {
  const trimmed = String(value || '').trim();
  if ((trimmed.startsWith('"') && trimmed.endsWith('"')) || (trimmed.startsWith("'") && trimmed.endsWith("'"))) {
    return trimmed.slice(1, -1).trim();
  }
  return trimmed;
};
const supabaseUrl = normalizeEnvValue(process.env.SUPABASE_E2E_URL);
let validSupabaseUrl = false;
try {
  const parsed = new URL(supabaseUrl);
  validSupabaseUrl = parsed.protocol === 'https:' || parsed.protocol === 'http:';
} catch {}

const report = {
  protocol: 'red-point-admin-workflow-e2e/v1',
  started_at: new Date().toISOString(),
  safety: 'Controlled test database only; normal authenticated admin session; no service-role key; no production mutation unless explicitly and intentionally configured.',
  environment: {
    url_configured: Boolean(supabaseUrl),
    url_valid: validSupabaseUrl,
    admin_credentials_configured: Boolean(process.env.SUPABASE_E2E_ADMIN_EMAIL && process.env.SUPABASE_E2E_ADMIN_PASSWORD),
    mutation_gate: allowMutations && confirmed && controlledEnv ? 'open' : 'closed',
    environment_gate: controlledEnv ? 'open' : 'closed',
    cleanup,
    label: process.env.SUPABASE_E2E_LABEL || 'red-point-admin-e2e',
  },
  status: 'blocked',
  steps: [],
  created_event_id: null,
  error: null,
};

function step(key, status, detail, extra = {}) {
  report.steps.push({ key, status, detail, checked_at: new Date().toISOString(), ...extra });
}

function writeReport() {
  report.finished_at = new Date().toISOString();
  const file = path.join(artifacts, `admin-workflow-e2e-${Date.now()}.json`);
  fs.writeFileSync(file, JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
  console.error(`Wrote ${file}`);
}

if (checkOnly) {
  const reasons = [];
  if (missing.length) reasons.push(`missing environment: ${missing.join(', ')}`);
  if (process.env.SUPABASE_E2E_URL && !validSupabaseUrl) reasons.push('SUPABASE_E2E_URL must be a valid HTTP or HTTPS URL');
  if (!allowMutations) reasons.push('SUPABASE_E2E_ALLOW_MUTATIONS=true is not set');
  if (!confirmed) reasons.push('SUPABASE_E2E_CONFIRM=REDPOINT_TEST_DB is not set');
  if (!controlledEnv) reasons.push('SUPABASE_E2E_ENV=staging (or local) is required');
  step('preflight', reasons.length ? 'blocked' : 'ready', reasons.length ? reasons.join('; ') : 'All runtime gates are configured; check-only mode performed no mutation.');
  report.status = reasons.length ? 'blocked' : 'ready';
  report.error = reasons.length ? 'Runtime boundary is not ready.' : null;
  writeReport();
  process.exitCode = reasons.length ? 2 : 0;
} else if (missing.length || !validSupabaseUrl || !allowMutations || !confirmed) {
  const reasons = [];
  if (missing.length) reasons.push(`missing environment: ${missing.join(', ')}`);
  if (!validSupabaseUrl) reasons.push('SUPABASE_E2E_URL must be a valid HTTP or HTTPS URL');
  if (!allowMutations) reasons.push('SUPABASE_E2E_ALLOW_MUTATIONS=true is required');
  if (!confirmed) reasons.push('SUPABASE_E2E_CONFIRM=REDPOINT_TEST_DB is required');
  if (!controlledEnv) reasons.push('SUPABASE_E2E_ENV=staging (or local) is required');
  step('preflight', 'blocked', reasons.join('; '));
  report.error = 'Runtime E2E was not executed because its explicit safety gates were not satisfied.';
  writeReport();
  process.exitCode = 2;
} else {
  let supabase;
  let anon;
  let eventId = null;
  try {
    const { createClient } = await import('@supabase/supabase-js');
    const url = supabaseUrl;
    const key = normalizeEnvValue(process.env.SUPABASE_E2E_ANON_KEY);

    // Non-mutating transport/auth-gateway probe. This deliberately runs before
    // sign-in so network/API-key failures are distinguishable from auth failures.
    try {
      const probe = await fetch(`${url}/auth/v1/settings`, {
        headers: { apikey: key },
      });
      const probeBody = (await probe.text()).slice(0, 200);
      if (!probe.ok) {
        throw new Error(`Supabase Auth gateway probe returned HTTP ${probe.status}: ${probeBody}`);
      }
      step('runtime.auth-gateway', 'passed', 'Supabase Auth gateway is reachable and accepted the configured API key.');
    } catch (probeError) {
      const cause = probeError?.cause?.message ? `; cause: ${probeError.cause.message}` : '';
      throw new Error(`Supabase Auth gateway probe failed: ${probeError?.message || String(probeError)}${cause}`);
    }

    supabase = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
    anon = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });

    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: normalizeEnvValue(process.env.SUPABASE_E2E_ADMIN_EMAIL),
      password: normalizeEnvValue(process.env.SUPABASE_E2E_ADMIN_PASSWORD),
    });
    if (authError || !authData.user) {
      const cause = authError?.cause?.message ? `; cause: ${authError.cause.message}` : '';
      throw new Error(`admin sign-in failed: ${authError?.message || 'no user returned'}${cause}`);
    }
    step('admin.sign-in', 'passed', 'Authenticated admin session established.', { user_id: authData.user.id });

    const { data: adminRow, error: adminError } = await supabase.from('admin_users').select('user_id').eq('user_id', authData.user.id).maybeSingle();
    if (adminError) throw new Error(`admin role lookup failed: ${adminError.message}`);
    if (!adminRow) throw new Error('Authenticated user is not present in public.admin_users.');
    step('admin.role', 'passed', 'Authenticated user is an Admin according to database state.');

    const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const title = `[E2E] Red Point Admin Event ${suffix}`;
    const editedTitle = `${title} — Edited`;
    const startsAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    const payload = {
      title,
      description: 'Automated controlled-boundary verification event. Safe to delete.',
      starts_at: startsAt,
      ends_at: null,
      location: 'Controlled E2E test database',
      published: false,
      image_url: null,
    };

    const { data: created, error: createError } = await supabase.from('events').insert(payload).select('id,title,published').single();
    if (createError || !created) throw new Error(`event create failed: ${createError?.message || 'no row returned'}`);
    eventId = created.id;
    report.created_event_id = eventId;
    step('event.create', 'passed', 'Draft event was inserted and returned by the database.', { id: eventId, published: created.published });

    let { data: draft, error: draftError } = await supabase.from('events').select('id,title,published').eq('id', eventId).single();
    if (draftError || !draft) throw new Error(`admin draft read failed: ${draftError?.message || 'row missing'}`);
    if (draft.published !== false) throw new Error('new event was not persisted as a draft');
    step('event.read-draft', 'passed', 'Admin read sees the newly created draft.');

    const { data: edited, error: editError } = await supabase.from('events').update({ title: editedTitle }).eq('id', eventId).select('id,title,published').single();
    if (editError || !edited) throw new Error(`event edit failed: ${editError?.message || 'no row returned'}`);
    if (edited.title !== editedTitle) throw new Error('edited title did not persist');
    step('event.edit', 'passed', 'Admin edit persisted and returned the updated state.');

    const { data: published, error: publishError } = await supabase.from('events').update({ published: true }).eq('id', eventId).select('id,published').single();
    if (publishError || !published) throw new Error(`event publish failed: ${publishError?.message || 'no row returned'}`);
    if (published.published !== true) throw new Error('publish mutation did not return published=true');
    step('event.publish', 'passed', 'Admin publish mutation persisted published=true.');

    const { data: publicEvent, error: publicReadError } = await anon.from('events').select('id,title,published').eq('id', eventId).maybeSingle();
    if (publicReadError) throw new Error(`public published read failed: ${publicReadError.message}`);
    if (!publicEvent || publicEvent.published !== true) throw new Error('published event is not publicly readable');
    step('event.public-read-published', 'passed', 'Unauthenticated/public client can read the published event.');

    const { data: unpublished, error: unpublishError } = await supabase.from('events').update({ published: false }).eq('id', eventId).select('id,published').single();
    if (unpublishError || !unpublished) throw new Error(`event unpublish failed: ${unpublishError?.message || 'no row returned'}`);
    if (unpublished.published !== false) throw new Error('unpublish mutation did not return published=false');
    step('event.unpublish', 'passed', 'Admin unpublish mutation persisted published=false.');

    const { data: publicHidden, error: publicHiddenError } = await anon.from('events').select('id,title,published').eq('id', eventId).maybeSingle();
    if (publicHiddenError) throw new Error(`public unpublished read failed: ${publicHiddenError.message}`);
    if (publicHidden) throw new Error('unpublished event remains publicly readable; RLS contract is broken');
    step('event.public-read-unpublished', 'passed', 'Unauthenticated/public client cannot read the unpublished event.');

    const { error: deleteError } = await supabase.from('events').delete().eq('id', eventId);
    if (deleteError) throw new Error(`event delete failed: ${deleteError.message}`);
    step('event.delete', 'passed', 'Admin delete mutation completed.');

    const { data: deleted, error: deletedReadError } = await supabase.from('events').select('id').eq('id', eventId).maybeSingle();
    if (deletedReadError) throw new Error(`post-delete read failed: ${deletedReadError.message}`);
    if (deleted) throw new Error('event still exists after delete');
    step('event.verify-delete', 'passed', 'Database no longer returns the test event after deletion.');

    report.status = 'passed';
  } catch (error) {
    report.status = 'failed';
    report.error = error?.message || String(error);
    step('runtime', 'failed', report.error);
    if (eventId && cleanup && supabase) {
      try {
        const { error: cleanupError } = await supabase.from('events').delete().eq('id', eventId);
        step('cleanup', cleanupError ? 'failed' : 'passed', cleanupError ? cleanupError.message : 'Test event removed after failure.');
      } catch (cleanupError) {
        step('cleanup', 'failed', cleanupError?.message || String(cleanupError));
      }
    }
  } finally {
    await supabase?.auth.signOut();
    writeReport();
    process.exitCode = report.status === 'passed' ? 0 : 1;
  }
}
