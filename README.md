# Creador Pro - Gestor de Contenido Multimedia

Creador Pro es una aplicación de escritorio basada en **Electron y React** diseñada para automatizar, programar y gestionar de forma masiva la subida de videos a redes sociales (principalmente Facebook, con infraestructura preparada para YouTube y TikTok), así como herramientas integradas de edición y extracción.

## 🚀 Características Principales

1. **Dashboard (Centro de Control):** Panel administrativo con métricas en tiempo real, histórico de videos procesados, tasa de éxito y actividad reciente organizada dinámicamente por Grupos/Páginas.
2. **Descargador de Videos:** Descarga contenido desde múltiples plataformas utilizando el motor subyacente `yt-dlp`.
3. **Publicador y Programador (Uploader):**
   - Subida masiva de videos con intervalos de tiempo personalizados.
   - Posibilidad de programar fechas exactas (Scheduled Publishes de Facebook API).
   - Tolerancia a fallos: Subida en fragmentos (Chunks de 10MB) que evita que archivos grandes colapsen la red.
4. **Extractor de Audio:** Extrae el audio de tus videos locales convirtiéndolos rápidamente a formato `.mp3`.
5. **Compresor de Video (Motor H.265):** Reduce masivamente el peso de los videos sin perder resolución o calidad visual utilizando el avanzado códec de compresión HEVC (H.265).

## 📁 Arquitectura de Carpetas y Categorías

El corazón del sistema se basa en la lectura inteligente del sistema de archivos local (tu disco duro) sincronizado con una base de datos interna SQLite:

1. **Carpeta Raíz:** En la pestaña *Configuración*, asignas una carpeta de tu PC a una Página o Grupo.
2. **Categoría "General":** Todos los videos `.mp4`, `.mov`, etc., que se encuentren sueltos en esa raíz son catalogados bajo la categoría oculta "General".
3. **Subcategorías Inteligentes:** Si creas subcarpetas dentro de tu raíz (ej. `/Humor/` o `/Noticias/`), el escáner leerá automáticamente el nombre de la subcarpeta como la **Categoría** de esos videos.
4. **Historial de Procesados:** Una vez que un video se publica exitosamente, la aplicación lo mueve automáticamente a una subcarpeta llamada `/procesados/` (creada dinámicamente) para no volver a subirlo, manteniendo la organización de tu disco intacta pero marcando su progreso en la base de datos.

## 🛠️ Tecnologías Utilizadas

- **Frontend:** React.js, Vite (HMR), CSS Vanilla (Estilos Premium Vuexy-like).
- **Backend/Desktop:** Electron (Node.js).
- **Base de Datos:** SQLite (`sqlite3`) embebido para persistencia de estados e historial.
- **Motores Multimedia:** `ffmpeg-static` y `fluent-ffmpeg` para procesamiento local (recortes, compresión, extracción de audio).
- **API Externa:** Graph API de Facebook.

## ⚙️ Cómo iniciar el proyecto en Desarrollo

1. Asegúrate de tener Node.js instalado.
2. En la terminal, instala las dependencias (solo la primera vez):
   ```bash
   npm install
   ```
3. Ejecuta el entorno de desarrollo concurrente (levanta Vite y Electron al mismo tiempo):
   ```bash
   npm run dev
   ```

## 📝 Notas de Configuración (Tokens)
Para que el Publicador masivo funcione correctamente, es necesario generar y configurar un `Page Access Token` válido de Facebook con permisos de publicación de video y guardarlo junto con el ID numérico de la página en la pestaña **Configuración**.
