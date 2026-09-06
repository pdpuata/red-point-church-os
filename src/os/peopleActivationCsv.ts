export type PeopleActivationRow = {
  external_key?: string;
  user_id?: string;
  display_name?: string;
  email?: string;
  role?: string;
  capability?: string;
  proficiency?: number | string;
  is_primary?: boolean | string;
  band_id?: string;
  is_leader?: boolean | string;
};

const headers = ['external_key','user_id','display_name','email','role','capability','proficiency','is_primary','band_id','is_leader'];

function parseLine(line: string): string[] {
  const out: string[] = []; let cell = ''; let quoted = false;
  for (let i=0;i<line.length;i++) {
    const c=line[i];
    if (c==='"') { if (quoted && line[i+1]==='"') { cell+='"'; i++; } else quoted=!quoted; }
    else if (c===',' && !quoted) { out.push(cell.trim()); cell=''; }
    else cell+=c;
  }
  out.push(cell.trim()); return out;
}

export function parsePeopleActivationCsv(csv: string): { rows: PeopleActivationRow[]; errors: string[] } {
  const lines = csv.split(/\r?\n/).map(x=>x.trim()).filter(Boolean);
  if (!lines.length) return { rows: [], errors: ['CSV is empty.'] };
  const actual = parseLine(lines[0]).map(x=>x.toLowerCase());
  const missing = ['display_name','email'].filter(h=>!actual.includes(h));
  if (missing.length) return { rows: [], errors: [`Missing required column(s): ${missing.join(', ')}`] };
  const unknown = actual.filter(h=>!headers.includes(h));
  const errors = unknown.map(h=>`Unknown column: ${h}`);
  const rows: PeopleActivationRow[] = [];
  for (let i=1;i<lines.length;i++) {
    const values=parseLine(lines[i]); const row:any={};
    actual.forEach((h,j)=>{ if (headers.includes(h)) row[h]=values[j] ?? ''; });
    if (!row.display_name && !row.email && !row.user_id) { errors.push(`Row ${i+1}: requires display_name, email or user_id.`); continue; }
    if (row.proficiency !== '' && row.proficiency !== undefined) {
      const n=Number(row.proficiency); if (!Number.isInteger(n) || n<0 || n>5) errors.push(`Row ${i+1}: proficiency must be an integer from 0 to 5.`); else row.proficiency=n;
    } else delete row.proficiency;
    for (const key of ['is_primary','is_leader']) if (row[key] !== undefined) row[key]=['true','1','yes','y'].includes(String(row[key]).toLowerCase());
    rows.push(row);
  }
  return { rows, errors };
}

export const PEOPLE_ACTIVATION_CSV_TEMPLATE = headers.join(',') + '\n' +
  'person-001,,Example Person,person@example.com,musician,vocals,3,true,,false\n';
