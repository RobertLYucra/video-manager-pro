import { showToast } from './toast.js';
import { loadCsvData } from './uploader.js'; // To refresh the dropdowns when pages change

export function initConfig() {
    const pageForm = document.getElementById('page-form');
    const tableBody = document.getElementById('pages-table-body');
    const btnCancelEdit = document.getElementById('btnCancelEdit');
    
    const inputId = document.getElementById('pageId');
    const inputName = document.getElementById('pageName');
    const inputFolder = document.getElementById('pageFolder');
    const btnSelectFolder = document.getElementById('btnSelectFolder');
    const inputFbId = document.getElementById('pageFbId');
    const inputCategories = document.getElementById('pageCategories');
    const inputToken = document.getElementById('pageToken');
    const inputPlatform = document.getElementById('pagePlatform');
    
    // Modal Elements (Now Inline Form)
    const pageFormContainer = document.getElementById('pageFormContainer');
    const btnAddPage = document.getElementById('btnAddPage');
    const modalTitle = document.getElementById('modalTitle');
    const categoriesContainer = document.getElementById('categoriesContainer');

    let allPages = [];
    let categoryList = [];

    function renderCategories() {
        document.querySelectorAll('#categoriesContainer .tag').forEach(tag => tag.remove());
        categoryList.forEach((cat, index) => {
            const tag = document.createElement('div');
            tag.className = 'tag';
            tag.innerHTML = `
                <span>${cat}</span>
                <div class="close-btn" data-index="${index}">✕</div>
            `;
            categoriesContainer.insertBefore(tag, inputCategories);
        });

        document.querySelectorAll('#categoriesContainer .tag .close-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const idx = e.target.getAttribute('data-index');
                categoryList.splice(idx, 1);
                renderCategories();
            });
        });
    }

    function processCategories(text) {
        const newCats = text.split(/[\n,\s]+/)
            .map(line => line.trim())
            .filter(line => line !== '' && !categoryList.includes(line));
        
        if (newCats.length > 0) {
            categoryList = [...categoryList, ...newCats];
            renderCategories();
            inputCategories.value = '';
        }
    }

    inputCategories.addEventListener('paste', (e) => {
        e.preventDefault();
        const pastedText = (e.clipboardData || window.clipboardData).getData('text');
        processCategories(pastedText);
    });

    inputCategories.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ',') {
            e.preventDefault();
            processCategories(inputCategories.value);
        }
    });

    categoriesContainer.addEventListener('click', () => inputCategories.focus());

    async function fetchAndRenderPages() {
        allPages = await window.electronAPI.getTokens(); // getTokens is now getPages basically
        tableBody.innerHTML = '';
        allPages.forEach(page => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td style="color: #64748b; font-weight: 500;">${page.id}</td>
                <td style="font-weight: 600; color: #334155;">
                    <div style="display: flex; flex-direction: column; align-items: flex-start; gap: 6px;">
                        <span>${page.nombre_pag}</span>
                        <span class="platform-badge platform-${(page.platform || 'facebook').toLowerCase()}">${page.platform || 'Facebook'}</span>
                    </div>
                </td>
                <td style="color: #64748b;">${page.folder}</td>
                <td>
                    <div class="d-flex" style="display: flex; gap: 12px; align-items: center;">
                        <a href="javascript:void(0)" class="text-secondary edit-btn" data-id="${page.id}" title="Editar" style="color: var(--text-secondary);">
                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                        </a>
                        <a href="javascript:void(0)" class="text-secondary delete-btn" data-id="${page.id}" title="Eliminar" style="color: var(--text-secondary);">
                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
                        </a>
                    </div>
                </td>
            `;
            tableBody.appendChild(tr);
        });

        // Add event listeners to new buttons
        document.querySelectorAll('.edit-btn').forEach(btn => {
            btn.addEventListener('click', handleEdit);
        });
        document.querySelectorAll('.delete-btn').forEach(btn => {
            btn.addEventListener('click', handleDelete);
        });
    }

    function handleEdit(e) {
        const btn = e.target.closest('.edit-btn');
        if (!btn) return;
        const id = parseInt(btn.dataset.id);
        const page = allPages.find(p => p.id === id);
        if (page) {
            inputId.value = page.id;
            inputName.value = page.nombre_pag;
            inputFolder.value = page.folder;
            inputFbId.value = page.page_id;
            categoryList = page.categorias ? [...page.categorias] : [];
            renderCategories();
            inputCategories.value = '';
            inputToken.value = page.token;
            if (page.platform) {
                inputPlatform.value = page.platform;
            } else {
                inputPlatform.value = 'facebook';
            }
            
            modalTitle.textContent = 'Editar Página';
            pageFormContainer.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    }

    async function handleDelete(e) {
        const btn = e.target.closest('.delete-btn');
        if (!btn) return;
        const id = parseInt(btn.dataset.id);
        if (confirm('¿Estás seguro de que quieres borrar esta página?')) {
            const res = await window.electronAPI.deletePage(id);
            if (res.success) {
                showToast('Página borrada', 'success');
                fetchAndRenderPages();
                loadCsvData(true);
            } else {
                showToast('Error: ' + res.message, 'error');
            }
        }
    }

    function resetForm() {
        pageForm.reset();
        inputId.value = '';
        categoryList = [];
        renderCategories();
        modalTitle.textContent = 'Añadir Página';
    }

    btnCancelEdit.addEventListener('click', resetForm);

    btnAddPage.addEventListener('click', () => {
        resetForm();
        pageFormContainer.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });

    btnSelectFolder.addEventListener('click', async () => {
        const selectedPath = await window.electronAPI.selectDirectory();
        if (selectedPath) {
            inputFolder.value = selectedPath;
        }
    });

    pageForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        // Añadir lo que haya quedado en el input si no se presionó Enter
        if (inputCategories.value.trim() !== '') {
            processCategories(inputCategories.value);
        }

        const pageData = {
            nombre_pag: inputName.value.trim(),
            folder: inputFolder.value.trim(),
            page_id: inputFbId.value.trim(),
            token: inputToken.value.trim(),
            categorias: categoryList,
            platform: inputPlatform.value
        };

        let res;
        if (inputId.value) {
            // Update
            res = await window.electronAPI.updatePage(parseInt(inputId.value), pageData);
        } else {
            // Add
            res = await window.electronAPI.addPage(pageData);
        }

        if (res.success) {
            showToast('Página guardada correctamente', 'success');
            resetForm();
            fetchAndRenderPages();
            loadCsvData(true);
        } else {
            showToast('Error al guardar: ' + res.message, 'error');
        }
    });

    // Initial load
    fetchAndRenderPages();
}
