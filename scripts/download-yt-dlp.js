const fs = require('fs');
const https = require('https');
const path = require('path');

const url = 'https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp.exe';
const binDir = path.join(__dirname, '..', 'bin');
if (!fs.existsSync(binDir)) {
    fs.mkdirSync(binDir, { recursive: true });
}
const dest = path.join(binDir, 'yt-dlp.exe');

function downloadFile(fileUrl, destPath) {
    console.log(`Descargando yt-dlp desde ${fileUrl}...`);
    const file = fs.createWriteStream(destPath);

    https.get(fileUrl, (response) => {
        if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
            // Seguir la redirección de GitHub
            return downloadFile(response.headers.location, destPath);
        }

        if (response.statusCode !== 200) {
            console.error(`Error en la descarga: Código HTTP ${response.statusCode}`);
            file.close();
            return;
        }

        response.pipe(file);

        file.on('finish', () => {
            file.close();
            console.log('✅ yt-dlp.exe descargado exitosamente.');
        });
    }).on('error', (err) => {
        fs.unlink(destPath, () => {});
        console.error('Error durante la descarga:', err.message);
    });
}

// Descargar solo si no existe
if (!fs.existsSync(dest)) {
    downloadFile(url, dest);
} else {
    console.log('yt-dlp.exe ya existe en la raíz. Omitiendo descarga.');
}
