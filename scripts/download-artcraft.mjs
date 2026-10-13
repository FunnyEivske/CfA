// scripts/download-artcraft.mjs
// Plattformuavhengig Node.js-skript for automatisk nedlasting og utpakking
// av de 9 ArtCraft WebAssembly-appene fra storytold-releases på GitHub.

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import AdmZip from 'adm-zip';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const APPS = [
  { name: 'photocraft', title: 'PhotoCraft', desc: 'Bilderedigering, lag og retusjering' },
  { name: 'vectorcraft', title: 'VectorCraft', desc: 'Vektorgrafikk og mønsterdesign' },
  { name: 'filmcraft', title: 'FilmCraft', desc: 'Tidslinjebasert videoredigering' },
  { name: 'lightcraft', title: 'LightCraft', desc: 'RAW-fremkalling og fargekorrigering' },
  { name: 'pdfcraft', title: 'PdfCraft', desc: 'Vise, redigere og slå sammen PDF-mønstre' },
  { name: 'effectcraft', title: 'EffectCraft', desc: 'Visuelle effekter og animasjon' },
  { name: 'designcraft', title: 'DesignCraft', desc: 'Sideoppsett, plakater og hefter' },
  { name: 'figcraft', title: 'FigCraft', desc: 'UI/UX-design og prototyping' },
  { name: 'soundcraft', title: 'SoundCraft', desc: 'Lydopptak, miksing og redigering' }
];

const GITHUB_HEADERS = {
  'User-Agent': 'CfA-ArtCraft-Downloader/1.0',
  'Accept': 'application/vnd.github.v3+json'
};
if (process.env.GITHUB_TOKEN) {
  GITHUB_HEADERS['Authorization'] = `token ${process.env.GITHUB_TOKEN}`;
}

const forceDownload = process.argv.includes('--force');

async function downloadAndExtractApp(app) {
  const artcraftDest = path.join(rootDir, 'artcraft', app.name);
  const publicDest = path.join(rootDir, 'public', 'artcraft', app.name);
  const versionFile = path.join(artcraftDest, '.version');
  const indexHtml = path.join(artcraftDest, 'index.html');

  console.log(`\n🔍 Undersøker ${app.title} (storytold/${app.name})...`);

  // 1. Hent siste release-info fra GitHub API
  const apiUrl = `https://api.github.com/repos/storytold/${app.name}/releases/latest`;
  const res = await fetch(apiUrl, { headers: GITHUB_HEADERS });
  if (!res.ok) {
    throw new Error(`GitHub API feilet for ${app.name} (${res.status} ${res.statusText})`);
  }
  const release = await res.json();
  const tagName = release.tag_name || 'latest';

  // 2. Finn web zip-filen (inneholder -web- og slutter på .zip)
  const assets = release.assets || [];
  const webAsset = assets.find(a => a.name.includes('-web-') && a.name.endsWith('.zip'));

  if (!webAsset) {
    console.warn(`⚠️ Fant ingen '-web-*.zip'-pakke for ${app.title} under ${tagName}. Hopper over.`);
    return;
  }

  // 3. Sjekk om appen allerede er lastet ned og oppdatert
  if (!forceDownload && fs.existsSync(indexHtml) && fs.existsSync(versionFile)) {
    const currentVer = fs.readFileSync(versionFile, 'utf8').trim();
    if (currentVer === tagName) {
      console.log(`✅ ${app.title} er allerede oppdatert (${tagName}).`);
      return;
    }
  }

  console.log(`⬇️ Laster ned ${webAsset.name} (${(webAsset.size / 1024 / 1024).toFixed(2)} MB)...`);
  const downloadRes = await fetch(webAsset.browser_download_url, {
    headers: { 'User-Agent': GITHUB_HEADERS['User-Agent'] }
  });
  if (!downloadRes.ok) {
    throw new Error(`Kunne ikke laste ned ${webAsset.name}: ${downloadRes.status} ${downloadRes.statusText}`);
  }

  const arrayBuffer = await downloadRes.arrayBuffer();
  const zipBuffer = Buffer.from(arrayBuffer);

  console.log(`📦 Pakker ut ${app.title} til artcraft/${app.name}/ og public/artcraft/${app.name}/...`);
  const zip = new AdmZip(zipBuffer);
  const entries = zip.getEntries();

  // Detekter om arkivet har en rotmappe (f.eks. photocraft-web-0.8.2/)
  let topFolder = '';
  if (entries.length > 0) {
    const firstPath = entries[0].entryName.replace(/\\/g, '/');
    const slashIdx = firstPath.indexOf('/');
    if (slashIdx > 0) {
      const candidate = firstPath.slice(0, slashIdx + 1);
      const allInside = entries.every(e => {
        const norm = e.entryName.replace(/\\/g, '/');
        return norm.startsWith(candidate) || norm === candidate.slice(0, -1);
      });
      if (allInside) {
        topFolder = candidate;
      }
    }
  }

  for (const entry of entries) {
    if (entry.isDirectory) continue;
    let relPath = entry.entryName.replace(/\\/g, '/');
    if (topFolder && relPath.startsWith(topFolder)) {
      relPath = relPath.slice(topFolder.length);
    }
    if (!relPath) continue;

    const fileBuffer = entry.getData();

    // 1. Skriv til artcraft/<app>/
    const target1 = path.join(artcraftDest, relPath);
    fs.mkdirSync(path.dirname(target1), { recursive: true });
    fs.writeFileSync(target1, fileBuffer);

    // 2. Skriv til public/artcraft/<app>/
    const target2 = path.join(publicDest, relPath);
    fs.mkdirSync(path.dirname(target2), { recursive: true });
    fs.writeFileSync(target2, fileBuffer);
  }

  // Lagre versjonsmerke
  fs.writeFileSync(versionFile, tagName, 'utf8');
  const pubVersion = path.join(publicDest, '.version');
  fs.writeFileSync(pubVersion, tagName, 'utf8');

  console.log(`✨ Fullført ${app.title} (${tagName})!`);
}

async function main() {
  console.log('==================================================');
  console.log('🎨 CfA ArtCraft WebAssembly Downloader');
  console.log('==================================================');

  // Sørg for at rot- og public-kataloger eksisterer
  fs.mkdirSync(path.join(rootDir, 'artcraft'), { recursive: true });
  fs.mkdirSync(path.join(rootDir, 'public', 'artcraft'), { recursive: true });

  // Opprett .htaccess for artcraft-katalogen for COOP/COEP WebAssembly-støtte
  const htaccessContent = `# ArtCraft WebAssembly Hosting Config
Options -Indexes
AddType application/wasm .wasm

<IfModule mod_headers.c>
    Header set Cross-Origin-Opener-Policy "same-origin"
    Header set Cross-Origin-Embedder-Policy "require-corp"
</IfModule>
`;
  fs.writeFileSync(path.join(rootDir, 'artcraft', '.htaccess'), htaccessContent, 'utf8');
  fs.writeFileSync(path.join(rootDir, 'public', 'artcraft', '.htaccess'), htaccessContent, 'utf8');

  let successCount = 0;
  for (const app of APPS) {
    try {
      await downloadAndExtractApp(app);
      successCount++;
    } catch (err) {
      console.error(`❌ Feil ved nedlasting av ${app.title}:`, err.message);
    }
  }

  console.log('\n==================================================');
  console.log(`🎉 ArtCraft-synkronisering fullført: ${successCount}/${APPS.length} apper klare.`);
  console.log('==================================================\n');
}

main().catch(err => {
  console.error('Fatal feil i download-artcraft:', err);
  process.exit(1);
});
