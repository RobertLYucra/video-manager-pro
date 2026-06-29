import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import DashboardView from './views/DashboardView';
import DownloaderView from './views/DownloaderView';
import UploaderView from './views/UploaderView';
import ConfigView from './views/ConfigView';
import ToastContainer, { showToast } from './components/ToastContainer';

// Hacemos showToast disponible globalmente para facilitar la migración
window.showToast = showToast;

function App() {
  const [currentView, setCurrentView] = useState('inicio');

  return (
    <div className="app-container">
      <Sidebar currentView={currentView} setCurrentView={setCurrentView} />

      <main className="main-content">
        {currentView === 'inicio' && <DashboardView />}
        {currentView === 'downloader' && <DownloaderView />}
        {currentView === 'uploader' && <UploaderView />}
        {currentView === 'config' && <ConfigView />}
      </main>

      <ToastContainer />
    </div>
  );
}

export default App;
