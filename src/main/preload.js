const { contextBridge, ipcRenderer, webUtils } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    getPathForFile: (file) => {
        if (webUtils && webUtils.getPathForFile) {
            return webUtils.getPathForFile(file);
        }
        return file.path;
    },
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
    deletePage: (id) => ipcRenderer.invoke('delete-page', id),

    // Extractor
    selectFilesForExtraction: () => ipcRenderer.invoke('select-files-extraction'),
    startExtraction: (files, format) => ipcRenderer.send('start-extraction', { files, format }),
    cancelExtraction: () => ipcRenderer.send('cancel-extraction'),
    onExtractorProgress: (callback) => ipcRenderer.on('extractor-progress', callback),
    showItemInFolder: (path) => ipcRenderer.send('show-item-in-folder', path),

    // Editor Pro
    selectFilesForEditor: (multiple) => ipcRenderer.invoke('select-files-editor', multiple),
    startEditorTrim: (data) => ipcRenderer.send('start-editor-trim', data),
    startEditorCompress: (data) => ipcRenderer.send('start-editor-compress', data),
    startEditorJoin: (data) => ipcRenderer.send('start-editor-join', data),
    cancelEditor: () => ipcRenderer.send('cancel-editor'),
    onEditorProgress: (callback) => ipcRenderer.on('editor-progress', callback),
    removeAllEditorProgressListeners: () => ipcRenderer.removeAllListeners('editor-progress')
});
