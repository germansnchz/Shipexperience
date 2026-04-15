const { chromium } = require('playwright');
const fs = require('fs');

(async () => {
  const browser = await chromium.launch({ headless: true });
  
  // 1. Configuramos el contexto con un "Disfraz de Humano" (User Agent)
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
    viewport: { width: 1280, height: 720 },
    ignoreHTTPSErrors: true
  });
  
  const page = await context.newPage();

  try {
    console.log("Iniciando navegación con modo sigilo...");
    
    // Intentamos entrar a la raíz primero para ganar confianza
    await page.goto('https://app.redevet.com/red/', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);
    
    // Ahora vamos al buscador
    await page.goto('https://app.redevet.com/red/ag/Buscador.asp', { 
      waitUntil: 'commit', // 'commit' es más flexible ante errores de SSL
      timeout: 60000 
    });

    console.log("Logueando...");
    await page.fill('input[name="usuario"]', process.env.RED_EVT_USER);
    await page.fill('input[name="password"]', process.env.RED_EVT_PASS);
    await page.click('button[type="submit"]');
    await page.waitForNavigation();

    const destinos = ["Buenos Aires", "Mendoza", "San Rafael", "Salta", "Cataratas del Iguazu"];
    let resultadosGlobales = [];

    for (const dest of destinos) {
      try {
        console.log(`Buscando en: ${dest}`);
        await page.selectOption('select#cboDestino', { label: dest });
        await page.waitForTimeout(2000);
        await page.click('button:has-text("BUSCAR")');
        await page.waitForTimeout(5000); 

        const preciosEncontrados = await page.$$eval('span.text-info', elements => {
          return elements.map(e => e.innerText.trim()).filter(t => t.includes('$') || /\d/.test(t));
        });

        if (preciosEncontrados.length > 0) {
          resultadosGlobales.push({
            destino: dest,
            precio: preciosEncontrados[0],
            actualizado: new Date().toLocaleString('es-AR')
          });
          console.log(`✅ ¡Éxito! Encontré precio en ${dest}`);
        }
      } catch (err) { continue; }
    }

    fs.writeFileSync('paquetes.json', JSON.stringify(resultadosGlobales, null, 2));
    console.log("Misión terminada.");

  } catch (error) {
    console.error("Error detectado:", error.message);
  } finally {
    await browser.close();
  }
})();
