const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    selectDirectory: () => ipcRenderer.invoke('select-directory'),
    clearHistory: () => ipcRenderer.invoke('clear-history'),
    startDownload: (options) => ipcRenderer.send('start-download', options),
    cancelDownload: () => ipcRenderer.send('cancel-download'),
    onDownloadProgress: (callback) => ipcRenderer.on('download-progress', callback),
    onDownloadComplete: (callback) => ipcRenderer.on('download-complete', callback),
    
    // Uploader
    startUpload: (options) => ipcRenderer.send('start-upload', options),
    cancelUpload: () => ipcRenderer.send('cancel-upload'),
    onUploadProgress: (callback) => ipcRenderer.on('upload-progress', callback),
    onUploadBar: (callback) => ipcRenderer.on('upload-bar', callback),
    onUploadComplete: (callback) => ipcRenderer.on('upload-complete', callback),
    onPublisherLog: (callback) => ipcRenderer.on('publisher-log', callback),
    getCsvData: () => ipcRenderer.invoke('get-csv-data'),
    getTokens: () => ipcRenderer.invoke('get-tokens'),
    generateCsv: () => ipcRenderer.invoke('generate-csv'),
    
    // Pages Config
    addPage: (pageData) => ipcRenderer.invoke('add-page', pageData),
    updatePage: (id, pageData) => ipcRenderer.invoke('update-page', { id, pageData }),
    deletePage: (id) => ipcRenderer.invoke('delete-page', id)
});
