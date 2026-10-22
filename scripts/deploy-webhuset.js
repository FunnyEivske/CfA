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
    user = user || (creds.ftp && creds.ftp.username) || creds.user || creds.username;
    pass = pass || (creds.ftp && creds.ftp.password) || creds.pass || creds.password;
    host = host || (creds.ftp && creds.ftp.server) || creds.host || creds.server;
    remoteRoot = remoteRoot || (creds.ftp && creds.ftp.remote_root) || creds.remoteRoot || '/www';
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
    execSync(`curl.exe -s --ftp-create-dirs --user "${AUTH}" -T "${localPath}" "${remoteUrl}"`, { stdio: 'inherit' });
    console.log(`✓ Uploaded: ${remoteRelative}`);
  } catch (err) {
    console.error(`✗ Failed to upload ${localRelative}:`, err.message);
  }
}

function uploadDirRecursive(localDir, remoteDir) {
  const fullLocalDir = path.join(rootDir, localDir);
  if (!fs.existsSync(fullLocalDir)) return;
  const entries = fs.readdirSync(fullLocalDir, { withFileTypes: true });
  for (const entry of entries) {
    const subLocal = path.join(localDir, entry.name);
    const subRemote = `${remoteDir}/${entry.name}`;
    if (entry.isDirectory()) {
      uploadDirRecursive(subLocal, subRemote);
    } else {
      uploadFile(subLocal, subRemote);
    }
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
const jsFiles = ['script.js', 'api-client.js', 'index-events.js', 'i18n.js', 'theme-switcher.js', 'medlem-controller.js', 'creative-tools.js', 'feed.js', 'arrangement.js', 'profil.js', 'cookie-consent.js'];
for (const file of jsFiles) {
  uploadFile(`js/${file}`, `js/${file}`);
  uploadFile(`js/${file}`, file);
}

// 3. Upload Backend API & Config
if (fs.existsSync(path.join(rootDir, 'backend/api.php'))) {
  uploadFile('backend/api.php', 'backend/api.php');
}
if (fs.existsSync(path.join(rootDir, 'backend/config.php'))) {
  uploadFile('backend/config.php', 'backend/config.php');
}

// 4. Upload Locales
uploadFile('locales/no.json', 'locales/no.json');
uploadFile('locales/en.json', 'locales/en.json');

// 5. Upload Optimized Images
const mediaFiles = [
  'Media/Bilder/cosplay-gruppe-mobile.webp',
  'Media/Bilder/cosplay-gruppe.webp',
  'Media/Bilder/cosplay-gruppe.jpg',
  'Media/Bilder/cosplay-trapp-mobile.webp',
  'Media/Bilder/cosplay-trapp.webp',
  'Media/Bilder/cosplay-trapp.jpg',
  'Media/Logo/cfa-logo.webp',
  'Media/Logo/cfa-logo.png',
  'Media/Logo/icon-192.png',
  'Media/Logo/logo-farge.svg',
  'Media/Logo/logo-farge.pdf',
  'Media/Logo/logo-farge.png',
  'Media/Logo/cfa-logo.svg',
  'Media/Logo/cfa-logo.jpg',
  'cfa-logopakke.zip'
];
for (const mf of mediaFiles) {
  if (fs.existsSync(path.join(rootDir, mf))) {
    uploadFile(mf, mf);
  }
}

// Upload ArtCraft Icons
if (fs.existsSync(path.join(rootDir, 'Media/artcraft-icons'))) {
  console.log('🎨 Uploading ArtCraft Icons...');
  uploadDirRecursive('Media/artcraft-icons', 'Media/artcraft-icons');
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
  'creative-tools.html',
  'personvern.html',
  'vilkar.html',
  'app.html',
  'app-start.html'
];
for (const file of htmlFiles) {
  const pagePath = `pages/${file}`;
  uploadFile(pagePath, `pages/${file}`);
  uploadFile(pagePath, file);
}

// 7. Upload .htaccess, metadata, SEO & AI discoverability files
uploadFile('.htaccess', '.htaccess');
if (fs.existsSync(path.join(rootDir, 'favicon.ico'))) {
  uploadFile('favicon.ico', 'favicon.ico');
}
if (fs.existsSync(path.join(rootDir, 'manifest.json'))) {
  uploadFile('manifest.json', 'manifest.json');
}
if (fs.existsSync(path.join(rootDir, 'service-worker.js'))) {
  uploadFile('service-worker.js', 'service-worker.js');
}

const seoMetaFiles = [
  'sitemap.xml',
  'robots.txt',
  'ai.txt',
  'llms.txt',
  'ads.txt',
  'humans.txt',
  'security.txt',
  '.well-known/security.txt'
];
for (const smf of seoMetaFiles) {
  const localPath = `seo/${smf}`;
  if (fs.existsSync(path.join(rootDir, localPath))) {
    uploadFile(localPath, localPath);
    uploadFile(localPath, smf);
  }
}

// 8. Upload Merkeverktøy
console.log('🎨 Uploading Merkeverktøy suite...');
uploadDirRecursive('merkeverktoy', 'merkeverktoy');

// 9. Upload ArtCraft Suite
if (fs.existsSync(path.join(rootDir, 'artcraft'))) {
  console.log('✨ Uploading ArtCraft (Kreative Verktøy) suite...');
  uploadDirRecursive('artcraft', 'artcraft');
}

console.log('✅ Deployment to Webhuset complete!');
