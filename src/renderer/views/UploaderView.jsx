import React, { useState, useEffect } from 'react';
import LoggerTerminal from '../components/LoggerTerminal';

function UploaderView() {
    const [pages, setPages] = useState([]);
    const [selectedPage, setSelectedPage] = useState('');
    const [categories, setCategories] = useState([]);
    const [selectedCategory, setSelectedCategory] = useState('todas');

    const [limit, setLimit] = useState(7);
    const [initialInterval, setInitialInterval] = useState(10);
    const [successiveInterval, setSuccessiveInterval] = useState(60);
    const [exactDate, setExactDate] = useState('');
    const [immediate, setImmediate] = useState(false);

    const [isUploading, setIsUploading] = useState(false);
    const [progress, setProgress] = useState(0);

    const [logLines, setLogLines] = useState([]);
    const [hasError, setHasError] = useState(false);

    useEffect(() => {
        loadPages();

        if (!window._uploaderIpcAttached) {
            window.electronAPI.onUploadProgress((event, data) => {
                if (window._handleUploadProgress) window._handleUploadProgress(event, data);
            });
            window.electronAPI.onUploadBar((event, data) => {
                if (window._handleUploadBar) window._handleUploadBar(event, data);
            });
            window.electronAPI.onUploadComplete((event, result) => {
                if (window._handleUploadComplete) window._handleUploadComplete(event, result);
            });
            window._uploaderIpcAttached = true;
        }

        window._handleUploadProgress = (event, data) => {
            if (typeof data === 'string') {
                setLogLines(prev => [...prev, { text: data, isError: data.includes('Error') || data.includes('❌') || data.includes('⚠️'), isSuccess: data.includes('✅') || data.includes('Éxito') }]);
            } else if (data && data.type === 'log') {
                setLogLines(prev => [...prev, { text: data.message, isError: data.message.includes('Error') || data.message.includes('❌') || data.message.includes('⚠️'), isSuccess: data.message.includes('✅') }]);
            } else if (data && data.type === 'progress') {
                setProgress(data.percent);
            }
        };

        window._handleUploadBar = (event, data) => {
            if (data && data.percent !== undefined) {
                setProgress(data.percent);
            }
        };

        window._handleUploadComplete = (event, result) => {
            setIsUploading(false);
            if (result.success) {
                window.showToast(result.message || 'Proceso completado', 'success');
                setLogLines(prev => [...prev, { text: '\n✅ Proceso de subida finalizado.\n', isSuccess: true }]);
            } else {
                window.showToast('Proceso cancelado o fallido', 'error');
                setLogLines(prev => [...prev, { text: '\n❌ Proceso abortado o fallido.\n', isError: true }]);
            }
        };

        return () => {
            window._handleUploadProgress = null;
            window._handleUploadComplete = null;
        };
    }, []);

    const loadPages = async () => {
        const pagesData = await window.electronAPI.getTokens();
        setPages(pagesData);
    };

    const handlePageChange = (e) => {
        const pageId = e.target.value;
        setSelectedPage(pageId);
        setHasError(false);

        const page = pages.find(p => p.id == pageId);
        if (page && page.categorias && page.categorias.length > 0) {
            setCategories(page.categorias);
            setSelectedCategory('todas');
        } else {
            setCategories([]);
            setSelectedCategory('todas');
        }
    };

    const handleGenerateCsv = async () => {
        setLogLines([{ text: 'Iniciando escaneo y auto registro...\n', isSuccess: false }]);
        const res = await window.electronAPI.generateCsv();
        if (res.success) {
            setLogLines(prev => [...prev, { text: '\n✅ ' + res.message + '\n', isSuccess: true }]);
            window.showToast(res.message, 'success');
        } else {
            setLogLines(prev => [...prev, { text: '\n❌ Error: ' + res.message + '\n', isError: true }]);
            window.showToast('Error: ' + res.message, 'error');
        }
    };

    const handleStartUpload = () => {
        if (!selectedPage) {
            setHasError(true);
            window.showToast('Selecciona una página primero.', 'error');
            return;
        }
        setHasError(false);

        const options = {
            pageId: selectedPage,
            category: selectedCategory,
            limit: parseInt(limit, 10),
            intervaloInicial: parseInt(initialInterval, 10),
            intervaloSucesivo: parseInt(successiveInterval, 10),
            fechaExacta: exactDate,
            publicarInmediato: immediate
        };

        setIsUploading(true);
        setProgress(0);
        setLogLines([{ text: 'Iniciando configuración de publicaciones...\n', isSuccess: false }]);
        window.electronAPI.startUpload(options);
    };

    const handleCancelUpload = () => {
        window.electronAPI.cancelUpload();
        setLogLines(prev => [...prev, { text: '\n🛑 Cancelación solicitada. Esperando a que el archivo actual termine para abortar...\n', isError: true }]);
    };

    return (
        <section className="view active">
            <header className="view-header">
                <h1>Gestor de Publicaciones Pro</h1>
                <p>Configura y programa tus videos en Facebook automáticamente.</p>
            </header>

            <div className="card">
                <div className="options-grid">
                    <div className="form-group">
                        <label>Página de Destino</label>
                        <select
                            value={selectedPage}
                            onChange={handlePageChange}
                            className={hasError ? 'has-error' : ''}
                        >
                            <option value="">Seleccione una página</option>
                            {pages.map(p => (
                                <option key={p.id} value={p.id}>{p.nombre_pag}</option>
                            ))}
                        </select>
                    </div>
                    {categories.length > 0 && (
                        <div className="form-group">
                            <label>Categoría a subir</label>
                            <select value={selectedCategory} onChange={e => setSelectedCategory(e.target.value)}>
                                <option value="todas">Todas las categorías</option>
                                {categories.map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                        </div>
                    )}
                    <div className="form-group">
                        <label>Cantidad de Videos</label>
                        <input type="number" value={limit} onChange={e => setLimit(e.target.value)} min="1" max="50" />
                    </div>
                </div>

                <div className="options-grid" style={{ marginTop: '20px' }}>
                    <div className="form-group">
                        <label>Minutos para el 1er video: </label>
                        <input type="number" value={initialInterval} onChange={e => setInitialInterval(e.target.value)} min="0" />
                    </div>
                    <div className="form-group">
                        <label>Minutos entre videos: </label>
                        <input type="number" value={successiveInterval} onChange={e => setSuccessiveInterval(e.target.value)} min="1" />
                    </div>
                    <div className="form-group">
                        <label>O seleccionar Fecha y Hora Exacta de Inicio</label>
                        <input type="datetime-local" value={exactDate} onChange={e => setExactDate(e.target.value)} />
                    </div>
                </div>

                <div className="checkbox-group" style={{ marginTop: '20px' }}>
                    <input type="checkbox" id="publicarInmediato" checked={immediate} onChange={e => setImmediate(e.target.checked)} />
                    <label htmlFor="publicarInmediato" style={{ margin: 0, cursor: 'pointer', textTransform: 'none', flex: 1 }}>
                        Ignorar programación y publicar todo Inmediatamente
                    </label>
                </div>

                <div className="actions" style={{ marginTop: '24px', display: 'flex', gap: '16px' }}>
                    <button className="btn secondary" onClick={handleGenerateCsv} style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '8px' }}><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path><rect x="8" y="2" width="8" height="4" rx="1" ry="1"></rect></svg>
                        <span>Auto-registrar Descargas</span>
                    </button>

                    {!isUploading ? (
                        <button className="btn primary" onClick={handleStartUpload} style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '8px' }}><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>
                            <span>Iniciar Programación</span>
                        </button>
                    ) : (
                        <button className="btn danger" onClick={handleCancelUpload} style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '8px' }}><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>
                            <span>Cancelar Proceso</span>
                        </button>
                    )}
                </div>
            </div>

            {isUploading && (
                <div className="card" style={{ border: '1px solid var(--accent-primary)', padding: '16px', marginBottom: '24px' }}>
                    <h3 style={{ color: 'var(--accent-primary)', marginBottom: '8px', fontSize: '15px' }}>Procesando...</h3>
                    <div className="progress-bar-bg" style={{ margin: '8px 0' }}>
                        <div className="progress-bar-fill" style={{ width: `${progress}%` }}></div>
                    </div>
                    <p className="status-text" style={{ fontSize: '13px' }}>{Math.round(progress)}%</p>
                </div>
            )}

            <LoggerTerminal 
                title="Log de Procesos"
                logLines={logLines}
                onClear={() => setLogLines([])}
                isActive={isUploading}
            />
        </section>
    );
}

export default UploaderView;
