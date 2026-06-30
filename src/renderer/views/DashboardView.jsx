import React, { useState, useEffect } from 'react';

function DashboardView() {
    const [stats, setStats] = useState({ total: 0, pending: 0, today: 0, error: 0, successRate: 0 });
    const [topPages, setTopPages] = useState([]);
    const [recentActivity, setRecentActivity] = useState([]);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        const pagesData = await window.electronAPI.getTokens();
        const csvData = await window.electronAPI.getCsvData();

        let pendingCount = 0;
        let todayCount = 0;
        let errorCount = 0;
        let totalCount = csvData.length;
        let successCount = 0;

        const pageStats = {};
        pagesData.forEach(p => {
            pageStats[p.folder] = { 
                name: p.nombre_pag, 
                total: 0,
                success: 0
            };
        });

        const todayDate = new Date().toISOString().split('T')[0];
        
        // Reverse CSV data to get latest activity first
        const getPageName = (folderPath) => {
            if (!folderPath) return 'Sin página';
            const page = pagesData.find(p => p.folder === folderPath);
            if (page && page.nombre_pag) return page.nombre_pag;
            
            // Fallback to basename
            return folderPath.split('\\').pop().split('/').pop();
        };

        const sortedData = [...csvData].sort((a, b) => {
            const dateA = new Date(a.fecha_proceso || a.fecha_creacion || 0);
            const dateB = new Date(b.fecha_proceso || b.fecha_creacion || 0);
            return dateB - dateA;
        });
        
        const recent = sortedData.slice(0, 5).map(row => {
            return {
                title: row.titulo || row.archivo || 'Video Desconocido',
                page: getPageName(row.pagina_destino),
                status: row.estado ? row.estado.toLowerCase().trim() : 'pendiente'
            };
        });

        csvData.forEach(row => {
            const status = row.estado ? row.estado.toLowerCase().trim() : 'pendiente';
            const uploadDate = row.fecha_proceso ? row.fecha_proceso.split('T')[0] : '';
            const pageFolder = row.pagina_destino;

            if (pageFolder) {
                if (!pageStats[pageFolder]) {
                    pageStats[pageFolder] = { name: pageFolder, total: 0, success: 0 };
                }
                pageStats[pageFolder].total++;
                if (status === 'completado') {
                    pageStats[pageFolder].success++;
                }
            }

            if (status === 'pendiente') {
                pendingCount++;
            } else if (status === 'completado') {
                successCount++;
                if (uploadDate === todayDate) {
                    todayCount++;
                }
            } else if (status === 'error') {
                errorCount++;
            }
        });

        const successRate = totalCount > 0 ? Math.round((successCount / (successCount + errorCount || 1)) * 100) : 0;
        const sortedPages = Object.values(pageStats).sort((a, b) => b.total - a.total).slice(0, 4);

        setStats({ total: totalCount, pending: pendingCount, today: todayCount, error: errorCount, successRate });
        setTopPages(sortedPages);
        setRecentActivity(recent);
    };

    const getStatusBadge = (status) => {
        if (status === 'completado') return <span className="status-badge status-completado">Completado</span>;
        if (status === 'error') return <span className="status-badge status-error">Error</span>;
        return <span className="status-badge status-pendiente">Pendiente</span>;
    };

    return (
        <section className="view active">
            <div className="hero-card">
                <h1>Bienvenido de nuevo, Creador</h1>
                <p>Aquí tienes un resumen en tiempo real del estado de tus publicaciones y el rendimiento de tu sistema.</p>
                <svg className="hero-bg-icon" xmlns="http://www.w3.org/2000/svg" width="160" height="160" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon></svg>
            </div>

            <div className="dashboard-stats-row">
                <div className="dashboard-stat-card">
                    <div className="dashboard-stat-icon" style={{ background: 'rgba(139, 92, 246, 0.15)', color: 'var(--accent-primary)' }}>
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="20" rx="2.18" ry="2.18"></rect><line x1="7" y1="2" x2="7" y2="22"></line><line x1="17" y1="2" x2="17" y2="22"></line><line x1="2" y1="12" x2="22" y2="12"></line><line x1="2" y1="7" x2="7" y2="7"></line><line x1="2" y1="17" x2="7" y2="17"></line><line x1="17" y1="17" x2="22" y2="17"></line><line x1="17" y1="7" x2="22" y2="7"></line></svg>
                    </div>
                    <div className="dashboard-stat-info">
                        <span className="dashboard-stat-title">Total de Videos</span>
                        <span className="dashboard-stat-value">{stats.total}</span>
                    </div>
                </div>

                <div className="dashboard-stat-card">
                    <div className="dashboard-stat-icon" style={{ background: 'rgba(40, 199, 111, 0.15)', color: 'var(--success)' }}>
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"></polyline><polyline points="17 6 23 6 23 12"></polyline></svg>
                    </div>
                    <div className="dashboard-stat-info">
                        <span className="dashboard-stat-title">Subidos Hoy</span>
                        <span className="dashboard-stat-value">{stats.today}</span>
                    </div>
                </div>

                <div className="dashboard-stat-card">
                    <div className="dashboard-stat-icon" style={{ background: 'rgba(234, 84, 85, 0.15)', color: 'var(--danger)' }}>
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
                    </div>
                    <div className="dashboard-stat-info">
                        <span className="dashboard-stat-title">Pendientes</span>
                        <span className="dashboard-stat-value">{stats.pending}</span>
                    </div>
                </div>

                <div className="dashboard-stat-card">
                    <div className="dashboard-stat-icon" style={{ background: 'rgba(255, 159, 67, 0.15)', color: '#ff9f43' }}>
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
                    </div>
                    <div className="dashboard-stat-info">
                        <span className="dashboard-stat-title">Tasa de Éxito</span>
                        <span className="dashboard-stat-value">{stats.successRate}%</span>
                    </div>
                </div>
            </div>

            <div className="dashboard-grid">
                <div className="dashboard-section">
                    <h3 className="dashboard-section-header">Actividad Reciente</h3>
                    <div className="activity-list">
                        {recentActivity.length > 0 ? recentActivity.map((activity, index) => (
                            <div className="activity-item" key={index}>
                                <div className="activity-info">
                                    <span className="activity-title">{activity.title}</span>
                                    <span className="activity-subtitle">Destino: {activity.page}</span>
                                </div>
                                <div>
                                    {getStatusBadge(activity.status)}
                                </div>
                            </div>
                        )) : (
                            <p style={{color: 'var(--text-secondary)', fontSize: '14px'}}>No hay actividad reciente.</p>
                        )}
                    </div>
                </div>

                <div className="dashboard-section">
                    <h3 className="dashboard-section-header">Actividad por Página / Grupo</h3>
                    
                    {topPages.length > 0 ? topPages.map((page, index) => (
                        <div className="platform-distribution-item" key={index}>
                            <div className="platform-distribution-header">
                                <span>{page.name}</span>
                                <span>{page.total} videos</span>
                            </div>
                            <div className="progress-bar-small-bg">
                                <div className="progress-bar-small-fill" style={{ width: `${page.total > 0 ? (page.success / page.total) * 100 : 0}%`, background: 'var(--accent-primary)' }}></div>
                            </div>
                        </div>
                    )) : (
                        <p style={{color: 'var(--text-secondary)', fontSize: '14px'}}>No hay grupos o páginas configurados.</p>
                    )}
                </div>
            </div>
        </section>
    );
}

export default DashboardView;
