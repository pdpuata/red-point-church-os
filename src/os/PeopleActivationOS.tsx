import React, { useState } from 'react';
import { parsePeopleActivationCsv, PEOPLE_ACTIVATION_CSV_TEMPLATE } from './peopleActivationCsv';
import { Pressable, Text, TextInput, View } from 'react-native';
import { applyPeopleActivation, getPeopleActivationPreview, normalizePeopleImport, preparePeopleActivation } from './os';

export default function PeopleActivationOS() {
  const [input, setInput] = useState('[\n  {\n    "display_name": "Example Person",\n    "email": "person@example.com",\n    "role": "musician",\n    "capability": "vocals",\n    "proficiency": 3,\n    "is_primary": true\n  }\n]');
  const [batch, setBatch] = useState<any>(null);
  const [preview, setPreview] = useState<any[]>([]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [mode, setMode] = useState<'json'|'csv'>('json');

  const normalize = async () => {
    setBusy(true); setError(''); setMessage('');
    try {
      let rows: any[];
      if (mode === 'csv') {
        const parsed = parsePeopleActivationCsv(input);
        if (parsed.errors.length) throw new Error(parsed.errors.join('\n'));
        rows = parsed.rows;
      } else {
        rows = JSON.parse(input);
        if (!Array.isArray(rows)) throw new Error('JSON must be an array of people.');
      }
      const result = await normalizePeopleImport(rows);
      if (!result?.ok) throw new Error(result?.error || 'AI normalization failed');
      setInput(JSON.stringify(result.rows, null, 2));
      setMode('json');
      const warningCount = (result.global_warnings || []).length + result.rows.reduce((n:any,r:any)=>n+(r.warnings||[]).length,0);
      setMessage(`${result.configured ? 'AI' : 'Deterministic'} normalization complete: ${result.rows.length} row(s), ${warningCount} warning(s). Review before preparing.`);
    } catch (e:any) { setError(e?.message || String(e)); }
    finally { setBusy(false); }
  };

  const prepare = async () => {
    setBusy(true); setError(''); setMessage('');
    try {
      let rows: any[];
      if (mode === 'csv') {
        const parsed = parsePeopleActivationCsv(input);
        if (parsed.errors.length) throw new Error(parsed.errors.join('\n'));
        rows = parsed.rows;
      } else {
        rows = JSON.parse(input);
        if (!Array.isArray(rows)) throw new Error('JSON must be an array of people.');
      }
      const result = await preparePeopleActivation(rows, mode === 'csv' ? 'csv_import' : 'people_activation_ui');
      if (!result?.ok) throw new Error(result?.reason || 'Preparation failed');
      setBatch(result);
      setPreview(await getPeopleActivationPreview(result.batch_id));
      setMessage(`Prepared ${result.rows} row(s): ${result.matched} matched, ${result.unmatched} unmatched.`);
    } catch (e:any) { setError(e?.message || String(e)); }
    finally { setBusy(false); }
  };

  const apply = async () => {
    if (!batch?.batch_id) return;
    setBusy(true); setError('');
    try {
      const result = await applyPeopleActivation(batch.batch_id);
      if (!result?.ok) throw new Error(result?.reason || 'Apply failed');
      setMessage(`Applied ${result.applied} row(s); ${result.errors} error(s).`);
      setPreview(await getPeopleActivationPreview(batch.batch_id));
    } catch (e:any) { setError(e?.message || String(e)); }
    finally { setBusy(false); }
  };

  return <View style={{ borderWidth: 1, borderColor: '#e3e3e0', borderRadius: 18, padding: 16, marginBottom: 14 }}>
    <Text style={{ fontSize: 18, fontWeight: '800' }}>People Activation Pipeline</Text>
    <Text style={{ color:'#666', marginTop:4, lineHeight:20 }}>Prepare real church people data before it mutates the operating graph. Import JSON or CSV, optionally normalize it with AI, then review and match it. AI may normalize obvious variants but never invents identity or organisational facts.</Text>
    <View style={{flexDirection:'row',gap:8,marginTop:12}}>
      {(['json','csv'] as const).map(x=><Pressable key={x} onPress={()=>{setMode(x); setError('');}} style={{borderWidth:1,borderColor:mode===x?'#171717':'#ddd',borderRadius:9,paddingVertical:8,paddingHorizontal:12}}><Text style={{fontWeight:'800'}}>{x.toUpperCase()}</Text></Pressable>)}
      {mode==='csv' ? <Pressable onPress={()=>setInput(PEOPLE_ACTIVATION_CSV_TEMPLATE)} style={{borderWidth:1,borderColor:'#ddd',borderRadius:9,paddingVertical:8,paddingHorizontal:12}}><Text style={{fontWeight:'700'}}>LOAD TEMPLATE</Text></Pressable> : null}
    </View>
    <TextInput multiline value={input} onChangeText={setInput} autoCapitalize='none' style={{ borderWidth:1,borderColor:'#ccc',borderRadius:10,padding:11,minHeight:180,marginTop:10,fontFamily:'monospace' }} />
    <Pressable disabled={busy} onPress={normalize} style={{ marginTop:10,borderWidth:1,borderColor:'#171717',borderRadius:11,padding:12,alignItems:'center',opacity:busy?.55:1 }}><Text style={{fontWeight:'800'}}>{busy?'NORMALIZING…':'AI NORMALIZE IMPORT'}</Text></Pressable>
    <Pressable disabled={busy} onPress={prepare} style={{ marginTop:8,backgroundColor:'#171717',borderRadius:11,padding:12,alignItems:'center',opacity:busy?.55:1 }}><Text style={{color:'#fff',fontWeight:'800'}}>{busy?'PREPARING…':'PREPARE & MATCH PEOPLE'}</Text></Pressable>
    {error ? <Text style={{color:'#B42318',marginTop:9}}>{error}</Text> : null}
    {message ? <Text style={{color:'#067647',marginTop:9,fontWeight:'700'}}>{message}</Text> : null}
    {preview.length > 0 ? <View style={{marginTop:12}}>
      {preview.map((x:any)=><View key={x.id} style={{borderTopWidth:1,borderTopColor:'#eee',paddingVertical:9}}>
        <Text style={{fontWeight:'800'}}>{x.display_name || x.external_key || 'Unnamed'} · {String(x.status).toUpperCase()}</Text>
        <Text style={{color:'#666',marginTop:3}}>{x.matched_display_name ? `Matched: ${x.matched_display_name}` : 'No existing profile match'} · {x.role || 'no role'} · {x.capability || 'no capability'}</Text>
      </View>)}
      {batch?.matched > 0 ? <Pressable disabled={busy} onPress={apply} style={{marginTop:10,borderWidth:1,borderColor:'#171717',borderRadius:11,padding:12,alignItems:'center'}}><Text style={{fontWeight:'800'}}>{busy?'APPLYING…':'APPLY MATCHED ROWS'}</Text></Pressable> : null}
      <Text style={{color:'#777',fontSize:12,marginTop:9}}>Human approval boundary: preparation can be repeated; application is an explicit admin action and is audited.</Text>
    </View> : null}
  </View>;
}
