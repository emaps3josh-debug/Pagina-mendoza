/* ===== Mendoza Sonido y DJ: tutorial con manita =====
   Una mano animada con un globo amarillo señala dónde tocar, en cualquier página:
   - Inicio: "Encuentra tu paquete" y luego "Elegir" en los paquetes.
   - Paquetes / Fiestas infantiles: "Elegir" del paquete que el cliente tenga a la vista.
   - Cotizar: "Elegir" → "Continuar" → fecha y zona → "Solicitar mi cotización".
   Si el botón no se ve, enseña a deslizar. Sale cada vez que se abre una página; la × la
   oculta en esa visita. Se apaga en el panel: Cotizador > "Mostrar la manita de ayuda". */
(() => {
  const S = window.SITIO || {};
  const CZ = S.cotizacion || {};
  if (CZ.tutorial === false) return;
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  try { localStorage.removeItem("mendoza-tuto"); sessionStorage.removeItem("mendoza-tuto"); } catch (e) { /* versiones anteriores */ }

  const wiz = $("#wiz");
  const C = window.Cotizador; // solo existe en la página de Cotizar
  // Zona donde está lo que hay que tocar: si el cliente ya la pasó (está viendo otra cosa), la mano no estorba
  const area = () => wiz || $("#grupos") || $("#destacados") || $(".kids__body");
  if (!wiz && !$("#heroBtn") && !$("a[data-pack]")) return; // páginas sin nada que señalar
  let tutoOn = true;
  const tutoBtn = $("#tutoBtn");

  const hand = document.createElement("div");
  hand.className = "tuto";
  hand.setAttribute("aria-hidden", "true");
  hand.innerHTML = '<span class="tuto__ring"></span><svg class="tuto__hand" viewBox="0 -2 54 66"><path d="M17 5a5 5 0 0 1 10 0v19.5l1.6-.3a5 5 0 0 1 6 3.3l.4-.1a5 5 0 0 1 6.2 3.5l.5-.1a5 5 0 0 1 6 4.9V46c0 7.7-6.3 14-14 14h-6.4c-4 0-7.8-1.8-10.3-5L3.6 44.6a5 5 0 0 1 7.3-6.8L17 43.4V5Z"/></svg>';
  const bubble = document.createElement("div");
  bubble.className = "tuto__bubble";
  bubble.setAttribute("role", "status");
  bubble.innerHTML = '<p class="tuto__txt"></p><button type="button" class="tuto__x" aria-label="Ocultar la guía">×</button>';
  document.body.append(hand, bubble);
  const tTxt = $(".tuto__txt", bubble);

  const dockH = () => parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--dock-h")) || 0;
  const inView = (el) => {
    if (!el || el.hidden || !el.offsetParent) return false;
    const r = el.getBoundingClientRect();
    return r.width > 0 && r.top >= 64 && r.bottom <= innerHeight - dockH() - 8;
  };
  const visibleBtn = (sel) => $$(sel).find(inView);
  const shown = (el) => !!(el && !el.hidden && el.offsetParent); // existe y no está escondido (aunque esté fuera de la pantalla)
  const FIELD_TXT = { fecha: "Escribe la <b>fecha</b> 📅", lugar: "Escribe la <b>zona</b> 📍" };

  // Qué hay que tocar ahora: [elemento, texto]
  const target = () => {
    if (document.querySelector("dialog[open]")) return null;
    const hb = $("#heroBtn");
    if (hb && inView(hb)) return [hb, "<b>Empieza aquí</b> 👆"];
    // Páginas sin cotizador: el "Elegir" de cualquier paquete lleva a cotizar
    if (!wiz || !C) {
      const el = visibleBtn("a[data-pack]") || $("a[data-pack]");
      return [el, "Toca <b>Elegir</b> para cotizar"];
    }
    const st = C.state();
    if (st.step === 1) {
      if (st.pack) return [visibleBtn("#wizBarGo, [data-step=\"1\"] .is-sel [data-pick]") || $("#wizBarGo"), "Ahora toca <b>Continuar</b>"];
      const rec = (S.paquetes || {}).recomendado;
      const el = visibleBtn("[data-step=\"1\"] [data-pick]") || $(".pack--pick[data-pid=\"" + rec + "\"] [data-pick]") || $(".pack--pick [data-pick]");
      return [el, "<b>1 de 3:</b> elige tu paquete"];
    }
    if (st.step === 2) {
      const el = visibleBtn("[data-step=\"2\"] .wiz__nav .btn--main") || visibleBtn("#wizBarGo") || $("[data-step=\"2\"] .wiz__nav .btn--main");
      return [el, "<b>2 de 3:</b> agrega extras o <b>Continuar</b>"];
    }
    if (st.step === 3) {
      const form = $("#wizForm");
      const k = ["fecha", "lugar"].find((x) => !String((st.f || {})[x] || "").trim());
      if (k) return [form && form.elements[k], "<b>3 de 3:</b> " + FIELD_TXT[k]];
      return [$("#wizSend"), "<b>¡Listo!</b> Toca para enviar 📲"];
    }
    return null;
  };

  /* Modo discreto:
     - Aparece 2.5 s después de abrir la página y solo cuando el cliente deja de moverse (1.5 s quieto).
     - Mientras desliza, toca o escribe, se esconde.
     - El globo se muestra 4 s cada vez que cambia la instrucción y luego se encoge: queda solo la mano. */
  const START = Date.now(), IDLE_MS = 1500, BUBBLE_MS = 4000;
  let lastAct = 0, textSince = 0;
  ["scroll", "wheel", "touchstart", "pointerdown", "keydown"].forEach((ev) => addEventListener(ev, () => (lastAct = Date.now()), { passive: true, capture: true }));
  let lastEl = null, lastTxt = "", swipeTo = null;
  const hide = () => { hand.classList.remove("is-on"); bubble.classList.remove("is-on"); if (lastEl) lastEl.classList.remove("tuto-on"); lastEl = null; swipeTo = null; };
  const setText = (s) => { if (s !== lastTxt) { tTxt.innerHTML = s; lastTxt = s; textSince = Date.now(); } };
  const place = () => {
    const now = Date.now();
    if (now - START < 2500 || now - lastAct < IDLE_MS) return hide();
    bubble.classList.toggle("is-mini", textSince && now - textSince > BUBBLE_MS);
    const t = tutoOn ? target() : null;
    const el = t && t[0];
    if (!shown(el)) return hide();
    // Lo que hay que tocar no se ve: la mano enseña a deslizar hacia donde está
    if (!inView(el)) {
      const a = area();
      if (!a || a.getBoundingClientRect().bottom < 80) return hide(); // ya lo pasó: no estorbar
      if (lastEl) { lastEl.classList.remove("tuto-on"); lastEl = null; }
      const down = el.getBoundingClientRect().top > 64;
      swipeTo = el;
      setText(down ? "Desliza 👇" : "Sube 👆");
      const hx = innerWidth / 2, hy = innerHeight - dockH() - 110;
      hand.classList.add("is-swipe");
      hand.classList.toggle("is-up", !down);
      hand.style.transform = "translate(" + Math.round(hx - 16) + "px," + Math.round(hy) + "px)";
      bubble.style.width = "auto";
      const bw = bubble.offsetWidth || 120, bh = bubble.offsetHeight || 40;
      bubble.style.transform = "translate(" + Math.round((innerWidth - bw) / 2) + "px," + Math.round(hy - bh - 12) + "px)";
      bubble.classList.remove("is-below");
      bubble.classList.add("is-swipe");
      bubble.style.setProperty("--tip", Math.round(bw / 2) + "px");
      hand.classList.add("is-on"); bubble.classList.add("is-on");
      return;
    }
    swipeTo = null;
    hand.classList.remove("is-swipe", "is-up");
    bubble.classList.remove("is-swipe");
    if (lastEl && lastEl !== el) lastEl.classList.remove("tuto-on");
    if (el !== lastEl) el.classList.add("tuto-on");
    lastEl = el;
    setText(t[1]);
    const r = el.getBoundingClientRect();
    const isField = /^(INPUT|SELECT|TEXTAREA)$/.test(el.tagName);
    // La punta del dedo cae sobre el botón (en los campos, a la derecha para no tapar lo que se escribe)
    const x = isField ? r.right - 34 : r.left + r.width / 2;
    const y = r.top + r.height * 0.55;
    hand.style.transform = "translate(" + Math.round(x - 16) + "px," + Math.round(y) + "px)";
    // El globo va arriba del botón si hay espacio; si no, abajo
    bubble.style.width = "auto";
    const bw = Math.min(bubble.offsetWidth || 200, innerWidth - 24);
    const bh = bubble.offsetHeight || 44;
    const above = r.top - bh - 14 > 70;
    const bx = Math.max(12, Math.min(innerWidth - bw - 12, r.left + r.width / 2 - bw / 2));
    const by = above ? r.top - bh - 14 : r.bottom + 62;
    bubble.style.transform = "translate(" + Math.round(bx) + "px," + Math.round(Math.min(by, innerHeight - bh - 8)) + "px)";
    bubble.classList.toggle("is-below", !above);
    bubble.style.setProperty("--tip", Math.round(Math.max(18, Math.min(bw - 18, r.left + r.width / 2 - bx))) + "px");
    hand.classList.add("is-on");
    bubble.classList.add("is-on");
  };
  let raf = 0;
  const loop = () => { place(); raf = tutoOn && !document.hidden ? requestAnimationFrame(loop) : 0; };
  const startTuto = () => { if (!raf) raf = requestAnimationFrame(loop); };
  const setTuto = (on) => {
    tutoOn = on;
    if (tutoBtn) tutoBtn.hidden = on;
    if (on) startTuto(); else place();
  };
  $(".tuto__x", bubble).addEventListener("click", (e) => { e.stopPropagation(); setTuto(false); });
  // Tocar el globo cuando dice "desliza" lleva directo a donde hay que tocar
  bubble.addEventListener("click", () => { if (swipeTo) swipeTo.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "center" }); });
  if (tutoBtn) {
    tutoBtn.hidden = true;
    tutoBtn.addEventListener("click", () => { setTuto(true); if (C) C.go(1); }); // la guía empieza desde el paso 1
  }
  document.addEventListener("visibilitychange", () => { if (!document.hidden && tutoOn) startTuto(); });
  // Al enviar la cotización, la guía termina
  const send = $("#wizSend"), done = $("#wizDone");
  if (send && done) send.addEventListener("click", () => setTimeout(() => { if (!done.hidden) setTuto(false); }, 50));
  startTuto();
})();
