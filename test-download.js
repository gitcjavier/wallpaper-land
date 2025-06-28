// Script de prueba para el endpoint de descarga
async function testDownload() {
  try {
    console.log('Probando endpoint de descarga...');
    
    // Primero necesitamos obtener un wallpaper ID válido
    const response = await fetch('http://localhost:4322/');
    const html = await response.text();
    
    // Buscar un wallpaper ID en el HTML (esto es una aproximación)
    const wallpaperIdMatch = html.match(/data-wallpaper-id="([^"]+)"/);
    
    if (!wallpaperIdMatch) {
      console.log('No se encontró ningún wallpaper ID en la página');
      return;
    }
    
    const wallpaperId = wallpaperIdMatch[1];
    console.log('Wallpaper ID encontrado:', wallpaperId);
    
    // Probar el endpoint de descarga
    const downloadResponse = await fetch('http://localhost:4322/api/wallpapers/download', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: wallpaperId })
    });
    
    console.log('Status:', downloadResponse.status);
    console.log('Content-Type:', downloadResponse.headers.get('content-type'));
    
    if (downloadResponse.ok) {
      const contentType = downloadResponse.headers.get('content-type');
      
      if (contentType && contentType.includes('application/json')) {
        const result = await downloadResponse.json();
        console.log('Respuesta JSON:', result);
      } else {
        console.log('Respuesta binaria recibida (descarga directa)');
        const blob = await downloadResponse.blob();
        console.log('Tamaño del archivo:', blob.size, 'bytes');
      }
    } else {
      const error = await downloadResponse.text();
      console.error('Error:', error);
    }
    
  } catch (error) {
    console.error('Error en la prueba:', error);
  }
}

// Ejecutar la prueba
testDownload(); 