import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const appPath = path.join(root, 'App.tsx');
const componentImport = "import CommunicationActionPage from './src/communication/CommunicationActionPage';";

if (!fs.existsSync(appPath)) {
  throw new Error('App.tsx not found. Run this from the Red Point Church app root.');
}

let source = fs.readFileSync(appPath, 'utf8');
const original = source;

if (!source.includes(componentImport)) {
  const marker = "import ChurchOSControlTower from './src/os/ChurchOSControlTower';";
  if (!source.includes(marker)) throw new Error('Could not find the ChurchOSControlTower import marker.');
  source = source.replace(marker, `${marker}\n${componentImport}`);
}

if (!source.includes("'Communication'")) {
  const screenPattern = /type Screen = 'Home' \| ([^;]+);/;
  if (!screenPattern.test(source)) throw new Error('Could not find the Screen union.');
  source = source.replace(screenPattern, (_m, rest) => `type Screen = 'Home' | ${rest} | 'Communication';`);
}

const switchMarker = "const content=useMemo(()=>{switch(screen){";
if (!source.includes(switchMarker)) throw new Error('Could not find the main screen switch.');
if (!source.includes("case'Communication':return <CommunicationActionPage")) {
  source = source.replace(
    switchMarker,
    `${switchMarker}case'Communication':return <CommunicationActionPage title="This Sunday" dateLabel={nextSundayLabel()} timeLabel="9:00 AM" intro="We'd love to see you." meal={{ quicketUrl: communicationConfig.sundayMeal.quicketUrl, priceLabel: communicationConfig.sundayMeal.priceLabel || undefined }} rsvp={{}} info={{body:'Red Point Church meets every Sunday at 9:00 AM.\n\n80A Caversham Road / 90 Seventh Avenue, Ashley, Pinetown, KwaZulu-Natal.'}}/>;`
  );
}

if (!source.includes("import { communicationConfig } from './src/communication/config';")) {
  const marker = componentImport;
  source = source.replace(marker, `${marker}\nimport { communicationConfig } from './src/communication/config';`);
}

if (!source.includes('function nextSundayLabel()')) {
  const marker = 'function formatDate(value: string | null | undefined) {';
  if (!source.includes(marker)) throw new Error('Could not find formatDate marker.');
  const helper = `function nextSundayLabel() {\n  const d = new Date();\n  const daysUntilSunday = (7 - d.getDay()) % 7 || 7;\n  d.setDate(d.getDate() + daysUntilSunday);\n  return new Intl.DateTimeFormat('en-ZA', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(d);\n}\n\n`;
  source = source.replace(marker, helper + marker);
}

// Add a deliberately obvious Home entry point immediately inside Home's first ScrollView.
if (!source.includes('OPEN SUNDAY ACTIONS')) {
  const homeStart = source.indexOf('function Home(');
  const homeEnd = source.indexOf('\nfunction ', homeStart + 10);
  if (homeStart < 0 || homeEnd < 0) throw new Error('Could not locate the Home component boundaries.');
  const home = source.slice(homeStart, homeEnd);
  const scrollMarker = '<ScrollView contentContainerStyle={styles.content}>';
  const index = home.indexOf(scrollMarker);
  if (index < 0) throw new Error('Could not locate Home ScrollView marker.');
  const replacement = `${scrollMarker}<SectionCard eyebrow="SIMPLE ACTIONS" title="This Sunday" body="Order a meal, tell us if you are coming, or view the Sunday information." action="OPEN SUNDAY ACTIONS" onPress={()=>navigate('Communication')}/> `;
  const updatedHome = home.replace(scrollMarker, replacement);
  source = source.slice(0, homeStart) + updatedHome + source.slice(homeEnd);
}

if (source === original) {
  console.log('Communication Action Layer already installed.');
  process.exit(0);
}

fs.writeFileSync(appPath, source);
console.log('Communication Action Layer installed.');
console.log('Next: set src/communication/config.ts with the current Quicket meal URL, then run npm run typecheck.');
