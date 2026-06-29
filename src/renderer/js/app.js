import { initNavigation } from './navigation.js';
import { initDownloader } from './downloader.js';
import { initUploader, loadCsvData } from './uploader.js';
import { initConfig } from './config.js';

window.onerror = function(message, source, lineno, colno, error) {
    alert('Global Error: ' + message + ' at ' + source + ':' + lineno);
};
window.onunhandledrejection = function(event) {
    alert('Unhandled Promise Rejection: ' + event.reason);
};

document.addEventListener('DOMContentLoaded', () => {
    // Inicializamos Navegación y Temas
    initNavigation(() => {
        // Callback que se llama al entrar a la vista Uploader
        loadCsvData();
    });

    // Inicializamos lógica del Descargador
    initDownloader();

    // Inicializamos lógica del Publicador
    initUploader();

    // Inicializamos lógica de Configuración
    initConfig();
    // Cargamos los datos iniciales y el dashboard apenas arranca la app
    loadCsvData(true);
});
