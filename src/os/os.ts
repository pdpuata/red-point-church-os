import { supabase } from '../../lib/supabase';


export async function getSystemIntegrity() {
  if (!supabase) throw new Error('Supabase is not configured');
  const { data, error } = await supabase.from('os_system_integrity_live').select('*').order('id');
  if (error) throw error;
  return data || [];
}

export async function runSystemIntegrityAudit() {
  if (!supabase) throw new Error('Supabase is not configured');
  const { data, error } = await supabase.rpc('os_run_system_integrity_audit');
  if (error) throw error;
  return data;
}


export async function getOperationalActivation() {
  if (!supabase) throw new Error('Supabase is not configured');
  const { data, error } = await supabase.from('os_operational_activation').select('*').order('phase_order');
  if (error) throw error;
  return data || [];
}

export async function generateOperationalActivationTasks() {
  if (!supabase) throw new Error('Supabase is not configured');
  const { data, error } = await supabase.rpc('os_generate_operational_activation_tasks');
  if (error) throw error;
  return data;
}

export async function getPeopleIngestionReadiness() {
  if (!supabase) throw new Error('Supabase is not configured');
  const { data, error } = await supabase.from('os_people_ingestion_readiness').select('*').order('source_key');
  if (error) throw error;
  return data || [];
}

export async function registerPeopleSource(sourceKey: string, sourceType: string, displayName: string, owner?: string, config: any = {}) {
  if (!supabase) throw new Error('Supabase is not configured');
  const { data, error } = await supabase.rpc('os_register_people_source', { p_source_key: sourceKey, p_source_type: sourceType, p_display_name: displayName, p_owner: owner || null, p_config: config });
  if (error) throw error;
  return data;
}

export async function createPeopleImportRun(sourceKey: string, sourceReference?: string, rowCount = 0) {
  if (!supabase) throw new Error('Supabase is not configured');
  const { data, error } = await supabase.rpc('os_create_people_import_run', { p_source_key: sourceKey, p_source_reference: sourceReference || null, p_row_count: rowCount });
  if (error) throw error;
  return data;
}

export async function normalizePeopleImport(rows: any[]) {
  if (!supabase) throw new Error('Supabase is not configured');
  const { data, error } = await supabase.functions.invoke('os-people-import-ai-v1', { body: { rows } });
  if (error) throw error;
  return data;
}

export async function preparePeopleActivation(rows: any[], source = 'manual') {
  if (!supabase) throw new Error('Supabase is not configured');
  const { data, error } = await supabase.rpc('os_prepare_people_activation', { p_rows: rows, p_source: source });
  if (error) throw error;
  return data;
}

export async function getPeopleActivationPreview(batchId?: string) {
  if (!supabase) throw new Error('Supabase is not configured');
  let q = supabase.from('os_people_activation_preview').select('*').order('created_at');
  if (batchId) q = q.eq('batch_id', batchId);
  const { data, error } = await q;
  if (error) throw error;
  return data || [];
}

export async function applyPeopleActivation(batchId: string) {
  if (!supabase) throw new Error('Supabase is not configured');
  const { data, error } = await supabase.rpc('os_apply_people_activation', { p_batch_id: batchId });
  if (error) throw error;
  return data;
}

export async function getOperationalDataReadiness() {
  if (!supabase) throw new Error('Supabase is not configured');
  const { data, error } = await supabase.from('os_operational_data_readiness').select('*').order('domain_name');
  if (error) throw error;
  return data || [];
}

export async function generateOperationalDataTasks() {
  if (!supabase) throw new Error('Supabase is not configured');
  const { data, error } = await supabase.rpc('os_generate_operational_data_tasks');
  if (error) throw error;
  return data;
}

export async function getControlTower() {
  if (!supabase) throw new Error('Supabase is not configured');
  const { data, error } = await supabase.from('os_staff_control_tower').select('*').order('workflow_name');
  if (error) throw error;
  return data || [];
}

export async function getMusicServices() {
  if (!supabase) throw new Error('Supabase is not configured');
  const { data, error } = await supabase.from('music_services').select('id,title,service_date,status,band_id').order('service_date', { ascending: true });
  if (error) throw error;
  return data || [];
}

export async function getServiceTimeline(serviceId: string) {
  if (!supabase) throw new Error('Supabase is not configured');
  const { data, error } = await supabase.from('os_service_timeline').select('*').eq('service_id', serviceId).order('sort_order');
  if (error) throw error;
  return data || [];
}

export async function evaluateServiceTimeline(serviceId: string) {
  if (!supabase) throw new Error('Supabase is not configured');
  const { data, error } = await supabase.rpc('os_evaluate_service_timeline', { p_service_id: serviceId });
  if (error) throw error;
  return data;
}

export async function runSundayOperatingLoop(serviceId: string) {
  if (!supabase) throw new Error('Supabase is not configured');
  const { data, error } = await supabase.rpc('os_run_sunday_operating_loop', { p_service_id: serviceId });
  if (error) throw error;
  return data;
}

export async function runRosterAgent(serviceId: string) {
  if (!supabase) throw new Error('Supabase is not configured');
  const { data, error } = await supabase.rpc('os_run_roster_agent', { p_service_id: serviceId });
  if (error) throw error;
  return data;
}

export async function planRoster(serviceId: string) {
  if (!supabase) throw new Error('Supabase is not configured');
  const { data, error } = await supabase.rpc('os_plan_roster', { p_service_id: serviceId });
  if (error) throw error;
  return data;
}

export async function askAiRoster(serviceId: string) {
  if (!supabase) throw new Error('Supabase is not configured');
  const { data, error } = await supabase.functions.invoke('os-roster-ai-v1', {
    body: { service_id: serviceId },
  });
  if (error) throw error;
  return data;
}

export async function getAttentionQueue() {
  if (!supabase) throw new Error('Supabase is not configured');
  const { data, error } = await supabase.from('os_control_tower_attention').select('*').order('overdue', { ascending: false }).order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function resolveTask(taskId: string, resolution: Record<string, unknown> = {}) {
  if (!supabase) throw new Error('Supabase is not configured');
  const { data, error } = await supabase.rpc('os_resolve_task', { p_task_id: taskId, p_resolution: resolution });
  if (error) throw error;
  return data;
}

export async function getPeopleReconciliationReadiness() {
  if (!supabase) throw new Error('Supabase is not configured');
  const { data, error } = await supabase.from('os_people_reconciliation_inbox').select('*').order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function getPeopleReconciliationItems(reconciliationRunId?: string) {
  if (!supabase) throw new Error('Supabase is not configured');
  let q = supabase.from('os_people_reconciliation_items').select('*').order('created_at', { ascending: false });
  if (reconciliationRunId) q = q.eq('reconciliation_run_id', reconciliationRunId);
  const { data, error } = await q;
  if (error) throw error;
  return data || [];
}

export async function reconcilePeopleImportRun(importRunId: string) {
  if (!supabase) throw new Error('Supabase is not configured');
  const { data, error } = await supabase.rpc('os_reconcile_people_import_run', { p_import_run_id: importRunId });
  if (error) throw error;
  return data;
}

export async function resolvePeopleReconciliationItem(itemId: string, resolution: 'approved' | 'rejected' | 'needs_review', notes: string | null = null) {
  if (!supabase) throw new Error('Supabase is not configured');
  const { data, error } = await supabase.rpc('os_resolve_people_reconciliation_item', { p_item_id: itemId, p_resolution: resolution, p_notes: notes });
  if (error) throw error;
  return data;
}

export async function getPeopleDirectory() {
  if (!supabase) throw new Error('Supabase is not configured');
  const { data, error } = await supabase.from('os_people_directory').select('*').order('display_name');
  if (error) throw error;
  return data || [];
}

export async function getBands() {
  if (!supabase) throw new Error('Supabase is not configured');
  const { data, error } = await supabase.from('bands').select('id,name,active').eq('active', true).order('name');
  if (error) throw error;
  return data || [];
}

export async function upsertRole(userId: string, role: string) {
  if (!supabase) throw new Error('Supabase is not configured');
  const { data, error } = await supabase.rpc('os_upsert_music_role', { p_user_id: userId, p_role: role });
  if (error) throw error;
  return data;
}

export async function upsertCapability(userId: string, capability: string, proficiency: number | null, isPrimary = false, notes: string | null = null) {
  if (!supabase) throw new Error('Supabase is not configured');
  const { data, error } = await supabase.rpc('os_upsert_capability', { p_user_id: userId, p_capability: capability, p_proficiency: proficiency, p_is_primary: isPrimary, p_notes: notes });
  if (error) throw error;
  return data;
}

export async function upsertBandMembership(bandId: string, userId: string, isLeader = false) {
  if (!supabase) throw new Error('Supabase is not configured');
  const { data, error } = await supabase.rpc('os_upsert_band_membership', { p_band_id: bandId, p_user_id: userId, p_is_leader: isLeader });
  if (error) throw error;
  return data;
}

export async function saveRosterRecommendations(serviceId: string, candidates: any[]) {
  if (!supabase) throw new Error('Supabase is not configured');
  const { data, error } = await supabase.rpc('os_save_roster_recommendations', { p_service_id: serviceId, p_candidates: candidates });
  if (error) throw error;
  return data;
}

export async function getRosterRecommendations(serviceId: string) {
  if (!supabase) throw new Error('Supabase is not configured');
  const { data, error } = await supabase.from('os_roster_recommendations').select('*').eq('service_id', serviceId).order('status').order('score', { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function approveRosterRecommendation(recommendationId: string, notes: string | null = null) {
  if (!supabase) throw new Error('Supabase is not configured');
  const { data, error } = await supabase.rpc('os_approve_roster_recommendation', { p_recommendation_id: recommendationId, p_notes: notes });
  if (error) throw error;
  return data;
}

export async function rejectRosterRecommendation(recommendationId: string, reason: string | null = null) {
  if (!supabase) throw new Error('Supabase is not configured');
  const { data, error } = await supabase.rpc('os_reject_roster_recommendation', { p_recommendation_id: recommendationId, p_reason: reason });
  if (error) throw error;
  return data;
}

export async function getServiceAssignments(serviceId: string) {
  if (!supabase) throw new Error('Supabase is not configured');
  const { data, error } = await supabase.from('service_assignments').select('id,user_id,responsibility,assignment_status,confirmation_status,notes,created_at').eq('service_id', serviceId).order('responsibility');
  if (error) throw error;
  return data || [];
}

export async function getPeopleWorkload() {
  if (!supabase) throw new Error('Supabase is not configured');
  const { data, error } = await supabase.from('os_people_workload').select('*').order('services_8w', { ascending: false }).order('display_name');
  if (error) throw error;
  return data || [];
}

export async function getCommunicationQueue() {
  if (!supabase) throw new Error('Supabase is not configured');
  const { data, error } = await supabase.from('os_communication_queue').select('*').order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function createAssignmentCommunication(assignmentId: string) {
  if (!supabase) throw new Error('Supabase is not configured');
  const { data, error } = await supabase.rpc('os_create_assignment_communication', { p_assignment_id: assignmentId });
  if (error) throw error;
  return data;
}

export async function approveAssignmentCommunication(communicationId: string) {
  if (!supabase) throw new Error('Supabase is not configured');
  const { data, error } = await supabase.rpc('os_approve_assignment_communication', { p_communication_id: communicationId });
  if (error) throw error;
  return data;
}

export async function sendAssignmentCommunication(communication: any) {
  if (!supabase) throw new Error('Supabase is not configured');
  const { data, error } = await supabase.functions.invoke('send-push', {
    body: { title: communication.title, body: communication.body, target: 'Sunday', kind: 'Assignment', recipient_user_id: communication.recipient_user_id, communication_id: communication.communication_id },
  });
  if (error) throw error;
  return data;
}


export function getOperationalActivationPlan(readiness: any[]) {
  const byKey = new Map((readiness || []).map((d: any) => [d.domain_key, d]));
  const phases = [
    { key: 'people', label: '1. People', description: 'Identity, roles, capabilities and primary capabilities', domains: ['people'] },
    { key: 'bands', label: '2. Bands & Leadership', description: 'Membership and accountable leaders for every active band', domains: ['bands'] },
    { key: 'services', label: '3. Services', description: 'Upcoming services assigned to a band with operational coverage', domains: ['services'] },
    { key: 'sunday', label: '4. Sunday Operations', description: 'Roster, setlist, readiness and temporal gates', domains: ['services', 'sunday_operations'] },
    { key: 'communications', label: '5. Communication Execution', description: 'Approved operational messages can actually reach people', domains: ['communications'] },
    { key: 'autonomy', label: '6. Safe AI Autonomy', description: 'Only after the underlying operational graph is sufficiently complete', domains: ['ai_operations'] },
  ];
  const score = (d: any) => d ? (d.status === 'present' ? 1 : d.status === 'data_gap' ? 0 : 0.5) : 0;
  return phases.map((phase, index) => {
    const ds = phase.domains.map(k => byKey.get(k)).filter(Boolean);
    const blockers = ds.reduce((n: number, d: any) => n + Number(d.blocker_count || 0), 0);
    const complete = ds.length > 0 && ds.every((d: any) => score(d) === 1);
    const prerequisiteBlocked = index > 0 && phases.slice(0, index).some(prev => {
      const prevDomains = prev.domains.map(k => byKey.get(k)).filter(Boolean);
      return prevDomains.some((d: any) => d.status !== 'present');
    });
    return {
      ...phase,
      blockers,
      status: complete ? 'ready' : prerequisiteBlocked ? 'waiting' : blockers > 0 ? 'action_required' : 'data_gap',
    };
  });
}

export async function getWorkflowRuntimeHealth() {
  if (!supabase) throw new Error('Supabase is not configured');
  const { data, error } = await supabase.from('os_workflow_runtime_health').select('*').order('key');
  if (error) throw error;
  return data || [];
}

export async function queueWorkflowDispatch(workflowKey: string, triggerKey: string, entityType?: string, entityId?: string, inputContext: Record<string, unknown> = {}) {
  if (!supabase) throw new Error('Supabase is not configured');
  const { data, error } = await supabase.rpc('os_queue_workflow_dispatch', { p_workflow_key: workflowKey, p_trigger_key: triggerKey, p_entity_type: entityType || null, p_entity_id: entityId || null, p_input_context: inputContext });
  if (error) throw error;
  return data;
}

export async function claimWorkflowDispatches(limit = 10) {
  if (!supabase) throw new Error('Supabase is not configured');
  const { data, error } = await supabase.rpc('os_claim_workflow_dispatches', { p_limit: limit });
  if (error) throw error;
  return data || [];
}

export async function getAgentRuntimeHealth() {
  if (!supabase) throw new Error('Supabase is not configured');
  const [{ data: health, error: healthError }, { data: pending, error: pendingError }] = await Promise.all([
    supabase.from('os_agent_runtime_health').select('*').order('key'),
    supabase.from('os_agent_actions').select('id,agent_id,tool_id,requested_mode,approval_status,status,entity_type,created_at').eq('approval_status','pending').order('created_at',{ ascending: true }),
  ]);
  if (healthError) throw healthError;
  if (pendingError) throw pendingError;
  const agents = await supabase.from('os_agents').select('id,name,key');
  if (agents.error) throw agents.error;
  const tools = await supabase.from('os_agent_tools').select('id,name,key');
  if (tools.error) throw tools.error;
  const agentMap = new Map((agents.data || []).map((x:any) => [x.id,x]));
  const toolMap = new Map((tools.data || []).map((x:any) => [x.id,x]));
  return { health: health || [], pending: (pending || []).map((x:any) => ({ ...x, agent_name: agentMap.get(x.agent_id)?.name || x.agent_id, tool_name: toolMap.get(x.tool_id)?.name || x.tool_id })) };
}

export async function claimAgentActions(limit = 10) {
  if (!supabase) throw new Error('Supabase is not configured');
  const { data, error } = await supabase.rpc('os_claim_agent_actions', { p_limit: limit });
  if (error) throw error;
  return data || [];
}

export async function approveAgentAction(actionId: string) {
  if (!supabase) throw new Error('Supabase is not configured');
  const { data, error } = await supabase.rpc('os_approve_agent_action', { p_action_id: actionId });
  if (error) throw error;
  return data;
}

export async function getAutonomousRuntimeHealth() {
  if (!supabase) throw new Error('Supabase is not configured');
  const { data, error } = await supabase.from('os_autonomous_runtime_health').select('*').single();
  if (error) throw error;
  return data;
}

export async function getEventFabricHealth() {
  if (!supabase) throw new Error('Supabase is not configured');
  const { data, error } = await supabase.from('os_event_fabric_health').select('*').single();
  if (error) throw error;
  return data;
}

export async function publishOperationalEvent(eventKey: string, entityType?: string, entityId?: string, source = 'system', idempotencyKey?: string, payload: Record<string, unknown> = {}, correlationId?: string) {
  if (!supabase) throw new Error('Supabase is not configured');
  const { data, error } = await supabase.rpc('os_publish_event', { p_event_key: eventKey, p_entity_type: entityType || null, p_entity_id: entityId || null, p_source: source, p_idempotency_key: idempotencyKey || `${eventKey}:${entityId || 'none'}:${Date.now()}`, p_payload: payload, p_correlation_id: correlationId || null });
  if (error) throw error;
  return data;
}

export async function getInstitutionalMemoryHealth() {
  if (!supabase) throw new Error('Supabase is not configured');
  const { data, error } = await supabase.from('os_institutional_memory_health').select('*').single();
  if (error) throw error;
  return data;
}
export async function refreshInstitutionalMemory() {
  if (!supabase) throw new Error('Supabase is not configured');
  const { data, error } = await supabase.rpc('os_refresh_institutional_memory');
  if (error) throw error;
  return data;
}
export async function getAdaptiveLearningHealth() {
  if (!supabase) throw new Error('Supabase is not configured');
  const { data, error } = await supabase.from('os_adaptive_learning_health').select('*').single();
  if (error) throw error;
  return data;
}
export async function runLearningCycle() {
  if (!supabase) throw new Error('Supabase is not configured');
  const { data, error } = await supabase.rpc('os_run_learning_cycle');
  if (error) throw error;
  return data;
}
export async function getLearningProposals() {
  if (!supabase) throw new Error('Supabase is not configured');
  const { data, error } = await supabase.from('os_learning_proposals').select('*').eq('status','proposed').order('created_at',{ ascending:false });
  if (error) throw error;
  return data || [];
}
export async function approveLearningProposal(proposalId: string) {
  if (!supabase) throw new Error('Supabase is not configured');
  const { data, error } = await supabase.rpc('os_approve_learning_proposal',{ p_proposal_id: proposalId });
  if (error) throw error;
  return data;
}
