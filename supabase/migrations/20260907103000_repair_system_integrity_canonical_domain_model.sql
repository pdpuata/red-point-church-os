create or replace view public.os_system_integrity_live as
with m as (
  select
    (select count(*) from public.profiles) profiles_count,
    (select count(*) from public.bands where active=true) active_bands_count,
    (select count(*) from public.music_people where status <> 'inactive') music_people_count,
    (select count(*) from public.music_person_band_roles) person_band_roles_count,
    (select count(*) from public.music_services) services_count,
    (select count(*) from public.service_assignments where assignment_status='active') active_assignments_count,
    (select count(*) from public.music_setlists) setlists_count,
    (select count(*) from public.music_setlist_items) setlist_items_count,
    (select count(*) from public.music_songs) songs_count,
    (select count(*) from public.announcements) announcements_count,
    (select count(*) from public.events) events_count,
    (select count(*) from public.sermons) sermons_count,
    (select count(*) from public.ministries) ministries_count,
    (select count(*) from public.visitor_submissions) visitors_count,
    (select count(*) from public.os_workflow_runs) workflow_runs_count,
    (select count(*) from public.os_tasks where status not in ('completed','cancelled')) open_tasks_count,
    (select count(*) from public.os_audit_events) audit_events_count,
    (select count(*) from public.os_agents) agents_count,
    (select count(*) from public.os_agent_runs) agent_runs_count,
    (select count(*) from public.os_communications) communications_count,
    (select count(*) from public.device_tokens where active=true) active_device_tokens_count,
    (select count(*) from public.os_knowledge_nodes) knowledge_nodes_count,
    (select count(*) from public.os_knowledge_edges) knowledge_edges_count,
    (select count(*) from public.os_workflows where key='worship_roster' and enabled) roster_workflow_count,
    (select count(*) from public.os_workflows where key='sunday_operating_system' and enabled) sunday_workflow_count,
    (select count(*) from public.os_workflows where key='communication_routing' and enabled) communication_workflow_count,
    (select count(*) from public.os_workflows where key='institutional_memory' and enabled) memory_workflow_count,
    (select count(*) from public.os_workflows where key='visitor_followup' and enabled) visitor_workflow_count
), d as (
 select m.*, x.* from m cross join lateral (values
 ('people','People & Capability',case when m.music_people_count>0 and m.person_band_roles_count>0 then 'present' else 'data_gap' end,case when m.workflow_runs_count>0 then 'present' else 'unverified' end,case when m.person_band_roles_count>0 then 'partial' else 'unverified' end,'verified_rls',case when m.audit_events_count>0 then 'present' else 'unverified' end,case when m.workflow_runs_count>0 then 'partial' else 'unverified' end,case when m.music_people_count>0 and m.person_band_roles_count>0 then 'partial' else 'blocked_data' end,jsonb_build_object('profiles',m.profiles_count,'people',m.music_people_count,'active_bands',m.active_bands_count,'person_band_roles',m.person_band_roles_count)),
 ('worship_roster','Worship Roster',case when m.services_count>0 and m.music_people_count>0 and m.person_band_roles_count>0 and m.active_assignments_count>0 then 'present' else 'data_gap' end,case when m.roster_workflow_count>0 then 'present' else 'missing' end,case when m.active_assignments_count>0 then 'proven' else 'unverified' end,'verified_rls',case when m.audit_events_count>0 then 'present' else 'unverified' end,case when m.active_assignments_count>0 then 'db_proven_e2e_unverified' else 'unverified' end,case when m.music_people_count>0 and m.person_band_roles_count>0 then 'ready' else 'blocked_data' end,jsonb_build_object('services',m.services_count,'people',m.music_people_count,'person_band_roles',m.person_band_roles_count,'active_assignments',m.active_assignments_count)),
 ('sunday_operations','Sunday Operating System',case when m.services_count>0 then 'present' else 'data_gap' end,case when m.sunday_workflow_count>0 then 'present' else 'missing' end,case when m.active_assignments_count>0 and m.setlists_count>0 then 'proven' else 'partial' end,'verified_rls',case when m.audit_events_count>0 then 'present' else 'unverified' end,case when m.active_assignments_count>0 and m.setlists_count>0 then 'db_proven_e2e_unverified' else 'unverified' end,case when m.services_count>0 and m.active_assignments_count>0 then 'ready' else 'blocked_data' end,jsonb_build_object('services',m.services_count,'assignments',m.active_assignments_count,'setlists',m.setlists_count,'setlist_items',m.setlist_items_count)),
 ('content','Content: Events / Announcements / Sermons / Ministries',case when m.events_count+m.announcements_count+m.sermons_count+m.ministries_count>0 then 'present' else 'data_gap' end,'unverified','unverified','verified_rls',case when m.audit_events_count>0 then 'present' else 'unverified' end,'unverified','partial',jsonb_build_object('events',m.events_count,'announcements',m.announcements_count,'sermons',m.sermons_count,'ministries',m.ministries_count)),
 ('visitors','Visitor Operations',case when m.visitors_count>0 then 'present' else 'data_gap' end,case when m.visitor_workflow_count>0 then 'present' else 'unverified' end,'unverified','verified_rls',case when m.audit_events_count>0 then 'present' else 'unverified' end,'unverified',case when m.visitors_count>0 then 'partial' else 'blocked_data' end,jsonb_build_object('visitor_submissions',m.visitors_count)),
 ('communications','Communication Execution',case when m.communications_count>0 then 'present' else 'data_gap' end,case when m.communication_workflow_count>0 then 'present' else 'unverified' end,case when m.communications_count>0 then 'partial' else 'unverified' end,'verified_rls',case when m.audit_events_count>0 then 'present' else 'unverified' end,'unverified',case when m.communications_count>0 then 'partial' else 'blocked_data' end,jsonb_build_object('communications',m.communications_count,'active_device_tokens',m.active_device_tokens_count)),
 ('ai_operations','AI Operations / Control Plane',case when m.agents_count>0 then 'present' else 'data_gap' end,case when m.workflow_runs_count>0 then 'present' else 'partial' end,case when m.agent_runs_count>0 then 'proven' else 'unverified' end,'verified_rls',case when m.audit_events_count>0 then 'present' else 'unverified' end,case when m.agent_runs_count>0 then 'db_proven_e2e_unverified' else 'unverified' end,case when m.agents_count>0 and m.workflow_runs_count>0 then 'partial' else 'blocked_data' end,jsonb_build_object('agents',m.agents_count,'agent_runs',m.agent_runs_count,'workflow_runs',m.workflow_runs_count,'open_tasks',m.open_tasks_count)),
 ('knowledge','Institutional Memory / Knowledge',case when m.knowledge_nodes_count>0 and m.knowledge_edges_count>0 then 'present' else 'data_gap' end,case when m.memory_workflow_count>0 then 'present' else 'missing' end,case when m.knowledge_nodes_count>0 then 'partial' else 'unverified' end,'verified_rls',case when m.audit_events_count>0 then 'present' else 'unverified' end,'unverified',case when m.knowledge_nodes_count>0 and m.knowledge_edges_count>0 then 'partial' else 'blocked_schema' end,jsonb_build_object('knowledge_nodes',m.knowledge_nodes_count,'knowledge_edges',m.knowledge_edges_count))
 ) as x(domain_key,domain_name,data_status,workflow_status,mutation_status,security_status,audit_status,verification_status,ai_readiness_status,evidence) )
select row_number() over() id,domain_key,domain_name,data_status,workflow_status,mutation_status,security_status,audit_status,verification_status,ai_readiness_status,evidence from d;