import React, { useEffect, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { getPeopleReconciliationReadiness, getPeopleReconciliationItems, reconcilePeopleImportRun, resolvePeopleReconciliationItem } from './os';

export default function PeopleReconciliationOS() {
  const [runs,setRuns]=useState<any[]>([]); const [items,setItems]=useState<any[]>([]); const [busy,setBusy]=useState(false); const [message,setMessage]=useState(''); const [error,setError]=useState('');
  const load=async()=>{try{setRuns(await getPeopleReconciliationReadiness());}catch(e:any){setError(e?.message||String(e));}};
  useEffect(()=>{load();},[]);
  const run=async(importRunId:string)=>{setBusy(true);setError('');setMessage('');try{const r=await reconcilePeopleImportRun(importRunId);if(!r?.ok)throw new Error(r?.reason||'Reconciliation failed');setMessage(`Reconciled: ${r.new} new · ${r.unchanged} unchanged · ${r.update} changed · ${r.conflict} conflicts · ${r.unmatched} unmatched · ${r.duplicate} possible duplicates.`);await load();setItems(await getPeopleReconciliationItems(r.reconciliation_run_id || undefined));}catch(e:any){setError(e?.message||String(e));}finally{setBusy(false);}};
  const resolve=async(id:string,resolution:'approved'|'rejected')=>{setBusy(true);setError('');try{const r=await resolvePeopleReconciliationItem(id,resolution);if(!r?.ok)throw new Error(r?.reason||'Resolution failed');setItems(await getPeopleReconciliationItems());await load();}catch(e:any){setError(e?.message||String(e));}finally{setBusy(false);}};
  return <View style={{borderWidth:1,borderColor:'#e3e3e0',borderRadius:18,padding:16,marginBottom:14}}>
    <Text style={{fontSize:18,fontWeight:'800'}}>Import Mapping & Reconciliation</Text>
    <Text style={{color:'#666',marginTop:4,lineHeight:20}}>Compares each staged import with the previous import, resolves identity deterministically, detects duplicates/conflicts, and produces a reviewable diff. It never writes church people records.</Text>
    {message?<Text style={{color:'#067647',marginTop:9,fontWeight:'700'}}>{message}</Text>:null}{error?<Text style={{color:'#B42318',marginTop:9}}>{error}</Text>:null}
    {runs.slice(0,8).map(r=><View key={r.reconciliation_run_id} style={{borderTopWidth:1,borderTopColor:'#eee',paddingVertical:10,marginTop:10}}>
      <View style={{flexDirection:'row',justifyContent:'space-between'}}><Text style={{fontWeight:'800'}}>{r.source_name}</Text><Text style={{fontWeight:'800'}}>{String(r.reconciliation_status || r.import_status).toUpperCase()}</Text></View>
      <Text style={{color:'#666',marginTop:3}}>import {r.import_run_id.slice(0,8)} · {r.new_count} new · {r.unchanged_count} unchanged · {r.update_count} changed · {r.conflict_count} conflicts · {r.reconciliation_unmatched_count} unmatched · {r.duplicate_count} duplicates · {r.pending_count} unresolved</Text>
      <Pressable disabled={busy} onPress={()=>run(r.import_run_id)} style={{borderWidth:1,borderColor:'#171717',borderRadius:10,padding:9,alignSelf:'flex-start',marginTop:8}}><Text style={{fontWeight:'800'}}>RECONCILE IMPORT</Text></Pressable>
    </View>)}
    {items.length>0?<View style={{marginTop:12}}><Text style={{fontWeight:'800'}}>Exception queue</Text>{items.filter(i=>i.resolution_status!=='approved'&&i.resolution_status!=='rejected').slice(0,12).map(i=><View key={i.id} style={{borderWidth:1,borderColor:'#eee',borderRadius:10,padding:10,marginTop:8}}><Text style={{fontWeight:'800'}}>{String(i.change_type).toUpperCase()} · {i.reasons?.[0]||'identity exception'}</Text><Text style={{color:'#666',marginTop:3}}>confidence {i.identity_confidence==null?'—':Number(i.identity_confidence).toFixed(2)}</Text><View style={{flexDirection:'row',gap:8,marginTop:8}}><Pressable disabled={busy} onPress={()=>resolve(i.id,'approved')} style={{borderWidth:1,borderColor:'#067647',borderRadius:8,padding:8}}><Text style={{fontWeight:'800'}}>APPROVE</Text></Pressable><Pressable disabled={busy} onPress={()=>resolve(i.id,'rejected')} style={{borderWidth:1,borderColor:'#B42318',borderRadius:8,padding:8}}><Text style={{fontWeight:'800'}}>REJECT</Text></Pressable></View></View>)}</View>:null}
    <Text style={{color:'#777',fontSize:12,marginTop:10}}>Mutation boundary: reconciliation → human approval → existing People Activation prepare/apply path. AI may recommend; it cannot mutate profiles.</Text>
  </View>;
}
