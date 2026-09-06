const required = [
  'EXPO_PUBLIC_SUPABASE_URL',
  'EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY',
  'EXPO_PUBLIC_VISITOR_FUNCTION_URL',
  'EXPO_PUBLIC_REGISTER_DEVICE_FUNCTION_URL',
  'EXPO_PUBLIC_SEND_PUSH_FUNCTION_URL',
  'EXPO_PUBLIC_SYNC_YOUTUBE_FUNCTION_URL',
  'EXPO_PUBLIC_EAS_PROJECT_ID',
];
const missing = required.filter((key) => !process.env[key] || process.env[key].includes('YOUR_'));
if (missing.length) {
  console.error('\nMissing configuration:\n');
  for (const key of missing) console.error(`  - ${key}`);
  console.error('\nCopy .env.example to .env and fill in the real values.\n');
  process.exit(1);
}
console.log('Environment configuration looks complete.');
