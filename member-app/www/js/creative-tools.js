// js/creative-tools.js - Kontroller for Kreative Verktøy (ArtCraft)
// Støtter WebAssembly-kjøring, skrivebordsnedlasting (Windows, macOS, Linux)
// samt GitHub Release-synkronisering og versjonskontroll for Administratorer.
import { AuthAPI, userHasRole, ArtCraftAPI } from './api-client.js';

const ARTCRAFT_APPS = [
    {
        id: 'photocraft',
        title: 'PhotoCraft',
        adobeName: 'Photoshop',
        iconImage: 'Media/artcraft-icons/photocraft.png',
        hybridLetters: 'Pc',
        adobeLetters: 'Ps',
        desc: 'Komplett bilderedigering med lagstøtte, masker, markeringer, filter og retusjering av cosplay-bilder.',
        path: '/artcraft/photocraft/index.html',
        cfa: {
            alt: 'ArtCraft • Bilderedigering',
            altColor: '#0284c7',
            altBg: 'rgba(2, 132, 199, 0.12)',
            badgeText: 'Pc',
            badgeBg: '#0284c7'
        },
        adobe: {
            alt: 'Bilderedigering',
            altColor: '#31a8ff',
            altBg: 'rgba(49, 168, 255, 0.14)',
            textColor: '#31a8ff',
            borderColor: '#31a8ff',
            bgColor: '#001e36'
        }
    },
    {
        id: 'vectorcraft',
        title: 'VectorCraft',
        adobeName: 'Illustrator',
        iconImage: 'Media/artcraft-icons/vectorcraft.png',
        hybridLetters: 'Vc',
        adobeLetters: 'Ai',
        desc: 'Vektorgrafikk, bézier-kurver og mønsterdesign. Perfekt for å tegne og skalere rustnings- og klesmønstre.',
        path: '/artcraft/vectorcraft/index.html',
        cfa: {
            alt: 'ArtCraft • Vektordesign',
            altColor: '#ea580c',
            altBg: 'rgba(234, 88, 12, 0.12)',
            badgeText: 'Vc',
            badgeBg: '#ea580c'
        },
        adobe: {
            alt: 'Vektordesign',
            altColor: '#ff9a00',
            altBg: 'rgba(255, 154, 0, 0.14)',
            textColor: '#ff9a00',
            borderColor: '#ff9a00',
            bgColor: '#330000'
        }
    },
    {
        id: 'filmcraft',
        title: 'FilmCraft',
        adobeName: 'Premiere Pro',
        iconImage: 'Media/artcraft-icons/filmcraft.png',
        hybridLetters: 'Fc',
        adobeLetters: 'Pr',
        desc: 'Tidslinjebasert videoredigering, klipping, overganger og lydspor for cosplay-musikkvideoer og con-vlogs.',
        path: '/artcraft/filmcraft/index.html',
        cfa: {
            alt: 'ArtCraft • Videoredigering',
            altColor: '#9333ea',
            altBg: 'rgba(147, 51, 234, 0.12)',
            badgeText: 'Fc',
            badgeBg: '#9333ea'
        },
        adobe: {
            alt: 'Videoredigering',
            altColor: '#ea77ff',
            altBg: 'rgba(234, 119, 255, 0.14)',
            textColor: '#ea77ff',
            borderColor: '#ea77ff',
            bgColor: '#330033'
        }
    },
    {
        id: 'lightcraft',
        title: 'LightCraft',
        adobeName: 'Lightroom',
        iconImage: 'Media/artcraft-icons/lightcraft.png',
        hybridLetters: 'Lc',
        adobeLetters: 'Lr',
        desc: 'RAW-fremkalling, fargegradering, eksponeringskontroll og lyskurver for profesjonell etterbehandling av fotoshoots.',
        path: '/artcraft/lightcraft/index.html',
        cfa: {
            alt: 'ArtCraft • RAW & Foto',
            altColor: '#0d9488',
            altBg: 'rgba(13, 148, 136, 0.12)',
            badgeText: 'Lc',
            badgeBg: '#0d9488'
        },
        adobe: {
            alt: 'RAW & Foto',
            altColor: '#31a8ff',
            altBg: 'rgba(49, 168, 255, 0.14)',
            textColor: '#31a8ff',
            borderColor: '#31a8ff',
            bgColor: '#001e36'
        }
    },
    {
        id: 'pdfcraft',
        title: 'PdfCraft',
        adobeName: 'Acrobat',
        iconImage: 'Media/artcraft-icons/pdfcraft.png',
        hybridLetters: 'Pd',
        adobeLetters: 'Ac',
        desc: 'Vise, redigere, dele opp og slå sammen PDF-mønstre. Skriv ut mønstre i riktig målestokk på A4 eller A3.',
        path: '/artcraft/pdfcraft/index.html',
        cfa: {
            alt: 'ArtCraft • PDF & Mønster',
            altColor: '#dc2626',
            altBg: 'rgba(220, 38, 38, 0.12)',
            badgeText: 'Pd',
            badgeBg: '#dc2626'
        },
        adobe: {
            alt: 'PDF & Mønster',
            altColor: '#ff0000',
            altBg: 'rgba(255, 0, 0, 0.14)',
            textColor: '#ff0000',
            borderColor: '#ff0000',
            bgColor: '#330000'
        }
    },
    {
        id: 'effectcraft',
        title: 'EffectCraft',
        adobeName: 'After Effects',
        iconImage: 'Media/artcraft-icons/effectcraft.png',
        hybridLetters: 'Ec',
        adobeLetters: 'Ae',
        desc: 'Visuelle effekter, animasjon og bevegelsesgrafikk. Legg til magiske glødeffekter, laser og elementer på videoer.',
        path: '/artcraft/effectcraft/index.html',
        cfa: {
            alt: 'ArtCraft • VFX & Effekter',
            altColor: '#7c3aed',
            altBg: 'rgba(124, 58, 237, 0.12)',
            badgeText: 'Ec',
            badgeBg: '#7c3aed'
        },
        adobe: {
            alt: 'VFX & Effekter',
            altColor: '#9999ff',
            altBg: 'rgba(153, 153, 255, 0.14)',
            textColor: '#9999ff',
            borderColor: '#9999ff',
            bgColor: '#20003b'
        }
    },
    {
        id: 'designcraft',
        title: 'DesignCraft',
        adobeName: 'InDesign',
        iconImage: 'Media/artcraft-icons/designcraft.png',
        hybridLetters: 'Dc',
        adobeLetters: 'Id',
        desc: 'Flersidig layout og sideoppsett for cosplay-bøker, portfolioer, plakater og hefter med typografi og rutenett.',
        path: '/artcraft/designcraft/index.html',
        cfa: {
            alt: 'ArtCraft • Layout & Trykk',
            altColor: '#db2777',
            altBg: 'rgba(219, 39, 119, 0.12)',
            badgeText: 'Dc',
            badgeBg: '#db2777'
        },
        adobe: {
            alt: 'Layout & Trykk',
            altColor: '#ff3366',
            altBg: 'rgba(255, 51, 102, 0.14)',
            textColor: '#ff3366',
            borderColor: '#ff3366',
            bgColor: '#3b001b'
        }
    },
    {
        id: 'figcraft',
        title: 'FigCraft',
        adobeName: 'Figma',
        iconImage: 'Media/artcraft-icons/figcraft.png',
        hybridLetters: 'Fc',
        adobeLetters: 'Fg',
        desc: 'UI/UX-design og vektor-prototyping. Samarbeid om designoppsett, komponenter og planlegging av prosjekter.',
        path: '/artcraft/figcraft/index.html',
        cfa: {
            alt: 'ArtCraft • UI/UX & Design',
            altColor: '#059669',
            altBg: 'rgba(5, 150, 105, 0.12)',
            badgeText: 'Fc',
            badgeBg: '#059669'
        },
        adobe: {
            alt: 'UI/UX & Design',
            altColor: '#0acf83',
            altBg: 'rgba(10, 207, 131, 0.14)',
            textColor: '#0acf83',
            borderColor: '#0acf83',
            bgColor: '#1e1e1e'
        }
    },
    {
        id: 'soundcraft',
        title: 'SoundCraft',
        adobeName: 'Audition',
        iconImage: 'Media/artcraft-icons/soundcraft.png',
        hybridLetters: 'Sc',
        adobeLetters: 'Au',
        desc: 'Flerstors lydopptak, miksing, lydeffekter og støyfjerning til sceneshow, sketsjer og video-voiceovers.',
        path: '/artcraft/soundcraft/index.html',
        cfa: {
            alt: 'ArtCraft • Lydstudio & Tale',
            altColor: '#16a34a',
            altBg: 'rgba(22, 163, 74, 0.12)',
            badgeText: 'Sc',
            badgeBg: '#16a34a'
        },
        adobe: {
            alt: 'Lydstudio & Tale',
            altColor: '#00e699',
            altBg: 'rgba(0, 230, 153, 0.14)',
            textColor: '#00e699',
            borderColor: '#00e699',
            bgColor: '#00332a'
        }
    }
];

let currentUser = null;
let currentAppId = null;
let releasesData = null; // Inneholder apps, tag_name, downloads, updated_at
let wasmTimeoutTimer = null;

// Visningsmodus: 'artcraft' (standard) | 'hybrid' (ArtCraft-navn m/ Adobe-ikoner) | 'adobe' (Adobe-ikoner & navn)
let currentDisplayMode = 'artcraft';
try {
    const saved = localStorage.getItem('cfa_creative_display_mode');
    if (saved === 'artcraft' || saved === 'hybrid' || saved === 'adobe') {
        currentDisplayMode = saved;
    } else if (localStorage.getItem('cfa_artcraft_adobe_logos') === 'true') {
        currentDisplayMode = 'hybrid';
    }
} catch (e) {}

// Detekter brukerens operativsystem i nettleseren
function detectUserOS() {
    const ua = navigator.userAgent || '';
    const platform = navigator.platform || (navigator.userAgentData && navigator.userAgentData.platform) || '';
    if (/Win/i.test(platform) || /Windows/i.test(ua)) return 'windows';
    if (/Mac/i.test(platform) || /Macintosh/i.test(ua)) return 'macos';
    if (/Linux/i.test(platform) || /Linux/i.test(ua)) return 'linux';
    return 'windows';
}
const userOS = detectUserOS();

// OS ikoner (inline SVG)
const OS_ICONS = {
    windows: `<svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><path d="M0 3.449L9.75 2.1v9.451H0m10.949-9.602L24 0v11.4H10.949M0 12.6h9.75v9.451L0 20.699M10.949 12.6H24V24l-12.949-1.949"/></svg>`,
    macos: `<svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 6.47c.65-.79 1.1-1.88.98-2.97-1 .04-2.13.67-2.79 1.45-.58.68-1.1 1.77-.96 2.84 1.11.09 2.18-.58 2.77-1.32z"/></svg>`,
    linux: `<svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><path d="M12.001 2c-3.14 0-5.7 2.46-5.7 5.5 0 1.28.45 2.47 1.22 3.42C5.98 12.06 5 13.92 5 16c0 1.66.65 3.17 1.72 4.3.4.42.98.53 1.48.29.5-.24.78-.77.7-1.32-.47-.79-.75-1.71-.75-2.7 0-2.4 1.77-4.39 4.07-4.75.25-.04.47-.2.58-.43.11-.23.09-.5-.05-.71-.85-1.28-1.32-2.77-1.32-4.38C10.43 4.13 11.14 3.5 12 3.5s1.57.63 1.57 2.5c0 1.61-.47 3.1-1.32 4.38-.14.21-.16.48-.05.71.11.23.33.39.58.43 2.3.36 4.07 2.35 4.07 4.75 0 .99-.28 1.91-.75 2.7-.08.55.2 1.08.7 1.32.5.24 1.08.13 1.48-.29C20.35 19.17 21 17.66 21 16c0-2.08-.98-3.94-2.52-5.08.77-.95 1.22-2.14 1.22-3.42 0-3.04-2.56-5.5-5.7-5.5z"/></svg>`
};

const OS_NAMES = {
    windows: 'Windows',
    macos: 'macOS',
    linux: 'Linux'
};

// Filtreringsregler for GitHub Releases-assets ifølge krav 2
function filterGitHubAssets(assets = [], appName = '') {
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
            url: serverEndpoint('windows'),
            local_url: localUrl('windows', primaryWin.name),
            server_endpoint: serverEndpoint('windows'),
            github_url: primaryWin.browser_download_url,
            size: primaryWin.size,
            format: primaryWin.name.endsWith('.msi') ? 'MSI' : (primaryWin.name.endsWith('.exe') ? 'EXE' : 'ZIP'),
            all: winAssets.map(a => ({ name: a.name, url: a.browser_download_url, size: a.size }))
        } : null,
        macos: primaryMac ? {
            name: primaryMac.name,
            url: serverEndpoint('macos'),
            local_url: localUrl('macos', primaryMac.name),
            server_endpoint: serverEndpoint('macos'),
            github_url: primaryMac.browser_download_url,
            size: primaryMac.size,
            format: primaryMac.name.endsWith('.dmg') ? 'DMG' : (primaryMac.name.endsWith('.pkg') ? 'PKG' : 'ZIP'),
            all: macAssets.map(a => ({ name: a.name, url: a.browser_download_url, size: a.size }))
        } : null,
        linux: primaryLinux ? {
            name: primaryLinux.name,
            url: serverEndpoint('linux'),
            local_url: localUrl('linux', primaryLinux.name),
            server_endpoint: serverEndpoint('linux'),
            github_url: primaryLinux.browser_download_url,
            size: primaryLinux.size,
            format: primaryLinux.name.endsWith('.AppImage') ? 'AppImage' : (primaryLinux.name.endsWith('.deb') ? 'DEB' : 'TAR'),
            all: linuxAssets.map(a => ({ name: a.name, url: a.browser_download_url, size: a.size }))
        } : null
    };
}

async function initCreativeToolsPage() {
    // 1. Rigorøs autentiseringssjekk
    let authRes = null;
    try {
        authRes = await AuthAPI.getAuthState();
    } catch (err) {
        console.warn("Auth check failed:", err);
    }

    if (!authRes || !authRes.authenticated || !authRes.user) {
        try { localStorage.removeItem('cfa_has_session'); } catch (e) {}
        const isHtml = window.location.pathname.endsWith('.html');
        window.location.replace(isHtml ? 'login.html' : 'login');
        return;
    }

    if (authRes.must_accept_tos || authRes.must_change_password) {
        const isHtml = window.location.pathname.endsWith('.html');
        window.location.replace(isHtml ? 'login.html' : 'login');
        return;
    }

    currentUser = authRes.user;

    // 2. Streng rollesjekk: Bruker må ha 'creative' ELLER 'admin'
    const hasCreativeAccess = userHasRole(currentUser, 'creative') || userHasRole(currentUser, 'admin');
    if (!hasCreativeAccess) {
        alert('Ingen tilgang. Kreative Verktøy (ArtCraft) krever at kontoen din er tildelt rollen Kreativ eller Administrator.');
        window.location.replace('medlem');
        return;
    }

    // 3. Tilgang godkjent: Avdekk siden trygt
    const guardStyle = document.getElementById('auth-guard-style');
    if (guardStyle) {
        guardStyle.remove();
    } else {
        document.documentElement.style.display = '';
    }

    // 4. Hent nyeste lagrede release-metadata (fra database eller releases.json fallback)
    await loadReleasesData();

    setupModeSelector();
    renderAppGrid();
    setupWorkspace();
    setupAdminPanel();
    setupLogout();

    // 5. Sjekk om URL har en spesifikk app i query eller hash (f.eks. ?app=photocraft eller #photocraft)
    const urlParams = new URLSearchParams(window.location.search);
    const queryApp = urlParams.get('app');
    const hashApp = window.location.hash ? window.location.hash.substring(1) : null;
    const targetApp = queryApp || hashApp;

    if (targetApp && ARTCRAFT_APPS.some(a => a.id === targetApp)) {
        openApp(targetApp);
    }
}

async function loadReleasesData() {
    try {
        const res = await ArtCraftAPI.getReleases();
        if (res && res.apps) {
            releasesData = res;
            return;
        }
    } catch (e) {
        console.warn("Kunne ikke hente releases fra backend:", e);
    }

    // Fallback: forsøk direkte fetch av statisk artcraft/releases.json
    try {
        const fetchRes = await fetch('/artcraft/releases.json');
        if (fetchRes.ok) {
            releasesData = await fetchRes.json();
        }
    } catch (e) {}
}

function resolveMediaUrl(path) {
    if (!path) return '';
    if (path.startsWith('http://') || path.startsWith('https://') || path.startsWith('data:')) {
        return path;
    }
    if (window.location.protocol === 'capacitor:' || window.location.protocol === 'file:') {
        return path.replace(/^\//, '');
    }
    return '/' + path.replace(/^\//, '');
}

function resolveAppUrl(path) {
    if (window.CFA_API_BASE && (window.location.protocol === 'capacitor:' || window.location.protocol === 'file:')) {
        try {
            const apiBase = new URL(window.CFA_API_BASE);
            return `${apiBase.origin}${path}`;
        } catch (e) {}
    }
    return path;
}

function setupModeSelector() {
    const triggerBtn = document.getElementById('settings-menu-btn');
    const dropdown = document.getElementById('settings-menu-dropdown');
    const modePill = document.getElementById('current-mode-pill');
    const items = document.querySelectorAll('.settings-item, .mode-btn');

    function updateUi() {
        items.forEach(el => {
            const mode = el.getAttribute('data-mode');
            el.classList.toggle('active', mode === currentDisplayMode);
        });

        if (modePill) {
            if (currentDisplayMode === 'adobe') {
                modePill.textContent = 'Adobe';
                modePill.style.color = '#38bdf8';
                modePill.style.borderColor = 'rgba(56, 189, 248, 0.4)';
                modePill.style.background = 'rgba(56, 189, 248, 0.1)';
            } else if (currentDisplayMode === 'hybrid') {
                modePill.textContent = 'Hybrid';
                modePill.style.color = '#fbbf24';
                modePill.style.borderColor = 'rgba(251, 191, 36, 0.4)';
                modePill.style.background = 'rgba(251, 191, 36, 0.1)';
            } else {
                modePill.textContent = 'ArtCraft';
                modePill.style.color = 'var(--color-primary)';
                modePill.style.borderColor = 'rgba(126, 28, 56, 0.4)';
                modePill.style.background = 'rgba(126, 28, 56, 0.1)';
            }
        }
    }

    updateUi();

    if (triggerBtn && dropdown) {
        triggerBtn.onclick = (e) => {
            e.stopPropagation();
            const isHidden = dropdown.classList.contains('hidden');
            dropdown.classList.toggle('hidden', !isHidden);
            triggerBtn.setAttribute('aria-expanded', isHidden ? 'true' : 'false');
        };

        document.addEventListener('click', (e) => {
            if (!dropdown.contains(e.target) && !triggerBtn.contains(e.target)) {
                dropdown.classList.add('hidden');
                triggerBtn.setAttribute('aria-expanded', 'false');
            }
        });
    }

    items.forEach(el => {
        el.onclick = () => {
            const nextMode = el.getAttribute('data-mode');
            if (nextMode && nextMode !== currentDisplayMode) {
                currentDisplayMode = nextMode;
                try {
                    localStorage.setItem('cfa_creative_display_mode', nextMode);
                    localStorage.setItem('cfa_artcraft_adobe_logos', nextMode !== 'artcraft' ? 'true' : 'false');
                } catch (e) {}
                updateUi();
                renderAppGrid();
                updateWorkspaceSelectOptions();
                if (currentAppId) {
                    updateWorkspaceHeader(currentAppId);
                }
            }
            if (dropdown) {
                dropdown.classList.add('hidden');
                if (triggerBtn) triggerBtn.setAttribute('aria-expanded', 'false');
            }
        };
    });
}

function getAppRelease(appId) {
    if (!releasesData || !releasesData.apps) return null;
    return releasesData.apps[appId] || null;
}

function renderAppGrid() {
    const container = document.getElementById('apps-container');
    if (!container) return;

    container.innerHTML = '';

    ARTCRAFT_APPS.forEach(app => {
        const appUrl = resolveAppUrl(app.path);
        const card = document.createElement('div');
        card.className = 'app-card';

        const release = getAppRelease(app.id);
        const tagName = release && release.tag_name ? release.tag_name : 'v0.8.0';
        const downloads = release && release.downloads ? release.downloads : {};

        let iconBoxHtml = '';
        let altTagText = '';
        let altTagColor = '';
        let altTagBg = '';
        let appTitle = '';
        let buttonLabel = '';

        if (currentDisplayMode === 'adobe') {
            appTitle = app.adobeName;
            buttonLabel = `Åpne ${app.adobeName}`;
            iconBoxHtml = `
                <div class="app-icon-box adobe-style" style="background: ${app.adobe.bgColor}; color: ${app.adobe.textColor}; border: 2.5px solid ${app.adobe.borderColor};">
                    <span>${app.adobeLetters}</span>
                </div>
            `;
            altTagText = app.adobe.alt;
            altTagColor = app.adobe.textColor;
            altTagBg = app.adobe.altBg;
        } else if (currentDisplayMode === 'hybrid') {
            appTitle = app.title;
            buttonLabel = `Åpne ${app.title}`;
            iconBoxHtml = `
                <div class="app-icon-box adobe-style" style="background: ${app.adobe.bgColor}; color: ${app.adobe.textColor}; border: 2.5px solid ${app.adobe.borderColor};">
                    <span>${app.hybridLetters}</span>
                </div>
            `;
            altTagText = app.cfa.alt;
            altTagColor = app.adobe.textColor;
            altTagBg = app.adobe.altBg;
        } else {
            appTitle = app.title;
            buttonLabel = `Åpne ${app.title}`;
            const mediaUrl = resolveMediaUrl(app.iconImage);
            iconBoxHtml = `
                <div class="app-icon-box artcraft-style">
                    <img src="${mediaUrl}" alt="${app.title}" class="artcraft-icon-img" onerror="this.onerror=null; this.src='${app.iconImage}';">
                </div>
            `;
            altTagText = app.cfa.alt;
            altTagColor = app.cfa.altColor;
            altTagBg = app.cfa.altBg;
        }

        // Klargjør desktop-nedlastingsknapper for de 3 operativsystemene via lokalt serverendepunkt
        const resolveInstallerUrl = (os, dlObj) => {
            let endpoint = `/backend/api.php?action=download_artcraft_installer&app=${app.id}&os=${os}`;
            if (window.CFA_API_BASE && (window.location.protocol === 'capacitor:' || window.location.protocol === 'file:')) {
                try {
                    const apiBase = new URL(window.CFA_API_BASE);
                    endpoint = `${apiBase.origin}${endpoint}`;
                } catch (e) {}
            }
            return endpoint;
        };

        const winDl = {
            format: downloads.windows?.format || 'MSI',
            name: downloads.windows?.name || `${app.title}-Setup.msi`,
            url: resolveInstallerUrl('windows', downloads.windows),
            githubUrl: downloads.windows?.github_url || `https://github.com/storytold/${app.id}/releases/latest`
        };
        const macDl = {
            format: downloads.macos?.format || 'DMG',
            name: downloads.macos?.name || `${app.title}.dmg`,
            url: resolveInstallerUrl('macos', downloads.macos),
            githubUrl: downloads.macos?.github_url || `https://github.com/storytold/${app.id}/releases/latest`
        };
        const linuxDl = {
            format: downloads.linux?.format || 'AppImage',
            name: downloads.linux?.name || `${app.title}.AppImage`,
            url: resolveInstallerUrl('linux', downloads.linux),
            githubUrl: downloads.linux?.github_url || `https://github.com/storytold/${app.id}/releases/latest`
        };

        // Bestem hvilket OS som fremheves
        let primaryDl = { os: 'windows', label: 'Windows', icon: OS_ICONS.windows, ...winDl };
        let otherDlList = [
            { os: 'macos', label: 'macOS', icon: OS_ICONS.macos, ...macDl },
            { os: 'linux', label: 'Linux', icon: OS_ICONS.linux, ...linuxDl }
        ];

        if (userOS === 'macos') {
            primaryDl = { os: 'macos', label: 'macOS', icon: OS_ICONS.macos, ...macDl };
            otherDlList = [
                { os: 'windows', label: 'Windows', icon: OS_ICONS.windows, ...winDl },
                { os: 'linux', label: 'Linux', icon: OS_ICONS.linux, ...linuxDl }
            ];
        } else if (userOS === 'linux') {
            primaryDl = { os: 'linux', label: 'Linux', icon: OS_ICONS.linux, ...linuxDl };
            otherDlList = [
                { os: 'windows', label: 'Windows', icon: OS_ICONS.windows, ...winDl },
                { os: 'macos', label: 'macOS', icon: OS_ICONS.macos, ...macDl }
            ];
        }

        card.innerHTML = `
            <div>
                ${iconBoxHtml}
                <div class="app-top-meta">
                    <span class="app-alt-tag" style="background: ${altTagBg}; color: ${altTagColor};">
                        ${altTagText}
                    </span>
                    <span class="app-version-badge" title="Nåværende versjon: ${tagName}">
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"></path><line x1="7" y1="7" x2="7.01" y2="7"></line></svg>
                        ${tagName}
                    </span>
                </div>
                <h3 class="app-title">${appTitle}</h3>
                <p class="app-desc">${app.desc}</p>
            </div>

            <!-- To hovedvalg: 1. Åpne i nettleser, 2. Last ned for Desktop -->
            <div class="card-choice-group">
                <div>
                    <div class="choice-section-label">
                        <span>1. Nettleser (WebAssembly)</span>
                    </div>
                    <div class="web-actions-row">
                        <button type="button" class="btn btn-primary btn-sm open-app-btn" style="flex: 1; padding: 0.6rem 0.9rem; font-weight: 700; font-size: 0.88rem; display: inline-flex; align-items: center; justify-content: center; gap: 0.45rem;">
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>
                            ${buttonLabel}
                        </button>
                        <a href="${appUrl}" target="_blank" rel="noopener noreferrer" class="btn btn-ghost btn-sm" title="Åpne i ny fane" style="padding: 0.6rem; color: var(--color-text-muted);">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                                <polyline points="15 3 21 3 21 9"></polyline>
                                <line x1="10" y1="14" x2="21" y2="3"></line>
                            </svg>
                        </a>
                    </div>
                </div>

                <div class="desktop-download-box">
                    <div class="choice-section-label">
                        <span>2. Last ned for Desktop</span>
                        <span style="font-weight: 600; text-transform: none; opacity: 0.8;">${primaryDl.label} detektert</span>
                    </div>

                    <!-- Fremhevet knapp for detektert operativsystem (Lokal servernedlasting) -->
                    <a href="${primaryDl.url}" target="_blank" rel="noopener noreferrer" class="btn-desktop-primary highlighted-os" title="Last ned ${primaryDl.name || app.title} fra CfA-server">
                        ${primaryDl.icon}
                        <span>Last ned for ${primaryDl.label} (${primaryDl.format || 'Installatør'})</span>
                    </a>

                    <!-- Tilgjengelighet for øvrige to operativsystemer -->
                    <div class="other-os-row">
                        <span>Andre systemer:</span>
                        <div class="other-os-pills">
                            <a href="${otherDlList[0].url}" target="_blank" rel="noopener noreferrer" class="other-os-link" title="Last ned ${otherDlList[0].name || otherDlList[0].label} fra CfA-server">
                                ${otherDlList[0].icon} ${otherDlList[0].label} (${otherDlList[0].format})
                            </a>
                            <a href="${otherDlList[1].url}" target="_blank" rel="noopener noreferrer" class="other-os-link" title="Last ned ${otherDlList[1].name || otherDlList[1].label} fra CfA-server">
                                ${otherDlList[1].icon} ${otherDlList[1].label} (${otherDlList[1].format})
                            </a>
                        </div>
                    </div>

                    <!-- Kildehenvisning til lokal hosting og GitHub -->
                    <div class="dl-source-note" style="margin-top: 0.65rem; padding-top: 0.5rem; border-top: 1px solid rgba(255, 255, 255, 0.08); font-size: 0.76rem; color: var(--color-text-muted); display: flex; align-items: center; justify-content: space-between; gap: 0.5rem; flex-wrap: wrap;">
                        <span style="display: inline-flex; align-items: center; gap: 4px;">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                            Hostet lokalt på CfA-server
                        </span>
                        <a href="https://github.com/storytold/${app.id}/releases" target="_blank" rel="noopener noreferrer" style="color: var(--color-text-muted); text-decoration: underline; display: inline-flex; align-items: center; gap: 3px;" title="Se kildekode og releases hos Storytold på GitHub">
                            Storytold GitHub ↗
                        </a>
                    </div>
                </div>
            </div>
        `;

        const btn = card.querySelector('.open-app-btn');
        if (btn) {
            btn.onclick = () => openApp(app.id);
        }

        container.appendChild(card);
    });
}

function updateWorkspaceHeader(appId) {
    const app = ARTCRAFT_APPS.find(a => a.id === appId);
    if (!app) return;

    const iconEl = document.getElementById('ws-app-icon');
    const nameEl = document.getElementById('ws-app-name');
    const tagEl = document.getElementById('ws-app-tag');

    const appTitle = currentDisplayMode === 'adobe' ? app.adobeName : app.title;

    if (nameEl) nameEl.textContent = appTitle;

    if (iconEl) {
        if (currentDisplayMode === 'adobe') {
            iconEl.innerHTML = `
                <span style="display: inline-flex; align-items: center; justify-content: center; width: 28px; height: 28px; border-radius: 6px; background: ${app.adobe.bgColor}; color: ${app.adobe.textColor}; border: 1.5px solid ${app.adobe.borderColor}; font-weight: 800; font-size: 0.85rem; font-family: sans-serif;">
                    ${app.adobeLetters}
                </span>
            `;
        } else if (currentDisplayMode === 'hybrid') {
            iconEl.innerHTML = `
                <span style="display: inline-flex; align-items: center; justify-content: center; width: 28px; height: 28px; border-radius: 6px; background: ${app.adobe.bgColor}; color: ${app.adobe.textColor}; border: 1.5px solid ${app.adobe.borderColor}; font-weight: 800; font-size: 0.85rem; font-family: sans-serif;">
                    ${app.hybridLetters}
                </span>
            `;
        } else {
            iconEl.innerHTML = `
                <img src="${app.iconImage}" alt="${app.title}" style="width: 28px; height: 28px; border-radius: 7px; object-fit: cover; vertical-align: middle;">
            `;
        }
    }

    if (tagEl) {
        tagEl.textContent = currentDisplayMode === 'adobe' ? app.adobe.alt : app.cfa.alt;
    }

    // Oppdater direkte desktop-nedlastingsknapper i arbeidsområdet
    const release = getAppRelease(app.id);
    const downloads = release && release.downloads ? release.downloads : {};
    const primaryDl = downloads[userOS] || downloads.windows || { url: `https://github.com/storytold/${app.id}/releases/latest` };

    const topbarDlBtn = document.getElementById('ws-topbar-download-btn');
    if (topbarDlBtn) {
        topbarDlBtn.href = primaryDl.url;
        topbarDlBtn.title = `Last ned ${app.title} for ${OS_NAMES[userOS]}`;
    }

    const fallbackDlBtn = document.getElementById('ws-fallback-dl-btn');
    const fallbackDlText = document.getElementById('ws-fallback-dl-text');
    if (fallbackDlBtn) {
        fallbackDlBtn.href = primaryDl.url;
    }
    if (fallbackDlText) {
        fallbackDlText.textContent = `Last ned for ${OS_NAMES[userOS]} (${primaryDl.format || 'Desktop'})`;
    }
}

function updateWorkspaceSelectOptions() {
    const select = document.getElementById('ws-switch-select');
    if (!select) return;

    const currentVal = select.value;
    select.innerHTML = ARTCRAFT_APPS.map(app => {
        const title = currentDisplayMode === 'adobe' ? app.adobeName : app.title;
        const tag = currentDisplayMode === 'adobe' ? app.adobeLetters : (currentDisplayMode === 'hybrid' ? app.hybridLetters : app.cfa.badgeText);
        return `<option value="${app.id}">${title} (${tag})</option>`;
    }).join('');

    if (currentVal) select.value = currentVal;
}

function setupWorkspace() {
    const workspace = document.getElementById('artcraft-workspace');
    const closeBtn = document.getElementById('ws-close-btn');
    const switchSelect = document.getElementById('ws-switch-select');
    const openTabBtn = document.getElementById('ws-open-tab-btn');
    const iframe = document.getElementById('artcraft-iframe');
    const loader = document.getElementById('ws-loader');
    const fallbackBox = document.getElementById('ws-loader-fallback');

    updateWorkspaceSelectOptions();

    if (closeBtn) {
        closeBtn.onclick = () => closeWorkspace();
    }

    if (switchSelect) {
        switchSelect.onchange = (e) => {
            const nextId = e.target.value;
            if (nextId) openApp(nextId);
        };
    }

    if (openTabBtn) {
        openTabBtn.onclick = () => {
            const app = ARTCRAFT_APPS.find(a => a.id === currentAppId);
            if (app) {
                window.open(resolveAppUrl(app.path), '_blank');
            }
        };
    }

    if (iframe && loader) {
        iframe.onload = () => {
            if (wasmTimeoutTimer) {
                clearTimeout(wasmTimeoutTimer);
                wasmTimeoutTimer = null;
            }
            loader.style.display = 'none';
            if (fallbackBox) fallbackBox.style.display = 'none';
        };

        iframe.onerror = () => {
            if (fallbackBox) fallbackBox.style.display = 'block';
        };
    }

    // Lukk med ESC
    window.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && workspace && !workspace.classList.contains('hidden')) {
            closeWorkspace();
        }
    });
}

function openApp(appId) {
    const app = ARTCRAFT_APPS.find(a => a.id === appId);
    if (!app) return;

    currentAppId = appId;

    const workspace = document.getElementById('artcraft-workspace');
    const iframe = document.getElementById('artcraft-iframe');
    const loader = document.getElementById('ws-loader');
    const loaderText = document.getElementById('ws-loader-text');
    const selectEl = document.getElementById('ws-switch-select');
    const fallbackBox = document.getElementById('ws-loader-fallback');

    updateWorkspaceHeader(appId);

    if (selectEl) selectEl.value = app.id;
    const title = currentDisplayMode === 'adobe' ? app.adobeName : app.title;
    if (loaderText) loaderText.textContent = `Laster inn ${title} (WebAssembly)...`;

    if (fallbackBox) fallbackBox.style.display = 'none';
    if (loader) loader.style.display = 'flex';

    if (wasmTimeoutTimer) clearTimeout(wasmTimeoutTimer);
    // Hvis WebAssembly bruker mer enn 7 sekunder på å starte, vis direkte Desktop-nedlastingsknapp
    wasmTimeoutTimer = setTimeout(() => {
        if (fallbackBox) fallbackBox.style.display = 'block';
    }, 7000);

    if (iframe) {
        iframe.src = resolveAppUrl(app.path);
    }

    if (workspace) {
        workspace.classList.remove('hidden');
        document.body.style.overflow = 'hidden';
    }

    try {
        const url = new URL(window.location.href);
        url.searchParams.set('app', appId);
        window.history.replaceState({ app: appId }, title, url.toString());
    } catch (e) {}
}

function closeWorkspace() {
    const workspace = document.getElementById('artcraft-workspace');
    const iframe = document.getElementById('artcraft-iframe');
    const fallbackBox = document.getElementById('ws-loader-fallback');

    if (wasmTimeoutTimer) {
        clearTimeout(wasmTimeoutTimer);
        wasmTimeoutTimer = null;
    }

    if (workspace) {
        workspace.classList.add('hidden');
        document.body.style.overflow = '';
    }

    if (iframe) {
        iframe.src = 'about:blank';
    }

    if (fallbackBox) fallbackBox.style.display = 'none';

    currentAppId = null;

    try {
        const url = new URL(window.location.href);
        url.searchParams.delete('app');
        window.history.replaceState({}, document.title, url.pathname);
    } catch (e) {}
}

// -------------------------------------------------------------
// Admin-funksjonalitet: "Se etter og hent nyeste oppdateringer"
// -------------------------------------------------------------
function setupAdminPanel() {
    const panel = document.getElementById('admin-artcraft-panel');
    if (!panel) return;

    // Streng sikkerhet: KUN synlig og operativ for brukere med 'admin' i roles
    const isAdmin = userHasRole(currentUser, 'admin');
    if (!isAdmin) {
        panel.style.display = 'none';
        return;
    }

    panel.style.display = 'block';
    panel.classList.remove('hidden');

    const syncBtn = document.getElementById('admin-sync-releases-btn');
    const syncSpinner = document.getElementById('admin-sync-spinner');
    const syncBtnText = document.getElementById('admin-sync-btn-text');
    const lastSyncTimeEl = document.getElementById('admin-last-sync-time');
    const wasmStatusSummaryEl = document.getElementById('admin-wasm-status-summary');
    const alertBox = document.getElementById('admin-update-alert-box');
    const alertTitle = document.getElementById('admin-update-alert-title');
    const alertDesc = document.getElementById('admin-update-alert-desc');
    const copyCmdBtn = document.getElementById('admin-copy-cmd-btn');
    const triggerRebuildBtn = document.getElementById('admin-trigger-rebuild-btn');

    function updateAdminStatusUi() {
        if (!releasesData) {
            if (lastSyncTimeEl) lastSyncTimeEl.textContent = 'Ikke synkronisert';
            if (wasmStatusSummaryEl) wasmStatusSummaryEl.textContent = 'Ukjent status';
            return;
        }

        if (lastSyncTimeEl && releasesData.updated_at) {
            try {
                const date = new Date(releasesData.updated_at);
                lastSyncTimeEl.textContent = date.toLocaleString('no-NO', {
                    day: '2-digit',
                    month: 'short',
                    hour: '2-digit',
                    minute: '2-digit'
                });
            } catch (e) {
                lastSyncTimeEl.textContent = releasesData.updated_at;
            }
        }

        // Sjekk om nyere versjoner finnes på GitHub kontra lokale web-apper
        let outdatedApps = [];
        ARTCRAFT_APPS.forEach(app => {
            const rel = releasesData.apps ? releasesData.apps[app.id] : null;
            if (rel && rel.tag_name) {
                // Sjekk om det er registrert en installert versjon
                const installedVer = rel.installed_wasm_version || rel.tag_name;
                if (rel.installed_wasm_version && rel.installed_wasm_version !== rel.tag_name) {
                    outdatedApps.push({
                        title: app.title,
                        github: rel.tag_name,
                        installed: rel.installed_wasm_version
                    });
                }
            }
        });

        if (outdatedApps.length > 0) {
            if (wasmStatusSummaryEl) {
                wasmStatusSummaryEl.innerHTML = `<span style="color: #f59e0b;">⚠️ ${outdatedApps.length} oppdatering(er)</span>`;
            }
            if (alertBox) {
                alertBox.style.display = 'flex';
                alertBox.classList.remove('hidden');
                if (alertTitle) {
                    alertTitle.textContent = `Ny web-versjon tilgjengelig for ${outdatedApps.map(a => a.title).join(', ')}`;
                }
                if (alertDesc) {
                    alertDesc.textContent = outdatedApps.map(a => `${a.title}: ${a.github} tilgjengelig på GitHub (installert: ${a.installed})`).join(' • ');
                }
            }
        } else {
            if (wasmStatusSummaryEl) {
                wasmStatusSummaryEl.innerHTML = `<span style="color: #10b981;">✅ Alle 9 apper oppdatert</span>`;
            }
            if (alertBox) {
                alertBox.style.display = 'none';
                alertBox.classList.add('hidden');
            }
        }
    }

    updateAdminStatusUi();

    // 1. Synkroniser nyeste versjoner fra GitHub (Krav 3.1)
    if (syncBtn) {
        syncBtn.onclick = async () => {
            syncBtn.disabled = true;
            if (syncSpinner) syncSpinner.classList.add('spin-rotate');
            if (syncBtnText) syncBtnText.textContent = 'Henter data fra GitHub API...';

            const synchedApps = {};
            let successCount = 0;

            try {
                // Gjør oppslag for alle 9 apper
                for (const app of ARTCRAFT_APPS) {
                    try {
                        const url = `https://api.github.com/repos/storytold/${app.id}/releases/latest`;
                        const res = await fetch(url, {
                            headers: { 'Accept': 'application/vnd.github.v3+json' }
                        });
                        if (res.ok) {
                            const data = await res.json();
                            const downloads = filterGitHubAssets(data.assets || [], app.id);
                            
                            // Bevar tidligere installert web-versjon for nøyaktig sammenligning
                            const prevRel = getAppRelease(app.id);
                            const installedWasm = prevRel && prevRel.installed_wasm_version ? prevRel.installed_wasm_version : (prevRel ? prevRel.tag_name : data.tag_name);

                            synchedApps[app.id] = {
                                name: app.id,
                                title: app.title,
                                tag_name: data.tag_name || 'latest',
                                published_at: data.published_at,
                                installed_wasm_version: installedWasm,
                                downloads: downloads
                            };
                            successCount++;
                        }
                    } catch (e) {
                        console.warn(`Feil ved oppslag for ${app.title}:`, e);
                    }
                }

                if (successCount > 0) {
                    const newPayload = {
                        updated_at: new Date().toISOString(),
                        apps: synchedApps
                    };

                    // Lagre til prosjektets backend database/lagring så alle medlemmer får de nyeste lenkene umiddelbart
                    await ArtCraftAPI.saveReleases(newPayload);
                    releasesData = newPayload;

                    updateAdminStatusUi();
                    renderAppGrid();
                    alert(`✅ Synkronisering fullført! Hentet nyeste utgivelser for ${successCount}/${ARTCRAFT_APPS.length} apper. Alle medlemmer har nå direkte tilgang til de nyeste skrivebordspakkene.`);
                } else {
                    alert('⚠️ Kunne ikke hente nye versjoner fra GitHub (mulig rate-limit på API).');
                }
            } catch (err) {
                console.error("Feil ved synkronisering:", err);
                alert("Feil ved synkronisering: " + err.message);
            } finally {
                syncBtn.disabled = false;
                if (syncSpinner) syncSpinner.classList.remove('spin-rotate');
                if (syncBtnText) syncBtnText.textContent = 'Synkroniser nyeste versjoner fra GitHub';
            }
        };
    }

    // 2. Kopier kommando til utklippstavle
    if (copyCmdBtn) {
        copyCmdBtn.onclick = () => {
            navigator.clipboard.writeText('npm run fetch-artcraft').then(() => {
                copyCmdBtn.textContent = 'Kopiert!';
                setTimeout(() => {
                    copyCmdBtn.textContent = 'Kopier kommando';
                }, 2000);
            }).catch(() => {
                copyCmdBtn.textContent = 'Kopiert!';
            });
        };
    }

    // 3. Trigger Rebuild (Krav 3.2)
    if (triggerRebuildBtn) {
        triggerRebuildBtn.onclick = async () => {
            triggerRebuildBtn.disabled = true;
            triggerRebuildBtn.textContent = 'Sender forespørsel...';
            try {
                const res = await ArtCraftAPI.triggerRebuild();
                if (res && res.success) {
                    alert('🚀 Rebuild / Deploy Hook er utløst på serveren! Nye WebAssembly-apper blir bygget og distribuert nå.');
                } else if (res && res.configured === false) {
                    alert(`ℹ️ ${res.message}\n\nKopier og kjør kommandoen: "npm run fetch-artcraft" på utviklingsmaskinen eller serveren for å laste ned og pakke ut de nyeste web-pakkene.`);
                } else {
                    alert(`⚠️ Kunne ikke utløse automatisk rebuild: ${res?.message || 'Ingen respons'}`);
                }
            } catch (e) {
                alert(`Feil ved utløsing av rebuild: ${e.message}`);
            } finally {
                triggerRebuildBtn.disabled = false;
                triggerRebuildBtn.textContent = 'Oppdater Web-apper (Trigger Rebuild)';
            }
        };
    }
}

function setupLogout() {
    const btn = document.getElementById('logout-btn-header');
    if (btn) {
        btn.onclick = async () => {
            try {
                await AuthAPI.logout();
            } catch (e) {}
            try { localStorage.removeItem('cfa_has_session'); } catch (e) {}
            const isHtml = window.location.pathname.endsWith('.html');
            window.location.replace(isHtml ? 'login.html' : 'login');
        };
    }
}

document.addEventListener('DOMContentLoaded', () => {
    initCreativeToolsPage();
});
