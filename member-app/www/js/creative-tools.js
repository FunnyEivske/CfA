// js/creative-tools.js - Kontroller for Kreative Verktøy (ArtCraft)
import { AuthAPI, userHasRole } from './api-client.js';

const ARTCRAFT_APPS = [
    {
        id: 'photocraft',
        title: 'PhotoCraft',
        adobeName: 'Photoshop',
        desc: 'Komplett bilderedigering med lagstøtte, masker, markeringer, filter og retusjering av cosplay-bilder.',
        path: '/artcraft/photocraft/index.html',
        cfa: {
            alt: 'CfA • Bilderedigering',
            altColor: '#F3B716',
            altBg: 'rgba(243, 183, 22, 0.14)',
            badgeText: 'PC',
            badgeBg: '#0284c7'
        },
        adobe: {
            alt: 'Photoshop-alternativ',
            altColor: '#31a8ff',
            altBg: 'rgba(49, 168, 255, 0.14)',
            letters: 'Ps',
            textColor: '#31a8ff',
            borderColor: '#31a8ff',
            bgColor: '#001e36'
        }
    },
    {
        id: 'vectorcraft',
        title: 'VectorCraft',
        adobeName: 'Illustrator',
        desc: 'Vektorgrafikk, bézier-kurver og mønsterdesign. Perfekt for å tegne og skalere rustnings- og klesmønstre.',
        path: '/artcraft/vectorcraft/index.html',
        cfa: {
            alt: 'CfA • Vektordesign',
            altColor: '#F3B716',
            altBg: 'rgba(243, 183, 22, 0.14)',
            badgeText: 'VC',
            badgeBg: '#ea580c'
        },
        adobe: {
            alt: 'Illustrator-alternativ',
            altColor: '#ff9a00',
            altBg: 'rgba(255, 154, 0, 0.14)',
            letters: 'Ai',
            textColor: '#ff9a00',
            borderColor: '#ff9a00',
            bgColor: '#330000'
        }
    },
    {
        id: 'filmcraft',
        title: 'FilmCraft',
        adobeName: 'Premiere Pro',
        desc: 'Tidslinjebasert videoredigering, klipping, overganger og lydspor for cosplay-musikkvideoer og con-vlogs.',
        path: '/artcraft/filmcraft/index.html',
        cfa: {
            alt: 'CfA • Videoredigering',
            altColor: '#F3B716',
            altBg: 'rgba(243, 183, 22, 0.14)',
            badgeText: 'FC',
            badgeBg: '#9333ea'
        },
        adobe: {
            alt: 'Premiere Pro-alternativ',
            altColor: '#ea77ff',
            altBg: 'rgba(234, 119, 255, 0.14)',
            letters: 'Pr',
            textColor: '#ea77ff',
            borderColor: '#ea77ff',
            bgColor: '#330033'
        }
    },
    {
        id: 'lightcraft',
        title: 'LightCraft',
        adobeName: 'Lightroom',
        desc: 'RAW-fremkalling, fargegradering, eksponeringskontroll og lyskurver for profesjonell etterbehandling av fotoshoots.',
        path: '/artcraft/lightcraft/index.html',
        cfa: {
            alt: 'CfA • RAW & Foto',
            altColor: '#F3B716',
            altBg: 'rgba(243, 183, 22, 0.14)',
            badgeText: 'LC',
            badgeBg: '#0d9488'
        },
        adobe: {
            alt: 'Lightroom-alternativ',
            altColor: '#31a8ff',
            altBg: 'rgba(49, 168, 255, 0.14)',
            letters: 'Lr',
            textColor: '#31a8ff',
            borderColor: '#31a8ff',
            bgColor: '#001e36'
        }
    },
    {
        id: 'pdfcraft',
        title: 'PdfCraft',
        adobeName: 'Acrobat',
        desc: 'Vise, redigere, dele opp og slå sammen PDF-mønstre. Skriv ut mønstre i riktig målestokk på A4 eller A3.',
        path: '/artcraft/pdfcraft/index.html',
        cfa: {
            alt: 'CfA • PDF & Mønster',
            altColor: '#F3B716',
            altBg: 'rgba(243, 183, 22, 0.14)',
            badgeText: 'PC',
            badgeBg: '#dc2626'
        },
        adobe: {
            alt: 'Acrobat-alternativ',
            altColor: '#ff0000',
            altBg: 'rgba(255, 0, 0, 0.14)',
            letters: 'Ac',
            textColor: '#ff0000',
            borderColor: '#ff0000',
            bgColor: '#330000'
        }
    },
    {
        id: 'effectcraft',
        title: 'EffectCraft',
        adobeName: 'After Effects',
        desc: 'Visuelle effekter, animasjon og bevegelsesgrafikk. Legg til magiske glødeffekter, laser og elementer på videoer.',
        path: '/artcraft/effectcraft/index.html',
        cfa: {
            alt: 'CfA • VFX & Effekter',
            altColor: '#F3B716',
            altBg: 'rgba(243, 183, 22, 0.14)',
            badgeText: 'EC',
            badgeBg: '#7c3aed'
        },
        adobe: {
            alt: 'After Effects-alternativ',
            altColor: '#9999ff',
            altBg: 'rgba(153, 153, 255, 0.14)',
            letters: 'Ae',
            textColor: '#9999ff',
            borderColor: '#9999ff',
            bgColor: '#20003b'
        }
    },
    {
        id: 'designcraft',
        title: 'DesignCraft',
        adobeName: 'InDesign',
        desc: 'Flersidig layout og sideoppsett for cosplay-bøker, portfolioer, plakater og hefter med typografi og rutenett.',
        path: '/artcraft/designcraft/index.html',
        cfa: {
            alt: 'CfA • Layout & Plakat',
            altColor: '#F3B716',
            altBg: 'rgba(243, 183, 22, 0.14)',
            badgeText: 'DC',
            badgeBg: '#db2777'
        },
        adobe: {
            alt: 'InDesign-alternativ',
            altColor: '#ff3366',
            altBg: 'rgba(255, 51, 102, 0.14)',
            letters: 'Id',
            textColor: '#ff3366',
            borderColor: '#ff3366',
            bgColor: '#3b001b'
        }
    },
    {
        id: 'figcraft',
        title: 'FigCraft',
        adobeName: 'Figma',
        desc: 'UI/UX-design og vektor-prototyping. Samarbeid om designoppsett, komponenter og planlegging av prosjekter.',
        path: '/artcraft/figcraft/index.html',
        cfa: {
            alt: 'CfA • UI/UX & Prototyping',
            altColor: '#F3B716',
            altBg: 'rgba(243, 183, 22, 0.14)',
            badgeText: 'FC',
            badgeBg: '#059669'
        },
        adobe: {
            alt: 'Figma-alternativ',
            altColor: '#0acf83',
            altBg: 'rgba(10, 207, 131, 0.14)',
            letters: 'Fg',
            textColor: '#0acf83',
            borderColor: '#0acf83',
            bgColor: '#1e1e1e'
        }
    },
    {
        id: 'soundcraft',
        title: 'SoundCraft',
        adobeName: 'Audition',
        desc: 'Flerstors lydopptak, miksing, lydeffekter og støyfjerning til sceneshow, sketsjer og video-voiceovers.',
        path: '/artcraft/soundcraft/index.html',
        cfa: {
            alt: 'CfA • Lydstudio & Tale',
            altColor: '#F3B716',
            altBg: 'rgba(243, 183, 22, 0.14)',
            badgeText: 'SC',
            badgeBg: '#16a34a'
        },
        adobe: {
            alt: 'Audition-alternativ',
            altColor: '#00e699',
            altBg: 'rgba(0, 230, 153, 0.14)',
            letters: 'Au',
            textColor: '#00e699',
            borderColor: '#00e699',
            bgColor: '#00332a'
        }
    }
];

let currentUser = null;
let currentAppId = null;

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

    setupModeSelector();
    renderAppGrid();
    setupWorkspace();
    setupLogout();

    // 4. Sjekk om URL har en spesifikk app i query eller hash (f.eks. ?app=photocraft eller #photocraft)
    const urlParams = new URLSearchParams(window.location.search);
    const queryApp = urlParams.get('app');
    const hashApp = window.location.hash ? window.location.hash.substring(1) : null;
    const targetApp = queryApp || hashApp;

    if (targetApp && ARTCRAFT_APPS.some(a => a.id === targetApp)) {
        openApp(targetApp);
    }
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
    const statusLabel = document.getElementById('logo-mode-status');
    const buttons = document.querySelectorAll('.mode-btn');

    function updateUi() {
        buttons.forEach(btn => {
            const mode = btn.getAttribute('data-mode');
            btn.classList.toggle('active', mode === currentDisplayMode);
        });

        if (statusLabel) {
            if (currentDisplayMode === 'adobe') {
                statusLabel.textContent = 'Adobe-ikoner og Adobe-navn aktivert';
                statusLabel.style.color = '#0284c7';
            } else if (currentDisplayMode === 'hybrid') {
                statusLabel.textContent = 'ArtCraft-navn med Adobe-ikoner & farger';
                statusLabel.style.color = '#d97706';
            } else {
                statusLabel.textContent = 'ArtCraft-ikoner og ArtCraft-navn (standard)';
                statusLabel.style.color = 'var(--color-text-muted)';
            }
        }
    }

    updateUi();

    buttons.forEach(btn => {
        btn.onclick = () => {
            const nextMode = btn.getAttribute('data-mode');
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
        };
    });
}

function renderAppGrid() {
    const container = document.getElementById('apps-container');
    if (!container) return;

    container.innerHTML = '';

    ARTCRAFT_APPS.forEach(app => {
        const appUrl = resolveAppUrl(app.path);
        const card = document.createElement('div');
        card.className = 'app-card';

        let iconBoxHtml = '';
        let altTagText = '';
        let altTagColor = '';
        let altTagBg = '';
        let appTitle = '';
        let buttonLabel = '';

        if (currentDisplayMode === 'adobe') {
            // Full Adobe: Adobe ikoner og Adobe navn
            appTitle = app.adobeName;
            buttonLabel = `Åpne ${app.adobeName}`;
            iconBoxHtml = `
                <div class="app-icon-box adobe-style" style="background: ${app.adobe.bgColor}; color: ${app.adobe.textColor}; border: 2.5px solid ${app.adobe.borderColor};">
                    <span>${app.adobe.letters}</span>
                </div>
            `;
            altTagText = app.adobe.alt;
            altTagColor = app.adobe.altColor;
            altTagBg = app.adobe.altBg;
        } else if (currentDisplayMode === 'hybrid') {
            // Hybrid: ArtCraft navn med Adobe ikoner
            appTitle = app.title;
            buttonLabel = `Åpne ${app.title}`;
            iconBoxHtml = `
                <div class="app-icon-box adobe-style" style="background: ${app.adobe.bgColor}; color: ${app.adobe.textColor}; border: 2.5px solid ${app.adobe.borderColor};">
                    <span>${app.adobe.letters}</span>
                </div>
            `;
            altTagText = app.adobe.alt;
            altTagColor = app.adobe.altColor;
            altTagBg = app.adobe.altBg;
        } else {
            // ArtCraft: ArtCraft ikoner og ArtCraft navn
            appTitle = app.title;
            buttonLabel = `Åpne ${app.title}`;
            iconBoxHtml = `
                <div class="app-icon-box cfa-style">
                    <img src="Media/Logo/cfa-logo.svg" alt="CfA ${app.title}" class="cfa-icon-logo">
                    <span class="cfa-corner-badge" style="background: ${app.cfa.badgeBg};">${app.cfa.badgeText}</span>
                </div>
            `;
            altTagText = app.cfa.alt;
            altTagColor = app.cfa.altColor;
            altTagBg = app.cfa.altBg;
        }

        card.innerHTML = `
            <div>
                ${iconBoxHtml}
                <span class="app-alt-tag" style="background: ${altTagBg}; color: ${altTagColor};">
                    ${altTagText}
                </span>
                <h3 class="app-title">${appTitle}</h3>
                <p class="app-desc">${app.desc}</p>
            </div>
            <div class="app-actions">
                <button type="button" class="btn btn-primary btn-sm open-app-btn" style="flex: 1; padding: 0.6rem 1rem; font-weight: 600; font-size: 0.9rem;">
                    ${buttonLabel}
                </button>
                <a href="${appUrl}" target="_blank" rel="noopener noreferrer" class="btn btn-ghost btn-sm" title="Åpne i ny fane" style="padding: 0.6rem; color: var(--color-text-muted);">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                        <polyline points="15 3 21 3 21 9"></polyline>
                        <line x1="10" y1="14" x2="21" y2="3"></line>
                    </svg>
                </a>
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
        if (currentDisplayMode === 'adobe' || currentDisplayMode === 'hybrid') {
            iconEl.innerHTML = `
                <span style="display: inline-flex; align-items: center; justify-content: center; width: 28px; height: 28px; border-radius: 6px; background: ${app.adobe.bgColor}; color: ${app.adobe.textColor}; border: 1.5px solid ${app.adobe.borderColor}; font-weight: 800; font-size: 0.85rem; font-family: sans-serif;">
                    ${app.adobe.letters}
                </span>
            `;
        } else {
            iconEl.innerHTML = `
                <img src="Media/Logo/cfa-logo.svg" alt="CfA" style="width: 26px; height: 26px; object-fit: contain; vertical-align: middle;">
            `;
        }
    }

    if (tagEl) {
        tagEl.textContent = currentDisplayMode === 'artcraft' ? app.cfa.alt : app.adobe.alt;
    }
}

function updateWorkspaceSelectOptions() {
    const select = document.getElementById('ws-switch-select');
    if (!select) return;

    const currentVal = select.value;
    select.innerHTML = ARTCRAFT_APPS.map(app => {
        const title = currentDisplayMode === 'adobe' ? app.adobeName : app.title;
        const tag = currentDisplayMode === 'adobe' ? app.adobe.letters : app.cfa.badgeText;
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
            loader.style.display = 'none';
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

    updateWorkspaceHeader(appId);

    if (selectEl) selectEl.value = app.id;
    const title = currentDisplayMode === 'adobe' ? app.adobeName : app.title;
    if (loaderText) loaderText.textContent = `Laster inn ${title} (WebAssembly)...`;

    if (loader) loader.style.display = 'flex';
    if (iframe) {
        iframe.src = resolveAppUrl(app.path);
    }

    if (workspace) {
        workspace.classList.remove('hidden');
        document.body.style.overflow = 'hidden';
    }

    // Oppdater URL uten å laste om siden
    try {
        const url = new URL(window.location.href);
        url.searchParams.set('app', appId);
        window.history.replaceState({ app: appId }, title, url.toString());
    } catch (e) {}
}

function closeWorkspace() {
    const workspace = document.getElementById('artcraft-workspace');
    const iframe = document.getElementById('artcraft-iframe');

    if (workspace) {
        workspace.classList.add('hidden');
        document.body.style.overflow = '';
    }

    if (iframe) {
        iframe.src = 'about:blank';
    }

    currentAppId = null;

    try {
        const url = new URL(window.location.href);
        url.searchParams.delete('app');
        window.history.replaceState({}, document.title, url.pathname);
    } catch (e) {}
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
