export function updateStats(globalCsvData, globalTokens) {
    const globalStatPending = document.getElementById('global-stat-pending');
    const globalStatToday = document.getElementById('global-stat-today');
    const globalStatError = document.getElementById('global-stat-error');
    const pageListContainer = document.getElementById('inicio-page-list-container');

    if (!globalCsvData || !globalTokens) return;

    if (pageListContainer) {
        pageListContainer.innerHTML = ''; // Limpiar lista de páginas
    }

    const todayDate = new Date().toISOString().substring(0, 10); // YYYY-MM-DD

    let totalPending = 0;
    let totalToday = 0;
    let totalError = 0;

    const globalStatPages = document.getElementById('global-stat-pages');
    if (globalStatPages) {
        globalStatPages.textContent = globalTokens.length;
    }

    globalTokens.forEach(token => {
        let pagePending = 0;
        let pageToday = 0;
        let pageError = 0;

        globalCsvData.forEach(row => {
            if (row.pagina_destino === token.folder) {
                if (row.estado === 'pendiente') {
                    pagePending++;
                    totalPending++;
                }
                if (row.estado === 'error') {
                    pageError++;
                    totalError++;
                }
                if (row.estado === 'completado' && row.fecha_proceso && row.fecha_proceso.startsWith(todayDate)) {
                    pageToday++;
                    totalToday++;
                }
            }
        });

        // Crear fila elegante para esta página
        if (pageListContainer) {
            const pageRow = document.createElement('div');
            pageRow.className = 'page-list-item';
            pageRow.innerHTML = `
                <div style="display: flex; flex-direction: column; align-items: flex-start; gap: 4px;">
                    <div class="page-list-name">${token.nombre_pag}</div>
                    <span class="platform-badge platform-${(token.platform || 'facebook').toLowerCase()}">${token.platform || 'Facebook'}</span>
                </div>
                <div class="page-list-badges">
                    <div class="badge-stat pending" title="Pendientes" style="display: flex; align-items: center;">
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right:4px;"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg> ${pagePending}
                    </div>
                    <div class="badge-stat success" title="Procesados Hoy" style="display: flex; align-items: center;">
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right:4px;"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"></polyline><polyline points="17 6 23 6 23 12"></polyline></svg> ${pageToday}
                    </div>
                    <div class="badge-stat error" title="Con Errores" style="display: flex; align-items: center;">
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right:4px;"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg> ${pageError}
                    </div>
                </div>
            `;
            pageListContainer.appendChild(pageRow);
        }
    });

    // Actualizar métricas globales (Hero Cards)
    if (globalStatPending) globalStatPending.textContent = totalPending;
    if (globalStatToday) globalStatToday.textContent = totalToday;
    if (globalStatError) globalStatError.textContent = totalError;
}
