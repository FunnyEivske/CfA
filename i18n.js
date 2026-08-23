const translations = {};
let currentLang = localStorage.getItem('cfa_lang') || 'no';

async function loadTranslations(lang) {
    if (!translations[lang]) {
        try {
            const response = await fetch(`/locales/${lang}.json`);
            translations[lang] = await response.json();
        } catch (error) {
            console.error('Failed to load translations for', lang, error);
            return;
        }
    }
    applyTranslations(lang);
}

function applyTranslations(lang) {
    const t = translations[lang];
    if (!t) return;
    
    document.documentElement.lang = lang;
    
    const elements = document.querySelectorAll('[data-i18n]');
    elements.forEach(el => {
        const key = el.getAttribute('data-i18n');
        if (t[key]) {
            if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
                el.placeholder = t[key];
            } else {
                el.textContent = t[key];
            }
        }
    });
}

export function setLanguage(lang) {
    currentLang = lang;
    localStorage.setItem('cfa_lang', lang);
    loadTranslations(lang);
}

export function toggleLanguage() {
    setLanguage(currentLang === 'no' ? 'en' : 'no');
}

export function initI18n() {
    loadTranslations(currentLang);
    
    const langBtn = document.getElementById('lang-toggle-btn');
    if (langBtn) {
        langBtn.addEventListener('click', toggleLanguage);
    }
}

document.addEventListener('DOMContentLoaded', initI18n);
