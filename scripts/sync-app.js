// scripts/sync-app.js
// Synchronizes website frontend and member portal assets into the standalone native member app (iOS & Android)
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const appWwwDir = path.resolve(rootDir, 'member-app', 'www');

console.log('🔄 Syncing website assets to Member App (iOS & Android)...');

function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function copyFile(src, dest) {
  if (fs.existsSync(src)) {
    ensureDir(path.dirname(dest));
    fs.copyFileSync(src, dest);
  }
}

function copyDirRecursive(src, dest) {
  if (!fs.existsSync(src)) return;
  ensureDir(dest);
  const entries = fs.readdirSync(src, { withFileTypes: true });
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDirRecursive(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

// 1. Ensure target directories
ensureDir(appWwwDir);
ensureDir(path.join(appWwwDir, 'css'));
ensureDir(path.join(appWwwDir, 'js'));
ensureDir(path.join(appWwwDir, 'locales'));
ensureDir(path.join(appWwwDir, 'Media'));

// 2. Sync CSS
copyFile(path.join(rootDir, 'css', 'style.css'), path.join(appWwwDir, 'css', 'style.css'));
if (fs.existsSync(path.join(rootDir, 'css', 'medlem.css'))) {
  copyFile(path.join(rootDir, 'css', 'medlem.css'), path.join(appWwwDir, 'css', 'medlem.css'));
}

// 3. Sync JavaScript
const jsFiles = [
  'script.js',
  'api-client.js',
  'medlem-controller.js',
  'feed.js',
  'arrangement.js',
  'profil.js',
  'i18n.js',
  'theme-switcher.js',
  'index-events.js',
  'cookie-consent.js'
];
for (const file of jsFiles) {
  copyFile(path.join(rootDir, 'js', file), path.join(appWwwDir, 'js', file));
}

// 4. Sync Locales
copyFile(path.join(rootDir, 'locales', 'no.json'), path.join(appWwwDir, 'locales', 'no.json'));
copyFile(path.join(rootDir, 'locales', 'en.json'), path.join(appWwwDir, 'locales', 'en.json'));

// 5. Sync Media
copyDirRecursive(path.join(rootDir, 'Media', 'Logo'), path.join(appWwwDir, 'Media', 'Logo'));
copyDirRecursive(path.join(rootDir, 'Media', 'Icons'), path.join(appWwwDir, 'Media', 'Icons'));
copyDirRecursive(path.join(rootDir, 'Media', 'Bilder'), path.join(appWwwDir, 'Media', 'Bilder'));

// 6. Helper to inject API base into HTML for native app
const API_CONFIG_SNIPPET = `<script>window.CFA_API_BASE = 'https://cosplayforalle.no/backend/api.php';</script>`;

function syncHtmlPage(pageName) {
  const srcPath = path.join(rootDir, 'pages', pageName);
  const destPath = path.join(appWwwDir, pageName);
  if (!fs.existsSync(srcPath)) return;

  let content = fs.readFileSync(srcPath, 'utf8');
  if (!content.includes('window.CFA_API_BASE')) {
    content = content.replace('<head>', `<head>\n    ${API_CONFIG_SNIPPET}`);
  }
  fs.writeFileSync(destPath, content, 'utf8');
}

syncHtmlPage('medlem.html');
syncHtmlPage('profil.html');
syncHtmlPage('login.html');
syncHtmlPage('app-start.html');

// 7. Create App Entry Point (index.html)
const appIndexHtml = `<!DOCTYPE html>
<html lang="no">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
    <title>CfA Medlem</title>
    ${API_CONFIG_SNIPPET}
    <link rel="stylesheet" href="css/style.css">
    <link rel="stylesheet" href="css/medlem.css">
    <style>
        body, html {
            margin: 0;
            padding: 0;
            height: 100%;
            background-color: var(--color-primary, #7E1C38);
            display: flex;
            align-items: center;
            justify-content: center;
            font-family: var(--font-body, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif);
            color: #FFFFFF;
        }
        .splash-container {
            text-align: center;
            animation: fadeIn 0.4s ease-out;
        }
        .splash-logo {
            width: 96px;
            height: 96px;
            border-radius: 50%;
            box-shadow: 0 8px 24px rgba(0,0,0,0.25);
            margin-bottom: 1.25rem;
        }
        .splash-title {
            font-size: 1.5rem;
            font-weight: 700;
            letter-spacing: 0.5px;
            margin-bottom: 0.5rem;
        }
        .splash-spinner {
            width: 32px;
            height: 32px;
            margin: 1.5rem auto 0 auto;
            border: 3px solid rgba(255,255,255,0.25);
            border-top-color: #FFFFFF;
            border-radius: 50%;
            animation: spin 0.8s linear infinite;
        }
        @keyframes spin {
            to { transform: rotate(360deg); }
        }
        @keyframes fadeIn {
            from { opacity: 0; transform: scale(0.95); }
            to { opacity: 1; transform: scale(1); }
        }
    </style>
</head>
<body>
    <div class="splash-container">
        <img src="Media/Logo/cfa-logo.webp" alt="Cosplay for alle" class="splash-logo">
        <div class="splash-title">Cosplay for alle</div>
        <div class="splash-spinner"></div>
    </div>

    <script type="module">
        import { AuthAPI } from './js/api-client.js';

        async function initAppLaunch() {
            try {
                const res = await AuthAPI.getAuthState();
                if (res && res.authenticated) {
                    window.location.replace('medlem.html');
                } else {
                    window.location.replace('login.html');
                }
            } catch (err) {
                const hasSession = localStorage.getItem('cfa_has_session') === '1';
                window.location.replace(hasSession ? 'medlem.html' : 'login.html');
            }
        }

        setTimeout(initAppLaunch, 300);
    </script>
</body>
</html>`;

fs.writeFileSync(path.join(appWwwDir, 'index.html'), appIndexHtml, 'utf8');

console.log('✓ Member App web assets synchronized to member-app/www/');

// 8. If Capacitor platforms are initialized, sync changes
const memberAppDir = path.join(rootDir, 'member-app');
const androidDir = path.join(memberAppDir, 'android');
const iosDir = path.join(memberAppDir, 'ios');

if (fs.existsSync(androidDir) || fs.existsSync(iosDir)) {
  try {
    console.log('📱 Syncing into native platform directories via Capacitor...');
    execSync('npx cap copy', { cwd: memberAppDir, stdio: 'inherit' });
    console.log('✓ Capacitor copy complete!');
  } catch (e) {
    console.warn('⚠️ Could not run cap copy automatically:', e.message);
  }
}

console.log('🎉 App sync complete!');
