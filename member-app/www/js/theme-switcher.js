(function () {
    // 1. Initialiser tema umiddelbart for å unngå FOUC
    const savedTheme = localStorage.getItem('theme');
    const isDark = savedTheme === 'dark'; // Alltid light mode som standard hvis ikke lagret som 'dark'

    document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');

    // 2. Funksjon for å bytte tema
    window.toggleTheme = function () {
        const currentTheme = document.documentElement.getAttribute('data-theme');
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';

        document.documentElement.setAttribute('data-theme', newTheme);
        localStorage.setItem('theme', newTheme);
        window.updateDarkModeIcons(newTheme === 'dark');

        const themeLabel = document.getElementById('pwa-current-theme-label');
        if (themeLabel) {
            themeLabel.textContent = newTheme === 'dark' ? 'Mørkt tema' : 'Lyst tema';
        }
    };

    // 3. Oppdater ikoner (sol/måne)
    window.updateDarkModeIcons = function (isDark) {
        const moonIcons = document.querySelectorAll('.moon-icon');
        const sunIcons = document.querySelectorAll('.sun-icon');

        if (isDark) {
            moonIcons.forEach(i => i.classList.add('hidden'));
            sunIcons.forEach(i => i.classList.remove('hidden'));
        } else {
            moonIcons.forEach(i => i.classList.remove('hidden'));
            sunIcons.forEach(i => i.classList.add('hidden'));
        }
    };

    // 4. Koble til alle knapper med .theme-toggle klasse
    function initThemeButtons() {
        const isDarkNow = document.documentElement.getAttribute('data-theme') === 'dark';
        window.updateDarkModeIcons(isDarkNow);

        document.querySelectorAll('.theme-toggle').forEach(btn => {
            if (!btn.dataset.themeBound) {
                btn.dataset.themeBound = 'true';
                btn.addEventListener('click', (e) => {
                    e.preventDefault();
                    window.toggleTheme();
                });
            }
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initThemeButtons);
    } else {
        initThemeButtons();
    }
})();
