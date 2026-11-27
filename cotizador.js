/* ===== Mendoza Sonido y DJ: cotizador en 3 pasos =====
   1. Elige tu paquete  2. Complementa tu evento  3. Datos del evento y envío por WhatsApp.
   - Los precios salen del contenido publicado (panel). Nada viene preseleccionado.
   - El precio del paquete cambia según el día; Básico, Plata y Premium no se ofrecen en sábado.
   - Solo pide fecha, zona y nombre (opcional). La barra de snacks se cotiza "desde" su mínimo de personas.
   - Al entrar nada viene elegido (salvo que llegue desde el botón "Elegir" de un paquete).
     La fecha, la zona y el nombre se recuerdan solo durante la visita.
   - Es una cotización estimada: la disponibilidad se confirma por WhatsApp. */
(() => {
  const wiz = document.getElementById("wiz");
  if (!wiz) return;
  const S = window.SITIO || {};
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const money = (n) => "$" + Number(n || 0).toLocaleString("en-US");
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const WHATSAPP = String((S.negocio || {}).whatsapp || "527776242702").replace(/\D/g, "");
  const KEY = "mendoza-cotizacion";
  const DAYS = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];
  const split = (s) => String(s || "").split("|").map((x) => x.trim().toLowerCase()).filter(Boolean);

  /* ---------- Paquetes disponibles ---------- */
  const P = {};
  ((S.paquetes || {}).lista || []).forEach((p) => {
    P[p.id] = { id: p.id, name: (p.nombre || "") + (p.resaltado ? " " + p.resaltado : ""), sab: +p.sabado || 0, sem: +p.semana || 0, fijo: +p.fijo || 0, cap: +p.personas || 0 };
  });
  const K = S.infantil || {};
  if (K.mostrar !== false && +K.precio) P.infantil = { id: "infantil", name: K.resaltado || K.titulo || "Infantil", fijo: +K.precio, cap: 0 };

  /* ---------- Estado ---------- */
  let st = { pack: "", sel: [], step: 1, f: {}, h: {} }; // h = respuestas del asistente (invitados y día)
  try {
    // Se guarda solo durante la visita (sessionStorage); se borra lo que guardaban versiones anteriores
    localStorage.removeItem(KEY);
    const saved = JSON.parse(sessionStorage.getItem(KEY) || "null");
    if (saved && typeof saved === "object") st = Object.assign(st, saved);
  } catch (e) { /* sin almacenamiento */ }
  if (!P[st.pack]) st.pack = "";
  const known = new Set($$(".qopt, .qchip", wiz).map((x) => x.dataset.key));
  st.sel = (Array.isArray(st.sel) ? st.sel : []).filter((k) => known.has(k));
  st.f = st.f && typeof st.f === "object" ? st.f : {};
  st.h = st.h && typeof st.h === "object" ? st.h : {};
  ["invitados", "tipo", "telefono"].forEach((k) => delete st.f[k]); // campos que ya no se piden
  const CZ = S.cotizacion || {};
  const save = () => { try { sessionStorage.setItem(KEY, JSON.stringify(st)); } catch (e) { /* sin espacio */ } };
  // Llegó desde otra página con un paquete elegido (cotizar?paquete=p-oro): se selecciona y pasa al paso 2
  const fromLink = new URLSearchParams(location.search).get("paquete");
  // Al entrar a Cotizar nada viene elegido: el cliente escoge su paquete y sus extras.
  // (Solo se recuerdan la fecha, la zona y el nombre durante la visita.)
  st.pack = ""; st.sel = []; st.step = 1;
  if (fromLink && P[fromLink]) {
    st.pack = fromLink;
    st.step = 2;
    try { history.replaceState(null, "", location.pathname + location.hash); } catch (e) { /* sin historial */ }
  }

  /* ---------- Precios ---------- */
  const dayOf = (d) => (/^\d{4}-\d{2}-\d{2}$/.test(d || "") ? new Date(d + "T12:00:00").getDay() : -1);
  // Día del evento: la fecha del paso 3; si aún no hay, lo que contestó en el asistente
  const eventDay = () => { const d = dayOf(st.f.fecha); return d >= 0 ? d : st.h.dia === "sab" ? 6 : st.h.dia === "sem" ? 1 : -1; };
  const packPrice = (p) => {
    if (!p) return { n: 0 };
    if (p.fijo) return { n: p.fijo, label: "" };
    if (p.sab && p.sab === p.sem) return { n: p.sab, label: "" }; // mismo precio cualquier día
    const day = eventDay();
    if (day === 6) return p.sab ? { n: p.sab, label: "sábado" } : { n: 0, blocked: true };
    if (day >= 0) return { n: p.sem || p.sab, label: "domingo a viernes" };
    const both = [p.sab, p.sem].filter(Boolean);
    return { n: Math.min(...both), desde: both.length > 1 && p.sab !== p.sem, label: p.sab ? "" : "domingo a viernes" };
  };
  const guests = () => Math.max(0, parseInt(st.f.invitados, 10) || 0);
  const itemPrice = (el) => {
    const base = +el.dataset.price || 0;
    if (!base) return { n: 0, tbd: true };
    if (el.dataset.per !== "1") return { n: base };
    const min = +el.dataset.min || 0, g = guests();
    const people = Math.max(g, min);
    if (!people) return { n: 0, tbd: true, unit: base };
    const promo = +el.dataset.promo || 0, from = +el.dataset.promoFrom || 0;
    const unit = promo && from && people >= from ? promo : base;
    return { n: unit * people, unit, people, desde: !g };
  };

  /* ---------- Qué se ofrece con el paquete elegido ---------- */
  const allowed = (el) => {
    const name = st.pack ? P[st.pack].name.toLowerCase() : "";
    const solo = split(el.dataset.solo), no = split(el.dataset.noen);
    if (solo.length && !solo.includes(name)) return false;
    if (name && no.includes(name)) return false;
    return true;
  };
  const items = () => $$(".qopt, .qchip", wiz);
  const chosen = () => items().filter((el) => st.sel.includes(el.dataset.key) && allowed(el));

  /* ---------- Dibujar ---------- */
  const panels = $$(".wiz__panel", wiz), stepBtns = $$(".wiz__steps [data-go]", wiz);
  const bar = $("#wizBar"), barItems = $("#wizBarItems"), barTotal = $("#wizBarTotal"), barGo = $("#wizBarGo");
  const form = $("#wizForm"), send = $("#wizSend"), err = $("#wizErr"), warn = $("#wizWarn"), sum = $("#wizSum");

  const totals = () => {
    const p = P[st.pack], pp = packPrice(p);
    let total = pp.n || 0, desde = !!pp.desde;
    const lines = [], tbd = [];
    chosen().forEach((el) => {
      const ip = itemPrice(el), name = el.dataset.name;
      if (ip.tbd) { tbd.push(name); return; }
      total += ip.n;
      if (ip.desde) desde = true;
      lines.push({ name, n: ip.n, desde: !!ip.desde, detail: ip.people ? (ip.desde ? money(ip.unit) + " por persona, mínimo " + ip.people : ip.people + " personas × " + money(ip.unit)) : "", chip: el.classList.contains("qchip") });
    });
    return { p, pp, total, desde, lines, tbd };
  };

  const render = () => {
    const t = totals(), p = t.p;
    // Selección visible
    $$(".pack--pick, .mpick, .kidpick", wiz).forEach((c) => {
      const id = c.dataset.pid || "infantil", on = id === st.pack;
      c.classList.toggle("is-sel", on);
      const b = $("[data-pick]", c);
      if (b) b.innerHTML = on ? "Elegido ✓" : 'Elegir <span class="arrow">→</span>';
    });
    $$(".packs .pack:not(.pack--pick)").forEach((c) => c.classList.toggle("is-sel", c.id === st.pack));
    items().forEach((el) => {
      const ok = allowed(el), on = ok && st.sel.includes(el.dataset.key);
      el.hidden = !ok;
      el.classList.toggle("is-on", on);
      const btn = el.classList.contains("qchip") ? el : $(".qadd", el);
      if (btn) btn.setAttribute("aria-pressed", String(on));
      // Barra de snacks: muestra el cálculo con los invitados
      if (el.dataset.per === "1") {
        const ip = itemPrice(el), slot = $(".qopt__calc", el) || el.querySelector(".qopt__body").appendChild(Object.assign(document.createElement("p"), { className: "qopt__calc" }));
        slot.textContent = ip.people ? (guests() ? "Para " + ip.people + " personas: " : "Desde ") + money(ip.n) : "";
      }
    });
    $("#wizNoPack").hidden = !!st.pack;
    // Guía del paso actual
    const guide = $("#wizGuide");
    if (guide) { guide.textContent = CZ["guia" + st.step] || ""; guide.hidden = !guide.textContent; }
    renderHelper();
    // Pasos
    panels.forEach((x) => (x.hidden = +x.dataset.step !== st.step));
    stepBtns.forEach((b) => { if (+b.dataset.go === st.step) b.setAttribute("aria-current", "step"); else b.removeAttribute("aria-current"); });
    $("#wizPackName").textContent = p ? p.name : "";
    const n = chosen().length;
    $("#wizExtrasN").textContent = n ? n + (n === 1 ? " elegido" : " elegidos") : "";
    // Barra con el total
    // (en el paso 3 el resumen completo ya está en pantalla)
    bar.hidden = !p || st.step === 3;
    if (p) {
      barItems.textContent = p.name + (n ? " + " + n + (n === 1 ? " extra" : " extras") : "") + " · total estimado";
      barTotal.textContent = t.pp.blocked ? "No disponible en sábado" : (t.desde ? "Desde " : "") + money(t.total);
      barGo.innerHTML = 'Continuar <span class="arrow">→</span>';
    }
    // Barra inferior del celular
    const dn = $("#dockN");
    if (dn) { const c = (p ? 1 : 0) + n; dn.hidden = !c; dn.textContent = c; }
    // Formulario y resumen (paso 3)
    if (form) ["fecha", "lugar", "nombre"].forEach((k) => { const i = form.elements[k]; if (i && document.activeElement !== i && i.value !== (st.f[k] || "")) i.value = st.f[k] || ""; });
    renderSummary(t);
    save();
  };

  const renderSummary = (t) => {
    const p = t.p, rows = [];
    if (p) rows.push(["Paquete " + p.name + (t.pp.label ? " (" + t.pp.label + ")" : ""), t.pp.blocked ? "No disponible" : (t.pp.desde ? "Desde " : "") + money(t.pp.n)]);
    t.lines.forEach((l) => rows.push([l.name + (l.detail ? " · " + l.detail : ""), (l.desde ? "Desde " : "") + money(l.n)]));
    t.tbd.forEach((name) => rows.push([name, "Por confirmar"]));
    sum.innerHTML = p
      ? '<h4>Tu selección</h4><ul>' + rows.map(([a, b]) => "<li><span>" + window.MZ.esc(a) + "</span><b>" + b + "</b></li>").join("") + "</ul>" +
        '<p class="wsum__total"><span>' + (t.desde ? "Total estimado desde" : "Total estimado") + "</span><b>" + money(t.total) + "</b></p>" +
        (t.tbd.length ? '<p class="wsum__tbd">Lo que dice "Por confirmar" no se suma: te pasamos su precio por WhatsApp.</p>' : "")
      : '<p class="wsum__empty">Todavía no eliges paquete. <button type="button" class="tbtn" data-go="1">Elegir paquete</button></p>';
    // Avisos según fecha e invitados
    const msgs = [];
    if (p && t.pp.blocked) msgs.push("El Paquete " + p.name + " no se renta en sábado. " + (st.f.fecha ? "Elige otra fecha u otro paquete." : "Si tu evento es en sábado, elige otro paquete."));
    const g = guests();
    if (p && p.cap && g > p.cap) {
      const better = Object.values(P).filter((x) => x.cap >= g).map((x) => x.name);
      msgs.push("El Paquete " + p.name + " es para " + p.cap + " personas" + (better.length ? ". Para " + g + " invitados te conviene: " + better.join(", ") + "." : ". Escríbenos y te armamos uno a tu medida."));
    }
    warn.hidden = !msgs.length;
    warn.textContent = msgs.join(" ");
  };

  /* ---------- Asistente: 2 preguntas y una recomendación ---------- */
  const helpRes = $("#helpRes");
  const priceFor = (p, dia) => (p.fijo ? p.fijo : p.sab && p.sab === p.sem ? p.sab : dia === "sab" ? p.sab : dia === "sem" ? p.sem || p.sab : Math.min(...[p.sab, p.sem].filter(Boolean)));
  const renderHelper = () => {
    if (!helpRes) return;
    $$("#helper [data-q]").forEach((g) => $$("button", g).forEach((b) => b.setAttribute("aria-pressed", String(st.h[g.dataset.q] === b.dataset.v))));
    const inv = +st.h.inv || 0, dia = st.h.dia || "";
    if (!inv) { helpRes.innerHTML = ""; return; }
    const esc = window.MZ.esc;
    if (inv > 180) {
      const wa = "https://wa.me/" + WHATSAPP + "?text=" + encodeURIComponent("Hola, mi evento es para más de 180 invitados" + (dia === "sab" ? " en sábado" : dia === "sem" ? " entre semana" : "") + ". ¿Qué paquete me recomiendan?");
      helpRes.innerHTML = "<p>Para más de 180 invitados te armamos un paquete a tu medida.</p>" + '<a class="btn btn--wa btn--sm" href="' + wa + '" target="_blank" rel="noopener">Pedir recomendación por WhatsApp</a>';
      return;
    }
    const fits = Object.values(P).filter((p) => p.id !== "infantil" && p.cap >= inv && !(dia === "sab" && !p.fijo && !p.sab));
    fits.sort((a, b) => priceFor(a, dia) - priceFor(b, dia) || a.cap - b.cap);
    const rec = (S.paquetes || {}).recomendado;
    const list = fits.slice(0, 1);
    const recP = fits.find((p) => p.id === rec);
    if (recP && !list.includes(recP)) list.push(recP);
    if (!list.length) { helpRes.innerHTML = "<p>No encontramos un paquete con eso. Escríbenos y te ayudamos.</p>"; return; }
    helpRes.innerHTML = "<p>" + (list.length > 1 ? "Te conviene alguno de estos:" : "Te conviene este:") + "</p>" + list.map((p, i) =>
      '<div class="helper__pick"><div><b>' + esc(p.name) + "</b><span>Hasta " + p.cap + " personas · " + (dia === "nose" || !dia ? (p.sab && p.sem && p.sab !== p.sem ? "desde " : "") : "") + money(priceFor(p, dia)) +
      (i === 0 && list.length > 1 ? " · el más económico" : p.id === rec ? " · el más completo" : "") + "</span></div>" +
      '<div class="helper__act"><button type="button" class="tbtn" data-pview="' + esc(p.id) + '">Detalles</button><button type="button" class="btn btn--pack btn--sm" data-pick="' + esc(p.id) + '">Elegir</button></div></div>').join("");
    $$(".helper__pick", helpRes).forEach((row, i) => { const p = list[i]; row.style.setProperty("--pc", ($("[data-pid=\"" + p.id + "\"]") || $("#" + p.id) || document.body).style.getPropertyValue("--pc") || "var(--blue)"); });
  };

  /* ---------- Navegación entre pasos ---------- */
  const scrollToWiz = () => {
    const top = wiz.getBoundingClientRect().top;
    if (top < 0 || top > innerHeight * 0.4) wiz.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
  };
  const go = (n, quiet) => {
    st.step = Math.max(1, Math.min(3, n));
    err.textContent = "";
    render();
    if (!quiet) scrollToWiz();
  };
  const select = (id) => {
    if (!P[id]) return;
    st.pack = id;
    go(2);
  };
  const verTodos = (open) => {
    const box = $("#todos"), btn = $("#verTodos");
    const show = open === undefined ? box.hidden : open;
    box.hidden = !show;
    btn.setAttribute("aria-expanded", String(show));
    btn.querySelector(".arrow").textContent = show ? "↑" : "↓";
    if (show) box.querySelectorAll(".rv:not(.is-in)").forEach((x) => x.classList.add("is-in"));
  };

  /* ---------- Envío por WhatsApp ---------- */
  const validate = () => {
    const t = totals();
    if (!t.p) return { msg: "Elige un paquete para continuar.", step: 1 };
    if (t.pp.blocked) return { msg: "El paquete elegido no se renta en sábado: cambia la fecha o el paquete.", field: "fecha" };
    if (!st.f.fecha) return { msg: "Escribe la fecha de tu evento.", field: "fecha" };
    if (!String(st.f.lugar || "").trim()) return { msg: "Escribe la zona o colonia de tu evento.", field: "lugar" };
    return null;
  };
  const message = () => {
    const t = totals(), f = st.f, day = dayOf(f.fecha), L = [];
    L.push("Hola, quiero cotizar mi evento con Mendoza Sonido y DJ.");
    if (f.nombre) L.push("Nombre: " + f.nombre.trim());
    L.push("Paquete: " + t.p.name + " (" + money(t.pp.n) + (t.pp.label ? ", " + t.pp.label : "") + ")");
    const extras = t.lines.filter((l) => !l.chip).map((l) => l.name + (l.detail ? " (" + l.detail + (l.desde ? ": desde " : " = ") + money(l.n) + ")" : " (" + money(l.n) + ")"));
    const small = t.lines.filter((l) => l.chip).map((l) => l.name + " (" + money(l.n) + ")");
    const tbd = t.tbd.map((x) => x + " (precio por confirmar)");
    if (extras.length) L.push("Adicionales: " + extras.join("; "));
    if (small.length || tbd.length) L.push("Extras: " + small.concat(tbd).join("; "));
    L.push("Total estimado: " + (t.desde ? "desde " : "") + money(t.total));
    if (f.fecha) L.push("Fecha: " + (day >= 0 ? DAYS[day] + " " : "") + f.fecha.split("-").reverse().join("/"));
    if (f.lugar) L.push("Zona: " + f.lugar.trim());
    L.push("¿Tienen disponible esa fecha?");
    return L.join("\n");
  };
  send.addEventListener("click", (e) => {
    const bad = validate();
    if (bad) {
      e.preventDefault();
      if (bad.step) { go(bad.step); return; }
      err.textContent = bad.msg;
      const i = form.elements[bad.field];
      if (i) i.focus();
      return;
    }
    send.href = "https://wa.me/" + WHATSAPP + "?text=" + encodeURIComponent(message());
    const done = $("#wizDone");
    if (done) {
      done.innerHTML = "<b>¡Listo! Se abrió WhatsApp con tu cotización.</b> Solo toca enviar y te respondemos con la disponibilidad de tu fecha. " +
        '¿No se abrió? <a href="' + send.href + '" target="_blank" rel="noopener">Toca aquí</a>.';
      done.hidden = false;
    }
  });

  /* ---------- Eventos ---------- */
  document.addEventListener("click", (e) => {
    const t = e.target.closest ? e.target : null;
    if (!t) return;
    const goBtn = t.closest("[data-go]");
    if (goBtn && wiz.contains(goBtn)) { go(+goBtn.dataset.go); return; }
    const pick = t.closest("[data-pick]");
    if (pick) { select(pick.dataset.pick); return; }
    const pv = t.closest("[data-pview]");
    if (pv) { const real = document.getElementById(pv.dataset.pview); const b = real && real.querySelector("[data-view]"); if (b) b.click(); return; }
    // "Elegir" en la lista completa, en la ventana de detalles o en la sección Infantil
    const pack = t.closest("a[data-pack]");
    if (pack) {
      e.preventDefault();
      e.stopPropagation();
      const card = pack.closest(".pack");
      const dlg = pack.closest("dialog");
      if (dlg && dlg.open) dlg.close();
      select(card && card.id ? card.id : "infantil");
      return;
    }
    const add = t.closest(".qadd, .qchip");
    if (add && wiz.contains(add)) {
      const item = add.classList.contains("qchip") ? add : add.closest(".qopt");
      const key = item.dataset.key, on = st.sel.includes(key);
      st.sel = st.sel.filter((k) => k !== key);
      if (!on) {
        // Opciones del mismo grupo (ej. batucada sencilla o doble): solo una
        const g = item.dataset.group;
        if (g) st.sel = st.sel.filter((k) => { const o = items().find((x) => x.dataset.key === k); return !o || o.dataset.group !== g; });
        st.sel.push(key);
      }
      render();
      return;
    }
    const hb = t.closest("#helper [data-v]");
    if (hb) { const q = hb.parentElement.dataset.q; st.h[q] = st.h[q] === hb.dataset.v ? "" : hb.dataset.v; render(); return; }
    if (t.closest("#verTodos")) { verTodos(); return; }
    if (t.closest("#wizBarGo")) { go(st.step + 1); return; }
    const dock = t.closest("#dockQuote");
    if (dock) { e.preventDefault(); go(st.pack ? Math.max(st.step, 2) : 1); }
  }, true);

  // ("Quiero este paquete" en la ventana de detalles hace clic en el "Elegir" del paquete: lo atrapa el código de arriba)

  if (form) {
    form.addEventListener("input", (e) => {
      const i = e.target;
      if (!i.name) return;
      st.f[i.name] = i.value;
      err.textContent = "";
      render();
    });
    form.addEventListener("submit", (e) => e.preventDefault());
  }

  // Para el buscador y otras partes de la página
  window.Cotizador = {
    go, select, verTodos,
    state: () => st,
    reveal(el) {
      if (!el || !el.closest) return;
      const box = el.closest("#todos");
      if (box && box.hidden) verTodos(true);
      const panel = el.closest(".wiz__panel");
      if (panel && panel.hidden) go(+panel.dataset.step, true);
    },
  };

  render();

  if (fromLink && P[fromLink]) setTimeout(() => scrollToWiz(), 150);
  // (La manita de ayuda está en guia.js)
})();
