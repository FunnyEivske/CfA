// js/creative-tools.js - Kontroller for Kreative Verktøy (ArtCraft)
import { AuthAPI, userHasRole } from './api-client.js';

const ARTCRAFT_APPS = [
    {
        id: 'photocraft',
        title: 'PhotoCraft',
        alt: 'Photoshop-alternativ',
        altColor: '#0284c7',
        altBg: 'rgba(2, 132, 199, 0.12)',
        icon: '🎨',
        iconBg: 'linear-gradient(135deg, #0284c7, #38bdf8)',
        desc: 'Komplett bilderedigering med lagstøtte, masker, markeringer, filter og retusjering av cosplay-bilder.',
        path: '/artcraft/photocraft/index.html'
    },
    {
        id: 'vectorcraft',
        title: 'VectorCraft',
        alt: 'Illustrator-alternativ',
        altColor: '#ea580c',
        altBg: 'rgba(234, 88, 12, 0.12)',
        icon: '✒️',
        iconBg: 'linear-gradient(135deg, #ea580c, #fb923c)',
        desc: 'Vektorgrafikk, bézier-kurver og mønsterdesign. Perfekt for å tegne og skalere rustnings- og klesmønstre.',
        path: '/artcraft/vectorcraft/index.html'
    },
    {
        id: 'filmcraft',
        title: 'FilmCraft',
        alt: 'Premiere Pro-alternativ',
        altColor: '#9333ea',
        altBg: 'rgba(147, 51, 234, 0.12)',
        icon: '🎬',
        iconBg: 'linear-gradient(135deg, #7e22ce, #c084fc)',
        desc: 'Tidslinjebasert videoredigering, klipping, overganger og lydspor for cosplay-musikkvideoer og con-vlogs.',
        path: '/artcraft/filmcraft/index.html'
    },
    {
        id: 'lightcraft',
        title: 'LightCraft',
        alt: 'Lightroom-alternativ',
        altColor: '#0d9488',
        altBg: 'rgba(13, 148, 136, 0.12)',
        icon: '💡',
        iconBg: 'linear-gradient(135deg, #0f766e, #2dd4bf)',
        desc: 'RAW-fremkalling, fargegradering, eksponeringskontroll og lyskurver for profesjonell etterbehandling av fotoshoots.',
        path: '/artcraft/lightcraft/index.html'
    },
    {
        id: 'pdfcraft',
        title: 'PdfCraft',
        alt: 'Acrobat-alternativ',
        altColor: '#dc2626',
        altBg: 'rgba(220, 38, 38, 0.12)',
        icon: '📑',
        iconBg: 'linear-gradient(135deg, #b91c1c, #f87171)',
        desc: 'Vise, redigere, dele opp og slå sammen PDF-mønstre. Skriv ut mønstre i riktig målestokk på A4 eller A3.',
        path: '/artcraft/pdfcraft/index.html'
    },
    {
        id: 'effectcraft',
        title: 'EffectCraft',
        alt: 'After Effects-alternativ',
        altColor: '#7c3aed',
        altBg: 'rgba(124, 58, 237, 0.12)',
        icon: '✨',
        iconBg: 'linear-gradient(135deg, #6d28d9, #a78bfa)',
        desc: 'Visuelle effekter, animasjon og bevegelsesgrafikk. Legg til magiske glødeffekter, laser og elementer på videoer.',
        path: '/artcraft/effectcraft/index.html'
    },
    {
        id: 'designcraft',
        title: 'DesignCraft',
        alt: 'InDesign-alternativ',
        altColor: '#db2777',
        altBg: 'rgba(219, 39, 119, 0.12)',
        icon: '📰',
        iconBg: 'linear-gradient(135deg, #be185d, #f472b6)',
        desc: 'Flersidig layout og sideoppsett for cosplay-bøker, portfolioer, plakater og hefter med typografi og rutenett.',
        path: '/artcraft/designcraft/index.html'
    },
    {
        id: 'figcraft',
        title: 'FigCraft',
        alt: 'Figma-alternativ',
        altColor: '#059669',
        altBg: 'rgba(5, 150, 105, 0.12)',
        icon: '📐',
        iconBg: 'linear-gradient(135deg, #047857, #34d399)',
        desc: 'UI/UX-design og vektor-prototyping. Samarbeid om designoppsett, komponenter og planlegging av prosjekter.',
        path: '/artcraft/figcraft/index.html'
    },
    {
        id: 'soundcraft',
        title: 'SoundCraft',
        alt: 'Audition-alternativ',
        altColor: '#16a34a',
        altBg: 'rgba(22, 163, 74, 0.12)',
        icon: '🎙️',
        iconBg: 'linear-gradient(135deg, #15803d, #4ade80)',
        desc: 'Flerstors lydopptak, miksing, lydeffekter og støyfjerning til sceneshow, sketsjer og video-voiceovers.',
        path: '/artcraft/soundcraft/index.html'
    }
];

let currentUser = null;
let currentAppId = null;

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

function renderAppGrid() {
    const container = document.getElementById('apps-container');
    if (!container) return;

    container.innerHTML = '';

    ARTCRAFT_APPS.forEach(app => {
        const appUrl = resolveAppUrl(app.path);
        const card = document.createElement('div');
        card.className = 'app-card';
        card.innerHTML = `
            <div>
                <div class="app-icon-box" style="background: ${app.iconBg}; color: #ffffff;">
                    <span>${app.icon}</span>
                </div>
                <span class="app-alt-tag" style="background: ${app.altBg}; color: ${app.altColor};">
                    ${app.alt}
                </span>
                <h3 class="app-title">${app.title}</h3>
                <p class="app-desc">${app.desc}</p>
            </div>
            <div class="app-actions">
                <button type="button" class="btn btn-primary btn-sm open-app-btn" style="flex: 1; padding: 0.6rem 1rem; font-weight: 600; font-size: 0.9rem;">
                    Åpne ${app.title}
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

function setupWorkspace() {
    const workspace = document.getElementById('artcraft-workspace');
    const closeBtn = document.getElementById('ws-close-btn');
    const switchSelect = document.getElementById('ws-switch-select');
    const openTabBtn = document.getElementById('ws-open-tab-btn');
    const iframe = document.getElementById('artcraft-iframe');
    const loader = document.getElementById('ws-loader');

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
    const iconEl = document.getElementById('ws-app-icon');
    const nameEl = document.getElementById('ws-app-name');
    const tagEl = document.getElementById('ws-app-tag');
    const selectEl = document.getElementById('ws-switch-select');

    if (iconEl) iconEl.textContent = app.icon;
    if (nameEl) nameEl.textContent = app.title;
    if (tagEl) tagEl.textContent = app.alt;
    if (selectEl) selectEl.value = app.id;
    if (loaderText) loaderText.textContent = `Laster inn ${app.title} (WebAssembly)...`;

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
        window.history.replaceState({ app: appId }, app.title, url.toString());
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
    const logoutBtn = document.getElementById('logout-btn-header');
    if (logoutBtn) {
        logoutBtn.onclick = async () => {
            try {
                await AuthAPI.logout();
            } catch (e) {}
            localStorage.removeItem('cfa_has_session');
            window.location.href = 'login';
        };
    }
}

// Initialiser når DOM er klar
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initCreativeToolsPage);
} else {
    initCreativeToolsPage();
}
