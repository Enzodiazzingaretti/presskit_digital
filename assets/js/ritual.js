/* =====================================================================
   KEXXY — ZINE N°01 · lógica del presskit
   - Textos y datos salen de content.json y dates.json (los edita el panel /admin.html).
   - ES vive en el HTML; EN/PT llegan desde content.json.
   - Los sets muestran solo lo que dice SoundCloud (vía /api/sc).
   - Todo late a 150 BPM: el CSS anima con .is-live y los WebGL usan el mismo reloj.
   ===================================================================== */
(() => {
  'use strict';

  const D = document;
  const root = D.documentElement;
  const $ = (s, el) => (el || D).querySelector(s);
  const $$ = (s, el) => Array.from((el || D).querySelectorAll(s));
  const RM = window.matchMedia('(prefers-reduced-motion: reduce)');
  const reduced = () => RM.matches;
  const BEAT = 0.4;
  const TZ = 'America/Argentina/Mendoza';
  const SCRIPT_URL = (D.currentScript && D.currentScript.src) || location.href;
  const LIVE = '/api/public?file=';

  // H.264 donde se pueda (Safari, Chrome, Edge); VP9 si el navegador no trae ese códec
  const CAN_MP4 = (() => {
    try { const v = D.createElement('video'); return !!(v.canPlayType && v.canPlayType('video/mp4; codecs="avc1.64001F"')); } catch (e) { return false; }
  })();
  const videoSrc = (name) => 'assets/video/' + name + (CAN_MP4 ? '.mp4' : '.webm');

  const store = {
    get(kind, k) { try { return window[kind].getItem(k); } catch (e) { return null; } },
    set(kind, k, v) { try { window[kind].setItem(k, v); } catch (e) { /* modo privado */ } }
  };

  const el = (tag, cls, text) => {
    const n = D.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  };
  const pad2 = (n) => String(n).padStart(2, '0');
  const track = (name, data) => {
    try { if (typeof window.gtag === 'function') window.gtag('event', name, data || {}); } catch (e) { /* sin analytics */ }
  };
  // azar con semilla: el mismo texto siempre se recorta igual
  const hashStr = (s) => { let h = 2166136261; for (const c of String(s)) { h ^= c.codePointAt(0); h = Math.imul(h, 16777619); } return h >>> 0; };
  const seeded = (seed) => { let s = (seed >>> 0) || 1; return () => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 4294967296; }; };

  /* =====================================================================
     TEXTOS (i18n)
     ===================================================================== */
  let content = null;
  let dates = null;
  let lang = 'es';
  let langs = ['es', 'en', 'pt'];

  // El español de base es el que está escrito en el HTML.
  const BASE = {};
  $$('[data-i18n]').forEach((n) => {
    const k = n.dataset.i18n;
    if (!(k in BASE)) BASE[k] = n.hasAttribute('data-i18n-html') ? n.innerHTML.trim() : n.textContent.trim();
  });
  $$('[data-i18n-placeholder]').forEach((n) => { BASE[n.dataset.i18nPlaceholder] = n.placeholder; });
  $$('[data-i18n-title]').forEach((n) => { BASE[n.dataset.i18nTitle] = n.title; });

  function t(key) {
    const d = content && content.i18n;
    const pick = (l) => {
      const v = d && d[l] && d[l][key];
      return v != null && String(v).trim() !== '' ? String(v) : null;
    };
    return pick(lang) || pick('es') || (BASE[key] != null ? BASE[key] : '');
  }

  const ALLOWED = { EM: 1, BR: 1, STRONG: 1, B: 1, I: 1, SPAN: 1 };
  function clean(node) {
    Array.from(node.childNodes).forEach((n) => {
      if (n.nodeType === 1) {
        if (!ALLOWED[n.tagName]) { n.replaceWith(D.createTextNode(n.textContent)); return; }
        Array.from(n.attributes).forEach((a) => n.removeAttribute(a.name));
        clean(n);
      } else if (n.nodeType !== 3) {
        n.remove();
      }
    });
  }
  function setRich(node, html) {
    const tpl = D.createElement('template');
    tpl.innerHTML = html;
    clean(tpl.content);
    node.replaceChildren(tpl.content);
  }
  function plain(s) {
    if (!/[<&]/.test(s)) return s;
    const tpl = D.createElement('template');
    tpl.innerHTML = s;
    return tpl.content.textContent;
  }

  function applyTexts() {
    $$('[data-i18n]').forEach((n) => {
      const v = t(n.dataset.i18n);
      if (n.hasAttribute('data-i18n-html')) setRich(n, v);
      else n.textContent = plain(v);
      if (n.hasAttribute('data-ransom')) ransom(n);
    });
    $$('[data-i18n-placeholder]').forEach((n) => { n.placeholder = plain(t(n.dataset.i18nPlaceholder)); });
    $$('[data-i18n-title]').forEach((n) => { n.title = plain(t(n.dataset.i18nTitle)); });
  }

  /* textos compuestos: se separan por / , . · y se unen con barras rojas */
  function slashList(node, text, sep) {
    const parts = String(text).split(sep).map((s) => s.trim()).filter(Boolean);
    node.replaceChildren();
    parts.forEach((p, i) => {
      if (i) { node.append(' '); node.append(el('em', null, '/')); node.append(' '); }
      node.append(p.replace(/-/g, '‑'));
    });
  }

  /* =====================================================================
     TÍTULOS TIPO NOTA DE RESCATE: cada letra recortada de otra revista
     ===================================================================== */
  const RCUTS = ['r1', 'r2', 'r2', 'r1', 'r3', 'r4', 'r5', 'r6', 'r2', 'r7', 'r8', 'r1'];
  function ransom(node) {
    const text = node.textContent.replace(/\s+/g, ' ').trim();
    if (!text) return;
    node.setAttribute('aria-label', text);
    const r = seeded(hashStr(text));
    let k = 0;
    let last = '';
    const frag = D.createDocumentFragment();
    text.split(' ').forEach((word) => {
      const w = el('span', 'rw');
      w.setAttribute('aria-hidden', 'true');
      Array.from(word).forEach((ch) => {
        let cut = RCUTS[Math.floor(r() * RCUTS.length)];
        if (cut === last) cut = RCUTS[(RCUTS.indexOf(cut) + 1 + Math.floor(r() * 4)) % RCUTS.length];
        last = cut;
        const s = el('span', 'rl ' + cut, ch);
        s.style.setProperty('--rot', ((r() - 0.5) * 12).toFixed(1) + 'deg');
        s.style.setProperty('--dy', ((r() - 0.5) * 0.12).toFixed(3) + 'em');
        s.style.setProperty('--sc', (0.9 + r() * 0.2).toFixed(2));
        s.style.setProperty('--k', k++);
        w.append(s);
      });
      frag.append(w);
    });
    node.replaceChildren(frag);
  }

  /* =====================================================================
     AJUSTE DE TEXTOS: nada se corta a mitad de palabra ni se sale
     ===================================================================== */
  function fitLine(node, min) {
    node.style.fontSize = '';
    let size = parseFloat(getComputedStyle(node).fontSize);
    let guard = 60;
    while (node.scrollWidth > node.clientWidth + 1 && size > min && guard--) {
      size -= size > 40 ? 2 : 1;
      node.style.fontSize = size + 'px';
    }
  }
  function fitWords(node, min, slack) {
    node.style.fontSize = '';
    let size = parseFloat(getComputedStyle(node).fontSize);
    let guard = 60;
    const tol = slack || 1;
    while (node.scrollWidth > node.clientWidth + tol && size > min && guard--) {
      size -= size > 40 ? 2 : 1;
      node.style.fontSize = size + 'px';
    }
  }
  function fitTexts() {
    $$('.ransom').forEach((h) => fitWords(h, 22, 10));
    $$('.booking__title').forEach((h) => fitLine(h, 30));
    $$('.poster__venue, .tape-set__title, .lineup, .stickers li, .bio__lead, .cover__genres, .checks dd, .stat dd, .reels__list a').forEach((n) => fitWords(n, 12));
  }
  let fitTimer = 0;
  window.addEventListener('resize', () => { clearTimeout(fitTimer); fitTimer = setTimeout(fitTexts, 120); });

  /* =====================================================================
     DATOS: links del artista, imágenes, secciones, stats, géneros, productoras
     ===================================================================== */
  const SECTIONS = {
    listen: { sec: '#sets' },
    dates: { sec: '#dates' },
    bio: { sec: '#bio' },
    live: { sec: '#live' },
    rider: { sec: '#rider' }
  };

  function sectionOn(key) {
    const s = content && content.sections;
    return !s || s[key] !== false;
  }

  function applySections() {
    Object.keys(SECTIONS).forEach((key) => {
      const on = sectionOn(key);
      const conf = SECTIONS[key];
      const sec = $(conf.sec);
      if (sec) sec.hidden = !on;
      $$('.top__nav a[href="' + conf.sec + '"], .menu__nav a[href="' + conf.sec + '"]').forEach((a) => { a.hidden = !on; });
    });
    const about = $('.about');
    if (about) about.hidden = !sectionOn('about');
    // sin sección de sets, "Escuchar" lleva directo a SoundCloud
    const listen = $('.cover__ctas a[href="#sets"]');
    const sc = content && content.artist && content.artist.socials && content.artist.socials.soundcloud;
    if (listen && !sectionOn('listen') && sc) { listen.href = sc; listen.target = '_blank'; listen.rel = 'noopener'; }
  }

  // las fotos que sube el panel (img/…) se leen en vivo del repo: así aparecen sin esperar un deploy
  const asset = (p) => (/^img\/[a-z0-9-]+\.webp$/i.test(String(p)) ? LIVE + encodeURIComponent(p) : String(p));
  function applyImages() {
    const im = (content && content.images) || {};
    if (im.hero) {
      $('#heroBg').src = asset(im.hero);
      // la tapa en dotwork es la impresión propia; una foto subida desde el panel se imprime en xerox
      $('#hero').classList.toggle('is-photo', !/cover-ink\.webp$/i.test(im.hero));
    }
    if (im.bio) $('#bioImg').src = asset(im.bio);
    if (im.live) $('#liveImg').src = asset(im.live);
    if (im.riderDiagram) $('#riderDiagram').src = asset(im.riderDiagram);
  }

  const handle = (url) => {
    try {
      const p = new URL(url).pathname.split('/').filter(Boolean);
      const h = p[0] || '';
      return h ? (h.charAt(0) === '@' ? h : '@' + h) : '';
    } catch (e) { return ''; }
  };

  function applyArtist() {
    const a = (content && content.artist) || {};
    const s = a.socials || {};
    const map = { soundcloud: s.soundcloud, instagram: s.instagram, youtube: s.youtube, presskit: a.pressKit, portfolio: a.portfolio };
    Object.keys(map).forEach((k) => {
      $$('[data-link="' + k + '"]').forEach((n) => {
        const url = (map[k] || '').trim();
        const li = n.closest('.channels li');
        if (!url) { (li || n).hidden = true; return; }
        (li || n).hidden = false;
        n.href = url;
      });
    });
    if (a.email) {
      $$('[data-link="email"]').forEach((n) => { n.href = 'mailto:' + a.email; });
      $$('[data-text="email"]').forEach((n) => { n.textContent = a.email; });
    }
    if (s.instagram) $$('[data-text="instagram"]').forEach((n) => { n.textContent = handle(s.instagram) + ' ↗'; });
    if (s.youtube) $$('[data-text="youtube"]').forEach((n) => { n.textContent = handle(s.youtube) + ' ↗'; });
    const foot = $('.about__foot');
    if (foot) foot.hidden = !(a.portfolio && a.portfolio.trim());
  }

  function applyStats() {
    const st = (content && content.stats) || {};
    $$('[data-stat]').forEach((n) => {
      const v = st[n.dataset.stat];
      if (v) n.textContent = String(v);
    });
  }

  function applyGenres() {
    const g = (content && Array.isArray(content.genres) && content.genres.length) ? content.genres : null;
    if (!g) return;
    const tick = $('#ticker');
    if (tick) {
      tick.replaceChildren();
      for (let r = 0; r < 4; r++) g.forEach((name) => { tick.append(el('span', null, String(name).toUpperCase()), el('i', null, '✕')); });
    }
    const chips = $('#genreChips');
    if (chips) {
      chips.replaceChildren();
      g.forEach((name) => chips.append(el('span', 'chip', name)));
    }
  }

  // productoras como stickers pegados: forma, color y ángulo distintos en cada uno
  function applyPromoters() {
    const list = (content && Array.isArray(content.promoters)) ? content.promoters.filter((p) => p && p.name) : null;
    if (!list) return;
    const grid = $('#hotcues');
    const freq = {};
    list.forEach((p) => { const m = (p.meta || '').trim(); if (m) freq[m] = (freq[m] || 0) + 1; });
    const home = Object.keys(freq).sort((x, y) => freq[y] - freq[x])[0];
    const r = seeded(hashStr(list.map((p) => p.name).join('|')));
    grid.replaceChildren();
    list.forEach((p, i) => {
      const li = el('li', 's' + (1 + ((i * 2 + Math.floor(r() * 2)) % 5)));
      li.style.setProperty('--rot', ((r() - 0.5) * 14).toFixed(1) + 'deg');
      li.style.setProperty('--i', i);
      const meta = (p.meta || '').trim();
      li.append(el('span', 'n', p.name));
      // la ciudad solo se anota cuando no es la de casa
      if (home && meta && meta !== home) { li.classList.add('is-away'); li.append(el('sup', 'm', meta)); }
      grid.append(li);
    });
    $('#hotcueCount').textContent = pad2(list.length);
    requestAnimationFrame(fitTexts);
    const cities = Object.keys(freq);
    if (cities.length) $('#liveCities').textContent = cities.join(' · ');
  }

  function applyComposed() {
    const hg = $('#heroGenres');
    if (hg) slashList(hg, t('hero.subtitle'), /[./·|]+/);
    const bt = $('.booking__title');
    if (bt) {
      const v = plain(t('contact.title')).trim();
      const m = v.match(/^([\s\S]*?)([.!?¡¿…]+)$/);
      bt.replaceChildren();
      if (m && m[1]) { bt.append(m[1]); bt.append(el('em', null, m[2])); } else bt.textContent = v;
    }
    // compartí cabina con: line-up de flyer, un nombre por renglón
    const sh = $('#sharedNames');
    if (sh) {
      const names = String(t('live.shared')).split(/[,/·|]+/).map((s) => s.trim()).filter(Boolean);
      sh.replaceChildren();
      names.forEach((n, i) => {
        if (i) { const x = el('span', 'x', '✕'); x.setAttribute('aria-hidden', 'true'); sh.append(x); }
        sh.append(el('span', null, n));
      });
    }
    const riderWrap = $('#rider .wrap');
    if (riderWrap) {
      const a = (content && content.artist) || {};
      riderWrap.setAttribute('data-print-foot', ['KEXXY', a.email, location.host].filter(Boolean).join(' · '));
    }
  }

  /* =====================================================================
     I · SETS: título, portada, género, duración, fecha y forma de onda,
     tal cual están en SoundCloud. Se escuchan con el widget oficial.
     ===================================================================== */
  const decks = [];
  let scApi = null;

  const ytId = (url) => {
    const s = String(url || '').trim();
    const m = s.match(/(?:youtu\.be\/|v=|\/embed\/|\/shorts\/|\/live\/)([A-Za-z0-9_-]{6,})/);
    if (m) return m[1];
    return /^[A-Za-z0-9_-]{6,}$/.test(s) ? s : null;
  };
  const pickText = (v) => {
    if (v == null) return '';
    if (typeof v === 'string') return v;
    return v[lang] || v.es || v[Object.keys(v).find((k) => v[k])] || '';
  };
  const fmtTime = (ms) => {
    const s = Math.max(0, Math.round(ms / 1000));
    const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), r = s % 60;
    return (h ? h + ':' + pad2(m) : pad2(m)) + ':' + pad2(r);
  };
  const fmtDate = (iso) => {
    const d = new Date(iso);
    if (isNaN(d)) return '';
    const p = new Intl.DateTimeFormat('en-GB', { timeZone: TZ, day: '2-digit', month: '2-digit', year: '2-digit' }).formatToParts(d);
    const g = (k) => (p.find((x) => x.type === k) || {}).value;
    return g('day') + '.' + g('month') + '.' + g('year');
  };

  function svgPlay() {
    const NS = 'http://www.w3.org/2000/svg';
    const s = D.createElementNS(NS, 'svg');
    s.setAttribute('viewBox', '0 0 10 12'); s.setAttribute('aria-hidden', 'true');
    const p = D.createElementNS(NS, 'path'); p.setAttribute('d', 'M0 0 L10 6 L0 12 Z');
    s.append(p);
    s._p = p;
    return s;
  }
  const tapeEl = (k) => { const s = el('span', 'tape tape--' + k); s.setAttribute('aria-hidden', 'true'); return s; };
  const barsCount = () => (window.innerWidth < 700 ? 64 : 110);

  function drawWave(d, samples) {
    const n = barsCount();
    d.wave.replaceChildren();
    d.bars = [];
    const peaks = [];
    for (let i = 0; i < n; i++) {
      let h = 0;
      if (samples && samples.length) {
        const a = Math.floor(i * samples.length / n), b = Math.max(a + 1, Math.floor((i + 1) * samples.length / n));
        for (let j = a; j < b; j++) h = Math.max(h, samples[j] || 0);
      }
      peaks.push(h);
    }
    // los sets de techno vienen comprimidos: se estira el rango para que se vean los cortes y los breaks
    const lo = Math.min.apply(null, peaks), hi = Math.max.apply(null, peaks);
    for (let i = 0; i < n; i++) {
      const v = hi > lo ? 0.1 + 0.9 * Math.pow((peaks[i] - lo) / (hi - lo), 1.6) : 0.3;
      const bar = el('i');
      bar.style.setProperty('--h', Math.max(0.06, v).toFixed(2));
      bar.style.setProperty('--k', i);
      d.wave.append(bar);
      d.bars.push(bar);
    }
    progress(d, d.pos || 0);
  }
  function progress(d, p) {
    d.pos = p;
    if (!d.bars) return;
    const on = Math.round(p * d.bars.length);
    d.bars.forEach((b, i) => b.classList.toggle('on', i < on));
  }

  function buildDecks() {
    const box = $('#decks');
    if (!box) return;
    const sets = ((content && content.sets) || []).map((s) => (typeof s === 'string' ? s : s && s.url)).filter(Boolean);
    decks.length = 0;
    box.replaceChildren();
    sets.forEach((url, i) => {
      const d = { i, url, info: null, widget: null, playing: false, started: false, dur: 0, pos: 0, seek: null };
      const art = el('article', 'tape-set');
      art.style.setProperty('--i', i);
      const sleeve = el('div', 'tape-set__sleeve');
      const vinyl = el('span', 'tape-set__vinyl');
      vinyl.setAttribute('aria-hidden', 'true');
      const cover = el('a', 'tape-set__art is-empty');
      cover.href = url; cover.target = '_blank'; cover.rel = 'noopener'; cover.tabIndex = -1;
      cover.setAttribute('aria-hidden', 'true');
      cover.style.setProperty('--rot', (i % 2 ? 2.5 : -3) + 'deg');
      const img = el('img');
      img.alt = ''; img.loading = 'lazy'; img.decoding = 'async'; img.width = 500; img.height = 500; img.hidden = true;
      img.addEventListener('load', () => { img.hidden = false; cover.classList.remove('is-empty'); });
      cover.append(img, tapeEl('a'), tapeEl('b'));
      sleeve.append(vinyl, cover);

      const body = el('div', 'tape-set__body');
      const meta = el('p', 'tape-set__meta');
      meta.append(el('span', null, 'SET ' + pad2(i + 1)));
      const title = el('h3', 'tape-set__title');
      const tl = el('a', null, 'SoundCloud');
      tl.href = url; tl.target = '_blank'; tl.rel = 'noopener';
      title.append(tl);
      const desc = el('p', 'tape-set__desc');
      desc.hidden = true;
      const wave = el('div', 'wavebar');
      wave.setAttribute('aria-hidden', 'true');
      wave.dataset.loading = '';
      const ctrl = el('div', 'tape-set__ctrl');
      const btn = el('button', 'playbtn');
      btn.type = 'button';
      btn.append(svgPlay());
      const time = el('span', 'tape-set__time', '--:--');
      const state = el('span', 'tape-set__state');
      state.hidden = true;
      const open = el('a', 'linkline tape-set__open');
      open.href = url; open.target = '_blank'; open.rel = 'noopener';
      ctrl.append(btn, time, state, open);
      const player = el('div', 'tape-set__player');
      body.append(meta, title, desc, wave, ctrl, player);
      art.append(sleeve, body);
      box.append(art);

      Object.assign(d, { art, img, cover, meta, title: tl, desc, wave, btn, time, state, open, player });
      drawWave(d, null);
      btn.addEventListener('click', () => toggleDeck(d));
      wave.addEventListener('click', (e) => {
        const r = wave.getBoundingClientRect();
        seekDeck(d, Math.min(1, Math.max(0, (e.clientX - r.left) / r.width)));
      });
      decks.push(d);
      fetchSet(d);
    });
    box.classList.add('stagger');
    buildReels(((content && content.videos) || []).filter(Boolean));
    textDecks();
    if (revealObs) revealObs.observe(box); else box.classList.add('is-in');
  }

  function fillSet(d, s) {
    d.info = s;
    if (s.title) d.title.textContent = s.title;
    if (s.permalink) { d.title.href = s.permalink; d.open.href = s.permalink; d.cover.href = s.permalink; }
    if (s.artwork) { d.img.src = s.artwork; }
    const parts = ['SET ' + pad2(d.i + 1)];
    if (s.genre) parts.push(s.genre);
    if (s.duration) { parts.push(fmtTime(s.duration)); d.dur = d.dur || s.duration; }
    if (s.date) { const f = fmtDate(s.date); if (f) parts.push(f); }
    d.meta.replaceChildren(...parts.map((p) => el('span', null, p)));
    const desc = String(s.description || '').trim();
    d.desc.textContent = desc.length > 420 ? desc.slice(0, 400).replace(/\s+\S*$/, '') + '…' : desc;
    d.desc.hidden = !desc;
    if (s.wave && s.wave.length) {
      d.samples = s.wave;
      delete d.wave.dataset.loading;
      drawWave(d, s.wave);
    }
    if (d.dur && !d.started) d.time.textContent = fmtTime(d.dur);
    textDecks();
    requestAnimationFrame(fitTexts);
  }

  function fetchSet(d) {
    const ctrl = typeof AbortController === 'function' ? new AbortController() : null;
    const timer = ctrl ? setTimeout(() => ctrl.abort(), 9000) : 0;
    fetch('/api/sc?url=' + encodeURIComponent(d.url), ctrl ? { signal: ctrl.signal } : {})
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error('sc ' + r.status))))
      .then((s) => { clearTimeout(timer); fillSet(d, s); })
      .catch(() => { clearTimeout(timer); fallbackSet(d); });
  }

  // sin la API (o si SoundCloud no responde): el reproductor oficial a la vista,
  // y los datos se leen del propio widget
  function fallbackSet(d) {
    d.art.classList.add('is-fallback');
    d.wave.hidden = true;
    mountWidget(d, false);
  }

  function buildReels(vids) {
    const box = $('#reels');
    const list = $('#reelsList');
    if (!box || !list) return;
    const ok = (vids || []).filter((v) => v && ytId(v.url));
    box.hidden = !sectionOn('videos') || !ok.length;
    list.replaceChildren();
    ok.forEach((v, i) => {
      const li = el('li');
      const a = el('a');
      a.href = 'https://youtu.be/' + ytId(v.url);
      a.target = '_blank'; a.rel = 'noopener';
      a.dataset.vi = i;
      a.addEventListener('click', () => track('video_open', { video: i + 1 }));
      a.append(el('b'), el('span', null, 'YouTube ↗'));
      li.append(a);
      list.append(li);
    });
  }

  function textDecks() {
    decks.forEach((d) => {
      const name = d.title.textContent;
      const st = d.playing ? t('listen.playing') : (d.started ? t('listen.paused') : '');
      d.state.textContent = d.widget && !d.widget.api && !d.art.classList.contains('is-fallback') ? t('listen.loading') : st;
      d.state.hidden = !d.state.textContent;
      d.art.classList.toggle('is-playing', d.playing);
      d.btn.firstChild._p.setAttribute('d', d.playing ? 'M0 0 H3.5 V12 H0 Z M6.5 0 H10 V12 H6.5 Z' : 'M0 0 L10 6 L0 12 Z');
      d.btn.setAttribute('aria-label', (d.playing ? t('listen.paused') : t('hero.cta1')) + ' — ' + name);
      d.open.textContent = (t('listen.open') || 'SoundCloud') + ' ↗';
    });
    $$('#reelsList a').forEach((a) => {
      const v = (((content && content.videos) || []).filter((x) => x && ytId(x.url)))[+a.dataset.vi];
      a.firstChild.textContent = (v && pickText(v.title)) || 'Video ' + pad2(+a.dataset.vi + 1);
    });
  }

  function loadScApi() {
    if (scApi) return scApi;
    scApi = new Promise((res, rej) => {
      if (window.SC && window.SC.Widget) { res(window.SC); return; }
      const s = el('script');
      s.src = 'https://w.soundcloud.com/player/api.js';
      s.async = true;
      s.onload = () => (window.SC && window.SC.Widget ? res(window.SC) : rej(new Error('sc')));
      s.onerror = () => { scApi = null; rej(new Error('sc')); };
      D.head.append(s);
    });
    return scApi;
  }

  function mountWidget(d, autoplay) {
    if (d.widget) return;
    const f = el('iframe');
    f.title = 'SoundCloud — ' + d.title.textContent;
    f.allow = 'autoplay; encrypted-media';
    f.loading = autoplay ? 'eager' : 'lazy';
    f.src = 'https://w.soundcloud.com/player/?url=' + encodeURIComponent(d.url) +
      '&color=%23e0102d&auto_play=' + (autoplay ? 'true' : 'false') + '&hide_related=true&show_comments=false&show_user=true&show_reposts=false&show_teaser=false&show_artwork=false&visual=false';
    d.widget = { frame: f, api: null };
    d.player.append(f);
    if (autoplay) d.art.classList.add('has-player');
    textDecks();
    loadScApi().then((SC) => {
      const w = SC.Widget(f);
      const E = SC.Widget.Events;
      d.widget.api = w;
      w.bind(E.READY, () => {
        w.getDuration((ms) => { if (ms) { d.dur = ms; if (!d.started) d.time.textContent = fmtTime(ms); } });
        if (!d.info) {
          w.getCurrentSound((s) => {
            if (!s) return;
            fillSet(d, { title: s.title, artwork: s.artwork_url && s.artwork_url.replace(/-large\./, '-t500x500.'), genre: s.genre, duration: s.duration, date: s.display_date || s.created_at, description: s.description, permalink: s.permalink_url });
          });
        }
        if (d.seek != null && d.dur) { w.seekTo(d.seek * d.dur); d.seek = null; }
        textDecks();
      });
      w.bind(E.PLAY, () => {
        d.playing = true;
        d.started = true;
        d.art.classList.add('has-player');
        decks.forEach((o) => { if (o !== d && o.playing && o.widget && o.widget.api) o.widget.api.pause(); });
        textDecks();
      });
      w.bind(E.PAUSE, () => { d.playing = false; textDecks(); });
      w.bind(E.FINISH, () => { d.playing = false; textDecks(); });
      w.bind(E.PLAY_PROGRESS, (e) => {
        progress(d, e.relativePosition || 0);
        d.time.textContent = fmtTime(e.currentPosition || 0) + ' / ' + fmtTime(d.dur || 0);
      });
    }).catch(() => { d.state.textContent = 'SoundCloud ↗'; d.state.hidden = false; });
  }

  function toggleDeck(d) {
    if (d.widget && d.widget.api) {
      d.widget.api.toggle();
      return;
    }
    if (d.widget) { d.art.classList.add('has-player'); return; } // cargando
    track('deck_play', { deck: d.i + 1 });
    mountWidget(d, true);
  }

  function seekDeck(d, p) {
    progress(d, p);
    if (d.widget && d.widget.api && d.dur) {
      d.widget.api.seekTo(p * d.dur);
      if (!d.playing) d.widget.api.play();
      return;
    }
    d.seek = p;
    if (!d.widget) toggleDeck(d);
  }

  /* =====================================================================
     II · FECHAS: un afiche por fecha, pegado en la pared
     ===================================================================== */
  const todayAR = () => new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
  let dateFilter = 'all';

  function renderDates() {
    const body = $('#datesBody');
    if (!body || !dates) return;
    const today = todayAR();
    const valid = dates.filter((x) => x && /^\d{4}-\d{2}-\d{2}$/.test(String(x.date)));
    const up = valid.filter((x) => x.date >= today).sort((a, b) => a.date.localeCompare(b.date));
    const past = valid.filter((x) => x.date < today).sort((a, b) => b.date.localeCompare(a.date));
    const r = seeded(hashStr(valid.map((x) => x.date).join()));
    body.replaceChildren();
    up.concat(past).forEach((x, i) => {
      const isPast = x.date < today;
      const isToday = x.date === today;
      const [y, m, d] = x.date.split('-');
      const li = el('li', 'poster' + (isPast ? ' is-past' : '') + (isToday ? ' is-today' : ''));
      li.dataset.kind = isPast ? 'past' : 'up';
      li.style.setProperty('--rot', ((r() - 0.5) * 7).toFixed(1) + 'deg');
      li.style.setProperty('--i', i);
      const date = el('p', 'poster__date');
      date.append(el('b', null, d + '.' + m), el('span', null, y));
      const venue = el('p', 'poster__venue');
      const link = String(x.link || x.url || '').trim();
      if (/^https?:\/\//i.test(link)) {
        const a = el('a', null, x.venue || 'TBA');
        a.href = link; a.target = '_blank'; a.rel = 'noopener';
        venue.append(a);
      } else {
        venue.textContent = x.venue || 'TBA';
      }
      li.append(el('span', 'poster__label', t('dates.colDate')), date, venue, el('p', 'poster__city', x.city || ''),
        el('p', 'stamp poster__stamp', isToday ? t('dates.today') : isPast ? t('dates.past') : t('dates.upcoming')));
      body.append(li);
    });
    // el hueco para la próxima fecha: siempre al final
    const empty = el('li', 'poster poster--empty');
    empty.dataset.kind = 'empty';
    empty.style.setProperty('--rot', '1.5deg');
    empty.style.setProperty('--i', up.length + past.length);
    const cta = el('a', 'btn btn--blood');
    cta.href = '#booking';
    cta.append(el('span', null, t('dates.cta')), el('span', null, '→'));
    empty.append(el('p', null, t('dates.none')), cta);
    body.append(empty);
    body.classList.add('is-built');
    filterDates(dateFilter);
    requestAnimationFrame(fitTexts);
  }

  function filterDates(f) {
    dateFilter = f;
    $$('#dateFilters button').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.f === f)));
    $$('#datesBody > [data-kind]').forEach((r) => {
      if (r.dataset.kind === 'empty') return;
      r.hidden = !(f === 'all' || r.dataset.kind === f);
    });
  }
  $$('#dateFilters button').forEach((b) => b.addEventListener('click', () => { filterDates(b.dataset.f); track('dates_filter', { filter: b.dataset.f }); }));

  /* =====================================================================
     IDIOMA
     ===================================================================== */
  function setLang(l, user) {
    if (langs.indexOf(l) === -1) l = langs[0];
    lang = l;
    root.lang = l;
    $$('.lang__b').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.lang === l)));
    applyTexts();
    applyComposed();
    textDecks();
    renderDates();
    fitTexts();
    if (user) { store.set('localStorage', 'kexxy-lang-user', l); track('language_change', { lang: l }); }
    store.set('localStorage', 'kexxy-lang', l);
    if (navRefresh) navRefresh();
  }
  $$('.lang__b').forEach((b) => b.addEventListener('click', () => setLang(b.dataset.lang, true)));

  function resolveLangs() {
    const cfg = (content && content.languages) || {};
    const all = ['es', 'en', 'pt'];
    langs = Array.isArray(cfg.enabled) ? cfg.enabled.filter((x) => all.indexOf(x) !== -1) : all.slice();
    if (!langs.length) langs = ['es'];
    $$('.lang__b').forEach((b) => { b.hidden = langs.indexOf(b.dataset.lang) === -1; });
    $$('.lang').forEach((g) => { g.hidden = langs.length < 2; });
    const chosen = store.get('localStorage', 'kexxy-lang-user');
    if (chosen && langs.indexOf(chosen) !== -1) return chosen;
    const nav = String(navigator.language || '').toLowerCase();
    const guess = /^pt|-br$/.test(nav) ? 'pt' : /^es/.test(nav) ? 'es' : 'en';
    if (guess && langs.indexOf(guess) !== -1) return guess;
    return langs.indexOf(cfg.default) !== -1 ? cfg.default : langs[0];
  }

  /* =====================================================================
     CONTENIDO
     ===================================================================== */
  function applyIntegrations() {
    const ga = String((content && content.integrations && content.integrations.googleAnalytics) || '').trim();
    if (!ga || window.__gaLoaded) return;
    window.__gaLoaded = true;
    const s = el('script');
    s.async = true;
    s.src = 'https://www.googletagmanager.com/gtag/js?id=' + encodeURIComponent(ga);
    D.head.append(s);
    window.dataLayer = window.dataLayer || [];
    window.gtag = function () { window.dataLayer.push(arguments); };
    window.gtag('js', new Date());
    window.gtag('config', ga);
  }

  const getJSON = (url) => fetch(url, { cache: 'no-store' }).then((r) => (r.ok ? r.json() : Promise.reject(new Error(url))));
  /* Primero lo último que guardó el panel (leído del repo por /api/public, cacheado 1 min en el CDN);
     si la API no responde a tiempo o no está configurada, la copia estática del deploy. */
  function getLive(name) {
    const ctrl = typeof AbortController === 'function' ? new AbortController() : null;
    const timer = ctrl ? setTimeout(() => ctrl.abort(), 3500) : 0;
    return fetch(LIVE + encodeURIComponent(name), ctrl ? { signal: ctrl.signal } : {})
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(name))))
      .then((j) => { clearTimeout(timer); return j; })
      .catch(() => { clearTimeout(timer); return getJSON(name); });
  }

  function boot() {
    getLive('content.json').then((c) => {
      content = c;
      window.__kexxyContent = c; // el formulario y el panel lo leen
      applyIntegrations();
      const l = resolveLangs();
      applySections();
      applyImages();
      applyArtist();
      applyStats();
      applyGenres();
      applyPromoters();
      buildDecks();
      setLang(l, false);
      observeStagger();
    }).catch((e) => {
      // sin content.json la página queda en español con lo que trae el HTML
      console.error('content.json:', e);
      $$('.lang').forEach((g) => { g.hidden = true; });
      fitTexts();
    });

    getLive('dates.json').then((d) => {
      dates = Array.isArray(d) ? d : (d && Array.isArray(d.dates) ? d.dates : []);
      renderDates();
      observeStagger();
    }).catch(() => { /* queda el afiche del HTML */ });
  }

  /* =====================================================================
     REVELADO AL SCROLLEAR
     ===================================================================== */
  let revealObs = null;
  function setupReveal() {
    $$('[data-ransom]').forEach(ransom);
    if (!('IntersectionObserver' in window) || reduced()) {
      $$('[data-reveal], .sec__head, .stagger, .scribble').forEach((n) => n.classList.add('is-in'));
      return;
    }
    revealObs = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (!e.isIntersecting) return;
        e.target.classList.add('is-in');
        revealObs.unobserve(e.target);
      });
    }, { rootMargin: '0px 0px -10% 0px', threshold: 0.06 });
    $$('[data-reveal]').forEach((n) => { if (!n.closest('.cover')) revealObs.observe(n); });
    $$('.sec__head, .checks .scribble, .flyer, .slip').forEach((n) => revealObs.observe(n));
  }
  function observeStagger() {
    ['#hotcues', '#datesBody'].forEach((s) => {
      const n = $(s);
      if (!n) return;
      Array.from(n.children).forEach((c, i) => c.style.setProperty('--i', i));
      n.classList.add('stagger');
      if (revealObs) revealObs.observe(n); else n.classList.add('is-in');
    });
    const decksBox = $('#decks');
    if (decksBox && !revealObs) decksBox.classList.add('is-in');
  }

  /* =====================================================================
     NAVEGACIÓN: barra fija que se esconde mientras leés, progreso en rojo,
     número de página tipo fanzine y menú a pantalla completa en el celu.
     ===================================================================== */
  const SECTION_IDS = ['sets', 'dates', 'bio', 'live', 'rider', 'booking'];
  let navRefresh = null;
  function setupNav() {
    const top = $('#top');
    const hero = $('#hero');
    const pager = $('#pager');
    const menu = $('#menu');
    const btn = $('#menuBtn');
    const links = $$('[data-nav]');
    const para = reduced() ? [] : [
      { n: $('#coverPrint'), k: 0.14, box: hero },
      { n: $('#bioImg'), k: -0.05 },
      { n: $('#liveImg'), k: -0.06 }
    ].filter((p) => p.n);
    let lastY = window.scrollY;
    let current = null;
    let raf = 0;
    let pagerTimer = 0;
    const narrow = window.matchMedia('(max-width: 639px)');

    const labelOf = (id) => {
      const a = $('.top__nav a[data-nav="' + id + '"]');
      return a ? a.textContent.trim() : '';
    };
    const setCurrent = (id, force) => {
      if (id === current && !force) return;
      current = id;
      links.forEach((a) => a.classList.toggle('is-on', a.dataset.nav === id));
      if (pager) {
        pager.classList.toggle('is-on', !!id);
        if (id) {
          $('#pagerN').textContent = pad2(SECTION_IDS.indexOf(id) + 1);
          $('#pagerT').textContent = labelOf(id);
        }
        // en el celu el número de página aparece al cambiar de sección y se va solo
        clearTimeout(pagerTimer);
        if (id && narrow.matches) pagerTimer = setTimeout(() => pager.classList.remove('is-on'), 1800);
      }
    };
    navRefresh = () => setCurrent(current, true);

    const frame = () => {
      raf = 0;
      const y = window.scrollY;
      const vh = window.innerHeight;
      const max = Math.max(1, D.documentElement.scrollHeight - vh);
      const p = Math.min(1, Math.max(0, y / max));
      const heroH = hero ? hero.offsetHeight : vh;
      if (top) {
        top.style.setProperty('--p', p.toFixed(4));
        top.classList.toggle('is-solid', y > heroH * 0.6);
        if (y > heroH && y > lastY + 4) top.classList.add('is-away');
        else if (y < lastY - 4 || y <= heroH) top.classList.remove('is-away');
      }
      let id = '';
      SECTION_IDS.forEach((s) => {
        const n = D.getElementById(s);
        if (n && !n.hidden && n.getBoundingClientRect().top < vh * 0.45) id = s;
      });
      setCurrent(id);
      if (pager) pager.classList.toggle('is-end', y > max - 260);
      para.forEach((q) => {
        const box = q.box || q.n.parentElement;
        const r = box.getBoundingClientRect();
        if (r.bottom < 0 || r.top > vh) return;
        const off = q.box ? y : (r.top + r.height / 2 - vh / 2);
        q.n.style.translate = '0 ' + (off * q.k).toFixed(1) + 'px';
      });
      lastY = y;
    };
    const onScroll = () => { if (!raf) raf = requestAnimationFrame(frame); };
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    frame();

    if (menu && btn) {
      const open = (on) => {
        btn.setAttribute('aria-expanded', String(on));
        const lbl = $('span', btn);
        if (lbl) lbl.textContent = on ? (t('nav.close') || 'Cerrar') : t('nav.menu');
        top.classList.toggle('is-menu', on);
        root.classList.toggle('menu-lock', on);
        if (on) {
          menu.hidden = false;
          $$('.menu__nav a', menu).forEach((a, i) => a.style.setProperty('--i', i));
          requestAnimationFrame(() => requestAnimationFrame(() => menu.classList.add('is-open')));
          const first = $('.menu__nav a:not([hidden])', menu);
          if (first) setTimeout(() => first.focus({ preventScroll: true }), 60);
        } else {
          menu.classList.remove('is-open');
          setTimeout(() => { if (btn.getAttribute('aria-expanded') === 'false') menu.hidden = true; }, 380);
        }
      };
      btn.addEventListener('click', () => open(btn.getAttribute('aria-expanded') !== 'true'));
      $$('a', menu).forEach((a) => a.addEventListener('click', () => open(false)));
      D.addEventListener('keydown', (e) => { if (e.key === 'Escape' && btn.getAttribute('aria-expanded') === 'true') { open(false); btn.focus(); } });
      window.matchMedia('(min-width: 900px)').addEventListener('change', (m) => { if (m.matches) open(false); });
    }
    links.forEach((a) => a.addEventListener('click', () => track('nav_click', { section: a.dataset.nav })));
  }

  /* =====================================================================
     RELOJ A 150 BPM, PUNTERO Y WEBGL (celdas vivas + sigilo de cromo)
     ===================================================================== */
  let T0 = performance.now();
  function startLive() {
    if (reduced() || root.classList.contains('is-live')) return;
    T0 = performance.now();
    root.classList.add('is-live');
  }
  const kickNow = (now) => {
    const ph = (((now - T0) / 1000) % BEAT) / BEAT;
    return Math.exp(-ph * 6);
  };

  const pointer = { x: 0, y: 0, tx: 0, ty: 0, cx: -1, cy: -1 };
  function setupPointer() {
    window.addEventListener('pointermove', (e) => { pointer.cx = e.clientX; pointer.cy = e.clientY; }, { passive: true });
    if (reduced() || !window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;
    const logo = $('#logo');
    const hero = $('#hero');
    let raf = 0;
    const step = () => {
      raf = 0;
      pointer.x += (pointer.tx - pointer.x) * 0.08;
      pointer.y += (pointer.ty - pointer.y) * 0.08;
      if (logo && hero.getBoundingClientRect().bottom > 0) logo.style.transform = 'perspective(900px) rotateY(' + (pointer.x * 7).toFixed(2) + 'deg) rotateX(' + (-pointer.y * 5).toFixed(2) + 'deg)';
      if (Math.abs(pointer.tx - pointer.x) > 0.002 || Math.abs(pointer.ty - pointer.y) > 0.002) raf = requestAnimationFrame(step);
    };
    const go = () => { if (!raf) raf = requestAnimationFrame(step); };
    window.addEventListener('pointermove', (e) => {
      pointer.tx = (e.clientX / window.innerWidth) * 2 - 1;
      pointer.ty = (e.clientY / window.innerHeight) * 2 - 1;
      go();
    }, { passive: true });
    D.addEventListener('pointerleave', () => { pointer.tx = 0; pointer.ty = 0; pointer.cx = -1; pointer.cy = -1; go(); });
  }

  let glOK = null;
  function webglOK() {
    if (glOK != null) return glOK;
    try {
      const c = D.createElement('canvas');
      const gl = c.getContext('webgl2') || c.getContext('webgl');
      glOK = !!gl;
      const lose = gl && gl.getExtension('WEBGL_lose_context');
      if (lose) lose.loseContext();
    } catch (e) { glOK = false; }
    return glOK;
  }
  const lowPower = () => window.matchMedia('(max-width: 899px)').matches || (navigator.hardwareConcurrency || 8) <= 4;
  const saveData = () => !!(navigator.connection && navigator.connection.saveData);

  // celdas de tinta que se mueven solas, respiran con el bombo y se abren alrededor del cursor
  let cellsMod = null;
  function mountCellsOn(canvas, opts, watch, onReady) {
    if (!canvas || !webglOK() || saveData()) return;
    if (!cellsMod) cellsMod = import(new URL('cells-gl.js?v=1', SCRIPT_URL).href);
    const res = Math.min(window.devicePixelRatio || 1, 1.5) * (lowPower() ? 0.45 : 0.6);
    let g = null, visible = true, raf = 0, last = 0;
    const size = () => {
      if (!g) return;
      const r = canvas.getBoundingClientRect();
      g.setSize(Math.round(r.width * res), Math.round(r.height * res));
    };
    const draw = (now) => {
      let m = null;
      if (pointer.cx >= 0) {
        const r = canvas.getBoundingClientRect();
        if (pointer.cy >= r.top && pointer.cy <= r.bottom) m = [(pointer.cx - r.left) * res, (pointer.cy - r.top) * res];
      }
      g.render(reduced() ? 7 : (now - T0) / 1000, { mouse: m, kick: reduced() ? 0 : kickNow(now) });
    };
    const loop = (now) => {
      raf = 0;
      if (!g || !visible || D.hidden) return;
      if (now - last > (lowPower() ? 48 : 36)) { last = now; draw(now); }
      raf = requestAnimationFrame(loop);
    };
    const kick = () => { if (!raf && g && visible && !D.hidden && !reduced()) raf = requestAnimationFrame(loop); };
    cellsMod.then((m) => {
      g = m.mountCells(Object.assign({ canvas }, opts));
      size();
      draw(performance.now());
      onReady();
      if ('ResizeObserver' in window) new ResizeObserver(() => { size(); if (reduced()) draw(performance.now()); }).observe(canvas);
      new IntersectionObserver((es) => { visible = es[0].isIntersecting; kick(); }).observe(watch);
      D.addEventListener('visibilitychange', kick);
      kick();
    }).catch((e) => { console.warn('celdas WebGL:', e); });
  }

  function setupCells() {
    if (!('IntersectionObserver' in window)) return;
    const cover = $('#coverCells');
    // la tapa: arranca un toque después, para no competir con la carga
    setTimeout(() => mountCellsOn(cover, { mode: 'bottom', ink: [0.055, 0.05, 0.047], scale: 15, seed: 3 }, $('#hero'), () => root.classList.add('cells-cover')), 700);
    const closing = $('#closingCells');
    const box = $('#closing');
    if (!closing || !box) return;
    const near = new IntersectionObserver((es) => {
      if (!es[0].isIntersecting) return;
      near.disconnect();
      mountCellsOn(closing, { mode: 'ring', ink: [0.925, 0.9, 0.847], scale: 13, seed: 9 }, box, () => closing.classList.add('is-on'));
    }, { rootMargin: '700px 0px' });
    near.observe(box);
  }

  // el sigilo de cromo del cierre: three.js se baja recién cuando te acercás
  function setupGL() {
    const canvas = $('#sigilGL');
    const box = $('#closingSigil');
    const watch = $('#closing');
    if (!canvas || !box || !watch || reduced() || !('IntersectionObserver' in window) || saveData()) return;
    const near = new IntersectionObserver((es) => {
      if (!es[0].isIntersecting) return;
      near.disconnect();
      mountSigil(canvas, box, watch);
    }, { rootMargin: '900px 0px' });
    near.observe(watch);
  }
  function mountSigil(canvas, box, watch) {
    if (!webglOK()) return;
    const lp = lowPower();
    const dpr = Math.min(window.devicePixelRatio || 1, lp ? 1.5 : 2);
    let gl = null, visible = true, raf = 0, failed = false;
    const size = () => {
      if (!gl) return;
      const r = box.getBoundingClientRect();
      const w = Math.max(2, Math.round(r.width * dpr)), h = Math.max(2, Math.round(r.height * dpr));
      if (canvas.width !== w || canvas.height !== h) gl.setSize(w, h);
    };
    const loop = (now) => {
      raf = 0;
      if (!gl || !visible || D.hidden || failed) return;
      gl.render((now - T0) / 1000, { pointer: [pointer.x, pointer.y] });
      raf = requestAnimationFrame(loop);
    };
    const kick = () => { if (!raf && gl && visible && !D.hidden) raf = requestAnimationFrame(loop); };
    canvas.addEventListener('webglcontextlost', (e) => { e.preventDefault(); failed = true; box.classList.remove('gl-on'); });
    import(new URL('sigil-gl.js?v=2', SCRIPT_URL).href).then((m) => m.mountSigil({
      canvas,
      svgUrl: 'assets/brand/kexxy-sigil.svg',
      normalUrl: 'assets/gl/sigil-normal.webp',
      lowPower: lp
    })).then((g) => {
      gl = g;
      size();
      gl.render((performance.now() - T0) / 1000, {});
      requestAnimationFrame(() => box.classList.add('gl-on'));
      if ('ResizeObserver' in window) new ResizeObserver(size).observe(box);
      else window.addEventListener('resize', size);
      new IntersectionObserver((es) => { visible = es[0].isIntersecting; kick(); }).observe(watch);
      D.addEventListener('visibilitychange', kick);
      kick();
    }).catch((e) => { console.warn('sigilo WebGL:', e); });
  }

  /* =====================================================================
     INTRO: logo rojo (video) → bombo → cromo → se pega en la tapa
     ===================================================================== */
  function revealHero(fromIntro) {
    startLive();
    root.classList.add('hero-in');
    if (!fromIntro && !reduced()) $('#heroLogo').classList.add('wipe');
  }

  function runIntro() {
    if (!root.classList.contains('intro-on')) { revealHero(false); return; }
    store.set('sessionStorage', 'kx-intro', '1');
    const intro = $('#intro');
    const vid = $('#introBlood');
    const chrome = $('#introChrome');
    const flash = $('.intro__flash', intro);
    const skip = $('#introSkip');
    let stage = 0; // 0 cargando · 1 video · 2 cromo · 3 vuelo · 4 listo
    const timers = [];
    const later = (fn, ms) => { timers.push(setTimeout(fn, ms)); };

    startLive();

    function land() {
      if (stage === 4) return;
      stage = 4;
      timers.forEach(clearTimeout);
      root.classList.add('hero-in', 'logo-flown');
      root.classList.remove('intro-on');
      intro.remove();
      D.removeEventListener('keydown', onKey);
    }
    function skipAll() {
      if (stage >= 4) return;
      if (stage < 3) revealHero(true);
      land();
    }
    function onKey(e) {
      if (e.key === 'Escape' || e.key === 'Enter' || e.key === ' ') { e.preventDefault(); skipAll(); }
    }
    skip.tabIndex = 0;
    skip.addEventListener('click', skipAll);
    intro.addEventListener('click', (e) => { if (e.target !== skip) skipAll(); });
    D.addEventListener('keydown', onKey);

    // el logo vuela y gira hasta quedar pegado (la tapa lo tiene torcido)
    function fly() {
      if (stage >= 3) return;
      stage = 3;
      const mast = $('#heroLogo');
      const a = chrome.getBoundingClientRect();
      const b = mast.getBoundingClientRect();
      intro.classList.add('is-open');
      revealHero(true);
      if (!a.width || !b.width || !chrome.animate) { later(land, 600); return; }
      let angle = 0;
      try { const mt = new DOMMatrixReadOnly(getComputedStyle(mast).transform); angle = Math.atan2(mt.b, mt.a) * 180 / Math.PI; } catch (e) { angle = 0; }
      const s = mast.offsetWidth / a.width;
      const dx = (b.left + b.width / 2) - (a.left + a.width / 2);
      const dy = (b.top + b.height / 2) - (a.top + a.height / 2);
      chrome.style.transformOrigin = '50% 50%';
      const anim = chrome.animate([
        { transform: 'translate(0px, 0px) scale(1) rotate(0deg)' },
        { transform: 'translate(' + dx + 'px, ' + dy + 'px) scale(' + s + ') rotate(' + angle + 'deg)' }
      ], { duration: 820, easing: 'cubic-bezier(.7, 0, .2, 1)', fill: 'forwards' });
      anim.onfinish = land;
      later(land, 1200);
    }

    function hit() {
      if (stage >= 2) return;
      stage = 2;
      flash.classList.add('is-hit');
      chrome.style.opacity = '1';
      vid.classList.remove('is-on');
      try { vid.pause(); } catch (e) { /* nada */ }
      later(fly, BEAT * 1000 * 1.5);
    }

    function play() {
      if (stage !== 0) return;
      stage = 1;
      vid.classList.add('is-on');
      const p = vid.play();
      if (p && p.catch) p.catch(() => hit());
      vid.addEventListener('ended', hit, { once: true });
      later(hit, 1750);
    }

    vid.addEventListener('error', () => { if (stage === 0) hit(); }, { once: true });
    vid.src = videoSrc('blood-intro');
    vid.preload = 'auto';
    try { vid.load(); } catch (e) { /* nada */ }
    if (vid.readyState >= 3) play();
    else {
      vid.addEventListener('canplaythrough', play, { once: true });
      vid.addEventListener('loadeddata', () => later(play, 250), { once: true });
      later(() => { if (stage === 0) hit(); }, 2200);
    }
  }

  /* =====================================================================
     FORMULARIO (EmailJS, credenciales en content.json > integrations)
     ===================================================================== */
  const FORM_MSGS = {
    es: { sending: 'Enviando…', sent: 'Mensaje enviado. Te respondemos en 48 horas.', invalid: 'Completá nombre, un email válido y el mensaje.', error: 'No se pudo enviar. Probá de nuevo o escribí por email.', noForm: 'El formulario todavía no está configurado. Escribí a' },
    en: { sending: 'Sending…', sent: 'Message sent. We will get back to you within 48 hours.', invalid: 'Fill in your name, a valid email and the message.', error: 'Could not send. Try again or write by email.', noForm: 'The form is not set up yet. Write to' },
    pt: { sending: 'Enviando…', sent: 'Mensagem enviada. Respondemos em até 48 horas.', invalid: 'Preencha nome, um e-mail válido e a mensagem.', error: 'Não foi possível enviar. Tente de novo ou escreva por e-mail.', noForm: 'O formulário ainda não está configurado. Escreva para' }
  };
  const fm = () => FORM_MSGS[lang] || FORM_MSGS.es;

  function toast(msg, kind, ms) {
    const box = $('#toasts');
    if (!box) return;
    const n = el('div', 'toast' + (kind === 'error' ? ' toast--error' : ''), msg);
    box.append(n);
    setTimeout(() => n.remove(), ms || 5000);
  }

  let emailjsLoad = null;
  function loadEmailJS() {
    if (window.emailjs) return Promise.resolve(window.emailjs);
    if (emailjsLoad) return emailjsLoad;
    emailjsLoad = new Promise((res, rej) => {
      const s = el('script');
      s.src = 'https://cdn.jsdelivr.net/npm/@emailjs/browser@4/dist/email.min.js';
      s.async = true;
      s.onload = () => (window.emailjs ? res(window.emailjs) : rej(new Error('emailjs')));
      s.onerror = () => { emailjsLoad = null; rej(new Error('emailjs')); };
      D.head.append(s);
    });
    return emailjsLoad;
  }

  function setupForm() {
    const form = $('#contactForm');
    if (!form) return;
    form.addEventListener('focusin', () => { loadEmailJS().catch(() => {}); }, { once: true });
    $$('input, textarea', form).forEach((i) => i.addEventListener('input', () => i.closest('.field') && i.closest('.field').classList.remove('is-bad')));
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const T = fm();
      const btn = $('button[type="submit"]', form);
      const label = $('span', btn);
      if ($('#cf-honeypot').value.trim() !== '') { form.reset(); toast(T.sent, 'ok', 5000); return; }
      const name = $('#cf-name'), email = $('#cf-email'), msg = $('#cf-message');
      let ok = true;
      [[name, name.value.trim() !== ''], [email, /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value.trim())], [msg, msg.value.trim() !== '']].forEach(([f, valid]) => {
        f.closest('.field').classList.toggle('is-bad', !valid);
        if (!valid) ok = false;
      });
      if (!ok) { toast(T.invalid, 'error', 4500); return; }
      const cfg = (content && content.integrations && content.integrations.emailjs) || {};
      const to = (content && content.artist && content.artist.email) || '';
      if (!cfg.publicKey || !cfg.serviceId || !cfg.templateId) {
        toast(to ? T.noForm + ' ' + to : T.noForm, 'error', 8000);
        if (to) location.href = 'mailto:' + to;
        return;
      }
      const original = label.textContent;
      label.textContent = T.sending;
      btn.disabled = true;
      loadEmailJS().then((ejs) => {
        ejs.init({ publicKey: cfg.publicKey });
        return ejs.sendForm(cfg.serviceId, cfg.templateId, form);
      }).then(() => {
        form.reset();
        toast(T.sent, 'ok', 6000);
        track('form_submit', { form: 'booking' });
      }).catch(() => {
        toast(T.error, 'error', 6500);
      }).finally(() => {
        label.textContent = original;
        btn.disabled = false;
      });
    });
  }

  /* =====================================================================
     RIDER: imprimir / guardar en PDF solo la ficha
     ===================================================================== */
  function setupPrint() {
    const b = $('#printRider');
    if (!b) return;
    b.addEventListener('click', () => {
      track('rider_print');
      D.body.classList.add('print-rider');
      const done = () => { D.body.classList.remove('print-rider'); window.removeEventListener('afterprint', done); };
      window.addEventListener('afterprint', done);
      setTimeout(() => window.print(), 30);
      setTimeout(done, 60000);
    });
  }

  /* =====================================================================
     ATAJO AL PANEL: escribir "kexxy" en cualquier lado
     ===================================================================== */
  function setupAdminShortcut() {
    const SECRET = 'kexxy';
    let buf = '';
    D.addEventListener('keydown', (e) => {
      const tg = e.target;
      if (tg && (tg.tagName === 'INPUT' || tg.tagName === 'TEXTAREA' || tg.tagName === 'SELECT' || tg.isContentEditable)) return;
      if (!e.key || e.key.length !== 1) return;
      buf = (buf + e.key.toLowerCase()).slice(-SECRET.length);
      if (buf === SECRET) location.href = 'admin.html';
    });
  }

  /* =====================================================================
     ARRANQUE
     ===================================================================== */
  setupReveal();
  setupNav();
  setupPointer();
  setupCells();
  setupGL();
  setupForm();
  setupPrint();
  setupAdminShortcut();
  boot();
  (D.fonts && D.fonts.ready ? D.fonts.ready : Promise.resolve()).then(fitTexts);
  if (D.readyState === 'loading') D.addEventListener('DOMContentLoaded', runIntro, { once: true });
  else runIntro();

  RM.addEventListener && RM.addEventListener('change', () => { if (reduced()) root.classList.remove('is-live'); });
})();
