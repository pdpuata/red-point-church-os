import { execSync } from 'node:child_process';

const args = process.argv.slice(2);
const target = args[0] || 'android-preview';
const commands = {
  'android-preview': 'npx eas build --platform android --profile preview',
  'android-production': 'npx eas build --platform android --profile production',
  'ios-production': 'npx eas build --platform ios --profile production',
  'verify': 'npm run preflight && npm run release-check && npm run typecheck && npm run doctor',
};

if (!commands[target]) {
  console.error(`Unknown build target: ${target}`);
  console.error(`Available: ${Object.keys(commands).join(', ')}`);
  process.exit(1);
}

console.log(`Red Point Church V6.6 production pipeline: ${target}`);
console.log(`Running: ${commands[target]}`);
execSync(commands[target], { stdio: 'inherit' });
