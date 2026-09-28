import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const envPath = path.join(root, '.env');
const examplePath = path.join(root, '.env.example');
const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
const app = JSON.parse(fs.readFileSync(path.join(root, 'app.json'), 'utf8'));
const firebasePath = path.join(root, 'google-services.json');
let firebasePackage = null;
let firebaseReadable = false;
if (fs.existsSync(firebasePath)) {
  try {
    const firebase = JSON.parse(fs.readFileSync(firebasePath, 'utf8'));
    firebasePackage = firebase?.client?.map(c => c?.client_info?.android_client_info?.package_name).find(Boolean) || null;
    firebaseReadable = true;
  } catch {
    firebaseReadable = false;
  }
}

const required = [
  'EXPO_PUBLIC_SUPABASE_URL',
  'EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY'
];

function readEnv(file) {
  if (!fs.existsSync(file)) return {};
  const out = {};
  for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !m[1].startsWith('#')) out[m[1]] = m[2].replace(/^['"]|['"]$/g, '');
  }
  return out;
}

const env = readEnv(envPath);
const example = readEnv(examplePath);
const placeholder = /YOUR_|your_project|example\.com/i;
const checks = [];
checks.push(['.env.example contains all required keys', required.every(k => Object.hasOwn(example, k)), required.filter(k => !Object.hasOwn(example, k)).join(', ') || 'all present']);
checks.push(['.env is git-ignored', fs.existsSync(path.join(root, '.gitignore')) && fs.readFileSync(path.join(root, '.gitignore'), 'utf8').split(/\r?\n/).includes('.env'), 'keep production secrets out of source control']);
checks.push(['production version aligned', pkg.version === app.expo?.version && app.expo?.ios?.bundleIdentifier === 'com.redpointchurch.app' && app.expo?.android?.package === 'com.redpointchurch.app', `version ${pkg.version}, stable bundle/package identifiers`]);
checks.push(['Android Firebase client file present', fs.existsSync(firebasePath) && firebaseReadable, fs.existsSync(firebasePath) ? (firebaseReadable ? 'google-services.json is valid JSON' : 'google-services.json could not be parsed') : 'google-services.json missing']);
checks.push(['Android Firebase package matches Church app', firebasePackage === 'com.redpointchurch.app', firebasePackage ? `found ${firebasePackage}; expected com.redpointchurch.app` : 'no Android Firebase package found']);
checks.push(['Expo points to Android Firebase config', app.expo?.android?.googleServicesFile === './google-services.json', app.expo?.android?.googleServicesFile || 'android.googleServicesFile is not configured']);
if (fs.existsSync(envPath)) {
  const missing = required.filter(k => !env[k] || placeholder.test(env[k]));
  checks.push(['local .env has real production values', missing.length === 0, missing.length ? `missing/placeholders: ${missing.join(', ')}` : 'all required values look configured']);
} else if (process.env.CI) {
  checks.push(['CI does not require developer-local .env', true, 'native production values are supplied by the configured EAS environment']);
} else {
  checks.push(['local .env has real production values', false, '.env not found — copy .env.example to .env and fill real values']);
}

let failed = false;
console.log(`Red Point Church production config check - v${pkg.version}`);
for (const [name, ok, detail] of checks) {
  console.log(`${ok ? 'PASS' : 'FAIL'} - ${name} - ${detail}`);
  if (!ok) failed = true;
}
process.exit(failed ? 1 : 0);
