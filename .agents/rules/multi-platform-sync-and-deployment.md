# Multi-Platform Sync & Webhuset Deployment Guidelines

This rule applies to all interactions with the Cosplay for alle (CfA) codebase.

## 1. Webhuset Deployment Credentials
- Deployment credentials must be stored locally in the git-ignored file `webhuset-credentials.json` (see `webhuset-credentials.example.json`) or set via environment variables `WEBHUSET_FTP_USER` and `WEBHUSET_FTP_PASS`.
- **NEVER** commit plaintext credentials or passwords to Git or push them to GitHub.

## 2. Mandatory Synchronization Protocol
Whenever making changes to CSS, JS, HTML, or media:
1. Always update the website and PWA files.
2. Run `npm run sync:app` to automatically mirror shared assets and member pages into `member-app/www/`.
3. Commit and push to Git.
4. Deploy to Webhuset via `npm run deploy:webhuset`.

## 3. Native App Structure (`member-app/`)
- Powered by Capacitor for iOS and Android.
- Configured to connect to production API: `https://cosplayforalle.no/backend/api.php`.
