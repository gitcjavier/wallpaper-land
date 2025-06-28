// Test automatizado para el SearchBar
const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.goto('http://localhost:4322/');

  // Espera a que el input esté disponible
  await page.waitForSelector('#search-input');

  // Escribe un texto de búsqueda
  await page.fill('#search-input', 'nature');

  // Presiona Enter
  await page.keyboard.press('Enter');

  // Espera la navegación
  await page.waitForNavigation();

  // Verifica que la URL contiene el parámetro de búsqueda
  const url = page.url();
  if (url.includes('search=nature')) {
    console.log('✅ El SearchBar realiza la búsqueda correctamente al presionar Enter.');
  } else {
    console.error('❌ El SearchBar NO realiza la búsqueda correctamente al presionar Enter.');
    process.exit(1);
  }

  await browser.close();
})(); 