import { showToast } from './toast.js';
import { updateStats } from './dashboard.js';

let globalCsvData = [];
let isTokensLoaded = false;
let globalTokens = [];

export function initUploader() {
    const btnGenerateCsv = document.getElementById('btnGenerateCsv');
    const btnStartUpload = document.getElementById('btnStartUpload');
    const btnCancelUpload = document.getElementById('btnCancelUpload');
    const progressContainer = document.getElementById('upload-progress-container');
    const progressFill = document.getElementById('upload-progress-fill');
    const statusText = document.getElementById('upload-status-text');
    const statusTitle = document.getElementById('upload-status-title');
    const uploadLog = document.getElementById('upload-log');
    const btnClearUploadLog = document.getElementById('btnClearUploadLog');
    const categoryGroup = document.getElementById('categoryGroup');
    const categorySelect = document.getElementById('categorySelect');
    const uploadLimit = document.getElementById('uploadLimit');
    const intervaloInicial = document.getElementById('intervaloInicial');
    const intervaloSucesivo = document.getElementById('intervaloSucesivo');
    const fechaExacta = document.getElementById('fechaExacta');
    const chkFechaExacta = document.getElementById('chkFechaExacta');
    const publicarInmediato = document.getElementById('publicarInmediato');
    const pageSelect = document.getElementById('pageSelect');

    if (chkFechaExacta) {
        chkFechaExacta.addEventListener('change', () => {
            if (chkFechaExacta.checked) {
                fechaExacta.disabled = false;
                fechaExacta.style.opacity = '1';
                fechaExacta.style.cursor = 'text';
            } else {
                fechaExacta.disabled = true;
                fechaExacta.style.opacity = '0.6';
                fechaExacta.style.cursor = 'not-allowed';
                fechaExacta.value = '';
            }
        });
    }

    window.electronAPI.onPublisherLog((event, text) => {
        appendUploadLog(`[PUB] ${text}`);
    });

    if (btnClearUploadLog) {
        btnClearUploadLog.addEventListener('click', () => { uploadLog.innerHTML = ''; });
    }

    function appendUploadLog(msg) {
        uploadLog.textContent += msg + '\n';
        uploadLog.scrollTop = uploadLog.scrollHeight;
    }

    pageSelect.addEventListener('change', () => {
        loadCsvData();
    });

    categorySelect.addEventListener('change', () => {
        loadCsvData();
    });

    btnGenerateCsv.addEventListener('click', async () => {
        btnGenerateCsv.disabled = true;
        appendUploadLog('Auto-registrando nuevos archivos en la Base de Datos...');
        showToast('Auto-registrando descargas...', 'success');
        const result = await window.electronAPI.generateCsv();
        if(result.success) {
            appendUploadLog(result.message);
            showToast('Sincronización de Base de Datos exitosa.', 'success');
            loadCsvData(true);
        } else {
            appendUploadLog('Error: ' + result.message);
            showToast('Error en la sincronización de BD.', 'error');
        }
        btnGenerateCsv.disabled = false;
    });

    btnStartUpload.addEventListener('click', () => {
        const selectedPage = pageSelect.value;
        const selectedCategory = categorySelect.value;
    
        if (!selectedPage || selectedPage === "") {
            showToast('Error: Debes seleccionar una página destino.', 'error');
            return;
        }
    
        if (categoryGroup.style.display !== 'none' && (!selectedCategory || selectedCategory === "")) {
            showToast('Error: Debes seleccionar una categoría.', 'error');
            return;
        }
    
        btnStartUpload.classList.add('hidden');
        btnCancelUpload.classList.remove('hidden');
        progressContainer.classList.remove('hidden');
        
        progressFill.style.width = '0%';
        statusText.innerText = '0%';
        statusTitle.innerText = 'Iniciando cola de subida...';
        
        uploadLog.innerHTML = '';
        appendUploadLog('Iniciando proceso de subida...');
        showToast('Iniciando subida...', 'success');
        
        const limit = parseInt(uploadLimit.value) || 7;
        const intInicial = parseInt(intervaloInicial.value) || 0;
        const intSucesivo = parseInt(intervaloSucesivo.value) || 60;
        const isImmediate = publicarInmediato.checked;
        const exactDate = (chkFechaExacta.checked && fechaExacta.value) ? fechaExacta.value : null;
    
        window.electronAPI.startUpload({ 
            pagina: selectedPage,
            categoria: selectedCategory,
            limite: limit,
            intervaloInicial: intInicial,
            intervaloSucesivo: intSucesivo,
            fechaExacta: exactDate,
            publicarInmediato: isImmediate
        });
    });

    btnCancelUpload.addEventListener('click', () => {
        window.electronAPI.cancelUpload();
        btnCancelUpload.disabled = true;
        showToast('Cancelando subida...', 'error');
    });

    window.electronAPI.onUploadProgress((event, msg) => {
        appendUploadLog(msg);
    });

    window.electronAPI.onUploadBar((event, data) => {
        const { title, percent, totalVideos, currentVideo } = data;
        statusTitle.innerText = `[${currentVideo}/${totalVideos}] ${title}`;
        progressFill.style.width = `${percent}%`;
        statusText.innerText = `${percent}%`;
    });

    window.electronAPI.onUploadComplete((event, result) => {
        btnStartUpload.classList.remove('hidden');
        btnCancelUpload.classList.add('hidden');
        btnCancelUpload.disabled = false;
        
        if(result.success) {
            progressFill.style.width = '100%';
            statusTitle.innerText = '¡Proceso completado!';
            showToast('¡Subida completada!', 'success');
        } else {
            statusTitle.innerText = 'Proceso detenido o con errores.';
            showToast('Subida detenida.', 'error');
        }
        
        loadCsvData(true);
    });
}

export async function loadCsvData(forceRefresh = false) {
    const pageSelect = document.getElementById('pageSelect');
    const categoryGroup = document.getElementById('categoryGroup');
    const categorySelect = document.getElementById('categorySelect');

    if (!isTokensLoaded) {
        globalTokens = await window.electronAPI.getTokens();
        const prevPage = pageSelect.value;
        pageSelect.innerHTML = '<option value="" disabled selected>-- Selecciona una página --</option>'; // Placeholder forzado
        globalTokens.forEach(t => {
            if (t.folder && t.nombre_pag) {
                const opt = document.createElement('option');
                opt.value = t.folder;
                opt.textContent = t.nombre_pag;
                pageSelect.appendChild(opt);
            }
        });
        // Si hay valor previo y existe en las opciones nuevas, mantenerlo
        if (prevPage && [...pageSelect.options].map(o => o.value).includes(prevPage)) {
            pageSelect.value = prevPage;
        } else {
            pageSelect.value = ""; // Obligar a seleccionar
        }
        isTokensLoaded = true; // Wait, we might want to reload tokens on page config updates!
    } else if (forceRefresh) {
        // If forceRefresh is true, we should reload tokens too
        globalTokens = await window.electronAPI.getTokens();
        const prevPage = pageSelect.value;
        pageSelect.innerHTML = '<option value="" disabled selected>-- Selecciona una página --</option>'; // Placeholder forzado
        globalTokens.forEach(t => {
            if (t.folder && t.nombre_pag) {
                const opt = document.createElement('option');
                opt.value = t.folder;
                opt.textContent = t.nombre_pag;
                pageSelect.appendChild(opt);
            }
        });
        if (prevPage && [...pageSelect.options].map(o => o.value).includes(prevPage)) {
            pageSelect.value = prevPage;
        } else {
            pageSelect.value = ""; // Obligar a seleccionar
        }
    }

    if (forceRefresh || globalCsvData.length === 0) {
        globalCsvData = await window.electronAPI.getCsvData();
    }
    
    const filterPage = pageSelect.value;
    
    // Buscar la página seleccionada en los tokens para ver si tiene categorías configuradas
    const selectedPageToken = globalTokens.find(t => t.folder === filterPage);
    const uniqueCategories = selectedPageToken && selectedPageToken.categorias ? selectedPageToken.categorias : [];
    
    // Si la lista de categorías está vacía, ocultar el selector
    if (uniqueCategories.length === 0) {
        categoryGroup.style.display = 'none';
        categorySelect.value = '';
    } else {
        categoryGroup.style.display = 'flex';
        
        const prevCat = categorySelect.value;
        categorySelect.innerHTML = '<option value="" disabled selected>-- Selecciona una categoría --</option>'; // Placeholder forzado
        
        uniqueCategories.forEach(cat => {
            const opt = document.createElement('option');
            opt.value = cat;
            opt.textContent = cat;
            categorySelect.appendChild(opt);
        });
        
        if (uniqueCategories.includes(prevCat)) {
            categorySelect.value = prevCat;
        } else {
            categorySelect.value = ''; // Obligar a seleccionar
        }
    }
    
    // Ya no rellenamos la tabla pesada en el DOM, solo actualizamos estadísticas.
    updateStats(globalCsvData, globalTokens);
}
