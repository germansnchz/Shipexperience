/**
 * shipTarifario.js — Ship Experience
 * Motor de sincronización de tarifas desde tarifario_proveedores.json
 *
 * ARQUITECTURA:
 *  - UI (index.html) es independiente de los datos
 *  - Los precios y fechas en el HTML son valores de fallback
 *  - Este script reemplaza esos valores con los del JSON en tiempo real
 *  - Si el JSON falla, la UI muestra el valor original + CTA de WhatsApp
 *
 * PARA ACTIVAR EN PRODUCCIÓN:
 *  1. Tu scraper genera/actualiza tarifario_proveedores.json
 *  2. GitHub Pages sirve el JSON junto al index.html
 *  3. Este script lo consume automáticamente al cargar la página
 */

(function(){
  'use strict';

  var TARIFARIO_URL = './tarifario_proveedores.json';
  var CACHE_KEY     = 'ship_tarifario_cache';
  var CACHE_TTL_MS  = 30 * 60 * 1000; // 30 min

  // ── Helpers ──────────────────────────────────────────────────────────────

  function showSkeleton(card) {
    var priceEl = card.querySelector('[data-field="price"]');
    var datesEl = card.querySelector('[data-field="dates"]');
    if (priceEl) priceEl.innerHTML = '<span class="price-skeleton"></span>';
    if (datesEl) datesEl.innerHTML = '<span class="price-skeleton" style="width:160px"></span>';
  }

  function applyTarifa(card, tarifa) {
    var priceEl = card.querySelector('[data-field="price"], .pprice');
    var datesEl = card.querySelector('[data-field="dates"], .pdates');

    if (priceEl && tarifa.price)  priceEl.textContent = tarifa.price;
    if (datesEl && tarifa.dates)  datesEl.textContent = tarifa.dates;

    // Sync data attributes for the search panel
    if (tarifa.price)  card.dataset.price = tarifa.price;
    if (tarifa.dates)  card.dataset.dates = tarifa.dates;
    if (tarifa.cuota)  card.dataset.cuota = tarifa.cuota;

    // If no cupos, mark card as unavailable
    if (tarifa.disponible === false || tarifa.cupos === 0) {
      card.classList.add('pc-agotado');
      var btn = card.querySelector('.pbtn');
      if (btn) btn.textContent = 'Sin cupos disponibles';
    }
  }

  function showFallbackWA(card) {
    // Price stays as hardcoded fallback — add a "Consultar tarifa" CTA
    var footer = card.querySelector('.pfoot');
    if (!footer) return;
    if (footer.querySelector('.price-wa-cta')) return; // already added

    var cta = document.createElement('button');
    cta.className = 'price-wa-cta';
    cta.style.cssText = 'background:none;border:none;color:var(--sp);font-size:11px;cursor:pointer;font-weight:600;padding:4px 0 0;font-family:inherit;display:block;width:100%;text-align:right';
    cta.textContent = '⚠ Consultá tarifa actualizada →';
    var shipId = card.dataset.shipId || '';
    var msg = 'Hola SHIP! Quiero consultar la tarifa actualizada del paquete ' + (card.dataset.title || shipId) + '. ¿Está disponible?';
    cta.onclick = function(e){ e.stopPropagation(); openWA(msg); };
    footer.appendChild(cta);
  }

  // ── Core fetch ────────────────────────────────────────────────────────────

  function applyTarifario(data) {
    var byId = {};
    (data.paquetes || []).forEach(function(t){ byId[t.id] = t; });

    var cards = document.querySelectorAll('.pc[data-ship-id]');
    cards.forEach(function(card){
      var id = card.dataset.shipId;
      if (!id) return;

      var tarifa = byId[id];
      if (tarifa) {
        applyTarifa(card, tarifa);
      } else {
        // ID not in JSON — tarifa desconocida
        showFallbackWA(card);
      }
    });

    console.log('[Ship Tarifario] Aplicado a ' + cards.length + ' paquetes (' + Object.keys(byId).length + ' tarifas en JSON)');
  }

  function loadFromCache() {
    try {
      var cached = sessionStorage.getItem(CACHE_KEY);
      if (!cached) return null;
      var obj = JSON.parse(cached);
      if (Date.now() - obj.ts > CACHE_TTL_MS) return null;
      return obj.data;
    } catch(e) { return null; }
  }

  function saveToCache(data) {
    try {
      sessionStorage.setItem(CACHE_KEY, JSON.stringify({ ts: Date.now(), data: data }));
    } catch(e) {}
  }

  function fetchTarifario() {
    // 1. Show skeleton on all price-enabled cards
    document.querySelectorAll('.pc[data-ship-id] [data-field="price"]').forEach(function(el){
      el.innerHTML = '<span class="price-skeleton"></span>';
    });

    // 2. Try cache first
    var cached = loadFromCache();
    if (cached) {
      applyTarifario(cached);
      return;
    }

    // 3. Fetch fresh
    fetch(TARIFARIO_URL + '?v=' + Date.now())
      .then(function(res){
        if (!res.ok) throw new Error('HTTP ' + res.status);
        return res.json();
      })
      .then(function(data){
        saveToCache(data);
        applyTarifario(data);
      })
      .catch(function(err){
        console.warn('[Ship Tarifario] Error al cargar JSON:', err.message);
        // Restore original hardcoded prices and show WA CTA
        document.querySelectorAll('.pc[data-ship-id]').forEach(function(card){
          var priceEl = card.querySelector('[data-field="price"]');
          if (priceEl && card.dataset.price) priceEl.textContent = card.dataset.price;
          var datesEl = card.querySelector('[data-field="dates"]');
          if (datesEl && card.dataset.dates) datesEl.textContent = card.dataset.dates;
          showFallbackWA(card);
        });
      });
  }

  // ── Init ─────────────────────────────────────────────────────────────────

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', fetchTarifario);
  } else {
    fetchTarifario();
  }

  // Expose for manual refresh (e.g. desde consola: shipTarifario.refresh())
  window.shipTarifario = { refresh: fetchTarifario };

})();
