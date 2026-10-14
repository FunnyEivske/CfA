// scripts/download-artcraft.mjs
// Plattformuavhengig Node.js-skript for automatisk nedlasting og utpakking
// av de 9 ArtCraft WebAssembly-appene fra storytold-releases på GitHub,
// samt generering av public/artcraft/releases.json med direkte Desktop-nedlastingslenker.

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import AdmZip from 'adm-zip';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

export const APPS = [
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
  'User-Agent': 'CfA-ArtCraft-Downloader/2.0',
  'Accept': 'application/vnd.github.v3+json'
};
if (process.env.GITHUB_TOKEN) {
  GITHUB_HEADERS['Authorization'] = `token ${process.env.GITHUB_TOKEN}`;
}

const forceDownload = process.argv.includes('--force');
const withInstallers = process.argv.includes('--installers') || process.argv.includes('--all');

export function filterAssets(assets = [], appName = '') {
  const isWeb = a => a.name.toLowerCase().includes('web') && a.name.endsWith('.zip');
  const isWin = a => (a.name.endsWith('.msi') || a.name.endsWith('.exe') || /windows|win64|pc-windows-msvc/i.test(a.name)) && !a.name.endsWith('.sha256') && !a.name.endsWith('.zsync');
  const isMac = a => (a.name.endsWith('.dmg') || a.name.endsWith('.pkg') || /macos|darwin|apple/i.test(a.name)) && !a.name.includes('-cli-') && !a.name.endsWith('.sha256');
  const isLinux = a => (a.name.endsWith('.AppImage') || a.name.endsWith('.deb') || /linux|unknown-linux-gnu/i.test(a.name)) && !a.name.endsWith('.sha256') && !a.name.endsWith('.zsync');

  const webAsset = assets.find(isWeb);
  const winAssets = assets.filter(isWin);
  const macAssets = assets.filter(isMac);
  const linuxAssets = assets.filter(isLinux);

  const primaryWin = winAssets.find(a => a.name.endsWith('.msi') && /x64/i.test(a.name))
    || winAssets.find(a => a.name.endsWith('.msi'))
    || winAssets.find(a => a.name.endsWith('.exe'))
    || winAssets[0];

  const primaryMac = macAssets.find(a => a.name.endsWith('.dmg') && /universal/i.test(a.name))
    || macAssets.find(a => a.name.endsWith('.dmg'))
    || macAssets[0];

  const primaryLinux = linuxAssets.find(a => a.name.endsWith('.AppImage') && /x86_64/i.test(a.name))
    || linuxAssets.find(a => a.name.endsWith('.AppImage'))
    || linuxAssets.find(a => a.name.endsWith('.deb') && /x86_64/i.test(a.name))
    || linuxAssets[0];

  const serverEndpoint = (os) => `/backend/api.php?action=download_artcraft_installer&app=${appName}&os=${os}`;
  const localUrl = (os, filename) => `/artcraft/downloads/${appName}/${filename}`;

  return {
    web: webAsset ? { name: webAsset.name, url: webAsset.browser_download_url, size: webAsset.size } : null,
    windows: primaryWin ? {
      name: primaryWin.name,
      url: primaryWin.browser_download_url,
      local_url: localUrl('windows', primaryWin.name),
      server_endpoint: serverEndpoint('windows'),
      github_url: primaryWin.browser_download_url,
      size: primaryWin.size,
      format: primaryWin.name.endsWith('.msi') ? 'MSI' : (primaryWin.name.endsWith('.exe') ? 'EXE' : 'ZIP'),
      all: winAssets.map(a => ({ name: a.name, url: a.browser_download_url, size: a.size }))
    } : null,
    macos: primaryMac ? {
      name: primaryMac.name,
      url: primaryMac.browser_download_url,
      local_url: localUrl('macos', primaryMac.name),
      server_endpoint: serverEndpoint('macos'),
      github_url: primaryMac.browser_download_url,
      size: primaryMac.size,
      format: primaryMac.name.endsWith('.dmg') ? 'DMG' : (primaryMac.name.endsWith('.pkg') ? 'PKG' : 'ZIP'),
      all: macAssets.map(a => ({ name: a.name, url: a.browser_download_url, size: a.size }))
    } : null,
    linux: primaryLinux ? {
      name: primaryLinux.name,
      url: primaryLinux.browser_download_url,
      local_url: localUrl('linux', primaryLinux.name),
      server_endpoint: serverEndpoint('linux'),
      github_url: primaryLinux.browser_download_url,
      size: primaryLinux.size,
      format: primaryLinux.name.endsWith('.AppImage') ? 'AppImage' : (primaryLinux.name.endsWith('.deb') ? 'DEB' : 'TAR'),
      all: linuxAssets.map(a => ({ name: a.name, url: a.browser_download_url, size: a.size }))
    } : null
  };
}

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
  const publishedAt = release.published_at || new Date().toISOString();
  const assets = release.assets || [];

  const downloads = filterAssets(assets, app.name);

  // Hvis --installers er angitt, last ned ekte desktop-installatører til artcraft/downloads/<app>/
  if (withInstallers) {
    const downloadsDir = path.join(rootDir, 'artcraft', 'downloads', app.name);
    const pubDownloadsDir = path.join(rootDir, 'public', 'artcraft', 'downloads', app.name);
    fs.mkdirSync(downloadsDir, { recursive: true });
    fs.mkdirSync(pubDownloadsDir, { recursive: true });

    const toDownload = [
      { os: 'windows', asset: downloads.windows },
      { os: 'macos', asset: downloads.macos },
      { os: 'linux', asset: downloads.linux }
    ];

    for (const item of toDownload) {
      if (!item.asset || !item.asset.github_url) continue;
      const targetFile = path.join(downloadsDir, item.asset.name);
      const pubTargetFile = path.join(pubDownloadsDir, item.asset.name);

      if (fs.existsSync(targetFile) && !forceDownload) {
        console.log(`  ✓ Installatør for ${item.os} (${item.asset.name}) finnes allerede lokalt.`);
        continue;
      }

      console.log(`  ⬇️ Laster ned ${item.os}-installatør for ${app.title} (${item.asset.name})...`);
      try {
        const dlRes = await fetch(item.asset.github_url, {
          headers: { 'User-Agent': GITHUB_HEADERS['User-Agent'] }
        });
        if (dlRes.ok) {
          const buffer = Buffer.from(await dlRes.arrayBuffer());
          fs.writeFileSync(targetFile, buffer);
          fs.writeFileSync(pubTargetFile, buffer);
          console.log(`  ✨ Lagret ${item.asset.name} til artcraft/downloads/${app.name}/`);
        } else {
          console.warn(`  ⚠️ Feil ved nedlasting av ${item.asset.name}: ${dlRes.status}`);
        }
      } catch (dlErr) {
        console.warn(`  ⚠️ Kunne ikke laste ned ${item.asset.name}: ${dlErr.message}`);
      }
    }
  }

  const releaseMeta = {
    name: app.name,
    title: app.title,
    tag_name: tagName,
    published_at: publishedAt,
    downloads: downloads
  };

  const webAsset = downloads.web;
  if (!webAsset) {
    console.warn(`⚠️ Fant ingen '-web-*.zip'-pakke for ${app.title} under ${tagName}. Hopper over utpakking.`);
    return releaseMeta;
  }

  // Sjekk om appen allerede er lastet ned og oppdatert
  if (!forceDownload && fs.existsSync(indexHtml) && fs.existsSync(versionFile)) {
    const currentVer = fs.readFileSync(versionFile, 'utf8').trim();
    if (currentVer === tagName) {
      console.log(`✅ ${app.title} web-versjon er allerede oppdatert (${tagName}).`);
      return releaseMeta;
    }
  }

  console.log(`⬇️ Laster ned ${webAsset.name} (${(webAsset.size / 1024 / 1024).toFixed(2)} MB)...`);
  const downloadRes = await fetch(webAsset.url, {
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
  return releaseMeta;
}

async function main() {
  console.log('==================================================');
  console.log('🎨 CfA ArtCraft WebAssembly & Desktop Downloader');
  console.log('==================================================');

  // Sørg for at kataloger eksisterer
  fs.mkdirSync(path.join(rootDir, 'artcraft'), { recursive: true });
  fs.mkdirSync(path.join(rootDir, 'public', 'artcraft'), { recursive: true });

  const htaccessContent = `# ArtCraft WebAssembly Hosting Config
Options -Indexes
DirectoryIndex index.html
AddType application/wasm .wasm

<IfModule mod_rewrite.c>
    RewriteEngine Off
</IfModule>

<IfModule mod_headers.c>
    Header set Cross-Origin-Opener-Policy "same-origin"
    Header set Cross-Origin-Embedder-Policy "require-corp"
</IfModule>
`;
  fs.writeFileSync(path.join(rootDir, 'artcraft', '.htaccess'), htaccessContent, 'utf8');
  fs.writeFileSync(path.join(rootDir, 'public', 'artcraft', '.htaccess'), htaccessContent, 'utf8');

  const allReleases = {};
  let successCount = 0;

  for (const app of APPS) {
    try {
      const meta = await downloadAndExtractApp(app);
      if (meta) {
        allReleases[app.name] = meta;
        successCount++;
      }
    } catch (err) {
      console.error(`❌ Feil ved håndtering av ${app.title}:`, err.message);
    }
  }

  // Skriv komplett releases.json til public/artcraft/ og artcraft/
  const releasesPayload = {
    updated_at: new Date().toISOString(),
    apps: allReleases
  };

  const releasesJsonStr = JSON.stringify(releasesPayload, null, 2);
  const pubReleasesPath = path.join(rootDir, 'public', 'artcraft', 'releases.json');
  const artReleasesPath = path.join(rootDir, 'artcraft', 'releases.json');
  fs.writeFileSync(pubReleasesPath, releasesJsonStr, 'utf8');
  fs.writeFileSync(artReleasesPath, releasesJsonStr, 'utf8');

  // Hvis member-app/www eksisterer, synk releases dit også
  const memberAppReleases = path.join(rootDir, 'member-app', 'www', 'artcraft', 'releases.json');
  if (fs.existsSync(path.join(rootDir, 'member-app', 'www'))) {
    fs.mkdirSync(path.dirname(memberAppReleases), { recursive: true });
    fs.writeFileSync(memberAppReleases, releasesJsonStr, 'utf8');
  }

  console.log('\n==================================================');
  console.log(`📄 releases.json lagret til:`);
  console.log(`   - public/artcraft/releases.json`);
  console.log(`   - artcraft/releases.json`);
  console.log(`🎉 ArtCraft-synkronisering fullført: ${successCount}/${APPS.length} apper klare.`);
  console.log('==================================================\n');
}

main().catch(err => {
  console.error('Fatal feil i download-artcraft:', err);
  process.exit(1);
});
