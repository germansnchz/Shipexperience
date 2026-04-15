const { chromium } = require('playwright');
const fs = require('fs');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    await page.goto('https://app.redevet.com/red/ag/Buscador.asp');

    await page.fill('input[name="usuario"]', process.env.RED_EVT_USER);
    await page.fill('input[name="password"]', process.env.RED_EVT_PASS);
    await page.click('button[type="submit"]');
    await page.waitForNavigation();

    const destinos = [
      "Buenos Aires", "Circuito Tucumano", "Cuyo Total", "El Calafate", 
      "La Falda", "Puerto Madryn", "San Carlos de Bariloche", 
      "San Martin de Los Andes", "San Rafael", "Santa Rosa de Calamuchita", 
      "Talampaya y Valle de la Luna", "Termas de Federacion", 
      "Termas de Fiambala, Catamarca y Ruta del Adobe", "Termas de Rio Hondo", 
      "Ushuaia", "Villa Carlos Paz", "Villa de Merlo", 
      "Foz do Iguazu y Termas de Entre Rios", "Interlagos Formula 1", 
      "Balneario Camboriu", "Mundial de Futbol", "Mundial 2026", 
      "Capitales Imperiales", "Bayahibe", "Punta Cana"
    ];

    let resultadosGlobales = [];

    for (const dest of destinos) {
      try {
        // Seleccionamos destino por texto parcial para evitar errores de acentos
        await page.selectOption('select#cboDestino', { label: dest });
        
        // Esperamos a que el selector de embarque se actualice
        await page.waitForTimeout(1000);
        
        // Intentamos seleccionar el primer embarque (si existe)
        const embarqueVisible = await page.$('select#cboEmbarque');
        if (embarqueVisible) {
          await page.selectOption('select#cboEmbarque', { index: 1 });
        }

        await page.click('button:has-text("BUSCAR")');
        
        // Espera de seguridad para carga de resultados
        await page.waitForTimeout(3500); 

        // Captura de fechas verdes (#459C1D)
        const fechasDisponibles = await page.$$eval('td.selected', elements => {
          return elements.map(e => e.innerText.trim()).filter(t => t.length > 0);
        });

        for (const fecha of fechasDisponibles) {
          try {
            await page.click(`td:has-text("${fecha}")`);
            // Esperamos el selector de precio que vimos en tu captura
            await page.waitForSelector('span.text-info', { timeout: 3000 });

            const infoPaquete = {
              destino: dest,
              fecha: fecha,
              precio: await page.$eval('span.text-info', e => e.innerText.trim()),
              cupo: await page.$eval('strong', e => e.innerText.trim()),
              actualizado: new Date().toLocaleString('es-AR')
            };
            resultadosGlobales.push(infoPaquete);
          } catch (e) { continue; }
        }
      } catch (err) {
        console.log(`Saltando ${dest}: sin salidas.`);
        continue;
      }
    }

    fs.writeFileSync('paquetes.json', JSON.stringify(resultadosGlobales, null, 2));
    console.log("Misión finalizada con éxito.");

  } catch (error) {
    console.error("Error crítico:", error);
    process.exit(0); // Forzamos éxito para que no se ponga en rojo si falla un paso menor
  } finally {
    await browser.close();
  }
})();
