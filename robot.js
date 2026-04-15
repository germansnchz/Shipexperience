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
      "Buenos Aires",
      "Circuito Tucumano",
      "Cuyo Total",
      "El Calafate",
      "La Falda",
      "Puerto Madryn",
      "San Carlos de Bariloche",
      "San Martin de Los Andes",
      "San Rafael",
      "Santa Rosa de Calamuchita",
      "Talampaya y Valle de la Luna",
      "Termas de Federacion",
      "Termas de Fiambala, Catamarca y Ruta del Adobe",
      "Termas de Rio Hondo",
      "Ushuaia",
      "Villa Carlos Paz",
      "Villa de Merlo",
      "Foz do Iguazu y Termas de Entre Rios",
      "Interlagos Formula 1",
      "Balneario Camboriu",
      "Mundial de Futbol",
      "Mundial 2026",
      "Capitales Imperiales",
      "Bayahibe",
      "Punta Cana"
    ];

    let resultadosGlobales = [];

    for (const dest of destinos) {
      try {
        await page.selectOption('select#cboDestino', { label: dest });
        await page.selectOption('select#cboEmbarque', { index: 1 }); 
        await page.click('button:has-text("BUSCAR")');
        
        await page.waitForTimeout(3000); 

        const fechasDisponibles = await page.$$eval('td.selected', elements => {
          return elements.map(e => e.innerText.trim());
        });

        for (const fecha of fechasDisponibles) {
          await page.click(`td:has-text
