/* ===== Mendoza Sonido y DJ: carga el contenido y arranca la página =====
   1. Si Firebase está configurado (firebase-config.js), trae lo último que publicaste en el panel.
   2. Si Firebase no responde, usa la última copia guardada en este navegador.
   3. Si no hay nada de lo anterior, usa contenido.js (el contenido de respaldo).
   Lo que falte en lo publicado (por ejemplo, ajustes nuevos que todavía no existían cuando
   publicaste) se completa con contenido.js, sin tocar lo que ya editaste.
   Después carga render.js (dibuja la página), script.js (menú, filtros, buscador),
   cotizador.js (cotizador en 3 pasos), efectos.js (música de fondo y animaciones) y guia.js (la manita). */

// Completa lo que falte en "data" con lo de "base". Las listas no se mezclan: se respeta la tuya.
window.completarSitio = function completar(data, base) {
  if (!data || typeof data !== "object" || !base || typeof base !== "object") return data;
  Object.keys(base).forEach((k) => {
    const b = base[k];
    if (data[k] === undefined) data[k] = JSON.parse(JSON.stringify(b));
    else if (b && typeof b === "object" && !Array.isArray(b) && data[k] && typeof data[k] === "object" && !Array.isArray(data[k])) completar(data[k], b);
  });
  return data;
};
window.SITIO_BASE = JSON.parse(JSON.stringify(window.SITIO || {}));

(async () => {
  const cfg = window.FIREBASE_CONFIG || {};
  const CACHE_KEY = "mendoza-publicado";
  const valid = (d) => d && typeof d === "object" && d.paquetes && d.negocio;
  const use = (d) => { window.SITIO = window.completarSitio(d, window.SITIO_BASE); };

  // La vista previa del panel (?borrador) usa el borrador de este navegador: no hace falta pedir nada
  let hasDraft = false;
  try { hasDraft = new URLSearchParams(location.search).has("borrador") && !!localStorage.getItem("mendoza-borrador"); } catch (e) { /* sin almacenamiento */ }

  if (cfg.databaseURL && !hasDraft) {
    try {
      const ctl = new AbortController();
      const timer = setTimeout(() => ctl.abort(), 5000); // si tarda más de 5 s, se usa el respaldo
      const res = await fetch(String(cfg.databaseURL).replace(/\/+$/, "") + "/sitio/json.json", { signal: ctl.signal, cache: "no-store" });
      clearTimeout(timer);
      if (!res.ok) throw new Error("Firebase respondió " + res.status);
      const json = await res.json(); // el contenido completo, guardado como texto
      if (typeof json === "string" && json) {
        const data = JSON.parse(json);
        if (valid(data)) {
          use(data);
          try { localStorage.setItem(CACHE_KEY, json); } catch (e) { /* sin espacio: no pasa nada */ }
        }
      }
    } catch (err) {
      try {
        const data = JSON.parse(localStorage.getItem(CACHE_KEY) || "null");
        if (valid(data)) use(data);
      } catch (e) { /* se queda contenido.js */ }
    }
  }

  // VERSION: súbela (1, 2, 3...) cada vez que cambies estos archivos, para que los celulares no usen copias viejas
  const VERSION = "2713";
  for (const src of ["render.js", "script.js", "cotizador.js", "efectos.js", "guia.js"]) {
    await new Promise((done) => {
      const s = document.createElement("script");
      s.src = "/" + src + "?v=" + VERSION;
      s.onload = s.onerror = done;
      document.body.appendChild(s);
    });
  }
})();
