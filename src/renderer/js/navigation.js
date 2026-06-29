export function initNavigation(onNavigateToUploader) {
    const navBtns = document.querySelectorAll('.nav-btn');
    const views = document.querySelectorAll('.view');
    const themeToggle = document.getElementById('themeToggle');
    
    // Configurar Cambio de Pestañas
    navBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            navBtns.forEach(b => b.classList.remove('active'));
            views.forEach(v => v.classList.remove('active'));
            
            btn.classList.add('active');
            document.getElementById(btn.dataset.target).classList.add('active');
            
            if(btn.dataset.target === 'uploader-view' && typeof onNavigateToUploader === 'function') {
                onNavigateToUploader();
            }
        });
    });

    // Configurar Temas
    const systemPrefersLight = window.matchMedia('(prefers-color-scheme: light)');
    const savedTheme = localStorage.getItem('theme');

    function applyTheme(isLight) {
        if (isLight) {
            document.body.classList.add('light-theme');
            themeToggle.textContent = '☀️';
        } else {
            document.body.classList.remove('light-theme');
            themeToggle.textContent = '🌙';
        }
    }

    if (savedTheme === 'light' || (savedTheme === null && systemPrefersLight.matches)) {
        applyTheme(true);
    } else {
        applyTheme(false);
    }

    systemPrefersLight.addEventListener('change', (e) => {
        if (!localStorage.getItem('theme')) applyTheme(e.matches);
    });

    themeToggle.addEventListener('click', () => {
        const isLightNow = !document.body.classList.contains('light-theme');
        applyTheme(isLightNow);
        localStorage.setItem('theme', isLightNow ? 'light' : 'dark');
    });
}
