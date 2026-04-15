const { chromium } = require('playwright');
const fs = require('fs');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    // 1. Navegación inicial
    await page.goto('https://app.redevet.com/red/ag/Buscador.asp');

    // 2. Logueo (Usa tus Secrets de GitHub)
    await page.fill('input[name="usuario"]', process.env.RED_EVT_USER);
    await page.fill('input[name="password"]', process.env.RED_EVT_PASS);
    await page.click('button[type="submit"]');
    await page.waitForNavigation();

    // 3. Lista de prueba (solo 5 destinos para validar la "pesca")
    const destinos = ["Buenos Aires", "Mendoza", "San Rafael", "Salta", "Cataratas del Iguazu"];
    let resultadosGlobales = [];

    for (const dest of destinos) {
      try {
        console.log(`--- Intentando con: ${dest} ---`);
        
        // Seleccionamos el destino
        await page.selectOption('select#cboDestino', { label: dest });
        await page.waitForTimeout(2000);
        
        // Clic en BUSCAR
        await page.click('button:has-text("BUSCAR")');
        
        // Espera larga (5 seg) para que cargue la tabla de precios
        await page.waitForTimeout(5000); 

        // Capturamos todos los textos con la clase 'span.text-info' (precios)
        const preciosEncontrados = await page.$$eval('span.text-info', elements => {
          return elements
            .map(e => e.innerText.trim())
            .filter(t => t.includes('$') || /\d/.test(t));
        });

        if (preciosEncontrados.length > 0) {
          const dato = {
            destino: dest,
            precio: preciosEncontrados[0],
            actualizado: new Date().toLocaleString('es-AR')
          };
          resultadosGlobales.push(dato);
          console.log(`✅ ¡Éxito! Encontré: ${preciosEncontrados[0]}`);
        } else {
          console.log(`❌ No se vieron precios con 'text-info' en ${dest}`);
        }

      } catch (err) { 
        console.log(`⚠️ Error en el bucle para ${dest}: ${err.message}`);
        continue; 
      }
    }

    // 4. Volcado final al archivo (Esta es la vinculación clave)
    const dataJSON = JSON.stringify(resultadosGlobales, null, 2);
    fs.writeFileSync('paquetes.json', dataJSON);
    
    console.log("--- Misión de diagnóstico terminada ---");
    console.log(`Total de paquetes capturados: ${resultadosGlobales.length}`);

  } catch (error) {
    console.error("❌ Error crítico en el proceso:", error);
  } finally {
    await browser.close();
  }
})();
