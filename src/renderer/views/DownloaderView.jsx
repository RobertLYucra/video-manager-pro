import React, { useState, useEffect } from 'react';
import LoggerTerminal from '../components/LoggerTerminal';

function DownloaderView() {
    const [format, setFormat] = useState('video');
    const [resolution, setResolution] = useState('1080');
    const [forceRedownload, setForceRedownload] = useState(false);
    const [isDownloading, setIsDownloading] = useState(false);
    
    const [logLines, setLogLines] = useState([]);

    useEffect(() => {
        // Singleton pattern to prevent duplicate IPC listeners on mount/unmount
        if (!window._downloaderIpcAttached) {
            window.electronAPI.onDownloadProgress((event, data) => {
                if (window._handleDownloadProgress) window._handleDownloadProgress(event, data);
            });
            window.electronAPI.onDownloadComplete((event, code) => {
                if (window._handleDownloadComplete) window._handleDownloadComplete(event, code);
            });
            window._downloaderIpcAttached = true;
        }

        window._handleDownloadProgress = (event, data) => {
            let text = data.toString().trim();
            if (!text) return;

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

            const lines = text.split(/\r|\n/).filter(l => l.trim() !== '');
            
            setLogLines(prev => {
                let newLines = [...prev];
                for (let line of lines) {
                    if (line.includes('WARNING:') || line.includes('No supported JavaScript runtime')) continue;
                    
                    const isProgress = line.includes('% de') || line.match(/\d+\.\d+%/);
                    const lastLine = newLines.length > 0 ? newLines[newLines.length - 1] : null;

                    if (isProgress && lastLine && lastLine.isProgress) {
                        newLines[newLines.length - 1] = { ...lastLine, text: line.trim() };
                    } else {
                        newLines.push({ text: line.trim(), isProgress: isProgress });
                    }
                }
                return newLines;
            });
        };

        window._handleDownloadComplete = (event, code) => {
            setIsDownloading(false);
            if (code === 0) {
                window.showToast('Descarga completada', 'success');
                setLogLines(prev => [...prev, { text: '\n✅ Descarga finalizada.\n', isProgress: false }]);
            } else if (code === -1) {
                window.showToast('Descarga cancelada por el usuario', 'info');
                setLogLines(prev => [...prev, { text: '\n🛑 Descarga cancelada.\n', isProgress: false }]);
            } else {
                window.showToast('Error en la descarga. Revisa los logs', 'error');
                setLogLines(prev => [...prev, { text: `\n❌ Proceso terminado con código ${code}\n`, isProgress: false }]);
            }
        };

        return () => {
            window._handleDownloadProgress = null;
            window._handleDownloadComplete = null;
        };
    }, []);

    const [urls, setUrls] = useState([]);
    const [urlInput, setUrlInput] = useState('');
    const [hasError, setHasError] = useState(false);

    const processUrls = (text) => {
        const newUrls = text.split(/[\n,\s]+/)
            .map(line => line.trim())
            .filter(line => line.startsWith('http') && !urls.includes(line));
        
        if (newUrls.length > 0) {
            setUrls(prev => [...prev, ...newUrls]);
            setUrlInput('');
        }
    };

    const handleKeyDown = (e) => {
        setHasError(false);
        if (e.key === 'Enter') {
            e.preventDefault();
            processUrls(urlInput);
        }
    };

    const handlePaste = (e) => {
        e.preventDefault();
        const pastedText = e.clipboardData.getData('text');
        setHasError(false);
        processUrls(pastedText);
    };

    const removeUrl = (indexToRemove) => {
        setUrls(prev => prev.filter((_, idx) => idx !== indexToRemove));
    };

    const handleDownload = async () => {
        if (urlInput.trim().startsWith('http')) {
            processUrls(urlInput);
        }

        // Wait a tick for state to update if we just processed the input, 
        // but to be safe we'll check both state and current input.
        const currentUrls = [...urls];
        if (urlInput.trim().startsWith('http') && !currentUrls.includes(urlInput.trim())) {
            currentUrls.push(urlInput.trim());
        }

        if (currentUrls.length === 0) {
            setHasError(true);
            window.showToast('Debes agregar al menos una URL válida.', 'error');
            return;
        }
        setHasError(false);

        const outputFolder = await window.electronAPI.selectDirectory();
        if (!outputFolder) return;

        setIsDownloading(true);
        setLogLines([{ text: `Carpeta de destino: ${outputFolder}\nIniciando proceso de descarga para ${currentUrls.length} enlace(s)...\n\n`, isProgress: false }]);

        const cleanUrls = currentUrls.map(u => {
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

        const options = {
            urls: cleanUrls,
            resolucion: resolution,
            soloAudio: format === 'audio',
            outputFolder: outputFolder,
            forceRedownload: forceRedownload
        };

        window.electronAPI.startDownload(options);
    };

    const handleCancel = () => {
        window.electronAPI.cancelDownload();
    };

    const handleClearHistory = async () => {
        if (confirm('¿Estás seguro de que quieres limpiar el historial de descargas? yt-dlp volverá a descargar videos que ya tenías.')) {
            const success = await window.electronAPI.clearHistory();
            if (success) {
                window.showToast('Historial limpiado correctamente.', 'success');
            } else {
                window.showToast('Error al limpiar historial.', 'error');
            }
        }
    };

    return (
        <section className="view active">
            <header className="view-header">
                <h1>Descargar Videos</h1>
                <p>Descarga de YouTube, TikTok, y más con máxima calidad.</p>
            </header>

            <div className="card">
                <div className="form-group">
                    <label>Enlaces (Pega links y presiona Enter)</label>
                    <div className={`tags-input-container ${hasError ? 'has-error' : ''}`} onClick={() => document.getElementById('urlInput').focus()}>
                        {urls.map((url, index) => (
                            <div key={index} className="tag">
                                <span>{url.length > 40 ? url.substring(0, 40) + '...' : url}</span>
                                <div className="close-btn" onClick={(e) => { e.stopPropagation(); removeUrl(index); }}>✕</div>
                            </div>
                        ))}
                        <input 
                            type="text" 
                            id="urlInput"
                            placeholder="Pega tus enlaces aquí..."
                            value={urlInput}
                            onChange={(e) => { setUrlInput(e.target.value); setHasError(false); }}
                            onKeyDown={handleKeyDown}
                            onPaste={handlePaste}
                            style={{border: 'none', background: 'transparent', outline: 'none', color: 'var(--text-primary)', flex: 1}}
                        />
                    </div>
                </div>

                <div className="options-grid">
                    <div className="form-group">
                        <label>Formato</label>
                        <select value={format} onChange={(e) => setFormat(e.target.value)}>
                            <option value="video">Video (MP4)</option>
                            <option value="audio">Solo Audio (MP3)</option>
                        </select>
                    </div>
                    {format === 'video' && (
                        <div className="form-group">
                            <label>Calidad Máxima</label>
                            <select value={resolution} onChange={(e) => setResolution(e.target.value)}>
                                <option value="2160">4K (2160p)</option>
                                <option value="1440">2K (1440p)</option>
                                <option value="1080">Full HD (1080p)</option>
                                <option value="720">HD (720p)</option>
                                <option value="480">SD (480p)</option>
                            </select>
                        </div>
                    )}
                </div>

                <div className="checkbox-group">
                    <input type="checkbox" id="forceRedownload" checked={forceRedownload} onChange={(e) => setForceRedownload(e.target.checked)} />
                    <label htmlFor="forceRedownload" style={{margin: 0, cursor: 'pointer', textTransform: 'none', flex: 1}}>
                        Forzar re-descarga (Ignorar historial)
                    </label>
                    <button className="secondary-btn" onClick={handleClearHistory} title="Limpiar historial para poder descargar todo de nuevo" style={{display: 'flex', alignItems: 'center'}}>
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{marginRight: '4px'}}><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg> 
                        Limpiar Historial
                    </button>
                </div>

                <div className="actions" style={{marginTop: '24px'}}>
                    {!isDownloading ? (
                        <button className="btn primary" onClick={handleDownload} style={{display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{marginRight: '8px'}}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                            <span>Descargar Ahora</span>
                        </button>
                    ) : (
                        <button className="btn danger" onClick={handleCancel} style={{display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{marginRight: '8px'}}><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>
                            <span>Cancelar Descarga</span>
                        </button>
                    )}
                </div>
            </div>

            <LoggerTerminal 
                title="Registro de Descargas"
                logLines={logLines}
                onClear={() => setLogLines([])}
                isActive={isDownloading}
            />
        </section>
    );
}

export default DownloaderView;
