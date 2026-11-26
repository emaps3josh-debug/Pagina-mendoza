/* ===== Mendoza Sonido y DJ: arma la página con lo que hay en contenido.js =====
   No hace falta editar este archivo: los textos, precios, fotos y videos se cambian
   desde el panel (admin.html), que genera un contenido.js nuevo. */
(() => {
  const DRAFT_KEY = "mendoza-borrador";
  let S = window.SITIO || {};

  // Vista previa del panel: index.html?borrador muestra el borrador guardado en este navegador
  const isDraft = new URLSearchParams(location.search).has("borrador");
  if (isDraft) {
    try {
      const d = JSON.parse(localStorage.getItem(DRAFT_KEY) || "null");
      if (d) S = window.SITIO = window.completarSitio ? window.completarSitio(d, window.SITIO_BASE || {}) : d;
    } catch (e) { /* sin borrador: se muestra lo publicado */ }
  }

  /* ---------- Utilidades ---------- */
  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  // Texto con **negritas** y _notas_
  const rich = (s) => esc(s).replace(/\*\*(.+?)\*\*/g, "<b>$1</b>").replace(/_([^_]+)_/g, "<i>$1</i>");
  const num = (n) => Number(n || 0).toLocaleString("en-US");
  const money = (n) => "$" + num(n);
  const ico = (id) => '<svg class="ico"><use href="#' + esc(id || "i-star") + '"/></svg>';
  const el = (sel) => document.querySelector(sel);
  const html = (sel, h) => { const e = el(sel); if (e) e.innerHTML = h; };
  const text = (sel, t) => document.querySelectorAll(sel).forEach((e) => (e.textContent = t == null ? "" : t));
  const heading = (sel, a, b) => html(sel, esc(a) + (b ? " <em>" + esc(b) + "</em>" : ""));
  const list = (a) => (Array.isArray(a) ? a : []);

  /* ---------- Videos: reconoce el tipo de enlace ----------
     YouTube (normal y Shorts), TikTok, Instagram, Facebook o un archivo .mp4. */
  const videoInfo = (url) => {
    const u = String(url || "").trim();
    let m;
    if (!u) return { tipo: "" };
    if ((m = u.match(/(?:youtu\.be\/|youtube(?:-nocookie)?\.com\/(?:watch\?(?:[^#]*&)?v=|shorts\/|embed\/|live\/))([\w-]{6,})/i)))
      return { tipo: "yt", nombre: "YouTube", id: m[1], portada: "https://i.ytimg.com/vi/" + m[1] + "/hqdefault.jpg", embed: "https://www.youtube-nocookie.com/embed/" + m[1] + "?autoplay=1&playsinline=1&rel=0&modestbranding=1" };
    if ((m = u.match(/tiktok\.com\/.*\/video\/(\d+)/i)))
      return { tipo: "tk", nombre: "TikTok", id: m[1], embed: "https://www.tiktok.com/player/v1/" + m[1] + "?music_info=0&description=0&rel=0" };
    if (/tiktok\.com/i.test(u)) return { tipo: "link", nombre: "TikTok (enlace corto)", corto: true };
    if ((m = u.match(/instagram\.com\/(?:[\w.]+\/)?(reel|reels|p|tv)\/([\w-]+)/i)))
      return { tipo: "ig", nombre: "Instagram", embed: "https://www.instagram.com/" + (m[1] === "reels" ? "reel" : m[1]) + "/" + m[2] + "/embed" };
    if (/facebook\.com|fb\.watch/i.test(u))
      return { tipo: "fb", nombre: "Facebook", embed: "https://www.facebook.com/plugins/video.php?show_text=false&href=" + encodeURIComponent(u) };
    if (/\.(mp4|webm|mov|m4v)(\?|#|$)/i.test(u) || /^data:video/i.test(u)) return { tipo: "file", nombre: "Archivo de video" };
    return { tipo: "link", nombre: "Enlace" };
  };
  window.videoInfo = videoInfo;

  const videoBox = (v) => {
    const i = videoInfo(v.url), t = esc(v.titulo || "Video"), p = v.portada || i.portada || "";
    if (i.tipo === "file") return '<video controls playsinline preload="none"' + (p ? ' poster="' + esc(p) + '"' : "") + ' src="' + esc(v.url) + '"></video>';
    if (i.tipo === "tk") return '<div class="tk" data-tk="' + i.id + '"><a href="' + esc(v.url) + '" target="_blank" rel="noopener" aria-label="Ver ' + t + ' en TikTok">' + ico("i-tt") + "<span>Ver en TikTok</span></a></div>";
    if (i.embed) return '<div class="yt" data-embed="' + esc(i.embed) + '" data-title="' + t + '">' + (p ? '<img loading="lazy" decoding="async" src="' + esc(p) + '" alt="">' : "") + '<button type="button" aria-label="Reproducir video: ' + t + '">' + ico("i-play") + "</button></div>";
    if (i.tipo === "link") return '<div class="tk"><a href="' + esc(v.url) + '" target="_blank" rel="noopener">' + ico("i-play") + "<span>Ver video</span></a></div>";
    return "";
  };
  const videoFig = (v) => {
    const b = videoBox(v);
    return b ? '<figure class="v">' + b + (v.titulo ? "<figcaption>" + esc(v.titulo) + "</figcaption>" : "") + "</figure>" : "";
  };
  // Botón que abre un video en la ventana ampliada
  const videoBtn = (cls, url, cap, label, portada) =>
    url ? '<button type="button" class="' + cls + '" data-vurl="' + esc(url) + '" data-poster="' + esc(portada || "") + '" data-cap="' + esc(cap) + '">' + ico("i-play") + " " + esc(label) + "</button>" : "";

  /* ---------- Datos del negocio ---------- */
  const N = S.negocio || {};
  text("[data-t='zona']", N.zona);

  /* ---------- Portada ---------- */
  const P = S.portada || {};
  heading("#heroTitle", P.titulo, P.resaltado);
  text("#heroLead", P.texto);
  if (P.foto && el("#heroBg")) el("#heroBg").src = P.foto;
  if (P.boton && el("#heroBtn")) el("#heroBtn").firstChild.textContent = P.boton + " ";

  /* ---------- Paquetes ---------- */
  const Q = S.paquetes || {};
  const packs = list(Q.lista);
  const packName = (p) => (p.nombre || "") + (p.resaltado ? " " + p.resaltado : "");
  const single = (p) => +p.fijo || (+p.sabado && (!+p.semana || +p.semana === +p.sabado) ? +p.sabado : 0); // un solo precio (también si cuesta igual cualquier día)
  const lowest = (p) => single(p) || Math.min(...[+p.sabado, +p.semana].filter(Boolean));

  // pick = tarjeta del paso 1 del cotizador (no lleva id para no repetirlo); rec = recomendado
  const packCard = (p, pick, rec) => {
    const fijo = single(p), soloSemana = !fijo && !+p.sabado;
    const badge = (rec ? "Recomendado" : "") || p.etiqueta || (soloSemana ? "Solo domingo a viernes" : "");
    const thumb = p.miniatura || (list(p.fotos)[0] || {}).foto || "";
    const name = packName(p);
    let cost;
    if (fijo) cost = '<p class="pack__price"><sup>$</sup><b data-p="fijo">' + num(fijo) + "</b><small>5 hrs + 2 de regalo · 7 horas</small></p>";
    else if (soloSemana) cost = '<p class="pack__price"><sup>$</sup><b data-p="sem">' + num(p.semana) + '</b><small>Domingo a viernes · 7 horas</small></p><p class="pack__alt pack__alt--no">No disponible en sábado</p>';
    else cost = '<p class="pack__price"><sup>$</sup><b data-p="sab">' + num(p.sabado) + '</b><small>Sábado · 7 horas</small></p><p class="pack__alt">Domingo a viernes <b data-p="sem">' + money(p.semana) + "</b></p>";
    const detail = list(p.detalle).map((l) => {
      const hl = /^\s*\+\s*/.test(l);
      return "<li" + (hl ? ' class="hl"' : "") + ">" + rich(String(l).replace(/^\s*\+\s*/, "")) + "</li>";
    }).join("");
    return '<article class="pack' + (pick ? " pack--pick" + (rec ? " pack--rec" : "") : "") + (p.destacado ? " pack--top" : "") + '" ' + (pick ? "data-pid" : "id") + '="' + esc(p.id) + '" data-tags="' + esc(list(p.incluye).join(" ")) + '" data-keys="' + esc((p.buscar || "") + " precio costo cuánto cuesta") + '">' +
      (thumb ? '<img class="pack__thumb" src="' + esc(thumb) + '" alt="" loading="lazy" decoding="async">' : "") +
      '<div class="pack__body">' +
        (badge ? '<span class="pack__badge">' + esc(badge) + "</span>" : "") +
        "<h4>" + esc(p.nombre) + (p.resaltado ? " <em>" + esc(p.resaltado) + "</em>" : "") + "</h4>" +
        '<p class="pack__cap">' + ico("i-people") + " " + esc(p.capTexto || "Hasta") + " " + (+p.personas || 0) + " personas</p>" +
        '<div class="pack__cost">' + cost + "</div>" +
        '<ul class="pack__tags">' + list(p.puntos).map((t) => "<li>" + esc(t) + "</li>").join("") + "</ul>" +
      "</div>" +
      '<ul class="pack__list">' + detail + "</ul>" +
      (p.nota ? '<p class="pack__extra">' + rich(p.nota) + "</p>" : "") +
      videoBtn("pack__video", p.video, "Paquete " + name, "Ver video del paquete", thumb) +
      '<div class="pack__actions">' +
        (pick
          ? '<button type="button" class="btn btn--ghost" data-pview="' + esc(p.id) + '">Ver detalles</button>' +
            '<button type="button" class="btn btn--pack" data-pick="' + esc(p.id) + '">Elegir <span class="arrow">→</span></button>'
          : '<button type="button" class="btn btn--ghost" data-view>Ver detalles</button>' +
            '<a class="btn btn--pack" data-pack="' + esc(name) + '" href="#">Elegir <span class="arrow">→</span></a>') +
      "</div></article>";
  };

  // Tabla para comparar los paquetes del primer grupo
  const compareTable = (items) => {
    if (items.length < 2) return "";
    const rows = [
      ["Sábado", items.map((p) => (single(p) ? money(single(p)) : +p.sabado ? money(p.sabado) : "—"))],
      ["Domingo a viernes", items.map((p) => (single(p) ? money(single(p)) : +p.semana ? money(p.semana) : "—"))],
      ["Personas", items.map((p) => String(+p.personas || "—"))],
    ].map(([label, cells]) => "<tr><th>" + label + "</th>" + cells.map((c) => "<td>" + esc(c) + "</td>").join("") + "</tr>");
    list(Q.comparar).forEach((label) => {
      const cells = items.map((p) => String((p.tabla || {})[label] || "—"));
      const mixed = cells.includes("—") && cells.some((c) => c !== "—");
      rows.push("<tr><th>" + esc(label) + "</th>" + cells.map((c) => "<td" + (mixed && c !== "—" ? ' class="yes"' : "") + ">" + esc(c) + "</td>").join("") + "</tr>");
    });
    return '<details class="compare" id="comparar"><summary>Comparar los ' + items.length + ' paquetes de sonido <span class="plus" aria-hidden="true"></span></summary>' +
      '<div class="compare__scroll"><table><thead><tr><th></th>' + items.map((p) => "<th>" + esc(packName(p)) + "</th>").join("") + "</tr></thead><tbody>" + rows.join("") + "</tbody></table></div></details>";
  };

  const groups = list(Q.grupos).map((g) => ({ g, items: packs.filter((p) => p.grupo === g.id) })).filter((x) => x.items.length);
  heading("#paqTitle", Q.titulo, Q.resaltado);
  html("#grupos", groups.map(({ g, items }, i) =>
    '<div class="pgroup" id="' + esc(g.id) + '"><header class="pgroup__head"><h3>' + esc(g.titulo) + "</h3><p>" + esc(g.texto) + "</p></header>" +
    '<div class="packs' + (items.length % 4 === 0 && items.length % 3 !== 0 ? " packs--4" : "") + '">' + items.map((p) => packCard(p)).join("") + "</div>" +
    (i === 0 ? compareTable(items) : "") + "</div>").join(""));
  const deal = el("#deal");
  if (deal) {
    deal.hidden = !(Q.avisoFuerte || Q.avisoTexto);
    html("#dealText", "<b>" + esc(Q.avisoFuerte) + "</b> " + esc(Q.avisoTexto));
  }
  html("#incluyen", list(Q.incluyen).map((x) => "<li>" + ico(x.icono) + "<b>" + esc(x.titulo) + "</b><span>" + esc(x.texto) + "</span></li>").join(""));
  text("#fCount", packs.length + " paquetes");

  /* ---------- Infantil ---------- */
  const K = S.infantil || {};
  const kidsOn = K.mostrar !== false;
  const kidsName = K.resaltado || K.titulo || "Infantil";
  document.querySelectorAll("#infantil, a[href='#infantil']").forEach((e) => (e.hidden = !kidsOn));
  if (kidsOn) html("#kids",
    '<figure class="kids__photo">' + (K.foto ? '<img loading="lazy" decoding="async" src="' + esc(K.foto) + '" alt="' + esc(K.fotoAlt) + '">' : "") + "</figure>" +
    '<div class="kids__body"><p class="label"><b>02</b><i></i> Fiestas infantiles</p>' +
    "<h2>" + esc(K.titulo) + (K.resaltado ? " <em>" + esc(K.resaltado) + "</em>" : "") + "</h2>" +
    '<p class="kids__price"><b><sup>$</sup>' + num(K.precio) + "</b><span>" + esc(K.precioNota) + "</span></p>" +
    '<ul class="kids__list">' + list(K.puntos).map((x) => "<li>" + ico(x.icono) + "<div><b>" + esc(x.titulo) + "</b><span>" + esc(x.texto) + "</span></div></li>").join("") + "</ul>" +
    (K.opcion ? '<p class="kids__opt">' + rich(K.opcion) + "</p>" : "") +
    '<a class="btn btn--wa" data-wa="Hola, me interesa el Paquete ' + esc(kidsName.toUpperCase()) + " (" + money(K.precio) + '). Mi evento es el día: " data-pack="' + esc(kidsName) + '" data-price="' + money(K.precio) + '" href="#">' + ico("i-wa") + " " + esc(K.boton || "Reservar") + "</a></div>");

  /* ---------- Accesos directos de la portada ---------- */
  html("#jump",
    groups.map(({ g, items }, i) => '<a href="#' + esc(g.id) + '">' + ico(i ? "i-star" : "i-speaker") + "<b>" + esc(g.corto || g.titulo) + "</b><small>" +
      items.length + (items.length === 1 ? " paquete" : " paquetes") + " desde " + money(Math.min(...items.map(lowest))) + "</small></a>").join("") +
    (kidsOn ? '<a href="#infantil">' + ico("i-castle") + "<b>Fiesta infantil</b><small>" + money(K.precio) + " " + esc(K.precioNota) + "</small></a>" : "") +
    '<a href="#adicionales">' + ico("i-cart") + "<b>Adicionales</b><small>Shows, shots, snacks y más</small></a>");

  /* ---------- Adicionales ---------- */
  const A = S.adicionales || {};
  heading("#adiTitle", A.titulo, A.resaltado);
  text("#adiNote", A.nota);
  const priceBox = (x) => {
    if (!+x.precio && !+x.promo) return '<p class="price__ask">Precio al cotizar</p>';
    return '<div class="price">' +
      (+x.precio ? '<p class="price__main"><b><sup>$</sup>' + num(x.precio) + "</b><span>" + esc(x.precioNota) + "</span></p>" : "") +
      (+x.promo ? '<p class="price__deal"><b><sup>$</sup>' + num(x.promo) + "</b><span>" + esc(x.promoNota) + "</span></p>" : "") + "</div>";
  };
  const extraFoot = (x) => '<div class="extra__foot">' + videoBtn("tbtn", x.video, x.nombre, "Ver video", x.foto) +
    '<a class="tbtn tbtn--wa" data-wa="' + esc(x.mensaje || "Hola, quiero información de: " + x.nombre + ".") + '" href="#">' + ico("i-wa") + " " + esc(x.boton || (+x.precio ? "Lo quiero" : "Preguntar precio")) + "</a></div>";
  const extraCard = (x) => {
    const keys = ' data-keys="' + esc((x.buscar || "") + (+x.precio ? " precio costo cuánto cuesta" : "")) + '"';
    if (!x.foto) return '<article class="extra extra--long" id="' + esc(x.id) + '"' + keys + '><div class="extra__body">' + '<svg class="ico extra__ico"><use href="#' + esc(x.icono || "i-star") + '"/></svg>' +
      "<h3>" + esc(x.nombre) + "</h3><p>" + esc(x.texto) + '</p></div><div class="extra__side">' + priceBox(x) + extraFoot(x) + "</div></article>";
    return '<article class="extra" id="' + esc(x.id) + '"' + keys + '><img class="extra__img" src="' + esc(x.foto) + '" alt="' + esc(x.fotoAlt) + '" loading="lazy" decoding="async">' +
      '<div class="extra__body"><h3>' + esc(x.nombre) + "</h3><p>" + esc(x.texto) + "</p>" + priceBox(x) + extraFoot(x) + "</div></article>";
  };
  const W = A.shows || {};
  const chars = list(W.personajes).filter((c) => c.nombre);
  // Precio y duración de cada personaje (si no tiene, solo sale su botón)
  const charPrice = (c) => (+c.precio || c.duracion ? '<span class="chips__price">' + (+c.precio ? "<b>" + money(c.precio) + "</b>" : "") + (c.duracion ? " " + esc(c.duracion) : "") + "</span>" : "");
  const showsPriced = chars.some((c) => +c.precio);
  const showsCard = W.titulo ? '<article class="extra extra--feature" id="x-shows" data-keys="botarga personaje animación show shows baile">' +
    (W.foto ? '<img src="' + esc(W.foto) + '" alt="' + esc(W.fotoAlt) + '" loading="lazy" decoding="async">' : "") +
    '<div class="extra__over"><h3>' + esc(W.titulo) + "</h3><p>" + esc(W.texto) + "</p>" +
    (chars.some((c) => c.video) ? '<p class="chips__hint">Toca un personaje para ver su video</p>' : "") +
    '<ul class="chips' + (chars.some((c) => +c.precio || c.duracion) ? " chips--list" : "") + '">' + chars.map((c) => "<li>" + (c.video ? videoBtn("", c.video, c.nombre, c.nombre, c.portada) : '<button type="button" data-cap="' + esc(c.nombre) + '" disabled>' + esc(c.nombre) + "</button>") + charPrice(c) + "</li>").join("") + "</ul>" +
    '<a class="tbtn tbtn--wa" data-wa="' + esc(W.mensaje || "Hola, quiero información de los shows.") + '" href="#">' + ico("i-wa") + (showsPriced ? " Quiero un show" : " Preguntar precio") + "</a></div></article>" : "";
  const extras = list(A.lista);
  // Las tarjetas con foto van primero (junto a la de shows); las largas, al final
  html("#extras", showsCard + extras.filter((x) => x.foto).map(extraCard).join("") + extras.filter((x) => !x.foto).map(extraCard).join(""));

  /* ---------- Cómo apartar ---------- */
  const R = S.apartar || {};
  heading("#aparTitle", R.titulo, R.resaltado);
  html("#pasos", list(R.pasos).map((x) => "<li><h3>" + esc(x.titulo) + "</h3><p>" + esc(x.texto) + "</p></li>").join(""));
  const pv = list(R.videos).filter((v) => v.url);
  const pvBox = el("#pvideos");
  if (pvBox) {
    pvBox.hidden = !pv.length;
    pvBox.innerHTML = '<div class="pvideos__text"><p class="label"><i></i> Míralo en video</p><h3>' + esc(R.videoTitulo) + (R.videoResaltado ? " <em>" + esc(R.videoResaltado) + "</em>" : "") + "</h3><p>" + esc(R.videoTexto) + "</p></div>" + pv.map(videoFig).join("");
  }

  /* ---------- Galería ---------- */
  const G = S.galeria || {};
  heading("#galTitle", G.titulo, G.resaltado);
  html("#gallery", list(G.fotos).filter((f) => f.foto).map((f) =>
    '<button class="g g--' + esc(f.tam || "s") + '" data-full="' + esc(f.foto) + '" data-cap="' + esc(f.texto) + '"><img loading="lazy" decoding="async" src="' + esc(f.foto) + '" alt="' + esc(f.texto) + '"><span>' + esc(f.texto) + "</span></button>").join(""));
  const gv = list(G.videos).filter((v) => v.url), gt = list(G.tiktoks).filter((v) => v.url);
  html("#videos", gv.map(videoFig).join(""));
  html("#tiktoks", gt.map(videoFig).join(""));
  // Pestañas sin contenido: se ocultan
  [["g-videos", gv.length], ["g-tiktok", gt.length]].forEach(([id, n]) => {
    const tab = el('[data-gtab="' + id + '"]');
    if (tab) tab.hidden = !n;
  });
  const tkMore = el("#tkMore");
  if (tkMore) { tkMore.hidden = !N.tiktok; tkMore.href = N.tiktok || "#"; text("#tkUser", N.tiktokUsuario || "TikTok"); }

  /* ---------- Reseñas ---------- */
  const O = S.resenas || {};
  const revs = list(O.lista).filter((r) => r.texto);
  const stars = (n) => { const k = Math.max(1, Math.min(5, Math.round(+n || 5))); return "★".repeat(k) + '<i>' + "★".repeat(5 - k) + "</i>"; };
  html("#resenas",
    '<div class="reviews__top"><div class="reviews__stars" aria-hidden="true">★★★★★</div><div><h3>' + esc(O.titulo) + "</h3><p>" + esc(O.texto) + "</p></div>" +
    (N.maps ? '<a class="btn btn--line" href="' + esc(N.maps) + '" target="_blank" rel="noopener">' + ico("i-pin") + " " + esc(O.boton || "Ver opiniones en Google") + ' <span class="arrow">→</span></a>' : "") + "</div>" +
    (revs.length ? '<ul class="opin">' + revs.map((r) =>
      '<li><p class="opin__stars" aria-label="' + Math.round(+r.estrellas || 5) + ' de 5 estrellas">' + stars(r.estrellas) + "</p><blockquote>" + esc(r.texto) + "</blockquote>" +
      '<p class="opin__who"><b>' + esc(r.nombre || "Cliente") + "</b><span>Reseña en Google" + (r.fecha ? " · " + esc(r.fecha) : "") + "</span></p></li>").join("") + "</ul>" : ""));

  /* ---------- Preguntas ---------- */
  const F = S.preguntas || {};
  heading("#faqTitle", F.titulo, F.resaltado);
  html("#faq", list(F.lista).filter((x) => x.p).map((x) => "<details><summary>" + esc(x.p) + ' <span class="plus" aria-hidden="true"></span></summary><p>' + esc(x.r) + "</p></details>").join(""));

  /* ---------- Contacto y pie ---------- */
  const C = S.contacto || {};
  const social = [["facebook", "i-fb", "Facebook"], ["instagram", "i-ig", "Instagram"], ["tiktok", "i-tt", "TikTok"], ["maps", "i-pin", "Google Maps"]]
    .filter(([k]) => N[k]).map(([k, i, label]) => '<a href="' + esc(N[k]) + '" target="_blank" rel="noopener">' + ico(i) + " " + label + "</a>").join("");
  html("#contactBox",
    '<p class="cta__script">' + esc(C.lema) + "</p><h2>" + esc(C.titulo) + (C.resaltado ? " <em>" + esc(C.resaltado) + "</em>" : "") + '</h2><p class="cta__lead">' + esc(C.texto) + "</p>" +
    '<a class="btn btn--wa btn--xl" data-wa="Hola, quiero cotizar mi evento con Mendoza Sonido y DJ." href="#">' + ico("i-wa") + " " + esc(N.telefono) + '</a><div class="social">' + social + "</div>");
  html("#footInfo", esc(N.zona) + " · WhatsApp " + esc(N.telefono) + (N.maps ? ' · <a href="' + esc(N.maps) + '" target="_blank" rel="noopener">Google Maps</a>' : ""));
  text("#footNote", N.pie);

  /* ---------- Cotizador: lista de adicionales ---------- */
  html("#qGrid", list(S.cotizador).filter((x) => x.nombre).map((x) =>
    '<label class="qx"' + (x.noEn ? ' data-not="' + esc(x.noEn) + '"' : "") + (x.soloEn ? ' data-only="' + esc(x.soloEn) + '"' : "") + '><input type="checkbox" value="' + esc(x.mensaje || x.nombre) + '"><span><b>' + esc(x.nombre) + "</b>" + (x.nota ? "<small>" + esc(x.nota) + "</small>" : "") + "</span></label>").join(""));

  /* ---------- Cotizador en 3 pasos (aquí se dibuja; la lógica está en cotizador.js) ----------
     Usa los mismos datos de la página: paquetes, adicionales, shows y "pequeños extras".
     Las reglas de la sección "Cotizador" del panel (No ofrecerlo en / Solo en) deciden qué se
     ofrece con cada paquete. */
  const CZ = S.cotizacion || {};
  if (el("#wiz")) {
    // Paso 1: paquetes destacados (máximo 3) y acceso a todos
    const featIds = list(Q.destacados).filter((id) => packs.some((p) => p.id === id)).slice(0, 3);
    const feat = featIds.length ? featIds.map((id) => packs.find((p) => p.id === id)) : packs.slice(0, 3);
    html("#pick", feat.map((p) => packCard(p, true, p.id === Q.recomendado)).join(""));
    text("#wiz1T", CZ.paso1); text("#wiz1P", CZ.paso1Texto);
    text("#verTodosT", "Ver los " + packs.length + " paquetes y comparar");
    const kp = el("#kidPick");
    if (kp) {
      kp.hidden = !kidsOn;
      if (kidsOn) kp.innerHTML = (K.foto ? '<img src="' + esc(K.foto) + '" alt="" loading="lazy" decoding="async">' : "") +
        '<div class="kidpick__t"><b>¿Fiesta infantil?</b><span>Paquete ' + esc(kidsName) + " · " + money(K.precio) + " " + esc(K.precioNota) + "</span></div>" +
        '<div class="kidpick__a"><a class="tbtn" href="#infantil">Ver</a><button type="button" class="btn btn--pack btn--sm" data-pick="infantil">Elegir</button></div>';
    }

    // Paso 2: adicionales, shows y opciones de cada paquete
    const norm = (s) => String(s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/^show (del |de la |de )?/, "").replace(/[^a-z0-9]+/g, " ").trim();
    const rules = list(S.cotizador).filter((r) => r.nombre);
    const used = new Set();
    const ruleFor = (name) => {
      const n = norm(name);
      const r = rules.find((x) => { const m = norm(x.nombre); return m && n && (m === n || m.includes(n) || n.includes(m)); });
      if (r) used.add(r);
      return r || {};
    };
    const firstMoney = (s) => { const m = String(s || "").replace(/,/g, "").match(/\$\s*(\d+)/); return m ? +m[1] : 0; };
    const opts = [];
    list(A.lista).filter((x) => x.nombre).forEach((x) => {
      const r = ruleFor(x.nombre);
      const notes = [x.precioNota, x.promoNota].join(" ");
      const per = x.porPersona != null ? !!x.porPersona : /persona/i.test(notes); // precio por persona (barra de snacks)
      const min = +x.minimo || (per ? +((String(x.precioNota || "") + " " + (x.texto || "")).match(/(\d+)\s*personas?/i) || [])[1] || 0 : 0);
      let promoFrom = +x.promoDesde || 0;
      if (!promoFrom && per && +x.promo) { const m = String(x.promoNota || "").match(/(\d+)/); if (m) promoFrom = +m[1] + (/m[aá]s de/i.test(x.promoNota) ? 1 : 0); }
      opts.push({ key: x.id || norm(x.nombre), nombre: x.nombre, texto: x.texto, foto: x.foto, icono: x.icono, precio: +x.precio || 0, nota: x.precioNota, per, min, promo: +x.promo || 0, promoFrom, promoNota: x.promoNota, video: x.video, poster: x.foto, noEn: r.noEn, soloEn: r.soloEn, keys: x.buscar });
    });
    list(W.personajes).filter((c) => c.nombre).forEach((c, i) => {
      const r = ruleFor(c.nombre);
      opts.push({ key: "show-" + norm(c.nombre).replace(/ /g, "-"), nombre: c.nombre, texto: (c.duracion ? "Show de " + c.duracion + ". " : "") + (W.texto || ""), foto: c.portada || W.foto, icono: "i-star", precio: +c.precio || 0, video: c.video, poster: c.portada, noEn: r.noEn, soloEn: r.soloEn, keys: "show botarga personaje" });
    });
    // Opciones del panel que no son un adicional ni un show (ej. pantalla de 58", karaoke)
    rules.filter((r) => !used.has(r)).forEach((r) => opts.push({ key: "op-" + norm(r.nombre).replace(/ /g, "-"), nombre: r.nombre, texto: r.nota, icono: "i-check", precio: firstMoney(r.nota), noEn: r.noEn, soloEn: r.soloEn }));

    const priceLine = (o) => {
      if (!o.precio) return '<p class="qopt__price is-tbd">Precio al cotizar</p>';
      if (o.per) return '<p class="qopt__price"><b>' + money(o.precio) + "</b> por persona" + (o.min ? "<small>Desde " + o.min + " personas</small>" : "") + "</p>";
      return '<p class="qopt__price"><b>' + money(o.precio) + "</b>" + (o.nota ? "<small>" + esc(o.nota) + "</small>" : "") + "</p>";
    };
    const promoLine = (o) => (o.promo ? '<p class="qopt__promo">' + money(o.promo) + (o.per ? " por persona" : "") + (o.promoNota ? " · " + esc(o.promoNota) : "") + "</p>" : "");
    html("#qopts", opts.map((o) =>
      '<article class="qopt" data-key="' + esc(o.key) + '" data-name="' + esc(o.nombre) + '" data-price="' + o.precio + '" data-per="' + (o.per ? 1 : 0) + '" data-min="' + (o.min || 0) +
      '" data-promo="' + (o.promo || 0) + '" data-promo-from="' + (o.promoFrom || 0) + '" data-noen="' + esc(o.noEn || "") + '" data-solo="' + esc(o.soloEn || "") + '" data-keys="' + esc((o.keys || "") + " adicional extra agregar") + '">' +
        (o.foto ? '<img class="qopt__img" src="' + esc(o.foto) + '" alt="" loading="lazy" decoding="async">' : '<span class="qopt__ico">' + ico(o.icono) + "</span>") +
        '<div class="qopt__body"><h4>' + esc(o.nombre) + "</h4>" + (o.texto ? '<p class="qopt__txt">' + esc(o.texto) + "</p>" : "") + priceLine(o) + promoLine(o) + "</div>" +
        '<div class="qopt__act">' + videoBtn("tbtn", o.video, o.nombre, "Video", o.poster) +
          '<button type="button" class="qadd" aria-pressed="false"><span class="qadd__off">Agregar</span><span class="qadd__on">Agregado ✓</span></button></div>' +
      "</article>").join(""));
    text("#wiz2T", CZ.paso2); text("#wiz2P", CZ.paso2Texto);

    // Pequeños extras: compactos, sin la misma importancia que los paquetes
    const small = list(S.extrasChicos).filter((x) => x.nombre);
    const qs = el("#qsmall");
    if (qs) qs.hidden = !small.length;
    text("#wizSmallT", CZ.extrasTitulo); text("#wizSmallP", CZ.extrasTexto);
    html("#qchips", small.map((x, i) =>
      '<button type="button" class="qchip" aria-pressed="false" data-key="chico-' + i + '" data-name="' + esc(x.nombre) + '" data-price="' + (+x.precio || 0) + '" data-group="' + esc(x.grupo || "") +
      '" data-noen="' + esc(x.noEn || "") + '" data-solo="' + esc(x.soloEn || "") + '" data-keys="extra detalle">' +
      '<span class="qchip__n">' + esc(x.nombre) + "</span><small>" + (+x.precio ? money(x.precio) + (x.nota ? " · " + esc(x.nota) : "") : "Precio al cotizar") + "</small></button>").join(""));

    // Paso 3
    text("#wiz3T", CZ.paso3); text("#wiz3P", CZ.paso3Texto); text("#wizNote", CZ.nota); text("#wizSendT", CZ.boton || "Solicitar mi cotización");
    const tipo = el("#wizTipo");
    if (tipo) list(CZ.tipos).forEach((t) => { const o = document.createElement("option"); o.value = o.textContent = t; tipo.appendChild(o); });
    // Asistente del paso 1
    if (CZ.asistente) text("#helpT", CZ.asistente);
    text("#helpP", CZ.asistenteTexto);
    // Qué pasa después de enviar: los pasos de "Cómo apartar" (sin el primero, que es cotizar)
    const after = list((S.apartar || {}).pasos).filter((x) => x.titulo).slice(1);
    html("#wizNext", after.length ? "<h4>" + esc(CZ.despues || "¿Qué pasa después de enviar?") + "</h4><ol>" + after.map((x) => "<li><b>" + esc(x.titulo) + "</b><span>" + esc(x.texto) + "</span></li>").join("") + "</ol>" : "");
  }
  // Para cotizador.js
  window.MZ = { esc, money, num, ico, rich };

  /* ---------- Aviso de vista previa ---------- */
  if (isDraft) {
    const bar = document.createElement("p");
    bar.className = "draftbar";
    bar.textContent = "Vista previa del borrador: todavía no está publicado";
    document.body.appendChild(bar);
  }
})();
