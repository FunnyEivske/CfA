import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const pagesDir = path.join(rootDir, 'pages');

const consentHeadSnippet = `
    <!-- Google Consent Mode v2: Standardstatus (Må ligge øverst i head før sporingsskript) -->
    <script>
      window.dataLayer = window.dataLayer || [];
      function gtag(){dataLayer.push(arguments);}
      (function() {
        var consent = null;
        try { consent = JSON.parse(localStorage.getItem('cookie_consent')); } catch (e) {}
        gtag('consent', 'default', {
          'ad_storage': (consent && consent.marketing) ? 'granted' : 'denied',
          'ad_user_data': (consent && consent.marketing) ? 'granted' : 'denied',
          'ad_personalization': (consent && consent.marketing) ? 'granted' : 'denied',
          'analytics_storage': (consent && consent.analytics) ? 'granted' : 'denied',
          'functionality_storage': 'granted',
          'security_storage': 'granted',
          'wait_for_update': 500
        });
      })();
    </script>
    <script async src="https://www.googletagmanager.com/gtag/js?id=AW-18472435099"></script>
    <script>
      gtag('js', new Date());
      gtag('config', 'AW-18472435099');
    </script>
`;

const cookieButtonSnippet = `
            <p style="margin-top: 0.5rem;">
                <button type="button" onclick="window.openCookieConsent()" class="cookie-manage-link" data-i18n="cookie_manage">Administrer informasjonskapsler</button>
            </p>`;

const scriptTagSnippet = `    <script defer src="js/cookie-consent.js"></script>\n`;

const targetPages = [
  'index.html',
  'om-oss.html',
  'hva-skjer.html',
  'galleri.html',
  'kontakt.html',
  'bli-medlem.html',
  'login.html',
  'medlem.html',
  'profil.html',
  'app.html'
];

targetPages.forEach(file => {
  const filePath = path.join(pagesDir, file);
  if (!fs.existsSync(filePath)) return;

  let content = fs.readFileSync(filePath, 'utf8');
  let modified = false;

  // 1. Head injection
  if (!content.includes('AW-18472435099')) {
    if (content.includes('<meta charset="UTF-8">')) {
      content = content.replace('<meta charset="UTF-8">', '<meta charset="UTF-8">' + consentHeadSnippet);
      modified = true;
    } else if (content.includes('<head>')) {
      content = content.replace('<head>', '<head>' + consentHeadSnippet);
      modified = true;
    }
  }

  // 2. Cookie button injection in footer
  if (!content.includes('cookie_manage')) {
    if (content.includes('data-i18n="footer_copyright"')) {
      // Find the end of the copyright line or paragraph
      const regex = /(<p[^>]*data-i18n="footer_copyright"[^>]*>[\s\S]*?<\/p>)/;
      if (regex.test(content)) {
        content = content.replace(regex, `$1${cookieButtonSnippet}`);
        modified = true;
      }
    } else if (content.includes('</footer>')) {
      content = content.replace('</footer>', `${cookieButtonSnippet}\n    </footer>`);
      modified = true;
    }
  }

  // 3. Script tag injection
  if (!content.includes('cookie-consent.js')) {
    if (content.includes('js/theme-switcher.js')) {
      content = content.replace(/([^\n]*js\/theme-switcher\.js[^\n]*\n)/, `$1    ${scriptTagSnippet}`);
      modified = true;
    } else if (content.includes('</body>')) {
      content = content.replace('</body>', `${scriptTagSnippet}</body>`);
      modified = true;
    }
  }

  if (modified) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`✓ Updated ${file}`);
  } else {
    console.log(`- Already up to date: ${file}`);
  }
});

console.log('Finished updating HTML pages with Cookie Consent & Google Consent Mode v2.');
