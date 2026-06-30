import React, { useState, useEffect } from 'react';
import LoggerTerminal from '../components/LoggerTerminal';

function EditorView() {
    const [activeTab, setActiveTab] = useState('trim'); // trim, join, compress
    
    // Global state for processing
    const [isProcessing, setIsProcessing] = useState(false);
    const [progress, setProgress] = useState(0);
    const [logLines, setLogLines] = useState([]);
    const [lastOutput, setLastOutput] = useState(null);
    const [elapsedTime, setElapsedTime] = useState(0);

    // Form states
    const [trimFile, setTrimFile] = useState('');
    const [trimStart, setTrimStart] = useState('00:00:00');
    const [trimEnd, setTrimEnd] = useState('00:01:00');

    const [joinFiles, setJoinFiles] = useState([]);

    const [compressFile, setCompressFile] = useState('');
    const [compressLevel, setCompressLevel] = useState('medio'); // ligero, medio, agresivo

    // Drag states
    const [isDragOverTrim, setIsDragOverTrim] = useState(false);
    const [isDragOverJoin, setIsDragOverJoin] = useState(false);
    const [isDragOverCompress, setIsDragOverCompress] = useState(false);

    useEffect(() => {
        let interval;
        if (isProcessing) {
            setElapsedTime(0);
            interval = setInterval(() => {
                setElapsedTime(prev => prev + 1);
            }, 1000);
        } else {
            clearInterval(interval);
        }
        return () => clearInterval(interval);
    }, [isProcessing]);

    useEffect(() => {
        if (window.electronAPI.removeAllEditorProgressListeners) {
            window.electronAPI.removeAllEditorProgressListeners();
        }
        
        window.electronAPI.onEditorProgress((event, data) => {
            if (data.type === 'log') {
                setLogLines(prev => [...prev, { text: data.message, isError: data.isError, isSuccess: data.isSuccess }]);
            } else if (data.type === 'progress') {
                setProgress(data.percent || 0);
            } else if (data.type === 'complete') {
                setIsProcessing(false);
                if (data.success && data.outputPath) {
                    setLastOutput(data.outputPath);
                }
            }
        });

        return () => {
            if (window.electronAPI.removeAllEditorProgressListeners) {
                window.electronAPI.removeAllEditorProgressListeners();
            }
        };
    }, []);

    // Clear state when changing tabs
    useEffect(() => {
        setLastOutput(null);
        setLogLines([]);
        setProgress(0);
    }, [activeTab]);

    // Helper functions
    const handleCancel = () => {
        window.electronAPI.cancelEditor();
    };

    const handleShowFolder = (path) => {
        window.electronAPI.showItemInFolder(path);
    };

    const getFilesFromDragEvent = (e) => {
        if (!e.dataTransfer || !e.dataTransfer.files) return [];
        return Array.from(e.dataTransfer.files)
            .map(f => window.electronAPI.getPathForFile(f) || f.path)
            .filter(p => p && typeof p === 'string' && p.match(/\.(mp4|mkv|avi|mov|webm)$/i));
    };

    // --- TRIM METHODS ---
    const handleSelectTrimFile = async () => {
        const result = await window.electronAPI.selectFilesForEditor(false);
        if (result && result.length > 0) setTrimFile(result[0]);
    };
    const handleDropTrim = (e) => {
        e.preventDefault(); e.stopPropagation(); setIsDragOverTrim(false);
        const files = getFilesFromDragEvent(e);
        if (files.length > 0) setTrimFile(files[0]);
    };
    const handleStartTrim = () => {
        if (!trimFile) return window.showToast('Selecciona un video para recortar', 'error');
        setIsProcessing(true); setProgress(0); setLastOutput(null); setLogLines([]);
        window.electronAPI.startEditorTrim({ file: trimFile, start: trimStart, end: trimEnd });
    };

    // --- JOIN METHODS ---
    const handleSelectJoinFiles = async () => {
        const result = await window.electronAPI.selectFilesForEditor(true);
        if (result && result.length > 0) {
            setJoinFiles(prev => {
                const newFiles = [...prev];
                result.forEach(f => { if (!newFiles.includes(f)) newFiles.push(f); });
                return newFiles;
            });
        }
    };
    const handleDropJoin = (e) => {
        e.preventDefault(); e.stopPropagation(); setIsDragOverJoin(false);
        const files = getFilesFromDragEvent(e);
        if (files.length > 0) {
            setJoinFiles(prev => {
                const newFiles = [...prev];
                files.forEach(f => { if (!newFiles.includes(f)) newFiles.push(f); });
                return newFiles;
            });
        }
    };
    const handleStartJoin = () => {
        if (joinFiles.length < 2) return window.showToast('Selecciona al menos 2 videos para unir', 'error');
        setIsProcessing(true); setProgress(0); setLastOutput(null); setLogLines([]);
        window.electronAPI.startEditorJoin({ files: joinFiles });
    };

    // --- COMPRESS METHODS ---
    const handleSelectCompressFile = async () => {
        const result = await window.electronAPI.selectFilesForEditor(false);
        if (result && result.length > 0) setCompressFile(result[0]);
    };
    const handleDropCompress = (e) => {
        e.preventDefault(); e.stopPropagation(); setIsDragOverCompress(false);
        const files = getFilesFromDragEvent(e);
        if (files.length > 0) setCompressFile(files[0]);
    };
    const handleStartCompress = () => {
        if (!compressFile) return window.showToast('Selecciona un video para comprimir', 'error');
        setIsProcessing(true); setProgress(0); setLastOutput(null); setLogLines([]);
        window.electronAPI.startEditorCompress({ file: compressFile, level: compressLevel });
    };

    // --- RENDERERS ---
    const renderTabs = () => (
        <div style={{ display: 'flex', gap: '12px', marginBottom: '24px', borderBottom: '1px solid var(--border-color)', paddingBottom: '16px' }}>
            <button 
                className={`btn ${activeTab === 'trim' ? 'primary' : 'secondary'}`} 
                onClick={() => setActiveTab('trim')}
                disabled={isProcessing}
                style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 16px' }}
            >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="6" cy="6" r="3"></circle><circle cx="6" cy="18" r="3"></circle><line x1="20" y1="4" x2="8.12" y2="15.88"></line><line x1="14.47" y1="14.48" x2="20" y2="20"></line><line x1="8.12" y1="8.12" x2="12" y2="12"></line></svg>
                Recortador Rápido
            </button>
            <button 
                className={`btn ${activeTab === 'join' ? 'primary' : 'secondary'}`} 
                onClick={() => setActiveTab('join')}
                disabled={isProcessing}
                style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 16px' }}
            >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path></svg>
                Unidor de Videos
            </button>
            <button 
                className={`btn ${activeTab === 'compress' ? 'primary' : 'secondary'}`} 
                onClick={() => setActiveTab('compress')}
                disabled={isProcessing}
                style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 16px' }}
            >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 15.5V12a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v4a2 2 0 0 0 2 2h4l2 2 2-2h4a2 2 0 0 0 2-2v-3.5z"></path><path d="M22 15.5V12a2 2 0 0 0-2-2h-4v7h4a2 2 0 0 0 2-2v-3.5z"></path></svg>
                Compresor Optimizador
            </button>
        </div>
    );

    const renderTrimContent = () => (
        <div className="card">
            <h3 className="section-title">Recortador de Video Instantáneo</h3>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '20px', fontSize: '14px' }}>
                Extrae un fragmento de tu video de forma instantánea usando el codec de copia directa. <strong>Sin re-renderizar y sin pérdida de calidad.</strong>
            </p>
            
            <div 
                className="form-group"
                style={{ 
                    border: isDragOverTrim ? '2px dashed var(--accent-primary)' : '2px dashed var(--border-color)',
                    padding: '24px',
                    borderRadius: '8px',
                    transition: 'all 0.2s ease',
                    backgroundColor: isDragOverTrim ? 'rgba(51,82,255,0.05)' : 'var(--bg-primary)',
                    textAlign: 'center',
                    marginBottom: '20px'
                }}
                onDragEnter={(e) => { e.preventDefault(); e.stopPropagation(); setIsDragOverTrim(true); }}
                onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); setIsDragOverTrim(true); }}
                onDragLeave={(e) => { e.preventDefault(); e.stopPropagation(); setIsDragOverTrim(false); }}
                onDrop={handleDropTrim}
            >
                <div style={{ marginBottom: '16px' }}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke={isDragOverTrim ? "var(--accent-primary)" : "var(--text-secondary)"} strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" style={{ transition: 'all 0.2s ease' }}>
                        <rect x="2" y="2" width="20" height="20" rx="2.18" ry="2.18"></rect><line x1="7" y1="2" x2="7" y2="22"></line><line x1="17" y1="2" x2="17" y2="22"></line><line x1="2" y1="12" x2="22" y2="12"></line><line x1="2" y1="7" x2="7" y2="7"></line><line x1="2" y1="17" x2="7" y2="17"></line><line x1="17" y1="17" x2="22" y2="17"></line><line x1="17" y1="7" x2="22" y2="7"></line>
                    </svg>
                </div>
                {trimFile ? (
                    <div style={{ padding: '8px', background: 'rgba(51,82,255,0.1)', borderRadius: '6px', color: 'var(--accent-primary)', fontWeight: '500', wordBreak: 'break-all' }}>
                        {trimFile}
                    </div>
                ) : (
                    <p style={{ color: 'var(--text-secondary)', marginBottom: '16px' }}>Arrastra y suelta tu video aquí (.mp4, .mkv...)</p>
                )}
                <button className="btn secondary" onClick={handleSelectTrimFile} disabled={isProcessing} style={{ marginTop: '12px' }}>
                    Examinar Archivos
                </button>
            </div>

            <div className="options-grid" style={{ marginBottom: '24px' }}>
                <div className="form-group">
                    <label>Tiempo de Inicio (HH:MM:SS)</label>
                    <input type="text" value={trimStart} onChange={(e) => setTrimStart(e.target.value)} disabled={isProcessing} className="form-control" placeholder="00:00:00" style={{ fontSize: '16px', letterSpacing: '1px' }} />
                </div>
                <div className="form-group">
                    <label>Tiempo de Fin (HH:MM:SS)</label>
                    <input type="text" value={trimEnd} onChange={(e) => setTrimEnd(e.target.value)} disabled={isProcessing} className="form-control" placeholder="00:01:00" style={{ fontSize: '16px', letterSpacing: '1px' }} />
                </div>
            </div>

            <button className="btn primary" onClick={handleStartTrim} disabled={isProcessing} style={{ width: '100%', display: 'flex', justifyContent: 'center', padding: '12px' }}>
                Procesar Recorte Rápido
            </button>
        </div>
    );

    const renderJoinContent = () => (
        <div className="card">
            <h3 className="section-title">Unidor Secuencial de Videos</h3>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '20px', fontSize: '14px' }}>
                Combina varios videos en uno solo de forma automática. <strong>Ideal para pegar Intros y Outros sin abrir editores pesados.</strong>
            </p>
            
            <div 
                className="form-group"
                style={{ 
                    border: isDragOverJoin ? '2px dashed var(--accent-primary)' : '2px dashed var(--border-color)',
                    padding: '24px',
                    borderRadius: '8px',
                    transition: 'all 0.2s ease',
                    backgroundColor: isDragOverJoin ? 'rgba(51,82,255,0.05)' : 'var(--bg-primary)',
                    textAlign: 'center',
                    marginBottom: '20px'
                }}
                onDragEnter={(e) => { e.preventDefault(); e.stopPropagation(); setIsDragOverJoin(true); }}
                onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); setIsDragOverJoin(true); }}
                onDragLeave={(e) => { e.preventDefault(); e.stopPropagation(); setIsDragOverJoin(false); }}
                onDrop={handleDropJoin}
            >
                <div style={{ marginBottom: '16px' }}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke={isDragOverJoin ? "var(--accent-primary)" : "var(--text-secondary)"} strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" style={{ transition: 'all 0.2s ease' }}>
                        <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="9" y1="3" x2="9" y2="21"></line>
                    </svg>
                </div>
                <p style={{ color: 'var(--text-secondary)', marginBottom: '16px' }}>Arrastra y suelta múltiples videos aquí para añadirlos a la lista</p>
                <button className="btn secondary" onClick={handleSelectJoinFiles} disabled={isProcessing}>
                    Añadir Videos Manualmente
                </button>
            </div>

            {joinFiles.length > 0 && (
                <div className="form-group">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                        <label style={{ margin: 0 }}>Cola de Videos ({joinFiles.length})</label>
                        <button className="btn danger btn-small" onClick={() => setJoinFiles([])} disabled={isProcessing}>Limpiar Lista</button>
                    </div>
                    <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '6px', maxHeight: '200px', overflowY: 'auto' }}>
                        {joinFiles.map((f, idx) => (
                            <div key={idx} style={{ padding: '12px', borderBottom: '1px solid var(--border-color)', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <span style={{ background: 'var(--accent-primary)', color: 'white', width: '24px', height: '24px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>{idx + 1}</span> 
                                <span style={{ flex: 1, wordBreak: 'break-all' }}>{f}</span>
                                <button className="btn-small delete-btn" disabled={isProcessing} onClick={() => setJoinFiles(prev => prev.filter((_, i) => i !== idx))}>✕</button>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            <button className="btn primary" onClick={handleStartJoin} disabled={isProcessing || joinFiles.length < 2} style={{ width: '100%', display: 'flex', justifyContent: 'center', padding: '12px', marginTop: '16px' }}>
                Unificar {joinFiles.length} Videos
            </button>
        </div>
    );

    const renderCompressContent = () => (
        <div className="card">
            <h3 className="section-title">Compresor y Optimizador H.264</h3>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '20px', fontSize: '14px' }}>
                Reduce el peso de tus videos (MB) drásticamente re-codificando con algoritmos avanzados. Ideal para agilizar subidas lentas.
            </p>
            
            <div 
                className="form-group"
                style={{ 
                    border: isDragOverCompress ? '2px dashed var(--accent-primary)' : '2px dashed var(--border-color)',
                    padding: '24px',
                    borderRadius: '8px',
                    transition: 'all 0.2s ease',
                    backgroundColor: isDragOverCompress ? 'rgba(51,82,255,0.05)' : 'var(--bg-primary)',
                    textAlign: 'center',
                    marginBottom: '20px'
                }}
                onDragEnter={(e) => { e.preventDefault(); e.stopPropagation(); setIsDragOverCompress(true); }}
                onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); setIsDragOverCompress(true); }}
                onDragLeave={(e) => { e.preventDefault(); e.stopPropagation(); setIsDragOverCompress(false); }}
                onDrop={handleDropCompress}
            >
                <div style={{ marginBottom: '16px' }}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke={isDragOverCompress ? "var(--accent-primary)" : "var(--text-secondary)"} strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" style={{ transition: 'all 0.2s ease' }}>
                        <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path><polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline><line x1="12" y1="22.08" x2="12" y2="12"></line>
                    </svg>
                </div>
                {compressFile ? (
                    <div style={{ padding: '8px', background: 'rgba(51,82,255,0.1)', borderRadius: '6px', color: 'var(--accent-primary)', fontWeight: '500', wordBreak: 'break-all' }}>
                        {compressFile}
                    </div>
                ) : (
                    <p style={{ color: 'var(--text-secondary)', marginBottom: '16px' }}>Arrastra y suelta un video ultra-pesado aquí</p>
                )}
                <button className="btn secondary" onClick={handleSelectCompressFile} disabled={isProcessing} style={{ marginTop: '12px' }}>
                    Examinar Archivos
                </button>
            </div>

            <div className="form-group" style={{ marginBottom: '24px' }}>
                <label>Nivel de Compresión (Relación Peso / Calidad)</label>
                <select value={compressLevel} onChange={(e) => setCompressLevel(e.target.value)} disabled={isProcessing} className="form-control" style={{ padding: '12px', fontSize: '14px' }}>
                    <option value="ligero">🟢 Ligero (Pierde poco peso, Mantiene máxima calidad)</option>
                    <option value="medio">🟡 Medio (El mejor equilibrio, Recomendado)</option>
                    <option value="agresivo">🔴 Agresivo (Pierde más peso, Puede verse borroso en pantallas grandes)</option>
                </select>
            </div>

            <button className="btn primary" onClick={handleStartCompress} disabled={isProcessing} style={{ width: '100%', display: 'flex', justifyContent: 'center', padding: '12px' }}>
                Iniciar Compresión Mágica
            </button>
        </div>
    );

    return (
        <section className="view active">
            <header className="view-header">
                <h1>Editor Pro (Video Studio)</h1>
                <p>Módulo premium unificado para procesar videos localmente con poder FFmpeg.</p>
            </header>

            {renderTabs()}

            {activeTab === 'trim' && renderTrimContent()}
            {activeTab === 'join' && renderJoinContent()}
            {activeTab === 'compress' && renderCompressContent()}

            {isProcessing && (
                <div className="card" style={{ border: '1px solid var(--accent-primary)', padding: '24px', marginBottom: '24px', marginTop: '24px', background: 'var(--bg-primary)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                        <h3 style={{ color: 'var(--accent-primary)', fontSize: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <svg className="spinner" xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ animation: 'spin 2s linear infinite' }}><line x1="12" y1="2" x2="12" y2="6"></line><line x1="12" y1="18" x2="12" y2="22"></line><line x1="4.93" y1="4.93" x2="7.76" y2="7.76"></line><line x1="16.24" y1="16.24" x2="19.07" y2="19.07"></line><line x1="2" y1="12" x2="6" y2="12"></line><line x1="18" y1="12" x2="22" y2="12"></line><line x1="4.93" y1="19.07" x2="7.76" y2="16.24"></line><line x1="16.24" y1="7.76" x2="19.07" y2="4.93"></line></svg>
                            Motor FFmpeg Procesando...
                        </h3>
                        <button className="btn danger btn-small" onClick={handleCancel}>Cancelar Proceso</button>
                    </div>
                    <div className="progress-bar-bg" style={{ margin: '12px 0', height: '14px' }}>
                        <div className="progress-bar-fill" style={{ width: `${progress}%` }}></div>
                    </div>
                    <p className="status-text" style={{ fontSize: '14px', fontWeight: '500' }}>{progress > 0 ? `${Math.round(progress)}% completado` : 'Iniciando...'}</p>
                </div>
            )}

            {lastOutput && !isProcessing && (
                <div className="card" style={{ background: 'rgba(34, 197, 94, 0.05)', border: '1px solid var(--success)', padding: '20px', marginBottom: '24px', marginTop: '24px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                        <div style={{ background: 'var(--success)', color: 'white', borderRadius: '50%', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                        </div>
                        <h3 style={{ color: 'var(--success)', fontSize: '16px', margin: 0 }}>¡Operación Completada con Éxito!</h3>
                    </div>
                    <div style={{ background: 'var(--bg-primary)', padding: '12px', borderRadius: '6px', border: '1px solid rgba(34, 197, 94, 0.2)', marginBottom: '16px' }}>
                        <p style={{ fontSize: '13px', margin: 0, wordBreak: 'break-all', color: 'var(--text-secondary)' }}>Archivo guardado en:</p>
                        <strong style={{ fontSize: '14px' }}>{lastOutput}</strong>
                    </div>
                    <button className="btn primary" onClick={() => handleShowFolder(lastOutput)} style={{ width: 'auto' }}>
                        Abrir Carpeta de Destino
                    </button>
                </div>
            )}

            <div style={{ marginTop: '24px' }}>
                <LoggerTerminal 
                    title="Consola de Edición"
                    logLines={logLines}
                    onClear={() => setLogLines([])}
                    isActive={isProcessing}
                    elapsedTime={elapsedTime}
                />
            </div>
            
            <style dangerouslySetInnerHTML={{__html: `
                @keyframes spin { 100% { transform: rotate(360deg); } }
                .form-control {
                    width: 100%; padding: 10px 14px; border: 1px solid var(--input-border); 
                    border-radius: 6px; background-color: var(--input-bg); color: var(--text-primary);
                    transition: all 0.2s;
                }
                .form-control:focus {
                    outline: none; border-color: var(--accent-primary); box-shadow: 0 0 0 3px rgba(51,82,255,0.1);
                }
            `}} />
        </section>
    );
}

export default EditorView;
