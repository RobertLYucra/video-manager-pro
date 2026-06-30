import React, { useState, useEffect } from 'react';
import LoggerTerminal from '../components/LoggerTerminal';

function ExtractorView() {
    const [selectedFiles, setSelectedFiles] = useState([]);
    const [isExtracting, setIsExtracting] = useState(false);
    const [progress, setProgress] = useState(0);
    const [logLines, setLogLines] = useState([]);
    const [elapsedTime, setElapsedTime] = useState(0);
    const [format, setFormat] = useState('mp3-alta');
    const [lastOutput, setLastOutput] = useState(null);
    const [isDragOver, setIsDragOver] = useState(false);

    useEffect(() => {
        let interval;
        if (isExtracting) {
            setElapsedTime(0);
            interval = setInterval(() => {
                setElapsedTime(prev => prev + 1);
            }, 1000);
        } else {
            clearInterval(interval);
        }
        return () => clearInterval(interval);
    }, [isExtracting]);



    useEffect(() => {
        if (!window._extractorIpcAttached) {
            window.electronAPI.onExtractorProgress((event, data) => {
                if (window._handleExtractorProgress) window._handleExtractorProgress(event, data);
            });
            window._extractorIpcAttached = true;
        }

        window._handleExtractorProgress = (event, data) => {
            if (data.type === 'log') {
                setLogLines(prev => [...prev, { 
                    text: data.message, 
                    isError: data.isError, 
                    isSuccess: data.isSuccess 
                }]);
            } else if (data.type === 'progress') {
                setProgress(data.percent);
            } else if (data.type === 'complete') {
                setIsExtracting(false);
                if (data.success) {
                    window.showToast(data.message || 'Extracción completada', 'success');
                    setLogLines(prev => [...prev, { text: '\n✅ ' + (data.message || 'Proceso finalizado.') + '\n', isSuccess: true }]);
                    if (data.lastOutput) {
                        setLastOutput(data.lastOutput);
                    }
                } else {
                    window.showToast('Error: ' + data.message, 'error');
                    setLogLines(prev => [...prev, { text: '\n❌ ' + data.message + '\n', isError: true }]);
                }
            }
        };

        return () => {
            window._handleExtractorProgress = null;
        };
    }, []);

    const handleSelectFiles = async () => {
        const result = await window.electronAPI.selectFilesForExtraction();
        if (result && result.length > 0) {
            setSelectedFiles(prev => {
                const newFiles = [...prev];
                result.forEach(f => {
                    if (!newFiles.includes(f)) newFiles.push(f);
                });
                return newFiles;
            });
            setLastOutput(null);
        }
    };

    const handleDragEnter = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragOver(true);
    };

    const handleDragOver = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragOver(true);
    };

    const handleDragLeave = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragOver(false);
    };

    const handleDrop = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragOver(false);
        
        if (!e.dataTransfer || !e.dataTransfer.files) return;

        const files = Array.from(e.dataTransfer.files)
            .map(f => window.electronAPI.getPathForFile(f) || f.path)
            .filter(p => p && typeof p === 'string' && p.match(/\.(mp4|mkv|avi|mov|webm)$/i));
            
        if (files.length > 0) {
            setSelectedFiles(prev => {
                const newFiles = [...prev];
                files.forEach(f => {
                    if (!newFiles.includes(f)) newFiles.push(f);
                });
                return newFiles;
            });
            setLastOutput(null);
        } else {
            window.showToast('Solo se permiten archivos de video', 'error');
        }
    };

    const handleStartExtraction = () => {
        if (selectedFiles.length === 0) {
            window.showToast('Por favor, selecciona al menos un video.', 'error');
            return;
        }

        setIsExtracting(true);
        setProgress(0);
        setLastOutput(null);
        setLogLines([{ text: `Iniciando extracción de ${selectedFiles.length} videos...\n`, isSuccess: false }]);
        window.electronAPI.startExtraction(selectedFiles, format);
    };

    const handleCancelExtraction = () => {
        window.electronAPI.cancelExtraction();
        setLogLines(prev => [...prev, { text: '\n🛑 Cancelación solicitada...\n', isError: true }]);
    };

    return (
        <section className="view active">
            <header className="view-header">
                <h1>Extractor de Audio Pro</h1>
                <p>Convierte tus videos .mp4 a formato .mp3 en máxima calidad de forma automática.</p>
            </header>

            <div className="card">
                <div className="section-title">Selección de Videos</div>
                <p style={{ color: 'var(--text-secondary)', marginBottom: '16px', fontSize: '14px' }}>
                    Selecciona los videos a los que deseas extraerles el audio. Los archivos resultantes se guardarán en la <strong>misma carpeta</strong> de donde provienen los videos.
                </p>
                
                <div 
                    style={{ 
                        display: 'flex', gap: '16px', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap',
                        border: isDragOver ? '2px dashed var(--accent-primary)' : '2px dashed transparent',
                        padding: isDragOver ? '16px' : '0',
                        borderRadius: '8px',
                        transition: 'all 0.2s ease',
                        backgroundColor: isDragOver ? 'rgba(51,82,255,0.05)' : 'transparent'
                    }}
                    onDragEnter={handleDragEnter}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                >
                    <button className="btn secondary" onClick={handleSelectFiles} disabled={isExtracting}>
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{marginRight: '8px'}}>
                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                            <polyline points="14 2 14 8 20 8"></polyline>
                            <line x1="12" y1="18" x2="12" y2="12"></line>
                            <line x1="9" y1="15" x2="15" y2="15"></line>
                        </svg>
                        Elegir o Arrastrar Archivos .mp4
                    </button>
                    
                    <div style={{ flex: 1, minWidth: '200px' }}>
                        <select 
                            value={format} 
                            onChange={(e) => setFormat(e.target.value)}
                            disabled={isExtracting}
                            style={{ padding: '8px 12px', fontSize: '13px' }}
                        >
                            <option value="mp3-alta">MP3 (Alta Calidad VBR)</option>
                            <option value="mp3-ligero">MP3 (Ligero 128kbps)</option>
                            <option value="original">Audio Original (Sin Recodificar M4A/AAC)</option>
                        </select>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginLeft: 'auto' }}>
                        <span style={{ fontSize: '14px', fontWeight: '500', color: selectedFiles.length > 0 ? 'var(--accent-primary)' : 'var(--text-secondary)' }}>
                            {selectedFiles.length} archivo(s)
                        </span>
                        
                        {selectedFiles.length > 0 && !isExtracting && (
                            <button className="btn-small clear-btn" onClick={() => setSelectedFiles([])} style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '4px 8px', width: 'auto', height: 'auto' }}>
                                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <polyline points="3 6 5 6 21 6"></polyline>
                                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                                </svg>
                                Limpiar
                            </button>
                        )}
                    </div>
                </div>

                {selectedFiles.length > 0 && (
                    <div className="page-list" style={{ marginBottom: '24px', maxHeight: '150px', overflowY: 'auto' }}>
                        {selectedFiles.map((file, idx) => (
                            <div key={idx} className="page-list-item" style={{ padding: '8px 16px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                                    <polygon points="23 7 16 12 23 17 23 7"></polygon>
                                    <rect x="1" y="5" width="15" height="14" rx="2" ry="2"></rect>
                                </svg>
                                <span className="page-list-name" title={file.split('\\').pop() || file.split('/').pop()} style={{ fontSize: '13px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', display: 'block', maxWidth: '100%' }}>
                                    {file.split('\\').pop() || file.split('/').pop()}
                                </span>
                            </div>
                        ))}
                    </div>
                )}

                <div className="actions" style={{ display: 'flex', gap: '16px' }}>
                    {!isExtracting ? (
                        <button className="btn primary" onClick={handleStartExtraction} disabled={selectedFiles.length === 0} style={{ flex: 1 }}>
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{marginRight: '8px'}}>
                                <polygon points="5 3 19 12 5 21 5 3"></polygon>
                            </svg>
                            Iniciar Extracción
                        </button>
                    ) : (
                        <button className="btn danger" onClick={handleCancelExtraction} style={{ flex: 1 }}>
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{marginRight: '8px'}}>
                                <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                            </svg>
                            Cancelar
                        </button>
                    )}
                    
                    {lastOutput && !isExtracting && (
                        <button className="btn secondary" onClick={() => window.electronAPI.showItemInFolder(lastOutput)}>
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{marginRight: '8px'}}>
                                <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path>
                            </svg>
                            Abrir Carpeta de Archivos
                        </button>
                    )}
                </div>
            </div>

            {isExtracting && (
                <div className="card" style={{ border: '1px solid var(--accent-primary)', padding: '16px', marginBottom: '24px' }}>
                    <h3 style={{ color: 'var(--accent-primary)', marginBottom: '8px', fontSize: '15px' }}>Procesando Audio...</h3>
                    <div className="progress-bar-bg" style={{ margin: '8px 0' }}>
                        <div className="progress-bar-fill" style={{ width: `${progress}%` }}></div>
                    </div>
                    <p className="status-text" style={{ fontSize: '13px' }}>{Math.round(progress)}%</p>
                </div>
            )}

            <LoggerTerminal 
                title="Consola de Extracción"
                logLines={logLines}
                onClear={() => setLogLines([])}
                isActive={isExtracting}
                elapsedTime={elapsedTime}
                defaultExpanded={true}
            />
        </section>
    );
}

export default ExtractorView;
