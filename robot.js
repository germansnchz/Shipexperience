const { chromium } = require('playwright');
const fs = require('fs');

(async () => {
  // 1. Despegue: Abrimos el navegador
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    // 2. Rumbo a Red Evt
    await page.goto('https://app.redevet.com/red/ag/Buscador.asp');

    // 3. Logueo seguro (usando tus Secrets)
    await page.fill('input[name="usuario"]', process.env.RED_EVT_USER);
    await page.fill('input[name="password"]', process.env.RED_EVT_PASS);
    await page.click('button[type="submit"]');
    await page.waitForNavigation();

    // 4. Selección de Destinos y Embarques
    // El robot usará el selector que identificamos: select#cboDestino
    const destinos = ["CATARATAS", "NORTE", "MENDOZA"]; // Podemos ampliar esta lista
    let resultadosGlobales = [];

    for (const dest of destinos) {
      await page.selectOption('select#cboDestino', { label: dest });
      
      // Aquí el robot iterará por los embarques prioritarios: 
      // BUE, Mendoza, San Rafael, Rosario, Córdoba
      await page.selectOption('select#cboEmbarque', { index: 1 }); 
      
      await page.click('button:has-text("BUSCAR")');
      await page.waitForSelector('#resultadoSearch'); // Esperamos que cargue la data

      // 5. Cosecha de fechas verdes y precios
      // Buscamos la clase de fondo verde #459C1D que vimos en la captura
      const fechasDisponibles = await page.$$eval('td.selected', elements => {
        return elements.map(e => e.innerText);
      });

      for (const fecha of fechasDisponibles) {
        // Hacemos clic en la fecha verde para ver servicios
        await page.click(`td:has-text("${fecha}")`);
        await page.waitForSelector('span.text-info'); // Selector de precio identificado

        const infoPaquete = {
          destino: dest,
          fecha: fecha,
          precio: await page.$eval('span.text-info', e => e.innerText),
          cupo: await page.$eval('strong', e => e.innerText), // Selector de cupo identificado
          actualizado: new Date().toLocaleString('es-AR')
        };
        resultadosGlobales.push(infoPaquete);
      }
    }

    // 6. Guardar la "cosecha" en el almacén paquetes.json
    fs.writeFileSync('paquetes.json', JSON.stringify(resultadosGlobales, null, 2));
    console.log("Misión cumplida: Paquetes actualizados.");

  } catch (error) {
    console.error("Error en la navegación:", error);
  } finally {
    await browser.close();
  }
})();
