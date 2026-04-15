const { chromium } = require('playwright');
const fs = require('fs');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    await page.goto('https://app.redevet.com/red/ag/Buscador.asp');

    // Logueo
    await page.fill('input[name="usuario"]', process.env.RED_EVT_USER);
    await page.fill('input[name="password"]', process.env.RED_EVT_PASS);
    await page.click('button[type="submit"]');
    await page.waitForNavigation();

    const destinos = ["Buenos Aires", "Mendoza", "San Rafael", "Salta", "Cataratas del Iguazu"];
    let resultadosGlobales = [];

    for (const dest of destinos) {
      try {
        console.log(`Navegando a: ${dest}`);
        await page.selectOption('select#cboDestino', { label: dest });
        await page.waitForTimeout(2000);
        
        await page.click('button:has-text("BUSCAR")');
        await page.waitForTimeout(4000); 

        // En lugar de buscar fechas, buscamos si ya hay precios en pantalla
        const precios = await page.$$eval('span.text-info', elements => {
          return elements.map(e => e.innerText.trim());
        });

        if (precios.length > 0) {
          resultadosGlobales.push({
            destino: dest,
            precio: precios[0],
            actualizado: new Date().toLocaleString('es-AR')
          });
          console.log(`¡Encontré algo en ${dest}!`);
        }
      } catch (err) { continue; }
    }

    fs.writeFileSync('paquetes.json', JSON.stringify(resultadosGlobales, null, 2));
  } catch (error) {
    console.error(error);
  } finally {
    await browser.close();
  }
})();
