import React, { useState, useEffect } from 'react';

function DashboardView() {
    const [stats, setStats] = useState({ pending: 0, today: 0, error: 0 });
    const [pages, setPages] = useState([]);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        const pagesData = await window.electronAPI.getTokens();
        const csvData = await window.electronAPI.getCsvData();

        let pendingCount = 0;
        let todayCount = 0;
        let errorCount = 0;

        const pageStats = {};
        pagesData.forEach(p => {
            pageStats[p.folder] = { 
                name: p.nombre_pag, 
                pending: 0, 
                today: 0, 
                error: 0,
                platform: p.platform || 'facebook'
            };
        });

        const todayDate = new Date().toISOString().split('T')[0];

        csvData.forEach(row => {
            const status = row.estado ? row.estado.toLowerCase().trim() : 'pendiente';
            const uploadDate = row.fecha_subida ? row.fecha_subida.split(' ')[0] : '';
            const pageFolder = row.pagina;

            if (status === 'pendiente') {
                pendingCount++;
                if (pageStats[pageFolder]) pageStats[pageFolder].pending++;
            } else if (status === 'subido' && uploadDate === todayDate) {
                todayCount++;
                if (pageStats[pageFolder]) pageStats[pageFolder].today++;
            } else if (status === 'error') {
                errorCount++;
                if (pageStats[pageFolder]) pageStats[pageFolder].error++;
            }
        });

        setStats({ pending: pendingCount, today: todayCount, error: errorCount });
        setPages(Object.values(pageStats));
    };

    return (
        <section className="view active">
            <div className="dashboard-hero">
                <h1>Centro de Control</h1>
                <p>Métricas y estado general consolidado de tu sistema.</p>
            </div>

            <div className="stats-grid">
                <div className="stat-card pending">
                    <div className="stat-header">
                        <span className="stat-icon"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg></span>
                        <span>Total Pendientes</span>
                    </div>
                    <div className="stat-value">{stats.pending}</div>
                </div>
                <div className="stat-card success">
                    <div className="stat-header">
                        <span className="stat-icon"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"></polyline><polyline points="17 6 23 6 23 12"></polyline></svg></span>
                        <span>Subidos Hoy</span>
                    </div>
                    <div className="stat-value">{stats.today}</div>
                </div>
                <div className="stat-card error">
                    <div className="stat-header">
                        <span className="stat-icon"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg></span>
                        <span>Total Errores</span>
                    </div>
                    <div className="stat-value">{stats.error}</div>
                </div>
            </div>

            <div className="page-list-section" style={{marginTop: '40px'}}>
                <h3 className="section-title">Desglose por Página</h3>
                <div className="page-list">
                    {pages.map((p, idx) => (
                        <div key={idx} className="page-list-item">
                            <div style={{display: 'flex', flexDirection: 'column'}}>
                                <span className="page-list-name">{p.name}</span>
                                <span className={`platform-badge platform-${p.platform.toLowerCase()}`} style={{marginTop: '4px', alignSelf: 'flex-start'}}>{p.platform}</span>
                            </div>
                            <div style={{display: 'flex', gap: '20px'}}>
                                <div style={{textAlign: 'center'}}><div style={{fontSize: '12px', color: '#94a3b8'}}>Pendientes</div><div style={{fontWeight: 'bold', color: 'var(--accent-primary)'}}>{p.pending}</div></div>
                                <div style={{textAlign: 'center'}}><div style={{fontSize: '12px', color: '#94a3b8'}}>Subidos Hoy</div><div style={{fontWeight: 'bold', color: 'var(--success)'}}>{p.today}</div></div>
                                <div style={{textAlign: 'center'}}><div style={{fontSize: '12px', color: '#94a3b8'}}>Errores</div><div style={{fontWeight: 'bold', color: 'var(--danger)'}}>{p.error}</div></div>
                            </div>
                        </div>
                    ))}
                    {pages.length === 0 && <div className="card" style={{padding: '16px', textAlign: 'center', color: '#64748b'}}>No hay páginas configuradas.</div>}
                </div>
            </div>
        </section>
    );
}

export default DashboardView;
