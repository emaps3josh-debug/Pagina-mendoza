/* ===== Mendoza Sonido y DJ: comportamiento de las páginas =====
   El contenido (textos, precios, fotos, videos) viene de contenido.js / Firebase y lo dibuja render.js.
   Aquí está el comportamiento común a todas las páginas: menú, filtros, galería, ventanas y buscador.
   Cada página dice cuál es en <body data-page="...">. Todo está protegido para que funcione
   aunque una página no tenga alguna sección. */

const SITIO = window.SITIO || {};
// El número de WhatsApp se cambia en el panel (Datos del negocio)
const WHATSAPP = String((SITIO.negocio || {}).whatsapp || "527776242702").replace(/\D/g, "");
// Direcciones de cada página (Vercel quita el .html gracias a vercel.json)
const PAGES = {
  inicio: "/", paquetes: "/paquetes", cotizar: "/cotizar", infantil: "/fiestas-infantiles",
  adicionales: "/servicios-adicionales", galeria: "/galeria", apartar: "/como-apartar", preguntas: "/preguntas-frecuentes",
};
const PAGE = document.body.dataset.page || "inicio";

const $ = (s, el = document) => (el ? el.querySelector(s) : null);
const $$ = (s, el = document) => (el ? [...el.querySelectorAll(s)] : []);
const on = (el, ev, fn, opt) => { if (el) el.addEventListener(ev, fn, opt); };
const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
const waLink = (text) => "https://wa.me/" + WHATSAPP + "?text=" + encodeURIComponent(text);
const money = (n) => "$" + Number(n || 0).toLocaleString("en-US");
const digits = (el) => (el ? +el.textContent.replace(/\D/g, "") : 0);

/* ---------- Enlaces de WhatsApp con mensaje listo ---------- */
$$("[data-wa]").forEach((a) => {
  a.href = waLink(a.dataset.wa);
  a.target = "_blank";
  a.rel = "noopener";
});

/* ---------- Menú ---------- */
const nav = $("#nav"), toggle = $("#navToggle"), links = $("#navLinks");
const setMenu = (open) => {
  if (!links || !toggle) return;
  links.classList.toggle("is-open", open);
  toggle.classList.toggle("is-open", open);
  toggle.setAttribute("aria-expanded", open);
  toggle.setAttribute("aria-label", open ? "Cerrar menú" : "Abrir menú");
};
on(toggle, "click", () => setMenu(!links.classList.contains("is-open")));
$$("a", links).forEach((a) => a.addEventListener("click", () => setMenu(false)));
$$("#dock a").forEach((a) => a.addEventListener("click", () => setMenu(false)));
// Página actual marcada en el menú y en la barra inferior
$$("[data-page-link]").forEach((a) => {
  const cur = a.dataset.pageLink === PAGE;
  a.classList.toggle("is-current", cur);
  if (cur) a.setAttribute("aria-current", "page");
});

/* ---------- Barra de progreso y menú sólido ---------- */
const progress = $("#progress");
const onScroll = () => {
  const max = document.documentElement.scrollHeight - innerHeight;
  if (progress) progress.style.transform = "scaleX(" + (max > 0 ? scrollY / max : 0) + ")";
  if (nav) nav.classList.toggle("is-solid", scrollY > 20);
};
onScroll();
addEventListener("scroll", onScroll, { passive: true });

/* ---------- Aparición al hacer scroll (solo lo que está fuera de pantalla) ---------- */
if ("IntersectionObserver" in window && !reduceMotion) {
  const io = new IntersectionObserver(
    (es) => es.forEach((e) => {
      if (e.isIntersecting) { e.target.classList.add("is-in"); io.unobserve(e.target); }
    }),
    { threshold: 0.06, rootMargin: "0px 0px -6% 0px" }
  );
  const groups = [".head", ".incl", ".finder", ".pgroup__head", ".pack", ".compare", ".pvideos", ".reviews", ".kids__photo", ".kids__body",
    ".extra", ".g", ".v", ".steps li", ".faq details", ".cta__box", ".wiz__steps", ".kidpick", ".hub a"];
  $$(groups.join(",")).forEach((el) => {
    if (el.getBoundingClientRect().top < innerHeight * 0.95) return; // ya visible: no se oculta
    const sibs = [...el.parentElement.children];
    el.style.setProperty("--d", Math.min(sibs.indexOf(el), 5) * 60 + "ms");
    el.classList.add("rv");
    io.observe(el);
  });
  // Respaldo: si algo falla, todo queda visible
  setTimeout(() => $$(".rv:not(.is-in)").forEach((el) => {
    if (el.getBoundingClientRect().top < innerHeight) el.classList.add("is-in");
  }), 2500);
}

/* Lleva la vista a un elemento y lo resalta un momento */
const flash = (el, instant) => {
  if (!el) return;
  if (window.Cotizador) window.Cotizador.reveal(el); // abre el paso o la lista donde está
  el.classList.add("is-in");
  el.scrollIntoView({ behavior: reduceMotion || instant ? "auto" : "smooth", block: "center" });
  el.classList.remove("is-found");
  void el.offsetWidth; // reinicia la animación
  el.classList.add("is-found");
  setTimeout(() => el.classList.remove("is-found"), 2600);
};

/* ---------- Paquetes: precios y filtros (páginas Paquetes y Cotizar) ----------
   Los precios y las personas se leen de las tarjetas que dibuja render.js:
   <b data-p="sab"> sábado, <b data-p="sem"> domingo a viernes, <b data-p="fijo"> un solo precio. */
// (las tarjetas del paso 1 del cotizador, .pack--pick, son copias: no cuentan aquí)
const PACKS = $$(".pack:not(.pack--pick)").map((card) => ({
  card,
  name: $("h4", card).textContent.trim(),
  cap: digits($(".pack__cap", card)),
  sab: digits($('[data-p="sab"]', card)),
  sem: digits($('[data-p="sem"]', card)),
  fijo: digits($('[data-p="fijo"]', card)),
  tags: (card.dataset.tags || "").split(" ").filter(Boolean),
}));

// Precio que se muestra en la tarjeta según el día elegido ("sab", "sem" o "" sin elegir)
const drawCost = (p, day) => {
  let n, when, alt = "", no = false;
  if (p.fijo) { n = p.fijo; when = "5 hrs + 2 de regalo · 7 horas"; }
  else if (!p.sab) { n = p.sem; when = "Domingo a viernes · 7 horas"; alt = "No disponible en sábado"; no = true; }
  else if (day === "sem") { n = p.sem; when = "Domingo a viernes · 7 horas"; alt = "En sábado <b>" + money(p.sab) + "</b>"; }
  else { n = p.sab; when = "Sábado · 7 horas"; alt = "Domingo a viernes <b>" + money(p.sem) + "</b>"; }
  $(".pack__cost", p.card).innerHTML =
    '<p class="pack__price"><sup>$</sup>' + n.toLocaleString("en-US") + "<small>" + when + "</small></p>" +
    (alt ? '<p class="pack__alt' + (no ? " pack__alt--no" : "") + '">' + alt + "</p>" : "");
};

const finder = $("#finder");
const fInputs = $$("input", finder);
const fValue = (name) => (fInputs.find((i) => i.name === name && i.checked) || {}).value || "";
const INC_NAMES = { pantalla: "pantalla", sub: "subwoofer", shots: "carrito de shots", show: "show o botarga", palomitas: "palomitas" };
const joinList = (a) => (a.length > 1 ? a.slice(0, -1).join(", ") + " y " + a[a.length - 1] : a[0] || "");
const setText = (sel, t) => { const e = $(sel); if (e) e.textContent = t; };

const applyFilter = () => {
  if (!finder) return;
  const inv = +fValue("inv") || 0, day = fValue("dia");
  const wants = fInputs.filter((i) => i.name === "inc" && i.checked).map((i) => i.value);
  const active = !!(inv || day || wants.length);
  const shown = [], noSat = [];
  const inList = PACKS.filter((p) => p.card.closest("#grupos")); // solo la lista completa
  inList.forEach((p) => {
    const okCap = !inv || p.cap >= inv;
    const okInc = wants.every((t) => p.tags.includes(t));
    const okDay = !(day === "sab" && !p.sab && !p.fijo);
    if (okCap && okInc && !okDay) noSat.push(p.name);
    const ok = okCap && okInc && okDay;
    p.card.hidden = !ok;
    if (active) p.card.classList.add("is-in");
    drawCost(p, day);
    if (ok) shown.push(p);
  });
  // "A la medida": los paquetes cuya capacidad queda más justa para los invitados
  const best = inv && shown.length ? Math.min(...shown.map((p) => p.cap)) : 0;
  const mixed = shown.some((p) => p.cap !== best);
  inList.forEach((p) => p.card.classList.toggle("is-rec", !!best && mixed && !p.card.hidden && p.cap === best));
  $$(".pgroup").forEach((g) => { g.hidden = !$$(".pack", g).some((c) => !c.hidden); });

  const n = shown.length;
  setText("#fCount", (n === 1 ? "1 paquete" : n + " paquetes") + (active ? " para tu evento" : ""));
  const note = [];
  if (!active) note.push("Del más sencillo al más completo.");
  if (day === "sem") note.push("Precios de domingo a viernes.");
  if (day === "sab") note.push("Precios de sábado.");
  if (noSat.length) note.push(joinList(noSat) + (noSat.length > 1 ? " solo se rentan" : " solo se renta") + " de domingo a viernes.");
  setText("#fNote", note.join(" "));
  const reset = $("#fReset"), empty = $("#fEmpty"), ask = $("#fAsk");
  if (reset) reset.hidden = !active;
  if (empty) empty.hidden = n > 0;
  if (!n && ask) {
    const want = [];
    if (inv) want.push("para " + (inv === 100 ? "hasta 100" : inv === 150 ? "unas 150" : "unas 180") + " personas");
    if (day) want.push(day === "sab" ? "en sábado" : "de domingo a viernes");
    if (wants.length) want.push("con " + joinList(wants.map((w) => INC_NAMES[w] || w)));
    ask.href = waLink("Hola, busco un paquete " + want.join(", ") + ". ¿Qué me recomiendan?");
  }
};
const resetFilter = () => { fInputs.forEach((i) => (i.checked = false)); applyFilter(); };
fInputs.forEach((i) => i.addEventListener("change", () => {
  // Invitados y día: solo una opción a la vez (y se puede desmarcar)
  if (i.name !== "inc" && i.checked) fInputs.forEach((o) => { if (o !== i && o.name === i.name) o.checked = false; });
  applyFilter();
}));
on(finder, "submit", (e) => e.preventDefault());
on($("#fReset"), "click", resetFilter);
applyFilter();

/* ---------- Pestañas de la galería (Fotos / Videos / TikTok) ---------- */
const gtabs = $$("[data-gtab]");
const showGtab = (id) => {
  gtabs.forEach((o) => {
    const cur = o.dataset.gtab === id;
    o.classList.toggle("is-on", cur);
    o.setAttribute("aria-selected", cur);
    const panel = document.getElementById(o.dataset.gtab);
    if (panel) panel.hidden = !cur;
  });
  $$("video").forEach((v) => v.pause());
};
gtabs.forEach((b) => b.addEventListener("click", () => showGtab(b.dataset.gtab)));
// En celular: botón para ver todas las fotos
on($("#gMore"), "click", () => $("#gallery").classList.add("is-all"));

/* ---------- Videos ---------- */
const vids = $$("video"), vrow = $("#videos");
vids.forEach((v) => v.addEventListener("play", () => vids.forEach((o) => o !== v && o.pause())));
const vstep = (dir) => vrow && vrow.scrollBy({ left: dir * vrow.clientWidth * 0.8, behavior: reduceMotion ? "auto" : "smooth" });
on($("#vPrev"), "click", () => vstep(-1));
on($("#vNext"), "click", () => vstep(1));

/* ---------- Videos de YouTube, Instagram y Facebook (se reproducen dentro de la página) ----------
   render.js reconoce el enlace y deja la dirección del reproductor en data-embed. */
const embedFrame = (src, title) => {
  const f = document.createElement("iframe");
  f.src = src;
  f.title = title || "Video";
  f.allow = "autoplay; encrypted-media; picture-in-picture; fullscreen";
  f.allowFullscreen = true;
  return f;
};
$$(".yt[data-embed]").forEach((box) => on($("button", box), "click", () => {
  vids.forEach((o) => o.pause());
  box.replaceChildren(embedFrame(box.dataset.embed, box.dataset.title));
}));

/* ---------- Videos de TikTok (se cargan solo cuando el visitante llega a verlos) ---------- */
if ("IntersectionObserver" in window) {
  let tkBlocked = false;
  document.addEventListener("securitypolicyviolation", (e) => {
    if (!String(e.blockedURI || "").includes("tiktok")) return;
    tkBlocked = true;
    $$(".tk iframe").forEach((f) => f.remove());
  });
  const tko = new IntersectionObserver((es) => es.forEach((e) => {
    if (!e.isIntersecting || tkBlocked) return;
    tko.unobserve(e.target);
    const f = document.createElement("iframe");
    f.src = "https://www.tiktok.com/player/v1/" + e.target.dataset.tk + "?music_info=0&description=0&rel=0";
    f.title = "Video de TikTok de Mendoza Sonido y DJ";
    f.allow = "fullscreen; encrypted-media; picture-in-picture";
    f.allowFullscreen = true;
    f.loading = "lazy";
    e.target.appendChild(f);
  }), { rootMargin: "200px 0px" });
  $$(".tk[data-tk]").forEach((t) => tko.observe(t));
}

/* ---------- Visor de fotos y videos ---------- */
const lb = $("#lightbox"), lbImg = $("#lbImg"), lbVid = $("#lbVid"), lbYt = $("#lbYt");
if (lb && lb.showModal) {
  // Fotos de la galería
  $$("#gallery .g").forEach((g) => g.addEventListener("click", () => {
    lbVid.hidden = true; lbYt.hidden = true; lbImg.hidden = false;
    lbImg.src = g.dataset.full;
    lbImg.alt = $("img", g).alt;
    $("#lbCap").textContent = g.dataset.cap;
    lb.showModal();
  }));
  // Botones "ver video" (personajes, adicionales, paquetes): abren el enlace que tengan en data-vurl
  $$("[data-vurl]").forEach((b) => b.addEventListener("click", () => {
    const url = b.dataset.vurl, info = window.videoInfo ? window.videoInfo(url) : { tipo: "file" };
    if (!info.tipo) return;
    if (info.tipo === "link") { window.open(url, "_blank", "noopener"); return; } // enlace que no se puede incrustar
    vids.forEach((o) => o.pause());
    lbImg.hidden = true;
    $("#lbCap").textContent = b.dataset.cap;
    if (info.embed) { // YouTube, TikTok, Instagram o Facebook
      lbVid.hidden = true; lbYt.hidden = false;
      lbYt.replaceChildren(embedFrame(info.embed, b.dataset.cap));
      lb.showModal();
      return;
    }
    lbYt.hidden = true; lbVid.hidden = false;
    if (b.dataset.poster) lbVid.poster = b.dataset.poster; else lbVid.removeAttribute("poster");
    lbVid.src = url;
    lb.showModal();
    const p = lbVid.play();
    if (p && p.catch) p.catch(() => {});
  }));
  on($("#lbClose"), "click", () => lb.close());
  lb.addEventListener("click", (e) => { if (e.target === lb) lb.close(); });
  lb.addEventListener("close", () => { lbVid.pause(); lbVid.removeAttribute("src"); lbVid.load(); lbYt.replaceChildren(); });
}

/* ---------- Ventana de cada paquete: fotos y detalles ----------
   Las fotos de cada paquete se editan en el panel (Paquetes > Fotos). */
const PACK_PHOTOS = {};
(((SITIO.paquetes || {}).lista) || []).forEach((p) => {
  PACK_PHOTOS[p.id] = (p.fotos || []).filter((f) => f.foto).map((f) => [f.foto, f.texto || ""]);
});
const pview = $("#packView");
if (pview && pview.showModal) {
  const strip = $("#pvStrip"), pvCap = $("#pvCap"), pvCount = $("#pvCount");
  let pvCard = null, pvShots = [];
  const pvIndex = () => Math.round(strip.scrollLeft / Math.max(strip.clientWidth, 1));
  const pvSync = () => {
    const i = Math.min(pvIndex(), pvShots.length - 1);
    if (i < 0) return;
    pvCap.textContent = pvShots[i][1];
    pvCount.textContent = i + 1 + " / " + pvShots.length;
  };
  const pvGo = (dir) => strip.scrollBy({ left: dir * strip.clientWidth, behavior: reduceMotion ? "auto" : "smooth" });
  const openPack = (card) => {
    pvCard = card;
    pvShots = PACK_PHOTOS[card.id] || [];
    strip.replaceChildren(...pvShots.map(([src, alt]) => {
      const im = new Image();
      im.src = src; im.alt = alt;
      return im;
    }));
    pview.classList.toggle("pview--nophoto", !pvShots.length);
    $("#pvNav").hidden = pvShots.length < 2;
    $("#pvTitle").innerHTML = $("h4", card).innerHTML;
    $("#pvPeople").innerHTML = $(".pack__cap", card).innerHTML;
    $("#pvPrice").replaceChildren(...$$(".pack__cost > *, .pack__extra", card).map((n) => n.cloneNode(true)));
    $("#pvList").innerHTML = $(".pack__list", card).innerHTML;
    const vid = $(".pack__video", card), slot = $("#pvVideo");
    slot.hidden = !vid;
    slot.onclick = vid ? () => vid.click() : null;
    pview.showModal();
    pview.scrollTop = 0; strip.scrollLeft = 0;
    pvSync();
  };
  $$(".pack:not(.pack--pick)").forEach((card) => card.addEventListener("click", (e) => {
    const viewBtn = e.target.closest("[data-view]");
    if (!viewBtn && e.target.closest("a, button")) return; // los demás botones hacen lo suyo
    openPack(card);
  }));
  on(strip, "scroll", () => requestAnimationFrame(pvSync), { passive: true });
  on($("#pvPrev"), "click", () => pvGo(-1));
  on($("#pvNext"), "click", () => pvGo(1));
  // "Quiero este paquete": lleva a cotizar con ese paquete (en Cotizar, lo elige ahí mismo)
  on($("#pvWant"), "click", () => { pview.close(); const a = pvCard && $("a[data-pack]", pvCard); if (a) a.click(); });
  on($("#pvClose"), "click", () => pview.close());
  pview.addEventListener("click", (e) => { if (e.target === pview) pview.close(); });
}

/* ---------- Buscador ----------
   Busca en TODO el sitio (no solo en esta página): paquetes, adicionales, pasos, preguntas y secciones.
   Si el resultado está en esta página, lleva hasta él; si está en otra, abre esa página en ese punto.
   Para que algo se encuentre con más palabras, agrégalas en el panel ("Palabras para el buscador"). */
const search = $("#search");
const openSearchButtons = $$("[data-search]");
if (search && search.showModal) {
  const sInput = $("#sInput"), sList = $("#sList"), sQuick = $("#sQuick"), sNone = $("#sNone"), sHead = $("#sHead");
  const norm = (s) => String(s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, " ").trim();
  const INDEX = [];
  // page: página donde está; hash: punto dentro de la página; sel/alt: cómo encontrarlo si ya estás en una página que lo tiene
  const add = (o) => INDEX.push(Object.assign(o, { t: norm(o.title), x: norm([o.title, o.sub, o.keys].join(" ")) }));
  const S = SITIO, list = (a) => (Array.isArray(a) ? a : []);
  const packName = (p) => (p.nombre || "") + (p.resaltado ? " " + p.resaltado : "");
  const packPrice = (p) => (+p.fijo || (+p.sabado && +p.sabado === +p.semana) ? money(+p.fijo || +p.sabado)
    : +p.sabado ? money(p.sabado) + " en sábado · " + money(p.semana) + " de domingo a viernes" : money(p.semana) + " · solo de domingo a viernes");

  const Q = S.paquetes || {};
  if (Q.avisoFuerte) add({ type: "Descuento", title: Q.avisoFuerte, sub: Q.avisoTexto, page: "paquetes", hash: "deal", sel: "#deal", keys: "sabado descuento promocion oferta entre semana rebaja" });
  list(Q.lista).forEach((p) => add({
    type: "Paquete", title: "Paquete " + packName(p), sub: packPrice(p) + " · " + (p.capTexto || "hasta").toLowerCase() + " " + p.personas + " personas",
    page: "paquetes", hash: p.id, sel: "#" + p.id, cap: +p.personas || 0,
    keys: [p.buscar, list(p.puntos).join(" "), list(p.detalle).join(" ").replace(/[*_+]/g, ""), "paquete sonido dj precio costo cuanto cuesta"].join(" "),
  }));
  const K = S.infantil || {};
  if (K.mostrar !== false) add({ type: "Paquete", title: "Paquete Infantil", sub: money(K.precio) + " " + (K.precioNota || "") + " · sonido, palomitas, burbujas e inflable", page: "infantil", hash: "infantil", sel: ".kids__body",
    keys: "ninos ninas fiesta infantil cumpleanos brincolin castillo inflable palomitas burbujas " + list(K.puntos).map((x) => x.titulo + " " + x.texto).join(" ") });
  const A = S.adicionales || {};
  list(A.lista).forEach((x) => add({ type: "Adicional", title: x.nombre, sub: +x.precio ? "Desde " + money(+x.promo && x.porPersona ? x.promo : x.precio) + (x.porPersona ? " por persona" : "") : "Precio al cotizar",
    page: "adicionales", hash: x.id, sel: "#" + x.id, alt: '.qopt[data-key="' + x.id + '"]', keys: [x.texto, x.buscar, "adicional extra agregar precio"].join(" ") }));
  const W = A.shows || {};
  list(W.personajes).filter((c) => c.nombre).forEach((c) => add({ type: "Show", title: c.nombre, sub: +c.precio ? money(c.precio) + (c.duracion ? " · " + c.duracion : "") : "Show de botarga o personaje",
    page: "adicionales", hash: "x-shows", sel: "#x-shows", alt: '.qopt[data-name="' + c.nombre.replace(/"/g, "") + '"]', keys: "show botarga personaje video animacion precio" }));
  list(S.extrasChicos).filter((x) => x.nombre).forEach((x) => add({ type: "Extra", title: x.nombre, sub: +x.precio ? money(x.precio) + (x.nota ? " · " + x.nota : "") : "Precio al cotizar",
    page: "cotizar", hash: "qsmall", sel: '.qchip[data-name="' + x.nombre.replace(/"/g, "") + '"]', keys: "extra detalle agregar" }));
  list(Q.incluyen).forEach((x) => add({ type: "Incluido en todos", title: x.titulo, sub: x.texto, page: "inicio", hash: "incluyen", sel: "#incluyen", keys: "incluye incluido todos los paquetes" }));
  list((S.apartar || {}).pasos).forEach((x) => add({ type: "Cómo apartar", title: x.titulo, sub: x.texto, page: "apartar", hash: "pasos", sel: "#pasos", keys: "apartar reservar reserva anticipo deposito pago separar fecha contrato" }));
  list((S.preguntas || {}).lista).filter((x) => x.p).forEach((x, i) => add({ type: "Pregunta", title: x.p, sub: x.r, page: "preguntas", hash: "faq-" + (i + 1), sel: "#faq-" + (i + 1), open: true, keys: x.r }));
  // Páginas y secciones
  const sec = (type, title, sub, page, hash, keys, extra) => add(Object.assign({ type, title, sub, page, hash, sel: hash ? "#" + hash : "", keys }, extra || {}));
  sec("Página", "Cotiza tu evento en 3 pasos", "Elige paquete, agrega extras y envía tu cotización por WhatsApp", "cotizar", "", "cotizar cotizacion precio total presupuesto");
  sec("Página", "Todos los paquetes", "Compara precios, personas y equipo de cada paquete", "paquetes", "", "paquetes sonido dj lista todos");
  sec("Sección", "Comparar los paquetes de sonido", "Tabla con precios, personas y equipo de cada paquete", "paquetes", "comparar", "comparar comparacion tabla diferencias cual elegir", { compare: true });
  sec("Página", "Fiestas infantiles", "Paquete con sonido, palomitas, burbujas e inflable", "infantil", "", "infantil ninos fiesta infantil cumpleanos");
  sec("Página", "Servicios adicionales", "Shows, carrito de shots, palomitas, barra de snacks e inflable", "adicionales", "", "adicionales extras shows botargas shots palomitas snacks");
  sec("Sección", "Fotos de nuestros montajes", "Galería de fotos del equipo en eventos", "galeria", "g-fotos", "fotos imagenes galeria montaje equipo", { tab: "g-fotos" });
  sec("Sección", "Videos", "Shows, carrito de shots e invitaciones en video", "galeria", "g-videos", "videos galeria ver", { tab: "g-videos" });
  sec("Sección", "TikTok", "Nuestros videos de " + ((S.negocio || {}).tiktokUsuario || "TikTok"), "galeria", "g-tiktok", "tiktok videos redes", { tab: "g-tiktok" });
  sec("Sección", "Opiniones de clientes", "Reseñas reales en Google Maps", "galeria", "resenas", "opiniones resenas referencias google maps calificacion confiable recomendaciones");
  sec("Página", "Cómo apartar tu fecha", "Cotiza, revisa el contrato, aparta con $500 y recibe tu contrato", "apartar", "", "apartar reservar reserva anticipo deposito pago separar fecha pasos proceso contrato");
  sec("Página", "Preguntas frecuentes", "Horas, precios, montaje, contrato, música y zonas", "preguntas", "", "preguntas dudas faq");
  sec("Sección", "Contacto y redes sociales", "WhatsApp " + ((S.negocio || {}).telefono || "") + ", Facebook, Instagram, TikTok y Google Maps", PAGE, "contacto", "contacto telefono numero celular whatsapp facebook instagram tiktok ubicacion direccion donde estan");

  // Palabras que la gente usa y que la página dice de otra forma
  const SYN = {
    tele: "pantalla", tv: "pantalla", television: "pantalla", televisor: "pantalla", proyector: "pantalla", video: "pantalla",
    brincolin: "inflable", brincolines: "inflable", castillo: "inflable", juegos: "inflable",
    bajo: "subwoofer", bajos: "subwoofer", sub: "subwoofer", woofer: "subwoofer", buffer: "subwoofer", bufer: "subwoofer",
    costo: "precio", costos: "precio", cuesta: "precio", cuestan: "precio", cuanto: "precio", cobran: "precio", tarifa: "precio",
    reservar: "apartar", reserva: "apartar", separar: "apartar", deposito: "anticipo", pago: "anticipo",
    horario: "horas", tiempo: "horas", duracion: "horas", dura: "horas",
    personaje: "show", personajes: "show", animacion: "animador", animadores: "animador",
    bebida: "shots", tragos: "shots", alcohol: "shots", dulces: "snacks", botana: "snacks", botanas: "snacks",
    iluminacion: "luces", luz: "luces", bocina: "bocinas", micro: "microfonos", microfono: "microfonos",
    ninos: "infantil", ninas: "infantil", nino: "infantil", cumpleanos: "infantil", pinata: "infantil",
    zona: "zonas", lugar: "zonas", cobertura: "zonas", morelos: "zonas",
    invitados: "personas", gente: "personas", resenas: "opiniones", referencias: "opiniones",
  };
  const STOP = new Set("de del la las el los un una unos unas y o a en con para por que me mi su al es hay se lo le como cual quiero busco necesito tienen tiene ocupo dan".split(" "));
  const forms = (tok) => { // variantes de una palabra: tal cual, sin plural y su sinónimo
    const f = [tok];
    if (tok.length > 4 && tok.endsWith("es")) f.push(tok.slice(0, -2));
    if (tok.length > 3 && tok.endsWith("s")) f.push(tok.slice(0, -1));
    f.slice().forEach((v) => { if (SYN[v]) f.push(SYN[v]); });
    return f;
  };
  const find = (q) => {
    // "150 personas", "120 invitados" o solo "150": paquetes donde cabe esa cantidad
    const people = norm(q).match(/^(?:para |de |hasta |como |unas |unos )*(\d{2,3})(?: (?:personas|persona|invitados|gente|asistentes|pax))?$/);
    if (people) {
      const n = +people[1];
      return INDEX.filter((e) => e.cap && e.cap >= n).sort((a, b) => a.cap - b.cap).slice(0, 8);
    }
    let toks = norm(q).split(" ").filter(Boolean);
    const useful = toks.filter((t) => !STOP.has(t) && t.length > 1);
    if (useful.length) toks = useful;
    if (!toks.length) return [];
    const scored = INDEX.map((e, i) => {
      let hits = 0, score = 0;
      toks.forEach((tok) => {
        const f = forms(tok);
        if (f.some((v) => e.t.includes(v))) { hits++; score += 5; }
        else if (f.some((v) => (/^\d+$/.test(v) ? (" " + e.x + " ").includes(" " + v + " ") : e.x.includes(v)))) { hits++; score += 1; }
      });
      return { e, i, hits, score };
    }).filter((r) => r.hits);
    const all = scored.filter((r) => r.hits === toks.length);
    return (all.length ? all : scored).sort((a, b) => b.hits - a.hits || b.score - a.score || a.i - b.i).slice(0, 8).map((r) => r.e);
  };

  // Abre el resultado: aquí mismo si la página lo tiene; si no, en su página
  const reveal = (e, el) => {
    if (e.tab) showGtab(e.tab);
    if (e.compare && el.closest(".pgroup") && el.closest(".pgroup").hidden) resetFilter();
    if (el.hidden && el.classList.contains("pack")) resetFilter();
    if (e.open && el.tagName === "DETAILS") el.open = true;
    flash(el);
  };
  const go = (e) => {
    search.close();
    setMenu(false);
    const el = [e.sel, e.alt].filter(Boolean).map((s) => { try { return $(s); } catch (err) { return null; } }).find(Boolean);
    if (el) { setTimeout(() => reveal(e, el), 60); return; }
    location.href = PAGES[e.page] + (e.hash ? "#" + e.hash : "");
  };
  window.MZ_irA = (hash) => { const e = INDEX.find((x) => x.hash === hash); if (e) go(e); };
  const render = () => {
    const q = sInput.value.trim();
    const res = q ? find(q) : [];
    sQuick.hidden = !!q;
    sHead.hidden = !res.length;
    sHead.textContent = res.length === 1 ? "1 resultado" : res.length + " resultados";
    sNone.hidden = !q || res.length > 0;
    if (q && !res.length) {
      $("#sTerm").textContent = "«" + q + "»";
      $("#sAsk").href = waLink("Hola, estoy buscando: " + q + ". ¿Lo manejan?");
    }
    sList.replaceChildren(...res.map((e) => {
      const li = document.createElement("li"), b = document.createElement("button");
      b.type = "button";
      [["em", e.type], ["b", e.title], ["small", e.sub], ["span", "→"]].forEach(([tag, txt]) => {
        if (!txt) return;
        const n = document.createElement(tag);
        n.textContent = txt;
        b.appendChild(n);
      });
      b.addEventListener("click", () => go(e));
      li.appendChild(b);
      return li;
    }));
  };
  const openSearch = (q = "") => {
    setMenu(false);
    sInput.value = q;
    render();
    if (!search.open) search.showModal();
    $(".search__body", search).scrollTop = 0;
    if (q) sInput.blur(); else sInput.focus();
  };
  openSearchButtons.forEach((b) => b.addEventListener("click", () => openSearch(b.dataset.search || "")));
  $$("[data-q]", search).forEach((b) => b.addEventListener("click", () => { sInput.value = b.dataset.q; render(); }));
  sInput.addEventListener("input", render);
  on($("#sForm"), "submit", (e) => { // Enter: abre el primer resultado
    e.preventDefault();
    const first = $("button", sList);
    if (first) first.click();
  });
  on($("#sClose"), "click", () => search.close());
  search.addEventListener("click", (e) => { if (e.target === search) search.close(); });
  // Atajos: "/" o Ctrl+K abren el buscador
  addEventListener("keydown", (e) => {
    const typing = /^(INPUT|TEXTAREA|SELECT)$/.test((e.target.tagName || "")) || e.target.isContentEditable;
    if ((e.key === "/" && !typing) || (String(e.key).toLowerCase() === "k" && (e.ctrlKey || e.metaKey))) {
      if (document.querySelector("dialog[open]:not(#search)")) return;
      e.preventDefault();
      openSearch();
    }
  });
} else {
  // Navegador sin ventanas <dialog>: los botones de búsqueda llevan a los paquetes
  openSearchButtons.forEach((b) => b.addEventListener("click", () => { location.href = PAGES.paquetes; }));
}

/* ---------- Al llegar con un punto en la dirección (ej. /paquetes#p-oro) ----------
   El contenido se dibuja después de cargar, así que aquí se lleva la vista hasta ese punto. */
if (location.hash.length > 1) {
  const id = decodeURIComponent(location.hash.slice(1));
  setTimeout(() => {
    const el = document.getElementById(id);
    if (!el) return;
    if ($('[data-gtab="' + id + '"]')) showGtab(id);
    if (el.tagName === "DETAILS") el.open = true;
    if (el.hidden && el.classList.contains("pack")) resetFilter();
    if ("scrollRestoration" in history) history.scrollRestoration = "manual";
    flash(el, true);
    // Las fotos que cargan después pueden mover la página: se vuelve a acomodar si el visitante no ha movido nada
    let moved = false;
    ["wheel", "touchstart", "keydown"].forEach((ev) => addEventListener(ev, () => (moved = true), { once: true, passive: true }));
    setTimeout(() => { if (!moved) el.scrollIntoView({ behavior: "auto", block: "center" }); }, 1400);
  }, 250);
}

const year = $("#year");
if (year) year.textContent = new Date().getFullYear();
