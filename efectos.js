/* ===== Mendoza Sonido y DJ: efectos y música de fondo =====
   - Música bajita con botón para encenderla o apagarla (se ajusta en el panel, sección "Música").
   - Barra de avance en forma de ondas de sonido (se mueve con la música o al deslizar).
   - Onda al tocar, logo con pulso y luces en bordes, reseñas, fotos y pasos (los estilos están
     en styles.css, sección "Efectos").
   Si el visitante tiene activado "reducir movimiento", los efectos se apagan; la música no. */
(() => {
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const root = document.documentElement;
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const S = window.SITIO || {};

  /* ================= MÚSICA ================= */
  // Valores por defecto; lo que se guarde en el panel (Música) los reemplaza
  const M = Object.assign({ activa: true, auto: true, volumen: 15, archivo: "musica.mp3" }, S.musica || {});
  const PREF_KEY = "mendoza-musica"; // "on" / "off": lo último que eligió el visitante
  const level = () => Math.max(0, Math.min(1, (+M.volumen || 0) / 100));
  let audio = null, ctx = null, gain = null, analyser = null, freq = null;
  let playing = false;   // está sonando
  let wanted = false;    // el visitante quiere música
  let ducked = false;    // en pausa porque se está viendo un video
  let hiddenPause = false, fadeTimer = 0, stopTimer = 0;

  const music = { on: !!(M.activa && M.archivo) };
  let btn = null, tip = null;

  const ui = () => {
    root.classList.toggle("is-playing", playing);
    if (!btn) return;
    btn.classList.toggle("is-off", !wanted);
    btn.setAttribute("aria-pressed", String(playing));
    btn.setAttribute("aria-label", playing ? "Apagar la música" : "Encender la música");
    btn.title = playing ? "Apagar la música" : "Encender la música";
  };

  // El volumen se controla con Web Audio porque en iPhone no se puede bajar de otra forma
  const build = () => {
    if (audio) return;
    audio = new Audio();
    audio.loop = true;
    audio.preload = "none";
    audio.src = M.archivo;
    let sameOrigin = true;
    try { sameOrigin = new URL(M.archivo, location.href).origin === location.origin; } catch (e) { /* ruta relativa */ }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (AC && sameOrigin) {
      try {
        ctx = new AC();
        const src = ctx.createMediaElementSource(audio);
        analyser = ctx.createAnalyser();
        analyser.fftSize = 256;
        analyser.smoothingTimeConstant = 0.82;
        gain = ctx.createGain();
        gain.gain.value = 0;
        src.connect(analyser); analyser.connect(gain); gain.connect(ctx.destination);
        freq = new Uint8Array(analyser.frequencyBinCount);
      } catch (e) { ctx = gain = analyser = freq = null; }
    }
    if (!gain) audio.volume = 0;
    audio.addEventListener("error", () => { playing = false; wanted = false; ui(); if (btn) btn.hidden = true; }); // no se encontró el archivo
  };

  const fadeTo = (target, secs) => {
    clearInterval(fadeTimer);
    if (gain && ctx) {
      const t = ctx.currentTime;
      gain.gain.cancelScheduledValues(t);
      gain.gain.setValueAtTime(gain.gain.value, t);
      gain.gain.linearRampToValueAtTime(target, t + secs);
      return;
    }
    const from = audio.volume, t0 = performance.now();
    fadeTimer = setInterval(() => {
      const k = Math.min(1, (performance.now() - t0) / (secs * 1000));
      audio.volume = from + (target - from) * k;
      if (k >= 1) clearInterval(fadeTimer);
    }, 50);
  };

  const start = async () => {
    build();
    clearTimeout(stopTimer);
    try {
      if (ctx && ctx.state === "suspended") await ctx.resume();
      await audio.play();
      playing = true;
      fadeTo(level(), 1.5);
      ui(); wake();
      return true;
    } catch (e) { playing = false; ui(); return false; } // el navegador aún no deja sonar: se intenta en el siguiente toque
  };
  const stop = () => {
    if (!audio) return;
    playing = false;
    fadeTo(0, 0.4);
    clearTimeout(stopTimer);
    stopTimer = setTimeout(() => { if (!playing) audio.pause(); }, 450);
    ui();
  };

  if (music.on) {
    let pref = null;
    try { pref = localStorage.getItem(PREF_KEY); } catch (e) { /* sin almacenamiento */ }
    wanted = pref ? pref === "on" : !!M.auto;

    btn = document.createElement("button");
    btn.type = "button";
    btn.className = "music";
    btn.innerHTML = '<span class="music__eq" aria-hidden="true"><i></i><i></i><i></i><i></i></span>';
    document.body.appendChild(btn);
    btn.addEventListener("click", () => {
      wanted = !playing;
      ducked = false;
      try { localStorage.setItem(PREF_KEY, wanted ? "on" : "off"); } catch (e) { /* sin almacenamiento */ }
      if (tip) { tip.remove(); tip = null; }
      if (wanted) start(); else stop();
    });

    // Los navegadores no dejan sonar nada hasta que el visitante toca la página:
    // la música empieza sola en su primer toque (si no la apagó antes)
    const skip = ".music, video, .yt, .tk, [data-vurl], dialog";
    const events = ["click", "touchend", "keydown"];
    const off = () => events.forEach((ev) => removeEventListener(ev, first, true));
    async function first(e) {
      if (!wanted || playing) return off();
      if (e.target && e.target.closest && e.target.closest(skip)) return;
      if (await start()) {
        off();
        if (!pref) { // aviso la primera vez, para que sepan dónde apagarla
          tip = document.createElement("p");
          tip.className = "music__tip";
          tip.textContent = "Música encendida · toca aquí para apagarla";
          document.body.appendChild(tip);
          setTimeout(() => { if (tip) { tip.remove(); tip = null; } }, 5200);
        }
      }
    }
    events.forEach((ev) => addEventListener(ev, first, true));

    // Si se reproduce un video, la música se detiene y vuelve al terminar
    const duck = () => { if (playing) { ducked = true; stop(); } };
    const unduck = () => { if (ducked && wanted && !document.hidden) { ducked = false; start(); } };
    const videoPlaying = () => $$("video").some((v) => !v.paused && !v.ended);
    document.addEventListener("play", (e) => { if (e.target.tagName === "VIDEO") duck(); }, true);
    ["pause", "ended"].forEach((ev) => document.addEventListener(ev, (e) => {
      if (e.target.tagName === "VIDEO") setTimeout(() => { if (!videoPlaying() && !$("dialog[open] iframe")) unduck(); }, 350);
    }, true));
    document.addEventListener("click", (e) => { if (e.target.closest && e.target.closest(".yt button, [data-vurl]")) duck(); }, true);
    const lb = $("#lightbox");
    if (lb) lb.addEventListener("close", () => setTimeout(() => { if (!videoPlaying()) unduck(); }, 200));

    // Al cambiar de pestaña o bloquear el celular, se pausa
    document.addEventListener("visibilitychange", () => {
      if (document.hidden) { if (playing) { hiddenPause = true; audio.pause(); playing = false; ui(); } }
      else if (hiddenPause) { hiddenPause = false; if (wanted && !ducked) start(); }
    });
    ui();
  }

  /* ================= EFECTOS VISUALES ================= */
  let wake = () => {};
  if (reduce) return; // con "reducir movimiento" se queda la página sin animaciones
  root.classList.add("fx");

  /* ---------- Barra de avance en forma de ondas ---------- */
  const cv = document.createElement("canvas");
  cv.className = "wave";
  cv.setAttribute("aria-hidden", "true");
  document.body.appendChild(cv);
  const g = cv.getContext("2d");
  const H = 16, STEP = 5, BAR = 3;
  let W = 0, dpr = 1, prog = 0, energy = 0, tick = 0, raf = 0, lastY = scrollY;
  const size = () => {
    dpr = Math.min(2, window.devicePixelRatio || 1);
    W = innerWidth;
    cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
    wake();
  };
  const draw = () => {
    raf = 0; tick++;
    g.clearRect(0, 0, cv.width, cv.height);
    const filled = prog * W, n = Math.ceil(filled / STEP);
    const live = playing && analyser;
    if (live) analyser.getByteFrequencyData(freq);
    for (let i = 0; i < n; i++) {
      const x = i * STEP;
      let a;
      if (live) { const v = freq[3 + ((i * 11) % 80)] / 255; a = Math.max(0.14, v * v); } // sigue a la música
      else a = 0.14 + 0.86 * energy * (0.5 + 0.5 * Math.sin(i * 0.55 + tick * 0.24)) * (0.55 + 0.45 * Math.sin(i * 0.17 - tick * 0.11));
      const h = Math.max(2, a * H);
      g.fillStyle = filled - x < 36 ? "#a9c4ff" : "#2563ff"; // la punta, más clara
      g.fillRect(Math.round(x * dpr), 0, Math.round(BAR * dpr), Math.round(h * dpr));
    }
    energy *= 0.93;
    if (energy > 0.02 || playing) raf = requestAnimationFrame(draw);
  };
  wake = () => { if (!raf) raf = requestAnimationFrame(draw); };
  const onScroll = () => {
    const max = root.scrollHeight - innerHeight, y = scrollY;
    prog = max > 0 ? Math.min(1, y / max) : 0;
    energy = Math.min(1, energy + Math.abs(y - lastY) / 50);
    lastY = y;
    // La foto de la portada se mueve más lento que la página
    if (y < innerHeight * 1.3) root.style.setProperty("--hero-y", Math.round(y * 0.22) + "px");
    wake();
  };
  addEventListener("scroll", onScroll, { passive: true });
  addEventListener("resize", size);
  size(); onScroll();

  /* ---------- Onda al tocar botones y tarjetas ---------- */
  const touchable = "a, button, summary, label, .pack, .g, .extra, .opt, .qx";
  addEventListener("click", (e) => {
    if (!e.clientX && !e.clientY) return; // clic con teclado
    if (!e.target.closest || !e.target.closest(touchable)) return;
    const r = document.createElement("span");
    r.className = "tap";
    r.style.left = e.clientX + "px";
    r.style.top = e.clientY + "px";
    document.body.appendChild(r);
    setTimeout(() => r.remove(), 750);
  }, true);

  /* ---------- Estrellas de las reseñas: una por una ---------- */
  $$(".reviews__stars, .opin__stars").forEach((box) => {
    const dim = $("i", box); // estrellas apagadas (calificación menor a 5)
    const lit = [...box.childNodes].filter((n) => n.nodeType === 3).map((n) => n.textContent).join("");
    box.replaceChildren(...[...lit].map((ch, i) => {
      const s = document.createElement("span");
      s.textContent = ch;
      s.style.setProperty("--i", i);
      return s;
    }), ...(dim ? [dim] : []));
  });

  /* ---------- Avisar a los estilos cuando algo entra en pantalla ---------- */
  // .lit = tarjetas que reciben una luz que recorre su borde
  $$(".pack, .extra, .steps li, .always li, .finder, .reviews, .jump a, .deal, .compare, .kids__photo").forEach((el) => el.classList.add("lit"));
  const watch = $$(".section, .lit, .g, .steps, .opin li, .head, .cta__box, .pgroup__head");
  watch.forEach((el) => {
    const sibs = el.parentElement ? [...el.parentElement.children] : [];
    el.style.setProperty("--fx-i", Math.min(sibs.indexOf(el), 8));
  });
  if ("IntersectionObserver" in window) {
    const io = new IntersectionObserver((es) => es.forEach((e) => {
      if (e.isIntersecting) { e.target.classList.add("seen"); io.unobserve(e.target); }
    }), { threshold: 0.01, rootMargin: "0px 0px -12% 0px" });
    watch.forEach((el) => io.observe(el));
  } else watch.forEach((el) => el.classList.add("seen"));
})();
