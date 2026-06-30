import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import DashboardView from './views/DashboardView';
import DownloaderView from './views/DownloaderView';
import UploaderView from './views/UploaderView';
import ExtractorView from './views/ExtractorView';
import EditorView from './views/EditorView';
import ConfigView from './views/ConfigView';
import ToastContainer, { showToast } from './components/ToastContainer';

// Hacemos showToast disponible globalmente para facilitar la migración
window.showToast = showToast;

function App() {
  const [currentView, setCurrentView] = useState('inicio');

  // Prevenir que Electron abra el archivo al soltarlo fuera de la zona permitida
  useEffect(() => {
    const handleDragOver = (e) => e.preventDefault();
    const handleDrop = (e) => e.preventDefault();
    
    window.addEventListener('dragover', handleDragOver, false);
    window.addEventListener('drop', handleDrop, false);
    
    return () => {
      window.removeEventListener('dragover', handleDragOver, false);
      window.removeEventListener('drop', handleDrop, false);
    };
  }, []);

  return (
    <div className="app-container">
      <Sidebar currentView={currentView} setCurrentView={setCurrentView} />

      <main className="main-content">
        {currentView === 'inicio' && <DashboardView />}
        {currentView === 'downloader' && <DownloaderView />}
        {currentView === 'uploader' && <UploaderView />}
        {currentView === 'extractor' && <ExtractorView />}
        {currentView === 'editor' && <EditorView />}
        {currentView === 'config' && <ConfigView />}
      </main>

      <ToastContainer />
    </div>
  );
}

export default App;
