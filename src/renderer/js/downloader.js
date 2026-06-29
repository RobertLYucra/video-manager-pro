import { showToast } from './toast.js';

export function initDownloader() {
    const urlInput = document.getElementById('urlInput');
    const tagsContainer = document.getElementById('tagsContainer');
    const formatSelect = document.getElementById('formatSelect');
    const resSelect = document.getElementById('resSelect');
    const resGroup = document.getElementById('resGroup');
    const forceRedownload = document.getElementById('forceRedownload');
    const clearHistoryBtn = document.getElementById('clearHistoryBtn');
    const downloadBtn = document.getElementById('downloadBtn');
    const cancelBtn = document.getElementById('cancelBtn');
    const btnClearLog = document.getElementById('btnClearLog');
    const logOutput = document.getElementById('logOutput');
    const statusDot = document.querySelector('.status-dot');
    const processTimer = document.getElementById('processTimer');
    
    let urlList = [];
    let timerInterval;
    let startTime;
    
    function startTimer() {
        clearInterval(timerInterval);
        processTimer.style.display = 'inline';
        processTimer.textContent = '00:00';
        startTime = Date.now();
        
        timerInterval = setInterval(() => {
            const elapsed = Math.floor((Date.now() - startTime) / 1000);
            const mins = String(Math.floor(elapsed / 60)).padStart(2, '0');
            const secs = String(elapsed % 60).padStart(2, '0');
            processTimer.textContent = `${mins}:${secs}`;
        }, 1000);
    }
    
    function stopTimer() {
        clearInterval(timerInterval);
    }
    
    function renderTags() {
        document.querySelectorAll('.tag').forEach(tag => tag.remove());
        urlList.forEach((url, index) => {
            const tag = document.createElement('div');
            tag.className = 'tag';
            tag.innerHTML = `
                <span>${url.length > 40 ? url.substring(0, 40) + '...' : url}</span>
                <div class="close-btn" data-index="${index}">✕</div>
            `;
            tagsContainer.insertBefore(tag, urlInput);
        });
    
        document.querySelectorAll('.tag .close-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const idx = e.target.getAttribute('data-index');
                urlList.splice(idx, 1);
                renderTags();
            });
        });
    }
    
    function processUrls(text) {
        const newUrls = text.split(/[\n,\s]+/)
            .map(line => line.trim())
            .filter(line => line.startsWith('http') && !urlList.includes(line));
        
        if (newUrls.length > 0) {
            urlList = [...urlList, ...newUrls];
            renderTags();
            urlInput.value = '';
        }
    }
    
    urlInput.addEventListener('paste', (e) => {
        e.preventDefault();
        const pastedText = (e.clipboardData || window.clipboardData).getData('text');
        tagsContainer.classList.remove('has-error');
        processUrls(pastedText);
    });
    
    urlInput.addEventListener('keydown', (e) => {
        tagsContainer.classList.remove('has-error');
        if (e.key === 'Enter') {
            e.preventDefault();
            processUrls(urlInput.value);
        }
    });
    
    tagsContainer.addEventListener('click', () => urlInput.focus());
    
    formatSelect.addEventListener('change', (e) => {
        if (e.target.value === 'audio') {
            resGroup.style.opacity = '0.3';
            resSelect.disabled = true;
        } else {
            resGroup.style.opacity = '1';
            resSelect.disabled = false;
        }
    });
    
    function appendLog(text) {
        if (text.trim() === '') return;
        const lines = text.split(/\r|\n/).filter(l => l.trim() !== '');
        
        for (let line of lines) {
            if (line.includes('WARNING:') || line.includes('No supported JavaScript runtime')) continue;
            
            const isProgress = line.includes('% de') || line.includes('% of') || line.match(/\d+\.\d+%/);
            const lastChild = logOutput.lastElementChild;
            
            if (isProgress && lastChild && lastChild.dataset.progress === 'true') {
                lastChild.textContent = line.trim();
            } else {
                const div = document.createElement('div');
                div.textContent = line.trim();
                if (line.includes('Error') || line.includes('❌')) div.style.color = 'var(--danger)';
                else if (line.includes('✅') || line.includes('éxito')) div.style.color = 'var(--success)';
                
                if (isProgress) div.dataset.progress = 'true';
                logOutput.appendChild(div);
            }
        }
        
        setTimeout(() => { logOutput.scrollTop = logOutput.scrollHeight; }, 10);
    }
    
    btnClearLog.addEventListener('click', () => { logOutput.innerHTML = ''; });
    
    clearHistoryBtn.addEventListener('click', async () => {
        clearHistoryBtn.disabled = true;
        const success = await window.electronAPI.clearHistory();
        if (success) {
            showToast('Historial limpiado correctamente', 'success');
            appendLog('🗑️ El archivo de historial ha sido eliminado.');
        } else {
            showToast('Error al limpiar el historial', 'error');
        }
        clearHistoryBtn.disabled = false;
    });
    
    downloadBtn.addEventListener('click', async () => {
        if (urlInput.value.trim().startsWith('http')) processUrls(urlInput.value);
        
        if (urlList.length === 0) {
            tagsContainer.classList.add('has-error');
            showToast('Debes agregar al menos una URL válida.', 'error');
            return;
        }
        tagsContainer.classList.remove('has-error');
    
        const outputFolder = await window.electronAPI.selectDirectory();
        if (!outputFolder) return;
    
        downloadBtn.classList.add('hidden');
        cancelBtn.classList.remove('hidden');
        cancelBtn.disabled = false;
        statusDot.classList.add('active');
        logOutput.innerHTML = '';
        
        appendLog(`Carpeta de destino: ${outputFolder}`);
        appendLog(`Iniciando proceso de descarga para ${urlList.length} enlace(s)...`);
    
        const cleanUrls = urlList.map(u => {
            try {
                const urlObj = new URL(u);
                if (urlObj.hostname.includes('youtube.com') && urlObj.pathname === '/watch') {
                    urlObj.searchParams.delete('list');
                    urlObj.searchParams.delete('index');
                    urlObj.searchParams.delete('start_radio');
                    return urlObj.toString();
                }
                return u;
            } catch(e) { return u; }
        });
    
        startTimer();
    
        window.electronAPI.startDownload({
            urls: cleanUrls,
            soloAudio: formatSelect.value === 'audio',
            resolucion: resSelect.value,
            outputFolder: outputFolder,
            forceRedownload: forceRedownload.checked
        });
    });
    
    cancelBtn.addEventListener('click', () => {
        cancelBtn.disabled = true;
        window.electronAPI.cancelDownload();
    });
    
    window.electronAPI.onDownloadProgress((event, data) => {
        let text = data.toString().trim();
        text = text.replace(/\[download\]/gi, '[Descargando]')
                   .replace(/\[ExtractAudio\]/gi, '[Procesando Audio]')
                   .replace(/\[Merger\]/gi, '[Ensamblando Video]')
                   .replace(/Destination:/gi, 'Destino:')
                   .replace(/of/g, 'de')
                   .replace(/at/g, 'a')
                   .replace(/ETA/g, 'Tiempo est.:')
                   .replace(/Deleting original file/gi, 'Borrando archivo temporal')
                   .replace(/Downloading video/gi, 'Obteniendo video')
                   .replace(/Downloading playlist:/gi, 'Descargando lista:')
                   .replace(/Finished downloading playlist:/gi, 'Lista completada:')
                   .replace(/Downloading item/gi, 'Descargando elemento')
                   .replace(/has already been downloaded/gi, 'ya fue descargado previamente.')
                   .replace(/has already been recorded in the archive/gi, 'ya está registrado en el historial y fue omitido.');
        appendLog(text);
    });
    
    window.electronAPI.onDownloadComplete((event, code) => {
        downloadBtn.classList.remove('hidden');
        cancelBtn.classList.add('hidden');
        statusDot.classList.remove('active');
        stopTimer();
        
        if (code === 0) {
            appendLog('\n✅ ¡Descarga finalizada con éxito!');
            showToast('¡Descarga finalizada con éxito!', 'success');
            urlInput.value = '';
            urlList = [];
            renderTags();
        } else if (code === -1) {
            processTimer.style.display = 'none';
            appendLog(`❌ Descarga cancelada.`);
            showToast('Descarga cancelada', 'error');
        } else {
            processTimer.style.display = 'none';
            appendLog(`❌ La descarga terminó con errores.`);
            showToast('Error en la descarga', 'error');
        }
    });
}
