import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';

function ConfigView() {
    const [pages, setPages] = useState([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [formData, setFormData] = useState({
        id: null,
        platform: 'facebook',
        nombre_pag: '',
        folder: '',
        page_id: '',
        token: ''
    });
    const [categoryInput, setCategoryInput] = useState('');
    const [categories, setCategories] = useState([]);

    useEffect(() => {
        fetchPages();
    }, []);

    const fetchPages = async () => {
        const data = await window.electronAPI.getTokens();
        setPages(data);
    };

    const handleSelectFolder = async () => {
        const selectedPath = await window.electronAPI.selectDirectory();
        if (selectedPath) {
            setFormData(prev => ({ ...prev, folder: selectedPath }));
        }
    };

    const processCategories = (text) => {
        const newCats = text.split(/[\n,\s]+/)
            .map(line => line.trim())
            .filter(line => line !== '' && !categories.includes(line));
        
        if (newCats.length > 0) {
            setCategories(prev => [...prev, ...newCats]);
        }
        setCategoryInput('');
    };

    const handleCategoryKeyDown = (e) => {
        if (e.key === 'Enter' || e.key === ',') {
            e.preventDefault();
            processCategories(categoryInput);
        }
    };

    const handleCategoryPaste = (e) => {
        e.preventDefault();
        const pastedText = e.clipboardData.getData('text');
        processCategories(pastedText);
    };

    const removeCategory = (indexToRemove) => {
        setCategories(prev => prev.filter((_, index) => index !== indexToRemove));
    };

    const handleEdit = (page) => {
        setFormData({
            id: page.id,
            platform: page.platform || 'facebook',
            nombre_pag: page.nombre_pag,
            folder: page.folder,
            page_id: page.page_id,
            token: page.token
        });
        setCategories(page.categorias ? [...page.categorias] : []);
        setIsModalOpen(true);
    };

    const handleDelete = async (id) => {
        if (confirm('¿Estás seguro de que quieres borrar esta página?')) {
            const res = await window.electronAPI.deletePage(id);
            if (res.success) {
                window.showToast('Página borrada', 'success');
                fetchPages();
            } else {
                window.showToast('Error: ' + res.message, 'error');
            }
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        let finalCategories = [...categories];
        if (categoryInput.trim() !== '') {
            const newCats = categoryInput.split(/[\n,\s]+/).map(l => l.trim()).filter(l => l !== '' && !categories.includes(l));
            finalCategories = [...finalCategories, ...newCats];
        }

        const pageData = {
            ...formData,
            categorias: finalCategories
        };

        let res;
        if (formData.id) {
            res = await window.electronAPI.updatePage(formData.id, pageData);
        } else {
            res = await window.electronAPI.addPage(pageData);
        }

        if (res.success) {
            window.showToast('Página guardada correctamente', 'success');
            setIsModalOpen(false);
            fetchPages();
        } else {
            window.showToast('Error al guardar: ' + res.message, 'error');
        }
    };

    const resetForm = () => {
        setFormData({
            id: null,
            platform: 'facebook',
            nombre_pag: '',
            folder: '',
            page_id: '',
            token: ''
        });
        setCategories([]);
        setCategoryInput('');
    };

    const openAddModal = () => {
        resetForm();
        setIsModalOpen(true);
    };

    return (
        <section className="view active">
            <header className="view-header">
                <h1>Configuración</h1>
                <p>Gestiona tus Páginas de Facebook (Tokens, IDs) y Ajustes Globales.</p>
            </header>

            <div className="card">
                <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px'}}>
                    <h3 className="section-title" style={{margin: 0}}>Páginas Configuradas</h3>
                    <button className="btn primary" onClick={openAddModal} style={{padding: '0.5rem 1rem', fontSize: '14px'}}>
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{marginRight: '8px'}}><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                        Añadir Página
                    </button>
                </div>
                
                <div style={{overflowX: 'auto'}}>
                    <table className="data-table config-table">
                        <thead>
                            <tr>
                                <th>ID</th>
                                <th>Nombre (App)</th>
                                <th>Directorio Raíz</th>
                                <th>Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            {pages.map(page => (
                                <tr key={page.id}>
                                    <td style={{color: '#64748b', fontWeight: '500'}}>{page.id}</td>
                                    <td style={{fontWeight: '600', color: '#334155'}}>
                                        <div style={{display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '6px'}}>
                                            <span>{page.nombre_pag}</span>
                                            <span className={`platform-badge platform-${(page.platform || 'facebook').toLowerCase()}`}>
                                                {page.platform || 'Facebook'}
                                            </span>
                                        </div>
                                    </td>
                                    <td style={{color: '#64748b'}}>{page.folder}</td>
                                    <td>
                                        <div style={{display: 'flex', gap: '12px', alignItems: 'center'}}>
                                            <a href="#" className="text-secondary edit-btn" onClick={(e) => { e.preventDefault(); handleEdit(page); }} title="Editar">
                                                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                                            </a>
                                            <a href="#" className="text-secondary delete-btn" onClick={(e) => { e.preventDefault(); handleDelete(page.id); }} title="Eliminar">
                                                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
                                            </a>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {pages.length === 0 && (
                                <tr>
                                    <td colSpan="4" style={{textAlign: 'center', padding: '24px', color: '#64748b'}}>No hay páginas configuradas.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {isModalOpen && createPortal(
                <div className="modal-overlay" onClick={(e) => { if(e.target === e.currentTarget) setIsModalOpen(false); }}>
                    <div className="modal-content card">
                        <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px'}}>
                            <h3 className="section-title" style={{margin: 0}}>{formData.id ? 'Editar Página' : 'Añadir Página'}</h3>
                            <button type="button" className="btn-icon" onClick={() => setIsModalOpen(false)}>
                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                            </button>
                        </div>
                        
                        <form onSubmit={handleSubmit} style={{display: 'flex', flexDirection: 'column', gap: '15px'}}>
                            <div className="options-grid" style={{ marginBottom: '0' }}>
                                <div className="form-group">
                                    <label>Plataforma</label>
                                    <select required value={formData.platform} onChange={e => setFormData({...formData, platform: e.target.value})}>
                                        <option value="facebook">Facebook</option>
                                        <option value="youtube">YouTube (Próximamente)</option>
                                        <option value="tiktok">TikTok (Próximamente)</option>
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label>Nombre de la Página</label>
                                    <input type="text" placeholder="Ej: Memes Graciosos" required value={formData.nombre_pag} onChange={e => setFormData({...formData, nombre_pag: e.target.value})} />
                                </div>
                                <div className="form-group">
                                    <label>ID de Facebook</label>
                                    <input type="text" placeholder="ID Numérico de la Página" required value={formData.page_id} onChange={e => setFormData({...formData, page_id: e.target.value})} />
                                </div>
                                <div className="form-group">
                                    <label>Categorías (Separadas por coma)</label>
                                    <div className="tags-input-container" onClick={() => document.getElementById('catInput').focus()}>
                                        {categories.map((cat, index) => (
                                            <div key={index} className="tag">
                                                <span>{cat}</span>
                                                <div className="close-btn" onClick={() => removeCategory(index)}>✕</div>
                                            </div>
                                        ))}
                                        <input 
                                            type="text" 
                                            id="catInput" 
                                            placeholder="Ej: Humor, Animales" 
                                            value={categoryInput} 
                                            onChange={e => setCategoryInput(e.target.value)}
                                            onKeyDown={handleCategoryKeyDown}
                                            onPaste={handleCategoryPaste}
                                            style={{border: 'none', background: 'transparent', outline: 'none', color: 'var(--text-primary)', flex: 1}}
                                        />
                                    </div>
                                </div>
                                <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                                    <label>Carpeta Destino</label>
                                    <div className="input-with-button">
                                        <input type="text" placeholder="Selecciona la carpeta..." required readOnly value={formData.folder} />
                                        <button type="button" className="btn secondary" onClick={handleSelectFolder} style={{display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
                                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path></svg>
                                        </button>
                                    </div>
                                </div>
                                <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                                    <label>Page Access Token</label>
                                    <input type="password" placeholder="EAA..." required value={formData.token} onChange={e => setFormData({...formData, token: e.target.value})} />
                                </div>
                            </div>

                            <div className="actions" style={{marginTop: '10px', display: 'flex', justifyContent: 'flex-end', gap: '12px'}}>
                                <button type="button" className="btn secondary" onClick={() => setIsModalOpen(false)}>Cancelar</button>
                                <button type="submit" className="btn primary" style={{display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{marginRight: '8px'}}><path d="M19 21H5a2 2 0 0 1-2 2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path><polyline points="17 21 17 13 7 13 7 21"></polyline><polyline points="7 3 7 8 15 8"></polyline></svg>
                                    <span>Guardar Página</span>
                                </button>
                            </div>
                        </form>
                    </div>
                </div>,
                document.body
            )}
        </section>
    );
}

export default ConfigView;
