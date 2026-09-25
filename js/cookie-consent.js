/**
 * Cosplay for alle (CfA) - Cookie Consent & Google Consent Mode v2
 * Rent JavaScript (Vanilla), ingen eksterne avhengigheter.
 */

(function () {
  'use strict';

  var STORAGE_KEY = 'cookie_consent';

  // Sjekk om appen kjører som en ren native app (Capacitor iOS/Android)
  var isNativeApp = !!(
    (window.Capacitor && typeof window.Capacitor.isNativePlatform === 'function' && window.Capacitor.isNativePlatform()) ||
    window.location.protocol === 'capacitor:' ||
    window.location.protocol === 'ionic:'
  );

  function getStoredConsent() {
    try {
      var item = localStorage.getItem(STORAGE_KEY);
      return item ? JSON.parse(item) : null;
    } catch (e) {
      return null;
    }
  }

  function updateGoogleConsent(analyticsGranted, marketingGranted) {
    if (typeof window.gtag === 'function') {
      window.gtag('consent', 'update', {
        'analytics_storage': analyticsGranted ? 'granted' : 'denied',
        'ad_storage': marketingGranted ? 'granted' : 'denied',
        'ad_user_data': marketingGranted ? 'granted' : 'denied',
        'ad_personalization': marketingGranted ? 'granted' : 'denied'
      });
    }
  }

  function saveConsent(analytics, marketing) {
    var consentData = {
      necessary: true,
      analytics: Boolean(analytics),
      marketing: Boolean(marketing),
      timestamp: new Date().toISOString()
    };

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(consentData));
    } catch (e) {
      console.warn('Kunne ikke lagre informasjonskapselsamtykke:', e);
    }

    updateGoogleConsent(consentData.analytics, consentData.marketing);
    closeBanner();

    // Utløs en egendefinert hendelse dersom andre skript lytter
    try {
      window.dispatchEvent(new CustomEvent('cfa_consent_updated', { detail: consentData }));
    } catch (e) {}
  }

  function createBannerDOM() {
    if (document.getElementById('cookie-consent-overlay')) {
      return;
    }

    var overlay = document.createElement('div');
    overlay.id = 'cookie-consent-overlay';
    overlay.className = 'cookie-overlay';
    overlay.setAttribute('aria-hidden', 'true');

    overlay.innerHTML = [
      '<div id="cookie-consent-banner" class="cookie-banner" role="dialog" aria-modal="true" aria-labelledby="cookie-title" aria-describedby="cookie-desc">',
      '  <!-- Hovedvisning -->',
      '  <div id="cookie-summary-view" class="cookie-view">',
      '    <div class="cookie-header">',
      '      <div class="cookie-title-group">',
      '        <span class="cookie-icon" aria-hidden="true">🍪</span>',
      '        <h2 id="cookie-title" class="cookie-title">Informasjonskapsler og personvern</h2>',
      '      </div>',
      '    </div>',
      '    <p id="cookie-desc" class="cookie-text">',
      '      Vi bruker informasjonskapsler (cookies) for å sikre at nettsiden fungerer som den skal, analysere bruksmønstre og levere relevant innhold og markedsføring. Du kan godta alle, avvise alle valgfrie eller tilpasse dine valg.',
      '    </p>',
      '    <div class="cookie-actions">',
      '      <button type="button" id="cookie-btn-accept" class="cookie-btn cookie-btn-primary">Godta alle</button>',
      '      <button type="button" id="cookie-btn-reject" class="cookie-btn cookie-btn-secondary">Avvis alle</button>',
      '      <button type="button" id="cookie-btn-customize" class="cookie-btn cookie-btn-outline">Tilpass</button>',
      '    </div>',
      '  </div>',
      '',
      '  <!-- Tilpassingsvisning -->',
      '  <div id="cookie-details-view" class="cookie-view" style="display: none;">',
      '    <div class="cookie-header">',
      '      <div class="cookie-title-group">',
      '        <h2 class="cookie-title">Tilpass informasjonskapsler</h2>',
      '      </div>',
      '      <button type="button" id="cookie-btn-back" class="cookie-back-btn" aria-label="Tilbake til oversikt">&larr; Tilbake</button>',
      '    </div>',
      '    <p class="cookie-text">',
      '      Velg hvilke typer informasjonskapsler du tillater. Nødvendige informasjonskapsler er alltid aktive for at nettsiden skal fungere sikkert og stabilt.',
      '    </p>',
      '    <div class="cookie-categories">',
      '      <!-- Nødvendige -->',
      '      <div class="cookie-category-item">',
      '        <div class="cookie-cat-info">',
      '          <div class="cookie-cat-header-line">',
      '            <span class="cookie-cat-name">Nødvendige</span>',
      '            <span class="cookie-badge">Alltid aktiv</span>',
      '          </div>',
      '          <p class="cookie-cat-desc">Nødvendige for grunnleggende funksjonalitet, sikkerhet og lagring av ditt samtykkevalg.</p>',
      '        </div>',
      '        <div class="cookie-toggle-wrap">',
      '          <input type="checkbox" id="cookie-check-necessary" checked disabled class="cookie-switch-input" aria-label="Nødvendige informasjonskapsler (låst til aktiv)">',
      '          <label for="cookie-check-necessary" class="cookie-switch-label is-disabled" title="Alltid aktiv"></label>',
      '        </div>',
      '      </div>',
      '      <!-- Statistikk -->',
      '      <div class="cookie-category-item">',
      '        <div class="cookie-cat-info">',
      '          <label for="cookie-check-analytics" class="cookie-cat-name clickable-label">Statistikk og analyse</label>',
      '          <p class="cookie-cat-desc">Hjelper oss å forstå hvordan nettsiden brukes, slik at vi kan forbedre opplevelsen og innholdet.</p>',
      '        </div>',
      '        <div class="cookie-toggle-wrap">',
      '          <input type="checkbox" id="cookie-check-analytics" class="cookie-switch-input">',
      '          <label for="cookie-check-analytics" class="cookie-switch-label"></label>',
      '        </div>',
      '      </div>',
      '      <!-- Markedsføring -->',
      '      <div class="cookie-category-item">',
      '        <div class="cookie-cat-info">',
      '          <label for="cookie-check-marketing" class="cookie-cat-name clickable-label">Markedsføring</label>',
      '          <p class="cookie-cat-desc">Brukes til å tilpasse relevante annonser og måle effekten av våre kampanjer via Google Ads.</p>',
      '        </div>',
      '        <div class="cookie-toggle-wrap">',
      '          <input type="checkbox" id="cookie-check-marketing" class="cookie-switch-input">',
      '          <label for="cookie-check-marketing" class="cookie-switch-label"></label>',
      '        </div>',
      '      </div>',
      '    </div>',
      '    <div class="cookie-actions cookie-details-actions">',
      '      <button type="button" id="cookie-btn-save-custom" class="cookie-btn cookie-btn-primary">Lagre valg</button>',
      '      <button type="button" id="cookie-btn-accept-all-custom" class="cookie-btn cookie-btn-secondary">Godta alle</button>',
      '    </div>',
      '  </div>',
      '</div>'
    ].join('\n');

    document.body.appendChild(overlay);
    bindEvents();
  }

  function bindEvents() {
    var btnAccept = document.getElementById('cookie-btn-accept');
    var btnReject = document.getElementById('cookie-btn-reject');
    var btnCustomize = document.getElementById('cookie-btn-customize');
    var btnBack = document.getElementById('cookie-btn-back');
    var btnSaveCustom = document.getElementById('cookie-btn-save-custom');
    var btnAcceptAllCustom = document.getElementById('cookie-btn-accept-all-custom');

    var checkAnalytics = document.getElementById('cookie-check-analytics');
    var checkMarketing = document.getElementById('cookie-check-marketing');

    if (btnAccept) {
      btnAccept.addEventListener('click', function () {
        saveConsent(true, true);
      });
    }

    if (btnReject) {
      btnReject.addEventListener('click', function () {
        saveConsent(false, false);
      });
    }

    if (btnCustomize) {
      btnCustomize.addEventListener('click', function () {
        var stored = getStoredConsent();
        if (checkAnalytics && checkMarketing) {
          checkAnalytics.checked = stored ? Boolean(stored.analytics) : false;
          checkMarketing.checked = stored ? Boolean(stored.marketing) : false;
        }
        showDetailsView();
      });
    }

    if (btnBack) {
      btnBack.addEventListener('click', function () {
        showSummaryView();
      });
    }

    if (btnSaveCustom) {
      btnSaveCustom.addEventListener('click', function () {
        var analyticsVal = checkAnalytics ? checkAnalytics.checked : false;
        var marketingVal = checkMarketing ? checkMarketing.checked : false;
        saveConsent(analyticsVal, marketingVal);
      });
    }

    if (btnAcceptAllCustom) {
      btnAcceptAllCustom.addEventListener('click', function () {
        saveConsent(true, true);
      });
    }
  }

  function showSummaryView() {
    var summaryView = document.getElementById('cookie-summary-view');
    var detailsView = document.getElementById('cookie-details-view');
    if (summaryView && detailsView) {
      detailsView.style.display = 'none';
      summaryView.style.display = 'block';
    }
  }

  function showDetailsView() {
    var summaryView = document.getElementById('cookie-summary-view');
    var detailsView = document.getElementById('cookie-details-view');
    if (summaryView && detailsView) {
      summaryView.style.display = 'none';
      detailsView.style.display = 'block';
    }
  }

  function showBanner() {
    createBannerDOM();
    var overlay = document.getElementById('cookie-consent-overlay');
    if (overlay) {
      // Bruk timeout for å tillate overgangsanimasjon
      setTimeout(function () {
        overlay.classList.add('is-visible');
        overlay.setAttribute('aria-hidden', 'false');
      }, 50);
    }
  }

  function closeBanner() {
    var overlay = document.getElementById('cookie-consent-overlay');
    if (overlay) {
      overlay.classList.remove('is-visible');
      overlay.setAttribute('aria-hidden', 'true');
    }
  }

  // Åpne banneret manuelt fra hvor som helst (f.eks. i bunnteksten)
  window.openCookieConsent = function () {
    createBannerDOM();
    var stored = getStoredConsent();
    var checkAnalytics = document.getElementById('cookie-check-analytics');
    var checkMarketing = document.getElementById('cookie-check-marketing');
    if (checkAnalytics && checkMarketing) {
      checkAnalytics.checked = stored ? Boolean(stored.analytics) : false;
      checkMarketing.checked = stored ? Boolean(stored.marketing) : false;
    }
    showDetailsView();
    showBanner();
  };

  function init() {
    if (isNativeApp) {
      // Ingen behov for informasjonskapselbanner i en ren Capacitor native mobil-app
      return;
    }

    var stored = getStoredConsent();
    if (!stored) {
      // Vis banneret hvis brukeren ikke har tatt et valg ennå
      showBanner();
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
