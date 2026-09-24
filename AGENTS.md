# Cosplay for alle (CfA) - Assistant Instructions & Multi-Platform Protocols

> [!IMPORTANT]
> **CRITICAL INSTRUCTION FOR ALL FUTURE AI AGENTS & SESSIONS:**
> This repository powers **Cosplay for alle (CfA)** across **three deployment targets**:
> 1. **The Public & Member Website** (`pages/`, `css/`, `js/`, `locales/`, `Media/`)
> 2. **The Progressive Web App (PWA)** (`manifest.json`, `service-worker.js`, installed directly from the website)
> 3. **The Standalone Native Member App (iOS & Android)** (`member-app/` powered by Capacitor)
>
> **Whenever you make updates to styling, features, member portal, translations, or scripts, you MUST update and synchronize ALL versions (Website, PWA, and Member App for iOS/Android).**

---

## 1. Webhuset Production Deployment

The live website and backend are hosted on Webhuset:
- **Production URL**: `https://cosplayforalle.no`
- **FTP Host**: `linweb21.hmg9.webhuset.no`
- **Remote Web Root**: `/www`

### Credentials Security Notice:
> [!CAUTION]
> **NEVER commit plaintext passwords or credentials to Git or push them to public repositories!**
> Deployment credentials must be stored locally in the git-ignored file:
> [`webhuset-credentials.json`](file:///c:/Users/Anaru/Documents/GitHub/CfA/webhuset-credentials.json) (see [`webhuset-credentials.example.json`](file:///c:/Users/Anaru/Documents/GitHub/CfA/webhuset-credentials.example.json))
> or provided as environment variables (`WEBHUSET_FTP_USER`, `WEBHUSET_FTP_PASS`).

### Automated Deployment
An automated deployment script is located at [`scripts/deploy-webhuset.js`](file:///c:/Users/Anaru/Documents/GitHub/CfA/scripts/deploy-webhuset.js).
To deploy changes to Webhuset:
```bash
npm run deploy:webhuset
```

---

## 2. Standalone Member App (iOS & Android)

The dedicated native app for members lives in [`member-app/`](file:///c:/Users/Anaru/Documents/GitHub/CfA/member-app/).
It packages the member portal (`medlem.html`, `profil.html`, `login.html`) into native iOS and Android apps using Capacitor (`@capacitor/core`, `@capacitor/android`, `@capacitor/ios`).

### Key Configs:
- **App ID**: `no.cosplayforalle.medlem`
- **App Name**: `CfA Medlem`
- **Web Dir**: `member-app/www/`
- **API Endpoint**: `https://cosplayforalle.no/backend/api.php` (configured in `window.CFA_API_BASE`)

---

## 3. Mandatory Multi-Platform Sync Protocol

Whenever you perform work or update code in this codebase:

1. **Implement changes** in the primary source directories (`pages/`, `css/`, `js/`, `locales/`, `Media/`).
2. **Synchronize to the Member App**:
   ```bash
   npm run sync:app
   ```
   This runs [`scripts/sync-app.js`](file:///c:/Users/Anaru/Documents/GitHub/CfA/scripts/sync-app.js), copying all shared styles, scripts, member pages, locales, and media into `member-app/www/`, ensuring `window.CFA_API_BASE` is configured, and executing `cap copy` for iOS/Android platforms.
3. **Commit & Push to Git**:
   ```bash
   git add -A
   git commit -m "..."
   git push origin <branch>
   ```
4. **Deploy to Webhuset**:
   ```bash
   npm run deploy:webhuset
   ```
   *(Or run both simultaneously via `npm run deploy:all`)*.

---

## 4. Git Branching Strategy

- **`main`**: The primary production branch deployed to Webhuset.
- **`member-app`**: The dedicated branch for the standalone member app configuration and native platform builds.
- Always ensure changes that benefit both website/PWA and native app are committed and synced across branches as needed.

---

## 5. Summary of Common Commands

| Command | Purpose |
| :--- | :--- |
| `npm run sync:app` | Syncs website & member portal code to `member-app/www/` |
| `npm run deploy:webhuset` | Deploys website and PWA files to Webhuset FTP |
| `npm run deploy:all` | Runs `sync:app` followed by `deploy:webhuset` |
| `cd member-app && npx cap sync` | Syncs Capacitor native plugins and web assets |
| `cd member-app && npx cap open android` | Opens the native Android project in Android Studio |
| `cd member-app && npx cap open ios` | Opens the native iOS project in Xcode |
