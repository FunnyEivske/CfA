// scripts/deploy-webhuset.js
// Automated deployment script for Webhuset FTP
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

// Load credentials safely from git-ignored config file or environment variables
let user = process.env.WEBHUSET_FTP_USER;
let pass = process.env.WEBHUSET_FTP_PASS;
let host = process.env.WEBHUSET_FTP_HOST || 'linweb21.hmg9.webhuset.no';
let remoteRoot = process.env.WEBHUSET_FTP_ROOT || '/www';

const credPath = path.join(rootDir, 'webhuset-credentials.json');
if ((!user || !pass) && fs.existsSync(credPath)) {
  try {
    const creds = JSON.parse(fs.readFileSync(credPath, 'utf8'));
    user = user || creds.user;
    pass = pass || creds.pass;
    host = host || creds.host;
    remoteRoot = remoteRoot || creds.remoteRoot || '/www';
  } catch (e) {
    console.error('Kunne ikke lese webhuset-credentials.json:', e.message);
  }
}

if (!user || !pass) {
  console.error('❌ Mangler FTP-innlogging!');
  console.error('Opprett webhuset-credentials.json (se webhuset-credentials.example.json) eller sett WEBHUSET_FTP_USER og WEBHUSET_FTP_PASS miljøvariabler.');
  process.exit(1);
}

const AUTH = `${user}:${pass}`;
const cleanRoot = remoteRoot.startsWith('/') ? remoteRoot.slice(1) : remoteRoot;
const FTP_BASE = `ftp://${host}/${cleanRoot}`;

function uploadFile(localRelative, remoteRelative) {
  const localPath = path.join(rootDir, localRelative);
  if (!fs.existsSync(localPath)) return;
  const remoteUrl = `${FTP_BASE}/${remoteRelative.replace(/\\/g, '/')}`;
  try {
    execSync(`curl.exe -s --user "${AUTH}" -T "${localPath}" "${remoteUrl}"`, { stdio: 'inherit' });
    console.log(`✓ Uploaded: ${remoteRelative}`);
  } catch (err) {
    console.error(`✗ Failed to upload ${localRelative}:`, err.message);
  }
}

console.log('🚀 Starting deployment to Webhuset...');

// 1. Upload CSS
uploadFile('css/style.css', 'css/style.css');
uploadFile('css/style.css', 'style.css');
if (fs.existsSync(path.join(rootDir, 'css/medlem.css'))) {
  uploadFile('css/medlem.css', 'css/medlem.css');
  uploadFile('css/medlem.css', 'medlem.css');
}

// 2. Upload JS files
const jsFiles = ['script.js', 'api-client.js', 'index-events.js', 'i18n.js', 'theme-switcher.js', 'medlem-controller.js', 'feed.js', 'arrangement.js', 'profil.js'];
for (const file of jsFiles) {
  uploadFile(`js/${file}`, `js/${file}`);
  uploadFile(`js/${file}`, file);
}

// 3. Upload Backend API
if (fs.existsSync(path.join(rootDir, 'backend/api.php'))) {
  uploadFile('backend/api.php', 'backend/api.php');
}

// 4. Upload Locales
uploadFile('locales/no.json', 'locales/no.json');
uploadFile('locales/en.json', 'locales/en.json');

// 5. Upload Optimized Images
const mediaFiles = [
  'Media/Bilder/cosplay-gruppe-mobile.webp',
  'Media/Bilder/cosplay-gruppe.webp',
  'Media/Bilder/cosplay-trapp-mobile.webp',
  'Media/Bilder/cosplay-trapp.webp',
  'Media/Logo/cfa-logo.webp'
];
for (const mf of mediaFiles) {
  uploadFile(mf, mf);
}

// 6. Upload HTML Pages
const htmlFiles = [
  'index.html',
  'om-oss.html',
  'hva-skjer.html',
  'galleri.html',
  'kontakt.html',
  'bli-medlem.html',
  'profil.html',
  'medlem.html',
  'login.html',
  'app.html',
  'app-start.html'
];
for (const file of htmlFiles) {
  const pagePath = `pages/${file}`;
  uploadFile(pagePath, `pages/${file}`);
  uploadFile(pagePath, file);
}

console.log('✅ Deployment to Webhuset complete!');
