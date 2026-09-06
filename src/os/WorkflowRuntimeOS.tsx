import React, { useEffect, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { getWorkflowRuntimeHealth, claimWorkflowDispatches, queueWorkflowDispatch } from './os';

export default function WorkflowRuntimeOS() {
  const [rows,setRows]=useState<any[]>([]); const [busy,setBusy]=useState(false); const [message,setMessage]=useState(''); const [error,setError]=useState('');
  const load=async()=>{try{setRows(await getWorkflowRuntimeHealth());}catch(e:any){setError(e?.message||String(e));}};
  useEffect(()=>{load();},[]);
  const claim=async()=>{setBusy(true);setError('');setMessage('');try{const r=await claimWorkflowDispatches(10);setMessage(`${r?.length||0} dispatch item(s) claimed. External scheduler/executor can process these safely.`);await load();}catch(e:any){setError(e?.message||String(e));}finally{setBusy(false);}};
  const queue=async(key:string)=>{setBusy(true);setError('');try{const r=await queueWorkflowDispatch(key,`manual:${key}:${new Date().toISOString()}`);setMessage(`Queued ${key}: ${String(r).slice(0,8)}.`);await load();}catch(e:any){setError(e?.message||String(e));}finally{setBusy(false);}};
  return <View style={{borderWidth:1,borderColor:'#e3e3e0',borderRadius:18,padding:16,marginBottom:14}}>
    <Text style={{fontSize:18,fontWeight:'800'}}>Workflow Runtime</Text>
    <Text style={{color:'#666',marginTop:4,lineHeight:20}}>The execution layer separates workflow definitions from scheduling and dispatch. It is deliberately safe to run repeatedly: dispatch keys are idempotent and claimed work is explicit.</Text>
    <View style={{flexDirection:'row',gap:8,flexWrap:'wrap',marginTop:12}}><Pressable disabled={busy} onPress={claim} style={{borderWidth:1,borderColor:'#171717',borderRadius:10,padding:10}}><Text style={{fontWeight:'800'}}>CLAIM READY WORK</Text></Pressable></View>
    {message?<Text style={{color:'#067647',marginTop:9,fontWeight:'700'}}>{message}</Text>:null}{error?<Text style={{color:'#B42318',marginTop:9}}>{error}</Text>:null}
    {rows.map(r=><View key={r.id} style={{borderTopWidth:1,borderTopColor:'#eee',paddingVertical:10,marginTop:10}}><View style={{flexDirection:'row',justifyContent:'space-between'}}><Text style={{fontWeight:'800'}}>{r.name}</Text><Text style={{fontWeight:'800'}}>{r.enabled?'ENABLED':'DISABLED'}</Text></View><Text style={{color:'#666',marginTop:3}}>{r.automation_level} · {r.enabled_schedules} schedules · {r.pending_dispatches} pending · last run {r.last_run_at?new Date(r.last_run_at).toLocaleString():'—'}</Text>{r.enabled?<Pressable disabled={busy} onPress={()=>queue(r.key)} style={{borderWidth:1,borderColor:'#171717',borderRadius:8,padding:8,alignSelf:'flex-start',marginTop:7}}><Text style={{fontWeight:'800'}}>QUEUE TEST DISPATCH</Text></Pressable>:null}</View>)}
    <Text style={{color:'#777',fontSize:12,marginTop:10}}>Human/AI safety boundary: runtime dispatches work; it does not grant an agent permission to mutate arbitrary church data.</Text>
  </View>;
}
